/* Fontes do Magento (pedidos, último clique, kits, produtos) lidas direto do Redshift.
   Cada função devolve as linhas no MESMO formato que os loaders do dash entregavam,
   para que os cálculos de data.js rodem sem mudança.

   Conceito de receita (igual ao dash no Claude):
   - pago_in = "(1)"   → Ontem e Mês: pedidos pagos (is_paid = 1), receita = price_to_pay + item_shipping_amount.
   - pago_in = "(0,1)" → Hoje: boleto condition — pedidos solid, sem SAC, televendas (TV*), ItaúShop (BRI*)
     e Vivino; receita, frete e CM2 de boleto a 65% e PIX a 75%. */
const { query, T } = require('./db');

const N = (x) => (x == null || x === '' ? 0 : +x);
const NN = (x) => (x == null || x === '' ? null : +x);
const strip = (id) => { const m = /^(.+[0-9])R[0-9]+$/.exec(id || ''); return m ? m[1] : id; };
const nome = (s) => (s ? String(s).replace(/[*\t]+/g, ' ').replace(/\s+/g, ' ').trim() : null);

const RANGE = (col) => `${col} >= $1::date AND ${col} < DATEADD(day, 1, $2::date)`;
function cond(pagoIn) {
  const bc = pagoIn === '(0,1)';
  return {
    bc,
    where: `f.is_solid = 1 AND ${bc ? 'f.is_paid IN (0, 1)' : 'f.is_paid = 1'}` + (bc
      ? ` AND COALESCE(f.payment_method, '') <> 'sac' AND UPPER(COALESCE(f.voucher_code, '')) NOT LIKE 'TV%' AND f.order_increment_id NOT LIKE 'BRI%' AND LOWER(COALESCE(f.marketplace_provider, '')) <> 'vivino'`
      : ''),
    ft: bc ? `(CASE WHEN f.payment_method ILIKE '%boleto%' THEN 0.65 WHEN f.payment_method ILIKE '%pix%' THEN 0.75 ELSE 1 END)` : '1',
  };
}
const SUMS = (ft) => `SUM(f.price_to_pay * ${ft}) AS rec, SUM(f.item_shipping_amount * ${ft}) AS frete, SUM(f.cm2_realized * ${ft}) AS cm2, SUM(f.qty_ordered) AS qtd, SUM(f.price_to_pay) AS rec_raw`;

/* Cadastro de kits (nome, garrafas por kit, estoque). Se o usuário do Redshift não tiver permissão
   nessa tabela, a consulta roda de novo sem ela: os números saem, só nome e estoque do kit ficam vazios.
   Tenta a tabela de novo a cada 10 minutos, para pegar a permissão assim que for liberada. */
const NO_BUNDLE = '(SELECT NULL::varchar AS sku, NULL::varchar AS name, NULL::numeric AS number_bottles, NULL::numeric AS min_stock_available, NULL::integer AS available_for_sale, NULL::numeric AS special_price)';
let bundleDeniedAt = 0;
async function withBundle(build, params) {
  if (Date.now() - bundleDeniedAt > 10 * 60e3) {
    try { return await query(build(T.bundle), params); } catch (e) {
      const msg = String((e && e.message) || e);
      if (!/permission denied/i.test(msg) || msg.indexOf(T.bundle.split('.')[1]) < 0) throw e;
      bundleDeniedAt = Date.now();
      console.warn('[bundle] sem permissão em ' + T.bundle + ': seguindo sem nome e estoque dos kits');
    }
  }
  return query(build(NO_BUNDLE), params);
}

async function vendas({ ini, fim, pago_in }) {
  const c = cond(pago_in);
  const rows = await query(`SELECT f.is_bottle, ${SUMS(c.ft)} FROM ${T.fact} f WHERE ${RANGE('f.created_at_datetime')} AND ${c.where} GROUP BY 1`, [ini, fim]);
  return rows.map((r) => ({ ini, fim, is_bottle: N(r.is_bottle), rec: N(r.rec), frete: N(r.frete), cm2: N(r.cm2), qtd: N(r.qtd), rec_raw: N(r.rec_raw) }));
}
const vendas_yoy = ({ ini_yoy, fim_yoy }) => vendas({ ini: ini_yoy, fim: fim_yoy, pago_in: '(1)' });

async function pedidos_canal({ ini, fim }) {
  const rows = await query(`SELECT channel, COUNT(order_increment_id) AS n FROM ${T.lc} WHERE ${RANGE('created_at')} GROUP BY 1 ORDER BY 2 DESC`, [ini, fim]);
  return rows.map((r) => ({ channel: r.channel, n: N(r.n) }));
}
const pedidos_canal_yoy = ({ ini_yoy, fim_yoy }) => pedidos_canal({ ini: ini_yoy, fim: fim_yoy });

async function google_lc({ ini, fim }) {
  const rows = await query(`SELECT channel, utm_campaign, COUNT(order_increment_id) AS n FROM ${T.lc}
    WHERE ${RANGE('created_at')} AND channel IN ('Shopping', 'SEM_Branded', 'SEM_NonBranded', 'DemandGen', 'Bing')
    GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 1000`, [ini, fim]);
  return rows.map((r) => ({ ini, fim, channel: r.channel, utm_campaign: r.utm_campaign, n: N(r.n) }));
}

async function kits({ ini, fim, pago_in }) {
  const c = cond(pago_in);
  const rows = await withBundle((bt) => `WITH k AS (
      SELECT f.fk_bundle_product AS kit, SUM(f.price_to_pay * ${c.ft}) AS rec, SUM(f.item_shipping_amount * ${c.ft}) AS frete, SUM(f.cm2_realized * ${c.ft}) AS cm2, SUM(f.qty_ordered) AS garrafas, SUM(f.price_to_pay) AS rec_raw
      FROM ${T.fact} f WHERE ${RANGE('f.created_at_datetime')} AND ${c.where} AND f.is_bottle = 1 GROUP BY 1 ORDER BY 2 DESC LIMIT 41)
    SELECT k.*, b.name, b.number_bottles, b.min_stock_available, b.available_for_sale, b.special_price
    FROM k LEFT JOIN ${bt} b ON b.sku::varchar = k.kit::varchar ORDER BY k.rec DESC`, [ini, fim]);
  return rows.map((r) => ({ ini, fim, kit: r.kit, kit_nome: nome(r.name), kit_garrafas: NN(r.number_bottles), estoque_kits: NN(r.min_stock_available), disponivel: NN(r.available_for_sale), preco: NN(r.special_price), rec: N(r.rec), frete: N(r.frete), cm2: N(r.cm2), garrafas: N(r.garrafas), rec_raw: N(r.rec_raw) }));
}

async function fact_dia({ ini, fim, pago_in }) {
  if (ini !== fim) return []; /* o detalhe por pedido só é usado em Hoje e Ontem */
  const c = cond(pago_in);
  const rows = await withBundle((bt) => `WITH o AS (
      SELECT f.order_increment_id, f.fk_bundle_product, f.is_bottle, f.is_first_order, MAX(f.payment_method) AS payment_method, ${SUMS(c.ft)}
      FROM ${T.fact} f WHERE ${RANGE('f.created_at_datetime')} AND ${c.where} GROUP BY 1, 2, 3, 4)
    SELECT o.*, b.name, b.number_bottles, b.min_stock_available, b.available_for_sale
    FROM o LEFT JOIN ${bt} b ON b.sku::varchar = o.fk_bundle_product::varchar`, [ini, fim]);
  return rows.map((r) => ({ pedido: strip(r.order_increment_id), kit: r.fk_bundle_product, kit_nome: nome(r.name), kit_garrafas: NN(r.number_bottles), estoque_kits: NN(r.min_stock_available), disponivel: NN(r.available_for_sale), is_bottle: N(r.is_bottle), is_first_order: N(r.is_first_order), rec: N(r.rec), frete: N(r.frete), cm2: N(r.cm2), qtd: N(r.qtd), rec_raw: N(r.rec_raw), payment_method: r.payment_method || null }));
}

async function lc_dia({ ini, fim }) {
  if (ini !== fim) return [];
  const rows = await query(`SELECT order_increment_id, channel, utm_campaign, utm_content FROM ${T.lc} WHERE ${RANGE('created_at')}`, [ini, fim]);
  return rows.map((r) => ({ pedido: r.order_increment_id, canal: r.channel, campanha: r.utm_campaign, anuncio: r.utm_content }));
}

/* Hoje e o mesmo dia da semana nas 6 semanas anteriores, somado por dia × hora × meio de pagamento.
   As marcas de exclusão (TV*, BRI*, Vivino) seguem na linha para o cálculo de hora a hora aplicar. */
async function hora_a_hora({ hoje }) {
  const dias = [0, 1, 2, 3, 4, 5, 6].map((w) => { const d = new Date(hoje + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 7 * w); return d.toISOString().slice(0, 10); });
  const rows = await query(`SELECT TO_CHAR(f.created_at_datetime, 'YYYY-MM-DD') AS data, EXTRACT(hour FROM f.created_at_datetime) AS h, f.payment_method,
      CASE WHEN UPPER(COALESCE(f.voucher_code, '')) LIKE 'TV%' THEN 1 ELSE 0 END AS tv,
      CASE WHEN f.order_increment_id LIKE 'BRI%' THEN 1 ELSE 0 END AS bri,
      CASE WHEN LOWER(COALESCE(f.marketplace_provider, '')) = 'vivino' THEN 1 ELSE 0 END AS viv,
      SUM(f.price_to_pay) AS rec, SUM(f.item_shipping_amount) AS frete
    FROM ${T.fact} f
    WHERE f.created_at_datetime >= $1::date AND f.created_at_datetime < DATEADD(day, 1, $2::date) AND f.is_solid = 1
      AND TO_CHAR(f.created_at_datetime, 'YYYY-MM-DD') IN (${dias.map((_, i) => '$' + (i + 3)).join(', ')})
    GROUP BY 1, 2, 3, 4, 5, 6`, [dias[6], dias[0], ...dias]);
  return rows.map((r) => {
    const sem = dias.indexOf(r.data);
    return { data: r.data, semanas_atras: sem, pedido: +r.bri ? 'BRI' : 'X', ts: r.data + 'T' + String(N(r.h)).padStart(2, '0') + ':00:00', payment_method: r.payment_method || null, voucher_code: +r.tv ? 'TV' : null, marketplace_provider: +r.viv ? 'vivino' : null, rec: N(r.rec), frete: N(r.frete) };
  });
}

async function faixa_vendas({ ini, fim, pago_in }) {
  const c = cond(pago_in);
  const rows = await query(`WITH s AS (
      SELECT f.sku, ${SUMS(c.ft)} FROM ${T.fact} f WHERE ${RANGE('f.created_at_datetime')} AND ${c.where} GROUP BY 1)
    SELECT s.*, g.categoria, g.grupo_de_produto, p.name, p.sku_root
    FROM s
    LEFT JOIN (SELECT sku::varchar AS sku, MAX(categoria) AS categoria, MAX(grupo_de_produto) AS grupo_de_produto FROM ${T.grupo} GROUP BY 1) g ON g.sku = s.sku::varchar
    LEFT JOIN (SELECT sku::varchar AS sku, MAX(name) AS name, MAX(sku_root) AS sku_root FROM ${T.produto} GROUP BY 1) p ON p.sku = s.sku::varchar`, [ini, fim]);
  return rows.map((r) => ({ ini, fim, sku: r.sku, nome: r.name || null, sku_root: r.sku_root || null, categoria: r.categoria || null, grupo: r.grupo_de_produto || null, rec: N(r.rec), frete: N(r.frete), cm2: N(r.cm2), qtd: N(r.qtd), rec_raw: N(r.rec_raw) }));
}

/* Pedido × SKU × kit com o canal de último clique: base do CM2 por canal, das faixas e dos top kits por grupo de canal. */
async function canal_sku({ ini, fim, pago_in }) {
  const c = cond(pago_in);
  const rows = await withBundle((bt) => `WITH f AS (
      SELECT CASE WHEN f.order_increment_id ~ '[0-9]R[0-9]+$' THEN REGEXP_REPLACE(f.order_increment_id, 'R[0-9]+$', '') ELSE f.order_increment_id END AS oid,
             f.sku, f.fk_bundle_product AS kit, f.is_bottle,
             SUM(f.price_to_pay * ${c.ft}) AS rec, SUM(f.item_shipping_amount * ${c.ft}) AS frete, SUM(f.cm2_realized * ${c.ft}) AS cm2, SUM(f.qty_ordered) AS qtd
      FROM ${T.fact} f WHERE ${RANGE('f.created_at_datetime')} AND ${c.where} GROUP BY 1, 2, 3, 4),
    l AS (SELECT order_increment_id, MAX(channel) AS channel FROM ${T.lc}
          WHERE created_at >= DATEADD(day, -1, $1::date) AND created_at < DATEADD(day, 2, $2::date) GROUP BY 1),
    a AS (SELECT COALESCE(l.channel, 'Sem canal') AS canal, f.sku, f.kit, f.is_bottle, SUM(f.rec) AS rec, SUM(f.frete) AS frete, SUM(f.cm2) AS cm2, SUM(f.qtd) AS qtd
          FROM f LEFT JOIN l ON l.order_increment_id = f.oid GROUP BY 1, 2, 3, 4)
    SELECT a.*, g.categoria, b.name AS kit_nome, b.number_bottles
    FROM a
    LEFT JOIN (SELECT sku::varchar AS sku, MAX(categoria) AS categoria FROM ${T.grupo} GROUP BY 1) g ON g.sku = a.sku::varchar
    LEFT JOIN (SELECT sku::varchar AS sku, MAX(name) AS name, MAX(number_bottles) AS number_bottles FROM ${bt} bb GROUP BY 1) b ON b.sku = a.kit::varchar`, [ini, fim]);
  return rows.map((r) => ({ canal: r.canal, sku: r.sku, categoria: r.categoria || null, kit: r.kit || null, kit_nome: nome(r.kit_nome), kit_garrafas: NN(r.number_bottles), is_bottle: N(r.is_bottle), rec: N(r.rec), frete: N(r.frete), cm2: N(r.cm2), qtd: N(r.qtd) }));
}

module.exports = { vendas, vendas_yoy, pedidos_canal, pedidos_canal_yoy, google_lc, kits, fact_dia, lc_dia, hora_a_hora, faixa_vendas, canal_sku };
