/* =====================================================================
   LOADERS — só transformam a resposta de cada conector em linhas
   ===================================================================== */

/* Dados Víssimo: a resposta é texto (avisos + JSON). */
dash.loader('vendas', {
  description: 'Texto do query_dataset em linhas somadas por garrafa/não garrafa; cada linha leva o período consultado (ini/fim). Em Hoje (is_paid em 0,1 = boleto condition): pedidos solid sem SAC, televendas TV*, ItaúShop BRI* e Vivino, com receita, frete e CM2 de boleto a 65% e PIX a 75%; rec_raw guarda a receita sem o fator, para o PMV.',
  fn: ({ answer, args }) => {
    const P = (a) => { let t = a; if (t && typeof t === 'object' && !Array.isArray(t)) { if (Array.isArray(t.content)) t = t.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'); else if (Array.isArray(t.rows)) return t.rows; } if (Array.isArray(t)) return t; t = String(t == null ? '' : t); if (/^\s*ERRO/.test(t)) throw new Error(t.slice(0, 400)); if (/INCOMPLETO/.test(t)) throw new Error(t.slice(0, 400)); const m = /(^|\n)\s*(\[\s*[\{\]])/.exec(t); if (!m) throw new Error('Resposta sem linhas: ' + t.slice(0, 300)); return JSON.parse(t.slice(m.index + m[1].length)); };
    const ini = args.filters.find((f) => f.op === 'gte').value, fim = args.filters.find((f) => f.op === 'lte').value;
    const BC = (args.filters || []).some((f) => f.column === 'is_paid' && f.value === '(0,1)'); const FT = (pm) => (!BC ? 1 : /boleto/i.test(pm || '') ? 0.65 : /pix/i.test(pm || '') ? 0.75 : 1); const EXC = (r) => BC && (String(r.payment_method || '') === 'sac' || /^TV/i.test(String(r.voucher_code || '')) || /^BRI/.test(String(r.order_increment_id || '')) || String(r.marketplace_provider || '') === 'vivino');
    const A = {}; P(answer).filter((r) => !EXC(r)).forEach((r) => { const f = FT(r.payment_method), k = String(r.is_bottle); const o = A[k] || (A[k] = { ini, fim, is_bottle: r.is_bottle, rec: 0, frete: 0, cm2: 0, qtd: 0, rec_raw: 0 }); o.rec += (+r.rec || 0) * f; o.frete += (+r.frete || 0) * f; o.cm2 += (+r.cm2 || 0) * f; o.qtd += +r.qtd || 0; o.rec_raw += +r.rec || 0; });
    return { columns: ['ini', 'fim', 'is_bottle', 'rec', 'frete', 'cm2', 'qtd', 'rec_raw'], boleto_condition: BC, rows: Object.values(A) };
  },
});
dash.loader('vendas_yoy', {
  description: 'Texto do query_dataset em linhas; cada linha leva o período consultado (ini/fim).',
  fn: ({ answer, args }) => {
    const P = (a) => { let t = a; if (t && typeof t === 'object' && !Array.isArray(t)) { if (Array.isArray(t.content)) t = t.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'); else if (Array.isArray(t.rows)) return t.rows; } if (Array.isArray(t)) return t; t = String(t == null ? '' : t); if (/^\s*ERRO/.test(t)) throw new Error(t.slice(0, 400)); if (/INCOMPLETO/.test(t)) throw new Error(t.slice(0, 400)); const m = /(^|\n)\s*(\[\s*[\{\]])/.exec(t); if (!m) throw new Error('Resposta sem linhas: ' + t.slice(0, 300)); return JSON.parse(t.slice(m.index + m[1].length)); };
    const ini = args.filters.find((f) => f.op === 'gte').value, fim = args.filters.find((f) => f.op === 'lte').value;
    return { columns: ['ini', 'fim', 'is_bottle', 'rec', 'frete', 'cm2', 'qtd'], rows: P(answer).map((r) => ({ ini, fim, is_bottle: r.is_bottle, rec: +r.rec || 0, frete: +r.frete || 0, cm2: +r.cm2 || 0, qtd: +r.qtd || 0 })) };
  },
});
['pedidos_canal', 'pedidos_canal_yoy'].forEach((id) => dash.loader(id, {
  description: 'Texto do query_dataset em linhas (pedidos por canal de último clique).',
  fn: ({ answer }) => {
    const P = (a) => { let t = a; if (t && typeof t === 'object' && !Array.isArray(t)) { if (Array.isArray(t.content)) t = t.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'); else if (Array.isArray(t.rows)) return t.rows; } if (Array.isArray(t)) return t; t = String(t == null ? '' : t); if (/^\s*ERRO/.test(t)) throw new Error(t.slice(0, 400)); if (/INCOMPLETO/.test(t)) throw new Error(t.slice(0, 400)); const m = /(^|\n)\s*(\[\s*[\{\]])/.exec(t); if (!m) throw new Error('Resposta sem linhas: ' + t.slice(0, 300)); return JSON.parse(t.slice(m.index + m[1].length)); };
    return { columns: ['channel', 'n'], rows: P(answer).map((r) => ({ channel: r.channel, n: +r.n || 0 })) };
  },
}));
dash.loader('google_lc', {
  description: 'Texto do query_dataset em linhas (pedidos do Google por campanha); cada linha leva o período consultado.',
  fn: ({ answer, args }) => {
    const P = (a) => { let t = a; if (t && typeof t === 'object' && !Array.isArray(t)) { if (Array.isArray(t.content)) t = t.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'); else if (Array.isArray(t.rows)) return t.rows; } if (Array.isArray(t)) return t; t = String(t == null ? '' : t); if (/^\s*ERRO/.test(t)) throw new Error(t.slice(0, 400)); if (/INCOMPLETO/.test(t)) throw new Error(t.slice(0, 400)); const m = /(^|\n)\s*(\[\s*[\{\]])/.exec(t); if (!m) throw new Error('Resposta sem linhas: ' + t.slice(0, 300)); return JSON.parse(t.slice(m.index + m[1].length)); };
    const ini = args.filters.find((f) => f.op === 'gte').value, fim = args.filters.find((f) => f.op === 'lte').value;
    return { columns: ['ini', 'fim', 'channel', 'utm_campaign', 'n'], rows: P(answer).map((r) => ({ ini, fim, channel: r.channel, utm_campaign: r.utm_campaign, n: +r.n || 0 })) };
  },
});

/* Kits: ranking por receita + ficha do kit (nome, garrafas, estoque) na dimensão de bundles. */
['kits'].forEach((id) => dash.loader(id, {
  description: 'Ranking de kits do query_dataset (kit × meio de pagamento somado por kit, os 41 de maior receita; em Hoje boleto condition: sem SAC/TV*/Vivino, boleto a 65% e PIX a 75%), com nome, garrafas por kit e estoque disponível de vw_ev_dim_product_bundle (segunda chamada).',
  fn: async ({ answer, args, call }) => {
    const P = (a) => { let t = a; if (t && typeof t === 'object' && !Array.isArray(t)) { if (Array.isArray(t.content)) t = t.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'); else if (Array.isArray(t.rows)) return t.rows; } if (Array.isArray(t)) return t; t = String(t == null ? '' : t); if (/^\s*ERRO/.test(t)) throw new Error(t.slice(0, 400)); if (/INCOMPLETO/.test(t)) throw new Error(t.slice(0, 400)); const m = /(^|\n)\s*(\[\s*[\{\]])/.exec(t); if (!m) throw new Error('Resposta sem linhas: ' + t.slice(0, 300)); return JSON.parse(t.slice(m.index + m[1].length)); };
    const ini = args.filters.find((f) => f.op === 'gte').value, fim = args.filters.find((f) => f.op === 'lte').value;
    let rk;
    try { rk = P(answer); } catch (e) {
      if (!/INCOMPLETO|TRUNCADO/.test(String(e.message))) throw e;
      await new Promise((ok) => setTimeout(ok, 2500));
      rk = P(await call('query_dataset', args));
    }
    const BC = (args.filters || []).some((f) => f.column === 'is_paid' && f.value === '(0,1)'); const FT = (pm) => (!BC ? 1 : /boleto/i.test(pm || '') ? 0.65 : /pix/i.test(pm || '') ? 0.75 : 1); const EXC = (r) => BC && (String(r.payment_method || '') === 'sac' || /^TV/i.test(String(r.voucher_code || '')) || /^BRI/.test(String(r.order_increment_id || '')) || String(r.marketplace_provider || '') === 'vivino');
    const KA = {}; rk.filter((r) => !EXC(r)).forEach((r) => { const f = FT(r.payment_method); const o = KA[r.fk_bundle_product] || (KA[r.fk_bundle_product] = { fk_bundle_product: r.fk_bundle_product, rec: 0, frete: 0, cm2: 0, garrafas: 0, rec_raw: 0 }); o.rec += (+r.rec || 0) * f; o.frete += (+r.frete || 0) * f; o.cm2 += (+r.cm2 || 0) * f; o.garrafas += +r.garrafas || 0; o.rec_raw += +r.rec || 0; });
    rk = Object.values(KA).sort((a, b) => b.rec - a.rec).slice(0, 41);
    const skus = rk.map((r) => r.fk_bundle_product).filter(Boolean);
    const dim = skus.length ? P(await call('query_dataset', { dataset: 'vw_ev_dim_product_bundle', select: ['sku', 'name', 'number_bottles', 'min_stock_available', 'available_for_sale', 'special_price'], filters: [{ column: 'sku', op: 'in', value: '(' + skus.join(',') + ')' }], limit: 1000 })) : [];
    const D = new Map(dim.map((k) => [k.sku, k]));
    const cols = ['ini', 'fim', 'kit', 'kit_nome', 'kit_garrafas', 'estoque_kits', 'disponivel', 'preco', 'rec', 'frete', 'cm2', 'garrafas', 'rec_raw'];
    return { columns: cols, rows: rk.map((r) => { const k = D.get(r.fk_bundle_product) || {}; return { ini, fim, kit: r.fk_bundle_product, kit_nome: k.name ? String(k.name).replace(/[*\t]+/g, ' ').trim() : null, kit_garrafas: k.number_bottles == null ? null : +k.number_bottles, estoque_kits: k.min_stock_available == null ? null : +k.min_stock_available, disponivel: k.available_for_sale == null ? null : +k.available_for_sale, preco: k.special_price == null ? null : +k.special_price, rec: r.rec, frete: r.frete, cm2: r.cm2, garrafas: r.garrafas, rec_raw: r.rec_raw }; }) };
  },
}));

/* Pedidos do dia, item a item por kit (página a página) + ficha do kit. */
dash.loader('fact_dia', {
  description: 'Pedidos do período agrupados por pedido × kit (pagos; em Hoje boleto condition: solid sem SAC/TV*/BRI*/Vivino, receita, frete e CM2 de boleto a 65% e PIX a 75%), lidos em páginas de 1.000 em paralelo; vazio fora de Hoje/Ontem (janela de mais de um dia), com nome, garrafas por kit e estoque de vw_ev_dim_product_bundle.',
  fn: async ({ answer, args, call }) => {
    const P = (a) => { let t = a; if (t && typeof t === 'object' && !Array.isArray(t)) { if (Array.isArray(t.content)) t = t.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'); else if (Array.isArray(t.rows)) return t.rows; } if (Array.isArray(t)) return t; t = String(t == null ? '' : t); if (/^\s*ERRO/.test(t)) throw new Error(t.slice(0, 400)); if (/INCOMPLETO/.test(t)) throw new Error(t.slice(0, 400)); const m = /(^|\n)\s*(\[\s*[\{\]])/.exec(t); if (!m) throw new Error('Resposta sem linhas: ' + t.slice(0, 300)); return JSON.parse(t.slice(m.index + m[1].length)); };
    const cols0 = ['pedido', 'kit', 'kit_nome', 'kit_garrafas', 'estoque_kits', 'disponivel', 'is_bottle', 'is_first_order', 'rec', 'frete', 'cm2', 'qtd', 'rec_raw', 'payment_method'];
    if (args.filters.find((f) => f.op === 'gte').value !== args.filters.find((f) => f.op === 'lte').value) return { columns: cols0, rows: [] };
    const pages = async (first, a, max) => { const out = first.slice(); let last = first, off = 0; while (last.length === 1000 && off < max) { const offs = [1, 2, 3, 4].map((k) => off + 1000 * k).filter((o) => o <= max); off = offs[offs.length - 1]; const res = await Promise.all(offs.map((o) => call('query_dataset', Object.assign({}, a, { offset: o })).then(P))); for (const pg of res) { out.push(...pg); last = pg; if (pg.length < 1000) break; } } return { out, cut: last.length === 1000 }; };
    const { out, cut } = await pages(P(answer), args, 8000);
    const skus = [...new Set(out.map((r) => r.fk_bundle_product).filter(Boolean))];
    const lotes = []; for (let i = 0; i < skus.length; i += 200) lotes.push(skus.slice(i, i + 200));
    const dim = (await Promise.all(lotes.map((l) => call('query_dataset', { dataset: 'vw_ev_dim_product_bundle', select: ['sku', 'name', 'number_bottles', 'min_stock_available', 'available_for_sale'], filters: [{ column: 'sku', op: 'in', value: '(' + l.join(',') + ')' }], limit: 1000 }).then(P)))).flat();
    const D = new Map(dim.map((k) => [k.sku, k]));
    const strip = (id) => { const m = /^(.+[0-9])R[0-9]+$/.exec(id || ''); return m ? m[1] : id; };
    const BC = (args.filters || []).some((f) => f.column === 'is_paid' && f.value === '(0,1)'); const FT = (pm) => (!BC ? 1 : /boleto/i.test(pm || '') ? 0.65 : /pix/i.test(pm || '') ? 0.75 : 1); const EXC = (r) => BC && (String(r.payment_method || '') === 'sac' || /^TV/i.test(String(r.voucher_code || '')) || /^BRI/.test(String(r.order_increment_id || '')) || String(r.marketplace_provider || '') === 'vivino');
    const cols = ['pedido', 'kit', 'kit_nome', 'kit_garrafas', 'estoque_kits', 'disponivel', 'is_bottle', 'is_first_order', 'rec', 'frete', 'cm2', 'qtd', 'rec_raw', 'payment_method'];
    return { columns: cols, cut, boleto_condition: BC, rows: out.filter((r) => !EXC(r)).map((r) => { const k = D.get(r.fk_bundle_product) || {}; const f = FT(r.payment_method); return { rec_raw: +r.rec || 0, payment_method: r.payment_method || null, pedido: strip(r.order_increment_id), kit: r.fk_bundle_product, kit_nome: k.name ? String(k.name).replace(/[*\t]+/g, ' ').trim() : null, kit_garrafas: k.number_bottles == null ? null : +k.number_bottles, estoque_kits: k.min_stock_available == null ? null : +k.min_stock_available, disponivel: k.available_for_sale == null ? null : +k.available_for_sale, is_bottle: +r.is_bottle, is_first_order: +r.is_first_order || 0, rec: (+r.rec || 0) * f, frete: (+r.frete || 0) * f, cm2: (+r.cm2 || 0) * f, qtd: +r.qtd || 0 }; }) };
  },
});
dash.loader('lc_dia', {
  description: 'Último clique de cada pedido do período, em páginas de 1.000 em paralelo; vazio fora de Hoje/Ontem (janela de mais de um dia).',
  fn: async ({ answer, args, call }) => {
    const P = (a) => { let t = a; if (t && typeof t === 'object' && !Array.isArray(t)) { if (Array.isArray(t.content)) t = t.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'); else if (Array.isArray(t.rows)) return t.rows; } if (Array.isArray(t)) return t; t = String(t == null ? '' : t); if (/^\s*ERRO/.test(t)) throw new Error(t.slice(0, 400)); if (/INCOMPLETO/.test(t)) throw new Error(t.slice(0, 400)); const m = /(^|\n)\s*(\[\s*[\{\]])/.exec(t); if (!m) throw new Error('Resposta sem linhas: ' + t.slice(0, 300)); return JSON.parse(t.slice(m.index + m[1].length)); };
    if (args.filters.find((f) => f.op === 'gte').value !== args.filters.find((f) => f.op === 'lte').value) return { columns: ['pedido', 'canal', 'campanha', 'anuncio'], rows: [] };
    const pages = async (first, a, max) => { const out = first.slice(); let last = first, off = 0; while (last.length === 1000 && off < max) { const offs = [1, 2, 3, 4].map((k) => off + 1000 * k).filter((o) => o <= max); off = offs[offs.length - 1]; const res = await Promise.all(offs.map((o) => call('query_dataset', Object.assign({}, a, { offset: o })).then(P))); for (const pg of res) { out.push(...pg); last = pg; if (pg.length < 1000) break; } } return { out, cut: last.length === 1000 }; };
    const { out, cut } = await pages(P(answer), args, 6000);
    return { columns: ['pedido', 'canal', 'campanha', 'anuncio'], cut, rows: out.map((r) => ({ pedido: r.order_increment_id, canal: r.channel, campanha: r.utm_campaign, anuncio: r.utm_content })) };
  },
});
dash.loader('hora_a_hora', {
  description: 'Pedidos solid de hoje e dos mesmos dias da semana nas 6 semanas anteriores (uma chamada por dia, os 7 dias e as páginas em paralelo), com horário, meio de pagamento, voucher e marketplace de cada pedido.',
  fn: async ({ answer, args, call }) => {
    const P = (a) => { let t = a; if (t && typeof t === 'object' && !Array.isArray(t)) { if (Array.isArray(t.content)) t = t.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'); else if (Array.isArray(t.rows)) return t.rows; } if (Array.isArray(t)) return t; t = String(t == null ? '' : t); if (/^\s*ERRO/.test(t)) throw new Error(t.slice(0, 400)); if (/INCOMPLETO/.test(t)) throw new Error(t.slice(0, 400)); const m = /(^|\n)\s*(\[\s*[\{\]])/.exec(t); if (!m) throw new Error('Resposta sem linhas: ' + t.slice(0, 300)); return JSON.parse(t.slice(m.index + m[1].length)); };
    const hoje = args.filters.find((f) => f.op === 'gte').value;
    const day = (n) => { const [y, mo, d] = hoje.split('-').map(Number); const x = new Date(y, mo - 1, d - n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    const pages = async (first, a, max) => { const out = first.slice(); let last = first, off = 0; while (last.length === 1000 && off < max) { const offs = [1, 2, 3, 4].map((k) => off + 1000 * k).filter((o) => o <= max); off = offs[offs.length - 1]; const res = await Promise.all(offs.map((o) => call('query_dataset', Object.assign({}, a, { offset: o })).then(P))); for (const pg of res) { out.push(...pg); last = pg; if (pg.length < 1000) break; } } return { out, cut: last.length === 1000 }; };
    const all = async (first, a) => (await pages(first, a, 8000)).out;
    const rows = [];
    const add = (data, sem, list) => list.forEach((r) => rows.push({ data, semanas_atras: sem, pedido: r.order_increment_id, ts: r.created_at_datetime, payment_method: r.payment_method, voucher_code: r.voucher_code, marketplace_provider: r.marketplace_provider, rec: +r.rec || 0, frete: +r.frete || 0 }));
    const semanas = await Promise.all([1, 2, 3, 4, 5, 6].map(async (w) => {
      const dt = day(7 * w);
      const a2 = Object.assign({}, args, { filters: args.filters.map((f) => (f.column === 'created_at_datetime' ? Object.assign({}, f, { value: dt }) : f)) });
      return [dt, w, await all(P(await call('query_dataset', a2)), a2)];
    }).concat([all(P(answer), args).then((l) => [hoje, 0, l])]));
    semanas.sort((a, b) => a[1] - b[1]).forEach(([dt, w, l]) => add(dt, w, l));
    return { columns: ['data', 'semanas_atras', 'pedido', 'ts', 'payment_method', 'voucher_code', 'marketplace_provider', 'rec', 'frete'], rows };
  },
});

/* Google Sheets: Monitoramento de Canais — 4 abas diárias por canal. */
dash.loader('canais_diario', {
  description: 'Abas Receita | Real, Receita | Plan, Invest | Real e Invest | Plan (três chamadas extras em paralelo) em linhas de dia × canal; números pt-BR viram números; inv_vazio marca célula de investimento real em branco.',
  fn: async ({ answer, args, call }) => {
    const V = (a) => { let t = a; if (typeof t === 'string') t = JSON.parse(t); if (t && Array.isArray(t.content)) t = JSON.parse(t.content.filter((b) => b.type === 'text').map((b) => b.text).join('')); if (t && t.error) throw new Error(JSON.stringify(t.error).slice(0, 300)); return (t && t.values) || []; };
    const id = args.spreadsheetId;
    const rng = (tab) => "'" + tab + "'!A642:U1100";
    const tabs = [V(answer)].concat((await Promise.all(['Receita | Plan', 'Invest | Real', 'Invest | Plan'].map((t) => call('get_values', { spreadsheetId: id, range: rng(t) })))).map(V));
    const CH = ['Total', 'Outros', 'AppPush', 'Email', 'SMS', 'WebPush', 'Display', 'Mailer', 'Facebook', 'Criteo', 'Shopping', 'SEM_NonBranded', 'SEM_Branded', 'Afiliados', 'Bing', 'DemandGen', 'Tiktok', 'WhatsApp'];
    const KEYS = ['rec', 'rec_plan', 'inv', 'inv_plan'];
    const num = (s) => { if (s == null || s === '') return 0; const v = +String(s).replace(/R\$|\s/g, '').replace(/\./g, '').replace(',', '.'); return isFinite(v) ? v : 0; };
    const by = new Map();
    tabs.forEach((vals, ti) => vals.forEach((r) => {
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(r[1] || '').trim());
      if (!m) return;
      const data = m[3] + '-' + m[2] + '-' + m[1];
      CH.forEach((c, i) => { const k = data + '|' + c; let o = by.get(k); if (!o) { o = { data, canal: c, rec: 0, rec_plan: 0, inv: 0, inv_plan: 0, inv_vazio: false }; by.set(k, o); } o[KEYS[ti]] = num(r[3 + i]); if (ti === 2) o.inv_vazio = String(r[3 + i] == null ? '' : r[3 + i]).trim() === ''; });
    }));
    return { columns: ['data', 'canal', 'rec', 'rec_plan', 'inv', 'inv_plan', 'inv_vazio'], rows: [...by.values()] };
  },
});

/* Meta Ads: ad_entities vem como texto JSON; valores em {value, unit}. */
['meta_ads', 'meta_ads_mes'].forEach((id) => dash.loader(id, {
  description: 'ad_entities do Meta Ads em linhas por anúncio (segue a paginação, até 3 páginas); valores monetários e contagens viram números.',
  fn: async ({ answer, args, call }) => {
    const J = (a) => { let t = a; if (typeof t === 'string') t = JSON.parse(t); if (t && Array.isArray(t.content)) t = JSON.parse(t.content.filter((b) => b.type === 'text').map((b) => b.text).join('')); if (t && t.error) throw new Error(JSON.stringify(t.error).slice(0, 300)); return t; };
    const v = (x) => (x == null ? 0 : typeof x === 'object' ? +x.value || 0 : +String(x).replace('%', '').replace(',', '.') || 0);
    let a = J(answer); const out = []; let n = 0;
    for (;;) {
      const list = typeof a.ad_entities === 'string' ? JSON.parse(a.ad_entities) : a.ad_entities || [];
      out.push(...list);
      const cur = a.pagination && a.pagination.next_cursor;
      if (!cur || ++n >= 3) break;
      a = J(await call('ads_get_ad_entities', Object.assign({}, args, { cursor: cur })));
    }
    return { columns: ['id', 'anuncio', 'campanha', 'gasto', 'impressoes', 'cliques', 'compras_meta'], rows: out.map((e) => ({ id: e.id, anuncio: e.name, campanha: e.campaign_name, gasto: v(e.amount_spent), impressoes: v(e.impressions), cliques: v(e.link_click), compras_meta: v(e.omni_purchase) })) };
  },
}));
dash.loader('meta_diario', {
  description: 'ad_entities do Meta Ads (conta, dia a dia) em linhas; valores viram números.',
  fn: ({ answer }) => {
    let t = answer; if (typeof t === 'string') t = JSON.parse(t); if (t && Array.isArray(t.content)) t = JSON.parse(t.content.filter((b) => b.type === 'text').map((b) => b.text).join('')); if (t && t.error) throw new Error(JSON.stringify(t.error).slice(0, 300));
    const v = (x) => (x == null ? 0 : typeof x === 'object' ? +x.value || 0 : +String(x).replace('%', '').replace(',', '.') || 0);
    const list = typeof t.ad_entities === 'string' ? JSON.parse(t.ad_entities) : t.ad_entities || [];
    return { columns: ['data', 'gasto', 'impressoes', 'cliques', 'cpm', 'ctr_pct'], rows: list.map((e) => ({ data: e.date_start, gasto: v(e.amount_spent), impressoes: v(e.impressions), cliques: v(e.link_click), cpm: v(e.cpm), ctr_pct: v(e.ctr) })) };
  },
});

/* Insider One */
['email_insider', 'email_insider_mes'].forEach((id) => dash.loader(id, {
  description: 'Resumo de email do Insider (summary) em uma linha, com o período consultado; as taxas vêm em %.',
  fn: ({ answer, args }) => {
    const U = (x) => { if (typeof x === 'string') { try { return U(JSON.parse(x)); } catch (e) { return x; } } if (x && Array.isArray(x.content)) return U(x.content.filter((b) => b.type === 'text').map((b) => b.text).join('')); if (x && x.structuredContent) return U(x.structuredContent); if (x && typeof x.result === 'string') return Object.assign({}, x, { result: U(x.result) }); return x; };
    const find = (o, k, d = 0) => { if (!o || typeof o !== 'object' || d > 6) return undefined; if (k in o) return o[k]; for (const v of Object.values(o)) { const r = find(v, k, d + 1); if (r !== undefined) return r; } return undefined; };
    const t = U(answer);
    if (t && t.error) throw new Error(JSON.stringify(t.error).slice(0, 300));
    const s = find(t, 'summary');
    if (!s || typeof s !== 'object') throw new Error('Resposta do Insider sem summary: ' + JSON.stringify(t).slice(0, 300));
    return { columns: ['ini', 'fim', 'enviados', 'entregues', 'taxa_entrega', 'taxa_abertura', 'ctr', 'cliques_unicos', 'conversoes'], rows: [{ ini: args.start_date, fim: args.end_date, enviados: +s.sent || 0, entregues: +s.delivered || 0, taxa_entrega: s.deliveryRate == null ? null : +s.deliveryRate, taxa_abertura: s.openRate == null ? null : +s.openRate, ctr: s.clickThroughRate == null ? null : +s.clickThroughRate, cliques_unicos: +s.uniqueClicks || 0, conversoes: +s.conversions || 0 }] };
  },
}));
['whats_insider', 'whats_insider_mes'].forEach((id) => dash.loader(id, {
  description: 'Disparos de WhatsApp do Insider (details) em linhas por campanha, com o período consultado.',
  fn: ({ answer, args }) => {
    const U = (x) => { if (typeof x === 'string') { try { return U(JSON.parse(x)); } catch (e) { return x; } } if (x && Array.isArray(x.content)) return U(x.content.filter((b) => b.type === 'text').map((b) => b.text).join('')); if (x && x.structuredContent) return U(x.structuredContent); if (x && typeof x.result === 'string') return Object.assign({}, x, { result: U(x.result) }); return x; };
    const find = (o, k, d = 0) => { if (!o || typeof o !== 'object' || d > 6) return undefined; if (k in o) return o[k]; for (const v of Object.values(o)) { const r = find(v, k, d + 1); if (r !== undefined) return r; } return undefined; };
    const t = U(answer);
    if (t && t.error) throw new Error(JSON.stringify(t.error).slice(0, 300));
    const det = find(t, 'details');
    if (!Array.isArray(det)) throw new Error('Resposta do Insider sem details: ' + JSON.stringify(t).slice(0, 300));
    return { columns: ['ini', 'fim', 'campanha', 'inicio', 'enviados', 'entregues', 'leituras', 'cliques', 'conversoes'], rows: det.map((c) => ({ ini: args.start_date, fim: args.end_date, campanha: c.campName, inicio: c.startsOn ? new Date(c.startsOn * 1000).toISOString() : null, enviados: +c.sent || 0, entregues: +c.delivered || 0, leituras: +c.open || 0, cliques: +c.click || 0, conversoes: +c.conversion || 0 })) };
  },
}));

/* =====================================================================
   CÁLCULOS
   ===================================================================== */

dash.calc('kpis', {
  title: 'Indicadores comerciais',
  description: 'Receita (produto + frete), pedidos last click, ticket, garrafas, PMV e CM2 % do período e do ano anterior.',
  inputs: ['vendas', 'vendas_yoy', 'pedidos_canal', 'pedidos_canal_yoy'],
  fn: (vendas, vendas_yoy, pedidos_canal, pedidos_canal_yoy) => {
    if (!vendas.length) return [];
    const agg = (rows) => { let rec = 0, frete = 0, cm2 = 0, garrafas = 0, recG = 0; rows.forEach((r) => { rec += r.rec; frete += r.frete; cm2 += r.cm2; if (+r.is_bottle === 1) { garrafas += r.qtd; recG += r.rec_raw != null ? r.rec_raw : r.rec; } }); const tot = rec + frete; return { tot, cm2pct: tot ? cm2 / tot : null, garrafas, pmv: garrafas ? recG / garrafas : null }; };
    const a = agg(vendas), b = agg(vendas_yoy);
    /* sem a fonte de last click, pedidos e ticket ficam "—" em vez de zero */
    const ped = pedidos_canal.length ? pedidos_canal.reduce((s, r) => s + r.n, 0) : null, pedY = pedidos_canal_yoy.length ? pedidos_canal_yoy.reduce((s, r) => s + r.n, 0) : null;
    const ch = (x, y) => (x != null && y ? x / y - 1 : null);
    const tk = ped ? a.tot / ped : null, tkY = pedY ? b.tot / pedY : null;
    return [{
      ini: vendas[0].ini, fim: vendas[0].fim,
      receita: a.tot, receita_yoy: b.tot, var_receita: ch(a.tot, b.tot),
      pedidos: ped, pedidos_yoy: pedY, var_pedidos: ch(ped, pedY),
      ticket: tk, ticket_yoy: tkY, var_ticket: ch(tk, tkY),
      garrafas: a.garrafas, garrafas_yoy: b.garrafas, var_garrafas: ch(a.garrafas, b.garrafas),
      pmv: a.pmv, pmv_yoy: b.pmv, var_pmv: ch(a.pmv, b.pmv),
      cm2_pct: a.cm2pct, cm2_pct_yoy: b.cm2pct, var_cm2_pp: a.cm2pct != null && b.cm2pct != null ? a.cm2pct - b.cm2pct : null,
    }];
  },
});

dash.calc('canais', {
  title: 'Canais no período (planilha)',
  description: 'Receita last click, meta, investimento e ROAS por canal somados da planilha de canais nas datas do período; YoY nas datas do ano anterior; pedidos do last click.',
  inputs: ['canais_diario', 'vendas', 'vendas_yoy', 'pedidos_canal'],
  fn: (canais_diario, vendas, vendas_yoy, pedidos_canal) => {
    if (!vendas.length || !canais_diario.length) return [];
    const G = { Facebook: 'Facebook', Shopping: 'Google', SEM_NonBranded: 'Google', SEM_Branded: 'Google', DemandGen: 'Google', Criteo: 'Criteo', Afiliados: 'Afiliados', Bing: 'Bing', Tiktok: 'TikTok', Email: 'Email', WhatsApp: 'WhatsApp', AppPush: 'App Push', SMS: 'SMS', WebPush: 'Web Push' };
    const ORD = ['Facebook', 'Google', 'Criteo', 'Afiliados', 'Bing', 'TikTok', 'Email', 'WhatsApp', 'App Push', 'SMS', 'Web Push', 'Orgânico/Outros'];
    const grp = (c) => G[c] || 'Orgânico/Outros';
    const sum = (ini, fim) => { const m = {}; canais_diario.forEach((r) => { if (r.canal === 'Total' || r.data < ini || r.data > fim) return; const o = m[grp(r.canal)] || (m[grp(r.canal)] = { rec: 0, plan: 0, inv: 0, inv_plan: 0 }); o.rec += r.rec; o.plan += r.rec_plan; o.inv += r.inv; o.inv_plan += r.inv_plan; }); return m; };
    const A = sum(vendas[0].ini, vendas[0].fim);
    const Y = vendas_yoy.length ? sum(vendas_yoy[0].ini, vendas_yoy[0].fim) : {};
    const P = {}; pedidos_canal.forEach((r) => { const g = grp(r.channel); P[g] = (P[g] || 0) + r.n; });
    const z = { rec: 0, plan: 0, inv: 0, inv_plan: 0 };
    const tot = ORD.reduce((s, g) => { const o = A[g] || z; return { rec: s.rec + o.rec, plan: s.plan + o.plan, inv: s.inv + o.inv, inv_plan: s.inv_plan + o.inv_plan }; }, { ...z });
    const totY = ORD.reduce((s, g) => s + ((Y[g] || z).rec), 0);
    const mk = (canal, o, ry, ped) => ({ canal, pedidos: ped, receita: o.rec, meta: o.plan, ating: o.plan ? o.rec / o.plan : null, share: tot.rec ? o.rec / tot.rec : null, invest: o.inv, invest_plan: o.inv_plan, roas: o.inv ? o.rec / o.inv : null, roas_plan: o.inv_plan ? o.plan / o.inv_plan : null, receita_yoy: ry, var_yoy: ry ? o.rec / ry - 1 : null });
    const rows = ORD.map((g) => mk(g, A[g] || z, (Y[g] || z).rec, P[g] || 0)).filter((r) => r.receita || r.meta || r.invest);
    rows.push(mk('Total', tot, totY, Object.values(P).reduce((s, n) => s + n, 0)));
    return rows;
  },
});

dash.calc('pedidos_lc', {
  title: 'Pedidos × último clique',
  description: 'Cada linha de pedido × kit dos pedidos pagos do período com o canal, a campanha e o anúncio do último clique (pedido sem clique fica sem canal).',
  inputs: ['fact_dia', 'lc_dia'],
  fn: (fact_dia, lc_dia) => {
    const L = new Map(lc_dia.map((r) => [r.pedido, r]));
    return fact_dia.map((r) => { const l = L.get(r.pedido) || {}; return Object.assign({ canal: l.canal || null, campanha: l.campanha || null, anuncio: l.anuncio || null }, r); });
  },
});

dash.calc('canais_dia', {
  title: 'Canais no dia (ao vivo)',
  description: 'Receita e pedidos por canal dos pedidos pagos do dia pelo último clique; meta e investimento da planilha, investimento do Facebook do Meta Ads (sem Clube e Installs); YoY da planilha no mesmo dia da semana do ano passado.',
  inputs: ['pedidos_lc', 'canais_diario', 'vendas', 'vendas_yoy', 'meta_ads'],
  fn: (pedidos_lc, canais_diario, vendas, vendas_yoy, meta_ads) => {
    if (!vendas.length || !pedidos_lc.length) return [];
    const G = { Facebook: 'Facebook', Shopping: 'Google', SEM_NonBranded: 'Google', SEM_Branded: 'Google', DemandGen: 'Google', Criteo: 'Criteo', Afiliados: 'Afiliados', Bing: 'Bing', Tiktok: 'TikTok', Email: 'Email', WhatsApp: 'WhatsApp', AppPush: 'App Push', SMS: 'SMS', WebPush: 'Web Push' };
    const ORD = ['Facebook', 'Google', 'Criteo', 'Afiliados', 'Bing', 'TikTok', 'Email', 'WhatsApp', 'App Push', 'SMS', 'Web Push', 'Orgânico/Outros'];
    const grp = (c) => G[c] || 'Orgânico/Outros';
    const R = {}, PD = {};
    pedidos_lc.forEach((r) => { const g = grp(r.canal); R[g] = (R[g] || 0) + r.rec + r.frete; (PD[g] || (PD[g] = new Set())).add(r.pedido); });
    const sh = {}, shY = {};
    const ini = vendas[0].ini, fim = vendas[0].fim, iy = vendas_yoy.length ? vendas_yoy[0].ini : null, fy = vendas_yoy.length ? vendas_yoy[0].fim : null;
    canais_diario.forEach((r) => {
      if (r.canal === 'Total') return;
      const g = grp(r.canal);
      if (r.data >= ini && r.data <= fim) { const o = sh[g] || (sh[g] = { plan: 0, inv: 0, inv_plan: 0 }); o.plan += r.rec_plan; o.inv += r.inv; o.inv_plan += r.inv_plan; }
      if (iy && r.data >= iy && r.data <= fy) shY[g] = (shY[g] || 0) + r.rec;
    });
    const fbInv = meta_ads.filter((a) => !/clube|install/i.test(a.campanha || '')).reduce((s, a) => s + a.gasto, 0);
    const totRec = ORD.reduce((s, g) => s + (R[g] || 0), 0);
    const mk = (canal, rec, ped, plan, inv, invp, ry) => ({ canal, pedidos: ped, receita: rec, meta: plan, ating: plan ? rec / plan : null, share: totRec ? rec / totRec : null, invest: inv, invest_plan: invp, roas: inv ? rec / inv : null, roas_plan: invp ? plan / invp : null, receita_yoy: ry, var_yoy: ry ? rec / ry - 1 : null });
    let T = { ped: 0, plan: 0, inv: 0, invp: 0, ry: 0 };
    const rows = ORD.map((g) => {
      const s = sh[g] || { plan: 0, inv: 0, inv_plan: 0 };
      const inv = g === 'Facebook' && meta_ads.length ? fbInv : s.inv;
      const ped = PD[g] ? PD[g].size : 0;
      T = { ped: T.ped + ped, plan: T.plan + s.plan, inv: T.inv + inv, invp: T.invp + s.inv_plan, ry: T.ry + (shY[g] || 0) };
      return mk(g, R[g] || 0, ped, s.plan, inv, s.inv_plan, shY[g] || 0);
    }).filter((r) => r.receita || r.meta || r.invest);
    rows.push(mk('Total', totRec, T.ped, T.plan, T.inv, T.invp, T.ry));
    return rows;
  },
});

dash.calc('hora', {
  title: 'Receita acumulada × planejado por hora',
  description: 'Como o painel de hora a hora do Looker: pedidos solid (sem televendas TV*, sem SAC, sem ItaúShop BRI*, sem Vivino). Real = receita de hoje acumulada por hora com boleto a 65% e PIX a 75% (produto + frete). Planejado = meta last click do dia × curva média de receita acumulada por hora dos mesmos dias da semana nas 6 semanas anteriores.',
  inputs: ['hora_a_hora', 'canais_diario'],
  fn: (hora_a_hora, canais_diario) => {
    if (!hora_a_hora.length) return [];
    const ok = (r) => !/^TV/i.test(String(r.voucher_code || '')) && String(r.payment_method || '') !== 'sac' && !/^BRI/.test(String(r.pedido || '')) && String(r.marketplace_provider || '') !== 'vivino';
    const fator = (pm) => (/boleto/i.test(pm || '') ? 0.65 : /pix/i.test(pm || '') ? 0.75 : 1);
    const hoje = (hora_a_hora.find((r) => r.semanas_atras === 0) || {}).data;
    const meta = canais_diario.filter((r) => r.data === hoje && r.canal !== 'Total').reduce((s, r) => s + r.rec_plan, 0);
    const real = Array(24).fill(0); let last = -1;
    const hist = {};
    hora_a_hora.filter(ok).forEach((r) => {
      const h = +String(r.ts).slice(11, 13); if (!(h >= 0 && h < 24)) return;
      if (r.semanas_atras === 0) { real[h] += (r.rec + r.frete) * fator(r.payment_method); if (h > last) last = h; }
      else { const o = hist[r.data] || (hist[r.data] = Array(24).fill(0)); o[h] += r.rec + r.frete; }
    });
    const curvas = Object.values(hist).map((v) => { const tot = v.reduce((a, b) => a + b, 0); let acc = 0; return tot ? v.map((x) => (acc += x) / tot) : null; }).filter(Boolean);
    const share = Array.from({ length: 24 }, (_, h) => (curvas.length ? curvas.reduce((s, c) => s + c[h], 0) / curvas.length : null));
    let acc = 0;
    return real.map((v, h) => {
      acc += v;
      const plan = share[h] != null && meta ? meta * share[h] : null;
      const planPrev = h > 0 && share[h - 1] != null && meta ? meta * share[h - 1] : 0;
      const ra = h <= last ? acc : null;
      return { hora: h, real_hora: h <= last ? v : null, plano_hora: plan != null ? plan - planPrev : null, real_acum: ra, plano_acum: plan, ating_acum: ra != null && plan ? ra / plan : null, meta_dia: meta || null, semanas_base: curvas.length };
    });
  },
});
dash.calc('diario', {
  title: 'Receita last click por dia no mês',
  description: 'Receita last click e meta de cada dia do mês corrente e receita do mesmo dia do ano passado, da planilha de canais.',
  inputs: ['canais_diario', 'email_insider_mes'],
  fn: (canais_diario, email_insider_mes) => {
    if (!canais_diario.length) return [];
    /* o período do mês vem do Insider; sem ele, mês corrente até ontem (horário de Brasília) */
    const ontem = new Date(Date.now() - 27 * 3600e3).toISOString().slice(0, 10);
    const ini = email_insider_mes.length ? email_insider_mes[0].ini : ontem.slice(0, 8) + '01';
    const fim = email_insider_mes.length ? email_insider_mes[0].fim : ontem, mes = ini.slice(0, 7);
    const ly = String(+mes.slice(0, 4) - 1) + mes.slice(4);
    const by = {}, byLy = {};
    canais_diario.forEach((r) => { if (r.canal === 'Total') return; if (r.data.slice(0, 7) === mes) { const o = by[r.data] || (by[r.data] = { rec: 0, plan: 0 }); o.rec += r.rec; o.plan += r.rec_plan; } if (r.data.slice(0, 7) === ly) byLy[r.data.slice(8)] = (byLy[r.data.slice(8)] || 0) + r.rec; });
    return Object.keys(by).sort().map((d) => ({ data: d, receita: d <= fim ? by[d].rec : null, meta: by[d].plan, receita_ly: byLy[d.slice(8)] != null ? byLy[d.slice(8)] : null }));
  },
});

dash.calc('kits_top', {
  title: 'Top kits e estoque',
  description: 'Os 10 kits com mais receita no período: kits vendidos (garrafas ÷ garrafas por kit), PMV (receita sem frete ÷ garrafas), CM2 % com frete, estoque disponível e dias de cobertura no ritmo do período (Esgotado com estoque de kits zerado, Crítico até 3 dias, Atenção abaixo de 7; o flag available_for_sale da dimensão não entra, porque fica desatualizado).',
  inputs: ['kits'],
  fn: (kits) => {
    if (!kits.length) return [];
    const nd = Math.round((new Date(kits[0].fim) - new Date(kits[0].ini)) / 864e5) + 1;
    return kits.filter((k) => k.kit).slice(0, 10).map((k) => {
      const vend = k.kit_garrafas ? k.garrafas / k.kit_garrafas : null;
      const cob = vend ? k.estoque_kits / (vend / nd) : null;
      const alerta = k.estoque_kits != null && k.estoque_kits <= 0 ? 'Esgotado' : cob == null ? null : cob <= 3 ? 'Crítico' : cob < 7 ? 'Atenção' : 'OK';
      return { kit: k.kit, kit_nome: k.kit_nome, receita: k.rec + k.frete, kits_vendidos: vend, pmv: k.garrafas ? (k.rec_raw != null ? k.rec_raw : k.rec) / k.garrafas : null, cm2_pct: k.rec + k.frete ? k.cm2 / (k.rec + k.frete) : null, estoque_kits: k.estoque_kits, cobertura_dias: cob, alerta };
    });
  },
});

dash.calc('fb_resumo', {
  title: 'Meta Ads no período × mês',
  description: 'CTR no link, CPC e CPM dos anúncios de e-commerce (sem Clube e Installs) no período e no mês corrente, e a variação do período contra o mês.',
  inputs: ['meta_ads', 'meta_ads_mes'],
  fn: (meta_ads, meta_ads_mes) => {
    const t = (rows) => { const a = rows.filter((r) => !/clube|install/i.test(r.campanha || '')); const g = a.reduce((s, r) => s + r.gasto, 0), i = a.reduce((s, r) => s + r.impressoes, 0), c = a.reduce((s, r) => s + r.cliques, 0); return { g, i, c, ctr: i ? c / i : null, cpm: i ? (g / i) * 1000 : null, cpc: c ? g / c : null }; };
    if (!meta_ads.length) return [];
    const p = t(meta_ads), m = t(meta_ads_mes);
    const v = (a, b) => (a != null && b ? a / b - 1 : null);
    return [{ gasto: p.g, impressoes: p.i, cliques: p.c, ctr: p.ctr, cpc: p.cpc, cpm: p.cpm, ctr_mes: m.ctr, cpc_mes: m.cpc, cpm_mes: m.cpm, var_ctr: v(p.ctr, m.ctr), var_cpc: v(p.cpc, m.cpc), var_cpm: v(p.cpm, m.cpm) }];
  },
});

dash.calc('fb_top_cac', {
  title: 'Top 5 anúncios com mais ativações',
  description: 'Gasto por anúncio (somado pelo nome, campanhas de e-commerce) ÷ novos clientes, com o CAC de novos clientes de todos os anúncios como referência (cac_ref): pedidos pagos com is_first_order = 1 e último clique no anúncio (utm_content). Os 5 com mais novos clientes.',
  inputs: ['meta_ads', 'pedidos_lc'],
  fn: (meta_ads, pedidos_lc) => {
    const A = {}; meta_ads.filter((r) => !/clube|install/i.test(r.campanha || '')).forEach((r) => { A[r.anuncio] = (A[r.anuncio] || 0) + r.gasto; });
    const N = {}; pedidos_lc.filter((r) => r.canal === 'Facebook' && r.is_first_order === 1).forEach((r) => { (N[r.anuncio] || (N[r.anuncio] = new Set())).add(r.pedido); });
    const totG = Object.values(A).reduce((s, g) => s + g, 0), totN = Object.values(N).reduce((s, p) => s + p.size, 0);
    const ref = totN ? totG / totN : null;
    return Object.keys(A).map((k) => { const n = N[k] ? N[k].size : 0; return { anuncio: k, gasto: A[k], novos: n, cac: n ? A[k] / n : null, cac_ref: ref }; }).filter((r) => r.novos > 0).sort((a, b) => b.novos - a.novos || a.cac - b.cac).slice(0, 5).map((r) => Object.assign(r, { tipo: /^VID/i.test(r.anuncio) ? 'Vídeo' : /^EST/i.test(r.anuncio) ? 'Estático' : /^CAT/i.test(r.anuncio) ? 'Catálogo' : 'Outro', influ: /influ/i.test(r.anuncio) }));
  },
});

dash.calc('fb_top_cpc', {
  title: 'Top 5 melhor CPC',
  description: 'Gasto ÷ cliques no link por anúncio (somado pelo nome, campanhas de e-commerce), entre os com 100 cliques ou mais; CTR e CPM do mesmo anúncio.',
  inputs: ['meta_ads'],
  fn: (meta_ads) => {
    const A = {}; meta_ads.filter((r) => !/clube|install/i.test(r.campanha || '')).forEach((r) => { const o = A[r.anuncio] || (A[r.anuncio] = { g: 0, i: 0, c: 0 }); o.g += r.gasto; o.i += r.impressoes; o.c += r.cliques; });
    return Object.keys(A).map((k) => { const o = A[k]; return { anuncio: k, cliques: o.c, ctr: o.i ? o.c / o.i : null, cpm: o.i ? (o.g / o.i) * 1000 : null, cpc: o.c ? o.g / o.c : null }; }).filter((r) => r.cliques >= 100).sort((a, b) => a.cpc - b.cpc).slice(0, 5).map((r) => Object.assign(r, { tipo: /^VID/i.test(r.anuncio) ? 'Vídeo' : /^EST/i.test(r.anuncio) ? 'Estático' : /^CAT/i.test(r.anuncio) ? 'Catálogo' : 'Outro', influ: /influ/i.test(r.anuncio) }));
  },
});

dash.calc('fb_kits_cat', {
  title: 'Top kits do catálogo',
  description: 'Kits vendidos (garrafas ÷ garrafas por kit), PMV (receita sem frete ÷ garrafas) e receita em pedidos com último clique no Facebook em anúncios de catálogo (nome começa com CAT); os 5 com mais kits.',
  inputs: ['pedidos_lc'],
  fn: (pedidos_lc) => {
    const K = {};
    pedidos_lc.filter((r) => r.canal === 'Facebook' && r.kit && r.is_bottle === 1 && r.kit_garrafas && /^CAT/i.test(r.anuncio || '')).forEach((r) => {
      const o = K[r.kit] || (K[r.kit] = { kit: r.kit, kit_nome: r.kit_nome, kits: 0, receita: 0, rec_sf: 0, garrafas: 0 });
      o.kits += r.qtd / r.kit_garrafas; o.receita += r.rec + r.frete; o.rec_sf += r.rec_raw != null ? r.rec_raw : r.rec; o.garrafas += r.qtd;
    });
    return Object.values(K).sort((a, b) => b.kits - a.kits).slice(0, 5).map((o) => ({ kit: o.kit, kit_nome: o.kit_nome, kits: o.kits, pmv: o.garrafas ? o.rec_sf / o.garrafas : null, receita: o.receita }));
  },
});


dash.calc('fb_kits_outros', {
  title: 'Top kits dos outros anúncios',
  description: 'Kits vendidos (garrafas ÷ garrafas por kit), PMV (receita sem frete ÷ garrafas) e receita em pedidos com último clique no Facebook em anúncios que não são de catálogo (nome não começa com CAT); os 5 com mais kits.',
  inputs: ['pedidos_lc'],
  fn: (pedidos_lc) => {
    const K = {};
    pedidos_lc.filter((r) => r.canal === 'Facebook' && r.kit && r.is_bottle === 1 && r.kit_garrafas && !/^CAT/i.test(r.anuncio || '')).forEach((r) => {
      const o = K[r.kit] || (K[r.kit] = { kit: r.kit, kit_nome: r.kit_nome, kits: 0, receita: 0, rec_sf: 0, garrafas: 0 });
      o.kits += r.qtd / r.kit_garrafas; o.receita += r.rec + r.frete; o.rec_sf += r.rec_raw != null ? r.rec_raw : r.rec; o.garrafas += r.qtd;
    });
    return Object.values(K).sort((a, b) => b.kits - a.kits).slice(0, 5).map((o) => ({ kit: o.kit, kit_nome: o.kit_nome, kits: o.kits, pmv: o.garrafas ? o.rec_sf / o.garrafas : null, receita: o.receita }));
  },
});

dash.calc('criativos_estoque', {
  title: 'Criativos × estoque',
  description: 'Os 15 anúncios de e-commerce com mais gasto: receita, ROAS e pedidos last click do anúncio, o kit que ele mais vende, estoque disponível desse kit e dias de cobertura no ritmo de venda do kit (todos os canais) no período.',
  inputs: ['meta_ads', 'pedidos_lc'],
  fn: (meta_ads, pedidos_lc) => {
    if (!pedidos_lc.length) return [];
    const A = {}; meta_ads.filter((r) => !/clube|install/i.test(r.campanha || '')).forEach((r) => { A[r.anuncio] = (A[r.anuncio] || 0) + r.gasto; });
    const tot = {}, info = {};
    pedidos_lc.forEach((r) => { if (r.kit && r.is_bottle === 1 && r.kit_garrafas) { tot[r.kit] = (tot[r.kit] || 0) + r.qtd / r.kit_garrafas; info[r.kit] = r; } });
    const totG = Object.values(A).reduce((s, g) => s + g, 0);
    const totR = pedidos_lc.filter((r) => r.canal === 'Facebook' && A[r.anuncio] != null).reduce((s, r) => s + r.rec + r.frete, 0);
    const ref = totG ? totR / totG : null;
    return Object.keys(A).sort((a, b) => A[b] - A[a]).slice(0, 15).map((ad) => {
      const rows = pedidos_lc.filter((r) => r.canal === 'Facebook' && r.anuncio === ad);
      const rec = rows.reduce((s, r) => s + r.rec + r.frete, 0);
      const k = {}; rows.forEach((r) => { if (r.kit && r.is_bottle === 1 && r.kit_garrafas) k[r.kit] = (k[r.kit] || 0) + r.qtd / r.kit_garrafas; });
      const top = Object.keys(k).sort((a, b) => k[b] - k[a])[0];
      const i = top ? info[top] : null;
      const vend = top ? tot[top] : null;
      const cob = i && vend ? i.estoque_kits / vend : null;
      const alerta = !i ? null : i.estoque_kits != null && i.estoque_kits <= 0 ? 'Esgotado' : cob <= 3 ? 'Crítico' : cob < 7 ? 'Atenção' : 'OK';
      return { anuncio: ad, tipo: /^VID/i.test(ad) ? 'Vídeo' : /^EST/i.test(ad) ? 'Estático' : /^CAT/i.test(ad) ? 'Catálogo' : 'Outro', influ: /influ/i.test(ad), gasto: A[ad], receita: rec, roas: A[ad] ? rec / A[ad] : null, roas_ref: ref, pedidos: new Set(rows.map((r) => r.pedido)).size, kit: top || null, kit_nome: i ? i.kit_nome : rows.length ? 'Só avulsos' : 'Sem pedidos LC', kits_vendidos: vend, estoque_kits: i ? i.estoque_kits : null, cobertura_dias: cob, alerta };
    });
  },
});

dash.calc('camp_email', {
  title: 'Top 5 campanhas de email',
  description: 'Pedidos e receita (produto + frete) dos pedidos pagos com último clique em Email, por utm_campaign, com o id da campanha no Insider (pelo nome); as 5 de maior receita.',
  inputs: ['pedidos_lc', 'email_lista'],
  fn: (pedidos_lc, email_lista) => {
    const ID = new Map(email_lista.map((c) => [String(c.nome).toLowerCase(), c.id]));
    const C = {};
    pedidos_lc.filter((r) => r.canal === 'Email').forEach((r) => { const k = r.campanha || '(sem utm_campaign)'; const o = C[k] || (C[k] = { campanha: k, p: new Set(), receita: 0 }); o.p.add(r.pedido); o.receita += r.rec + r.frete; });
    return Object.values(C).map((o) => ({ campanha: o.campanha, campaign_id: ID.get(o.campanha.toLowerCase()) || null, pedidos: o.p.size, receita: o.receita })).sort((a, b) => b.receita - a.receita).slice(0, 5);
  },
});
dash.calc('camp_whats', {
  title: 'Top 5 disparos de WhatsApp',
  description: 'Pedidos e receita (produto + frete) dos pedidos pagos com último clique em WhatsApp, por utm_campaign; enviados do disparo no Insider (pelo nome) e ROAS = receita ÷ (enviados × R$ 0,3991); os 5 de maior receita.',
  inputs: ['pedidos_lc', 'whats_insider'],
  fn: (pedidos_lc, whats_insider) => {
    const E = new Map(whats_insider.map((c) => [String(c.campanha).toLowerCase(), c.enviados]));
    const C = {};
    pedidos_lc.filter((r) => r.canal === 'WhatsApp').forEach((r) => { const k = r.campanha || '(sem utm_campaign)'; const o = C[k] || (C[k] = { campanha: k, p: new Set(), receita: 0 }); o.p.add(r.pedido); o.receita += r.rec + r.frete; });
    return Object.values(C).map((o) => { const env = E.get(o.campanha.toLowerCase()); const inv = env ? env * 0.3991 : null; return { campanha: o.campanha, enviados: env == null ? null : env, pedidos: o.p.size, receita: o.receita, roas: inv ? o.receita / inv : null }; }).sort((a, b) => b.receita - a.receita).slice(0, 5);
  },
});

dash.calc('camp_email_full', {
  title: 'Top 5 campanhas de email com envios',
  description: 'As 5 campanhas de email de maior receita last click com enviados e open rate de cada uma no Insider.',
  inputs: ['camp_email', 'email_c1', 'email_c2', 'email_c3', 'email_c4', 'email_c5'],
  fn: (camp_email, email_c1, email_c2, email_c3, email_c4, email_c5) => {
    const S = new Map([].concat(email_c1, email_c2, email_c3, email_c4, email_c5).map((r) => [String(r.id), r]));
    return camp_email.map((r) => { const st = S.get(String(r.campaign_id)); return { campanha: r.campanha, enviados: st ? st.enviados : null, open_rate: st ? st.open_rate : null, pedidos: r.pedidos, receita: r.receita }; });
  },
});
dash.calc('whats_resumo', {
  title: 'WhatsApp no período (Insider)',
  description: 'Soma dos disparos de WhatsApp do Insider; investimento = enviados × R$ 0,3991; enviados comparados com a média diária do mês até ontem.',
  inputs: ['whats_insider', 'whats_insider_mes'],
  fn: (whats_insider, whats_insider_mes) => {
    const CUSTO = 0.3991;
    const s = (rows, k) => rows.reduce((a, r) => a + r[k], 0);
    const env = s(whats_insider, 'enviados'), ent = s(whats_insider, 'entregues');
    const m = whats_insider_mes;
    const nd = m.length ? Math.round((new Date(m[0].fim) - new Date(m[0].ini)) / 864e5) + 1 : null;
    const media = nd ? s(m, 'enviados') / nd : null;
    return [{ enviados: env, entregues: ent, taxa_entrega: env ? ent / env : null, cliques: s(whats_insider, 'cliques'), taxa_clique: ent ? s(whats_insider, 'cliques') / ent : null, conversoes: s(whats_insider, 'conversoes'), investimento: env * CUSTO, enviados_media_dia: media, var_enviados: media ? env / media - 1 : null }];
  },
});

dash.calc('whats_roas_dia', {
  title: 'ROAS WhatsApp (dia)',
  description: 'Receita last click do WhatsApp nos pedidos pagos do dia ÷ investimento (enviados × R$ 0,3991).',
  inputs: ['canais_dia', 'whats_resumo'],
  fn: (canais_dia, whats_resumo) => {
    const w = canais_dia.find((r) => r.canal === 'WhatsApp'), r = whats_resumo[0];
    if (!r) return [];
    const rec = w ? w.receita : 0;
    return [{ receita: rec, investimento: r.investimento, roas: r.investimento ? rec / r.investimento : null }];
  },
});

dash.calc('whats_roas_mtd', {
  title: 'ROAS WhatsApp (mês)',
  description: 'Receita last click do WhatsApp no mês (planilha de canais) ÷ investimento (enviados × R$ 0,3991).',
  inputs: ['canais', 'whats_resumo'],
  fn: (canais, whats_resumo) => {
    const w = canais.find((r) => r.canal === 'WhatsApp'), r = whats_resumo[0];
    if (!r) return [];
    const rec = w ? w.receita : 0;
    return [{ receita: rec, investimento: r.investimento, roas: r.investimento ? rec / r.investimento : null }];
  },
});

dash.calc('email_resumo', {
  title: 'Email no período × mês (Insider)',
  description: 'Enviados, entrega, abertura e CTR do Insider no período; enviados contra a média diária do mês até ontem e abertura contra a abertura do mês, em pontos percentuais.',
  inputs: ['email_insider', 'email_insider_mes'],
  fn: (email_insider, email_insider_mes) => {
    const e = email_insider[0], m = email_insider_mes[0];
    if (!e) return [];
    const nd = m ? Math.round((new Date(m.fim) - new Date(m.ini)) / 864e5) + 1 : null;
    const media = m && nd ? m.enviados / nd : null;
    const ab = e.taxa_abertura == null ? null : e.taxa_abertura / 100, abm = m && m.taxa_abertura != null ? m.taxa_abertura / 100 : null;
    return [{ enviados: e.enviados, taxa_entrega: e.taxa_entrega == null ? null : e.taxa_entrega / 100, taxa_abertura: ab, ctr: e.ctr == null ? null : e.ctr / 100, enviados_media_dia: media, var_enviados: media ? e.enviados / media - 1 : null, abertura_mes: abm, var_abertura: ab != null && abm != null ? ab - abm : null }];
  },
});

dash.calc('google_canais', {
  title: 'Google por tipo de campanha',
  description: 'Receita last click, meta, investimento e ROAS de Shopping, SEM Branded, SEM Non-Branded e Demand Gen no período, da planilha de canais; YoY nas mesmas datas do ano passado.',
  inputs: ['canais_diario', 'google_lc'],
  fn: (canais_diario, google_lc) => {
    if (!google_lc.length || !canais_diario.length) return [];
    const ini = google_lc[0].ini, fim = google_lc[0].fim;
    const ly = (s) => String(+s.slice(0, 4) - 1) + s.slice(4);
    const N = { Shopping: 'Shopping', SEM_Branded: 'SEM Branded', SEM_NonBranded: 'SEM Non-Branded', DemandGen: 'Demand Gen' };
    const A = {}, Y = {};
    canais_diario.forEach((r) => { if (!N[r.canal]) return; if (r.data >= ini && r.data <= fim) { const o = A[r.canal] || (A[r.canal] = { rec: 0, plan: 0, inv: 0, inv_plan: 0 }); o.rec += r.rec; o.plan += r.rec_plan; o.inv += r.inv; o.inv_plan += r.inv_plan; } if (r.data >= ly(ini) && r.data <= ly(fim)) Y[r.canal] = (Y[r.canal] || 0) + r.rec; });
    const mk = (canal, o, ry) => ({ canal, receita: o.rec, meta: o.plan, ating: o.plan ? o.rec / o.plan : null, invest: o.inv, invest_plan: o.inv_plan, roas: o.inv ? o.rec / o.inv : null, roas_plan: o.inv_plan ? o.plan / o.inv_plan : null, var_yoy: ry ? o.rec / ry - 1 : null });
    const z = { rec: 0, plan: 0, inv: 0, inv_plan: 0 };
    const rows = Object.keys(N).map((c) => mk(N[c], A[c] || z, Y[c] || 0));
    const t = Object.keys(N).reduce((s, c) => { const o = A[c] || z; return { rec: s.rec + o.rec, plan: s.plan + o.plan, inv: s.inv + o.inv, inv_plan: s.inv_plan + o.inv_plan }; }, { ...z });
    rows.push(mk('Total', t, Object.keys(N).reduce((s, c) => s + (Y[c] || 0), 0)));
    return rows;
  },
});

dash.calc('google_camp', {
  title: 'Pedidos por campanha do Google',
  description: 'Pedidos last click por utm_campaign nos canais do Google no período e a fatia de cada campanha no total do Google; as 20 com mais pedidos.',
  inputs: ['google_lc'],
  fn: (google_lc) => {
    const T = { Shopping: 'Shopping', SEM_Branded: 'SEM Branded', SEM_NonBranded: 'SEM Non-Branded', DemandGen: 'Demand Gen', Bing: 'Bing' };
    const tot = google_lc.reduce((s, r) => s + r.n, 0);
    return google_lc.slice().sort((a, b) => b.n - a.n).slice(0, 20).map((r) => ({ campanha: r.utm_campaign || '(sem utm_campaign)', tipo: T[r.channel] || r.channel, pedidos: r.n, share: tot ? r.n / tot : null }));
  },
});

dash.calc('hora_resumo', {
  title: 'Atingimento até a última hora',
  description: 'Real e planejado acumulados até a última hora com pedidos hoje, atingimento (real ÷ planejado) e a diferença em reais.',
  inputs: ['hora'],
  fn: (hora) => {
    const r = hora.filter((q) => q.real_acum != null).pop();
    if (!r) return [];
    return [{ hora: r.hora, ate: r.hora + 'h59', real_acum: r.real_acum, plano_acum: r.plano_acum, ating_acum: r.ating_acum, gap: r.plano_acum != null ? r.real_acum - r.plano_acum : null }];
  },
});

/* Faixas de preço: vendas por SKU + categoria do grupo de produto */
dash.loader('faixa_vendas', {
  description: 'Vendas solid do período por SKU × meio de pagamento (páginas de 1.000), somadas por SKU (em Hoje boleto condition: sem SAC/TV*/Vivino, boleto a 65% e PIX a 75%; rec_raw sem o fator) com faixa e grupo de vw_ev_grupo_de_produto e nome e SKU raiz de vw_ev_dim_product (chamadas extras em lotes de 200 SKUs); cada linha leva o período.',
  fn: async ({ answer, args, call }) => {
    const P = (a) => { let t = a; if (t && typeof t === 'object' && !Array.isArray(t)) { if (Array.isArray(t.content)) t = t.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'); else if (Array.isArray(t.rows)) return t.rows; } if (Array.isArray(t)) return t; t = String(t == null ? '' : t); if (/^\s*ERRO/.test(t)) throw new Error(t.slice(0, 400)); if (/INCOMPLETO/.test(t)) throw new Error(t.slice(0, 400)); const m = /(^|\n)\s*(\[\s*[\{\]])/.exec(t); if (!m) throw new Error('Resposta sem linhas: ' + t.slice(0, 300)); return JSON.parse(t.slice(m.index + m[1].length)); };
    const ini = args.filters.find((f) => f.op === 'gte').value, fim = args.filters.find((f) => f.op === 'lte').value;
    const pages = async (first, a, max) => { const out = first.slice(); let last = first, off = 0; while (last.length === 1000 && off < max) { const offs = [1, 2, 3, 4].map((k) => off + 1000 * k).filter((o) => o <= max); off = offs[offs.length - 1]; const res = await Promise.all(offs.map((o) => call('query_dataset', Object.assign({}, a, { offset: o })).then(P))); for (const pg of res) { out.push(...pg); last = pg; if (pg.length < 1000) break; } } return { out, cut: last.length === 1000 }; };
    const pg0 = await pages(P(answer), args, 6000); const out = pg0.out, page = { length: pg0.cut ? 1000 : 0 };
    const skus = [...new Set(out.map((r) => r.sku).filter(Boolean))];
    const cat = new Map(), prod = new Map();
    const lotes = []; for (let i = 0; i < skus.length; i += 200) lotes.push('(' + skus.slice(i, i + 200).join(',') + ')');
    await Promise.all(lotes.map(async (lst) => {
      const [gs, ps] = await Promise.all([
        call('query_dataset', { dataset: 'vw_ev_grupo_de_produto', select: ['sku', 'categoria', 'grupo_de_produto'], filters: [{ column: 'sku', op: 'in', value: lst }], limit: 1000 }).then(P),
        call('query_dataset', { dataset: 'vw_ev_dim_product', select: ['sku', 'name', 'sku_root'], filters: [{ column: 'sku', op: 'in', value: lst }], limit: 1000 }).then(P),
      ]);
      gs.forEach((g) => cat.set(String(g.sku), g)); ps.forEach((p) => prod.set(String(p.sku), p));
    }));
    const BC = (args.filters || []).some((f) => f.column === 'is_paid' && f.value === '(0,1)'); const FT = (pm) => (!BC ? 1 : /boleto/i.test(pm || '') ? 0.65 : /pix/i.test(pm || '') ? 0.75 : 1); const EXC = (r) => BC && (String(r.payment_method || '') === 'sac' || /^TV/i.test(String(r.voucher_code || '')) || /^BRI/.test(String(r.order_increment_id || '')) || String(r.marketplace_provider || '') === 'vivino');
    const SA = {}; out.filter((r) => !EXC(r)).forEach((r) => { const f = FT(r.payment_method); const o = SA[r.sku] || (SA[r.sku] = { sku: r.sku, rec: 0, frete: 0, cm2: 0, qtd: 0, rec_raw: 0 }); o.rec += (+r.rec || 0) * f; o.frete += (+r.frete || 0) * f; o.cm2 += (+r.cm2 || 0) * f; o.qtd += +r.qtd || 0; o.rec_raw += +r.rec || 0; });
    return { columns: ['ini', 'fim', 'sku', 'nome', 'sku_root', 'categoria', 'grupo', 'rec', 'frete', 'cm2', 'qtd', 'rec_raw'], cut: page.length === 1000, boleto_condition: BC, rows: Object.values(SA).map((r) => { const g = cat.get(String(r.sku)) || {}, p = prod.get(String(r.sku)) || {}; return { ini, fim, sku: r.sku, nome: p.name || null, sku_root: p.sku_root || null, categoria: g.categoria || null, grupo: g.grupo_de_produto || null, rec: r.rec, frete: r.frete, cm2: r.cm2, qtd: r.qtd, rec_raw: r.rec_raw }; }) };
  },
});
dash.loader('plano_cat', {
  description: 'Aba Acompanhamento Categorias do Plano de Vendas do mês em linhas: SKU raiz (estratégicos), categoria, grupo, garrafas planejadas (PLANO FINAL) e receita planejada (RECEITA TARGET); números pt-BR viram números.',
  fn: ({ answer }) => {
    let t = answer; if (typeof t === 'string') t = JSON.parse(t); if (t && Array.isArray(t.content)) t = JSON.parse(t.content.filter((b) => b.type === 'text').map((b) => b.text).join('')); if (t && t.error) throw new Error(JSON.stringify(t.error).slice(0, 300));
    const num = (x) => { const v = +String(x == null ? '' : x).replace(/R\$|\s/g, '').replace(/\./g, '').replace(',', '.'); return isFinite(v) ? v : 0; };
    return { columns: ['sku_root', 'categoria', 'grupo', 'garrafas_plano', 'receita_plano'], rows: ((t && t.values) || []).filter((r) => r[1] && r[3]).map((r) => ({ sku_root: String(r[0] || '').replace(/\D/g, '') || null, categoria: String(r[1]).trim(), grupo: String(r[3]).trim(), garrafas_plano: num(r[5]), receita_plano: num(r[7]) })) };
  },
});
dash.loader('plano_diario', {
  description: 'Aba 6. Diarização do Plano de Vendas do mês em linhas: data e participação acumulada da meta de receita.',
  fn: ({ answer }) => {
    let t = answer; if (typeof t === 'string') t = JSON.parse(t); if (t && Array.isArray(t.content)) t = JSON.parse(t.content.filter((b) => b.type === 'text').map((b) => b.text).join('')); if (t && t.error) throw new Error(JSON.stringify(t.error).slice(0, 300));
    const pct = (x) => { const v = +String(x == null ? '' : x).replace('%', '').replace(/\./g, '').replace(',', '.'); return isFinite(v) ? v / 100 : null; };
    return { columns: ['data', 'share_acum'], rows: ((t && t.values) || []).map((r) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(r[0] || '').trim()); return m ? { data: m[3] + '-' + m[2] + '-' + m[1], share_acum: pct(r[3]) } : null; }).filter(Boolean) };
  },
});

dash.calc('faixas', {
  title: 'Faixas de preço: real × planejado',
  description: 'Receita (produto + frete) e garrafas do período por faixa contra o planejado do mês × participação da diarização no período (acumulada no fim menos a do dia anterior ao início); sem diarização do mês na planilha, usa a curva da meta last click diária da planilha de canais.',
  inputs: ['faixa_vendas', 'plano_cat', 'plano_diario', 'canais_diario'],
  fn: (faixa_vendas, plano_cat, plano_diario, canais_diario) => {
    if (!faixa_vendas.length || !plano_cat.length) return [];
    const ORD = ['0 - 30', '30 - 50', '50 - 100', 'Acima de 100', 'Outros'];
    const norm = (c) => { const k = String(c || '').trim().toLowerCase(); return ORD.find((o) => o.toLowerCase() === k) || 'Outros'; };
    const ini = faixa_vendas[0].ini, fim = faixa_vendas[0].fim, mes = fim.slice(0, 7);
    const sh = new Map(plano_diario.filter((r) => r.data.slice(0, 7) === mes).map((r) => [r.data, r.share_acum]));
    let share, linear = false;
    if (sh.size) {
      const prev = [...sh.keys()].filter((d) => d < ini).sort().pop();
      share = (sh.get(fim) || 0) - (prev ? sh.get(prev) : 0);
    } else {
      /* diarização do mês ainda não está na planilha: usa a curva da meta last click diária da planilha de canais */
      linear = true;
      const d = canais_diario.filter((r) => r.canal !== 'Total' && r.data.slice(0, 7) === mes);
      const tot = d.reduce((a, r) => a + r.rec_plan, 0), per = d.filter((r) => r.data >= ini && r.data <= fim).reduce((a, r) => a + r.rec_plan, 0);
      if (tot) share = per / tot;
      else { const [y, m] = mes.split('-').map(Number); share = (Math.round((new Date(fim) - new Date(ini)) / 864e5) + 1) / new Date(y, m, 0).getDate(); }
    }
    const R = {}, V = {}, PR = {}, PV = {};
    faixa_vendas.forEach((r) => { const f = norm(r.categoria); R[f] = (R[f] || 0) + r.rec + r.frete; V[f] = (V[f] || 0) + r.qtd; });
    plano_cat.forEach((r) => { const f = norm(r.categoria); PR[f] = (PR[f] || 0) + r.receita_plano * share; PV[f] = (PV[f] || 0) + r.garrafas_plano * share; });
    const mk = (faixa, r, v, pr, pv) => ({ faixa, receita: r, receita_plan: pr, ating: pr ? r / pr : null, gap: r - pr, volume: v, volume_plan: pv, ating_vol: pv ? v / pv : null, gap_vol: v - pv, share_plano: share, plano_linear: linear });
    const rows = ORD.map((f) => mk(f, R[f] || 0, V[f] || 0, PR[f] || 0, PV[f] || 0));
    rows.push(mk('Total', rows.reduce((s, r) => s + r.receita, 0), rows.reduce((s, r) => s + r.volume, 0), rows.reduce((s, r) => s + r.receita_plan, 0), rows.reduce((s, r) => s + r.volume_plan, 0)));
    return rows;
  },
});


dash.loader('email_lista', {
  description: 'Campanhas de email do Insider (duas páginas de 100, as mais recentes) em linhas: id, nome e início.',
  fn: async ({ answer, args, call }) => {
    const U = (x) => { if (typeof x === 'string') { try { return U(JSON.parse(x)); } catch (e) { return x; } } if (x && Array.isArray(x.content)) return U(x.content.filter((b) => b.type === 'text').map((b) => b.text).join('')); if (x && x.structuredContent) return U(x.structuredContent); if (x && typeof x.result === 'string') return Object.assign({}, x, { result: U(x.result) }); return x; };
    const list = (a) => { const t = U(a); const r = (t && t.result) || t; if (r && r.error) throw new Error(JSON.stringify(r).slice(0, 300)); return (r && r.data) || []; };
    const all = list(answer).concat(list(await call('list_email_campaigns', Object.assign({}, args, { page: 2 }))));
    return { columns: ['id', 'nome', 'inicio'], rows: all.map((c) => ({ id: c.id, nome: c.name, inicio: c.startTime })) };
  },
});
[1, 2, 3, 4, 5].forEach((n) => dash.loader('email_c' + n, {
  description: 'Resumo de uma campanha de email do Insider (summary) em uma linha: enviados e open rate.',
  fn: ({ answer, args }) => {
    const U = (x) => { if (typeof x === 'string') { try { return U(JSON.parse(x)); } catch (e) { return x; } } if (x && Array.isArray(x.content)) return U(x.content.filter((b) => b.type === 'text').map((b) => b.text).join('')); if (x && x.structuredContent) return U(x.structuredContent); if (x && typeof x.result === 'string') return Object.assign({}, x, { result: U(x.result) }); return x; };
    const t = U(answer); const r = (t && t.result) || t;
    if (r && r.error) throw new Error(JSON.stringify(r).slice(0, 300));
    const s = r && r.data && r.data.summary;
    if (!s) return { columns: ['id', 'enviados', 'open_rate'], rows: [] };
    return { columns: ['id', 'enviados', 'open_rate'], rows: [{ id: String(args.campaign_id), enviados: +s.sent || 0, open_rate: s.openRate == null ? null : +s.openRate / 100 }] };
  },
}));

dash.calc('sku_top', {
  title: 'Top 5 SKUs por faixa de preço',
  description: 'Os 5 SKUs de maior receita (produto + frete) em cada faixa no período, com share na receita total, garrafas, PMV (receita sem frete ÷ garrafas) e CM2 % (CM2 ÷ receita com frete).',
  inputs: ['faixa_vendas'],
  fn: (faixa_vendas) => {
    const ORD = ['0 - 30', '30 - 50', '50 - 100', 'Acima de 100', 'Outros'];
    const norm = (c) => { const k = String(c || '').trim().toLowerCase(); return ORD.find((o) => o.toLowerCase() === k) || 'Outros'; };
    const tot = faixa_vendas.reduce((s, r) => s + r.rec + r.frete, 0);
    const out = [];
    ORD.forEach((f) => {
      faixa_vendas.filter((r) => norm(r.categoria) === f).sort((a, b) => b.rec + b.frete - (a.rec + a.frete)).slice(0, 5).forEach((r, i) => {
        const rf = r.rec + r.frete;
        out.push({ pos: i + 1, sku: r.sku, nome: r.nome || r.sku, faixa: f, receita: rf, share: tot ? rf / tot : null, garrafas: r.qtd, pmv: r.qtd ? (r.rec_raw != null ? r.rec_raw : r.rec) / r.qtd : null, cm2_pct: rf ? r.cm2 / rf : null });
      });
    });
    return out;
  },
});

dash.calc('plano_gap', {
  title: 'Linhas do plano mais devendo',
  description: 'Real (produto + frete) e planejado do período por linha do Plano de Vendas: grupo de produto para os clusters e SKU raiz para os estratégicos; planejado = receita do mês × participação do período (a mesma das faixas). As 5 linhas com maior diferença negativa.',
  inputs: ['faixa_vendas', 'plano_cat', 'faixas'],
  fn: (faixa_vendas, plano_cat, faixas) => {
    if (!faixas.length || !plano_cat.length) return [];
    const share = faixas[0].share_plano;
    const n = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const R = {}, V = {};
    faixa_vendas.forEach((r) => { const k = /estrat/i.test(n(r.grupo)) ? 'R:' + String(r.sku_root || r.sku).replace(/\D/g, '') : 'G:' + n(r.grupo); R[k] = (R[k] || 0) + r.rec + r.frete; V[k] = (V[k] || 0) + r.qtd; });
    return plano_cat.filter((p) => p.receita_plano > 0).map((p) => {
      const k = p.sku_root ? 'R:' + p.sku_root : 'G:' + n(p.grupo);
      const pl = p.receita_plano * share, re = R[k] || 0;
      return { linha: p.grupo, faixa: p.categoria, tipo: p.sku_root ? 'Estratégico' : 'Cluster', receita: re, receita_plan: pl, ating: pl ? re / pl : null, gap: re - pl, garrafas: V[k] || 0, garrafas_plan: p.garrafas_plano * share };
    }).sort((a, b) => a.gap - b.gap).slice(0, 5);
  },
});

dash.calc('fb_campanhas', {
  title: 'Melhores campanhas do Facebook',
  description: 'Receita (produto + frete), pedidos e novos clientes dos pedidos pagos com último clique no Facebook por utm_campaign, com o gasto da campanha de mesmo nome no Meta Ads e ROAS = receita ÷ gasto; as 10 de maior receita.',
  inputs: ['pedidos_lc', 'meta_ads'],
  fn: (pedidos_lc, meta_ads) => {
    const G = {}; meta_ads.forEach((r) => { const k = String(r.campanha || '').toLowerCase(); G[k] = (G[k] || 0) + r.gasto; });
    const C = {};
    pedidos_lc.filter((r) => r.canal === 'Facebook').forEach((r) => {
      const k = r.campanha || '(sem utm_campaign)';
      const o = C[k] || (C[k] = { campanha: k, receita: 0, p: new Set(), n: new Set() });
      o.receita += r.rec + r.frete; o.p.add(r.pedido); if (r.is_first_order === 1) o.n.add(r.pedido);
    });
    return Object.values(C).map((o) => { const g = G[o.campanha.toLowerCase()] || null; return { campanha: o.campanha, canal: 'Facebook', gasto: g, receita: o.receita, roas: g ? o.receita / g : null, pedidos: o.p.size, novos: o.n.size }; }).sort((a, b) => b.receita - a.receita).slice(0, 10);
  },
});


/* Pedido × SKU com o canal de último clique: base do CM2 por canal e da pirâmide de faixas por grupo de canal */
dash.loader('canal_sku', {
  description: 'Pedidos lidos pedido × SKU × kit em cada dia do período (páginas de 1.000, até 6 chamadas ao mesmo tempo), cruzados com o último clique do mesmo dia (vw_ev_last_click_pedido) com a faixa do SKU (vw_ev_grupo_de_produto) e com nome e garrafas do kit (vw_ev_dim_product_bundle), em lotes de 200, somados por canal × SKU × kit. Ontem e mês: pedidos pagos. Hoje (is_paid em 0,1): boleto condition, sem SAC, televendas TV*, ItaúShop BRI* e Vivino, receita, frete e CM2 de boleto a 65% e PIX a 75%.',
  fn: async ({ answer, args, call }) => {
    const P = (a) => { let t = a; if (t && typeof t === 'object' && !Array.isArray(t)) { if (Array.isArray(t.content)) t = t.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'); else if (Array.isArray(t.rows)) return t.rows; } if (Array.isArray(t)) return t; t = String(t == null ? '' : t); if (/^\s*ERRO/.test(t)) throw new Error(t.slice(0, 400)); if (/INCOMPLETO/.test(t)) throw new Error(t.slice(0, 400)); const m = /(^|\n)\s*(\[\s*[\{\]])/.exec(t); if (!m) throw new Error('Resposta sem linhas: ' + t.slice(0, 300)); return JSON.parse(t.slice(m.index + m[1].length)); };
    const BC = (args.filters || []).some((f) => f.column === 'is_paid' && f.value === '(0,1)');
    const FT = (pm) => (!BC ? 1 : /boleto/i.test(pm || '') ? 0.65 : /pix/i.test(pm || '') ? 0.75 : 1);
    const EXC = (r) => BC && (String(r.payment_method || '') === 'sac' || /^TV/i.test(String(r.voucher_code || '')) || /^BRI/.test(String(r.order_increment_id || '')) || String(r.marketplace_provider || '') === 'vivino');
    const gte = args.filters.filter((f) => f.column === 'created_at_datetime' && f.op === 'gte').map((f) => f.value).sort();
    const ini = gte[0], fim = gte[gte.length - 1];
    const dias = []; for (let d = new Date(ini + 'T12:00:00Z'); d.toISOString().slice(0, 10) <= fim && dias.length < 62; d.setUTCDate(d.getUTCDate() + 1)) dias.push(d.toISOString().slice(0, 10));
    const tentar = async (fn) => { try { return await fn(); } catch (e) { await new Promise((ok) => setTimeout(ok, 1500)); return fn(); } };
    const dia = (a, d) => Object.assign({}, a, { filters: a.filters.filter((f) => f.column !== 'created_at_datetime').concat([{ column: 'created_at_datetime', op: 'gte', value: d }, { column: 'created_at_datetime', op: 'lte', value: d }]) });
    const todas = async (a, first) => { const out = []; let pg = first || (await tentar(async () => P(await call('query_dataset', a)))); out.push(...pg); let off = 0; while (pg.length === 1000 && off < 30000) { off += 1000; const o = off; pg = await tentar(async () => P(await call('query_dataset', Object.assign({}, a, { offset: o })))); out.push(...pg); } return out; };
    const pool = async (tarefas, n) => { const res = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < tarefas.length) { const t = tarefas[i++]; res.push(await t()); } })); return res; };
    const tarefas = [];
    dias.forEach((d) => {
      tarefas.push(async () => ({ tipo: 'f', rows: await todas(dia(args, d), d === fim ? P(answer) : null) }));
      tarefas.push(async () => ({ tipo: 'l', rows: await todas({ dataset: 'vw_ev_last_click_pedido', select: ['order_increment_id', 'channel'], filters: [{ column: 'created_at', op: 'gte', value: d }, { column: 'created_at', op: 'lte', value: d }], order: 'order_increment_id.asc', limit: 1000 }) }));
    });
    const res = await pool(tarefas, 6);
    const strip = (id) => { const m = /^(.+[0-9])R[0-9]+$/.exec(id || ''); return m ? m[1] : id; };
    const ch = new Map(); res.filter((x) => x.tipo === 'l').forEach((x) => x.rows.forEach((r) => ch.set(r.order_increment_id, r.channel)));
    const A = new Map(), ped = {};
    res.filter((x) => x.tipo === 'f').forEach((x) => x.rows.forEach((r) => {
      if (EXC(r)) return;
      const id = r.order_increment_id; const c = ch.get(id) || ch.get(strip(id)) || 'Sem canal'; const f = FT(r.payment_method);
      const k = c + '|' + r.sku + '|' + (r.fk_bundle_product || ''); let o = A.get(k); if (!o) { o = { canal: c, sku: r.sku, kit: r.fk_bundle_product || null, is_bottle: +r.is_bottle || 0, rec: 0, frete: 0, cm2: 0, qtd: 0 }; A.set(k, o); }
      o.rec += (+r.r || 0) * f; o.frete += (+r.s || 0) * f; o.cm2 += (+r.c || 0) * f; o.qtd += +r.q || 0;
    }));
    const skus = [...new Set([...A.values()].map((o) => o.sku).filter(Boolean))];
    const lotes = []; for (let i = 0; i < skus.length; i += 200) lotes.push('(' + skus.slice(i, i + 200).join(',') + ')');
    const cat = new Map();
    (await pool(lotes.map((l) => async () => tentar(async () => P(await call('query_dataset', { dataset: 'vw_ev_grupo_de_produto', select: ['sku', 'categoria'], filters: [{ column: 'sku', op: 'in', value: l }], limit: 1000 })))), 6)).forEach((rs) => rs.forEach((g) => cat.set(String(g.sku), g.categoria)));
    const kits = [...new Set([...A.values()].map((o) => o.kit).filter(Boolean))];
    const kl = []; for (let i = 0; i < kits.length; i += 200) kl.push('(' + kits.slice(i, i + 200).join(',') + ')');
    const KD = new Map();
    (await pool(kl.map((l) => async () => tentar(async () => P(await call('query_dataset', { dataset: 'vw_ev_dim_product_bundle', select: ['sku', 'name', 'number_bottles'], filters: [{ column: 'sku', op: 'in', value: l }], limit: 1000 })))), 6)).forEach((rs) => rs.forEach((k) => KD.set(String(k.sku), k)));
    return { columns: ['canal', 'sku', 'categoria', 'kit', 'kit_nome', 'kit_garrafas', 'is_bottle', 'rec', 'frete', 'cm2', 'qtd'], boleto_condition: BC, rows: [...A.values()].map((o) => { const k = KD.get(String(o.kit)) || {}; return Object.assign({ categoria: cat.get(String(o.sku)) || null, kit_nome: k.name ? String(k.name).replace(/[*\t]+/g, ' ').trim() : null, kit_garrafas: k.number_bottles == null ? null : +k.number_bottles }, o); }) };
  },
});

dash.calc('piramide', {
  title: 'Faixas de preço por grupo de canal',
  description: 'Receita (produto + frete) e garrafas por faixa de preço (categoria de vw_ev_grupo_de_produto) dentro de cada grupo de canal de último clique: Growth (mídia paga), CRM (App Push, Email, SMS, Web Push, WhatsApp) e Outros/Orgânico (o resto, inclusive sem clique); share = participação da faixa no grupo.',
  inputs: ['canal_sku'],
  fn: (canal_sku) => {
    if (!canal_sku.length) return [];
    const GROW = new Set(['Display', 'Mailer', 'Facebook', 'Criteo', 'Shopping', 'SEM_NonBranded', 'SEM_Branded', 'Afiliados', 'Bing', 'DemandGen', 'Tiktok']);
    const CRM = new Set(['AppPush', 'Email', 'SMS', 'WebPush', 'WhatsApp']);
    const grp = (c) => (GROW.has(c) ? 'Growth' : CRM.has(c) ? 'CRM' : 'Outros/Orgânico');
    const ORD = ['0 - 30', '30 - 50', '50 - 100', 'Acima de 100', 'Outros'];
    const norm = (c) => { const k = String(c || '').trim().toLowerCase(); return ORD.find((o) => o.toLowerCase() === k) || 'Outros'; };
    const M = {};
    canal_sku.forEach((r) => { const k = grp(r.canal) + '|' + norm(r.categoria); const o = M[k] || (M[k] = { receita: 0, volume: 0 }); o.receita += r.rec + r.frete; o.volume += r.qtd; });
    const rows = [];
    ['Growth', 'CRM', 'Outros/Orgânico'].forEach((g) => {
      const tr = ORD.reduce((s, f) => s + ((M[g + '|' + f] || {}).receita || 0), 0), tv = ORD.reduce((s, f) => s + ((M[g + '|' + f] || {}).volume || 0), 0);
      ORD.forEach((f) => { const o = M[g + '|' + f] || { receita: 0, volume: 0 }; rows.push({ grupo: g, faixa: f, receita: o.receita, volume: o.volume, share_receita: tr ? o.receita / tr : null, share_volume: tv ? o.volume / tv : null, receita_grupo: tr, volume_grupo: tv }); });
    });
    return rows;
  },
});

dash.calc('canais_todos', {
  title: 'Todos os canais',
  description: 'Como a tabela Todos os canais do Monitoramento de Canais: receita last click, meta, share da receita realizado e da meta (meta do canal ÷ meta total), investimento, meta de investimento e ROAS por canal e por grupo (Growth, CRM, Outros) somados da planilha nas datas do período; Receita e Invest YoY nas datas do ano anterior. pendente = algum dia do período com investimento real em branco e meta de investimento acima de zero.',
  inputs: ['canais_diario', 'vendas', 'vendas_yoy'],
  fn: (canais_diario, vendas, vendas_yoy) => {
    if (!canais_diario.length || !vendas.length) return [];
    const GR = [['Growth', ['Display', 'Mailer', 'Facebook', 'Criteo', 'Shopping', 'SEM_NonBranded', 'SEM_Branded', 'Afiliados', 'Bing', 'DemandGen', 'Tiktok']], ['CRM', ['AppPush', 'Email', 'SMS', 'WebPush', 'WhatsApp']], ['Outros', ['Outros']]];
    const SHOW = { Tiktok: 'TikTok' };
    const ini = vendas[0].ini, fim = vendas[0].fim, iy = vendas_yoy.length ? vendas_yoy[0].ini : null, fy = vendas_yoy.length ? vendas_yoy[0].fim : null;
    const A = {}, Y = {}, PEN = {};
    const z = () => ({ rec: 0, plan: 0, inv: 0, invp: 0 });
    canais_diario.forEach((r) => {
      if (r.canal === 'Total') return;
      if (r.data >= ini && r.data <= fim) { const o = A[r.canal] || (A[r.canal] = z()); o.rec += r.rec; o.plan += r.rec_plan; o.inv += r.inv; o.invp += r.inv_plan; if (r.inv_vazio && r.inv_plan > 0) PEN[r.canal] = true; }
      if (iy && r.data >= iy && r.data <= fy) { const o = Y[r.canal] || (Y[r.canal] = z()); o.rec += r.rec; o.inv += r.inv; }
    });
    const sum = (src, keys) => keys.reduce((a, k) => { const o = src[k] || z(); return { rec: a.rec + o.rec, plan: a.plan + o.plan, inv: a.inv + o.inv, invp: a.invp + o.invp }; }, z());
    const all = GR.flatMap((g) => g[1]);
    const T = sum(A, all);
    const mk = (nivel, grupo, canal, keys) => {
      const a = sum(A, keys), y = sum(Y, keys);
      return { nivel, grupo, canal, chaves: keys.join(','), rec: a.rec, rec_meta: a.plan, ating: a.plan ? a.rec / a.plan : null, share: T.rec ? a.rec / T.rec : null, share_meta: T.plan ? a.plan / T.plan : null, inv: a.inv, inv_meta: a.invp, inv_ating: a.invp ? a.inv / a.invp : null, roas: a.inv ? a.rec / a.inv : null, roas_meta: a.invp ? a.plan / a.invp : null, roas_pp: a.inv && a.invp ? a.rec / a.inv - a.plan / a.invp : null, rec_yoy: y.rec, var_yoy: y.rec ? a.rec / y.rec - 1 : null, inv_yoy: y.inv, var_inv_yoy: y.inv ? a.inv / y.inv - 1 : null, pendente: keys.length === 1 && !!PEN[keys[0]] };
    };
    const rows = [];
    GR.forEach(([g, kids]) => { rows.push(mk('grupo', g, g, kids)); if (g !== 'Outros') kids.forEach((k) => rows.push(mk('canal', g, SHOW[k] || k, [k]))); });
    rows.push(mk('total', 'Total', 'Total', all));
    return rows;
  },
});

dash.calc('kits_grupo', {
  title: 'Top 5 kits por grupo de canal',
  description: 'Os 5 kits com mais receita (produto + frete) em cada grupo de canal de último clique (Growth, CRM, Outros/Orgânico), com kits vendidos (garrafas ÷ garrafas por kit) e share na receita do grupo.',
  inputs: ['canal_sku'],
  fn: (canal_sku) => {
    if (!canal_sku.length) return [];
    const GROW = new Set(['Display', 'Mailer', 'Facebook', 'Criteo', 'Shopping', 'SEM_NonBranded', 'SEM_Branded', 'Afiliados', 'Bing', 'DemandGen', 'Tiktok']);
    const CRM = new Set(['AppPush', 'Email', 'SMS', 'WebPush', 'WhatsApp']);
    const grp = (c) => (GROW.has(c) ? 'Growth' : CRM.has(c) ? 'CRM' : 'Outros/Orgânico');
    const K = {}, T = {};
    canal_sku.forEach((r) => {
      const g = grp(r.canal); T[g] = (T[g] || 0) + r.rec + r.frete;
      if (!r.kit) return;
      const k = g + '|' + r.kit; const o = K[k] || (K[k] = { grupo: g, kit: r.kit, kit_nome: r.kit_nome, kit_garrafas: r.kit_garrafas, receita: 0, garrafas: 0 });
      o.receita += r.rec + r.frete; if (r.is_bottle === 1) o.garrafas += r.qtd;
    });
    const out = [];
    ['Growth', 'CRM', 'Outros/Orgânico'].forEach((g) => Object.values(K).filter((o) => o.grupo === g).sort((a, b) => b.receita - a.receita).slice(0, 5).forEach((o, i) => out.push({ grupo: g, pos: i + 1, kit: o.kit, kit_nome: o.kit_nome || o.kit, receita: o.receita, kits_vendidos: o.kit_garrafas ? o.garrafas / o.kit_garrafas : null, share: T[g] ? o.receita / T[g] : null })));
    return out;
  },
});
