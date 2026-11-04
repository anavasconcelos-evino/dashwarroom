/* Meta Ads pela Marketing API (Graph), com um token de sistema do Business Manager.
   Devolve o mesmo formato dos loaders meta_ads / meta_ads_mes / meta_diario do dash. */
const VERSION = process.env.META_API_VERSION || 'v21.0';
const ACCOUNT = process.env.META_AD_ACCOUNT_ID || '775254035944122';

function token() {
  const t = process.env.META_ACCESS_TOKEN;
  if (!t) throw new Error('Meta Ads não configurado: falta META_ACCESS_TOKEN');
  return t;
}
async function insights(params, maxPages) {
  let url = `https://graph.facebook.com/${VERSION}/act_${ACCOUNT}/insights?` + new URLSearchParams(Object.assign({ access_token: token() }, params)).toString();
  const out = []; let n = 0;
  while (url && n++ < (maxPages || 5)) {
    const r = await fetch(url);
    const j = await r.json();
    if (!r.ok || j.error) throw new Error('Meta Ads: ' + ((j.error && j.error.message) || r.status));
    out.push(...(j.data || []));
    url = j.paging && j.paging.next;
  }
  return out;
}
const act = (row, type) => { const a = (row.actions || []).find((x) => x.action_type === type); return a ? +a.value || 0 : 0; };

async function ads(preset) {
  const rows = await insights({ level: 'ad', date_preset: preset, fields: 'ad_id,ad_name,campaign_name,spend,impressions,inline_link_clicks,actions', limit: '500', filtering: JSON.stringify([{ field: 'spend', operator: 'GREATER_THAN', value: 0 }]) }, 3);
  return rows.map((r) => ({ id: r.ad_id, anuncio: r.ad_name, campanha: r.campaign_name, gasto: +r.spend || 0, impressoes: +r.impressions || 0, cliques: +r.inline_link_clicks || 0, compras_meta: act(r, 'omni_purchase') }))
    .sort((a, b) => b.gasto - a.gasto);
}
const PRESETS = ['today', 'yesterday', 'this_month'];
const meta_ads = ({ meta_preset }) => { if (!PRESETS.includes(meta_preset)) throw new Error('meta_preset inválido'); return ads(meta_preset); };
const meta_ads_mes = () => ads('this_month');
async function meta_diario() {
  const rows = await insights({ level: 'account', date_preset: 'this_month', time_increment: '1', fields: 'spend,impressions,inline_link_clicks,cpm,inline_link_click_ctr' });
  return rows.map((r) => ({ data: r.date_start, gasto: +r.spend || 0, impressoes: +r.impressions || 0, cliques: +r.inline_link_clicks || 0, cpm: +r.cpm || 0, ctr_pct: +r.inline_link_click_ctr || 0 }));
}

module.exports = { meta_ads, meta_ads_mes, meta_diario };
