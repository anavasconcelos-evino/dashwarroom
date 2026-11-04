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
  /* aceita o JSON colado de qualquer jeito: com espaços invisíveis (copiados de chat ou página),
     aspas curvas, aspas em volta do valor inteiro ou em base64 */
  let txt = String(raw).replace(/^﻿/, '').replace(/[   -​  　]/g, ' ').replace(/[“”]/g, '"').trim();
  if (/^'.*'$/s.test(txt)) txt = txt.slice(1, -1).trim();
  if (!txt.startsWith('{')) { try { const dec = Buffer.from(txt, 'base64').toString('utf8').trim(); if (dec.startsWith('{')) txt = dec; } catch (e) { /* segue */ } }
  let sa;
  try { sa = JSON.parse(txt); } catch (e) { throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não é um JSON válido (' + e.message + '). Cole o arquivo da conta de serviço inteiro, do { ao }.'); }
  if (!sa.client_email || !sa.private_key) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON sem client_email ou private_key');
  if (sa.private_key.indexOf('\\n') >= 0) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
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
