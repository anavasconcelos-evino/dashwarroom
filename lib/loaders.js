/* Carrega os loaders de public/data.js no servidor (só os das planilhas são usados aqui),
   para que o parse das planilhas seja exatamente o mesmo do dash no Claude. */
const L = {};
const prev = global.dash;
global.dash = { loader: (id, def) => { L[id] = def.fn; }, calc() {}, draw() {} };
require('../public/data.js');
global.dash = prev;

module.exports = { get: (id) => { if (!L[id]) throw new Error('Loader não encontrado: ' + id); return L[id]; } };
