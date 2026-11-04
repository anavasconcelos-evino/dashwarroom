/* Conexão com o Redshift (protocolo Postgres). As credenciais vêm só das variáveis de
   ambiente do projeto na Vercel — nunca do código. */
const { Pool } = require('pg');

let pool = null;
function getPool() {
  if (pool) return pool;
  const need = ['REDSHIFT_HOST', 'REDSHIFT_DATABASE', 'REDSHIFT_USER', 'REDSHIFT_PASSWORD'];
  const missing = need.filter((k) => !process.env[k]);
  if (missing.length) throw new Error('Redshift não configurado: faltam ' + missing.join(', '));
  pool = new Pool({
    host: process.env.REDSHIFT_HOST,
    port: +(process.env.REDSHIFT_PORT || 5439),
    database: process.env.REDSHIFT_DATABASE,
    user: process.env.REDSHIFT_USER,
    password: process.env.REDSHIFT_PASSWORD,
    ssl: process.env.REDSHIFT_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: 4,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    statement_timeout: 55000,
  });
  return pool;
}

async function query(sql, params) {
  const r = await getPool().query(sql, params || []);
  return r.rows;
}

/* Tabelas no Redshift (as mesmas que alimentam as views do Dados Víssimo).
   Dá para trocar por variável de ambiente sem mexer no código. */
const T = {
  fact: process.env.T_FACT_ORDER_ITEM || 'dora_red_aggregations.ev_fact_order_item',
  /* last click e grupo de produto: tabelas de origem (as views de vissimo_bi e vw_carga_* exigem permissão extra) */
  lc: process.env.T_LAST_CLICK || 'dora_red_aggregations.ev_last_click_full',
  bundle: process.env.T_DIM_BUNDLE || 'dora_red_aggregations.vw_ev_dim_product_bundle',
  grupo: process.env.T_GRUPO_PRODUTO || 'dora_red_aggregations.ev_grupo_de_produto',
  produto: process.env.T_DIM_PRODUCT || 'dora_red_aggregations.ev_dim_product',
};
Object.values(T).forEach((t) => { if (!/^[A-Za-z0-9_]+\.[A-Za-z0-9_]+$/.test(t)) throw new Error('Nome de tabela inválido: ' + t); });

module.exports = { query, T };
