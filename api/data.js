/* GET /api/data?id=<fonte>&<parâmetros> → { rows, at } ou { error }.
   Valida cada parâmetro, chama a fonte certa (Redshift, Google Sheets ou Meta Ads)
   e guarda o resultado em memória por alguns minutos para não repetir a consulta. */
const redshift = require('../lib/redshift-sources');
const sheets = require('../lib/sheets-sources');
const meta = require('../lib/meta-sources');

const SOURCES = Object.assign({}, redshift, sheets, meta);
/* CRM (Insider One): sem integração direta ainda — o bloco de CRM mostra "—" até ligarmos a API do Insider */
['email_insider', 'email_insider_mes', 'whats_insider', 'whats_insider_mes', 'email_lista', 'email_c1', 'email_c2', 'email_c3', 'email_c4', 'email_c5']
  .forEach((id) => { SOURCES[id] = async () => { throw new Error('Insider One ainda não está conectado nesta versão'); }; });

const DATE = /^20[0-9]{2}-[01][0-9]-[0-3][0-9]$/;
const RULES = {
  ini: DATE, fim: DATE, ini_yoy: DATE, fim_yoy: DATE, hoje: DATE, mtd_ini: DATE, mtd_fim: DATE, ini_email: DATE,
  pago_in: /^\((0,1|1)\)$/,
  plano_id: /^[A-Za-z0-9_-]{20,80}$/,
  meta_preset: /^(today|yesterday|this_month)$/,
  email_id_1: /^[0-9]{1,12}$/, email_id_2: /^[0-9]{1,12}$/, email_id_3: /^[0-9]{1,12}$/, email_id_4: /^[0-9]{1,12}$/, email_id_5: /^[0-9]{1,12}$/,
};
/* dados do dia mudam ao longo do dia; os demais quase não mudam */
const TTL = (p) => (p.fim && p.fim < new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10) ? 30 * 60e3 : 3 * 60e3);
const CACHE = new Map();

module.exports = async (req, res) => {
  const q = req.query || {};
  const id = String(q.id || '');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!SOURCES[id]) { res.statusCode = 404; return res.end(JSON.stringify({ error: 'Fonte desconhecida: ' + id })); }
  const p = {};
  for (const [k, v] of Object.entries(q)) {
    if (k === 'id') continue;
    if (!RULES[k] || !RULES[k].test(String(v))) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Parâmetro inválido: ' + k })); }
    p[k] = String(v);
  }
  const key = id + '|' + JSON.stringify(p);
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL(p)) { res.setHeader('X-Cache', 'HIT'); return res.end(JSON.stringify({ rows: hit.rows, at: new Date(hit.at).toISOString() })); }
  try {
    const rows = await SOURCES[id](p);
    CACHE.set(key, { rows, at: Date.now() });
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.end(JSON.stringify({ rows, at: new Date().toISOString() }));
  } catch (e) {
    console.error('[' + id + ']', e);
    res.statusCode = 502;
    res.end(JSON.stringify({ error: String((e && e.message) || e).slice(0, 400) }));
  }
};
