import { Engine, MODES, DEFAULTS, RANGES } from './engine.js';
import { PALETTES } from './palettes.js';
import { FEATURED } from './presets.js';
import * as Auth from './auth.js';
import * as Gallery from './gallery.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ───────── Engine ───────── */
const engine = new Engine($('#main'), $('#bloom'));
window.__lumen = engine; // handy for debugging
document.body.classList.add('intro-on');

/* ───────── Title letters ───────── */
const title = $('#title');
'Lumen'.split('').forEach((ch, i) => {
  const s = document.createElement('span'); s.textContent = ch;
  s.style.animationDelay = `${0.25 + i * 0.1}s, ${i * -0.6}s`; title.appendChild(s);
});

/* ───────── Toasts ───────── */
function toast(msg, kind = 'ok') {
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3300);
}

/* ───────── Params <-> UI ───────── */
const SLIDERS = [
  ['count', 'Particles', (v) => Math.round(v)], ['speed', 'Speed', (v) => v.toFixed(2)], ['scale', 'Turbulence', (v) => v.toFixed(2)],
  ['trail', 'Trails', (v) => Math.round(((v - 0.8) / 0.16) * 100) + '%'], ['size', 'Brush', (v) => v.toFixed(1)],
  ['glow', 'Glow', (v) => Math.round(v * 100) + '%'], ['symmetry', 'Symmetry', (v) => Math.round(v) + '×'],
  ['spread', 'Colour variance', (v) => v.toFixed(2)], ['mouse', 'Cursor force', (v) => v.toFixed(2)],
];
const sliderBox = $('#sliders');
SLIDERS.forEach(([key, label, fmt]) => {
  const [min, max, step] = RANGES[key];
  const d = document.createElement('div'); d.className = 'sl';
  d.innerHTML = `<div class="top"><span>${label}</span><b id="v-${key}"></b></div><input type="range" id="r-${key}" min="${min}" max="${max}" step="${step}">`;
  sliderBox.appendChild(d);
  const input = $('input', d);
  input.addEventListener('input', () => { engine.setParams({ [key]: parseFloat(input.value) }); paintSlider(key); schedulePersist(); });
});
function paintSlider(key) {
  const [label, fmt] = [SLIDERS.find((s) => s[0] === key)[1], SLIDERS.find((s) => s[0] === key)[2]];
  const [min, max] = RANGES[key], v = engine.params[key], input = $('#r-' + key);
  input.value = v; input.style.setProperty('--p', ((v - min) / (max - min)) * 100 + '%');
  $('#v-' + key).textContent = fmt(v); void label;
}
const modesBox = $('#modes');
MODES.forEach((m, i) => {
  const b = document.createElement('button'); b.textContent = m; b.dataset.mode = m; b.title = `${m} (${i + 1})`;
  b.onclick = () => { engine.setParams({ mode: m }); syncUI(); schedulePersist(); };
  modesBox.appendChild(b);
});
const palBox = $('#palettes');
Object.entries(PALETTES).forEach(([name, cols]) => {
  const b = document.createElement('button'); b.className = 'sw'; b.title = name; b.dataset.pal = name;
  b.style.background = `linear-gradient(120deg, ${cols.join(',')})`;
  b.onclick = () => { engine.setParams({ palette: name }); syncUI(); schedulePersist(); };
  palBox.appendChild(b);
});
$('#mirror').onchange = (e) => { engine.setParams({ mirror: e.target.checked }); engine.clear(); schedulePersist(); };
$('#seed').onchange = (e) => { engine.setParams({ seed: Math.max(0, parseInt(e.target.value) || 0) }); schedulePersist(); };
$('#reseed').onclick = () => { engine.setParams({ seed: (Math.random() * 99999) | 0 }); syncUI(); schedulePersist(); };

function syncUI() {
  const p = engine.params;
  SLIDERS.forEach(([k]) => paintSlider(k));
  $$('#modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === p.mode));
  $$('#palettes .sw').forEach((b) => b.classList.toggle('on', b.dataset.pal === p.palette));
  $('#mirror').checked = !!p.mirror; $('#seed').value = p.seed;
}
function applyParams(p) {
  const clean = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS)) {
    if (p[k] === undefined) continue;
    if (RANGES[k]) clean[k] = clamp(Number(p[k]), RANGES[k][0], RANGES[k][1]);
    else clean[k] = p[k];
  }
  if (!MODES.includes(clean.mode)) clean.mode = DEFAULTS.mode;
  if (!PALETTES[clean.palette]) clean.palette = DEFAULTS.palette;
  clean.mirror = !!clean.mirror; clean.seed = Math.max(0, Math.floor(Number(clean.seed) || 0));
  engine.setParams(clean); engine.clear(); syncUI();
}

if (innerWidth < 760) { $('#panel').classList.add('min'); $('#collapse').textContent = '+'; }
/* persistence + share link */
let persistT;
function schedulePersist() { clearTimeout(persistT); persistT = setTimeout(() => { try { localStorage.setItem('lumen.params', JSON.stringify(engine.params)); } catch {} }, 400); }
const encodeP = () => btoa(unescape(encodeURIComponent(JSON.stringify(engine.params))));
const decodeP = (s) => JSON.parse(decodeURIComponent(escape(atob(s))));
(function boot() {
  let loaded = false;
  try { const m = location.hash.match(/p=([^&]+)/); if (m) { applyParams(decodeP(decodeURIComponent(m[1]))); loaded = true; } } catch {}
  if (!loaded) { try { const s = JSON.parse(localStorage.getItem('lumen.params') || 'null'); if (s) applyParams(s); } catch {} }
  syncUI();
})();

/* ───────── Actions ───────── */
const rnd = (a, b) => a + Math.random() * (b - a);
const history = [];
function pushHistory() { history.push({ ...engine.params }); if (history.length > 40) history.shift(); }
function undo() { const p = history.pop(); if (!p) return toast('Nothing to undo'); applyParams(p); schedulePersist(); toast('Undone'); }
function remix() {
  pushHistory();
  const pals = Object.keys(PALETTES), sym = [1, 1, 2, 3, 4, 5, 6, 8, 10, 12];
  engine.setParams({
    seed: (Math.random() * 99999) | 0, mode: MODES[(Math.random() * MODES.length) | 0], palette: pals[(Math.random() * pals.length) | 0],
    count: Math.round(rnd(2200, 5600) / 100) * 100, speed: +rnd(0.6, 1.8).toFixed(2), scale: +rnd(0.5, 1.8).toFixed(2),
    trail: +rnd(0.88, 0.96).toFixed(3), size: +rnd(0.8, 1.8).toFixed(1), glow: +rnd(0.35, 0.65).toFixed(2),
    symmetry: sym[(Math.random() * sym.length) | 0], mirror: Math.random() < 0.35, spread: +rnd(0.3, 2).toFixed(2),
  });
  engine.clear(); syncUI(); schedulePersist();
  const b = $('#bRemix svg'); b.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
function togglePause() { engine.paused = !engine.paused; $('#bPause').classList.toggle('on', engine.paused); toast(engine.paused ? 'Paused' : 'Playing'); }
function download() {
  const c = engine.snapshot(); c.toBlob((b) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `lumen-${engine.params.seed}.png`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Saved PNG to your downloads');
  });
}
async function copyLink() {
  const url = `${location.origin}${location.pathname}#p=${encodeURIComponent(encodeP())}`;
  try { await navigator.clipboard.writeText(url); toast('Share link copied'); } catch { prompt('Copy this link', url); }
}
async function toggleMic() {
  try { const on = await engine.enableAudio(); $('#bMic').classList.toggle('on', on); toast(on ? 'Listening — play some music!' : 'Microphone off'); }
  catch { toast('Microphone unavailable', 'bad'); }
}
function toggleFull() { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
function hideUI(v) { document.body.classList.toggle('hide-ui', v); $('#peek').hidden = !v; }

$('#bUndo').onclick = undo; $('#bRemix').onclick = remix; $('#bPause').onclick = togglePause; $('#bShot').onclick = download;
$('#bLink').onclick = copyLink; $('#bMic').onclick = toggleMic; $('#bFull').onclick = toggleFull;
$('#bHide').onclick = () => hideUI(true); $('#peek').onclick = () => hideUI(false);
$('#collapse').onclick = () => { const p = $('#panel'); p.classList.toggle('min'); $('#collapse').textContent = p.classList.contains('min') ? '+' : '–'; };

/* ───────── Record clip ───────── */
let rec = null;
function toggleRecord() {
  if (rec) { rec.stop(); return; }
  if (!window.MediaRecorder || !engine.canvas.captureStream) return toast('Recording isn’t supported in this browser', 'bad');
  const stream = engine.canvas.captureStream(30);
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
  const chunks = []; rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 });
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: mime }); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `lumen-${engine.params.seed}.${mime.includes('mp4') ? 'mp4' : 'webm'}`; a.click();
    $('#bRec').classList.remove('rec'); rec = null; toast('Clip saved to your downloads');
  };
  rec.start(); $('#bRec').classList.add('rec'); toast('Recording… press R to stop');
  setTimeout(() => rec && rec.stop(), 60000);
}
$('#bRec').onclick = toggleRecord;

/* ───────── Cinema mode: self-directing show ───────── */
let cinema = null;
function toggleCinema(force) {
  const on = force ?? !cinema;
  if (!on) { clearInterval(cinema?.t); cinema?.bar.remove(); cinema = null; $('#bCinema').classList.remove('on'); hideUI(false); return toast('Cinema mode off'); }
  if (cinema) return;
  const bar = document.createElement('div'); bar.className = 'cinema-bar'; bar.innerHTML = '<span>Cinema</span><i><b></b></i><span style="opacity:.6">Esc to exit</span>';
  document.body.appendChild(bar); hideUI(true); $('#peek').hidden = true; $('#bCinema').classList.add('on');
  const LEN = 14000; let start = performance.now(); const fill = $('b', bar);
  const next = () => { const p = FEATURED[(Math.random() * FEATURED.length) | 0].params; applyParams({ ...p, seed: (Math.random() * 99999) | 0 }); start = performance.now(); };
  next();
  cinema = { bar, t: setInterval(() => { const f = (performance.now() - start) / LEN; fill.style.width = Math.min(100, f * 100) + '%'; if (f >= 1) next(); }, 100) };
  toast('Cinema mode — sit back');
}
$('#bCinema').onclick = () => toggleCinema();

/* ───────── Intro ───────── */
function enter() {
  $('#intro').classList.add('gone'); document.body.classList.remove('intro-on');
  engine.burst(innerWidth / 2, innerHeight / 2, 1.6);
  setTimeout(() => $('#intro').remove(), 1000);
}
$('#enter').onclick = enter;
$('#introSignin').onclick = () => { enter(); setTimeout(() => openAuth('in'), 350); };

/* ───────── Cursor ring + magnetic buttons ───────── */
const cur = $('#cursor'); let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
addEventListener('pointermove', (e) => {
  tx = e.clientX; ty = e.clientY;
  cur.classList.toggle('over', !!e.target.closest('button, a, input, label, .sw, .card-item'));
}, { passive: true });
addEventListener('pointerdown', () => cur.classList.add('down')); addEventListener('pointerup', () => cur.classList.remove('down'));
(function followCursor() { cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22; cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(followCursor); })();
$$('.magnetic').forEach((el) => {
  el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px,${(e.clientY - r.top - r.height / 2) * 0.35}px)`; });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
});
engine.on('fps', (f, n) => { $('#fps').textContent = Math.round(f); $('#pcount').textContent = n.toLocaleString(); });

/* ───────── Auth UI ───────── */
let authMode = 'in', pending = null;
const authModal = $('#authModal');
function openModal(m) { m.hidden = false; setTimeout(() => $('input', m)?.focus(), 80); }
function closeModals() { $$('.modal').forEach((m) => (m.hidden = true)); }
$$('.modal').forEach((m) => { m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) m.hidden = true; }); });

function setAuthMode(m) {
  authMode = m; const up = m === 'up';
  $('#authTitle').textContent = up ? 'Create your account' : 'Welcome back';
  $('#authSub').textContent = up ? 'Join to save creations and share them with the community.' : 'Sign in to save creations and publish to the community.';
  $('#nameField').hidden = !up; $('#authSubmit').textContent = up ? 'Create account' : 'Sign in';
  $('#toggleMode').textContent = up ? 'Have an account? Sign in' : 'New here? Create an account';
  $('#forgot').hidden = up; $('#authErr').textContent = '';
  $('#aPass').autocomplete = up ? 'new-password' : 'current-password';
}
function openAuth(m = 'in') { setAuthMode(m); $('#demoTag').hidden = !Auth.demoMode; openModal(authModal); startAuthArt(); }
function authFail(e) { $('#authErr').textContent = Auth.friendly(e); $('.card', authModal).classList.remove('shake'); void $('.card', authModal).offsetWidth; $('.card', authModal).classList.add('shake'); }
async function runAuth(fn) {
  $('#authErr').textContent = '';
  try { await fn(); } catch (e) { authFail(e); }
}
$('#toggleMode').onclick = () => setAuthMode(authMode === 'in' ? 'up' : 'in');
$('#gBtn').onclick = () => runAuth(() => Auth.signInGoogle());
$('#guest').onclick = () => runAuth(() => Auth.signInGuest());
$('#forgot').onclick = () => runAuth(async () => {
  const email = $('#aEmail').value.trim(); if (!email) throw { message: 'Type your email above first.' };
  await Auth.resetPassword(email); toast('Password reset email sent (if the account exists)');
});
$('#authForm').onsubmit = (e) => {
  e.preventDefault();
  const email = $('#aEmail').value.trim(), pw = $('#aPass').value;
  if (!email) return authFail({ code: 'auth/invalid-email' });
  if (!pw || (authMode === 'up' && pw.length < 6)) return authFail({ code: 'auth/weak-password' });
  runAuth(() => (authMode === 'up' ? Auth.signUpEmail($('#aName').value.trim(), email, pw) : Auth.signInEmail(email, pw)));
};
$('#signinBtn').onclick = () => openAuth('in');
$('#avatarBtn').onclick = (e) => { e.stopPropagation(); $('#userMenu').hidden = !$('#userMenu').hidden; };
addEventListener('click', () => { $('#userMenu').hidden = true; });
$('#umOut').onclick = async () => { await Auth.signOutUser(); toast('Signed out'); if (tab === 'mine') renderGallery(); };
$('#umMine').onclick = () => openGallery('mine');

let lastUid = null;
Auth.onUser((u) => {
  $('#signinBtn').hidden = !!u; $('#avatarBtn').hidden = !u;
  if (u) {
    const av = $('#avatarBtn'); av.textContent = u.photo ? '' : (u.name || '?')[0].toUpperCase();
    av.style.backgroundImage = u.photo ? `url(${u.photo})` : ''; $('#umName').textContent = u.name; $('#umEmail').textContent = u.email || 'Guest account';
    if (!authModal.hidden) { closeModals(); }
    if (u.uid !== lastUid) toast(`Welcome, ${u.name} ✦`);
    lastUid = u.uid;
    if (pending) { const f = pending; pending = null; setTimeout(f, 400); }
    if ($('#drawer').classList.contains('open')) renderGallery();
  } else { lastUid = null; }
});
Auth.initAuth().catch((e) => { console.error(e); toast('Could not reach Firebase — running offline', 'bad'); });

/* Decorative canvas in the auth modal */
let artRaf = 0;
function startAuthArt() {
  cancelAnimationFrame(artRaf);
  const c = $('#authArt'), g = c.getContext('2d'); const W = c.width, H = c.height;
  const dots = Array.from({ length: 160 }, (_, i) => ({ a: Math.random() * 6.28, r: 20 + Math.random() * 230, s: (Math.random() - 0.5) * 0.012, h: i * 2.4 }));
  (function tick() {
    if (authModal.hidden) return;
    g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(4,5,10,.12)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    dots.forEach((d) => {
      d.a += d.s * (1 + 40 / (d.r + 20)); d.h += 0.3;
      const x = W / 2 + Math.cos(d.a) * d.r, y = H / 2 + Math.sin(d.a * 1.0) * d.r * 1.3;
      g.fillStyle = `hsla(${(d.h % 360) * 0.6 + 160},90%,62%,.7)`; g.beginPath(); g.arc(x, y, 1.4, 0, 6.28); g.fill();
    });
    artRaf = requestAnimationFrame(tick);
  })();
}

/* ───────── Save ───────── */
let draftThumb = '';
function startSave() {
  if (!Auth.getUser()) { pending = startSave; toast('Sign in to save your creation'); return openAuth('in'); }
  draftThumb = engine.snapshot(520).toDataURL('image/jpeg', 0.74);
  $('#savePreview').src = draftThumb; $('#saveName').value = ''; $('#savePublic').checked = false;
  openModal($('#saveModal'));
}
$('#bSave').onclick = startSave;
$('#saveGo').onclick = async () => {
  const btn = $('#saveGo'); btn.disabled = true; btn.textContent = 'Saving…';
  try {
    await Gallery.saveCreation({ name: $('#saveName').value.trim() || 'Untitled', params: { ...engine.params }, thumb: draftThumb, isPublic: $('#savePublic').checked });
    closeModals(); toast('Saved to your gallery ✦'); if ($('#drawer').classList.contains('open')) renderGallery();
  } catch (e) { toast(Auth.friendly(e), 'bad'); }
  btn.disabled = false; btn.textContent = 'Save';
};
$('#saveName').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#saveGo').click(); });

/* ───────── Gallery ───────── */
let tab = 'featured';
const drawer = $('#drawer');
function openGallery(t) { if (t) tab = t; drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); $('#scrim').classList.add('on'); $('#userMenu').hidden = true; renderGallery(); }
function closeGallery() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); $('#scrim').classList.remove('on'); }
$('#openGallery').onclick = () => openGallery(); $('#closeDrawer').onclick = closeGallery; $('#scrim').onclick = closeGallery;
$$('#tabs button').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; renderGallery(); }));
const gradFor = (p) => `linear-gradient(120deg, ${(PALETTES[p.palette] || PALETTES.Aurora).join(',')})`;

let current = []; let viewing = null;
const when = (t) => { const d = (Date.now() - t) / 1000; return d < 60 ? 'just now' : d < 3600 ? Math.floor(d / 60) + 'm ago' : d < 86400 ? Math.floor(d / 3600) + 'h ago' : Math.floor(d / 86400) + 'd ago'; };
const myUid = () => Auth.getUser()?.uid;
$('#gSearch').addEventListener('input', () => drawGrid());
$('#gSort').addEventListener('change', () => drawGrid());

async function renderGallery() {
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $('#demoNote').hidden = !(Auth.demoMode && tab !== 'featured');
  $('#gSort').hidden = tab === 'featured';
  const grid = $('#grid');
  if (tab === 'featured') current = FEATURED;
  else if (tab === 'mine' && !Auth.getUser()) { current = []; grid.innerHTML = `<div class="empty"><b>Your gallery is waiting</b>Sign in to save what you make.<br><br><button class="btn primary" id="gSignin">Sign in</button></div>`; $('#gSignin').onclick = () => openAuth('in'); return; }
  else {
    grid.innerHTML = '<div class="empty">Loading…</div>';
    try { current = tab === 'mine' ? await Gallery.listMine() : await Gallery.listPublic(); }
    catch (e) { grid.innerHTML = `<div class="empty"><b>Couldn’t load</b>${esc(Auth.friendly(e))}</div>`; return; }
  }
  drawGrid();
}
function drawGrid() {
  const grid = $('#grid'); grid.innerHTML = '';
  const q = $('#gSearch').value.trim().toLowerCase();
  let items = current.filter((it) => !q || (it.name + ' ' + (it.authorName || it.author || '') + ' ' + (it.params?.palette || '') + ' ' + (it.params?.mode || '')).toLowerCase().includes(q));
  if (tab !== 'featured' && $('#gSort').value === 'top') items = [...items].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0) || b.createdAt - a.createdAt);
  if (!items.length) {
    grid.innerHTML = q ? `<div class="empty"><b>No matches</b>Try another search.</div>` : `<div class="empty"><b>${tab === 'mine' ? 'Nothing saved yet' : 'No public creations yet'}</b>${tab === 'mine' ? 'Hit Save in the dock to keep your first piece.' : 'Be the first — tick “Share to Community” when saving.'}</div>`; return;
  }
  items.forEach((it, i) => {
    const el = document.createElement('div'); el.className = 'card-item'; el.style.animationDelay = Math.min(i, 12) * 40 + 'ms';
    el.innerHTML = `${it.thumb ? `<img class="th" alt="" loading="lazy" src="${esc(it.thumb)}">` : `<div class="th ph" style="--g:${gradFor(it.params)}"></div>`}
      ${it.featured ? '<span class="badge">Featured</span>' : it.public ? '<span class="badge">Public</span>' : ''}
      ${it.likeCount > 0 ? `<span class="likes">♥ ${it.likeCount}</span>` : ''}
      <div class="meta"><b>${esc(it.name)}</b><small>by ${esc(it.authorName || it.author || 'Artist')}${it.createdAt ? ' · ' + when(it.createdAt) : ''}</small></div>`;
    el.onclick = () => openView(it);
    grid.appendChild(el);
  });
}

function openView(it) {
  viewing = it; const p = it.params || {}; const owner = !it.featured && it.uid && it.uid === myUid();
  $('#vImg').src = it.thumb || ''; $('#vImg').style.background = it.thumb ? '' : gradFor(p);
  $('#vName').textContent = it.name; $('#vBy').textContent = `by ${it.authorName || it.author || 'Artist'}${it.createdAt ? ' · ' + when(it.createdAt) : ''}`;
  $('#vChips').innerHTML = [p.mode, p.palette, `${p.count} particles`, p.symmetry > 1 ? `${p.symmetry}× symmetry${p.mirror ? ' mirrored' : ''}` : '', `seed ${p.seed}`].filter(Boolean).map((c) => `<span>${esc(c)}</span>`).join('');
  paintLike(); $('#vLike').hidden = !!it.featured;
  $('#vPub').hidden = !owner; $('#vDel').hidden = !owner; if (owner) $('#vPub').textContent = it.public ? '🔒 Make private' : '🌍 Share publicly';
  openModal($('#viewModal')); $('#vOpen').focus();
}
function paintLike() {
  const it = viewing, liked = (it.likedBy || []).includes(myUid());
  $('#vLike').classList.toggle('liked', liked); $('#vLike').firstChild.textContent = liked ? '♥ ' : '♡ '; $('#vLikes').textContent = it.likeCount || 0;
}
$('#vOpen').onclick = () => { pushHistory(); applyParams(viewing.params); closeModals(); closeGallery(); toast(`Loaded “${viewing.name}”`); schedulePersist(); };
$('#vShare').onclick = async () => {
  const url = `${location.origin}${location.pathname}#p=${encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(viewing.params)))))}`;
  try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { prompt('Copy this link', url); }
};
$('#vLike').onclick = async () => {
  if (!Auth.getUser()) { toast('Sign in to like creations'); return openAuth('in'); }
  const it = viewing, uid = myUid(), liked = (it.likedBy || []).includes(uid);
  it.likedBy = liked ? it.likedBy.filter((x) => x !== uid) : [...(it.likedBy || []), uid]; it.likeCount = Math.max(0, (it.likeCount || 0) + (liked ? -1 : 1)); paintLike();
  try { await Gallery.toggleLike({ ...it, likedBy: liked ? [...it.likedBy, uid] : it.likedBy.filter((x) => x !== uid) }); drawGrid(); }
  catch (e) { toast(Auth.friendly(e), 'bad'); }
};
$('#vDel').onclick = async () => { if (!confirm(`Delete “${viewing.name}”?`)) return; try { await Gallery.removeCreation(viewing.id); closeModals(); toast('Deleted'); renderGallery(); } catch (e) { toast(Auth.friendly(e), 'bad'); } };
$('#vPub').onclick = async () => { try { await Gallery.setPublic(viewing.id, !viewing.public); closeModals(); toast(viewing.public ? 'Now private' : 'Shared with the community'); renderGallery(); } catch (e) { toast(Auth.friendly(e), 'bad'); } };

/* ───────── Keyboard ───────── */
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target; if (t.matches('input, textarea')) { if (e.key === 'Escape') t.blur(); return; }
  if (e.key === 'Escape') { if (cinema) toggleCinema(false); closeModals(); closeGallery(); hideUI(false); return; }
  if (!$('#intro')?.classList.contains('gone') && $('#intro') && e.key === 'Enter') return enter();
  if (!authModal.hidden || !$('#saveModal').hidden) return;
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); remix(); }
  else if (k >= '1' && k <= '4') { engine.setParams({ mode: MODES[+k - 1] }); syncUI(); schedulePersist(); }
  else if (k === '[' || k === ']') { engine.setParams({ symmetry: clamp(engine.params.symmetry + (k === ']' ? 1 : -1), 1, 12) }); syncUI(); schedulePersist(); }
  else if (k === 'c') { const n = Object.keys(PALETTES); engine.setParams({ palette: n[(n.indexOf(engine.params.palette) + 1) % n.length] }); syncUI(); schedulePersist(); }
  else if (k === 'z') undo(); else if (k === 'r') toggleRecord(); else if (k === 'v') toggleCinema(); else if (k === 'p') togglePause(); else if (k === 's') startSave(); else if (k === 'd') download();
  else if (k === 'l') copyLink(); else if (k === 'm') toggleMic(); else if (k === 'g') (drawer.classList.contains('open') ? closeGallery() : openGallery());
  else if (k === 'h') hideUI(!document.body.classList.contains('hide-ui')); else if (k === 'f') toggleFull();
  else if (k === '?' || k === '/') openModal($('#helpModal'));
});
