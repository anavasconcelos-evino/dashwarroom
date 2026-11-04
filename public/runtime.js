/* Runtime mínimo do dash fora do Claude.
   Implementa a mesma API que index.html e data.js usam (dash.loader, calc, draw, data,
   params, setParams, onData, setLink), mas busca cada fonte em /api/data, que lê o
   Redshift, o Google Sheets e o Meta Ads com as credenciais do projeto na Vercel. */
(function () {
  'use strict';
  /* parâmetros de cada fonte (os mesmos {{nomes}} das consultas do dash no Claude) */
  const SOURCES = {
    vendas: ['ini', 'fim', 'pago_in'],
    vendas_yoy: ['ini_yoy', 'fim_yoy'],
    pedidos_canal: ['ini', 'fim'],
    pedidos_canal_yoy: ['ini_yoy', 'fim_yoy'],
    google_lc: ['ini', 'fim'],
    kits: ['ini', 'fim', 'pago_in'],
    fact_dia: ['ini', 'fim', 'pago_in'],
    lc_dia: ['ini', 'fim'],
    hora_a_hora: ['hoje'],
    faixa_vendas: ['ini', 'fim', 'pago_in'],
    canal_sku: ['ini', 'fim', 'pago_in'],
    canais_diario: [],
    plano_cat: ['plano_id'],
    plano_diario: ['plano_id'],
    meta_ads: ['meta_preset'],
    meta_ads_mes: [],
    meta_diario: [],
    email_insider: ['ini', 'fim'],
    email_insider_mes: ['mtd_ini', 'mtd_fim'],
    whats_insider: ['ini', 'fim'],
    whats_insider_mes: ['mtd_ini', 'mtd_fim'],
    email_lista: [],
    email_c1: ['email_id_1', 'ini_email'],
    email_c2: ['email_id_2', 'ini_email'],
    email_c3: ['email_id_3', 'ini_email'],
    email_c4: ['email_id_4', 'ini_email'],
    email_c5: ['email_id_5', 'ini_email'],
  };
  const REFRESH_MS = 5 * 60 * 1000;
  /* fontes sem as quais o cálculo mostraria zeros enganosos: se falharem, o bloco mostra o erro */
  const REQUIRED = {
    fb_top_cac: ['meta_ads'],
    whats_resumo: ['whats_insider'],
  };

  let P = {};
  const D = {};      // fonte -> { status, data, error, key, seq }
  const CALC = {};   // calc -> { inputs, fn }
  const MEMO = {};   // calc -> { sig, out }
  const DRAW = {};   // nome -> fn(el)
  const LISTEN = [];
  let started = false, scheduled = false;

  const keyOf = (id) => JSON.stringify((SOURCES[id] || []).map((k) => P[k] == null ? null : P[k]));
  const ready = (id) => (SOURCES[id] || []).every((k) => P[k] != null && P[k] !== '');

  async function fetchSource(id, quiet) {
    /* fonte sem os parâmetros (ex.: estatísticas de e-mail sem a lista do Insider): fica ociosa e entra vazia nos cálculos */
    if (!ready(id)) { D[id] = { status: 'idle', data: [], key: null }; schedule(); return; }
    const key = keyOf(id);
    const cur = D[id];
    const seq = (cur && cur.seq || 0) + 1;
    D[id] = quiet && cur && cur.status === 'ok' && cur.key === key ? Object.assign({}, cur, { seq }) : { status: 'loading', data: [], key, seq };
    schedule();
    const q = new URLSearchParams({ id });
    (SOURCES[id] || []).forEach((k) => q.set(k, P[k]));
    try {
      const r = await fetch('/api/data?' + q.toString(), { headers: { accept: 'application/json' } });
      const j = await r.json().catch(() => ({ error: 'Resposta inválida (' + r.status + ')' }));
      if (!D[id] || D[id].seq !== seq) return;
      if (!r.ok || j.error) D[id] = { status: 'error', data: [], error: j.error || ('HTTP ' + r.status), key, seq };
      else D[id] = { status: 'ok', data: j.rows || [], key, seq, at: j.at };
    } catch (e) {
      if (D[id] && D[id].seq === seq) D[id] = { status: 'error', data: [], error: String(e && e.message || e), key, seq };
    }
    schedule();
  }

  function data(id) {
    if (CALC[id]) {
      const c = CALC[id];
      const ins = c.inputs.map((i) => { const x = data(i); return x.status === 'idle' ? { status: 'ok', data: [], seq: 'idle' } : x; });
      /* uma fonte com erro (ex.: Meta sem token, Insider ainda não ligado) não derruba o bloco:
         o cálculo roda com ela vazia e o bloco só vira erro se não sobrar nada para mostrar */
      if (ins.some((x) => x.status === 'loading')) return { status: 'loading', data: [] };
      const failed = ins.filter((x) => x.status === 'error');
      const must = (REQUIRED[id] || []).map((i) => ins[c.inputs.indexOf(i)]).find((x) => x && x.status === 'error');
      if (must) return { status: 'error', data: [], error: must.error };
      const sig = ins.map((x) => x.status + (x.sig || x.seq || 0)).join('|') + '|' + c.inputs.map((i) => (D[i] ? D[i].key : '')).join('|');
      const m = MEMO[id];
      if (m && m.sig === sig) return m.out;
      let out;
      try {
        const v = c.fn.apply(null, ins.map((x) => (x.status === 'ok' ? x.data || [] : [])));
        const rows = Array.isArray(v) ? v : (v && v.rows) || [];
        out = failed.length && !rows.length
          ? { status: 'error', data: [], error: failed[0].error }
          : { status: 'ok', data: rows, sig: Date.now() + Math.random(), partial: failed.map((x) => x.error) };
        if (failed.length) console.warn('[calc ' + id + '] sem ' + failed.length + ' fonte(s): ' + failed.map((x) => x.error).join(' | '));
      }
      catch (e) { out = { status: 'error', data: [], error: String(e && e.message || e) }; console.error('[calc ' + id + ']', e); }
      MEMO[id] = { sig, out };
      return out;
    }
    const s = D[id];
    return s ? { status: s.status, data: s.data, error: s.error, seq: s.seq } : { status: 'loading', data: [] };
  }

  function runDraw(name) {
    const fn = DRAW[name]; if (!fn) return;
    document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => {
      const src = el.dataset.source ? data(el.dataset.source) : null;
      el.setAttribute('data-dash-source-state', src ? src.status : 'ok');
      try { fn(el); } catch (e) { console.error('[draw ' + name + ']', e); }
    });
  }
  function drawAll() { Object.keys(DRAW).forEach(runDraw); }
  function schedule() {
    if (!started || scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; drawAll(); LISTEN.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } }); });
  }
  function refetchChanged(quiet) {
    Object.keys(SOURCES).forEach((id) => { if (!D[id] || D[id].key !== keyOf(id) || quiet) fetchSource(id, quiet); });
  }

  window.dash = {
    loader() { /* no navegador os dados já chegam prontos de /api/data */ },
    calc(id, def) { CALC[id] = { inputs: def.inputs || [], fn: def.fn }; },
    draw(name, fn) { if (typeof fn === 'function') DRAW[name] = fn; else if (started) runDraw(name); },
    data,
    params() { return Object.assign({}, P); },
    setParams(obj) { P = Object.assign({}, P, obj); if (started) refetchChanged(false); },
    onData(cb) { LISTEN.push(cb); },
    setLink(id) { try { history.replaceState(null, '', '#' + id); } catch (e) { /* ignora */ } },
  };

  window.addEventListener('load', () => {
    started = true;
    refetchChanged(false);
    drawAll();
    setInterval(() => { if (document.visibilityState === 'visible') refetchChanged(true); }, REFRESH_MS);
  });
})();
