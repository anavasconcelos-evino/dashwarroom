/* Planilhas (Monitoramento de Canais e Plano de Vendas do mês) lidas pela API do Google Sheets
   com uma conta de serviço. Compartilhe as planilhas com o e-mail da conta de serviço (leitor).
   O resultado passa pelos mesmos loaders de data.js, então o formato é o do dash no Claude. */
const { JWT } = require('google-auth-library');
const loaders = require('./loaders');

const CANAIS_ID = process.env.SHEET_MONITORAMENTO_CANAIS || '1TuXjU0vHez3qgezeV4RRNNJoa9AGKl4_v9xnW0dO7EA';
/* arquivos "M-1 Plano de Vendas" aceitos (o dash escolhe pelo mês; acrescente o de dezembro aqui e em index.html) */
const PLANOS = (process.env.SHEET_PLANOS || '1JcYd-hi0CbZjB3BntL8n-VPH1ZVQZEtn4Prc50XB5cA,1Gq9dh7KfKH2OXOH3wtwjsbD66J0n_In4BAYtv6nD2nM').split(',').map((s) => s.trim()).filter(Boolean);

let client = null;
function auth() {
  if (client) return client;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Google Sheets não configurado: falta GOOGLE_SERVICE_ACCOUNT_JSON');
  const sa = JSON.parse(raw);
  client = new JWT({ email: sa.client_email, key: sa.private_key, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  return client;
}
async function getValues({ spreadsheetId, range }) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;
  const r = await auth().request({ url });
  return { values: (r.data && r.data.values) || [] };
}
const run = async (id, args) => {
  const answer = JSON.stringify(await getValues(args));
  const call = async (tool, a) => JSON.stringify(await getValues(a));
  const out = await loaders.get(id)({ answer, args, call });
  return Array.isArray(out) ? out : out.rows;
};

const canais_diario = () => run('canais_diario', { spreadsheetId: CANAIS_ID, range: "'Receita | Real'!A642:U1100" });
function plano(id, range) {
  return ({ plano_id }) => {
    if (!PLANOS.includes(plano_id)) throw new Error('Plano de Vendas não reconhecido: ' + plano_id);
    return run(id, { spreadsheetId: plano_id, range });
  };
}
const plano_cat = plano('plano_cat', "'Acompanhamento Categorias'!A5:H400");
const plano_diario = plano('plano_diario', "'6. Diarização'!C2:F40");

module.exports = { canais_diario, plano_cat, plano_diario };
