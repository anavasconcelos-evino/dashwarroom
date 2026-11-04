/* Login do dash: só entra quem tiver e-mail Google Workspace dos domínios liberados
   (Víssimo, Evino e Grand Cru). Roda na borda da Vercel antes de qualquer página ou /api.

   /auth/login     → manda para o Google
   / (com ?code=)  → volta do Google: confere o e-mail e grava a sessão (cookie assinado, 7 dias)
   /auth/logout    → apaga a sessão

   Variáveis: GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET (ou AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET), AUTH_SECRET
   e, opcional, AUTH_ALLOWED_DOMAINS (padrão: vissimo.com.br,evino.com.br,grandcru.com.br). */

const COOKIE = 'wr_session';
const STATE_COOKIE = 'wr_oauth';
const SESSION_DAYS = 7;
const PUBLIC = new Set(['/fonts.css', '/favicon.ico']);

const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
const utf8 = (bin) => new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));

function domains() {
  return (process.env.AUTH_ALLOWED_DOMAINS || 'vissimo.com.br,evino.com.br,grandcru.com.br')
    .split(',').map((d) => d.trim().toLowerCase().replace(/^@/, '')).filter(Boolean);
}

async function hmac(text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(process.env.AUTH_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
async function sign(obj) {
  const body = b64url(enc.encode(JSON.stringify(obj)));
  return body + '.' + (await hmac(body));
}
async function verify(token) {
  if (!token || token.indexOf('.') < 0) return null;
  const [body, sig] = token.split('.');
  if (!safeEqual(sig, await hmac(body))) return null;
  try {
    const obj = JSON.parse(utf8(fromB64url(body)));
    return obj.exp > Date.now() ? obj : null;
  } catch (e) { return null; }
}

function cookies(req) {
  const out = {};
  (req.headers.get('cookie') || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
const setCookie = (name, value, maxAge) =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

function redirect(to, extraCookies) {
  const h = new Headers({ Location: to, 'Cache-Control': 'no-store' });
  (extraCookies || []).forEach((c) => h.append('Set-Cookie', c));
  return new Response(null, { status: 302, headers: h });
}

const MSG = {
  dominio: 'Este e-mail não tem acesso. Entre com o seu e-mail @vissimo, @evino ou @grandcru.',
  falha: 'Não foi possível concluir o login. Tente de novo.',
  config: 'O login ainda não foi configurado na Vercel (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET e AUTH_SECRET).',
  saiu: 'Você saiu do War Room.',
};
function loginPage(code, status) {
  const msg = MSG[code] || '';
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>War Room · Evino</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/fonts.css">
<style>
:root{--red:#f9182d;--cream:#fff6f3;--dark:#270d0f;--wine:#751614;--line:#f3d9cf}
*{box-sizing:border-box}html,body{margin:0;min-height:100%}
body{background:var(--cream);color:var(--dark);font-family:'EvBarlowSC',system-ui,-apple-system,'Segoe UI',Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:16px}
.card{background:var(--red);color:#fff;border-radius:22px;padding:clamp(22px,5vw,40px);width:100%;max-width:440px;display:grid;gap:16px}
.eyebrow{font-family:'EvBarlowC',system-ui,sans-serif;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:14px;color:var(--cream)}
h1{font-family:'EvPaytone',system-ui,sans-serif;font-weight:400;font-size:clamp(30px,7vw,40px);line-height:1.05;margin:0}
p{margin:0;font-size:16px;line-height:1.4}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:var(--dark);text-decoration:none;font-family:'EvBarlowC',system-ui,sans-serif;font-weight:700;font-size:17px;border-radius:999px;padding:13px 22px;margin-top:6px}
.btn:hover{background:var(--cream)}.btn:focus-visible{outline:3px solid var(--dark);outline-offset:2px}
.msg{background:var(--wine);border-radius:12px;padding:10px 14px;font-size:15px}
</style></head><body><main class="card">
<span class="eyebrow">( Comercial · Growth · CRM )</span>
<h1>War Room<br>Evino e-commerce</h1>
<p>Acesso restrito ao time Víssimo, Evino e Grand Cru.</p>
${msg ? `<p class="msg" role="alert">${esc(msg)}</p>` : ''}
<a class="btn" href="/auth/login"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Entrar com Google</a>
</main></body></html>`;
  return new Response(html, { status: status || 401, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export default async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  if (PUBLIC.has(path)) return;

  const id = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.AUTH_GOOGLE_ID;
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET;
  /* sem configuração o dash fica fechado (nunca aberto por engano) */
  if (!id || !secret || !process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    return path.startsWith('/api/')
      ? Response.json({ error: 'Login não configurado' }, { status: 503 })
      : loginPage('config', 503);
  }
  const callback = url.origin; /* URI de redirecionamento cadastrado no Google: https://<domínio>, sem barra no final */

  if (path === '/auth/login') {
    const state = b64url(crypto.getRandomValues(new Uint8Array(24)));
    const q = new URLSearchParams({
      client_id: id, redirect_uri: callback, response_type: 'code', scope: 'openid email profile',
      state, prompt: 'select_account', hd: '*',
    });
    return redirect('https://accounts.google.com/o/oauth2/v2/auth?' + q, [setCookie(STATE_COOKIE, state, 600)]);
  }

  if (path === '/' && url.searchParams.has('state') && (url.searchParams.has('code') || url.searchParams.has('error'))) {
    const c = cookies(req);
    const clear = setCookie(STATE_COOKIE, '', 0);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state || !c[STATE_COOKIE] || !safeEqual(state, c[STATE_COOKIE])) return redirect('/auth/erro?m=falha', [clear]);
    let claims;
    try {
      const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: callback, grant_type: 'authorization_code' }),
      });
      const j = await r.json();
      if (!r.ok || !j.id_token) throw new Error(j.error_description || j.error || 'sem id_token');
      /* o id_token veio direto do Google por TLS com o client secret: basta conferir os campos */
      claims = JSON.parse(utf8(fromB64url(j.id_token.split('.')[1])));
    } catch (e) {
      console.error('[auth] troca do código falhou:', String(e && e.message || e));
      return redirect('/auth/erro?m=falha', [clear]);
    }
    const email = String(claims.email || '').toLowerCase();
    const dom = email.split('@')[1] || '';
    const ok = ['https://accounts.google.com', 'accounts.google.com'].includes(claims.iss)
      && claims.aud === id && claims.exp * 1000 > Date.now()
      && claims.email_verified === true
      && domains().includes(dom)
      && domains().includes(String(claims.hd || '').toLowerCase()); /* conta Google Workspace de uma das empresas, não uma conta pessoal criada com esse e-mail */
    if (!ok) {
      console.warn('[auth] acesso negado:', email || '(sem e-mail)');
      return redirect('/auth/erro?m=dominio', [clear]);
    }
    const session = await sign({ email, name: claims.name || '', exp: Date.now() + SESSION_DAYS * 864e5 });
    return redirect('/', [clear, setCookie(COOKIE, session, SESSION_DAYS * 86400)]);
  }

  if (path === '/auth/logout') return redirect('/auth/erro?m=saiu', [setCookie(COOKIE, '', 0)]);
  if (path === '/auth/erro') return loginPage(url.searchParams.get('m') || '', 401);

  const user = await verify(cookies(req)[COOKIE]);
  if (user) return; /* segue para a página ou para /api */
  if (path.startsWith('/api/')) return Response.json({ error: 'Faça login para ver os dados' }, { status: 401 });
  return loginPage('', 401);
}
