/* RettPad – unabhängige Schulungs-Simulation (fiktive Daten, kein Medizinprodukt, nicht mit einem Hersteller verbunden).
   Statische Single-Page-App ohne Build-Schritt. */
"use strict";
(function () {
const D = window.RPT_DATA;
const KEY = "rettpad-trainer-v1";
/* Einmalige Übernahme lokaler Daten aus früheren Versionen dieser App (gleiche Herkunft/Origin, frühere Schlüsselnamen).
   Alte Schlüssel werden am Muster und am Inhalt erkannt, übernommen und danach entfernt – es geht nichts verloren. */
(function migrateStorage() {
  const NEW = "rettpad-trainer-";
  const mig = (st, rules) => { try { const ks = []; for (let i = 0; i < st.length; i++) ks.push(st.key(i));
    ks.filter((k) => k && !k.startsWith(NEW) && !k.startsWith("sb-") && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(k)).forEach((k) => { for (const [re, nk, test] of rules) { if (!re.test(k)) continue; const v = st.getItem(k);
      if (nk && !st.getItem(NEW + nk) && (!test || test(v))) st.setItem(NEW + nk, v); if (!nk || !test || test(v)) st.removeItem(k); break; } }); } catch (e) {} };
  const isState = (v) => { try { const j = JSON.parse(v); return !!(j && Array.isArray(j.missions) && j.settings); } catch (e) { return false; } };
  const isObj = (v) => { try { const j = JSON.parse(v); return !!j && typeof j === "object"; } catch (e) { return false; } };
  mig(localStorage, [[/-users-v1$/, null], [/-stash-v1$/, "stash-v1", isObj], [/-view$/, "view", (v) => /^(ask|rot|stack)$/.test(v)], [/-last-pnr$/, "last-pnr"], [/-v1$/, "v1", isState]]);
  mig(sessionStorage, [[/-session-pin$/, "session-pin", isObj], [/-auth$/, "auth", (v) => { try { return !!JSON.parse(v).access_token; } catch (e) { return false; } }]]);
})();
const DIS = "RettPad – unabhängige Schulungs-Simulation, keine echten Patientendaten, nicht mit einem Hersteller verbunden";
const SCAN_DEV = ["Defi/Monitor C (Simulation)", "AED Wache (Simulation)", "Drucker Wache (Simulation)"];
const $app = document.getElementById("app");
const $stage = document.getElementById("stage") || document.body;

/* ================= Hilfsfunktionen ================= */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style") el.style.cssText = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(5)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
const pad = (n) => String(n).padStart(2, "0");
const fmtT = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()); };
const fmtHM = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const fmtD = (ms) => { const d = new Date(ms); return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear(); };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clone = (o) => JSON.parse(JSON.stringify(o));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
/* Zeiger-Koordinaten relativ zu einem Element – berücksichtigt die 90°-Drehung im Hochformat */
function localXY(el, e) {
  const r = el.getBoundingClientRect();
  if (document.documentElement.classList.contains("rot")) return [e.clientY - r.top, r.right - e.clientX];
  return [e.clientX - r.left, e.clientY - r.top];
}
function parseTime(v) {
  v = String(v || "").replace(/[^0-9]/g, "");
  if (!v) return "";
  if (v.length <= 2) v = v.padStart(2, "0") + "00";
  if (v.length === 3) v = "0" + v;
  const H = +v.slice(0, 2), M = +v.slice(2, 4);
  if (H > 23 || M > 59) return "";
  return pad(H) + ":" + pad(M);
}
function parseDate(v) {
  const s = String(v || "").trim();
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)) { const [d, m, y] = s.split("."); return pad(d) + "." + pad(m) + "." + y; }
  const n = s.replace(/[^0-9]/g, "");
  if (n.length === 8) { const d = +n.slice(0, 2), m = +n.slice(2, 4); if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return n.slice(0, 2) + "." + n.slice(2, 4) + "." + n.slice(4); }
  if (n.length === 6) { const y = +n.slice(4); return n.slice(0, 2) + "." + n.slice(2, 4) + "." + (y > 30 ? "19" : "20") + n.slice(4); }
  return "";
}
function hmToMs(hm, base) { const d = new Date(base || Date.now()); const [H, M] = hm.split(":"); d.setHours(+H, +M, 0, 0); return d.getTime(); }
function age(geb) { const p = parseDate(geb); if (!p) return ""; const [d, m, y] = p.split(".").map(Number); const n = new Date(); let a = n.getFullYear() - y; if (n.getMonth() + 1 < m || (n.getMonth() + 1 === m && n.getDate() < d)) a--; return a >= 0 && a < 130 ? a : ""; }

/* ================= Persistenz ================= */
function freshPatient(letter, type) {
  return { id: uid(), letter, type: type || "Notfall", created: Date.now(), forms: {}, sel: {}, entries: [], vitals: [], photos: [], sign: {}, scores: {}, meds: [], mat: {}, prenotice: null, closed: false, closedAt: 0, sent: false, printed: 0 };
}
function freshMission(nr) {
  return { id: uid(), nr: nr || "", created: Date.now(), alarm: null, fms: [], manv: [], patients: [freshPatient("A")] };
}
function freshState() {
  const inv = {}; D.MATERIAL.forEach((m) => (inv[m] = { soll: 10, ist: 10 }));
  const m = freshMission();
  return {
    v: 1, ack: false,
    crew: { fahrzeug: "RTW 1/83-1 (fiktiv)", fahrer: "", beifahrer: "", praktikant: "", notarzt: "", wache: "Rettungswache Musterstadt (fiktiv)" },
    missions: [m], cur: m.id, curPat: 0,
    settings: { timestamp: true, na: false, skin: "classic", sound: true, conn: "LTE", fms: 2, medtech: false, device: D.DEVICES[0], stamp: "Rettungsdienst Musterstadt (fiktiv)\nWachstraße 1 · 12345 Musterstadt", copies: 1 },
    inventory: inv, orders: [], vchecks: [], notes: [], sendQueue: [], sent: [], log: [],
    leit: { connected: true, pending: null, update: null }, admin: false, battery: [96, 88], nextNr: 1,
  };
}
let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || freshState(); } catch (e) { S = freshState(); }
/* Geräteliste dieser Version: unbekannte Gerätenamen aus früheren Versionen auf neutrale Simulationsgeräte zurücksetzen */
if (S.settings && !D.DEVICES.includes(S.settings.device)) S.settings.device = D.DEVICES[0];
if (Array.isArray(S.devices)) { S.devices = S.devices.filter((d) => D.DEVICES.includes(d) || SCAN_DEV.includes(d)); if (!S.devices.length) delete S.devices; }
if (!S.v) S = freshState();
S.admin = false;
let saveT = 0;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Speicher voll – bitte alte Einsätze löschen."); } try { if (SESSION) scheduleSync(); } catch (e) {} }, 120); }
function saveNow() { clearTimeout(saveT); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
window.addEventListener("pagehide", saveNow);

/* IndexedDB für Fotos, EKGs, Notizen (Fallback: Speicher) */
const mem = new Map(); let dbP = null;
/* Fotos aus der Datenbank einer früheren Version dieser App (gleiche Origin, Objektspeicher „blobs“) einmalig übernehmen */
async function migrateBlobs(nd) {
  if (!indexedDB.databases) return;
  const list = (await indexedDB.databases()).filter((x) => x.name && x.name !== "rettpad-trainer");
  for (const x of list) {
    const od = await new Promise((r) => { try { const q = indexedDB.open(x.name); q.onsuccess = () => r(q.result); q.onerror = () => r(null); q.onupgradeneeded = () => { try { q.transaction.abort(); } catch (e) {} }; } catch (e) { r(null); } });
    if (!od) continue;
    if (!od.objectStoreNames.contains("blobs")) { od.close(); continue; }
    const all = await new Promise((r) => { const out = []; const c = od.transaction("blobs").objectStore("blobs").openCursor(); c.onsuccess = () => { const cu = c.result; if (cu) { out.push([cu.key, cu.value]); cu.continue(); } else r(out); }; c.onerror = () => r(out); });
    await new Promise((r) => { const t = nd.transaction("blobs", "readwrite"); const s = t.objectStore("blobs"); all.forEach(([k, v]) => s.put(v, k)); t.oncomplete = r; t.onerror = r; t.onabort = r; });
    od.close(); try { indexedDB.deleteDatabase(x.name); } catch (e) {}
  }
}
function db() {
  if (dbP) return dbP;
  dbP = new Promise((res) => {
    try {
      const r = indexedDB.open("rettpad-trainer", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("blobs");
      r.onsuccess = () => migrateBlobs(r.result).then(() => res(r.result), () => res(r.result)); r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
  return dbP;
}
/* Fotos früherer Versionen gleich beim Start übernehmen (nicht erst beim ersten Fotozugriff) */
setTimeout(() => { try { db(); } catch (e) {} }, 0);
async function putBlob(id, data) { mem.set(id, data); const d = await db(); if (!d) return; return new Promise((r) => { const t = d.transaction("blobs", "readwrite"); t.objectStore("blobs").put(data, id); t.oncomplete = r; t.onerror = r; }); }
async function getBlob(id) { if (mem.has(id)) return mem.get(id); const d = await db(); if (!d) return null; return new Promise((r) => { const q = d.transaction("blobs").objectStore("blobs").get(id); q.onsuccess = () => { if (q.result) mem.set(id, q.result); r(q.result || null); }; q.onerror = () => r(null); }); }
async function delBlob(id) { mem.delete(id); const d = await db(); if (!d) return; d.transaction("blobs", "readwrite").objectStore("blobs").delete(id); }

/* ================= Zugriff ================= */
const M = () => S.missions.find((m) => m.id === S.cur) || S.missions[0];
const P = () => { const m = M(); return m.patients[Math.min(S.curPat, m.patients.length - 1)] || m.patients[0]; };
const INDEX = {};
(function () { for (const pk in D.TREE) (function walk(list, path) { for (const n of list) { INDEX[n.id] = Object.assign({}, n, { p: pk, path: path.concat(n.id) }); if (n.children) walk(n.children, path.concat(n.id)); } })(D.TREE[pk].children, []); })();
function node(id) { return INDEX[id]; }
function patType(p) {
  const v = p.sel.s_einsatzart;
  if (v === "Krankentransport (KTP)") return "KTP";
  if (v === "Intensivtransport (ITW)") return "ITW";
  if (v) return "Notfall";
  return p.type || "Notfall";
}
function formFilled(p, fname) {
  const f = D.FORMS[fname], v = p.forms[fname] || {};
  const req = f.fields.filter((x) => x.req);
  if (req.length) return req.every((x) => String(v[x.k] || "").trim());
  return f.fields.some((x) => String(v[x.k] || "").trim());
}
function isDone(p, id) {
  if (id === "DX") return Object.keys(p.sel).some((k) => k.startsWith("m_dx_") && p.sel[k] && p.sel[k].length) || formFilled(p, "dxtext");
  const n = node(id); if (!n) return false;
  if (n.kind === "single") return !!p.sel[id];
  if (n.kind === "multi") return !!(p.sel[id] && p.sel[id].length);
  if (n.kind === "form") return formFilled(p, n.form);
  if (n.kind === "entry") return p.entries.some((e) => e.node === id);
  if (n.kind === "tool") {
    if (n.tool === "gcs") return !!p.scores.gcs;
    if (n.tool === "vitals") return p.vitals.length > 0;
    if (n.tool === "signature") return Object.keys(p.sign).length > 0;
    if (n.tool === "camera") return p.photos.length > 0;
    if (n.tool === "meds") return p.meds.length > 0;
    if (n.tool === "iss4") return !!p.scores.iss4;
    if (n.tool === "befast") return !!p.scores.befast;
    if (n.tool === "scores") return Object.keys(p.scores).length > 0;
  }
  return false;
}
function requiredFor(p) { return D.REQUIRED.base.concat(D.REQUIRED[patType(p)] || []); }
function missing(p) { return requiredFor(p).filter((r) => !isDone(p, r.id)); }
function markState(p, pk) { const r = requiredFor(p).filter((x) => x.p === pk); if (!r.length) return null; return r.every((x) => isDone(p, x.id)) ? "ok" : "open"; }
function subtreeHasReq(p, n) {
  const req = requiredFor(p).map((r) => r.id);
  let has = false, done = true;
  (function walk(x) { if (req.includes(x.id)) { has = true; if (!isDone(p, x.id)) done = false; } (x.children || []).forEach(walk); })(n);
  if (n.id && n.id.startsWith("m_dx_") && req.includes("DX")) { has = true; done = isDone(p, "DX"); }
  return has ? (done ? "ok" : "open") : null;
}
function patName(p) { const f = p.forms.patient || {}; return [f.name, f.vorname].filter(Boolean).join(", ") || "unbekannt"; }
function canEdit(silent) { const p = P(); if (p.closed && !S.admin) { if (!silent) toast("Protokoll ist abgeschlossen – keine Änderungen möglich (nur Admin-Rolle)."); return false; } return true; }
function logSys(t) { S.log.unshift({ t: Date.now(), x: t }); S.log = S.log.slice(0, 200); }

/* ================= UI-Grundlagen ================= */
let toastT = 0;
function toast(msg, ms) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = h("div", { class: "toast", role: "status" }, msg); $stage.append(t);
  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), ms || 2600);
}
function modal(title, body, buttons, opts) {
  opts = opts || {};
  const bg = h("div", { class: "modal-bg" });
  const close = () => { bg.remove(); opts.onclose && opts.onclose(); };
  bg._close = close;
  const foot = h("div", { class: "mf" }, (buttons || [{ t: "Schließen" }]).map((b) =>
    h("button", { class: "tbtn " + (b.cls || ""), "data-a": b.a || null, onclick: () => { if (b.fn && b.fn(close) === false) return; close(); } }, b.t)));
  const m = h("div", { class: "modal " + (opts.wide ? "wide" : ""), role: "dialog", "aria-label": title },
    h("h3", null, h("span", { class: "sp" }, title), h("button", { class: "tbtn", "aria-label": "Schließen", onclick: close }, "✕")),
    h("div", { class: "mb" }, body), foot);
  bg.append(m); $stage.append(bg);
  bg.addEventListener("click", (e) => { if (e.target === bg && !opts.sticky) close(); });
  return close;
}
function confirmBox(title, text, okText, fn, cls) {
  modal(title, h("p", null, text), [{ t: "Abbr." }, { t: okText || "OK", cls: cls || "primary", fn: () => fn() }]);
}
let actx = null;
function beep(pattern) {
  if (!S.settings.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    let t = actx.currentTime;
    (pattern || [[880, 0.15], [0, 0.08], [880, 0.15], [0, 0.08], [1175, 0.3]]).forEach(([f, d]) => {
      if (f) { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; o.type = "square"; g.gain.value = 0.06; o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d); }
      t += d;
    });
  } catch (e) {}
}

/* ================= Ansichten-Stack ================= */
let V = [{ t: "home" }];
const top = () => V[V.length - 1];
/* Navigation: Scrollposition der verlassenen Ansicht wird am Ansichts-Objekt gemerkt („_sc“);
   neue Seite startet oben, „zurück“ stellt die Position der Elternliste wieder her. */
function go(v, replace) { rememberScroll(); if (replace) V = [v]; else V.push(v); v._sc = v._sc || {}; render(); }
function back() { rememberScroll(); if (V.length > 1) V.pop(); else V = [{ t: "home" }]; render(); }
function home() { rememberScroll(); V = [{ t: "home" }]; render(); }

/* ================= Icons ================= */
const IC = {
  klinik: '<svg viewBox="0 0 40 40"><path d="M5 19 20 6l15 13v15H5z" fill="#d23b3b" stroke="#6b1010" stroke-width="1.5"/><path d="M17 17h6v5h5v6h-5v5h-6v-5h-5v-6h5z" fill="#fff"/></svg>',
  leit: '<svg viewBox="0 0 40 40"><path d="M20 14 13 36M20 14l7 22M15 29h10" stroke="#333" stroke-width="2.5" fill="none"/><circle cx="20" cy="12" r="3" fill="#333"/><path d="M12 6a11 11 0 0 0 0 13M28 6a11 11 0 0 1 0 13M8 3a16 16 0 0 0 0 19M32 3a16 16 0 0 1 0 19" stroke="#333" stroke-width="2" fill="none"/></svg>',
  home: '<svg viewBox="0 0 40 40"><path d="M5 20 20 7l15 13" stroke="#2b3a55" stroke-width="3" fill="none"/><path d="M10 18v16h8v-9h4v9h8V18" fill="#2b3a55"/></svg>',
  schnell: '<svg viewBox="0 0 40 40"><circle cx="24" cy="7" r="3.5" fill="#d23b3b"/><path d="M21 12l-6 8 6 3-3 11M21 12l6 6 6-2M18 23l-8 3M21 17l-8-2" stroke="#d23b3b" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="31" cy="30" r="7" fill="#fff" stroke="#333" stroke-width="2"/><path d="M31 26v4l3 2" stroke="#333" stroke-width="2" fill="none"/></svg>',
  zeit: '<svg viewBox="0 0 40 40"><circle cx="20" cy="21" r="14" fill="#fff" stroke="#333" stroke-width="3"/><path d="M20 12v10l7 4" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  na: '<svg viewBox="0 0 40 40"><rect x="4" y="9" width="32" height="22" rx="4" fill="#fff" stroke="#333" stroke-width="2"/><text x="20" y="26" font-size="14" font-weight="700" font-family="Arial" text-anchor="middle" fill="#333">NA</text></svg>',
  doc: '<svg viewBox="0 0 40 40"><path d="M9 4h16l7 7v25H9z" fill="#fff" stroke="#333" stroke-width="2"/><path d="M25 4v7h7M13 17h15M13 22h15M13 27h11" stroke="#333" stroke-width="2" fill="none"/></svg>',
  cam: '<svg viewBox="0 0 40 40"><rect x="4" y="12" width="32" height="21" rx="3" fill="#2b3a55"/><path d="M14 12l3-5h6l3 5" fill="#2b3a55"/><circle cx="20" cy="22" r="7" fill="#9fb7d6" stroke="#fff" stroke-width="2"/></svg>',
  ekg: '<svg viewBox="0 0 40 40"><rect x="3" y="7" width="34" height="26" rx="3" fill="#222"/><path d="M5 22h8l3-7 4 13 3-9 2 3h10" stroke="#4cd964" stroke-width="2.4" fill="none" stroke-linejoin="round"/></svg>',
  menu: '<svg viewBox="0 0 40 40"><path d="M7 11h26M7 20h26M7 29h26" stroke="#333" stroke-width="4" stroke-linecap="round"/></svg>',
};
const svg = (k) => h("span", { html: IC[k], style: "display:flex" });

/* ================= Rendering ================= */
/* ---- Scroll- & Fokus-Erhalt beim Neuaufbau ----
   render() baut #app komplett neu auf (replaceChildren). Dabei gingen bisher die scrollTop-Werte aller
   scrollbaren Container (.content, .nav, Listen, #app im Stapelmodus) und der Fokus verloren → Sprung nach oben.
   Jetzt: Positionen vor dem Neuaufbau je Container-Pfad merken und danach wiederherstellen. */
let lastViewKey = null, lastView = null;
const viewKey = (v) => JSON.stringify(v, (k, x) => (k === "_sc" || k === "data" ? undefined : x));
function elPath(el, root) {
  const parts = [];
  for (let e = el; e && e !== root; e = e.parentElement) {
    const par = e.parentElement; if (!par) break;
    const id = e.id ? "#" + e.id : (e.dataset && (e.dataset.a || e.dataset.f || e.dataset.p || e.dataset.q)) ? "[" + (e.dataset.a || e.dataset.f || e.dataset.p || e.dataset.q) + "]" : "";
    /* nur die erste Klasse verwenden: Zustandsklassen („has“, „on“, „active“) ändern sich bei der Auswahl */
    const c0 = (el2) => String(el2.className || "").split(/\s+/)[0];
    const same = Array.prototype.filter.call(par.children, (c) => c.tagName === e.tagName && c0(c) === c0(e));
    parts.unshift(e.tagName + "." + c0(e) + id + ":" + same.indexOf(e));
  }
  return parts.join(">");
}
function collectScroll() {
  const out = { "#app": $app.scrollTop, "#doc": (document.scrollingElement || document.documentElement).scrollTop };
  $app.querySelectorAll("*").forEach((el) => { if (el.scrollTop > 0) out[elPath(el, $app)] = el.scrollTop; });
  return out;
}
function applyScroll(sc) {
  if (!sc) return;
  const map = {}; $app.querySelectorAll("*").forEach((el) => { if (el.scrollHeight > el.clientHeight) map[elPath(el, $app)] = el; });
  Object.keys(sc).forEach((k) => {
    if (k === "#app") $app.scrollTop = sc[k];
    else if (k === "#doc") (document.scrollingElement || document.documentElement).scrollTop = sc[k];
    else if (map[k]) map[k].scrollTop = sc[k];
  });
}
/* nur die Ansichts-Container merken, die zur aktuellen Seite gehören (Navigation links bleibt ohnehin stehen) */
function rememberScroll() { const t = top(); if (t && $app.firstChild) t._sc = collectScroll(); }
function render() {
  document.body.className = "skin-" + (S.settings.skin || "classic");
  const t = top(), key = viewKey(t), same = (t === lastView || key === lastViewKey) && !!$app.firstChild;
  const before = $app.firstChild ? collectScroll() : null;
  const navSc = (document.querySelector("#app > .nav, #app > .adm-nav") || {}).scrollTop || 0;
  const ae = document.activeElement, focus = ae && ae !== document.body && $app.contains(ae)
    ? { path: elPath(ae, $app), s: ae.selectionStart, e: ae.selectionEnd } : null;
  const admUi = t.t === "adm"; ADMIN_UI = admUi; $app.classList.toggle("adm", admUi);
  if (admUi) $app.replaceChildren(...renderAdmin()); else $app.replaceChildren(renderNav(), renderMain());
  if (same) applyScroll(before);
  else {
    /* neue Seite: oben starten bzw. gemerkte Position (Rückkehr aus Untermaske); Navigation bleibt */
    $app.scrollTop = 0; applyScroll(t._sc || {});
    const nav = document.querySelector("#app > .nav, #app > .adm-nav"); if (nav) nav.scrollTop = navSc;
  }
  lastViewKey = key; lastView = t;
  if (focus && same) {
    const map = {}; $app.querySelectorAll("input,textarea,select,button,[tabindex]").forEach((el) => { map[elPath(el, $app)] = el; });
    const el = map[focus.path];
    if (el) { try { el.focus({ preventScroll: true }); if (focus.s != null && el.setSelectionRange) el.setSelectionRange(focus.s, focus.e); } catch (e) {} }
  }
  drawSmallGraph();
  save();
}
function renderNav() {
  const p = P(), m = M(), t = top();
  const activeP = t.t === "node" ? t.p : null;
  const pbtns = Object.keys(D.TREE).map((k) => {
    const st = markState(p, k);
    return h("button", { class: "pbtn" + (activeP === k ? " active" : "") + (p.closed ? " locked" : ""), "data-p": k, onclick: () => go({ t: "node", p: k, path: [] }, true) },
      st ? h("i", { class: "mark " + (st === "ok" ? "ok" : "") }) : null,
      h("span", { class: "nr" }, D.TREE[k].nr + "."), D.TREE[k].label);
  });
  const q = (id, icon, label, fn, cls) => h("button", { class: "qbtn " + (cls || ""), "data-q": id, title: label, "aria-label": label, onclick: fn }, svg(icon), h("span", { class: "ql" }, label));
  const quick = h("div", { class: "quick" },
    q("klinik", "klinik", "Klinik", () => go({ t: "tool", tool: "prenotice" }), p.prenotice && p.prenotice.status === "bestätigt" ? "on" : ""),
    q("leit", "leit", "Leitstelle", () => go({ t: "tool", tool: "leitstelle" }), S.leit.pending || S.leit.update ? "alarm" : ""),
    q("home", "home", "Home", home),
    q("schnell", "schnell", "Schnelldoku", () => go({ t: "tool", tool: "quickdoc" })),
    q("zeit", "zeit", "Zeitstempel", toggleTimestamp, S.settings.timestamp ? "" : "off"),
    q("na", "na", "NA", toggleNA, S.settings.na ? "on" : ""),
    q("vorschau", "doc", "Vorschau", () => go({ t: "tool", tool: "preview" })),
    q("kamera", "cam", "Kamera", () => go({ t: "tool", tool: "camera" })),
    q("medtech", "ekg", "Med.-Technik", () => go({ t: "tool", tool: "medtech" }), S.settings.medtech ? "on" : ""),
    q("menu", "menu", "Menü", () => go({ t: "tool", tool: "menu" })));
  const done = missing(p).length === 0;
  const patsel = h("div", { class: "patsel" },
    h("button", { "aria-label": "vorheriger Patient", onclick: () => switchPat(-1) }, "◀"),
    h("button", { class: "pmain", "data-q": "patients", onclick: () => go({ t: "tool", tool: "patients" }) },
      h("span", { class: "pletter" }, p.letter), h("span", { class: "pname" }, patName(p)),
      h("span", { class: "pstate", style: "color:" + (p.closed ? "#333" : done ? "#1d7a2c" : "#c31d1d") }, p.closed ? "🔒" : done ? "✔" : "✚"),
      h("span", null, "(" + m.patients.length + ")")),
    h("button", { "aria-label": "nächster Patient", onclick: () => switchPat(1) }, "▶"));
  const graph = h("div", { class: "graph" }, h("canvas", { id: "smallGraph", onclick: () => go({ t: "tool", tool: "graph" }) }),
    h("button", { class: "gfull", onclick: () => go({ t: "tool", tool: "graph" }) }, "Vollbild"));
  return h("nav", { class: "nav", "aria-label": "Navigationsbereich" },
    h("div", { class: "rotate-hint" }, "Bitte Gerät ins Querformat drehen"),
    h("div", { class: "crew", "data-a": "crewrow", title: [S.crew.fahrzeug, S.crew.beifahrer, S.crew.fahrer, S.crew.praktikant, S.crew.notarzt].filter(Boolean).join(" · ") + (curUser() ? " – angemeldet: " + uName(curUser()) : "") }, h("b", null, "Besatzung:"), h("span", null, [S.crew.fahrzeug, S.crew.beifahrer, S.crew.fahrer, S.crew.notarzt].filter(Boolean).join(" · ")), h("span", { class: "ptype" }, patType(p))),
    h("div", { class: "pgrid" }, pbtns), quick, patsel, graph, renderStatus());
}
/* Aktualisierung durch Hintergrund-Ereignisse: Eingabemasken nicht neu aufbauen (Entwürfe bleiben erhalten) */
function softRefresh() {
  const t = top();
  if (ADMIN_UI && t.t === "adm") { save(); return; }
  if (t.t === "home" || t.t === "node" || (t.t === "tool" && ["leitstelle", "graph", "medtech", "send", "list", "prenotice"].includes(t.tool))) { render(); return; }
  const nav = document.querySelector(".nav"); if (nav) { const sc = nav.scrollTop; const nn = renderNav(); nav.replaceWith(nn); nn.scrollTop = sc; }
  drawSmallGraph(); save();
}
function batClass(v) { return v > 50 ? "g" : v >= 30 ? "y" : v >= 10 ? "o" : "r"; }
function renderStatus() {
  const bc = { g: "#4cd964", y: "#ffd60a", o: "#ff9500", r: "#ff3b30" };
  const bat = (v, i) => h("span", { class: "sb", title: "Akku " + (i + 1) + ": " + v + " %" }, h("span", { class: "bat" }, h("i", { style: "width:" + Math.max(2, v * 0.18) + "px;background:" + bc[batClass(v)] })), v + "%");
  const q = S.sendQueue.length;
  const conn = S.leit.connected && S.settings.conn !== "offline";
  return h("div", { class: "statusbar", id: "statusbar" },
    S.battery.map(bat),
    h("span", { class: "sb", title: "Stammdaten aktuell" }, "⟳"),
    h("span", { class: "sb", title: "Datenübertragung: " + q + " in Versandliste" }, h("i", { class: "dot " + (q ? (sending ? "y" : "o") : "g") }), "▲▼" + (q ? q : "")),
    h("span", { class: "sb", title: "EKG/Medizintechnik" }, h("i", { class: "dot " + (S.settings.medtech ? "g" : "") }), "EKG"),
    h("span", { class: "sb", title: "Funk/Mobilfunk" }, h("i", { class: "dot " + (conn ? "g" : "r") }), S.settings.conn),
    h("span", { class: "sb", title: "GPS" }, h("i", { class: "dot g" }), "GPS"),
    h("span", { class: "clock", id: "clock" }, fmtT(Date.now())));
}
function switchPat(d) {
  const m = M(); if (m.patients.length < 2) { toast("Nur ein Patient in diesem Einsatz. Neuer Patient über Patientenwahlschalter."); return; }
  S.curPat = (S.curPat + d + m.patients.length) % m.patients.length; render(); toast("Patient " + P().letter + " gewählt");
}
function toggleTimestamp() { S.settings.timestamp = !S.settings.timestamp; toast(S.settings.timestamp ? "Zeitstempel EIN – Einträge erhalten die aktuelle Uhrzeit" : "Zeitstempel AUS – Uhrzeit wird bei jedem Eintrag abgefragt"); render(); }
function toggleNA() { if (!canEdit()) return; S.settings.na = !S.settings.na; addEntry(null, S.settings.na ? "Notarzt eingetroffen" : "Notarzt abgerückt", "Verlauf"); }

function title() {
  const t = top();
  if (t.t === "home") return ["Übersicht", "Einsatz " + (M().nr || "–")];
  if (t.t === "node") { const parts = [D.TREE[t.p].nr + ". " + D.TREE[t.p].label].concat(t.path.map((id) => node(id).label.replace(/-/g, ""))); return [parts.pop(), parts.join(" › ")]; }
  if (t.t === "opts") { const n = node(t.nodeId); return [n.label.replace(/-/g, ""), D.TREE[n.p].nr + ". " + D.TREE[n.p].label]; }
  if (t.t === "form") return [D.FORMS[t.form].title, t.from ? D.TREE[t.from].label : ""];
  if (t.t === "tool") return [TOOLS[t.tool] ? TOOLS[t.tool].title : t.tool, ""];
  return ["", ""];
}
function renderMain() {
  const [tt, crumb] = title();
  const p = P();
  const last = p.entries.slice().sort((a, b) => b.t - a.t)[0];
  let body;
  try { body = renderView(top()); } catch (e) { console.error(e); body = h("div", { class: "empty" }, "Fehler in dieser Ansicht: " + e.message); }
  return h("main", { class: "main" },
    h("div", { class: "topbar" },
      V.length > 1 || top().t !== "home" ? h("button", { class: "tbtn", "data-a": "back", onclick: back }, "◀ zurück") : null,
      h("h1", null, crumb ? h("span", { class: "crumb" }, crumb + " › ") : null, tt),
      p.closed ? h("span", { class: "chip r" }, "abgeschlossen") : null,
      h("span", { class: "badge", title: DIS }, "RETTPAD · SCHULUNG · FIKTIVE DATEN")),
    h("div", { class: "content", id: "content" }, body),
    h("button", { class: "lastentry", "data-a": "verlaufsliste", onclick: () => go({ t: "tool", tool: "list" }) },
      h("span", { class: "t" }, last ? fmtT(last.t) + (last.edited ? "*" : "") : "--:--:--"),
      h("span", { class: "x" }, last ? last.cat + ": " + last.text : "Verlaufsliste leer – Einträge erscheinen hier"), h("span", null, "☰")));
}
function renderView(v) {
  if (v.t === "home") return viewHome();
  if (v.t === "node") return viewNode(v);
  if (v.t === "form") return viewForm(v);
  if (v.t === "tool") return TOOLS[v.tool].render(v);
  return h("div");
}

/* ================= Einträge ================= */
const CAT = { p1: "Rett. Daten", p2: "Anamnese", p3: "Erstbefund", p4: "Diagnose", p5: "Verlauf", p6: "Maßnahmen", p7: "Übergabe", p8: "Ergebnis", p9: "Abschluss" };
function askTime(cb) {
  const inp = h("input", { inputmode: "numeric", placeholder: "HHMM", value: fmtHM(Date.now()).replace(":", ""), style: "font-size:28px;min-height:56px;width:100%;text-align:center" });
  modal("Uhrzeit eingeben (Zeitstempel aus)", h("div", { class: "fld" }, h("label", null, "Uhrzeit HHMM"), inp), [
    { t: "Abbr." }, { t: "OK", cls: "primary", fn: () => { const v = parseTime(inp.value); if (!v) { toast("Ungültige Uhrzeit"); return false; } cb(hmToMs(v)); } }]);
  setTimeout(() => inp.select(), 50);
}
function addEntry(nodeId, text, cat, opts) {
  if (!canEdit()) return;
  opts = opts || {};
  const p = P();
  const doAdd = (t) => {
    const e = { id: uid(), t, node: nodeId, cat: cat || (nodeId ? CAT[node(nodeId).p] : "Verlauf"), text, edited: false, static: !!opts.static, created: Date.now() };
    p.entries.push(e);
    const n = nodeId && node(nodeId);
    if (n && n.mat) n.mat.forEach((mm) => (p.mat[mm] = (p.mat[mm] || 0) + 1));
    if (!opts.silent) toast(fmtT(t) + "  " + e.cat + ": " + text);
    if (opts.bg) softRefresh(); else render();
  };
  if (opts.t) doAdd(opts.t); else if (S.settings.timestamp || opts.static) doAdd(Date.now()); else askTime(doAdd);
}
function setStatic(nodeId, value) {
  const p = P(), n = node(nodeId);
  p.entries = p.entries.filter((e) => !(e.static && e.node === nodeId));
  const v = Array.isArray(value) ? value.join(", ") : value;
  if (v) p.entries.push({ id: uid(), t: Date.now(), node: nodeId, cat: CAT[n.p], text: n.label.replace(/-/g, "") + ": " + v, static: true, edited: false, created: Date.now() });
}

/* ================= Klickstruktur ================= */
function childrenOf(v) {
  let list = D.TREE[v.p].children;
  for (const id of v.path) list = node(id).children || [];
  const ty = patType(P());
  return list.filter((n) => !(n.itwOnly && ty !== "ITW"));
}
function valueText(p, n) {
  if (n.kind === "single") return selText(p, n);
  if (n.kind === "multi") return (p.sel[n.id] || []).join(", ");
  if (n.kind === "form") { const v = p.forms[n.form] || {}; return D.FORMS[n.form].fields.map((f) => v[f.k]).filter(Boolean).slice(0, 3).join(", "); }
  if (n.kind === "entry") { const c = p.entries.filter((e) => e.node === n.id).length; return c ? c + "× dokumentiert" : ""; }
  if (n.kind === "tool") {
    if (n.tool === "gcs" && p.scores.gcs) return "GCS " + p.scores.gcs.total;
    if (n.tool === "vitals" && p.vitals.length) return p.vitals.length + " Messungen";
    if (n.tool === "signature") return Object.keys(p.sign).length ? Object.keys(p.sign).length + " Unterschrift(en)" : "";
    if (n.tool === "camera") return p.photos.length ? p.photos.length + " Foto(s)" : "";
    if (n.tool === "meds") return p.meds.length ? p.meds.length + " Gabe(n)" : "";
    if (n.tool === "iss4" && p.scores.iss4) return "4ISS " + p.scores.iss4.total;
    if (n.tool === "befast" && p.scores.befast) return p.scores.befast.pos ? "positiv" : "negativ";
  }
  if (n.kind === "menu") { let c = 0; (function w(x) { (x.children || []).forEach((y) => { if (valueText(p, y)) c++; w(y); }); })(n); return c ? c + " Angaben" : ""; }
  return "";
}
/* Anzeigetext einer Auswahl inkl. Zusatz (z. B. Schmerz + Tolerabilität) */
function selText(p, n) {
  const v = p.sel[n.id]; const s = Array.isArray(v) ? v.join(", ") : v || "";
  const tol = n.tol && s && p.sel[n.id + "_tol"];
  return s && tol ? s + ", " + tol : s;
}
function viewNode(v) {
  const p = P();
  const kids = childrenOf(v);
  const tiles = kids.map((n) => {
    const st = subtreeHasReq(p, n);
    const val = valueText(p, n);
    return h("button", { class: "tile" + (val ? " has" : ""), "data-node": n.id, onclick: () => openNode(n, v) },
      st ? h("i", { class: "mark " + (st === "ok" ? "ok" : "") }) : null,
      n.kind === "menu" || n.options ? h("span", { class: "more" }, "›") : null,
      n.label.replace(/-/g, "\u00AD"), val ? h("span", { class: "val" }, val) : null);
  });
  const wrap = h("div", null, h("div", { class: "tiles" }, tiles));
  if (v.p === "p4") {
    const sel = Object.keys(p.sel).filter((k) => k.startsWith("m_dx_")).flatMap((k) => p.sel[k]);
    wrap.append(h("div", { class: "card", style: "margin-top:12px" }, h("h2", null, "Gewählte Diagnosen"), h("div", { class: "cb" }, sel.length ? sel.map((s) => h("span", { class: "chip" }, s)) : h("span", { class: "small" }, "noch keine Diagnose gewählt"))));
  }
  return wrap;
}
function openNode(n, v) {
  if (n.kind === "menu") return go({ t: "node", p: v.p, path: v.path.concat(n.id) });
  if (n.kind === "form") return go({ t: "form", form: n.form, nodeId: n.id, from: v.p });
  if (n.kind === "tool") return go({ t: "tool", tool: n.tool, nodeId: n.id });
  if (n.kind === "entry" && !n.options) { addEntry(n.id, fullLabel(n)); return; }
  go({ t: "opts", nodeId: n.id, p: v.p, path: v.path });
}
function fullLabel(n, opt) {
  n = INDEX[n.id] || n;
  const names = (n.path || [n.id]).slice(0, -1).map((id) => node(id).label).filter((l) => !/^[A-E] - /.test(l) && !/Neuro|Exposure/.test(l));
  return names.concat(n.label).join(" ").replace(/-/g, "") + (opt ? ": " + opt : "");
}
/* Optionsansicht (single/multi/entry mit Optionen) */
const _rv = renderView;
renderView = function (v) { return v.t === "opts" ? viewOpts(v) : _rv(v); };
function viewOpts(v) {
  const n = node(v.nodeId), p = P();
  const cur = p.sel[n.id];
  const tiles = n.options.map((o) => {
    const on = n.kind === "single" ? cur === o : n.kind === "multi" ? (cur || []).includes(o) : false;
    return h("button", { class: "tile" + (on ? " sel" : "") + (n.info && n.info[o] ? " info" : ""), "data-opt": o, onclick: () => pickOpt(n, o) }, o);
  });
  const hint = n.kind === "entry" ? "Jede Auswahl erzeugt einen Verlaufseintrag mit Zeitstempel." : n.kind === "multi" ? "Mehrfachauswahl – mit OK übernehmen." + (n.excl ? " „" + n.excl.join("“ / „") + "“ schließen andere Befunde aus." : "") : n.tol ? "Wert wählen, Tolerabilität angeben und mit OK übernehmen (erneut antippen = löschen)." : "Einfachauswahl – Antippen übernimmt den Wert (erneut antippen = löschen).";
  if (n.tol) {
    const tk = n.id + "_tol", nb = !cur || cur === "nicht beurteilbar";
    return h("div", null, h("p", { class: "small", style: "color:#e6e8ee;margin:0 0 8px" }, hint), h("div", { class: "tiles" }, tiles),
      h("div", { class: "card", style: "margin-top:10px" }, h("h2", null, "Schmerz für den Patienten"), h("div", { class: "cb" },
        h("div", { class: "seg", "data-a": "tol" }, n.tol.map((o) => h("button", { type: "button", class: p.sel[tk] === o ? "on" : "", "data-tol": o, disabled: nb, onclick: () => { if (!canEdit()) return; p.sel[tk] = p.sel[tk] === o ? "" : o; setStatic(n.id, selText(p, n)); render(); } }, o))),
        nb ? h("p", { class: "small" }, cur === "nicht beurteilbar" ? "Schmerz nicht beurteilbar – keine Tolerabilität." : "Zuerst einen NRS-Wert wählen.") : null)),
      h("div", { class: "formbar" }, h("button", { class: "tbtn", onclick: () => { if (!canEdit()) return; p.sel[n.id] = ""; p.sel[tk] = ""; setStatic(n.id, ""); render(); } }, "Auswahl löschen"), h("button", { class: "tbtn ok", "data-a": "ok", onclick: () => { back(); toast(n.label.replace(/-/g, "") + ": " + (selText(p, n) || "gelöscht")); } }, "OK")));
  }
  return h("div", null, h("p", { class: "small", style: "color:#e6e8ee;margin:0 0 8px" }, hint), h("div", { class: "tiles" }, tiles),
    n.kind === "multi" ? h("div", { class: "formbar" }, h("button", { class: "tbtn", onclick: () => { if (!canEdit()) return; p.sel[n.id] = []; setStatic(n.id, ""); render(); } }, "Auswahl löschen"), h("button", { class: "tbtn ok", "data-a": "ok", onclick: back }, "OK")) : null);
}
function pickOpt(n, o) {
  if (!canEdit()) return;
  const p = P();
  if (n.kind === "entry") { addEntry(n.id, fullLabel(n, o)); return; }
  if (n.kind === "single" && n.tol) {
    p.sel[n.id] = p.sel[n.id] === o ? "" : o;
    if (!p.sel[n.id] || o === "nicht beurteilbar") p.sel[n.id + "_tol"] = "";
    setStatic(n.id, selText(p, n)); render(); return;
  }
  if (n.kind === "single") {
    p.sel[n.id] = p.sel[n.id] === o ? "" : o; setStatic(n.id, p.sel[n.id]);
    if (n.id === "s_einsatzart") p.type = patType(p);
    if (n.id === "s_naca") p.scores.naca = p.sel[n.id];
    back(); toast(n.label.replace(/-/g, "") + ": " + (p.sel[n.id] || "gelöscht"));
    return;
  }
  const arr = p.sel[n.id] || (p.sel[n.id] = []);
  const i = arr.indexOf(o);
  if (i >= 0) arr.splice(i, 1); else {
    if (n.excl) { if (n.excl.includes(o)) arr.length = 0; else for (const x of n.excl) { const j = arr.indexOf(x); if (j >= 0) arr.splice(j, 1); } }
    arr.push(o); if (n.info && n.info[o]) modal("Hinweis (i)", h("p", { style: "font-size:1.1em" }, "ℹ️ " + n.info[o]), [{ t: "OK", cls: "primary" }]); }
  setStatic(n.id, arr); render();
}

/* ================= Formulare ================= */
function fieldEl(f, val, onchg) {
  const filled = () => String(val() || "").trim() !== "";
  const wrap = h("div", { class: "fld" + (f.req ? " req" : "") + (f.type === "textarea" ? " wide" : "") + (f.req && filled() ? " filled" : ""), "data-k": f.k });
  const upd = (x) => { onchg(x); wrap.classList.toggle("filled", String(x || "").trim() !== ""); };
  let inp;
  if (f.type === "toggle") {
    inp = h("div", { class: "seg" }, f.options.map((o) => h("button", { type: "button", class: val() === o ? "on" : "", onclick: (e) => { const nv = val() === o ? "" : o; upd(nv); [...e.target.parentNode.children].forEach((b) => b.classList.toggle("on", b.textContent === nv)); } }, o)));
  } else if (f.type === "select") {
    inp = h("select", { onchange: (e) => upd(e.target.value) }, f.options.map((o) => { const op = h("option", { value: o }, o || "– bitte wählen –"); if (o === val()) op.selected = true; return op; }));
  } else if (f.type === "textarea") {
    inp = h("textarea", { oninput: (e) => upd(e.target.value) }); inp.value = val() || "";
  } else {
    inp = h("input", { value: val() || "", inputmode: f.type === "number" || f.type === "time" || f.type === "date" ? "numeric" : null, placeholder: f.type === "time" ? "HHMM" : f.type === "date" ? "TTMMJJJJ" : "", autocomplete: "off", oninput: (e) => upd(e.target.value) });
    if (f.type === "time" || f.type === "date") inp.addEventListener("change", (e) => { const r = f.type === "time" ? parseTime(e.target.value) : parseDate(e.target.value); if (e.target.value && !r) { toast("Ungültige Eingabe – Format " + (f.type === "time" ? "HHMM" : "TTMMJJJJ")); e.target.value = ""; upd(""); } else { e.target.value = r; upd(r); } });
  }
  wrap.append(h("label", null, f.label + (f.req ? " *" : "")), inp);
  return wrap;
}
/* SINNHAFT-Vorbefüllung aus den Einsatzdaten */
function sinnhaftPrefill(p) {
  const fo = (n) => p.forms[n] || {}, pa = fo("patient"), tr = fo("transport"), ue = fo("uebergabe"), me = fo("medikation");
  const sl = (id) => { const n = INDEX[id]; return n ? selText(p, n) : ""; };
  const ka = "k. A.";
  const vs = p.vitals.slice().sort((a, b) => a.t - b.t);
  const lastOf = (k) => { for (let i = vs.length - 1; i >= 0; i--) if (vs[i][k] != null && vs[i][k] !== "") return vs[i]; return null; };
  const vv = (k, l, u) => { const r = lastOf(k); return r ? l + " " + (k === "sys" ? r.sys + "/" + (r.dia || "–") : r[k]) + (u ? " " + u : "") : ""; };
  const j = (...a) => a.filter(Boolean).join(", ");
  const dx = Object.keys(p.sel).filter((k) => k.startsWith("m_dx_")).flatMap((k) => p.sel[k] || []);
  const a = age(pa.geb);
  const s = "„Start“ – Übergabe" + (sl("s_uebergabe_an") ? " an " + sl("s_uebergabe_an") : "") + (ue.an ? " (" + ue.an + ")" : "") + (ue.klinik ? ", " + ue.klinik : "") + ". Alle bereit? Ruhe, keine Tätigkeit am Patienten.";
  const i = j(pa.geschlecht || "Geschlecht " + ka, pa.name ? (pa.name + (pa.vorname ? ", " + pa.vorname : "")) : "Name " + ka, a !== "" ? a + " Jahre" : "Alter " + ka, pa.gewicht && (a === "" || a < 18) ? pa.gewicht + " kg" : "");
  const n1 = ["Was: " + (j(dx.join(", "), fo("dxtext").text, sl("m_symptome")) || ka), "Wie: " + (fo("notfallgeschehen").text || tr.stichwort || ka), "Wann: " + (sl("s_ereignisbeginn") || (tr.t_alarm ? "Alarm " + tr.t_alarm : ka)), "Wo/woher: " + (j(sl("s_auffinde"), tr.einsatzort) || ka)].join("\n");
  const atm = sl("m_atmung"), airway = /Stridor|Apnoe|Schnappatmung/.test(atm) || dx.some((x) => /Atemwegsverlegung|Aspiration/.test(x));
  const gcs = p.scores.gcs ? "GCS " + p.scores.gcs.total : "";
  const n2 = [
    "A: " + (airway ? "Problem – " + atm : (atm ? "frei" : ka)),
    "B: " + (j(atm, vv("spo2", "SpO2", "%"), vv("af", "AF", "/min"), vv("co2", "etCO2", "mmHg")) || ka),
    "C: " + (j(sl("s_ekg"), vv("hf", "HF", "/min"), vv("sys", "RR", "mmHg"), sl("m_haut")) || ka),
    "D: " + (j(sl("s_bewusstsein"), gcs, sl("s_pupli") ? "Pupille li " + sl("s_pupli") : "", sl("s_pupre") ? "re " + sl("s_pupre") : "", sl("m_extrem"), p.scores.befast ? "BE-FAST " + (p.scores.befast.pos ? "positiv" : "negativ") : "", p.scores.iss4 ? "4ISS " + p.scores.iss4.total : "", vv("bz", "BZ", "mg/dl"), sl("m_psyche") ? "Psyche: " + sl("m_psyche") : "") || ka),
    "E: " + (j(sl("m_verletz") ? "Verletzungen: " + sl("m_verletz") : "", vv("temp", "Temp", "°C"), sl("s_schmerz") ? "Schmerz NRS " + sl("s_schmerz") : "") || ka)].join("\n");
  const acts = p.entries.filter((e) => e.cat === "Maßnahmen").sort((x, y) => x.t - y.t).map((e) => fmtHM(e.t) + " " + e.text);
  const meds = p.meds.slice().sort((x, y) => x.t - y.t).map((x) => fmtHM(x.t) + " " + x.drug + " " + (x.dose || "") + " " + (x.unit || "") + " " + (x.route || ""));
  const h_ = acts.concat(meds).join("\n") + (p.entries.some((e) => e.node === "e_zustand") ? "\nWirkung/Verlauf: " + p.entries.filter((e) => e.node === "e_zustand").slice(-1)[0].text : "");
  const an = ["Allergien: " + (me.allergie || ka), "Vorerkrankungen: " + (sl("m_vorerkr") || ka), "Medikation: " + (me.med || ka), "Cave/Besonderheiten: " + (sl("m_cave") || ka)].join("\n");
  return { s, i, n1, n2, h: h_.replace(/ +/g, " ").trim() || "keine Maßnahmen dokumentiert", a: an };
}
function viewForm(v) {
  const f = D.FORMS[v.form], p = P();
  const draft = v.draft || (v.draft = clone(p.forms[v.form] || {}));
  const ro = p.closed && !S.admin;
  if (f.prefill && !ro && !v.prefilled) { v.prefilled = true; const pre = sinnhaftPrefill(p); for (const k in pre) if (!String(draft[k] || "").trim() && pre[k]) draft[k] = pre[k]; }
  const form = h("div", { class: "form" }, f.fields.map((fd) => fieldEl(fd, () => draft[fd.k], (x) => (draft[fd.k] = x))));
  if (ro) form.querySelectorAll("input,select,textarea,button").forEach((x) => (x.disabled = true));
  const extra = [];
  if (f.kvk) extra.push(h("button", { class: "tbtn primary", "data-a": "kvk", onclick: () => readCard(() => { Object.assign(draft, P().forms.patient); render(); }) }, "💳 eGK/KVK einlesen (simuliert)"));
  if (v.form === "patient") { const a = age(draft.geb); if (a !== "") extra.push(h("span", { class: "chip" }, "Alter: " + a + " J.")); }
  if (f.prefill) extra.push(h("button", { class: "tbtn primary", "data-a": "sinn-prefill", disabled: ro, onclick: () => { const pre = sinnhaftPrefill(P()); for (const k in pre) if (pre[k]) draft[k] = pre[k]; render(); toast("SINNHAFT aus den Einsatzdaten neu befüllt"); } }, "↻ Aus Einsatzdaten befüllen"), h("span", { class: "small", style: "color:#cfd6e4" }, "Vorbefüllt aus Einsatzdaten – bitte prüfen. Max. ca. 120 s; fehlende Angaben ausdrücklich nennen."));
  const saveF = () => {
    if (!canEdit()) return;
    for (const fd of f.fields) {
      if (fd.type === "time" && draft[fd.k]) draft[fd.k] = parseTime(draft[fd.k]) || "";
      if (fd.type === "date" && draft[fd.k]) draft[fd.k] = parseDate(draft[fd.k]) || "";
    }
    if (f.entry) { if (draft.text && draft.text.trim()) addEntry("f_verlauf_text", draft.text.trim(), "Verlauf"); back(); return; }
    p.forms[v.form] = draft;
    if (v.form === "crew") Object.assign(S.crew, draft);
    const n = v.nodeId && node(v.nodeId);
    if (n) setStatic(n.id, D.FORMS[v.form].fields.map((x) => draft[x.k]).filter(Boolean).join(", ").slice(0, 140));
    back(); toast(f.title + " gespeichert");
  };
  if (v.form === "crew" && !p.forms.crew) Object.assign(draft, S.crew);
  return h("div", { class: "card" }, h("h2", null, h("span", { class: "sp" }, f.title), h("span", { class: "small", style: "color:#cfd6e4" }, "* Pflichtfeld (rot = offen, grün = ausgefüllt)")),
    h("div", { class: "cb" }, extra.length ? h("div", { class: "row", style: "margin-bottom:10px" }, extra) : null, form,
      h("div", { class: "formbar" }, h("button", { class: "tbtn", onclick: back }, "Abbr."), h("button", { class: "tbtn ok", "data-a": "save", disabled: ro, onclick: saveF }, "OK"))));
}
const FAKE_NAMES = [["Mustermann", "Max", "männlich", "12.03.1964"], ["Musterfrau", "Erika", "weiblich", "01.08.1951"], ["Beispiel", "Bernd", "männlich", "24.11.1978"], ["Probe", "Paula", "weiblich", "15.05.1946"], ["Test", "Tanja", "weiblich", "09.02.1939"]];
function readCard(done) {
  if (!canEdit()) return;
  const bar = h("i"); const st = h("p", null, "Bitte Versichertenkarte in den Kartenleser stecken …");
  const close = modal("Kartenleser (Simulation)", h("div", null, st, h("div", { class: "progress" }, bar), h("p", { class: "small" }, "Es wird keine echte Karte gelesen. Es werden fiktive Daten erzeugt.")), [{ t: "Abbr." }]);
  setTimeout(() => (bar.style.width = "45%", st.textContent = "eGK erkannt – lese Versichertenstammdaten …"), 500);
  setTimeout(() => {
    bar.style.width = "100%";
    const p = P(), al = M().alarm;
    const pick = al && al.pat ? [al.pat[0], al.pat[1], "unbekannt", al.pat[2]] : rnd(FAKE_NAMES);
    p.forms.patient = Object.assign(p.forms.patient || {}, { name: pick[0], vorname: pick[1], geb: pick[3], geschlecht: pick[2] === "unbekannt" ? (p.forms.patient && p.forms.patient.geschlecht) || "" : pick[2], strasse: "Musterweg " + (1 + Math.floor(Math.random() * 40)), plz: "12345", ort: "Musterstadt" });
    p.forms.kosten = Object.assign(p.forms.kosten || {}, { kasse: "Musterkasse AOK-fiktiv", ikNr: "109999999", versNr: "X" + Math.floor(100000000 + Math.random() * 899999999), status: "1000001", kartenart: "eGK" });
    setStatic("f_patient", patName(p)); setStatic("f_kosten", "Musterkasse AOK-fiktiv (eGK)");
    addEntry(null, "Versichertenkarte eingelesen (simuliert)", "Rett. Daten", { silent: true, bg: true, static: false, t: Date.now() });
    setTimeout(() => { close(); toast("Karte gelesen: " + patName(p)); done && done(); }, 350);
  }, 1300);
}

/* ================= Home ================= */
function kv(pairs) { return h("dl", { class: "kv" }, pairs.filter((x) => x).map(([k, v]) => [h("dt", null, k), h("dd", null, v || "–")])); }
function viewHome() {
  const m = M(), p = P(), tr = p.forms.transport || {}, pa = p.forms.patient || {};
  const lastV = p.vitals[p.vitals.length - 1];
  const fms = S.settings.fms; const fmsT = (D.FMS.find((x) => x.s === fms) || {}).t;
  const miss = missing(p);
  return h("div", { class: "home" },
    h("div", null,
      h("div", { class: "card" }, h("h2", null, h("span", { class: "sp" }, "Einsatz " + (m.nr || "(ohne Nummer)")), h("span", { class: "chip y" }, "FMS " + fms + " – " + fmsT), S.leit.sprech && !S.leit.sprech.ack ? h("span", { class: "chip " + (S.leit.sprech.s === 0 ? "r" : "y"), "data-a": "home-sprech" }, S.leit.sprech.s === 0 ? "🔴 Prio-Sprechwunsch" : "Sprechwunsch") : null),
        h("div", { class: "cb" }, kv([["Stichwort", tr.stichwort || (m.alarm && m.alarm.stichwort)], ["Einsatzort", tr.einsatzort], ["Transportziel", tr.ziel], ["Alarm", tr.t_alarm], ["Protokolltyp", patType(p)], ["Patienten im Einsatz", String(m.patients.length)]]),
          h("div", { class: "row", style: "margin-top:10px" },
            h("button", { class: "tbtn primary", "data-a": "demoalarm", onclick: simulateAlarm }, "📟 Alarm simulieren"),
            h("button", { class: "tbtn", onclick: () => go({ t: "tool", tool: "leitstelle" }) }, "Leitstelle / Status"),
            h("button", { class: "tbtn", onclick: () => go({ t: "tool", tool: "nav" }) }, "🧭 Navigation"),
            h("button", { class: "tbtn", onclick: () => go({ t: "tool", tool: "missions" }) }, "Einsätze verwalten")))),
      h("div", { class: "card" }, h("h2", null, "Patient " + p.letter),
        h("div", { class: "cb" }, kv([["Name", patName(p)], ["Geburtsdatum", pa.geb ? pa.geb + " (" + age(pa.geb) + " J.)" : ""], ["Geschlecht", pa.geschlecht], ["Kostenträger", (p.forms.kosten || {}).kasse],
          ["Diagnosen", Object.keys(p.sel).filter((k) => k.startsWith("m_dx_")).flatMap((k) => p.sel[k]).join(", ")], ["NACA", p.sel.s_naca], ["GCS", p.scores.gcs ? String(p.scores.gcs.total) : ""]]),
          h("div", { class: "row", style: "margin-top:10px" }, h("button", { class: "tbtn primary", onclick: () => go({ t: "form", form: "patient", nodeId: "f_patient", from: "p1" }) }, "Stammdaten"), h("button", { class: "tbtn", "data-a": "kvk-home", onclick: () => readCard() }, "💳 Karte einlesen"), h("button", { class: "tbtn", onclick: () => go({ t: "tool", tool: "prenotice" }) }, "🏥 Voranmeldung"), h("button", { class: "tbtn", onclick: () => go({ t: "tool", tool: "manv" }) }, "MANV")))) ),
    h("div", null,
      h("div", { class: "card" }, h("h2", null, "Letzte Vitalwerte"), h("div", { class: "cb" }, lastV ? kv([["Zeit", fmtT(lastV.t) + (lastV.src ? " (" + lastV.src + ")" : "")], ["RR", lastV.sys ? lastV.sys + "/" + (lastV.dia || "–") + " mmHg" : ""], ["HF", lastV.hf ? lastV.hf + " /min" : ""], ["SpO2", lastV.spo2 ? lastV.spo2 + " %" : ""], ["AF", lastV.af ? lastV.af + " /min" : ""], ["etCO2", lastV.co2 ? lastV.co2 + " mmHg" : ""], ["BZ", lastV.bz ? lastV.bz + " mg/dl" : ""], ["Temp.", lastV.temp ? lastV.temp + " °C" : ""]]) : h("span", { class: "small" }, "Noch keine Messwerte."),
        h("div", { class: "row", style: "margin-top:10px" }, h("button", { class: "tbtn primary", onclick: () => go({ t: "tool", tool: "vitals" }) }, "Messwerte eingeben"), h("button", { class: "tbtn", onclick: () => go({ t: "tool", tool: "graph" }) }, "Verlaufsgraph")))),
      h("div", { class: "card" }, h("h2", null, "Pflichtfelder (" + (miss.length ? miss.length + " offen" : "vollständig") + ")"), h("div", { class: "cb" }, miss.length ? miss.map((x) => h("span", { class: "chip r" }, x.label)) : h("span", { class: "chip g" }, "Alle Pflichtfelder ausgefüllt"))),
      h("div", { class: "card" }, h("h2", null, "Hinweis"), h("div", { class: "cb small" }, DIS + ". Kein Medizinprodukt, keine Verbindung zu Leitstelle oder Klinik – diese Übertragungen sind simuliert. Einsätze werden zur Schulung zentral gespeichert (nur für die eigene Besatzung sichtbar). Nicht im Echteinsatz verwenden."))));
}

/* ================= Vitaldaten-Graph ================= */
const VT = {
  hf: { l: "HF", c: "#d32f2f", u: "/min" }, sys: { l: "RR sys", c: "#1b1b1b", u: "mmHg" }, dia: { l: "RR dia", c: "#1b1b1b", u: "mmHg" }, spo2: { l: "SpO2", c: "#1e66d0", u: "%" },
  af: { l: "AF", c: "#2e7d32", u: "/min" }, co2: { l: "etCO2", c: "#c79100", u: "mmHg" }, bz: { l: "BZ", c: "#8e24aa", u: "mg/dl" }, temp: { l: "Temp", c: "#ef6c00", u: "°C" },
};
const EVT = { e_hdm: "CPR", e_rea: "CPR", e_intub: "ITN", e_lts: "LT", e_defi: "⚡", e_kardio: "⚡", e_transport: "🚑", e_o2_brille: "O2", e_o2_maske: "O2", e_o2_reserv: "O2" };
function graphRange(p) {
  const ts = p.vitals.map((v) => v.t).concat(p.entries.map((e) => e.t));
  const now = Date.now();
  let a = ts.length ? Math.min(...ts) : now - 30 * 60000;
  a = Math.min(a, now - 20 * 60000);
  return [a - 2 * 60000, now + 6 * 60000];
}
function drawGraph(cv, p, opts) {
  opts = opts || {};
  const r = { width: cv.clientWidth, height: cv.clientHeight }; if (!r.width) return;
  const dpr = window.devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr;
  const g = cv.getContext("2d"); g.scale(dpr, dpr);
  const W = r.width, H = r.height, L = opts.big ? 40 : 4, T = opts.big ? 22 : 12, B = opts.big ? 22 : 4;
  const [a, b] = opts.range || graphRange(p);
  const X = (t) => L + ((t - a) / (b - a)) * (W - L - 6);
  const Y = (v) => T + (1 - v / 250) * (H - T - B);
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "#e3e6ea"; g.lineWidth = 1; g.font = (opts.big ? 11 : 9) + "px Arial"; g.fillStyle = "#777";
  for (let v = 0; v <= 250; v += 50) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(W, Y(v)); g.stroke(); if (opts.big) g.fillText(v, 6, Y(v) + 4); }
  const step = (b - a) > 90 * 60000 ? 15 * 60000 : 5 * 60000;
  for (let t = Math.ceil(a / step) * step; t < b; t += step) { g.beginPath(); g.moveTo(X(t), T); g.lineTo(X(t), H - B); g.stroke(); if (opts.big || (t / step) % 2 === 0) g.fillText(fmtHM(t), X(t) + 2, H - (opts.big ? 6 : B + 2)); }
  const vs = p.vitals.slice().sort((x, y) => x.t - y.t);
  ["hf", "spo2", "af", "co2"].forEach((k) => {
    const pts = vs.filter((v) => v[k] != null && v[k] !== ""); if (!pts.length) return;
    g.strokeStyle = VT[k].c; g.fillStyle = VT[k].c; g.lineWidth = 1.6; g.beginPath();
    pts.forEach((v, i) => (i ? g.lineTo(X(v.t), Y(+v[k])) : g.moveTo(X(v.t), Y(+v[k])))); g.stroke();
    pts.forEach((v) => { g.beginPath(); if (k === "hf") { g.arc(X(v.t), Y(+v[k]), 3, 0, 7); } else g.rect(X(v.t) - 2.5, Y(+v[k]) - 2.5, 5, 5); g.fill(); });
  });
  vs.filter((v) => v.sys).forEach((v) => {
    const x = X(v.t), ys = Y(+v.sys), yd = Y(+(v.dia || v.sys));
    g.strokeStyle = "#111"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, ys); g.lineTo(x, yd); g.stroke();
    g.beginPath(); g.moveTo(x - 4, ys - 5); g.lineTo(x, ys); g.lineTo(x + 4, ys - 5); g.moveTo(x - 4, yd + 5); g.lineTo(x, yd); g.lineTo(x + 4, yd + 5); g.stroke();
  });
  g.font = (opts.big ? 13 : 10) + "px Arial"; g.fillStyle = "#333";
  p.entries.filter((e) => EVT[e.node]).forEach((e) => g.fillText(EVT[e.node], X(e.t) - 6, T - 2 + (opts.big ? 0 : 0)));
  vs.filter((v) => v.bz).forEach((v) => { g.fillStyle = VT.bz.c; g.fillText("BZ " + v.bz, X(v.t) + 3, H - B - (opts.big ? 18 : 10)); });
  const nx = X(Date.now()); g.fillStyle = "rgba(220,30,30,.85)"; g.fillRect(nx - 1.5, T - 8, 3, H - T - B + 8);
  if (opts.preview) opts.preview(g, X, Y);
  if (!vs.length && !opts.big) { g.fillStyle = "#999"; g.font = "11px Arial"; g.fillText("Vitaldatenfeld – antippen für Vollansicht", 8, H / 2); }
  return { X, Y, a, b, L, T, B, W, H };
}
function drawSmallGraph() { const cv = document.getElementById("smallGraph"); if (cv) drawGraph(cv, P()); }
window.addEventListener("resize", () => { layout(); drawSmallGraph(); const bg = document.getElementById("bigGraph"); if (bg && bg._redraw) bg._redraw();
  /* Handy quer: Bildschirmtastatur verkleinert den Viewport – fokussiertes Eingabefeld sichtbar halten */
  const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.scrollIntoView) setTimeout(() => { if (document.activeElement === a) a.scrollIntoView({ block: "nearest" }); }, 60); });

/* ================= Werkzeuge / Masken ================= */
const TOOLS = {};
function card(title, ...body) { return h("div", { class: "card" }, h("h2", null, title), h("div", { class: "cb" }, body)); }

TOOLS.graph = { title: "Vitaldaten – Vollansicht", render() {
  const p = P();
  let tool = "hf";
  const cv = h("canvas", { class: "big-graph", id: "bigGraph" });
  const tools = h("div", { class: "vtools" }, ["rr", "hf", "spo2", "af", "co2"].map((k) => h("button", { class: k === tool ? "on" : "", "data-vt": k, onclick: (e) => { tool = k; tools.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === e.target)); } }, k === "rr" ? "RR (ziehen)" : VT[k].l)),
    h("button", { onclick: () => go({ t: "tool", tool: "vitals" }) }, "+ Messwerte (Tastatur)"));
  let geo = null, drag = null;
  const redraw = (prev) => (geo = drawGraph(cv, p, { big: true, preview: prev }));
  cv._redraw = () => redraw();
  const val = (y) => Math.max(0, Math.min(250, Math.round((1 - (y - geo.T) / (geo.H - geo.T - geo.B)) * 250)));
  const tim = (x) => Math.round(geo.a + ((x - geo.L) / (geo.W - geo.L - 6)) * (geo.b - geo.a));
  const pos = (e) => localXY(cv, e);
  cv.addEventListener("pointerdown", (e) => { if (!canEdit()) return; cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); drag = { x, y, y2: y }; });
  cv.addEventListener("pointermove", (e) => { if (!drag) return; const [, y] = pos(e); drag.y2 = y; if (tool === "rr") redraw((g) => { g.strokeStyle = "#d32f2f"; g.lineWidth = 3; g.beginPath(); g.moveTo(drag.x, drag.y); g.lineTo(drag.x, drag.y2); g.stroke(); g.fillStyle = "#d32f2f"; g.font = "bold 14px Arial"; g.fillText(val(Math.min(drag.y, drag.y2)) + "/" + val(Math.max(drag.y, drag.y2)), drag.x + 6, drag.y); }); });
  cv.addEventListener("pointerup", () => {
    if (!drag) return; const d = drag; drag = null;
    const t = Math.min(tim(d.x), Date.now());
    const rec = { id: uid(), t, src: "manuell (Graph)" };
    if (tool === "rr") { const s = val(Math.min(d.y, d.y2)), di = val(Math.max(d.y, d.y2)); if (s - di < 10) { toast("RR: von Systole nach Diastole ziehen"); redraw(); return; } rec.sys = s; rec.dia = di; }
    else rec[tool] = tool === "spo2" ? Math.min(100, val(d.y)) : val(d.y);
    p.vitals.push(rec); toast(fmtT(t) + " " + (tool === "rr" ? "RR " + rec.sys + "/" + rec.dia : VT[tool].l + " " + rec[tool]) + " eingetragen"); render();
  });
  setTimeout(redraw, 0);
  const rows = p.vitals.slice().sort((a, b) => b.t - a.t).map((v) => h("tr", null, h("td", null, fmtT(v.t)), h("td", null, v.sys ? v.sys + "/" + (v.dia || "") : ""), h("td", null, v.hf || ""), h("td", null, v.spo2 || ""), h("td", null, v.af || ""), h("td", null, v.co2 || ""), h("td", null, v.bz || ""), h("td", null, v.temp || ""), h("td", { class: "small" }, v.src || ""),
    h("td", null, h("button", { class: "mini", "aria-label": "löschen", onclick: () => { if (!canEdit()) return; p.vitals = p.vitals.filter((x) => x !== v); render(); } }, "🗑"))));
  return h("div", null, h("p", { class: "small", style: "color:#e6e8ee;margin:0 0 6px" }, "Werkzeug wählen und in den Graphen tippen (Wert = Höhe, Zeit = Position). RR: von Systole nach Diastole ziehen. Roter Balken = jetzt."), tools, cv,
    h("div", { style: "overflow-x:auto;margin-top:10px" }, h("table", { class: "list vtable" }, h("thead", null, h("tr", null, ["Zeit", "RR", "HF", "SpO2", "AF", "etCO2", "BZ", "Temp", "Quelle", ""].map((x) => h("th", null, x)))), h("tbody", null, rows))));
}};

TOOLS.vitals = { title: "Messwerte", render(v) {
  const p = P(); const d = v.d || (v.d = {});
  const last = S.lastImport;
  const fields = [["sys", "RR systolisch (mmHg)"], ["dia", "RR diastolisch (mmHg)"], ["hf", "Herzfrequenz (/min)"], ["spo2", "SpO2 (%)"], ["af", "Atemfrequenz (/min)"], ["co2", "etCO2 (mmHg)"], ["bz", "Blutzucker (mg/dl)"], ["temp", "Temperatur (°C)"]];
  const form = h("div", { class: "form" }, fields.map(([k, l]) => fieldEl({ k, label: l, type: "number" }, () => d[k], (x) => (d[k] = x))));
  const timeF = fieldEl({ k: "zeit", label: "Uhrzeit (HHMM, leer = jetzt)", type: "time" }, () => d.zeit, (x) => (d.zeit = x));
  form.prepend(timeF);
  const ok = () => {
    if (!canEdit()) return;
    const rec = { id: uid(), t: d.zeit ? hmToMs(parseTime(d.zeit)) : Date.now(), src: "manuell" };
    let any = false;
    const lim = { sys: [20, 300], dia: [10, 200], hf: [0, 300], spo2: [30, 100], af: [0, 80], co2: [0, 120], bz: [10, 1000], temp: [25, 44] };
    for (const [k] of fields) if (d[k] !== undefined && String(d[k]).trim() !== "") {
      const n = parseFloat(String(d[k]).replace(",", "."));
      if (isNaN(n) || n < lim[k][0] || n > lim[k][1]) { toast("Unplausibler Wert bei " + VT[k].l + " (" + d[k] + ")"); return; }
      rec[k] = n; any = true;
    }
    if (rec.sys && rec.dia && rec.dia >= rec.sys) { toast("Plausibilität: Diastole muss kleiner als Systole sein"); return; }
    if (!any) { toast("Bitte mindestens einen Wert eingeben"); return; }
    p.vitals.push(rec);
    addEntry(null, "Messwerte: " + Object.keys(VT).filter((k) => rec[k] != null).map((k) => VT[k].l + " " + rec[k]).join(", ").replace("RR sys", "RR").replace(", RR dia ", "/"), "Messwerte", { t: rec.t });
    back();
  };
  return card("Messwerte eingeben", h("p", { class: "small" }, "Werte werden mit Zeitstempel in Verlaufsliste und Vitaldatengraph übernommen."), form,
    last ? h("p", { class: "small" }, "Letzter Geräteimport: " + fmtT(last.t) + " (" + last.src + ")") : null,
    h("div", { class: "formbar" }, last ? h("button", { class: "tbtn", onclick: () => { ["sys", "dia", "hf", "spo2", "af", "co2"].forEach((k) => { if (last[k] != null) d[k] = String(last[k]); }); render(); } }, "Vom Gerät übernehmen") : null, h("button", { class: "tbtn", onclick: back }, "Abbr."), h("button", { class: "tbtn ok", "data-a": "save", onclick: ok }, "OK")));
}};

function scoreTable(items, state, onchange) {
  return h("div", null, items.map((it) => h("div", { class: "fld", style: "margin-bottom:8px" }, h("label", null, it.l),
    h("div", { class: "seg" }, it.o.map(([pts, txt]) => h("button", { type: "button", class: state[it.k] === pts ? "on" : "", "data-score": it.k + "-" + pts, onclick: () => { state[it.k] = pts; onchange(); } }, pts + " – " + txt))))));
}
TOOLS.gcs = { title: "Glasgow Coma Scale", render(v) {
  const p = P(); const s = v.s || (v.s = Object.assign({}, p.scores.gcs || {}));
  const items = [
    { k: "a", l: "Augen öffnen", o: [[4, "spontan"], [3, "auf Ansprache"], [2, "auf Schmerzreiz"], [1, "keine Reaktion"]] },
    { k: "v", l: "Verbale Reaktion", o: [[5, "orientiert"], [4, "verwirrt"], [3, "inadäquate Worte"], [2, "unverständliche Laute"], [1, "keine"]] },
    { k: "m", l: "Motorische Reaktion", o: [[6, "folgt Aufforderung"], [5, "gezielte Abwehr"], [4, "ungezielte Abwehr"], [3, "Beugesynergismen"], [2, "Strecksynergismen"], [1, "keine"]] }];
  const tot = (s.a || 0) + (s.v || 0) + (s.m || 0);
  return card("GCS: " + (s.a && s.v && s.m ? tot : "–"), scoreTable(items, s, render),
    h("div", { class: "formbar" }, h("button", { class: "tbtn", onclick: back }, "Abbr."), h("button", { class: "tbtn ok", "data-a": "save", onclick: () => {
      if (!canEdit()) return; if (!(s.a && s.v && s.m)) { toast("Bitte alle drei Kategorien wählen"); return; }
      p.scores.gcs = { a: s.a, v: s.v, m: s.m, total: tot, t: Date.now() }; addEntry("t_gcs", "GCS " + tot + " (A" + s.a + " V" + s.v + " M" + s.m + ")", "Erstbefund"); back(); } }, "OK")));
}};
TOOLS.iss4 = { title: "4-Item-Stroke-Scale (Schulungsversion)", render(v) {
  const p = P(); const s = v.s || (v.s = Object.assign({}, p.scores.iss4 || {}));
  const items = [{ k: "a", l: "Blickwendung", o: [[0, "nein"], [1, "ja"]] }, { k: "b", l: "Halbseitenlähmung/Kraftminderung", o: [[0, "keine"], [1, "leicht"], [2, "schwer"]] }, { k: "c", l: "Sprachstörung (Aphasie)", o: [[0, "keine"], [1, "ja"]] }, { k: "d", l: "Neglect / Bewusstseinsstörung", o: [[0, "nein"], [1, "ja"]] }];
  const tot = ["a", "b", "c", "d"].reduce((x, k) => x + (s[k] || 0), 0);
  return card("4ISS: " + tot + (tot >= 3 ? " – überregionales Zentrum erwägen" : ""), h("p", { class: "small" }, "Vereinfachte Schulungsdarstellung: ab 3 Punkten Hinweis auf überregionales Zentrum (Thrombektomie)."), scoreTable(items, s, render),
    h("div", { class: "formbar" }, h("button", { class: "tbtn", onclick: back }, "Abbr."), h("button", { class: "tbtn ok", "data-a": "save", onclick: () => { if (!canEdit()) return; p.scores.iss4 = Object.assign({}, s, { total: tot, t: Date.now() }); addEntry("t_4iss", "4ISS " + tot, "Erstbefund"); back(); } }, "OK")));
}};
TOOLS.befast = { title: "BE-FAST", render(v) {
  const p = P(); const s = v.s || (v.s = Object.assign({}, p.scores.befast || {}));
  const items = [["b", "Balance – Gleichgewicht/Gangstörung"], ["e", "Eyes – Sehstörung"], ["f", "Face – Gesicht hängt"], ["a", "Arms – Armschwäche"], ["sp", "Speech – Sprachstörung"]].map(([k, l]) => ({ k, l, o: [[0, "unauffällig"], [1, "auffällig"]] }));
  const pos = ["b", "e", "f", "a", "sp"].some((k) => s[k] === 1);
  return card("BE-FAST: " + (pos ? "positiv" : "negativ"), scoreTable(items, s, render),
    fieldEl({ k: "time", label: "T – Time: Symptombeginn (HHMM)", type: "time" }, () => s.time, (x) => (s.time = x)),
    h("div", { class: "formbar" }, h("button", { class: "tbtn", onclick: back }, "Abbr."), h("button", { class: "tbtn ok", "data-a": "save", onclick: () => { if (!canEdit()) return; p.scores.befast = Object.assign({}, s, { pos, t: Date.now() }); addEntry("t_befast", "BE-FAST " + (pos ? "positiv" : "negativ") + (s.time ? ", Beginn " + s.time : ""), "Erstbefund"); back(); } }, "OK")));
}};
TOOLS.scores = { title: "Scores", render(v) {
  const p = P(); v.s = v.s || {}; const s = v.s;
  const sum = (o, ks) => ks.reduce((x, k) => x + (o[k] || 0), 0);
  s.q = s.q || {}; s.ap = s.ap || {};
  const q = sum(s.q, ["af", "rr", "bw"]), ap = sum(s.ap, ["a", "p", "g", "ac", "r"]);
  return h("div", null,
    h("div", { class: "tiles", style: "margin-bottom:10px" },
      h("button", { class: "tile" + (p.scores.gcs ? " has" : ""), onclick: () => go({ t: "tool", tool: "gcs" }) }, "GCS", h("span", { class: "val" }, p.scores.gcs ? String(p.scores.gcs.total) : "")),
      h("button", { class: "tile" + (p.sel.s_naca ? " has" : ""), onclick: () => go({ t: "opts", nodeId: "s_naca", p: "p8", path: [] }) }, "NACA", h("span", { class: "val" }, p.sel.s_naca || "")),
      h("button", { class: "tile" + (p.scores.iss4 ? " has" : ""), onclick: () => go({ t: "tool", tool: "iss4" }) }, "4ISS", h("span", { class: "val" }, p.scores.iss4 ? String(p.scores.iss4.total) : "")),
      h("button", { class: "tile" + (p.scores.befast ? " has" : ""), onclick: () => go({ t: "tool", tool: "befast" }) }, "BE-FAST", h("span", { class: "val" }, p.scores.befast ? (p.scores.befast.pos ? "positiv" : "negativ") : "")),
      h("button", { class: "tile" + (p.sel.s_schmerz ? " has" : ""), onclick: () => go({ t: "opts", nodeId: "s_schmerz", p: "p3", path: [] }) }, "NRS Schmerz", h("span", { class: "val" }, selText(p, node("s_schmerz"))))),
    card("qSOFA: " + q + (q >= 2 ? " – Sepsis-Verdacht" : ""), scoreTable([{ k: "af", l: "Atemfrequenz ≥ 22/min", o: [[0, "nein"], [1, "ja"]] }, { k: "rr", l: "RR sys ≤ 100 mmHg", o: [[0, "nein"], [1, "ja"]] }, { k: "bw", l: "Bewusstseinsveränderung", o: [[0, "nein"], [1, "ja"]] }], s.q, render),
      h("div", { class: "formbar" }, h("button", { class: "tbtn ok", "data-a": "qsofa", onclick: () => { if (!canEdit()) return; p.scores.qsofa = { total: q }; addEntry(null, "qSOFA " + q, "Scores"); } }, "qSOFA übernehmen"))),
    card("APGAR: " + ap, scoreTable([{ k: "a", l: "Atmung", o: [[0, "keine"], [1, "unregelmäßig"], [2, "regelmäßig"]] }, { k: "p", l: "Puls", o: [[0, "keiner"], [1, "< 100"], [2, "> 100"]] }, { k: "g", l: "Grundtonus", o: [[0, "schlaff"], [1, "träge Flexion"], [2, "aktiv"]] }, { k: "ac", l: "Aussehen", o: [[0, "blau/blass"], [1, "Stamm rosig"], [2, "rosig"]] }, { k: "r", l: "Reflexe", o: [[0, "keine"], [1, "Grimassieren"], [2, "Schreien"]] }], s.ap, render),
      h("div", { class: "formbar" }, h("button", { class: "tbtn ok", onclick: () => { if (!canEdit()) return; p.scores.apgar = { total: ap }; addEntry(null, "APGAR " + ap, "Scores"); } }, "APGAR übernehmen"))));
}};
TOOLS.meds = { title: "Medikamente", render(v) {
  const p = P(); v.d = v.d || { route: "i.v." }; const d = v.d;
  const list = h("div", { class: "tiles" }, D.DRUGS.map((x) => h("button", { class: "tile" + (d.drug === x.n ? " sel" : ""), "data-drug": x.n, onclick: () => { d.drug = x.n; d.route = x.f.split("/")[0]; render(); } }, x.n, h("span", { class: "val" }, x.f))));
  const give = () => {
    if (!canEdit()) return;
    if (!d.drug) { toast("Bitte Medikament wählen"); return; }
    if (!String(d.dose || "").trim()) { toast("Bitte Dosis/Menge eingeben (Schulungsdaten)"); return; }
    const txt = d.drug + " " + d.dose + " " + (d.unit || "mg") + " " + d.route;
    p.meds.push({ t: Date.now(), drug: d.drug, dose: d.dose, unit: d.unit || "mg", route: d.route }); p.mat["Spritze 10 ml"] = (p.mat["Spritze 10 ml"] || 0) + 1;
    addEntry("t_med", txt, "Medikamente"); v.d = { route: "i.v." }; render();
  };
  return h("div", null,
    card("Gabe dokumentieren", h("p", { class: "small" }, "Schulungsliste ohne Dosierempfehlungen. Dosis wird frei eingegeben."),
      h("div", { class: "form" }, fieldEl({ k: "drug", label: "Medikament", req: true }, () => d.drug, (x) => (d.drug = x)), fieldEl({ k: "dose", label: "Dosis/Menge", type: "number", req: true }, () => d.dose, (x) => (d.dose = x)),
        fieldEl({ k: "unit", label: "Einheit", type: "select", options: ["mg", "µg", "g", "ml", "IE", "Hub", "Tbl."] }, () => d.unit || "mg", (x) => (d.unit = x)), fieldEl({ k: "route", label: "Applikation", type: "select", options: ["i.v.", "i.o.", "i.m.", "s.c.", "i.n.", "p.o.", "s.l.", "buccal", "Vernebler", "rektal"] }, () => d.route, (x) => (d.route = x))),
      h("div", { class: "formbar" }, h("button", { class: "tbtn ok", "data-a": "give", onclick: give }, "Gabe eintragen"))),
    list,
    p.meds.length ? card("Bisherige Gaben", h("table", { class: "list" }, h("tbody", null, p.meds.map((m) => h("tr", null, h("td", null, fmtT(m.t)), h("td", null, m.drug), h("td", null, m.dose + " " + m.unit), h("td", null, m.route)))))) : null);
}};

/* ---------- Unterschrift ---------- */
function sigPad(cv) {
  let drawing = false, dirty = false;
  const ctx = () => cv.getContext("2d");
  const setup = () => { const r = { width: cv.clientWidth, height: cv.clientHeight }; const dpr = window.devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr; const g = ctx(); g.scale(dpr, dpr); g.lineWidth = 2.4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#0b1f5c"; };
  setTimeout(setup, 0);
  const pt = (e) => localXY(cv, e);
  cv.addEventListener("pointerdown", (e) => { drawing = true; dirty = true; cv.setPointerCapture(e.pointerId); const g = ctx(); g.beginPath(); g.moveTo(...pt(e)); g.lineTo(...pt(e)); g.stroke(); });
  cv.addEventListener("pointermove", (e) => { if (!drawing) return; const g = ctx(); g.lineTo(...pt(e)); g.stroke(); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => cv.addEventListener(ev, () => (drawing = false)));
  return { clear: () => { setup(); dirty = false; }, dirty: () => dirty, data: () => cv.toDataURL("image/png") };
}
TOOLS.signature = { title: "Unterschriften", render() {
  const p = P();
  const kinds = [["patient", "Patient/in (Einverständnis bzw. Transportverweigerung)"], ["arzt", "Übernehmende/r Ärztin/Arzt bzw. Pflegekraft"], ["crew", "Transportführer/in"]];
  return h("div", null, kinds.map(([k, l]) => {
    const cv = h("canvas", { class: "sig", "data-sig": k }); const pad_ = sigPad(cv);
    return card(l, p.sign[k] ? h("div", null, h("img", { src: p.sign[k].img, alt: "Unterschrift", style: "max-height:110px;background:#fff;border:1px solid #999;border-radius:4px" }), h("p", { class: "small" }, "gespeichert " + fmtT(p.sign[k].t) + " – neu unterschreiben überschreibt")) : null,
      cv, h("div", { class: "formbar" }, h("button", { class: "tbtn", onclick: () => pad_.clear() }, "Löschen"),
        h("button", { class: "tbtn ok", "data-a": "sig-save-" + k, onclick: () => { if (!canEdit()) return; if (!pad_.dirty()) { toast("Bitte zuerst im Feld unterschreiben"); return; } p.sign[k] = { img: pad_.data(), t: Date.now() }; addEntry("t_sign", "Unterschrift " + l.split(" (")[0], "Übergabe"); } }, "Unterschrift speichern")));
  }));
}};

/* ---------- Kamera / Fotos ---------- */
let camStream = null;
function stopCam() { if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; } }
function scaleImage(src, cb) {
  const img = new Image(); img.onload = () => { const s = Math.min(1, 1280 / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); cb(c.toDataURL("image/jpeg", 0.82)); }; img.onerror = () => toast("Bild konnte nicht gelesen werden"); img.src = src;
}
async function addPhoto(dataUrl, kind, label) {
  const p = P(); const id = "ph_" + uid();
  await putBlob(id, dataUrl);
  p.photos.push({ id, t: Date.now(), kind: kind || "foto", label: label || "Foto" });
  addEntry("t_foto", (label || "Foto") + " aufgenommen", "Anamnese");
}
TOOLS.camera = { title: "Kamera / Fotodokumentation", render() {
  const p = P();
  const video = h("video", { class: "cam", autoplay: true, playsinline: true, muted: true });
  const status = h("p", { class: "small" }, "Kamera ist aus. Fotos werden nur lokal auf diesem Gerät gespeichert (IndexedDB).");
  const file = h("input", { type: "file", accept: "image/*", capture: "environment", style: "display:none", "data-a": "photo-file", onchange: (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => scaleImage(r.result, (d) => addPhoto(d, "foto", "Foto (Datei)")); r.readAsDataURL(f); } });
  const gallery = h("div", { class: "photos" });
  p.photos.forEach((ph) => { const fig = h("figure", null, h("img", { alt: ph.label }), h("figcaption", { class: "small", style: "color:#eee" }, fmtT(ph.t) + " " + ph.label), h("button", { class: "mini", "aria-label": "Foto löschen", onclick: () => { if (!canEdit()) return; confirmBox("Foto löschen", "Foto wirklich löschen?", "löschen", () => { delBlob(ph.id); p.photos = p.photos.filter((x) => x !== ph); render(); }, "danger"); } }, "🗑")); getBlob(ph.id).then((d) => d && (fig.querySelector("img").src = d)); gallery.append(fig); });
  const start = async () => {
    if (!canEdit()) return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("getUserMedia nicht verfügbar");
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false });
      video.srcObject = camStream; status.textContent = "Kamera aktiv – „Auslösen“ tippen.";
    } catch (e) { status.textContent = "Kamera nicht verfügbar (" + e.message + "). Bitte „Foto aus Datei/Kamera-App“ verwenden."; }
  };
  const shoot = () => {
    if (!camStream) { toast("Kamera zuerst starten"); return; }
    const c = document.createElement("canvas"); c.width = video.videoWidth || 640; c.height = video.videoHeight || 480; c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
    scaleImage(c.toDataURL("image/jpeg", 0.85), (d) => addPhoto(d, "foto", "Foto"));
  };
  return h("div", null, card("Kamera", status, video, file,
    h("div", { class: "formbar" }, h("button", { class: "tbtn primary", "data-a": "cam-start", onclick: start }, "📷 Kamera starten"), h("button", { class: "tbtn ok", "data-a": "cam-shoot", onclick: shoot }, "Auslösen"), h("button", { class: "tbtn", onclick: () => { stopCam(); status.textContent = "Kamera aus."; video.srcObject = null; } }, "Kamera stoppen"), h("button", { class: "tbtn", "data-a": "photo-pick", onclick: () => file.click() }, "Foto aus Datei/Kamera-App"))),
    card("Fotos dieses Patienten (" + p.photos.length + ")", p.photos.length ? gallery : h("span", { class: "small" }, "Noch keine Fotos.")));
}};

/* ---------- Verlaufsliste ---------- */
TOOLS.list = { title: "Verlaufsliste", render(v) {
  const p = P(); v.sort = v.sort || "desc";
  const es = p.entries.slice().sort((a, b) => (v.sort === "desc" ? b.t - a.t : a.t - b.t));
  const shift = (e, d) => { if (!canEdit()) return; e.t += d * 1000; e.edited = true; v.sel = e.id; render(); };
  return h("div", null,
    h("div", { class: "row", style: "margin-bottom:8px" }, h("button", { class: "tbtn", "data-a": "sort", onclick: () => { v.sort = v.sort === "desc" ? "asc" : "desc"; render(); } }, "Sortierung: " + (v.sort === "desc" ? "neueste oben" : "älteste oben")), h("span", { class: "small", style: "color:#e6e8ee" }, es.length + " Einträge · * = nachträglich geändert · ±10 s Zeitkorrektur")),
    es.length ? h("div", { style: "overflow-x:auto" }, h("table", { class: "list" }, h("thead", null, h("tr", null, ["Zeit", "Bereich", "Eintrag", "Korrektur"].map((x) => h("th", null, x)))),
      h("tbody", null, es.map((e) => h("tr", { class: v.sel === e.id ? "selrow" : "", "data-entry": e.id }, h("td", { class: "num" }, fmtT(e.t) + (e.edited ? "*" : "")), h("td", null, e.cat + (e.static ? " (statisch)" : "")), h("td", null, e.text),
        h("td", { style: "white-space:nowrap" }, h("button", { class: "mini", "data-a": "minus10", onclick: () => shift(e, -10) }, "−10s"), " ", h("button", { class: "mini", "data-a": "plus10", onclick: () => shift(e, 10) }, "+10s"), " ",
          h("button", { class: "mini", "aria-label": "Eintrag löschen", "data-a": "del", onclick: () => { if (!canEdit()) return; confirmBox("Eintrag löschen", fmtT(e.t) + " " + e.text, "löschen", () => { p.entries = p.entries.filter((x) => x !== e); render(); }, "danger"); } }, "🗑"))))))) : h("div", { class: "empty" }, "Noch keine Einträge."));
}};

/* ---------- Schnelldoku ---------- */
let sw = { run: false, start: 0, acc: 0, timer: 0, lastCycle: 0 };
TOOLS.quickdoc = { title: "Schnelldokumentation", render() {
  const btns = [["e_rea", "Reanimation: Beginn CPR"], ["e_defi", "Defibrillation"], ["t_med", "Adrenalin (Gabe)"], ["e_intub", "Intubation"], ["e_lts", "Larynxtubus"], ["e_io", "i.o.-Zugang"], ["e_pvk", "pVZ i.v."], ["e_rea", "ROSC"], ["e_hdm", "mech. Reanimationshilfe"], ["e_bz", "BZ-Messung"], ["e_o2_reserv", "O2 Reservoir 15 l/min"], ["e_rea", "Reanimation beendet"]];
  const disp = h("div", { id: "swdisp", style: "font-size:clamp(28px,7vh,64px);font-weight:800;font-variant-numeric:tabular-nums;color:#fff;text-align:center" }, swText());
  return h("div", null,
    h("div", { class: "card" }, h("h2", null, "Stoppuhr (2-Minuten-Zyklus)"), h("div", { class: "cb", style: "background:#2f343e" }, disp,
      h("div", { class: "row", style: "justify-content:center;margin-top:8px" }, h("button", { class: "tbtn ok", "data-a": "sw-start", onclick: () => { if (!sw.run) { sw.run = true; sw.start = Date.now(); swTick(); } } }, "Start"), h("button", { class: "tbtn", onclick: () => { if (sw.run) { sw.acc += Date.now() - sw.start; sw.run = false; } } }, "Stopp"), h("button", { class: "tbtn danger", onclick: () => { sw = { run: false, start: 0, acc: 0, timer: 0, lastCycle: 0 }; const d = document.getElementById("swdisp"); if (d) d.textContent = swText(); } }, "Reset")))),
    h("p", { class: "small", style: "color:#e6e8ee" }, "Ein Tipp = ein Eintrag mit aktueller Uhrzeit."),
    h("div", { class: "tiles" }, btns.map(([id, l]) => h("button", { class: "tile", "data-quick": l, onclick: () => { if (id === "t_med") { const p = P(); if (!canEdit()) return; p.meds.push({ t: Date.now(), drug: "Adrenalin", dose: "–", unit: "", route: "i.v." }); addEntry("t_med", "Adrenalin i.v. (Schnelldoku, Dosis nachtragen)", "Medikamente"); } else addEntry(id, l.includes(":") ? l : l, "Maßnahmen"); } }, l))));
}};
function swMs() { return sw.acc + (sw.run ? Date.now() - sw.start : 0); }
function swText() { const s = Math.floor(swMs() / 1000); return pad(Math.floor(s / 60)) + ":" + pad(s % 60); }
function swTick() {
  clearInterval(sw.timer);
  sw.timer = setInterval(() => { const d = document.getElementById("swdisp"); if (d) d.textContent = swText(); const c = Math.floor(swMs() / 120000); if (sw.run && c > sw.lastCycle) { sw.lastCycle = c; beep([[660, 0.2], [0, 0.1], [660, 0.2]]); toast("2 Minuten – Rhythmuskontrolle / Helferwechsel"); } if (!sw.run) clearInterval(sw.timer); }, 250);
}

/* ---------- Leitstelle / Alarmierung / Status ---------- */
let updT = 0;
function simulateAlarm() {
  if (!S.leit.connected) { toast("Leitstelle getrennt – bitte zuerst „verbinden“."); return; }
  const a = clone(rnd(D.ALARMS));
  const nr = "E-" + new Date().getFullYear() + "-" + String(10000 + Math.floor(Math.random() * 89999));
  a.nr = nr; a.time = Date.now(); a.hnr = 1 + Math.floor(Math.random() * 60);
  a.adresse = a.str + (/\d/.test(a.str) ? "" : " " + a.hnr) + ", " + a.ort;
  a.melder = rnd(["Angehörige/r", "Passant/in", "Pflegedienst", "Hausarzt (fiktiv)"]); a.tel = "0000 " + (100000 + Math.floor(Math.random() * 899999));
  a.infekt = Math.random() < 0.15 ? "ja – Infektionstransport" : "nein"; a.sonderrechte = a.art === "KTP" ? "nein" : "ja";
  a.ziel = a.art === "Notfall" ? "" : rnd(D.CLINICS).name;
  S.leit.pending = a; S.leit.update = null;
  logSys("Alarmierung " + nr + " empfangen");
  beep(); render(); toast("📟 Alarmierung durch Leitstelle: " + a.stichwort, 3500);
}
function acceptAlarm(target) {
  const a = S.leit.pending; if (!a) return;
  let m = M();
  const used = m.alarm || m.patients.some((p) => p.entries.length || Object.keys(p.forms).length);
  if (target === "new" || (target !== "cur" && used)) {
    m = freshMission(a.nr); S.missions.unshift(m); S.cur = m.id; S.curPat = 0;
  }
  m.nr = a.nr; m.alarm = a;
  const p = P();
  p.forms.transport = Object.assign(p.forms.transport || {}, { einsatznr: a.nr, stichwort: a.stichwort, einsatzort: a.adresse, objekt: a.beschr, ziel: a.ziel || "", t_alarm: fmtHM(a.time) });
  p.forms.patient = Object.assign(p.forms.patient || {}, { name: a.pat[0], vorname: a.pat[1], geb: a.pat[2] });
  p.sel.s_einsatzart = a.art === "KTP" ? "Krankentransport (KTP)" : a.art === "ITW" ? "Intensivtransport (ITW)" : "Notfalleinsatz"; p.type = patType(p);
  p.sel.s_dringlichkeit = a.sonderrechte === "ja" ? "mit Sonderrechten" : "ohne Sonderrechte";
  setStatic("s_einsatzart", p.sel.s_einsatzart); setStatic("f_transport", a.nr + ", " + a.stichwort + ", " + a.adresse);
  if (!p.forms.crew) p.forms.crew = clone(S.crew);
  S.leit.pending = null;
  addEntry(null, "Einsatz übernommen: " + a.stichwort + " – " + a.adresse, "Leitstelle", { t: Date.now(), silent: true });
  setFms(3);
  clearTimeout(updT);
  updT = setTimeout(() => { if (S.leit.connected && M().alarm && M().alarm.nr === a.nr) { S.leit.update = { nr: a.nr, text: "Nachmeldung Leitstelle: " + rnd(["Zugang über Hinterhof, Klingel „" + a.pat[0] + "“", "Patient im 3. OG, kein Aufzug", "Polizei ebenfalls alarmiert", "Hund im Haus, Halter informiert"]), t: Date.now() }; beep([[988, 0.12], [0, 0.06], [988, 0.12]]); softRefresh(); toast("📟 Einsatzdaten-Update der Leitstelle"); } }, 20000);
  toast("Einsatz " + a.nr + " übernommen – Status 3");
}
function setFms(s) {
  const p = P(), tr = p.forms.transport || (p.forms.transport = {}), hm = fmtHM(Date.now());
  if (s === 0 || s === 5) return sprechwunsch(s);
  S.settings.fms = s; S.leit.sprech = null; M().fms.push({ s, t: Date.now() });
  const map = { 3: "t_aus", 4: "t_ankunft", 7: "t_abfahrt", 8: "t_ziel", 1: "t_frei", 2: "t_frei" };
  if (map[s] && !tr[map[s]] && (s !== 1 && s !== 2 || tr.t_ankunft)) tr[map[s]] = hm;
  const txt = "Status " + s + " – " + D.FMS.find((x) => x.s === s).t;
  addEntry(null, txt, "Status", { t: Date.now(), silent: true });
  toast(txt + (S.leit.connected ? " (an Leitstelle gesendet – simuliert)" : " (offline – wird nachgesendet)"));
}
/* Sprechwunsch (Status 5) und priorisierter Sprechwunsch (Status 0, dringend): ändern den Fahrzeugstatus nicht,
   sondern werden bis zur Sprechaufforderung der Leitstelle angezeigt – wie am FMS-Bedienteil. */
function sprechwunsch(s) {
  const prio = s === 0, now = Date.now(), m = M();
  m.fms.push({ s, t: now });
  S.leit.sprech = { s, t: now, ack: null };
  const txt = "Status " + s + " – " + (prio ? "Priorisierter Sprechwunsch (dringend)" : "Sprechwunsch");
  addEntry(null, txt, "Status", { t: now, silent: true });
  if (prio) beep([[1320, 0.15], [0, 0.05], [1320, 0.15], [0, 0.05], [1320, 0.3]]); else beep([[880, 0.15]]);
  toast((prio ? "🔴 " : "") + txt + (S.leit.connected ? " (an Leitstelle gesendet – simuliert)" : " (offline – wird nachgesendet)"), prio ? 4000 : undefined);
  if (!S.leit.connected) return;
  setTimeout(() => {
    const cur = S.leit.sprech; if (!cur || cur.t !== now) return;
    cur.ack = Date.now();
    const a = prio ? "Leitstelle (simuliert): „Priorisierter Sprechwunsch erkannt – " + ((S.crew && S.crew.fahrzeug) || "Fahrzeug") + ", sofort kommen!“" : "Leitstelle (simuliert): „Sprechaufforderung – bitte kommen.“";
    addEntry(null, (prio ? "Sprechaufforderung (priorisiert) " : "Sprechaufforderung ") + "der Leitstelle erhalten", "Status", { t: cur.ack, silent: true, bg: true });
    toast(a, 3500);
  }, prio ? 900 : 1800);
}
TOOLS.leitstelle = { title: "Leitstelle – Alarmierung", render() {
  const a = S.leit.pending || M().alarm;
  const f = (l, v) => h("div", { class: "fld" }, h("label", null, l), h("input", { value: v || "", readonly: true }));
  const upd = S.leit.update;
  return h("div", null,
    upd ? h("div", { class: "card" }, h("h2", null, "📟 Update der Leitstelle " + fmtT(upd.t)), h("div", { class: "cb" }, h("p", null, upd.text), h("button", { class: "tbtn ok", "data-a": "ack-update", onclick: () => { const p = P(); p.forms.transport = p.forms.transport || {}; p.forms.transport.objekt = ((p.forms.transport.objekt || "") + " | " + upd.text).replace(/^ \| /, ""); S.leit.update = null; addEntry(null, upd.text, "Leitstelle", { t: Date.now() }); } }, "Quittieren & übernehmen"))) : null,
    h("div", { class: "card" }, h("h2", null, h("span", { class: "sp" }, S.leit.pending ? "Neue Alarmierung" : "Alarmierung (aktueller Einsatz)"), h("span", { class: "chip " + (S.leit.connected ? "g" : "r") }, S.leit.connected ? "verbunden" : "getrennt")),
      h("div", { class: "cb" }, a ? h("div", { class: "form" }, f("Alarmzeit", fmtD(a.time) + " " + fmtT(a.time)), f("Einsatznummer", a.nr), f("E-Art / Sonderrechte", a.art + " / " + a.sonderrechte), f("Infektionsfahrt", a.infekt), f("Transport", a.art === "KTP" ? "sitzend/liegend" : "liegend"), f("Stichwort", a.stichwort),
          h("div", { class: "fld wide" }, h("label", null, "Beschreibung / Notrufabfrage"), h("textarea", { readonly: true }, a.beschr + "\nMeldende/r: " + a.melder + ", Tel. " + a.tel)),
          f("Patient: Name", a.pat[0]), f("Vorname", a.pat[1]), f("Geburtsdatum", a.pat[2]), f("Einsatzort", a.adresse), f("Transportziel", a.ziel || "–"))
        : h("p", { class: "empty", style: "color:#333" }, "Keine Alarmierung vorhanden. Mit „Alarm simulieren“ eine fiktive Alarmierung erzeugen."),
        h("div", { class: "formbar" },
          h("button", { class: "tbtn", "data-a": "connect", onclick: () => { S.leit.connected = !S.leit.connected; logSys("Leitstelle " + (S.leit.connected ? "verbunden" : "getrennt")); render(); } }, S.leit.connected ? "trennen" : "verbinden"),
          h("button", { class: "tbtn primary", "data-a": "simalarm", onclick: simulateAlarm }, "📟 Alarm simulieren"),
          S.leit.pending ? h("button", { class: "tbtn", "data-a": "accept-cur", onclick: () => acceptAlarm("cur") }, "in aktuellen Einsatz") : null,
          S.leit.pending ? h("button", { class: "tbtn ok", "data-a": "accept", onclick: () => acceptAlarm("auto") }, "übernehmen") : null,
          a ? h("button", { class: "tbtn", "data-a": "nav", onclick: () => go({ t: "tool", tool: "nav" }) }, "🧭 Navigation") : null))),
    card("Status (FMS) senden", h("div", { class: "tiles" }, D.FMS.map((x) => h("button", { class: "tile" + (S.settings.fms === x.s ? " sel" : "") + (x.s === 5 ? " fms-sw" : "") + (x.prio ? " fms-prio" : "") + (S.leit.sprech && S.leit.sprech.s === x.s && !S.leit.sprech.ack ? " fms-wait" : ""), "data-fms": x.s, onclick: () => { setFms(x.s); } }, h("span", { style: "font-size:1.6em" }, String(x.s)), h("span", { class: "val" }, x.t)))),
      S.leit.sprech ? h("p", { class: "fms-info" + (S.leit.sprech.s === 0 ? " prio" : ""), "data-a": "sprech-info" }, (S.leit.sprech.s === 0 ? "🔴 Priorisierter Sprechwunsch" : "Sprechwunsch") + " gesendet " + fmtT(S.leit.sprech.t) + (S.leit.sprech.ack ? " – Sprechaufforderung " + fmtT(S.leit.sprech.ack) : " – wartet auf Sprechaufforderung") + " · Fahrzeugstatus bleibt " + S.settings.fms) : null,
      h("p", { class: "small" }, "Status 5 = Sprechwunsch, Status 0 = priorisierter (dringender) Sprechwunsch – nur bei Gefahr/Dringlichkeit. Beide ändern den Fahrzeugstatus nicht.")),
    M().fms.length ? card("Statusverlauf", h("table", { class: "list" }, h("tbody", null, M().fms.slice().reverse().map((x) => h("tr", { class: x.s === 0 ? "fms-prio-row" : "" }, h("td", null, fmtT(x.t)), h("td", null, "Status " + x.s), h("td", null, D.FMS.find((y) => y.s === x.s).t)))))) : null);
}};
TOOLS.nav = { title: "Navigation", render() {
  const p = P(), tr = p.forms.transport || {};
  const targets = [["Einsatzort", tr.einsatzort], ["Transportziel", tr.ziel ? (D.CLINICS.find((c) => c.name === tr.ziel) || {}).adr || tr.ziel : ""]].filter((x) => x[1]);
  return h("div", null, targets.length ? targets.map(([l, adr]) => card(l, h("p", { style: "font-size:1.2em;font-weight:700" }, adr), h("p", { class: "small" }, "Fiktive Adresse – die Karten-App findet sie ggf. nicht."),
    h("div", { class: "row" }, h("a", { class: "tbtn primary", style: "display:inline-flex;align-items:center;text-decoration:none", target: "_blank", rel: "noopener", href: "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(adr), "data-a": "maps" }, "In Karten-App öffnen"),
      h("a", { class: "tbtn", style: "display:inline-flex;align-items:center;text-decoration:none", href: "geo:0,0?q=" + encodeURIComponent(adr) }, "geo:-Link (Android-Navi)"),
      h("button", { class: "tbtn", onclick: () => { addEntry(null, "Ziel an Navigationsgerät übergeben: " + adr, "Navigation", { t: Date.now() }); } }, "An Fahrzeug-Navi übergeben (sim.)"))))
    : h("div", { class: "empty" }, "Kein Einsatzort hinterlegt. Alarmierung übernehmen oder Transportdaten ausfüllen."),
    card("Kliniken (fiktiv)", h("table", { class: "list" }, h("tbody", null, D.CLINICS.map((c) => h("tr", null, h("td", null, c.name), h("td", null, c.adr), h("td", null, h("a", { href: "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(c.adr), target: "_blank", rel: "noopener" }, "Route"))))))));
}};

/* ---------- Klinikvoranmeldung ---------- */
const PRE_CATS = {
  "Neurologie": ["Schlaganfall", "Blutung (ICB/SAB)", "Krampfanfall", "Unklare Vigilanzminderung", "Kopfschmerzen", "Andere"],
  "Herz-Kreislauf": ["ACS", "Rhythmusstörung", "Lungenembolie", "Lungenödem", "Hypertonie", "Synkope", "Herzinsuffizienz", "Andere"],
  "Atmung": ["Asthma/COPD", "Pneumonie", "Aspiration", "Andere"], "Trauma": ["Polytrauma", "SHT", "Thorax/Abdomen", "Extremität", "Verbrennung", "Andere"],
  "Stoffwechsel": ["Hypoglykämie", "Hyperglykämie", "Sepsis", "Andere"], "Abdomen": ["Akutes Abdomen", "GI-Blutung", "Andere"],
  "Psychiatrie": ["Psychose", "Suizidalität", "Intoxikation", "Andere"], "Gynäkologie / Geburtshilfe": ["Geburt", "Blutung", "Andere"],
};
TOOLS.prenotice = { title: "Klinikvoranmeldung", render(v) {
  const p = P(); const lastV = p.vitals[p.vitals.length - 1] || {};
  v.d = v.d || clone(p.prenotice || { prio: "dringend", kreislauf: "stabil", intub: "nein", infekt: "nein", eta: "", text: "", klinik: "", cat: "", sym: "", att: [] });
  const d = v.d;
  const set = (k, x) => { d[k] = x; render(); };
  const seg = (k, opts) => h("div", { class: "seg" }, opts.map((o) => h("button", { type: "button", class: d[k] === o ? "on" : "", "data-pre": k + "-" + o, onclick: () => set(k, o) }, o)));
  const pa = p.forms.patient || {};
  const check = [["Patient", pa.name ? patName(p) + (age(pa.geb) !== "" ? ", " + age(pa.geb) + " J., " : ", ") + (pa.geschlecht || "") : ""], ["Messwerte", lastV.t ? (lastV.sys ? "RR " + lastV.sys + "/" + lastV.dia + " " : "") + (lastV.hf ? "HF " + lastV.hf + " " : "") + (lastV.spo2 ? "SpO2 " + lastV.spo2 : "") : ""], ["GCS", p.scores.gcs ? String(p.scores.gcs.total) : ""], ["Leitsymptom", d.sym], ["Zielklinik", d.klinik], ["Ankunftszeit", d.eta]];
  const send = (test) => {
    if (!test && !canEdit()) return;
    if (!test && (!d.cat || !d.sym || !d.klinik)) { toast("Bitte Kategorie, Leitsymptom und Zielklinik wählen"); return; }
    if (!S.leit.connected || S.settings.conn === "offline") { toast("Keine Datenverbindung – Voranmeldung wird in die Versandliste gestellt"); }
    const bar = h("i"); const st = h("p", null, test ? "Test-Voranmeldung wird gesendet …" : "Voranmeldung wird an " + d.klinik + " übertragen …");
    const close = modal("Versand Voranmeldung (Simulation)", h("div", null, st, h("div", { class: "progress" }, bar)), [{ t: "Schließen" }]);
    setTimeout(() => (bar.style.width = "60%"), 300);
    setTimeout(() => {
      bar.style.width = "100%";
      if (test) { st.textContent = "Test erfolgreich – Verbindung zum (simulierten) Klinikserver ok."; return; }
      d.status = "gesendet"; d.sent = Date.now(); p.prenotice = clone(d);
      p.forms.transport = p.forms.transport || {}; p.forms.transport.ziel = d.klinik;
      addEntry(null, "Voranmeldung gesendet: " + d.cat + " / " + d.sym + " → " + d.klinik + (d.eta ? ", ETA " + d.eta : ""), "Voranmeldung", { t: Date.now(), silent: true });
      st.textContent = "Gesendet. Warte auf Empfangsbestätigung der Klinik …";
      setTimeout(() => { if (p.prenotice) { p.prenotice.status = "bestätigt"; p.prenotice.ack = Date.now(); v.d = clone(p.prenotice); addEntry(null, "Klinik bestätigt Voranmeldung (simuliert)", "Voranmeldung", { bg: true, t: Date.now(), silent: true }); st.textContent = "✔ Klinik hat die Voranmeldung bestätigt (simuliert)."; setTimeout(close, 900); } }, 1500);
    }, 1000);
  };
  const ekgs = p.photos;
  return h("div", null,
    p.prenotice ? h("div", { class: "card" }, h("h2", null, "Status: " + p.prenotice.status + (p.prenotice.ack ? " (" + fmtT(p.prenotice.ack) + ")" : "")), h("div", { class: "cb small" }, "Änderungen können als Update erneut gesendet werden.")) : null,
    card("1. Kategorie", h("div", { class: "tiles" }, Object.keys(PRE_CATS).map((c) => h("button", { class: "tile" + (d.cat === c ? " sel" : ""), "data-cat": c, onclick: () => { d.cat = c; d.sym = ""; render(); } }, c)))),
    d.cat ? card("2. Leitsymptom " + d.cat, h("div", { class: "tiles" }, PRE_CATS[d.cat].map((c) => h("button", { class: "tile" + (d.sym === c ? " sel" : ""), "data-sym": c, onclick: () => set("sym", c) }, c))),
      d.sym === "Schlaganfall" ? h("div", { class: "row", style: "margin-top:8px" }, h("button", { class: "tbtn", onclick: () => go({ t: "tool", tool: "iss4" }) }, "4ISS erheben" + (p.scores.iss4 ? " (" + p.scores.iss4.total + ")" : "")), p.scores.iss4 && p.scores.iss4.total >= 3 ? h("span", { class: "chip r" }, "≥ 3: überregionales Zentrum erwägen") : null) : null) : null,
    card("3. Checkliste", kv(check.map(([k, x]) => [k, x ? "✔ " + x : "✖ fehlt"])),
      h("div", { class: "form", style: "margin-top:8px" },
        h("div", { class: "fld" }, h("label", null, "Kreislauf"), seg("kreislauf", ["stabil", "instabil"])),
        h("div", { class: "fld" }, h("label", null, "Intubiert"), seg("intub", ["nein", "ja"])),
        h("div", { class: "fld" }, h("label", null, "Infektionsstatus"), seg("infekt", ["nein", "ja", "unbekannt"])),
        h("div", { class: "fld" }, h("label", null, "Priorität"), seg("prio", ["sofort", "dringend", "normal"])),
        fieldEl({ k: "eta", label: "Ankunftszeit (HHMM)", type: "time", req: true }, () => d.eta, (x) => (d.eta = x)),
        fieldEl({ k: "klinik", label: "Zielklinik", type: "select", req: true, options: [""].concat(D.CLINICS.map((c) => c.name)) }, () => d.klinik, (x) => (d.klinik = x)),
        h("div", { class: "fld wide" }, h("label", null, "Anmeldetext (max. 54 Zeichen) – " + (54 - (d.text || "").length) + " frei"), h("input", { maxlength: 54, value: d.text || "", "data-a": "pretext", oninput: (e) => { d.text = e.target.value; e.target.previousSibling.textContent = "Anmeldetext (max. 54 Zeichen) – " + (54 - d.text.length) + " frei"; } })))),
    card("4. Anhänge (EKG / Fotos)", ekgs.length ? h("div", { class: "seg" }, ekgs.map((ph) => h("button", { type: "button", class: (d.att || []).includes(ph.id) ? "on" : "", onclick: () => { d.att = d.att || []; const i = d.att.indexOf(ph.id); i >= 0 ? d.att.splice(i, 1) : d.att.push(ph.id); render(); } }, ph.label + " " + fmtHM(ph.t)))) : h("span", { class: "small" }, "Keine EKGs/Fotos vorhanden (Kamera oder Medizintechnik → 12-Kanal-EKG).")),
    h("div", { class: "formbar" }, h("button", { class: "tbtn", "data-a": "pretest", onclick: () => send(true) }, "Test Voranmeldung"), h("button", { class: "tbtn ok", "data-a": "presend", onclick: () => send(false) }, p.prenotice ? "Update senden" : "Versand starten")));
}};

/* ---------- Medizintechnik (Simulation) ---------- */
let mtTimer = 0;
const VITAL_LOG_MS = 90000; /* Vitalwerte-Log des Monitors: alle 1,5 Minuten */
function mtStart() {
  if (!canEdit()) return;
  S.settings.medtech = true; clearInterval(mtTimer);
  const p0 = P(); const base = p0.vitals.slice(-1)[0] || { hf: 88, sys: 142, dia: 86, spo2: 94, af: 18, co2: 36 };
  let st = { hf: +base.hf || 88, sys: +base.sys || 142, dia: +base.dia || 86, spo2: +base.spo2 || 94, af: +base.af || 18, co2: +base.co2 || 36 }, n = 0;
  const tick = () => {
    if (!S.settings.medtech) return clearInterval(mtTimer);
    const j = (x, d, lo, hi) => Math.max(lo, Math.min(hi, Math.round(x + (Math.random() - 0.5) * d)));
    st = { hf: j(st.hf, 6, 40, 180), spo2: j(st.spo2, 2, 82, 100), af: j(st.af, 2, 8, 35), co2: j(st.co2, 3, 20, 55), sys: st.sys, dia: st.dia };
    if (n) { st.sys = j(st.sys, 10, 80, 220); st.dia = j(st.dia, 6, 40, 120); }
    const rec = Object.assign({ id: uid(), t: Date.now(), src: S.settings.device.replace(" (Simulation)", "") }, st);
    S.lastImport = rec; P().vitals.push(rec); n++;
    if (canEdit(true)) addEntry(null, "Monitor-Log: RR " + rec.sys + "/" + rec.dia + ", HF " + rec.hf + ", SpO2 " + rec.spo2 + ", AF " + rec.af + ", etCO2 " + rec.co2, "Messwerte", { t: rec.t, silent: true, bg: true }); else softRefresh();
  };
  tick(); mtTimer = setInterval(tick, VITAL_LOG_MS);
  addEntry(null, "Medizintechnik-Übertragung gestartet: " + S.settings.device, "Medizintechnik", { t: Date.now(), silent: true });
  toast("Datenübernahme vom Medizingerät läuft (simuliert) – Vitalwerte-Log alle 1,5 min");
}
function mtStop() { S.settings.medtech = false; clearInterval(mtTimer); addEntry(null, "Medizintechnik-Übertragung gestoppt", "Medizintechnik", { t: Date.now(), silent: true }); }
function parseDeviceFile(txt, name) {
  const out = []; txt = txt.replace(/^\uFEFF/, "");
  if (/^\s*[\[{]/.test(txt)) {
    const j = JSON.parse(txt); const arr = Array.isArray(j) ? j : j.vitals || j.trend || j.records || [];
    arr.forEach((r) => { const t = Date.parse(r.time || r.timestamp || r.t); if (isNaN(t)) return; out.push({ id: uid(), t, hf: r.hr ?? r.hf ?? r.HR, sys: r.nibp_sys ?? r.sys, dia: r.nibp_dia ?? r.dia, spo2: r.spo2 ?? r.SpO2, af: r.rr ?? r.af ?? r.resp, co2: r.etco2 ?? r.co2, src: (j.device || "Datei") + " (" + name + ")" }); });
  } else {
    const lines = txt.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
    const sep = lines[0].includes(";") ? ";" : ",";
    const hd = lines[0].split(sep).map((x) => x.trim().toLowerCase());
    const col = (...ns) => hd.findIndex((x) => ns.includes(x));
    const ci = { t: col("zeit", "time", "timestamp"), hf: col("hf", "hr", "puls"), sys: col("sys", "nibp_sys", "rr_sys"), dia: col("dia", "nibp_dia", "rr_dia"), spo2: col("spo2"), af: col("af", "rr", "resp"), co2: col("etco2", "co2") };
    if (ci.t < 0) throw new Error("Spalte Zeit/time fehlt");
    lines.slice(1).forEach((l) => {
      const c = l.split(sep).map((x) => x.trim()); let t = c[ci.t];
      let ms = /^\d{1,2}:\d{2}(:\d{2})?$/.test(t) ? (() => { const d = new Date(); const [H, Mi, Se] = t.split(":"); d.setHours(+H, +Mi, +(Se || 0), 0); return d.getTime(); })() : Date.parse(t);
      if (isNaN(ms)) return;
      const r = { id: uid(), t: ms, src: "Datei " + name };
      ["hf", "sys", "dia", "spo2", "af", "co2"].forEach((k) => { if (ci[k] >= 0 && c[ci[k]] !== "" && !isNaN(+c[ci[k]])) r[k] = +c[ci[k]]; });
      out.push(r);
    });
  }
  return out.map((r) => { Object.keys(r).forEach((k) => r[k] == null && delete r[k]); return r; });
}
function importDevice(txt, name) {
  if (!canEdit()) return;
  try {
    const recs = parseDeviceFile(txt, name);
    if (!recs.length) { toast("Keine Vitaldaten in der Datei gefunden"); return; }
    const p = P(); const ids = new Set(p.vitals.map((v) => v.t + "|" + v.hf));
    const neu = recs.filter((r) => !ids.has(r.t + "|" + r.hf)); p.vitals.push(...neu);
    S.lastImport = recs[recs.length - 1];
    addEntry(null, "Vitaldatendatei importiert: " + name + " (" + neu.length + " Datensätze)", "Medizintechnik", { t: Date.now() });
  } catch (e) { toast("Import fehlgeschlagen: " + e.message); }
}
function demoFile(kind) {
  const now = Date.now(); const rows = [];
  for (let i = 12; i >= 0; i--) { const t = new Date(now - i * VITAL_LOG_MS); rows.push({ t, hr: 96 - i + Math.round(Math.random() * 6), sys: 150 - i * 2, dia: 90 - i, spo2: 91 + Math.min(8, 12 - i), rr: 22 - Math.floor(i / 3), etco2: 34 + (i % 4) }); }
  if (kind === "json") return JSON.stringify({ device: "Defi/Monitor B (Simulation)", patient: "fiktiv", vitals: rows.map((r) => ({ time: r.t.toISOString(), hr: r.hr, nibp_sys: r.sys, nibp_dia: r.dia, spo2: r.spo2, rr: r.rr, etco2: r.etco2 })) }, null, 1);
  return "# Defi/Monitor A – Trenddaten (Simulation, fiktiv)\nZeit;HF;SYS;DIA;SpO2;AF;etCO2\n" + rows.map((r) => [fmtT(r.t.getTime()), r.hr, r.sys, r.dia, r.spo2, r.rr, r.etco2].join(";")).join("\n");
}
function synthEcg() {
  const c = document.createElement("canvas"); c.width = 1200; c.height = 600; const g = c.getContext("2d");
  g.fillStyle = "#fff6f6"; g.fillRect(0, 0, 1200, 600); g.strokeStyle = "#f3b6b6"; g.lineWidth = 1;
  for (let x = 0; x < 1200; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 600); g.stroke(); } for (let y = 0; y < 600; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(1200, y); g.stroke(); }
  const leads = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
  g.strokeStyle = "#111"; g.lineWidth = 1.6; g.font = "16px Arial"; g.fillStyle = "#111";
  leads.forEach((l, i) => { const col = i % 4 === 0 ? 0 : 0; const ox = (Math.floor(i / 3)) * 300, oy = 80 + (i % 3) * 180; g.fillText(l, ox + 6, oy - 40); g.beginPath(); for (let x = 0; x < 290; x++) { const ph = (x % 75) / 75; let y = 0; if (ph > 0.1 && ph < 0.16) y = -8 * Math.sin((ph - 0.1) / 0.06 * Math.PI); if (ph > 0.25 && ph < 0.27) y = 10; if (ph >= 0.27 && ph < 0.31) y = -60 * (i === 3 ? -1 : 1); if (ph >= 0.31 && ph < 0.33) y = 16; if (["V2", "V3", "V4"].includes(l) && ph > 0.33 && ph < 0.45) y = -18; if (ph > 0.45 && ph < 0.6) y = -14 * Math.sin((ph - 0.45) / 0.15 * Math.PI); x ? g.lineTo(ox + x, oy + y) : g.moveTo(ox + x, oy + y); } g.stroke(); col; });
  g.fillStyle = "#b00"; g.font = "bold 18px Arial"; g.fillText("SIMULIERTES 12-KANAL-EKG – SCHULUNG – KEIN BEFUND", 330, 590);
  return c.toDataURL("image/jpeg", 0.85);
}
TOOLS.medtech = { title: "Medizintechnik", render() {
  const file = h("input", { type: "file", accept: ".csv,.txt,.json", style: "display:none", "data-a": "dev-file", onchange: (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => importDevice(r.result, f.name); r.readAsText(f); } });
  return h("div", null,
    card("Gerät: " + S.settings.device, h("p", { class: "small" }, "Simulierte Anbindung: Vitaldaten von Defibrillator/Monitor und Beatmungsgerät werden in der Simulation per Bluetooth/LAN übernommen."),
      h("div", { class: "fld" }, h("label", null, "Aktives Gerät"), h("select", { onchange: (e) => { S.settings.device = e.target.value; render(); } }, D.DEVICES.filter((d) => !/Drucker|Pad-zu-Pad/.test(d)).map((d) => { const o = h("option", { value: d }, d); if (d === S.settings.device) o.selected = true; return o; }))),
      h("div", { class: "formbar" }, S.settings.medtech ? h("button", { class: "tbtn danger", "data-a": "mt-stop", onclick: () => { mtStop(); } }, "■ Stopp") : h("button", { class: "tbtn ok", "data-a": "mt-start", onclick: mtStart }, "▶ Start Datenübernahme"),
        h("button", { class: "tbtn primary", "data-a": "ekg12", onclick: () => { if (!canEdit()) return; addPhoto(synthEcg(), "ekg", "12-Kanal-EKG"); } }, "12-Kanal-EKG empfangen (sim.)"))),
    card("Vitaldatendatei importieren", h("p", { class: "small" }, "CSV (Zeit;HF;SYS;DIA;SpO2;AF;etCO2) oder JSON (Felder time, hr, nibp_sys, nibp_dia, spo2, rr, etco2). Beispieldateien liegen im Ordner samples/."), file,
      h("div", { class: "formbar" }, h("button", { class: "tbtn", "data-a": "imp-csv", onclick: () => importDevice(demoFile("csv"), "monitor_a_demo.csv") }, "Demo: CSV-Trenddaten importieren"), h("button", { class: "tbtn", "data-a": "imp-json", onclick: () => importDevice(demoFile("json"), "monitor_b_demo.json") }, "Demo: JSON-Vitaldaten importieren"), h("button", { class: "tbtn primary", onclick: () => file.click() }, "Datei wählen …"))),
    S.lastImport ? card("Letzter Datensatz", kv([["Zeit", fmtT(S.lastImport.t)], ["Quelle", S.lastImport.src], ["HF", S.lastImport.hf], ["RR", S.lastImport.sys ? S.lastImport.sys + "/" + S.lastImport.dia : ""], ["SpO2", S.lastImport.spo2], ["AF", S.lastImport.af], ["etCO2", S.lastImport.co2]])) : null);
}};

/* ---------- Protokoll (Vorschau/Druck) ---------- */
async function protocolHTML(p, m, opts) {
  opts = opts || {};
  const f = (n) => p.forms[n] || {};
  const pa = f("patient"), tr = f("transport"), cr = p.forms.crew || S.crew, ko = f("kosten");
  const row = (pairs) => "<tr>" + pairs.map(([k, v]) => "<th>" + esc(k) + "</th><td>" + esc(v || "") + "</td>").join("") + "</tr>";
  const selList = (pk) => Object.keys(INDEX).filter((id) => INDEX[id].p === pk && (INDEX[id].kind === "single" || INDEX[id].kind === "multi")).map((id) => { const s = selText(p, INDEX[id]); return s ? [INDEX[id].label.replace(/-/g, ""), s] : null; }).filter(Boolean);
  const kvRows = (arr) => { let o = ""; for (let i = 0; i < arr.length; i += 2) o += row([arr[i], arr[i + 1] || ["", ""]]); return o; };
  const photos = [];
  for (const ph of p.photos) { const d = await getBlob(ph.id); if (d) photos.push('<figure style="display:inline-block;margin:2px"><img src="' + d + '"><figcaption>' + esc(fmtT(ph.t) + " " + ph.label) + "</figcaption></figure>"); }
  const vit = p.vitals.slice().sort((a, b) => a.t - b.t);
  const ents = p.entries.slice().sort((a, b) => a.t - b.t);
  const dx = Object.keys(p.sel).filter((k) => k.startsWith("m_dx_")).flatMap((k) => p.sel[k]);
  const fms = (m.fms || []).map((x) => fmtHM(x.t) + " S" + x.s + (x.s === 0 ? " (Prio-Sprechwunsch)" : x.s === 5 ? " (Sprechwunsch)" : "")).join(" · ");
  let html = '<div class="print">' +
    '<div class="wm">RETTPAD – SCHULUNGS-SIMULATION – FIKTIVE DATEN – KEIN GÜLTIGES EINSATZPROTOKOLL</div>' +
    '<table style="border:0"><tr><td style="border:0"><h1>Einsatzprotokoll ' + esc(patType(p)) + " – Patient " + esc(p.letter) + '</h1>Einsatz-Nr. ' + esc(m.nr || tr.einsatznr || "–") + " · erstellt " + fmtD(p.created) + " " + fmtHM(p.created) + (p.closed ? " · abgeschlossen " + fmtD(p.closedAt) + " " + fmtHM(p.closedAt) : " · NICHT abgeschlossen") + '</td><td style="border:0;text-align:right;white-space:pre-line;font-size:11px">' + esc(S.settings.stamp) + "</td></tr></table>" +
    "<h2>1. Rettungsdienstliche Daten</h2><table>" +
    row([["Name, Vorname", patName(p)], ["Geburtsdatum", pa.geb ? pa.geb + " (" + age(pa.geb) + " J.)" : ""]]) + row([["Geschlecht", pa.geschlecht], ["Anschrift", [pa.strasse, pa.plz, pa.ort].filter(Boolean).join(" ")]]) +
    row([["Kostenträger", ko.kasse], ["Vers.-Nr. / IK", [ko.versNr, ko.ikNr].filter(Boolean).join(" / ")]]) + row([["Einsatzart", p.sel.s_einsatzart], ["Stichwort", tr.stichwort]]) +
    row([["Einsatzort", tr.einsatzort], ["Transportziel", tr.ziel]]) + row([["Zeiten", ["Alarm " + (tr.t_alarm || "–"), "S3 " + (tr.t_aus || "–"), "S4 " + (tr.t_ankunft || "–"), "S7 " + (tr.t_abfahrt || "–"), "S8 " + (tr.t_ziel || "–"), "Frei " + (tr.t_frei || "–")].join(" · ")], ["Status", fms]]) +
    row([["Fahrzeug", cr.fahrzeug], ["Besatzung", [cr.beifahrer, cr.fahrer, cr.praktikant].filter(Boolean).join(", ")]]) + row([["Notarzt", cr.notarzt || (S.settings.na ? "anwesend" : "")], ["km", tr.km]]) + "</table>" +
    "<h2>2. Anamnese</h2><table>" + row([["Notfallgeschehen", f("notfallgeschehen").text], ["Dauermedikation / Allergien", [f("medikation").med, f("medikation").allergie].filter(Boolean).join(" / ")]]) + kvRows(selList("p2")) + "</table>" +
    "<h2>3. Erstbefund</h2><table>" + kvRows(selList("p3").concat([p.scores.gcs ? ["GCS", p.scores.gcs.total + " (A" + p.scores.gcs.a + " V" + p.scores.gcs.v + " M" + p.scores.gcs.m + ")"] : null, p.scores.iss4 ? ["4ISS", String(p.scores.iss4.total)] : null, p.scores.befast ? ["BE-FAST", p.scores.befast.pos ? "positiv" : "negativ"] : null].filter(Boolean))) + "</table>" +
    "<h2>4. Diagnose</h2><p>" + esc(dx.join(", ") || "–") + (f("dxtext").text ? "<br>" + esc(f("dxtext").text) : "") + "</p>" +
    "<h2>Vitalwerte</h2><table><tr><th>Zeit</th><th>RR</th><th>HF</th><th>SpO2</th><th>AF</th><th>etCO2</th><th>BZ</th><th>Temp</th><th>Quelle</th></tr>" + vit.map((v) => "<tr><td>" + fmtT(v.t) + "</td><td>" + (v.sys ? v.sys + "/" + (v.dia || "") : "") + "</td><td>" + (v.hf || "") + "</td><td>" + (v.spo2 || "") + "</td><td>" + (v.af || "") + "</td><td>" + (v.co2 || "") + "</td><td>" + (v.bz || "") + "</td><td>" + (v.temp || "") + "</td><td>" + esc(v.src || "") + "</td></tr>").join("") + "</table>" +
    "<h2>5./6. Verlauf und Maßnahmen (Verlaufsliste)</h2><table><tr><th>Zeit</th><th>Bereich</th><th>Eintrag</th></tr>" + ents.map((e) => "<tr><td>" + fmtT(e.t) + (e.edited ? "*" : "") + "</td><td>" + esc(e.cat) + "</td><td>" + esc(e.text) + "</td></tr>").join("") + "</table>" +
    (p.meds.length ? "<h2>Medikamente</h2><table>" + p.meds.map((x) => "<tr><td>" + fmtT(x.t) + "</td><td>" + esc(x.drug) + "</td><td>" + esc(x.dose + " " + x.unit) + "</td><td>" + esc(x.route) + "</td></tr>").join("") + "</table>" : "") +
    "<h2>7. Übergabe</h2><table>" + kvRows(selList("p7").concat([["Übergabezeit", f("uebergabe").zeit], ["Übernehmende Person", f("uebergabe").an]])) + "</table>" +
    (Object.values(f("sinnhaft")).some(Boolean) ? "<h3>Übergabe nach SINNHAFT</h3><table class='sinnhaft'>" + D.FORMS.sinnhaft.fields.map((fd) => "<tr><th>" + esc(fd.label.split(" (")[0]) + "</th><td style='white-space:pre-line'>" + esc(f("sinnhaft")[fd.k] || "–") + "</td></tr>").join("") + "</table>" : "") +
    "<h2>8. Ergebnis</h2><table>" + kvRows(selList("p8")) + "</table>" +
    (p.prenotice ? "<h2>Klinikvoranmeldung</h2><p>" + esc(p.prenotice.cat + " / " + p.prenotice.sym + " → " + p.prenotice.klinik + ", ETA " + (p.prenotice.eta || "–") + ", Status: " + p.prenotice.status + (p.prenotice.text ? ", „" + p.prenotice.text + "“" : "")) + "</p>" : "") +
    (Object.keys(p.mat).length ? "<h2>Materialverbrauch</h2><p>" + Object.entries(p.mat).map(([k, v]) => esc(v + "× " + k)).join(", ") + "</p>" : "") +
    (photos.length ? "<h2>Fotos / EKG</h2>" + photos.join("") : "") +
    "<h2>Unterschriften</h2><table><tr>" + [["patient", "Patient/in"], ["arzt", "Übernehmende/r"], ["crew", "Transportführer/in"]].map(([k, l]) => "<td style='height:80px;width:33%'>" + l + "<br>" + (p.sign[k] ? '<img src="' + p.sign[k].img + '" style="max-height:70px;border:0">' : "") + "</td>").join("") + "</tr></table>" +
    '<p style="font-size:10px;color:#666">Erstellt mit ' + esc(DIS) + ' (' + esc(D.VERSION) + ").</p></div>";
  if (opts.tv) html += '<div class="print pagebreak"><div class="wm">SCHULUNGSDARSTELLUNG – KEIN AMTLICHES FORMULAR</div><h1>Verordnung einer Krankenbeförderung (vereinfachtes Schulungsmuster)</h1><table>' +
    row([["Versicherte/r", patName(p)], ["geb.", pa.geb]]) + row([["Kostenträger", ko.kasse], ["Vers.-Nr.", ko.versNr]]) + row([["Beförderungsmittel", patType(p) === "KTP" ? "KTW" : patType(p) === "ITW" ? "ITW" : "RTW"], ["Von / Nach", (tr.einsatzort || "–") + " → " + (tr.ziel || "–")]]) +
    row([["Grund", p.sel.s_einsatzart], ["Datum", fmtD(p.created)]]) + "</table><p style='margin-top:60px'>_____________________________<br>Unterschrift / Stempel Ärztin/Arzt</p></div>";
  return html;
}
TOOLS.preview = { title: "Protokollvorschau", render() {
  const box = h("div", { style: "background:#fff;border-radius:6px" }, h("div", { class: "empty", style: "color:#333" }, "Vorschau wird erstellt …"));
  protocolHTML(P(), M()).then((x) => (box.innerHTML = x));
  return h("div", null, h("div", { class: "row", style: "margin-bottom:8px" }, h("button", { class: "tbtn primary", onclick: () => go({ t: "tool", tool: "print" }) }, "🖨 Drucken / PDF")), box);
}};
async function doPrint(copies, tv) {
  let root = document.getElementById("printroot"); if (!root) { root = h("div", { id: "printroot" }); document.body.append(root); }
  const one = await protocolHTML(P(), M(), { tv });
  root.innerHTML = Array.from({ length: copies }, (_, i) => (i ? '<div class="pagebreak"></div>' : "") + one).join("");
  P().printed = (P().printed || 0) + copies; save();
  setTimeout(() => { try { window.print(); } catch (e) {} }, 60);
}
TOOLS.print = { title: "Drucken", render(v) {
  v.copies = v.copies || S.settings.copies || 1; v.tv = v.tv || false;
  return card("Protokoll drucken / als PDF speichern", h("p", { class: "small" }, "Es öffnet sich der Druckdialog des Browsers. Dort kann auch „Als PDF speichern“ gewählt werden. Bisher gedruckt: " + (P().printed || 0) + "×."),
    h("div", { class: "fld" }, h("label", null, "Anzahl Kopien (max. 5)"), h("div", { class: "seg" }, [1, 2, 3, 4, 5].map((n) => h("button", { type: "button", class: v.copies === n ? "on" : "", onclick: () => { v.copies = n; render(); } }, String(n))))),
    h("div", { class: "fld", style: "margin-top:8px" }, h("label", null, "Transportverordnung (Schulungsmuster) mit Unterschriftsfeld anhängen"), h("div", { class: "seg" }, ["nein", "ja"].map((x) => h("button", { type: "button", class: (v.tv ? "ja" : "nein") === x ? "on" : "", onclick: () => { v.tv = x === "ja"; render(); } }, x)))),
    h("div", { class: "formbar" }, h("button", { class: "tbtn", onclick: () => go({ t: "tool", tool: "preview" }) }, "Vorschau"), h("button", { class: "tbtn ok", "data-a": "print", onclick: () => doPrint(v.copies, v.tv) }, "🖨 Drucken")));
}};

/* ---------- Abschluss ---------- */
TOOLS.complete = { title: "Vollständigkeitsprüfung", render() {
  const p = P(); const req = requiredFor(p);
  const plaus = [];
  const tr = p.forms.transport || {};
  const order = ["t_alarm", "t_aus", "t_ankunft", "t_abfahrt", "t_ziel", "t_frei"].map((k) => tr[k]).filter(Boolean);
  for (let i = 1; i < order.length; i++) if (order[i] < order[i - 1] && !(order[i - 1] > "20:00" && order[i] < "04:00")) plaus.push("Einsatzzeiten nicht chronologisch (" + order[i - 1] + " → " + order[i] + ")");
  if (p.sel.s_ergebnis === "Transport in Klinik" && !tr.ziel) plaus.push("Ergebnis „Transport in Klinik“, aber kein Transportziel");
  if (p.sel.s_ergebnis === "Transportverweigerung" && !p.sign.patient) plaus.push("Transportverweigerung ohne Unterschrift Patient/in");
  if (p.scores.gcs && p.scores.gcs.total <= 8 && !p.entries.some((e) => /Intubation|Larynx|Guedel|Wendl|Atemweg/.test(e.text))) plaus.push("GCS ≤ 8 ohne dokumentierte Atemwegssicherung – bitte prüfen");
  if (Object.keys(p.sel).some((k) => (p.sel[k] || []).includes && (p.sel[k] || []).includes("Schlaganfall")) && !p.vitals.some((x) => x.bz)) plaus.push("Diagnose Schlaganfall ohne Blutzuckerwert (DD Hypoglykämie)");
  if (p.sel.s_naca === "VII" && p.sel.s_zustand_ueb !== "verstorben") plaus.push("NACA VII, aber Zustand bei Übergabe nicht „verstorben“");
  const groups = {}; req.forEach((r) => (groups[r.p] = groups[r.p] || []).push(r));
  return h("div", null,
    h("div", { class: "cols" }, Object.keys(groups).map((pk) => card(D.TREE[pk].nr + ". " + D.TREE[pk].label, h("ul", { style: "margin:0;padding-left:18px" }, groups[pk].map((r) => h("li", { style: "color:" + (isDone(p, r.id) ? "#0b6b1c" : "#b00000") + ";font-weight:600;cursor:pointer;padding:4px 0", onclick: () => { const n = node(r.id); if (r.id === "DX") go({ t: "node", p: "p4", path: [] }, true); else go({ t: "node", p: n.p, path: n.path.slice(0, -1) }, true); } }, (isDone(p, r.id) ? "✔ " : "✖ ") + r.label)))))),
    card("Plausibilitätsprüfung", plaus.length ? h("ul", { class: "missing" }, plaus.map((x) => h("li", null, x))) : h("span", { class: "chip g" }, "keine Auffälligkeiten")),
    h("div", { class: "formbar" }, h("button", { class: "tbtn ok", onclick: () => go({ t: "tool", tool: "close" }) }, "weiter zu „abschließen!“")));
}};
TOOLS.close = { title: "Protokoll abschließen", render() {
  const p = P(); const miss = missing(p);
  if (p.closed) return card("Abgeschlossen", h("p", null, "Patient " + p.letter + " wurde am " + fmtD(p.closedAt) + " um " + fmtT(p.closedAt) + " abgeschlossen. Änderungen sind gesperrt."),
    S.admin ? h("button", { class: "tbtn danger", onclick: () => { p.closed = false; addEntry(null, "Protokoll durch Admin wieder geöffnet", "Abschluss", { t: Date.now() }); } }, "Admin: wieder öffnen") : h("p", { class: "small" }, "Wieder öffnen nur durch Admins (Rolle Admin + 2-Faktor)."),
    h("div", { class: "formbar" }, h("button", { class: "tbtn primary", onclick: () => go({ t: "tool", tool: "send" }) }, "Datenverkehr / versenden")));
  return card("abschließen!", miss.length ? h("div", null, h("p", { style: "color:#b00000;font-weight:700" }, miss.length + " Pflichtfeld(er) offen:"), h("div", null, miss.map((x) => h("span", { class: "chip r" }, x.label))), h("p", { class: "small" }, "Ein Abschluss ist erst möglich, wenn alle Pflichtfelder (rote Markierungen) ausgefüllt sind."))
    : h("p", null, "Alle Pflichtfelder sind ausgefüllt. Nach dem Abschluss kann das Protokoll nicht mehr geändert werden und wird in die Versandliste übernommen."),
    h("div", { class: "formbar" }, h("button", { class: "tbtn", onclick: () => go({ t: "tool", tool: "complete" }) }, "vollständig?"),
      h("button", { class: "tbtn danger", "data-a": "do-close", disabled: miss.length > 0 && !S.admin, onclick: () => confirmBox("Protokoll abschließen", "Patient " + p.letter + " (" + patName(p) + ") jetzt endgültig abschließen?", "abschließen", () => {
        if (S.settings.medtech) mtStop();
        addEntry(null, "Protokoll abgeschlossen", "Abschluss", { t: Date.now(), silent: true });
        p.closed = true; p.closedAt = Date.now();
        const lab = (M().nr || "ohne Nr.") + " / Pat. " + p.letter + " " + patName(p);
        S.sendQueue.push({ id: uid(), pid: p.id, kind: "Einsatzprotokoll (PDF + Daten)", label: lab, t: Date.now(), tries: 0 }, { id: uid(), pid: p.id, kind: "Abrechnungsdaten", label: lab, t: Date.now(), tries: 0 }, { id: uid(), pid: p.id, kind: "Materialverbrauch", label: lab, t: Date.now(), tries: 0 });
        logSys("Protokoll " + lab + " abgeschlossen"); go({ t: "tool", tool: "send" }, false); toast("Protokoll abgeschlossen und in Versandliste gestellt");
      }, "danger") }, "abschließen!")));
}};
let sending = false, sendT = 0;
function startSend(v) {
  if (sending) return;
  if (S.settings.conn === "offline") { toast("Keine Verbindung (offline) – Daten bleiben in der Versandliste"); return; }
  if (!S.sendQueue.length) { toast("Versandliste ist leer"); return; }
  sending = true; render();
  const step = () => {
    if (!sending) return;
    const it = S.sendQueue[0]; if (!it) { sending = false; render(); toast("Alle Daten übertragen – Server hat Empfang bestätigt (simuliert)"); return; }
    it.prog = (it.prog || 0) + 25;
    if (it.prog >= 100) { S.sendQueue.shift(); it.done = Date.now(); S.sent.unshift(it); S.sent = S.sent.slice(0, 100); const pp = S.missions.flatMap((m) => m.patients).find((x) => x.id === it.pid); if (pp && !S.sendQueue.some((q) => q.pid === pp.id)) pp.sent = true; logSys("Übertragen: " + it.kind + " " + it.label); }
    softRefresh();
    sendT = setTimeout(step, S.settings.conn === "GPRS" ? 900 : 350);
  };
  step();
}
TOOLS.send = { title: "Datenverkehr / Versand", render() {
  return h("div", null,
    card("Verbindung", h("div", { class: "seg" }, ["LAN", "WLAN", "GPRS", "LTE", "offline"].map((c) => h("button", { type: "button", class: S.settings.conn === c ? "on" : "", "data-conn": c, onclick: () => { S.settings.conn = c; if (c === "offline") { sending = false; clearTimeout(sendT); } render(); } }, c))),
      h("div", { class: "formbar" }, sending ? h("button", { class: "tbtn danger", "data-a": "send-stop", onclick: () => { sending = false; clearTimeout(sendT); render(); } }, "■ Stopp") : h("button", { class: "tbtn ok", "data-a": "send-start", onclick: () => startSend() }, "▶ Start Versand"))),
    card("Versandliste (" + S.sendQueue.length + ")", S.sendQueue.length ? h("table", { class: "list" }, h("tbody", null, S.sendQueue.map((q) => h("tr", null, h("td", null, fmtT(q.t)), h("td", null, q.kind), h("td", null, q.label), h("td", { style: "width:30%" }, h("div", { class: "progress" }, h("i", { style: "width:" + (q.prog || 0) + "%" }))))))) : h("span", { class: "small" }, "Keine offenen Übertragungen. Einträge bleiben hier, bis der (simulierte) Server den Empfang bestätigt.")),
    card("Übertragen (" + S.sent.length + ")", S.sent.length ? h("table", { class: "list" }, h("tbody", null, S.sent.slice(0, 30).map((q) => h("tr", null, h("td", null, fmtD(q.done) + " " + fmtT(q.done)), h("td", null, q.kind), h("td", null, q.label), h("td", null, "✔ bestätigt"))))) : h("span", { class: "small" }, "–")));
}};

TOOLS.takeover = { title: "Daten übernehmen", render() {
  const p = P(), m = M();
  const mk = (type, label, copyAll) => {
    const np = freshPatient(String.fromCharCode(65 + m.patients.length), type);
    np.forms.patient = clone(p.forms.patient || {}); np.forms.kosten = clone(p.forms.kosten || {}); np.forms.crew = clone(p.forms.crew || S.crew);
    if (copyAll) { np.forms = clone(p.forms); np.sel = clone(p.sel); np.vitals = clone(p.vitals); np.scores = clone(p.scores); }
    np.sel.s_einsatzart = type === "KTP" ? "Krankentransport (KTP)" : type === "ITW" ? "Intensivtransport (ITW)" : "Notfalleinsatz";
    if (label === "Rückfahrt") { const t = np.forms.transport = clone(p.forms.transport || {}); const z = t.ziel; t.ziel = t.einsatzort; t.einsatzort = z || ""; ["t_alarm", "t_aus", "t_ankunft", "t_abfahrt", "t_ziel", "t_frei"].forEach((k) => delete t[k]); }
    np.entries.push({ id: uid(), t: Date.now(), node: null, cat: "Abschluss", text: label + " – Daten übernommen von Patient " + p.letter, static: false, created: Date.now() });
    m.patients.push(np); S.curPat = m.patients.length - 1; home(); toast(label + ": Patient " + np.letter + " angelegt");
  };
  const exp = () => { const blob = new Blob([JSON.stringify({ format: "rettpad-trainer-pad2pad", v: 1, mission: m.nr, patient: p }, null, 1)], { type: "application/json" }); const a = h("a", { href: URL.createObjectURL(blob), download: "pad2pad_" + (m.nr || "einsatz") + "_" + p.letter + ".json" }); document.body.append(a); a.click(); a.remove(); addEntry(null, "Pad-zu-Pad: Datensatz exportiert", "Abschluss", { t: Date.now() }); };
  const file = h("input", { type: "file", accept: ".json", style: "display:none", onchange: (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { try { const j = JSON.parse(t); if (!/-pad2pad$/.test(j.format || "")) throw new Error("kein Pad-zu-Pad-Datensatz"); const np = j.patient; np.id = uid(); np.letter = String.fromCharCode(65 + m.patients.length); np.closed = false; np.photos = []; m.patients.push(np); S.curPat = m.patients.length - 1; home(); toast("Pad-zu-Pad: Patient übernommen"); } catch (er) { toast("Import fehlgeschlagen: " + er.message); } }); } });
  return h("div", null, h("div", { class: "tiles" },
    h("button", { class: "tile", "data-a": "to-rueck", onclick: () => mk("KTP", "Rückfahrt") }, "Rückfahrt", h("span", { class: "val" }, "neuer KTP mit Patientendaten, Ziel/Ort getauscht")),
    h("button", { class: "tile", "data-a": "to-weiter", onclick: () => mk(patType(p), "Weiterleitung", true) }, "Weiterleitung", h("span", { class: "val" }, "kompletter Datensatz in neuen Patienten")),
    h("button", { class: "tile", "data-a": "to-transport", onclick: () => mk(patType(p), "Transport") }, "Transport", h("span", { class: "val" }, "Stammdaten für Folgetransport")),
    h("button", { class: "tile", "data-a": "to-leit", onclick: () => { if (!m.alarm) { toast("Kein Leitstellendatensatz vorhanden"); return; } if (!canEdit()) return; const a = m.alarm; const t = p.forms.transport = p.forms.transport || {}; t.einsatznr = t.einsatznr || a.nr; t.einsatzort = t.einsatzort || a.adresse; t.stichwort = t.stichwort || a.stichwort; t.t_alarm = t.t_alarm || fmtHM(a.time); addEntry(null, "Leitstellendaten zusammengeführt", "Abschluss", { t: Date.now() }); } }, "Leitstelle zusammenführen", h("span", { class: "val" }, "leere Felder aus Alarmierung füllen")),
    h("button", { class: "tile", onclick: exp }, "Pad-zu-Pad senden", h("span", { class: "val" }, "als JSON-Datei exportieren")),
    h("button", { class: "tile", onclick: () => file.click() }, "Pad-zu-Pad empfangen", h("span", { class: "val" }, "JSON-Datei importieren"))), file);
}};
TOOLS.matuse = { title: "Materialverbrauch", render(v) {
  const p = P();
  const chg = (k, d) => { if (!canEdit()) return; p.mat[k] = Math.max(0, (p.mat[k] || 0) + d); if (!p.mat[k]) delete p.mat[k]; render(); };
  v.f = v.f || "";
  const all = D.MATERIAL.filter((x) => !p.mat[x] && x.toLowerCase().includes(v.f.toLowerCase()));
  return h("div", null,
    card("Verbrauch Patient " + p.letter + (p.matBooked ? " (verbucht " + fmtT(p.matBooked) + ")" : ""), Object.keys(p.mat).length ? h("table", { class: "list" }, h("tbody", null, Object.keys(p.mat).sort().map((k) => h("tr", null, h("td", null, k), h("td", { class: "num" }, String(p.mat[k])), h("td", { style: "white-space:nowrap;text-align:right" }, h("button", { class: "mini", onclick: () => chg(k, -1) }, "−"), " ", h("button", { class: "mini", onclick: () => chg(k, 1) }, "+")))))) : h("span", { class: "small" }, "Noch kein Material erfasst (wird bei Maßnahmen automatisch vorgeschlagen)."),
      h("div", { class: "formbar" }, h("button", { class: "tbtn ok", "data-a": "mat-book", disabled: !!p.matBooked, onclick: () => { Object.keys(p.mat).forEach((k) => { const it = S.inventory[k] || (S.inventory[k] = { soll: 10, ist: 10 }); it.ist = Math.max(0, it.ist - p.mat[k]); }); p.matBooked = Date.now(); addEntry(null, "Materialverbrauch verbucht", "Abschluss", { t: Date.now() }); } }, p.matBooked ? "bereits verbucht" : "Verbrauch verbuchen"))),
    card("Material hinzufügen", h("div", { class: "fld" }, h("input", { placeholder: "Suchen …", value: v.f, oninput: (e) => { v.f = e.target.value; const pos = e.target.selectionStart; render(); const i = document.querySelector("[data-a=matsearch]"); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }, "data-a": "matsearch" })),
      h("div", { class: "tiles", style: "margin-top:8px" }, all.map((x) => h("button", { class: "tile", onclick: () => chg(x, 1) }, x)))));
}};

/* ---------- Menü ---------- */
const MENU = [["patients", "Patienten­verwaltung"], ["missions", "Einsätze verwalten"], ["manv", "MANV-Erfassung"], ["inventory", "Inventur / Bestellung"], ["restock", "Material aufrüsten"], ["notes", "Notizblock"], ["vcheck", "Fahrzeugcheck"], ["translate", "Übersetzer"], ["addresses", "Adressen"], ["devices", "Gerät hinzufügen / auswählen"], ["docs", "Dokumente"], ["drugs", "Medikamenten-Info (statt Rote Liste)"], ["shift", "Tageseinstellungen / Schichtwechsel"], ["stamp", "Stempel"], ["settings", "Geräte-Einstellungen"], ["medtech", "Medizintechnik"], ["version", "Versionsinfo"], ["account", "Mein Konto"], ["admin", "Administration", true], ["lock", "Sperren"], ["logout", "Abmelden / Benutzerwechsel"], ["standby", "Standby"], ["restart", "Neustart (App)"], ["shutdown", "Herunterfahren / Neustart"]];
TOOLS.menu = { title: "Menü", render() {
  return h("div", { class: "tiles" }, MENU.filter((x) => !x[2] || isAdm()).map(([k, l]) => h("button", { class: "tile", "data-menu": k, onclick: () => {
    if (k === "standby") { const sb = h("div", { class: "standby", "data-a": "wake", onclick: () => sb.remove() }, "Standby – zum Aufwecken tippen"); $stage.append(sb); return; }
    if (k === "restart") { confirmBox("Neustart", "RettPad neu starten? Alle Daten bleiben erhalten, auch nicht abgeschlossene Einsätze. Danach ist eine neue Anmeldung nötig.", "Neustart", () => setTimeout(restartApp, 0)); return; }
    if (k === "shutdown") { shutdownMenu(); return; }
    if (k === "logout") { logout(); return; }
    if (k === "lock") { showLock("Manuell gesperrt."); return; }
    if (k === "admin") { enterAdmin("dash"); return; }
    go({ t: "tool", tool: k });
  } }, l, k === "admin" ? h("span", { class: "val" }, ROLE_L[ME.role]) : null, k === "missions" && pendingCount() ? h("span", { class: "val" }, "⟳ " + pendingCount()) : null, k === "logout" && curUser() ? h("span", { class: "val" }, uName(curUser())) : null)));
}};
TOOLS.patients = { title: "Patientenverwaltung", render() {
  const m = M();
  return h("div", null, card("Einsatz " + (m.nr || "(ohne Nummer)") + " – Patienten", h("table", { class: "list" }, h("tbody", null, m.patients.map((p, i) => h("tr", { class: i === S.curPat ? "selrow" : "" }, h("td", null, h("b", { style: "font-size:1.4em" }, p.letter)), h("td", null, patName(p)), h("td", null, patType(p)), h("td", null, p.closed ? (p.sent ? "✔ versendet" : "🔒 abgeschlossen") : missing(p).length ? "✚ " + missing(p).length + " offen" : "✔ vollständig"),
      h("td", { style: "text-align:right;white-space:nowrap" }, h("button", { class: "mini", "data-a": "pat-sel-" + p.letter, onclick: () => { S.curPat = i; home(); } }, "wählen"), " ", m.patients.length > 1 ? h("button", { class: "mini", onclick: () => { if (p.closed && !S.admin) { toast("Abgeschlossene Protokolle nur durch Admins löschen"); return; } confirmBox("Patient löschen", "Patient " + p.letter + " (" + patName(p) + ") löschen?", "löschen", () => { m.patients.splice(i, 1); S.curPat = 0; render(); }, "danger"); } }, "🗑") : null)))))),
    h("div", { class: "formbar" }, h("button", { class: "tbtn ok", "data-a": "pat-new", onclick: () => { m.patients.push(freshPatient(String.fromCharCode(65 + m.patients.length), patType(P()))); S.curPat = m.patients.length - 1; const np = P(); np.forms.transport = clone(m.patients[0].forms.transport || {}); np.forms.crew = clone(S.crew); home(); toast("Neuer Patient " + np.letter + " angelegt"); } }, "+ neuer Patient im Einsatz"), h("button", { class: "tbtn", onclick: () => go({ t: "tool", tool: "missions" }) }, "Einsätze verwalten")));
}};
TOOLS.missions = { title: "Einsätze verwalten", render() {
  return h("div", null, h("div", { class: "formbar", style: "margin:0 0 8px" }, h("button", { class: "tbtn ok", "data-a": "mission-new", onclick: () => { const m = freshMission(); m.patients[0].forms.crew = clone(S.crew); S.missions.unshift(m); S.cur = m.id; S.curPat = 0; home(); toast("Neuer leerer Einsatz angelegt"); } }, "+ neuer Einsatz (manuell)"), h("button", { class: "tbtn primary", onclick: simulateAlarm }, "📟 Alarm simulieren")),
    h("table", { class: "list" }, h("thead", null, h("tr", null, ["Datum", "Einsatz-Nr.", "Stichwort", "Patienten", "Status", "Cloud", ""].map((x) => h("th", null, x)))), h("tbody", null, S.missions.map((m) => h("tr", { class: m.id === S.cur ? "selrow" : "" }, h("td", null, fmtD(m.created) + " " + fmtHM(m.created)), h("td", null, m.nr || "–"), h("td", null, (m.alarm && m.alarm.stichwort) || ((m.patients[0].forms.transport || {}).stichwort) || "–"), h("td", null, m.patients.map((p) => p.letter + " " + patName(p)).join("; ")), h("td", null, m.patients.every((p) => p.closed) ? (m.patients.every((p) => p.sent) ? "versendet" : "abgeschlossen") : "offen"), h("td", { class: "small", "data-sync": syncState(m) }, syncState(m)),
      h("td", { style: "white-space:nowrap;text-align:right" }, h("button", { class: "mini", "data-a": "mission-open", onclick: () => { S.cur = m.id; S.curPat = 0; home(); } }, "öffnen"), " ", h("button", { class: "mini", onclick: () => { if (S.missions.length < 2) { toast("Mindestens ein Einsatz muss bestehen bleiben"); return; } if (m.patients.some((p) => p.closed && !p.sent) && !S.admin) { toast("Abgeschlossene, nicht versendete Einsätze nur durch Admins löschen"); return; } confirmBox("Einsatz löschen", "Einsatz " + (m.nr || "") + " mit allen Patienten löschen?", "löschen", () => { m.patients.forEach((p) => p.photos.forEach((ph) => delBlob(ph.id))); S.missions = S.missions.filter((x) => x !== m); if (S.cur === m.id) { S.cur = S.missions[0].id; S.curPat = 0; } render(); }, "danger"); } }, "🗑")))))));
}};
TOOLS.manv = { title: "MANV – Patientenerfassung (Anhängekarte)", render(v) {
  const m = M(); v.d = v.d || { sk: "", geschlecht: "" }; const d = v.d;
  const cnt = (k) => m.manv.filter((x) => x.sk === k).length;
  const SK = [["I", "sk1", "SK I – rot (akute vitale Bedrohung)"], ["II", "sk2", "SK II – gelb (schwer verletzt)"], ["III", "sk3", "SK III – grün (leicht verletzt)"], ["IV", "sk4", "SK IV – blau (ohne Überlebenschance)"], ["ex", "sk5", "tot"]];
  return h("div", null,
    card("Übersicht", h("div", { class: "row" }, SK.map(([k, c, l]) => h("span", { class: "sk " + c, title: l }, k + ": " + cnt(k))), h("span", { class: "chip" }, "gesamt " + m.manv.length))),
    card("Neue Sichtung", h("div", { class: "fld" }, h("label", null, "Sichtungskategorie *"), h("div", { class: "seg" }, SK.map(([k, c, l]) => h("button", { type: "button", class: (d.sk === k ? "on " : "") , "data-sk": k, onclick: () => { d.sk = k; render(); } }, h("span", { class: "sk " + c, style: "min-height:24px;min-width:34px;margin-right:6px" }, k), l.split(" – ")[1] || l)))),
      h("div", { class: "form", style: "margin-top:8px" }, fieldEl({ k: "pak", label: "Anhängekarten-Nr." }, () => d.pak, (x) => (d.pak = x)), fieldEl({ k: "name", label: "Name (falls bekannt)" }, () => d.name, (x) => (d.name = x)), fieldEl({ k: "geschlecht", label: "Geschlecht", type: "toggle", options: ["m", "w", "d", "?"] }, () => d.geschlecht, (x) => (d.geschlecht = x)), fieldEl({ k: "verl", label: "Verletzungsmuster / Diagnose" }, () => d.verl, (x) => (d.verl = x)), fieldEl({ k: "ziel", label: "Transportziel", type: "select", options: [""].concat(D.CLINICS.map((c) => c.name)) }, () => d.ziel, (x) => (d.ziel = x))),
      h("div", { class: "formbar" }, h("button", { class: "tbtn ok", "data-a": "manv-add", onclick: () => { if (!d.sk) { toast("Bitte Sichtungskategorie wählen"); return; } m.manv.push(Object.assign({ id: uid(), t: Date.now(), nr: d.pak || "PAK-" + String(m.manv.length + 1).padStart(3, "0") }, d)); v.d = { sk: "", geschlecht: "" }; render(); toast("MANV-Patient erfasst"); } }, "Erfassen"))),
    m.manv.length ? card("Erfasste Patienten", h("table", { class: "list" }, h("tbody", null, m.manv.slice().reverse().map((x) => h("tr", null, h("td", null, fmtT(x.t)), h("td", null, h("span", { class: "sk " + SK.find((s) => s[0] === x.sk)[1] }, x.sk)), h("td", null, x.nr), h("td", null, x.name || "unbekannt"), h("td", null, x.geschlecht || ""), h("td", null, x.verl || ""), h("td", null, x.ziel || ""))))),
      h("div", { class: "formbar" }, h("button", { class: "tbtn primary", onclick: () => { S.sendQueue.push({ id: uid(), kind: "MANV-Liste (" + m.manv.length + " Pat.)", label: m.nr || "MANV", t: Date.now() }); toast("MANV-Liste in Versandliste gestellt (an Einsatzleitung – simuliert)"); render(); } }, "An Einsatzleitung übermitteln (sim.)"))) : null);
}};

/* ---------- Inventur / Bestellung ---------- */
TOOLS.inventory = { title: "Inventur / Bestellung", render(v) {
  v.ord = v.ord || {};
  const low = Object.keys(S.inventory).filter((k) => S.inventory[k].ist < S.inventory[k].soll);
  return h("div", null,
    card("Bestand Fahrzeug (" + S.crew.fahrzeug + ")", h("table", { class: "list" }, h("thead", null, h("tr", null, ["Artikel", "Soll", "Ist", "Bestellen", ""].map((x) => h("th", null, x)))), h("tbody", null, Object.keys(S.inventory).sort().map((k) => { const it = S.inventory[k]; const def = Math.max(0, it.soll - it.ist); if (v.ord[k] == null) v.ord[k] = def;
      return h("tr", { class: it.ist < it.soll ? "selrow" : "" }, h("td", null, k), h("td", { class: "num" }, String(it.soll)), h("td", { class: "num" }, String(it.ist)), h("td", { class: "num" }, String(v.ord[k])), h("td", { style: "white-space:nowrap;text-align:right" }, h("button", { class: "mini", onclick: () => { v.ord[k] = Math.max(0, v.ord[k] - 1); render(); } }, "−"), " ", h("button", { class: "mini", onclick: () => { v.ord[k]++; render(); } }, "+"))); })))),
    card("Bestellung", h("p", null, low.length + " Artikel unter Sollbestand. Bestellsumme: " + Object.values(v.ord).reduce((a, b) => a + b, 0) + " Stück."),
      h("div", { class: "formbar" }, h("button", { class: "tbtn ok", "data-a": "order", onclick: () => { const items = Object.entries(v.ord).filter(([, n]) => n > 0); if (!items.length) { toast("Nichts zu bestellen"); return; } const o = { id: uid(), t: Date.now(), items, status: "an Lager übermittelt (sim.)" }; S.orders.unshift(o); S.sendQueue.push({ id: uid(), kind: "Materialbestellung", label: items.length + " Positionen", t: Date.now() }); v.ord = {}; toast("Bestellung erstellt und in Versandliste gestellt"); render(); } }, "Bestellung auslösen"))),
    S.orders.length ? card("Bestellungen", h("table", { class: "list" }, h("tbody", null, S.orders.slice(0, 10).map((o) => h("tr", null, h("td", null, fmtD(o.t) + " " + fmtHM(o.t)), h("td", null, o.items.map(([k, n]) => n + "× " + k).join(", ")), h("td", null, o.status)))))) : null);
}};
TOOLS.restock = { title: "Material aufrüsten", render() {
  const low = Object.keys(S.inventory).filter((k) => S.inventory[k].ist < S.inventory[k].soll).sort();
  return card("Aufrüsten nach Einsatz", low.length ? h("table", { class: "list" }, h("tbody", null, low.map((k) => h("tr", null, h("td", null, k), h("td", { class: "num" }, S.inventory[k].ist + " / " + S.inventory[k].soll), h("td", { style: "text-align:right" }, h("button", { class: "mini", onclick: () => { S.inventory[k].ist = S.inventory[k].soll; render(); } }, "aufgefüllt")))))) : h("p", null, "✔ Alles auf Sollbestand."),
    h("div", { class: "formbar" }, h("button", { class: "tbtn ok", "data-a": "restock-all", onclick: () => { low.forEach((k) => (S.inventory[k].ist = S.inventory[k].soll)); logSys("Fahrzeug aufgerüstet"); toast("Alle Artikel auf Sollbestand gesetzt"); render(); } }, "Alles aufgefüllt")));
}};

/* ---------- Notizblock ---------- */
TOOLS.notes = { title: "Notizblock", render(v) {
  const cv = h("canvas", { class: "sig", style: "height:clamp(150px,40vh,420px)", "data-a": "notepad" }); const pd = sigPad(cv);
  v.txt = v.txt || "";
  return h("div", null, card("Freihand-Notiz (wird nicht ins Protokoll übernommen)", cv, h("div", { class: "fld", style: "margin-top:8px" }, h("label", null, "Textnotiz"), (() => { const t = h("textarea", { oninput: (e) => (v.txt = e.target.value) }); t.value = v.txt; return t; })()),
      h("div", { class: "formbar" }, h("button", { class: "tbtn", onclick: () => pd.clear() }, "Löschen"), h("button", { class: "tbtn ok", "data-a": "note-save", onclick: () => { if (!pd.dirty() && !v.txt.trim()) { toast("Notiz ist leer"); return; } S.notes.unshift({ id: uid(), t: Date.now(), img: pd.dirty() ? pd.data() : null, txt: v.txt }); S.notes = S.notes.slice(0, 20); v.txt = ""; render(); toast("Notiz gespeichert"); } }, "Speichern"))),
    S.notes.length ? card("Gespeicherte Notizen", h("div", { class: "photos" }, S.notes.map((n) => h("figure", { style: "background:#fff;padding:4px;border-radius:4px;margin:0" }, n.img ? h("img", { src: n.img, alt: "Notiz", style: "max-height:110px" }) : null, h("figcaption", { class: "small" }, fmtD(n.t) + " " + fmtHM(n.t) + (n.txt ? " – " + n.txt.slice(0, 60) : "")), h("button", { class: "mini", onclick: () => { S.notes = S.notes.filter((x) => x !== n); render(); } }, "🗑"))))) : null);
}};

/* ---------- Fahrzeugcheck ---------- */
TOOLS.vcheck = { title: "Fahrzeugcheck", render(v) {
  v.d = v.d || {}; v.km = v.km || "";
  const all = Object.values(D.VCHECK).flat(); const ok = all.filter((x) => v.d[x] === "ok").length, nok = all.filter((x) => v.d[x] === "mangel").length;
  return h("div", null, card("Schichtbeginn – " + S.crew.fahrzeug, h("div", { class: "row" }, h("span", { class: "chip g" }, ok + " in Ordnung"), h("span", { class: "chip r" }, nok + " Mangel"), h("span", { class: "chip" }, (all.length - ok - nok) + " offen")),
      fieldEl({ k: "km", label: "km-Stand" }, () => v.km, (x) => (v.km = x))),
    h("div", { class: "cols" }, Object.entries(D.VCHECK).map(([sch, items]) => card(sch, items.map((it) => h("div", { class: "fld", style: "margin-bottom:6px" }, h("label", null, it), h("div", { class: "seg" }, [["ok", "✔ ok"], ["mangel", "✖ Mangel"]].map(([k, l]) => h("button", { type: "button", class: v.d[it] === k ? "on" : "", "data-vc": k, onclick: () => { v.d[it] = v.d[it] === k ? "" : k; render(); } }, l)))))))),
    h("div", { class: "formbar" }, h("button", { class: "tbtn", "data-a": "vc-allok", onclick: () => { all.forEach((x) => { if (!v.d[x]) v.d[x] = "ok"; }); render(); } }, "Rest als „ok“"), h("button", { class: "tbtn ok", "data-a": "vc-save", onclick: () => { if (ok + nok < all.length) { toast("Noch " + (all.length - ok - nok) + " Prüfpunkte offen"); return; } S.vchecks.unshift({ id: uid(), t: Date.now(), km: v.km, maengel: all.filter((x) => v.d[x] === "mangel"), crew: [S.crew.beifahrer, S.crew.fahrer].filter(Boolean).join(", ") }); S.sendQueue.push({ id: uid(), kind: "Fahrzeugcheck", label: S.crew.fahrzeug, t: Date.now() }); V[V.length - 1] = { t: "tool", tool: "vcheck" }; toast("Fahrzeugcheck gespeichert" + (nok ? " – " + nok + " Mängel gemeldet" : "")); render(); } }, "Check abschließen")),
    S.vchecks.length ? card("Letzte Checks", h("table", { class: "list" }, h("tbody", null, S.vchecks.slice(0, 5).map((c) => h("tr", null, h("td", null, fmtD(c.t) + " " + fmtHM(c.t)), h("td", null, c.crew || "–"), h("td", null, c.km ? c.km + " km" : ""), h("td", null, c.maengel.length ? "Mängel: " + c.maengel.join(", ") : "ohne Mängel")))))) : null);
}};

/* ---------- Übersetzer ---------- */
const LANG_CODE = { Englisch: "en-GB", Türkisch: "tr-TR", Arabisch: "ar-SA", Russisch: "ru-RU", Polnisch: "pl-PL", Ukrainisch: "uk-UA", Französisch: "fr-FR", Spanisch: "es-ES", Italienisch: "it-IT", Rumänisch: "ro-RO" };
TOOLS.translate = { title: "Übersetzer", render(v) {
  const L = D.TRANSLATE.langs; v.l = v.l || Object.keys(L)[0];
  const speak = (txt) => { try { const u = new SpeechSynthesisUtterance(txt); u.lang = LANG_CODE[v.l] || "en-GB"; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { toast("Sprachausgabe nicht verfügbar"); } };
  return h("div", null, card("Sprache", h("div", { class: "seg" }, Object.keys(L).map((l) => h("button", { type: "button", class: v.l === l ? "on" : "", onclick: () => { v.l = l; render(); } }, l)))),
    card("Sätze (zum Vorlesen antippen)", h("table", { class: "list" }, h("tbody", null, D.TRANSLATE.phrases.map((ph, i) => h("tr", null, h("td", null, ph), h("td", { dir: "auto", style: "font-weight:700" }, L[v.l][i] || "–"), h("td", { style: "text-align:right" }, h("button", { class: "mini", "data-a": "speak", "aria-label": "vorlesen", onclick: () => speak(L[v.l][i] || "") }, "🔊"))))))));
}};

/* ---------- Adressen / Geräte / Dokumente / Medikamente ---------- */
TOOLS.addresses = { title: "Adressen", render() {
  return h("div", { class: "cols" }, D.CLINICS.map((c) => card(c.name, kv([["Adresse", c.adr], ["Telefon", c.tel], ["Fachbereiche", c.fach.join(", ")]]), h("div", { class: "formbar" }, h("a", { class: "tbtn", href: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.adr), target: "_blank", rel: "noopener" }, "🗺 Karte"), h("button", { class: "tbtn", onclick: () => { if (!canEdit()) return; const t = P().forms.transport = P().forms.transport || {}; t.ziel = c.name; toast("Als Transportziel übernommen"); render(); } }, "als Transportziel")))));
}};
TOOLS.devices = { title: "Geräte", render(v) {
  S.devices = S.devices || D.DEVICES.slice();
  v.scan = v.scan || 0;
  return h("div", null, card("Gekoppelte Geräte (simuliert)", h("table", { class: "list" }, h("tbody", null, S.devices.map((d) => h("tr", { class: d === S.settings.device ? "selrow" : "" }, h("td", null, d), h("td", null, /Drucker/.test(d) ? "Drucker" : /Pad/.test(d) ? "Pad-zu-Pad" : "Medizintechnik"), h("td", { style: "text-align:right" }, /Drucker|Pad/.test(d) ? null : h("button", { class: "mini", onclick: () => { S.settings.device = d; render(); toast(d + " ausgewählt"); } }, "auswählen")))))),
      h("div", { class: "formbar" }, h("button", { class: "tbtn primary", "data-a": "dev-scan", onclick: () => { v.scan = 1; render(); setTimeout(() => { if (top() !== v) return; v.scan = 2; render(); }, 1500); } }, v.scan === 1 ? "suche …" : "Gerät suchen (Bluetooth, sim.)"))),
    v.scan === 2 ? card("Gefundene Geräte", SCAN_DEV.filter((d) => !S.devices.includes(d)).map((d) => h("div", { class: "row", style: "margin:4px 0" }, h("span", null, d), h("button", { class: "mini", onclick: () => { S.devices.push(d); render(); toast(d + " gekoppelt"); } }, "koppeln")))) : null);
}};
TOOLS.docs = { title: "Dokumente", render(v) {
  if (v.i != null) { const d = D.DOCS[v.i]; return card(d.t, h("div", { style: "white-space:pre-wrap;line-height:1.5" }, d.c)); }
  return h("div", { class: "tiles" }, D.DOCS.map((d, i) => h("button", { class: "tile", "data-doc": i, onclick: () => go({ t: "tool", tool: "docs", i }) }, d.t)));
}};
TOOLS.drugs = { title: "Medikamenten-Info", render(v) {
  v.q = v.q || "";
  const list = D.DRUGS.filter((d) => (d.n + " " + d.g).toLowerCase().includes(v.q.toLowerCase()));
  return h("div", null, card("Suche", h("div", { class: "fld" }, h("input", { "data-a": "drugsearch", placeholder: "Wirkstoff oder Gruppe …", value: v.q, oninput: (e) => { v.q = e.target.value; const pos = e.target.selectionStart; render(); const i = document.querySelector("[data-a=drugsearch]"); if (i) { i.focus(); i.setSelectionRange(pos, pos); } } })),
      h("p", { class: "small" }, "Nur Wirkstoffname, Gruppe, Applikationsform. Bewusst KEINE Dosierungsangaben – maßgeblich sind Fachinformation und lokale SOPs.")),
    h("table", { class: "list" }, h("thead", null, h("tr", null, ["Wirkstoff", "Gruppe", "Applikation"].map((x) => h("th", null, x)))), h("tbody", null, list.map((d) => h("tr", null, h("td", null, h("b", null, d.n)), h("td", null, d.g), h("td", null, d.f))))));
}};

/* ---------- Schicht / Stempel / Einstellungen ---------- */
TOOLS.shift = { title: "Tageseinstellungen / Schichtwechsel", render() {
  const c = S.crew;
  return h("div", null, card("Aktuelle Besatzung", kv([["Fahrzeug / Funkrufname", c.fahrzeug], ["Wache", c.wache], ["Beifahrer/in (TF)", c.beifahrer], ["Fahrer/in", c.fahrer], ["Praktikant/in", c.praktikant], ["Notarzt", c.notarzt], ["Schichtbeginn", c.schicht], ["Angemeldet", uName(curUser())]])),
    h("div", { class: "formbar" }, h("button", { class: "tbtn ok", "data-a": "shift-edit", onclick: () => showCrew() }, "Tageseinstellungen ändern"),
      h("button", { class: "tbtn danger", "data-a": "shift-change", onclick: () => confirmBox("Schichtwechsel", "Schichtwechsel: aktuelle Besatzung abmelden, offene Einsätze neu ab A benennen und neue Besatzung anmelden?", "Schichtwechsel", () => {
        S.missions.forEach((m) => { if (!m.patients.every((p) => p.closed)) m.patients.forEach((p, i) => { if (!p.closed) p.letter = String.fromCharCode(65 + i); }); });
        Object.assign(S.crew, { fahrer: "", beifahrer: "", praktikant: "", notarzt: "", ids: {} }); logSys("Schichtwechsel"); setTimeout(() => logout(true), 0); }) }, "Schichtwechsel")));
}};
TOOLS.account = { title: "Mein Konto", render() {
  const me = curUser(); if (!me) return card("Mein Konto", h("p", null, "Nicht angemeldet."));
  const changePw = () => {
    const err = authErr(), o = h("input", { type: "password", "data-f": "pw-o", autocomplete: "current-password", maxlength: "72" }), n1 = pwIn("pw-n"), n2 = pwIn("pw-n2");
    modal("Passwort ändern", h("div", null, h("div", { class: "form" }, fldI("Bisheriges Passwort", o), fldI("Neues Passwort (mind. 10 Zeichen)", n1), fldI("Wiederholen", n2)), err), [{ t: "Abbr." }, { t: "Speichern", cls: "ok", a: "pw-save", fn: (close) => {
      const prob = pwProblem(n1.value, me.pnr); if (prob) { showErr(err, prob); return false; }
      if (n1.value !== n2.value) { showErr(err, "Wiederholung stimmt nicht überein."); return false; }
      fnCall("account", { action: "change_password", current_password: o.value, new_password: n1.value }).then(() => { close(); logSys("Passwort geändert: " + uName(me)); toast("Passwort geändert"); }).catch((e) => showErr(err, e.message));
      return false; } }]);
  };
  const n = pendingCount();
  return h("div", null, card("Angemeldet", kv([["Name", [me.vorname, me.name].filter(Boolean).join(" ")], ["Personalnummer", me.pnr], ["Rolle", ROLE_L[me.role]], ["Qualifikation", (QUALS.find((q) => q[0] === me.qual) || [, me.qual])[1]], ["Wache", me.wache], ["Automatische Sperre", "nach " + (S.settings.lockMin || 10) + " min Inaktivität"], ["Schnell-PIN", getPin() ? "gesetzt (nur diese Sitzung)" : "nicht gesetzt"]]),
      h("div", { class: "formbar" }, h("button", { class: "tbtn", "data-a": "pw-change", onclick: changePw }, "Passwort ändern"), h("button", { class: "tbtn", "data-a": "pin-set", onclick: setSessionPin }, "Schnell-PIN …"),
        h("button", { class: "tbtn", "data-a": "lock-now", onclick: () => showLock("Manuell gesperrt.") }, "🔒 Jetzt sperren"), h("button", { class: "tbtn danger", "data-a": "users-logout", onclick: () => logout() }, "Abmelden"))),
    card("Sperrzeit", h("div", { class: "seg" }, [2, 5, 10, 15].map((m) => h("button", { type: "button", class: (S.settings.lockMin || 10) === m ? "on" : "", "data-lock": m, onclick: () => { S.settings.lockMin = m; render(); } }, m + " min")))),
    card("Cloud-Synchronisation", kv([["Status", navigator.onLine === false ? "offline – Änderungen werden lokal zwischengespeichert" : SYNC.busy ? "synchronisiert …" : SYNC.err ? "Fehler: " + SYNC.err : "verbunden"], ["Ausstehend", n + " Einsatz/Einsätze"], ["Letzter Abgleich", SYNC.last ? fmtT(SYNC.last) : "–"], ["Besatzung (Cloud)", S.cloud && S.cloud.crewId ? S.cloud.crewId.slice(0, 8) + (S.cloud.pending ? " (wird angelegt)" : "") : "–"]]),
      h("div", { class: "formbar" }, h("button", { class: "tbtn", "data-a": "sync-now", onclick: () => { syncNow(); toast("Synchronisation gestartet"); } }, "Jetzt synchronisieren"))));
}};

/* Administration: nur für Admin/Superadmin. Alle Änderungen laufen serverseitig (Edge Functions / RLS). */
const ADM_TABS = [["users", "Benutzerverwaltung"], ["admins", "Admin-Verwaltung", true], ["vehicles", "Fahrzeuge"], ["audit", "Audit-Log"]];
function admLoad(v, force) {
  if (!force && (v.loading === v.tab || v.data)) return;
  const tab = v.tab, req = (v.req || 0) + 1; v.req = req; v.loading = tab; v.err = "";
  const cur = () => v.req === req && v.tab === tab;
  const done = () => { v.loading = false; const t = top(); if (t === v) render(); };
  const q = v.tab === "vehicles" ? sb.from("vehicles").select("id,funkruf,kennzeichen,typ,wache,aktiv").order("funkruf")
    : v.tab === "audit" ? sb.from("audit_log").select("id,at,actor,actor_role,action,target,details").order("id", { ascending: false }).limit(300)
    : sb.from("profiles").select("id,role,pnr,name,vorname,qualifikation,wache,aktiv,must_change_password,created_at").order("name");
  q.then((r) => { if (!cur()) return; if (r.error) v.err = r.error.message; else v.data = r.data; done(); }, (e) => { if (!cur()) return; v.err = String(e.message || e); done(); });
  if (v.tab === "audit" && !v.names) sb.from("profiles").select("id,pnr,name").then((r) => { v.names = {}; (r.data || []).forEach((p) => (v.names[p.id] = p.pnr + " (" + p.name + ")")); });
}
async function admDo(v, body, okMsg) {
  try { await fnCall("admin-users", body); toast(okMsg); v.data = null; admLoad(v, true); }
  catch (e) { modal("Aktion abgelehnt", h("p", { "data-a": "adm-error" }, e.message)); }
}
function userForm(v, role, u) {
  const err = authErr(), edit = !!u;
  const f = { pnr: u ? u.pnr : "", name: u ? u.name : "", vorname: u ? u.vorname || "" : "", qualifikation: u ? u.qualifikation || "NotSan" : role === "admin" ? "Leitung" : "NotSan", wache: u ? u.wache || "" : "", password: "", password2: "" };
  const inp = (k, type, extra) => h("input", Object.assign({ type: type || "text", "data-f": "adm-" + k, value: f[k], maxlength: type === "password" ? "72" : "80", autocomplete: type === "password" ? "new-password" : "off", oninput: (e) => (f[k] = e.target.value) }, extra || {}));
  const qsel = h("select", { "data-f": "adm-qual", onchange: (e) => (f.qualifikation = e.target.value) }, QUALS.map(([k, l]) => h("option", { value: k, selected: f.qualifikation === k ? true : null }, l + " (" + k + ")")));
  modal(edit ? "Profil bearbeiten – " + u.pnr : role === "admin" ? "Admin anlegen" : "Benutzer anlegen", h("div", null,
    h("div", { class: "form" }, edit ? null : fldI("Personalnummer *", inp("pnr", "text", { autocapitalize: "off" })), fldI("Nachname *", inp("name")), fldI("Vorname", inp("vorname")), fldI("Qualifikation", qsel), fldI("Wache", inp("wache")),
      edit ? null : fldI("Startpasswort * (mind. 10, Buchst.+Ziffern)", inp("password", "password")), edit ? null : fldI("Startpasswort wiederholen *", inp("password2", "password"))),
    edit ? null : h("p", { class: "small" }, "Das Startpasswort bitte persönlich übergeben. Beim ersten Anmelden muss es geändert werden."), err), [
    { t: "Abbr." },
    { t: edit ? "Speichern" : "Anlegen", cls: "ok", a: "adm-save", fn: (close) => {
      if (!f.name.trim()) { showErr(err, "Nachname fehlt."); return false; }
      if (!edit) {
        if (!/^[A-Za-z0-9-]{3,12}$/.test(f.pnr.trim())) { showErr(err, "Personalnummer: 3–12 Zeichen (Ziffern, Buchstaben, Bindestrich)."); return false; }
        const prob = pwProblem(f.password, f.pnr.trim()); if (prob) { showErr(err, prob); return false; }
        if (f.password !== f.password2) { showErr(err, "Passwort-Wiederholung stimmt nicht."); return false; }
      }
      const body = edit ? { action: "update", id: u.id, name: f.name.trim(), vorname: f.vorname.trim(), qualifikation: f.qualifikation, wache: f.wache.trim() }
        : { action: "create", role, pnr: f.pnr.trim(), name: f.name.trim(), vorname: f.vorname.trim(), qualifikation: f.qualifikation, wache: f.wache.trim(), password: f.password };
      fnCall("admin-users", body).then(() => { f.password = f.password2 = ""; close(); toast(edit ? "Profil gespeichert" : (role === "admin" ? "Admin" : "Benutzer") + " " + body.pnr + " angelegt"); v.data = null; admLoad(v, true); }).catch((e) => showErr(err, e.message));
      return false; } }], { sticky: true });
}
function resetPwForm(v, u) {
  const err = authErr(), a = pwIn("adm-rpw"), b = pwIn("adm-rpw2");
  modal("Passwort zurücksetzen – " + u.pnr, h("div", null, h("p", { class: "small" }, "Neues Startpasswort für " + [u.vorname, u.name].filter(Boolean).join(" ") + ". Alle Sitzungen werden beendet, beim nächsten Anmelden ist ein Wechsel Pflicht."), h("div", { class: "form" }, fldI("Neues Startpasswort", a), fldI("Wiederholen", b)), err), [
    { t: "Abbr." }, { t: "Zurücksetzen", cls: "danger", a: "adm-rpw-save", fn: (close) => {
      const prob = pwProblem(a.value, u.pnr); if (prob) { showErr(err, prob); return false; }
      if (a.value !== b.value) { showErr(err, "Wiederholung stimmt nicht."); return false; }
      fnCall("admin-users", { action: "reset_password", id: u.id, password: a.value }).then(() => { close(); toast("Passwort zurückgesetzt"); v.data = null; admLoad(v, true); }).catch((e) => showErr(err, e.message));
      return false; } }], { sticky: true });
}
function vehicleForm(v, x) {
  const err = authErr(), f = { funkruf: x ? x.funkruf : "", kennzeichen: x ? x.kennzeichen || "" : "", typ: x ? x.typ : "RTW", wache: x ? x.wache || "" : "" };
  const inp = (k) => h("input", { "data-f": "veh-" + k, value: f[k], maxlength: "40", oninput: (e) => (f[k] = e.target.value) });
  const tsel = h("select", { "data-f": "veh-typ", onchange: (e) => (f.typ = e.target.value) }, ["RTW", "NEF", "KTW", "ITW", "NAW", "MZF", "Sonstiges"].map((t) => h("option", { value: t, selected: f.typ === t ? true : null }, t)));
  modal(x ? "Fahrzeug bearbeiten" : "Fahrzeug anlegen", h("div", null, h("div", { class: "form" }, fldI("Funkrufname *", inp("funkruf")), fldI("Kennzeichen (fiktiv)", inp("kennzeichen")), fldI("Typ", tsel), fldI("Wache", inp("wache"))), err), [
    { t: "Abbr." }, { t: "Speichern", cls: "ok", a: "veh-save", fn: (close) => {
      if (!f.funkruf.trim()) { showErr(err, "Funkrufname fehlt."); return false; }
      const row = { funkruf: f.funkruf.trim(), kennzeichen: f.kennzeichen.trim() || null, typ: f.typ, wache: f.wache.trim() || null };
      (x ? sb.from("vehicles").update(row).eq("id", x.id) : sb.from("vehicles").insert(row)).then((r) => { if (r.error) return showErr(err, r.error.code === "23505" ? "Funkrufname existiert bereits." : r.error.message); close(); toast("Fahrzeug gespeichert"); v.data = null; admLoad(v, true); loadDirectory(); });
      return false; } }], { sticky: true });
}
TOOLS.admin = { title: "Administration", render(v) {
  if (!isAdm()) return card("Administration", h("p", null, "Nur für Admins und den Superadmin."));
  const tabs = ADM_TABS.filter((t) => !t[2] || isSuper());
  if (!v.tab || !tabs.some((t) => t[0] === v.tab)) v.tab = "users";
  admLoad(v);
  const bar = h("div", { class: "seg", style: "margin-bottom:8px;flex-wrap:wrap" }, tabs.map(([k, l]) => h("button", { type: "button", class: v.tab === k ? "on" : "", "data-a": "adm-tab-" + k, onclick: () => { v.tab = k; v.data = null; render(); } }, l)));
  const status = v.err ? h("p", { class: "autherr" }, "Fehler: " + v.err) : v.loading && !v.data ? h("p", { class: "small" }, "lädt …") : null;
  const D_ = v.data || [];
  const reload = h("button", { class: "tbtn", "data-a": "adm-reload", onclick: () => { v.data = null; admLoad(v, true); render(); } }, "↻ Aktualisieren");
  let body;
  if (v.tab === "users" || v.tab === "admins") {
    const role = v.tab === "users" ? "user" : "admin";
    const list = D_.filter((u) => (role === "user" ? u.role === "user" : u.role !== "user"));
    const mine = (u) => u.id === ME.id || u.role === "superadmin" || (u.role === "admin" && !isSuper());
    body = card((role === "user" ? "Benutzer" : "Admins") + " (" + list.length + ")",
      h("div", { class: "formbar", style: "margin:0 0 8px" }, h("button", { class: "tbtn ok", "data-a": role === "user" ? "adm-user-new" : "adm-admin-new", onclick: () => userForm(v, role) }, role === "user" ? "+ Benutzer anlegen" : "+ Admin anlegen"), reload),
      h("table", { class: "list ulist" }, h("thead", null, h("tr", null, ["Name", "Pers.-Nr.", "Rolle", "Qualifikation", "Wache", "Status", ""].map((x) => h("th", null, x)))),
        h("tbody", null, list.map((u) => h("tr", { "data-row": u.pnr, class: u.id === ME.id ? "selrow" : "" }, h("td", null, [u.vorname, u.name].filter(Boolean).join(" ")), h("td", null, u.pnr), h("td", null, ROLE_L[u.role]), h("td", null, u.qualifikation || "–"), h("td", null, u.wache || "–"),
          h("td", null, (u.aktiv ? "aktiv" : "🔒 gesperrt") + (u.must_change_password ? " · PW-Wechsel offen" : "")),
          h("td", { style: "text-align:right;white-space:nowrap" }, mine(u) ? h("span", { class: "small" }, u.id === ME.id ? "(Sie)" : "geschützt") : [
            h("button", { class: "mini", "data-a": "adm-edit-" + u.pnr, onclick: () => userForm(v, role, u) }, "✎"), " ",
            h("button", { class: "mini", "data-a": "adm-lock-" + u.pnr, onclick: () => confirmBox(u.aktiv ? "Sperren" : "Entsperren", (u.aktiv ? "Konto " + u.pnr + " sperren? Alle Sitzungen werden sofort beendet." : "Konto " + u.pnr + " wieder freigeben?"), u.aktiv ? "sperren" : "entsperren", () => admDo(v, { action: "set_active", id: u.id, aktiv: !u.aktiv }, u.aktiv ? "Gesperrt" : "Entsperrt"), u.aktiv ? "danger" : "primary") }, u.aktiv ? "sperren" : "entsperren"), " ",
            h("button", { class: "mini", "data-a": "adm-rpw-" + u.pnr, onclick: () => resetPwForm(v, u) }, "Passwort"), " ",
            h("button", { class: "mini", "data-a": "adm-del-" + u.pnr, onclick: () => confirmBox("Konto löschen", "Konto " + u.pnr + " (" + u.name + ") endgültig löschen? Einsätze bleiben erhalten.", "löschen", () => admDo(v, { action: "delete", id: u.id }, "Konto gelöscht"), "danger") }, "🗑")]))))));
  } else if (v.tab === "vehicles") {
    body = card("Fahrzeuge (" + D_.length + ")", h("div", { class: "formbar", style: "margin:0 0 8px" }, h("button", { class: "tbtn ok", "data-a": "veh-new", onclick: () => vehicleForm(v) }, "+ Fahrzeug anlegen"), reload),
      h("table", { class: "list" }, h("thead", null, h("tr", null, ["Funkrufname", "Kennzeichen", "Typ", "Wache", "Status", ""].map((x) => h("th", null, x)))),
        h("tbody", null, D_.map((x) => h("tr", { "data-row": x.funkruf }, h("td", null, x.funkruf), h("td", null, x.kennzeichen || "–"), h("td", null, x.typ), h("td", null, x.wache || "–"), h("td", null, x.aktiv ? "aktiv" : "außer Dienst"),
          h("td", { style: "text-align:right;white-space:nowrap" }, h("button", { class: "mini", onclick: () => vehicleForm(v, x) }, "✎"), " ",
            h("button", { class: "mini", "data-a": "veh-toggle", onclick: () => sb.from("vehicles").update({ aktiv: !x.aktiv }).eq("id", x.id).then((r) => { if (r.error) toast(r.error.message); v.data = null; admLoad(v, true); loadDirectory(); }) }, x.aktiv ? "außer Dienst" : "aktivieren"), " ",
            h("button", { class: "mini", "data-a": "veh-del", onclick: () => confirmBox("Fahrzeug löschen", x.funkruf + " löschen?", "löschen", () => sb.from("vehicles").delete().eq("id", x.id).then((r) => { if (r.error) toast(r.error.message); v.data = null; admLoad(v, true); loadDirectory(); }), "danger") }, "🗑")))))));
  } else {
    const nm = (id) => (id ? (v.names && v.names[id]) || id.slice(0, 8) : "System");
    body = card("Audit-Log (neueste 300, unveränderlich)", h("div", { class: "formbar", style: "margin:0 0 8px" }, reload),
      h("table", { class: "list", "data-a": "audit-table" }, h("thead", null, h("tr", null, ["Zeit", "Akteur", "Rolle", "Aktion", "Ziel", "Details"].map((x) => h("th", null, x)))),
        h("tbody", null, D_.map((a) => h("tr", null, h("td", { style: "white-space:nowrap" }, fmtD(Date.parse(a.at)) + " " + fmtT(Date.parse(a.at))), h("td", null, nm(a.actor)), h("td", null, a.actor_role || "–"), h("td", null, a.action), h("td", null, a.target ? nm(a.target) : "–"), h("td", { class: "small", style: "word-break:break-all" }, a.details ? JSON.stringify(a.details).slice(0, 160) : ""))))));
  }
  return h("div", { "data-a": "admin-view" }, v.noBar ? null : bar, status, body);
}};
/* ================= Admin-Bereich „RettPad Trainer“ (Vollbild-Oberfläche für Admin/Superadmin) =================
   Nur Komfort-Trennung der Oberfläche: Rollenprüfung erfolgt serverseitig (RLS + Edge Functions). */
let ADMIN_UI = false;
const ADM_NAV = [["dash", "Dashboard", "▦"], ["users", "Benutzer", "👤"], ["admins", "Admins", "🛡", true], ["vehicles", "Fahrzeuge", "🚑"], ["missions", "Einsätze", "📋"], ["audit", "Audit-Log", "🧾"], ["account", "Mein Konto", "⚙"]];
const SHIELD_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8 21 5v6.2c0 5.6-3.8 9.6-9 11.2-5.2-1.6-9-5.6-9-11.2V5z" fill="#ffb347" stroke="#08262c" stroke-width="1.6"/><path d="m7.6 12 3 3 5.8-6" fill="none" stroke="#08262c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const admLogo = (cls) => h("span", { class: "logo adm-logo " + (cls || "") }, h("img", { src: "icons/icon.svg", alt: "" }), h("i", { class: "adm-shield", html: SHIELD_SVG }));
function admGo(tab) { go({ t: "adm", tab }, true); }
function enterAdmin(tab) { ADMIN_UI = true; locked = false; V = [{ t: "adm", tab: tab || "dash" }]; lastViewKey = null; lastView = null; render(); }
function leaveAdmin() { ADMIN_UI = false; V = [{ t: "home" }]; lastViewKey = null; render(); toast("Einsatz-Oberfläche – zurück über Menü › Administration"); }
/* einfacher Lader pro Ansicht: v.st = null|load|ok|err */
function admGet(v, fn) {
  if (v.st) return; v.st = "load"; v.err = "";
  Promise.resolve().then(fn).then((r) => { v.res = r; v.st = "ok"; }, (e) => { v.err = String((e && e.message) || e); v.st = "err"; })
    .then(() => { if (top() === v && ADMIN_UI) render(); });
}
const admReload = (v) => h("button", { class: "tbtn", "data-a": "adm-reload", onclick: () => { v.st = null; v.data = null; render(); } }, "↻ Aktualisieren");
const cnt = (q) => q.then((r) => (r.error ? null : r.count));
function admDash(v) {
  admGet(v, async () => {
    const [prof, veh, mis, open, aud] = await Promise.all([
      sb.from("profiles").select("role,aktiv"), cnt(sb.from("vehicles").select("id", { count: "exact", head: true })),
      cnt(sb.from("missions").select("id", { count: "exact", head: true })), cnt(sb.from("missions").select("id", { count: "exact", head: true }).eq("abgeschlossen", false)),
      sb.from("audit_log").select("id,at,actor,action,target").order("id", { ascending: false }).limit(8)]);
    if (prof.error) throw prof.error;
    const P_ = prof.data || [];
    return { users: P_.filter((x) => x.role === "user").length, admins: P_.filter((x) => x.role !== "user").length, locked: P_.filter((x) => !x.aktiv).length, veh, mis, open, aud: aud.data || [] };
  });
  if (v.st === "err") return card("Dashboard", h("p", { class: "autherr" }, "Fehler: " + v.err), admReload(v));
  const r = v.res || {}, n = (x) => (v.st === "ok" ? (x == null ? "–" : String(x)) : "…");
  const kpi = (k, label, val, sub) => h("button", { class: "adm-kpi", "data-kpi": k, onclick: () => admGo(k) }, h("b", null, val), h("span", null, label), sub ? h("small", null, sub) : null);
  return h("div", { "data-a": "adm-dash" },
    h("div", { class: "adm-kpis" },
      kpi("users", "Benutzer", n(r.users), r.locked ? r.locked + " gesperrt" : null),
      isSuper() ? kpi("admins", "Admins", n(r.admins)) : null,
      kpi("vehicles", "Fahrzeuge", n(r.veh)),
      kpi("missions", "Einsätze", n(r.mis), r.open != null ? r.open + " offen" : null),
      kpi("audit", "Audit-Log", "🧾", "unveränderlich")),
    h("div", { class: "adm-cols" },
      card("Letzte Aktionen", v.st !== "ok" ? h("p", { class: "small" }, "lädt …") : r.aud.length ? h("table", { class: "list" }, h("tbody", null, r.aud.map((a) => h("tr", null, h("td", { style: "white-space:nowrap" }, fmtD(Date.parse(a.at)) + " " + fmtT(Date.parse(a.at))), h("td", null, a.action))))) : h("p", { class: "small" }, "Noch keine Einträge."),
        h("div", { class: "formbar" }, h("button", { class: "tbtn", onclick: () => admGo("audit") }, "Audit-Log öffnen"), admReload(v))),
      card("Sicherheit", kv([["Angemeldet", uName(ME) + " · " + ROLE_L[ME.role]], ["Automatische Sperre", "nach " + (S.settings.lockMin || 10) + " min"], ["Rechteprüfung", "serverseitig (Datenbank-Richtlinien + Edge Functions)"]]),
        h("div", { class: "formbar" }, h("button", { class: "tbtn", "data-a": "adm-to-einsatz", onclick: leaveAdmin }, "↗ Zur Einsatz-Oberfläche"), h("button", { class: "tbtn", onclick: () => showLock("Manuell gesperrt.") }, "🔒 Sperren")))));
}
function admMissions(v) {
  admGet(v, async () => {
    const [m, c] = await Promise.all([sb.from("missions").select("id,einsatznr,abgeschlossen,updated_at,created_at,crew_id,data").order("updated_at", { ascending: false }).limit(200), sb.from("crews").select("id,fahrzeug")]);
    if (m.error) throw m.error;
    const cr = {}; (c.data || []).forEach((x) => (cr[x.id] = x.fahrzeug));
    return (m.data || []).map((x) => Object.assign(x, { fahrzeug: cr[x.crew_id] || "–" }));
  });
  v.q = v.q || "";
  const all = v.res || [], q = v.q.toLowerCase();
  const list = all.filter((x) => !q || ((x.einsatznr || "") + " " + x.fahrzeug + " " + ((x.data && x.data.alarm && x.data.alarm.stichwort) || "")).toLowerCase().includes(q));
  const show = (x) => {
    const d = x.data || {}, pats = d.patients || [];
    modal("Einsatz " + (x.einsatznr || "(ohne Nummer)"), h("div", null,
      kv([["Fahrzeug", x.fahrzeug], ["Status", x.abgeschlossen ? "abgeschlossen" : "offen"], ["Angelegt", fmtD(Date.parse(x.created_at)) + " " + fmtT(Date.parse(x.created_at))], ["Zuletzt geändert", fmtD(Date.parse(x.updated_at)) + " " + fmtT(Date.parse(x.updated_at))], ["Patienten", String(pats.length)]]),
      pats.length ? h("table", { class: "list", style: "margin-top:8px" }, h("thead", null, h("tr", null, ["Pat.", "Name (fiktiv)", "Einträge", "Status"].map((t) => h("th", null, t)))),
        h("tbody", null, pats.map((p) => h("tr", null, h("td", null, p.letter || "?"), h("td", null, (p.forms && p.forms.pers && [p.forms.pers.vorname, p.forms.pers.name].filter(Boolean).join(" ")) || "–"), h("td", null, String((p.entries || []).length)), h("td", null, p.closed ? "abgeschlossen" : "offen"))))) : null,
      h("p", { class: "small" }, "Nur lesen – Änderungen erfolgen durch die Besatzung in der Einsatz-Oberfläche.")), null, { wide: true });
  };
  return h("div", { "data-a": "adm-missions" },
    card("Alle Einsätze (" + (v.st === "ok" ? list.length + (q ? " von " + all.length : "") : "…") + ")",
      h("div", { class: "formbar", style: "margin:0 0 8px" }, h("input", { "data-a": "adm-msearch", placeholder: "Suchen (Nr., Fahrzeug, Stichwort) …", value: v.q, style: "flex:1;min-width:160px", oninput: (e) => { v.q = e.target.value; render(); } }), admReload(v)),
      v.st === "err" ? h("p", { class: "autherr" }, "Fehler: " + v.err) : v.st !== "ok" ? h("p", { class: "small" }, "lädt …") : !list.length ? h("p", { class: "small" }, "Keine Einsätze gefunden.") :
        h("table", { class: "list ulist" }, h("thead", null, h("tr", null, ["Einsatz-Nr.", "Fahrzeug", "Patienten", "Status", "Geändert", ""].map((t) => h("th", null, t)))),
          h("tbody", null, list.map((x) => h("tr", { "data-row": x.einsatznr || x.id.slice(0, 8), class: "clk", title: "Einsatz ansehen", onclick: (e) => { if (!e.target.closest("button")) show(x); } }, h("td", null, x.einsatznr || "–"), h("td", null, x.fahrzeug), h("td", null, String(((x.data && x.data.patients) || []).length)), h("td", null, x.abgeschlossen ? "abgeschlossen" : "offen"), h("td", { style: "white-space:nowrap" }, fmtD(Date.parse(x.updated_at)) + " " + fmtT(Date.parse(x.updated_at))),
            h("td", { style: "text-align:right" }, h("button", { class: "mini", "data-a": "adm-mshow", onclick: () => show(x) }, "ansehen"))))))));
}
function admBody(v) {
  if (!isAdm()) return card("Administration", h("p", null, "Nur für Admins und den Superadmin."), h("div", { class: "formbar" }, h("button", { class: "tbtn", onclick: leaveAdmin }, "Zur Einsatz-Oberfläche")));
  if (v.tab === "dash") return admDash(v);
  if (v.tab === "missions") return admMissions(v);
  if (v.tab === "account") return TOOLS.account.render(v);
  v.noBar = true; return TOOLS.admin.render(v);
}
function renderAdmin() {
  const t = top(), tabs = ADM_NAV.filter((x) => !x[3] || isSuper());
  if (!tabs.some((x) => x[0] === t.tab)) t.tab = "dash";
  const nav = h("nav", { class: "adm-nav", "aria-label": "Admin-Navigation" },
    h("div", { class: "adm-brand" }, admLogo(), h("div", null, h("b", null, "RettPad Trainer"), h("span", null, "Administration"))),
    tabs.map(([k, l, ic]) => h("button", { class: "adm-nb" + (t.tab === k ? " on" : ""), "data-adm": k, "aria-current": t.tab === k ? "page" : null, title: l, onclick: () => admGo(k) }, h("span", { class: "ic", "aria-hidden": "true" }, ic), h("span", { class: "lb" }, l))),
    h("div", { class: "adm-sp" }),
    h("button", { class: "adm-nb", "data-adm": "einsatz", title: "Zur Einsatz-Oberfläche", onclick: leaveAdmin }, h("span", { class: "ic", "aria-hidden": "true" }, "↗"), h("span", { class: "lb" }, "Zur Einsatz-Oberfläche")),
    h("button", { class: "adm-nb danger", "data-adm": "logout", title: "Abmelden", onclick: () => logout() }, h("span", { class: "ic", "aria-hidden": "true" }, "⏻"), h("span", { class: "lb" }, "Abmelden")),
    h("div", { class: "adm-who" }, ME ? uName(ME) + " · " + ROLE_L[ME.role] : ""));
  let body; try { body = admBody(t); } catch (e) { console.error(e); body = h("div", { class: "empty" }, "Fehler in dieser Ansicht: " + e.message); }
  const tt = (tabs.find((x) => x[0] === t.tab) || [, "Dashboard"])[1];
  return [nav, h("main", { class: "adm-main" },
    h("div", { class: "adm-top" }, h("h1", null, tt), h("span", { class: "badge", title: DIS }, "RETTPAD TRAINER · ADMIN · SCHULUNG")),
    h("div", { class: "content adm-content", id: "content" }, body),
    h("div", { class: "adm-disc", "data-a": "adm-disc" }, DIS))];
}
/* Lade-Animation nach Admin-Anmeldung (wie Hochfahren, Variante „RettPad Trainer“) */
function adminBoot() {
  locked = true;
  const res = {};
  const jobs = { users: cnt(sb.from("profiles").select("id", { count: "exact", head: true })), veh: cnt(sb.from("vehicles").select("id", { count: "exact", head: true })),
    mis: cnt(sb.from("missions").select("id", { count: "exact", head: true })), aud: cnt(sb.from("audit_log").select("id", { count: "exact", head: true })) };
  const ready = Promise.all(Object.keys(jobs).map((k) => jobs[k].then((x) => (res[k] = x), () => (res[k] = null))));
  const txt = (k, unit) => (res[k] == null ? ["nicht erreichbar", "warn"] : [res[k] + " " + unit, "ok"]);
  const CH = [["Benutzerverwaltung", () => txt("users", "Konten")], ["Fahrzeuge", () => txt("veh", "Fahrzeuge")], ["Einsätze", () => txt("mis", "Einsätze")], ["Audit-Log", () => txt("aud", "Einträge")],
    ["Anmeldung", () => (SESSION ? ["Sitzung aktiv", "ok"] : ["keine Sitzung", "warn"])]];
  const bar = h("i"), cur = h("div", { class: "cur", "data-a": "adm-boot-cur" }, "Administration wird geladen …");
  const rows = CH.map((c, n) => { const st = h("b"); return { li: h("li", { "data-check": c[0], style: "--n:" + n }, h("span", null, c[0]), st), st, c }; });
  const done = () => { osClear(true); enterAdmin("dash"); };
  const el = osShow("rpt adm", XF, scr("rpt-scr adm-scr", h("div", { class: "rpt-load adm-load", "data-a": "adm-boot" },
    h("div", { class: "hd" }, admLogo(), h("div", { class: "ttl" }, h("h1", null, "RettPad Trainer"), h("div", { class: "ver" }, "Administration · " + uName(ME) + " · " + ROLE_L[ME.role]))),
    h("div", { class: "disc" }, "Unabhängige Schulungs-Simulation · keine echten Patientendaten · nicht mit einem Hersteller verbunden"),
    h("div", { class: "bar", role: "progressbar", "aria-label": "Ladefortschritt", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }, bar), h("ul", null, rows.map((r) => r.li)), cur)),
    h("button", { class: "skip", "data-a": "adm-boot-skip", onclick: done }, "Überspringen ›"));
  const prog = (p) => { bar.style.transform = "scaleX(" + p + ")"; bar.parentNode.setAttribute("aria-valuenow", Math.round(p * 100)); };
  let i = 0;
  const step = () => {
    if (osEl !== el) return;
    if (i >= rows.length) { prog(1); cur.textContent = "Administration bereit"; cur.classList.add("done"); el.classList.add("complete"); SND.ready(); later(done, 650); return; }
    const r = rows[i]; cur.textContent = "Lade " + r.c[0] + " …"; r.li.classList.add("act"); r.st.className = "run"; r.st.textContent = "lädt …";
    prog((i + 0.45) / rows.length);
    const fin = () => { if (osEl !== el) return; const [t, c] = r.c[1](); r.st.className = c; r.st.textContent = ""; r.st.append(h("span", { class: "tick" }, c === "ok" ? "✔" : "⚠"), " " + t); r.li.classList.add("fin"); SND.tick(); i++; prog(i / rows.length); step(); };
    later(() => ready.then(fin), 230 + Math.random() * 120);
  };
  later(step, 500);
}
TOOLS.stamp = { title: "Stempel", render() {
  return card("Stempel für Protokollkopf", fieldEl({ k: "stamp", label: "Stempeltext (fiktiv)", type: "textarea" }, () => S.settings.stamp, (x) => { S.settings.stamp = x; save(); }), h("div", { style: "margin-top:10px;white-space:pre-line;border:2px dashed #2b3a55;padding:10px;background:#fff;display:inline-block;color:#2b3a55;font-weight:700" }, S.settings.stamp));
}};
TOOLS.settings = { title: "Geräte-Einstellungen", render() {
  const file = h("input", { type: "file", accept: ".json", style: "display:none", onchange: (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { try { const j = JSON.parse(t); if (!j.v || !j.missions) throw new Error("keine RettPad-Sicherung"); S = j; S.admin = false; V = [{ t: "home" }]; saveNow(); render(); toast("Sicherung eingespielt"); } catch (er) { toast("Import fehlgeschlagen: " + er.message); } }); } });
  return h("div", null,
    card("Darstellung", h("div", { class: "fld" }, h("label", null, "Skin"), h("div", { class: "seg" }, [["classic", "Klassisch"], ["kachel", "Kachel (hell)"], ["nacht", "Nacht"]].map(([k, l]) => h("button", { type: "button", class: S.settings.skin === k ? "on" : "", "data-skin": k, onclick: () => { S.settings.skin = k; render(); } }, l)))),
      h("div", { class: "fld", style: "margin-top:8px" }, h("label", null, "Signaltöne"), h("div", { class: "seg" }, [["an", true], ["aus", false]].map(([l, b]) => h("button", { type: "button", class: S.settings.sound === b ? "on" : "", onclick: () => { S.settings.sound = b; render(); } }, l)))),
      h("div", { class: "fld", style: "margin-top:8px" }, h("label", null, "Standard-Kopienzahl Druck"), h("div", { class: "seg" }, [1, 2, 3].map((n) => h("button", { type: "button", class: S.settings.copies === n ? "on" : "", onclick: () => { S.settings.copies = n; render(); } }, String(n)))))),
    card("Ansicht & Start", h("div", { class: "fld" }, h("label", null, "Hochformat (Handy)"), h("div", { class: "seg" }, [["ask", "Nachfragen"], ["rot", "Gedreht (90°)"], ["stack", "Gestapelt"]].map(([k, l]) => h("button", { type: "button", class: viewPref === k ? "on" : "", "data-view": k, onclick: () => { setView(k); render(); } }, l)))),
      h("div", { class: "fld", style: "margin-top:8px" }, h("label", null, "Schnellstart (Boot-Animation verkürzen)"), h("div", { class: "seg" }, [["an", true], ["aus", false]].map(([l, b]) => h("button", { type: "button", class: !!S.settings.fastboot === b ? "on" : "", "data-fast": l, onclick: () => { S.settings.fastboot = b; render(); } }, l)))),
      h("div", { class: "fld", style: "margin-top:8px" }, h("label", null, "Systemtöne beim Starten / Herunterfahren (dezent)"), h("div", { class: "seg" }, [["an", true], ["aus", false]].map(([l, b]) => h("button", { type: "button", class: (S.settings.sounds !== false) === b ? "on" : "", "data-snd": l, onclick: () => { S.settings.sounds = b; save(); render(); } }, l)))),
      h("div", { class: "formbar" }, h("button", { class: "tbtn", "data-a": "fs-landscape", onclick: goLandscape }, "Vollbild & Querformat"), instSlot(), h("button", { class: "tbtn", "data-a": "install-help", onclick: installHelp }, "Installations-Anleitung")),
      h("p", { class: "small" }, isInstalled() ? "Läuft als installierte App (" + (["fullscreen", "standalone", "minimal-ui"].find((m) => matchMedia("(display-mode: " + m + ")").matches) || "iOS-Web-App") + ")." : "Läuft im Browser. Für echtes Vollbild als App installieren (Android: „App installieren“, iPhone: Teilen › Zum Home-Bildschirm).")),
    card("Datensicherung", h("p", { class: "small" }, "Einsätze werden automatisch in der Cloud gespeichert (nur eigene Besatzung, Admins: alle). Offline bleiben Änderungen lokal und werden bei Verbindung nachgereicht. Fotos bleiben lokal (IndexedDB) und sind weder im Export noch in der Cloud."), file,
      h("div", { class: "formbar" }, h("button", { class: "tbtn", "data-a": "export", onclick: () => { const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: "application/json" })), download: "rettpad-sicherung.json" }); document.body.append(a); a.click(); a.remove(); } }, "Export (JSON)"), h("button", { class: "tbtn", onclick: () => file.click() }, "Import (JSON)"),
        h("button", { class: "tbtn danger", "data-a": "reset", onclick: () => confirmBox("Alles zurücksetzen", "ALLE lokalen Einsätze, Einstellungen und Fotos auf diesem Gerät löschen und abmelden? Bereits in die Cloud synchronisierte Einsätze bleiben dort erhalten.", "alles löschen", async () => { await endSession("Zurücksetzen"); localStorage.removeItem(KEY); localStorage.removeItem(STASH); try { indexedDB.deleteDatabase("rettpad-trainer"); } catch (e) {} S = freshState(); V = [{ t: "home" }]; saveNow(); render(); bootApp(); }, "danger") }, "Alles zurücksetzen"))),
    card("Systemprotokoll", h("table", { class: "list" }, h("tbody", null, S.log.slice(0, 15).map((l) => h("tr", null, h("td", null, fmtD(l.t) + " " + fmtT(l.t)), h("td", null, l.x)))))));
}};
TOOLS.version = { title: "Versionsinfo", render() {
  return card("RettPad", h("img", { src: "icons/icon.svg", alt: "Logo RettPad", style: "width:96px;float:right" }), kv([["Version", D.VERSION], ["Zweck", "Schulungs-Simulation / Demonstrator"], ["Daten", "ausschließlich fiktiv – Einsätze in der Cloud (Supabase, EU/Frankfurt) nur für die eigene Besatzung sichtbar, offline lokal zwischengespeichert"], ["Anmeldung", curUser() ? uName(ME) + " · " + ROLE_L[ME.role] : "–"], ["Hinweis", DIS], ["Medizinprodukt", "NEIN – nicht für den realen Einsatz"], ["Browser", navigator.userAgent.slice(0, 80)], ["Bildschirm", innerWidth + " × " + innerHeight + " px"]]));
}};

/* ================= Darstellung: Querformat / Hochformat ================= */
/* Handy im Hochformat: Hinweis „Bitte Gerät drehen“ (Vollbild + screen.orientation.lock, wo unterstützt).
   Fallback: echte Layout-Drehung um 90° – #stage bekommt Breite = Bildschirmhöhe und Höhe = Bildschirmbreite,
   dadurch rechnen Layout, Media-Klassen und Touch-Treffer wie im Querformat. */
const VIEWKEY = "rettpad-trainer-view";
let viewPref = "ask"; try { viewPref = localStorage.getItem(VIEWKEY) || "ask"; } catch (e) {}
let rotqDismissed = false, lastLayout = "";
function isPhonePortrait() { return innerHeight > innerWidth && innerWidth < 600; }
function layout() {
  const de = document.documentElement, pp = isPhonePortrait(), rot = pp && viewPref !== "stack";
  const a = document.activeElement;
  /* Bildschirmtastatur im gedrehten Modus: Höhe ändert sich, Breite nicht – Layout nicht umbrechen */
  if (rot && de.classList.contains("rot") && a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && lastLayout.startsWith(innerWidth + "x")) return;
  const ew = rot ? innerHeight : innerWidth, eh = rot ? innerWidth : innerHeight;
  lastLayout = innerWidth + "x" + innerHeight;
  de.classList.toggle("rot", rot); de.classList.toggle("pstack", pp && !rot);
  de.classList.toggle("lh", eh <= 560); de.classList.toggle("vlh", eh <= 380); de.classList.toggle("narrow", ew < 620);
  de.style.setProperty("--ew", ew + "px"); de.style.setProperty("--eh", eh + "px");
  if (pp && viewPref === "ask" && !rotqDismissed) showRotq(); else hideRotq();
}
function hideRotq() { document.querySelectorAll(".rotq").forEach((x) => x.remove()); }
function showRotq() {
  if (document.querySelector(".rotq")) return;
  const de = document.documentElement, canFs = !!(de.requestFullscreen || de.webkitRequestFullscreen);
  document.body.append(h("div", { class: "rotq", "data-a": "rotq", role: "dialog", "aria-label": "Bitte Gerät drehen" },
    h("div", { class: "phone", "aria-hidden": "true" }), h("h2", null, "Bitte Gerät drehen"),
    h("p", null, "RettPad arbeitet im Querformat. Drehen Sie das Handy. Dreht sich die Anzeige nicht (Dreh-Sperre aktiv oder Datei in einer Vorschau-/Datei-App statt im Browser geöffnet), wählen Sie eine Alternative:"),
    h("div", { class: "btns" },
      instSlot("primary inst"),
      canFs ? h("button", { class: "primary", "data-a": "rot-fs", onclick: goLandscape }, "Vollbild & Querformat") : null,
      h("button", { "data-a": "rot-css", onclick: () => setView("rot") }, "Gedreht anzeigen (90°)"),
      h("button", { class: "ghost", "data-a": "rot-stack", onclick: () => setView("stack") }, "Im Hochformat bleiben (gestapelt)")),
    h("p", { class: "small" }, "Änderbar unter Menü › Geräte-Einstellungen › Hochformat.")));
}
async function goLandscape() {
  const de = document.documentElement; let locked = false;
  try { if (!(document.fullscreenElement || document.webkitFullscreenElement)) await (de.requestFullscreen ? de.requestFullscreen({ navigationUI: "hide" }) : de.webkitRequestFullscreen()); } catch (e) {}
  try { if (screen.orientation && screen.orientation.lock) { await screen.orientation.lock("landscape"); locked = true; } } catch (e) {}
  if (locked) { rotqDismissed = true; hideRotq(); return; }
  setView("rot");
  if (!locked) toast("Querformat-Sperre wird hier nicht unterstützt – Ansicht wurde stattdessen um 90° gedreht.", 4500);
}
function setView(v) {
  viewPref = v; try { localStorage.setItem(VIEWKEY, v); } catch (e) {}
  rotqDismissed = v !== "ask"; hideRotq(); lastLayout = ""; window.dispatchEvent(new Event("resize"));
}

/* ================= Als App installieren (PWA) =================
   Android/Chrome/Edge/Samsung: beforeinstallprompt → Knopf „App installieren“ (Vollbild + Querformat laut Manifest).
   iOS/iPadOS: kein Installations-Dialog möglich → Anleitung Teilen › Zum Home-Bildschirm. iOS kann Querformat nicht
   erzwingen → dort bleibt der Drehhinweis bzw. die 90°-Ansicht. */
let instPrompt = null;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isInstalled = () => ["fullscreen", "standalone", "minimal-ui"].some((m) => window.matchMedia && matchMedia("(display-mode: " + m + ")").matches) || navigator.standalone === true;
const canInstallHere = () => !window.__RPT_STANDALONE && /^https?:$/.test(location.protocol) && !isInstalled();
function installHelp() {
  const ios = isIOS();
  const steps = ios
    ? ["Seite in <b>Safari</b> öffnen (nicht im In-App-Browser von WhatsApp/Mail usw.).", "Unten auf <b>Teilen</b> tippen (Quadrat mit Pfeil nach oben ⬆︎).", "<b>„Zum Home-Bildschirm“</b> wählen (ggf. nach unten scrollen), dann <b>Hinzufügen</b>.", "RettPad ab jetzt über das neue Symbol auf dem Home-Bildschirm starten – ohne Safari-Leisten.", "Querformat: Dreh-Sperre im Kontrollzentrum aus und Gerät drehen. iOS erlaubt Web-Apps kein erzwungenes Querformat – alternativ „Gedreht anzeigen (90°)“."]
    : ["Seite in <b>Chrome</b> (oder Samsung Internet/Edge) öffnen – nicht als Datei und nicht im In-App-Browser.", "Menü <b>⋮</b> oben rechts → <b>„App installieren“</b> bzw. <b>„Zum Startbildschirm hinzufügen“</b>.", "Mit <b>Installieren</b> bestätigen.", "RettPad über das neue App-Symbol starten: Vollbild und Querformat."];
  const ol = h("ol", { class: "insthelp" }); steps.forEach((t) => { const li = h("li"); li.innerHTML = t; ol.append(li); });
  modal(ios ? "Auf dem iPhone/iPad installieren" : "Als App installieren", h("div", null, ol, h("p", { class: "small" }, "Daten bleiben lokal auf dem Gerät. Die installierte App läuft auch offline.")), [{ t: "OK", cls: "ok", a: "insthelp-ok" }]);
}
async function doInstall() {
  if (instPrompt) {
    const pr = instPrompt; instPrompt = null;
    try { pr.prompt(); const r = await pr.userChoice; if (r && r.outcome === "accepted") toast("RettPad wird installiert – danach über das App-Symbol starten"); } catch (e) { installHelp(); }
    refreshInstall(); return;
  }
  installHelp();
}
function installBtn(cls) {
  if (!canInstallHere() || !(instPrompt || isIOS() || /Android/i.test(navigator.userAgent))) return null;
  return h("button", { class: cls || "tbtn primary", "data-a": "install", onclick: doInstall }, instPrompt ? "📲 App installieren" : (isIOS() ? "📲 Zum Home-Bildschirm" : "📲 Als App installieren"));
}
function instSlot(cls) { return h("span", { class: "inst-slot", "data-cls": cls || "" }, installBtn(cls)); }
function refreshInstall() { document.querySelectorAll(".inst-slot").forEach((sl) => { sl.innerHTML = ""; const b = installBtn(sl.dataset.cls || undefined); if (b) sl.append(b); }); }
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); instPrompt = e; refreshInstall(); });
window.addEventListener("appinstalled", () => { instPrompt = null; refreshInstall(); toast("RettPad als App installiert"); });
/* Installierte App: Querformat zusätzlich per API sperren (Android, Vollbild) – beim ersten Antippen */
/* Querformat-Sperre nur auf Mobilgeräten (Touch als primäre Eingabe) – am PC/Mac nie */
const isMobileDev = () => !!(window.matchMedia && matchMedia("(pointer:coarse)").matches) && Math.min(screen.width || 9999, screen.height || 9999) < 1100;
if (isInstalled() && isMobileDev() && screen.orientation && screen.orientation.lock) {
  const once = () => { screen.orientation.lock("landscape").catch(() => {}); window.removeEventListener("pointerdown", once, true); };
  window.addEventListener("pointerdown", once, true);
}
document.documentElement.classList.toggle("pwa", isInstalled());

/* ================= Benutzer / Anmeldung (Supabase) =================
   Konten liegen zentral in Supabase Auth (Passwörter nur dort, bcrypt). Anmeldung: Personalnummer → synthetische
   E-Mail <pnr>@users.rettpad-trainer.invalid (Superadmin: echte E-Mail). Rollen stehen NUR in public.profiles (serverseitig
   geschützt). Admin-Aktionen laufen über Edge Functions, die die Rolle serverseitig prüfen.
   Lokal: nur die Sitzung (sessionStorage, endet mit dem Tab) und optional ein Schnell-PIN-Hash für diese Sitzung. */
const SB_URL = "https://ssljjgdifrwbmpcbpczh.supabase.co";
const SB_KEY = "sb_publishable_zSxzou0CN3mvq6A5YmBNiQ_v0vQbLA3"; /* öffentlicher Client-Schlüssel – Schutz über RLS */
const SYN_DOMAIN = "@users.rettpad-trainer.invalid";
const LINK = (() => { try { const q = new URLSearchParams(location.hash.slice(1)); return { type: q.get("type") || "", err: q.get("error_description") || "", token: q.has("access_token") }; } catch (e) { return { type: "", err: "", token: false }; } })();
let sb = null;
try {
  if (window.supabase && window.supabase.createClient) sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { flowType: "implicit", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true, storage: window.sessionStorage, storageKey: "rettpad-trainer-auth" } });
} catch (e) { sb = null; }
if (LINK.err && history.replaceState) history.replaceState(null, "", location.pathname + location.search);
const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
function randHex(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a); }
function uuid() { if (crypto.randomUUID) return crypto.randomUUID(); const b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; const x = hex(b); return x.slice(0, 8) + "-" + x.slice(8, 12) + "-" + x.slice(12, 16) + "-" + x.slice(16, 20) + "-" + x.slice(20); }
function sha256js(bytes) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const Hh = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const l = bytes.length, nb = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(nb); m.set(bytes); m[l] = 0x80;
  const bits = l * 8; for (let i = 0; i < 4; i++) m[nb - 1 - i] = (bits >>> (8 * i)) & 255; m[nb - 5] = Math.floor(bits / 4294967296) & 255;
  const w = new Uint32Array(64), ror = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < nb; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = (m[o + 4 * i] << 24) | (m[o + 4 * i + 1] << 16) | (m[o + 4 * i + 2] << 8) | m[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) { const s0 = ror(w[i - 15], 7) ^ ror(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = ror(w[i - 2], 17) ^ ror(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, b, c, d, e, f, g, hh] = Hh;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((x, i) => (Hh[i] = (Hh[i] + x) | 0));
  }
  return Hh.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}
async function sha256hex(str) {
  const data = new TextEncoder().encode(str);
  if (window.crypto && crypto.subtle && crypto.subtle.digest) { try { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", data))); } catch (e) {} }
  return sha256js(data);
}
async function hashPin(pin, salt) { let x = await sha256hex(salt + ":" + pin); for (let i = 1; i < 1000; i++) x = await sha256hex(salt + x); return x; }
const QUALS = [["NotSan", "Notfallsanitäter/in"], ["RA", "Rettungsassistent/in"], ["RS", "Rettungssanitäter/in"], ["RH", "Rettungshelfer/in"], ["NA", "Notärztin / Notarzt"], ["Azubi", "Auszubildende/r NotSan"], ["Prakt", "Praktikant/in"], ["Leitung", "Leitung / Verwaltung"]];
const ROLE_L = { superadmin: "Superadmin", admin: "Admin", user: "Benutzer" };
const uName = (u) => (u ? [u.vorname, u.name].filter(Boolean).join(" ") + " (" + u.qual + ")" : "");
const mapProfile = (p) => ({ id: p.id, role: p.role, pnr: p.pnr, name: p.name, vorname: p.vorname || "", qual: p.qualifikation || "", wache: p.wache || "", aktiv: p.aktiv, must: p.must_change_password });
let ME = null, SESSION = null; /* SESSION erst nach vollständiger Anmeldung (Kennung + Passwort + ggf. Passwortwechsel) */
let DIR = { profiles: [], vehicles: [] };
const curUser = () => (SESSION ? ME : null);
const uById = (id) => (ME && ME.id === id ? ME : DIR.profiles.find((u) => u.id === id));
const isAdm = () => !!(SESSION && ME && (ME.role === "admin" || ME.role === "superadmin"));
const isSuper = () => isAdm() && ME.role === "superadmin";
const VEHICLES_FALLBACK = ["RTW 1/83-1 (fiktiv)", "RTW 1/83-2 (fiktiv)", "NEF 1/82-1 (fiktiv)", "KTW 1/85-1 (fiktiv)", "ITW 1/89-1 (fiktiv)"];
const pwProblem = (pw, pnr) => {
  if (pw.length < 10) return "Passwort muss mindestens 10 Zeichen haben.";
  if (!/[A-Za-zÄÖÜäöüß]/.test(pw) || !/[0-9]/.test(pw)) return "Passwort braucht Buchstaben und Ziffern.";
  if (pnr && pw.toLowerCase().includes(String(pnr).toLowerCase())) return "Passwort darf die Personalnummer nicht enthalten.";
  return null;
};
async function fnCall(name, body) {
  if (!sb) throw new Error("Cloud nicht verfügbar");
  const { data, error } = await sb.functions.invoke(name, { body });
  if (error) { let msg = error.message; try { const j = await error.context.json(); msg = j.error || msg; } catch (e) {} throw new Error(msg); }
  return data;
}
async function loadDirectory() {
  if (!sb || !SESSION) return;
  try {
    const [p, v] = await Promise.all([sb.from("profiles").select("id,role,pnr,name,vorname,qualifikation,wache,aktiv,must_change_password").eq("aktiv", true).order("name"), sb.from("vehicles").select("id,funkruf,kennzeichen,typ,wache,aktiv").eq("aktiv", true).order("funkruf")]);
    if (!p.error) DIR.profiles = p.data.map(mapProfile);
    if (!v.error) DIR.vehicles = v.data;
  } catch (e) {}
}

/* ---------- Online-Speicherung der Einsätze mit Offline-Zwischenspeicher ---------- */
const SYNC = { busy: false, err: "", last: 0, t: 0 };
const syncRepl = (k, v) => (k === "_sync" ? undefined : v);
function mHash(m) { const s = JSON.stringify(m, syncRepl); let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36) + ":" + s.length; }
function meaningful(m) { return !!(m.nr || m.alarm || m.manv.length || m.patients.length > 1 || m.patients.some((p) => p.entries.length || p.vitals.length || p.meds.length || p.photos.length || p.closed || Object.keys(p.sel).length || Object.keys(p.forms).some((k) => k !== "crew" && k !== "transport"))); }
function syncState(m) { if (!meaningful(m)) return "lokal (leer)"; const s = m._sync || {}; if (s.err) return "⚠ " + s.err.slice(0, 40); if (s.hash && s.hash === mHash(m)) return "☁ gespeichert"; return "⟳ ausstehend"; }
function pendingCount() { return S.missions.filter((m) => meaningful(m) && !(m._sync && m._sync.hash === mHash(m))).length; }
function scheduleSync(ms) { clearTimeout(SYNC.t); SYNC.t = setTimeout(syncNow, ms == null ? 2500 : ms); }
async function ensureCrewRemote() {
  const pc = S.cloud && S.cloud.pending; if (!pc) return;
  let r = await sb.from("crews").insert({ id: pc.id, vehicle_id: pc.vehicle_id || null, fahrzeug: pc.fahrzeug.slice(0, 60) });
  if (r.error && r.error.code !== "23505") throw new Error(r.error.message);
  r = await sb.from("crew_members").upsert(pc.members, { onConflict: "crew_id,user_id", ignoreDuplicates: true });
  if (r.error && r.error.code !== "23505") throw new Error(r.error.message);
  S.cloud.pending = null;
}
async function syncNow() {
  if (!sb || !SESSION || SYNC.busy || navigator.onLine === false) return;
  SYNC.busy = true;
  try {
    await ensureCrewRemote();
    for (const m of S.missions) {
      if (!meaningful(m)) continue;
      const s = (m._sync = m._sync || {}), hs = mHash(m);
      if (s.hash === hs) continue;
      if (!s.rid) s.rid = uuid();
      if (!s.crew) s.crew = S.cloud && S.cloud.crewId;
      if (!s.crew) { s.err = "keine Besatzung"; continue; }
      const row = { einsatznr: String(m.nr || "").slice(0, 40), data: JSON.parse(JSON.stringify(m, syncRepl)), abgeschlossen: m.patients.every((p) => p.closed) };
      let { data, error } = await sb.from("missions").update(row).eq("id", s.rid).select("id,version");
      if (!error && (!data || !data.length)) ({ data, error } = await sb.from("missions").insert(Object.assign({ id: s.rid, crew_id: s.crew }, row)).select("id,version"));
      if (error) { s.err = error.code === "42501" ? "keine Berechtigung" : error.message; continue; }
      s.hash = hs; s.at = Date.now(); s.err = ""; s.ver = data && data[0] ? data[0].version : s.ver;
    }
    SYNC.err = ""; SYNC.last = Date.now();
  } catch (e) { SYNC.err = String(e.message || e); }
  finally { SYNC.busy = false; saveNow(); const t = top(); if (t.t === "tool" && (t.tool === "missions" || t.tool === "account")) render(); }
}
async function pullMissions() {
  if (!sb || !SESSION || navigator.onLine === false) return;
  try {
    const since = new Date(Date.now() - 3 * 86400000).toISOString();
    const cm = await sb.from("crew_members").select("crew_id").eq("user_id", SESSION.uid);
    const ids = (cm.data || []).map((x) => x.crew_id); if (!ids.length) return;
    const r = await sb.from("missions").select("id,crew_id,data,version,updated_at").in("crew_id", ids.slice(-50)).gte("updated_at", since).order("updated_at", { ascending: false }).limit(30);
    if (r.error) return;
    let n = 0;
    for (const row of r.data) {
      const loc = S.missions.find((m) => m._sync && m._sync.rid === row.id);
      if (loc) { const dirty = loc._sync.hash !== mHash(loc); if (!dirty && row.version > (loc._sync.ver || 0)) { const nm = Object.assign(row.data, { _sync: { rid: row.id, crew: row.crew_id, ver: row.version } }); nm._sync.hash = mHash(nm); S.missions[S.missions.indexOf(loc)] = nm; n++; } continue; }
      if (!row.data || !Array.isArray(row.data.patients)) continue;
      const nm = Object.assign(row.data, { _sync: { rid: row.id, crew: row.crew_id, ver: row.version } }); nm._sync.hash = mHash(nm);
      S.missions.push(nm); n++;
    }
    if (n) { saveNow(); toast(n + " Einsatz/Einsätze aus der Cloud geladen"); }
  } catch (e) {}
}
/* Einsätze gehören der angemeldeten Person: beim Abmelden ungesicherte in einen Zwischenspeicher pro Benutzer,
   gesicherte werden lokal entfernt – die nächste Person sieht keine fremden Einsätze. */
const STASH = "rettpad-trainer-stash-v1";
function stashMissions(ownerId) {
  ownerId = ownerId || (ME && ME.id); if (!ownerId) return;
  let st = {}; try { st = JSON.parse(localStorage.getItem(STASH)) || {}; } catch (e) {}
  const keep = S.missions.filter((m) => meaningful(m) && !(m._sync && m._sync.hash === mHash(m)));
  if (keep.length) st[ownerId] = keep; else delete st[ownerId];
  try { localStorage.setItem(STASH, JSON.stringify(st)); } catch (e) {}
  const m = freshMission(); S.missions = [m]; S.cur = m.id; S.curPat = 0; S.sendQueue = []; saveNow();
}
function restoreStash(uidv) {
  let st = {}; try { st = JSON.parse(localStorage.getItem(STASH)) || {}; } catch (e) {}
  if (st[uidv] && st[uidv].length) { const ex = new Set(S.missions.map((m) => m.id)); st[uidv].forEach((m) => { if (!ex.has(m.id)) S.missions.push(m); }); delete st[uidv]; try { localStorage.setItem(STASH, JSON.stringify(st)); } catch (e) {} }
  if (S.missions.length > 1 && !meaningful(S.missions[0])) S.missions.shift();
  if (!S.missions.find((m) => m.id === S.cur)) { S.cur = S.missions[0].id; S.curPat = 0; }
}
window.addEventListener("online", () => scheduleSync(300));
setInterval(() => { if (SESSION && pendingCount()) syncNow(); }, 30000);

/* ---------- Automatische Sperre bei Inaktivität + Schnell-PIN (nur laufende Sitzung) ---------- */
let lastAct = Date.now(), locked = false, pinTries = 0;
const lockMs = () => (window.__RPT_LOCK_MS || (S.settings.lockMin || 10) * 60000);
const markActive = () => { lastAct = Date.now(); };
["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, markActive, true));
setInterval(() => { if (SESSION && !locked && Date.now() - lastAct > lockMs()) showLock("Automatisch gesperrt (Inaktivität)."); }, 5000);
const PINKEY = "rettpad-trainer-session-pin";
const getPin = () => { try { return JSON.parse(sessionStorage.getItem(PINKEY)); } catch (e) { return null; } };

/* ================= Betriebssystem-Simulation (Boot, Herunterfahren) =================
   Animationen nur über transform/opacity (flüssig auf Handys). Tempo-Faktor K: 1 = normal (Start ≈ 7 s, Herunterfahren ≈ 4,5 s),
   Schnellstart-Schalter = 0,3, Testmodus (__RPT_FASTBOOT) ≈ sofort. prefers-reduced-motion: nur sanfte Überblendungen. */
let osEl = null, osTimers = [], osClock = 0, osEnter = false;
const FAST = () => !!(window.__RPT_FASTBOOT || S.settings.fastboot);
const RM = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const K = () => (window.__RPT_FASTBOOT ? 0.04 : S.settings.fastboot ? 0.3 : 1);
const T = (ms) => (window.__RPT_FASTBOOT ? Math.min(ms, 40) : Math.round(ms * K()));
const later = (fn, ms) => osTimers.push(setTimeout(fn, T(ms)));
function osClear(fade) {
  osTimers.forEach(clearTimeout); osTimers = []; clearInterval(osClock);
  document.querySelectorAll(".os.leaving").forEach((x) => x.remove());
  if (osEl && fade && !window.__RPT_FASTBOOT) { const old = osEl; old.classList.add("leaving", "fadeout"); setTimeout(() => old.remove(), T(420) + 40); }
  else if (osEl) osEl.remove();
  osEl = null;
}
/* xfade: alter Bildschirm bleibt kurz darunter liegen, neuer blendet weich ein */
function osShow(cls, ...kids) {
  let opts = {};
  if (kids.length && kids[0] && kids[0].__opts) opts = kids.shift();
  const enter = !!(opts.xfade || osEnter); osEnter = false;
  const old = enter && osEl && !window.__RPT_FASTBOOT ? osEl : null;
  if (old) { osEl = null; osClear(); old.classList.add("leaving"); setTimeout(() => old.remove(), T(650) + 60); } else osClear();
  osEl = h("div", { class: "os " + cls + (enter ? " enter" : "") + (RM() ? " rm" : ""), "data-os": cls.split(" ")[0], style: "--k:" + K() }, ...kids);
  $stage.append(osEl); document.querySelectorAll(".modal-bg").forEach((x) => x.remove()); return osEl;
}
const XF = { __opts: true, xfade: true };

/* Dezente Systemtöne (WebAudio) – erst nach einer Nutzerinteraktion, abschaltbar in Geräte-Einstellungen */
const SND = (() => {
  let ctx = null;
  const on = () => S.settings.sounds !== false && !window.__RPT_FASTBOOT;
  const arm = () => { if (!on()) return; try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); } catch (e) { ctx = null; } };
  document.addEventListener("pointerdown", arm, true); document.addEventListener("keydown", arm, true);
  function tone(f, t0, dur, vol, type, f2) {
    if (!ctx || !on() || ctx.state !== "running") return;
    try {
      const t = ctx.currentTime + t0, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) {}
  }
  return {
    chime() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.13, 1.1, 0.045)); },
    tick() { tone(2100, 0, 0.045, 0.012, "triangle"); },
    ready() { tone(880, 0, 0.3, 0.035); tone(1318.5, 0.11, 0.45, 0.03); },
    down() { [783.99, 659.25, 523.25, 392].forEach((f, i) => tone(f, i * 0.15, 0.8, 0.04)); },
    crt() { tone(300, 0, 0.32, 0.05, "sine", 45); tone(6000, 0, 0.14, 0.005, "sine", 2500); },
    click() { tone(160, 0, 0.07, 0.045, "square", 90); },
  };
})();

const OEM_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3 56 12v18c0 15-10 26-24 31C18 56 8 45 8 30V12z" fill="none" stroke="#e9edf3" stroke-width="4"/><path d="M22 20h14a8 8 0 0 1 0 16h-6l10 10M22 20v26" fill="none" stroke="#ef8a17" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SYNC_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M40 20A16 16 0 0 0 11 13" fill="none" stroke="#8fb8ff" stroke-width="4" stroke-linecap="round"/><path d="M11 5v8h8" fill="none" stroke="#8fb8ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 28a16 16 0 0 0 29 7" fill="none" stroke="#6fe07f" stroke-width="4" stroke-linecap="round"/><path d="M37 43v-8h-8" fill="none" stroke="#6fe07f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const spinner = (cls) => h("div", { class: "spin" + (cls ? " " + cls : ""), "aria-hidden": "true" }, [1, 2, 3, 4, 5].map(() => h("i")));
const skipBtn = () => h("button", { class: "skip", "data-a": "boot-skip", onclick: () => { osEnter = true; authStart(); } }, "Überspringen ›");
const scr = (cls, ...kids) => h("div", { class: "scr " + cls }, ...kids);

/* 1) Einschalten: Backlight flackert an, OEM-Logo mit Glanz, Ladekreis */
function bootDevice() {
  locked = true;
  osShow("oem pwr-on", scr("oem-scr",
    h("div", { class: "oem-logo", html: OEM_SVG + "<span>FIELDTAB</span>" }),
    h("div", { class: "oem-sub" }, "Rugged Mobile Computer · R11"),
    spinner("oem-spin"), h("div", { class: "os-msg", "data-a": "boot-msg" }, "Wird gestartet")),
    h("div", { class: "backlight", "aria-hidden": "true" }), skipBtn());
  later(() => SND.chime(), 650);
  later(() => osEl && osEl.classList.add("out"), 2800);
  later(bootApp, 3250);
}
const CHECKS = [["Lokale Datenbank", "bereit", "ok"], ["LTE-Modem 1 / 2", "verbunden (simuliert)", "ok"], ["GPS", "Position gefunden – 8 Satelliten", "ok"], ["Kartenleser (eGK / HBA)", "2 Leser bereit", "ok"], ["RFID/NFC-Leser", "bereit", "ok"], ["Medizingeräte-Schnittstelle", "kein Gerät gekoppelt", "warn"], ["Cloud-Verbindung (Supabase)", navigator.onLine === false ? "offline – Zwischenspeicher aktiv" : "erreichbar", navigator.onLine === false ? "warn" : "ok"], ["Test Voranmeldung", "Server erreichbar (simuliert)", "ok"]];
/* 2) App-Ladebildschirm „RettPad“: animiertes Logo, Modulprüfung mit aufpoppenden Häkchen, Fortschrittsbalken */
function bootApp() {
  locked = true;
  const bar = h("i"), cur = h("div", { class: "cur", "data-a": "boot-cur" }, "RettPad wird gestartet …");
  const rows = CHECKS.map((c, n) => { const st = h("b"); return { li: h("li", { "data-check": c[0], style: "--n:" + n }, h("span", null, c[0]), st), st, c }; });
  osShow("rpt", XF, scr("rpt-scr", h("div", { class: "rpt-load" },
    h("div", { class: "hd" }, h("span", { class: "logo" }, h("img", { src: "icons/icon.svg", alt: "" })), h("div", { class: "ttl" }, h("h1", null, "RettPad"), h("div", { class: "ver" }, D.VERSION + " · unabhängige Schulungs-Simulation"))),
    h("div", { class: "disc", "data-a": "boot-disc" }, "Unabhängige Schulungs-Simulation · keine echten Patientendaten · nicht mit einem Hersteller verbunden"),
    h("div", { class: "bar", role: "progressbar", "aria-label": "Ladefortschritt", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }, bar), h("ul", null, rows.map((r) => r.li)), cur)), skipBtn());
  const prog = (p) => { bar.style.transform = "scaleX(" + p + ")"; bar.parentNode.setAttribute("aria-valuenow", Math.round(p * 100)); };
  let i = 0;
  const step = () => {
    if (i >= rows.length) { prog(1); cur.textContent = "Start abgeschlossen – Anmeldung"; cur.classList.add("done"); osEl && osEl.classList.add("complete"); SND.ready(); later(() => { osEnter = true; authStart(); }, 700); return; }
    const r = rows[i]; cur.textContent = "Prüfe " + r.c[0] + " …"; r.li.classList.add("act"); r.st.className = "run"; r.st.textContent = "prüfe …";
    prog((i + 0.45) / rows.length);
    later(() => {
      r.st.className = r.c[2]; r.st.textContent = "";
      r.st.append(h("span", { class: "tick" }, r.c[2] === "ok" ? "✔" : "⚠"), " " + r.c[1]); r.li.classList.add("fin");
      SND.tick(); i++; prog(i / rows.length); step();
    }, 250 + Math.random() * 140);
  };
  later(step, 600);
}
/* 3) Herunterfahren / Neustart: Sichern & Sync → Wird heruntergefahren → Röhren-Aus-Effekt → Schwarz */
const SD_STEPS = [["Einsatzdaten werden gesichert", "gespeichert (lokal)"], ["Protokolle werden geschrieben", "abgeschlossen"], ["Synchronisation mit Cloud", "abgeglichen, abgemeldet"]];
function shutdown(reboot) {
  saveNow(); stopCam(); endSession(reboot ? "Gerät neu gestartet" : "Gerät heruntergefahren");
  const bar = h("i"), rows = SD_STEPS.map((s) => { const st = h("b"); return { li: h("li", null, h("span", null, s[0]), st), st, s }; });
  osShow("sd", XF, scr("sd-scr", h("div", { class: "sd-box", "data-a": "sd-sync" },
    h("div", { class: "sync", html: SYNC_SVG }), h("h2", null, "Daten werden gesichert"), h("div", { class: "sub" }, "Synchronisation – bitte Gerät nicht ausschalten"),
    h("div", { class: "bar" }, bar), h("ul", null, rows.map((r) => r.li)))));
  rows.forEach((r, n) => {
    later(() => { r.li.classList.add("act"); r.st.className = "run"; r.st.textContent = "…"; bar.style.transform = "scaleX(" + (n + 0.5) / rows.length + ")"; }, 150 + n * 480);
    later(() => { r.st.className = "ok"; r.st.textContent = ""; r.st.append(h("span", { class: "tick" }, "✔"), " " + r.s[1]); r.li.classList.add("fin"); bar.style.transform = "scaleX(" + (n + 1) / rows.length + ")"; SND.tick(); }, 500 + n * 480);
  });
  later(() => {
    osShow("oem sd2", XF, scr("oem-scr", h("div", { class: "oem-logo small", html: OEM_SVG + "<span>FIELDTAB</span>" }), spinner("oem-spin"),
      h("div", { class: "os-msg", "data-a": "sd-msg" }, reboot ? "Neu starten" : "Wird heruntergefahren")));
    SND.down();
    /* osShow löscht laufende Timer – Folgephasen daher erst hier planen */
    later(() => { if (osEl) { osEl.classList.add("crt"); SND.crt(); } }, 1700);
    later(() => {
    if (reboot) { osShow("black", h("div", { class: "crt-dot", "aria-hidden": "true" })); later(bootDevice, 900); return; }
    osShow("black off", h("div", { class: "crt-dot", "aria-hidden": "true" }),
      h("button", { class: "powerbtn", "data-a": "power-on", "aria-label": "Einschalten", onclick: powerOn }, "⏻"),
      h("div", { class: "offtxt" }, "Ausgeschaltet – Ein/Aus antippen zum Einschalten"));
    }, 2500);
  }, 1950);
}
function powerOn() { if (!osEl) return bootDevice(); osEl.classList.add("press"); SND.click(); later(bootDevice, 380); }
function restartApp() { saveNow(); logSys("App-Neustart"); stopCam(); ADMIN_UI = false; V = [{ t: "home" }]; render(); bootApp(); }
function linkSession(session) {
  try {
    const p = session.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const c = JSON.parse(decodeURIComponent(escape(atob(p + "===".slice((p.length + 3) % 4)))));
    const now = Date.now() / 1000;
    return Array.isArray(c.amr) && !c.amr.some((a) => a.method === "password") && c.amr.some((a) => ["otp", "invite", "recovery", "magiclink"].includes(a.method) && now - (a.timestamp || 0) < 3500);
  } catch (e) { return false; }
}
async function authStart() {
  locked = false;
  if (!sb) return showLogin("", null, "Cloud-Bibliothek konnte nicht geladen werden – Anmeldung nicht möglich.");
  let session = null;
  try { session = (await sb.auth.getSession()).data.session; } catch (e) {}
  if (LINK.err) { const m = LINK.err; LINK.err = ""; return showLogin("", null, "Link ungültig oder abgelaufen: " + m + " – bitte neue Einladung / neuen Link anfordern."); }
  if (session && (LINK.type === "invite" || LINK.type === "recovery")) { const t = LINK.type; LINK.type = ""; return afterAuth({ link: t }); }
  /* Sitzung stammt aus einem E-Mail-Link (amr "otp"/"invite"/"recovery", < 1 h), z. B. nach Neuladen der Seite → direkt Passwort festlegen */
  if (session && linkSession(session)) {
    let must = false; try { const r = await sb.from("profiles").select("must_change_password").eq("id", session.user.id).maybeSingle(); must = !!(r.data && r.data.must_change_password); } catch (e) {}
    if (must) return afterAuth({ link: "invite" });
  }
  if (session && ME) return showLock("RettPad neu gestartet – bitte entsperren.");
  if (session) return showLock("Laufende Sitzung – bitte entsperren.", session);
  showLogin();
}
function authHd(title) {
  const clk = h("span", { class: "clk" }, fmtHM(Date.now()));
  setTimeout(() => { clearInterval(osClock); osClock = setInterval(() => (clk.textContent = fmtHM(Date.now())), 15000); }, 0);
  return [h("div", { class: "auth-hd" }, h("img", { src: "icons/icon.svg", alt: "" }), h("h1", null, title), clk),
    h("div", { class: "train", "data-a": "train-note" }, "⚠ " + DIS + ". Nur fiktive Einsätze und Personen erfassen.")];
}
function authErr() { return h("div", { class: "autherr", "data-a": "auth-err", role: "alert", hidden: true }); }
function showErr(el, msg) { el.textContent = msg; el.hidden = false; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }
function fldI(label, input) { return h("div", { class: "fld" }, h("label", null, label), input); }
const pwIn = (f, extra) => h("input", Object.assign({ type: "password", "data-f": f, autocomplete: "new-password", maxlength: "72" }, extra || {}));
const footShut = () => h("button", { class: "tbtn danger", "data-a": "os-shutdown", onclick: shutdownMenu }, "⏻ Herunterfahren / Neustart");
const emailFor = (id) => (id.includes("@") ? id.toLowerCase() : id.toLowerCase() + SYN_DOMAIN);
const LASTPNR = "rettpad-trainer-last-pnr";

/* Anmeldung: Personalnummer (oder E-Mail der Superadmin-Person) + Passwort */
let fails = 0, lockUntil = 0;
function showLogin(prePnr, info, errMsg) {
  SESSION = null; S.admin = false;
  const err = authErr();
  let last = ""; try { last = localStorage.getItem(LASTPNR) || ""; } catch (e) {}
  const pnrI = h("input", { type: "text", "data-f": "login-pnr", autocomplete: "username", autocapitalize: "off", spellcheck: "false", maxlength: "254", value: prePnr || last, onkeydown: (e) => { if (e.key === "Enter") pinI.focus(); } });
  const pinI = h("input", { type: "password", "data-f": "login-pin", autocomplete: "current-password", maxlength: "72", onkeydown: (e) => { if (e.key === "Enter") submit(); } });
  let busy = false;
  const btn = h("button", { class: "tbtn ok", "data-a": "login", onclick: () => submit() }, "Anmelden");
  const submit = async () => {
    if (busy) return;
    const now = Date.now();
    if (lockUntil > now) return showErr(err, "Zu viele Fehlversuche – bitte " + Math.ceil((lockUntil - now) / 1000) + " s warten.");
    const id = pnrI.value.trim(), pw = pinI.value;
    if (!id || !pw) return showErr(err, "Bitte Personalnummer und Passwort eingeben.");
    if (!sb) return showErr(err, "Cloud-Bibliothek fehlt – Anmeldung nicht möglich.");
    if (navigator.onLine === false) return showErr(err, "Keine Internetverbindung – die Anmeldung ist nur online möglich.");
    busy = true; btn.disabled = true; btn.textContent = "Prüfe …";
    let res; try { res = await sb.auth.signInWithPassword({ email: emailFor(id), password: pw }); } catch (e) { res = { error: e }; }
    busy = false; btn.disabled = false; btn.textContent = "Anmelden";
    if (res.error) {
      pinI.value = "";
      const msg = String(res.error.message || "");
      if (/banned/i.test(msg)) return showErr(err, "Konto gesperrt – bitte an die Administration wenden.");
      if (/fetch|network/i.test(msg)) return showErr(err, "Server nicht erreichbar – bitte Verbindung prüfen.");
      fails++; logSys("Fehlgeschlagene Anmeldung (Kennung " + id.slice(0, 12) + ")");
      if (fails >= 5) { fails = 0; lockUntil = Date.now() + 30000; return showErr(err, "Anmeldung fehlgeschlagen. 5 Fehlversuche – Anmeldung für 30 s gesperrt."); }
      return showErr(err, "Anmeldung fehlgeschlagen: Personalnummer oder Passwort falsch. (" + (5 - fails) + " Versuche bis zur Sperre)");
    }
    fails = 0; try { if (!id.includes("@")) localStorage.setItem(LASTPNR, id); } catch (e) {}
    afterAuth({ pw });
  };
  const forgot = () => {
    const id = pnrI.value.trim();
    if (!id.includes("@")) { modal("Passwort vergessen", h("p", null, "Bitte an die Administration wenden – Admins können Ihr Passwort zurücksetzen. (Nur Konten mit echter E-Mail-Adresse können sich selbst einen Link schicken.)")); return; }
    confirmBox("Passwort zurücksetzen", "Link zum Zurücksetzen an " + id + " senden?", "Link senden", async () => {
      const { error } = await sb.auth.resetPasswordForEmail(id.toLowerCase(), { redirectTo: location.origin + location.pathname });
      toast(error ? "Fehler: " + error.message : "Falls das Konto existiert, wurde ein Link verschickt.", 4000);
    });
  };
  osShow("auth", h("div", { class: "auth-wrap", "data-a": "screen-login" }, authHd("Anmeldung"),
    info ? h("div", { class: "auth-card", "data-a": "auth-info", style: "background:#dff3e2" }, info) : null,
    h("div", { class: "auth-cols" },
      h("div", { class: "auth-card" }, h("h2", null, "Anmelden"), h("div", { class: "form", style: "grid-template-columns:1fr" }, fldI("Personalnummer", pnrI), fldI("Passwort", pinI)), err,
        h("div", { class: "row", style: "margin-top:8px" }, btn, h("button", { class: "tbtn", "data-a": "pw-forgot", onclick: forgot }, "Passwort vergessen?"))),
      h("div", { class: "auth-card" }, h("h2", null, "Hinweise"),
        h("p", { class: "small", style: "margin:0" }, "Konten werden zentral von der Administration angelegt – eine Selbstregistrierung gibt es nicht. Beim ersten Anmelden muss das Startpasswort geändert werden (mind. 10 Zeichen, Buchstaben und Ziffern). Admins benötigen zusätzlich einen Code aus einer Authenticator-App (TOTP)."),
        h("p", { class: "small" }, DIS + ". KEIN Medizinprodukt. Einsätze werden verschlüsselt (HTTPS) in der Cloud gespeichert und sind nur für die eigene Besatzung sichtbar."))),
    h("div", { class: "auth-foot" }, h("div", { class: "row" }, instSlot()), footShut())));
  if (errMsg) showErr(err, errMsg);
}

/* Nach erfolgreichem Passwort: Profil prüfen → ggf. Passwortwechsel → Admin-Bereich bzw. Besatzung */
async function afterAuth(ctx) {
  ctx = ctx || {};
  let session = null; try { session = (await sb.auth.getSession()).data.session; } catch (e) {}
  if (!session) return showLogin("", null, "Sitzung abgelaufen – bitte neu anmelden.");
  const { data: prof, error } = await sb.from("profiles").select("id,role,pnr,name,vorname,qualifikation,wache,aktiv,must_change_password").eq("id", session.user.id).maybeSingle();
  if (error || !prof || !prof.aktiv) { await sb.auth.signOut({ scope: "local" }); ME = null; return showLogin("", null, error ? "Profil konnte nicht geladen werden: " + error.message : "Kein aktives Profil – bitte an die Administration wenden."); }
  ME = mapProfile(prof); ME.email = session.user.email;
  if (prof.must_change_password || ctx.link === "recovery") return showSetPassword(ctx);
  ctx.pw = null;
  SESSION = { uid: ME.id, t: Date.now() }; S.admin = isAdm(); locked = false; pinTries = 0; markActive();
  // Lokaler Zwischenspeicher gehört genau einem Konto: fremde (nicht abgemeldete) Daten wegsortieren, eigene fortsetzen
  const resume = !ctx.unlock && S.owner === ME.id && !!(S.crew && S.crew.fahrzeug !== undefined && S.cloud);
  if (!ctx.unlock) { if (S.owner && S.owner !== ME.id) { stashMissions(S.owner); S.cloud = null; S.crew = Object.assign({}, S.crew, { ids: {} }); } S.owner = ME.id; restoreStash(ME.id); logSys((resume ? "Sitzung fortgesetzt: " : "Anmeldung: ") + uName(ME) + " (" + ROLE_L[ME.role] + ")"); }
  saveNow();
  await loadDirectory();
  /* Admin/Superadmin: eigene Lade-Animation → Admin-Bereich */
  if (!ctx.unlock && isAdm()) { pullMissions().then(() => scheduleSync(500)); return adminBoot(); }
  if (resume) { osClear(true); render(); toast("Sitzung fortgesetzt"); pullMissions().then(() => scheduleSync(500)); return; }
  if (ctx.unlock) { osClear(true); render(); toast("Entsperrt"); scheduleSync(500); return; }
  pullMissions().then(() => scheduleSync(500));
  showCrew({ start: true });
}

/* Passwort setzen: erstes Anmelden (Startpasswort) oder Einladungs-/Zurücksetzen-Link */
function showSetPassword(ctx) {
  const err = authErr(), viaLink = !!ctx.link;
  const needCur = !viaLink && !ctx.pw;
  const cur = needCur ? h("input", { type: "password", "data-f": "pw-cur", autocomplete: "current-password", maxlength: "72" }) : null;
  const p1 = pwIn("pw-new"), p2 = pwIn("pw-new2", { onkeydown: (e) => { if (e.key === "Enter") submit(); } });
  let busy = false;
  const submit = async () => {
    if (busy) return;
    const prob = pwProblem(p1.value, ME && ME.pnr);
    if (prob) return showErr(err, prob);
    if (p1.value !== p2.value) return showErr(err, "Passwort und Wiederholung stimmen nicht überein.");
    if (!viaLink && (ctx.pw || (cur && cur.value)) === p1.value) return showErr(err, "Das neue Passwort muss sich vom bisherigen unterscheiden.");
    busy = true;
    try {
      await fnCall("account", { action: "change_password", current_password: viaLink ? undefined : ctx.pw || (cur && cur.value), new_password: p1.value });
      /* Der Anmeldeserver beendet beim Passwortwechsel alle Sitzungen → direkt mit dem neuen Passwort neu anmelden */
      const em = (ME && ME.email) || ((await sb.auth.getSession()).data.session || { user: {} }).user.email;
      await sb.auth.signOut({ scope: "local" }).catch(() => {});
      const re = await sb.auth.signInWithPassword({ email: em, password: p1.value });
      p1.value = p2.value = ""; ctx.pw = null; ctx.link = null; toast("Passwort gespeichert");
      if (re.error) return showLogin("", null, "Passwort gespeichert – bitte mit dem neuen Passwort anmelden.");
      afterAuth(ctx);
    } catch (e) { busy = false; showErr(err, "Passwort nicht geändert: " + e.message + (viaLink && /Aktuelles Passwort/i.test(e.message) ? " – der Link ist älter als 1 Stunde. Bitte abmelden, E-Mail-Adresse eingeben und „Passwort vergessen?“ nutzen." : "")); }
  };
  osShow("auth", h("div", { class: "auth-wrap", "data-a": "screen-setpw" }, authHd(viaLink ? "Eigenes Passwort festlegen" : "Passwort ändern (Pflicht)"),
    h("div", { class: "auth-card" }, h("h2", null, viaLink ? "Willkommen" + (ME && ME.vorname ? ", " + ME.vorname : "") + " – bitte eigenes Passwort festlegen" : "Startpasswort muss geändert werden"),
      h("p", { class: "small" }, "Mindestens 10 Zeichen, Buchstaben und Ziffern, nicht die Personalnummer. Das Passwort wird nur verschlüsselt auf dem Anmeldeserver gespeichert."),
      h("div", { class: "form", style: "grid-template-columns:1fr 1fr" }, cur ? fldI("Bisheriges Passwort", cur) : null, fldI("Neues Passwort", p1), fldI("Neues Passwort wiederholen", p2)), err),
    h("div", { class: "auth-foot" }, h("div", { class: "row" }, h("button", { class: "tbtn ok", "data-a": "pw-save", onclick: submit }, "Passwort speichern")),
      h("button", { class: "tbtn danger", "data-a": "auth-logout", onclick: () => logout(true) }, "Abbrechen / Abmelden"))));
}

/* Sperrbildschirm: Inaktivität, App-Neustart, Seite neu geladen. Entsperren per Schnell-PIN (max. 3 Versuche) oder Passwort. */
function showLock(reason, session) {
  if (!sb) return showLogin();
  locked = true; stopCam();
  const err = authErr(), pin = getPin();
  const usePin = !!(pin && pinTries < 3 && SESSION);
  const inp = h("input", { type: "password", "data-f": usePin ? "lock-pin" : "lock-pw", inputmode: usePin ? "numeric" : null, autocomplete: usePin ? "off" : "current-password", maxlength: "72", onkeydown: (e) => { if (e.key === "Enter") submit(); } });
  const who = ME ? uName(ME) : session ? session.user.email.replace(SYN_DOMAIN, "") : "";
  const submit = async () => {
    if (usePin) {
      if ((await hashPin(inp.value, pin.salt)) === pin.hash) { inp.value = ""; locked = false; pinTries = 0; markActive(); osClear(true); render(); return; }
      pinTries++; inp.value = "";
      if (pinTries >= 3) { sessionStorage.removeItem(PINKEY); return showLock("3 Fehlversuche – bitte Passwort eingeben."); }
      return showErr(err, "PIN falsch (" + (3 - pinTries) + " Versuche).");
    }
    if (navigator.onLine === false) return showErr(err, "Entsperren per Passwort nur online möglich.");
    const email = (ME && ME.email) || (session && session.user.email);
    const r = await sb.auth.signInWithPassword({ email, password: inp.value }); inp.value = "";
    if (r.error) return showErr(err, /banned/i.test(r.error.message) ? "Konto gesperrt." : "Passwort falsch.");
    afterAuth({ unlock: !!SESSION, pw: null });
  };
  osShow("auth", h("div", { class: "auth-wrap", "data-a": "screen-lock" }, authHd("Gesperrt"),
    h("div", { class: "auth-card" }, h("h2", null, "🔒 " + (who || "Sitzung")), h("p", { class: "small" }, reason || "Gerät gesperrt."),
      fldI(usePin ? "Schnell-PIN (nur diese Sitzung)" : "Passwort", inp), err),
    h("div", { class: "auth-foot" }, h("div", { class: "row" }, h("button", { class: "tbtn ok", "data-a": "unlock", onclick: submit }, "Entsperren")),
      h("button", { class: "tbtn danger", "data-a": "auth-logout", onclick: () => logout(true) }, "Abmelden"))));
  setTimeout(() => inp.focus(), 50);
}
function setSessionPin() {
  const a = h("input", { type: "password", inputmode: "numeric", maxlength: "8", "data-f": "pin1" }), b = h("input", { type: "password", inputmode: "numeric", maxlength: "8", "data-f": "pin2" });
  modal("Schnell-PIN für diese Sitzung", h("div", null, h("p", { class: "small" }, "4–8 Ziffern. Gilt nur, solange diese Sitzung (dieser Tab) läuft – nach Abmelden, Schließen oder 3 Fehlversuchen ist wieder das Passwort nötig. Gespeichert wird nur ein gesalzener Hash."), h("div", { class: "form" }, fldI("PIN", a), fldI("PIN wiederholen", b))), [
    { t: "Abbr." },
    { t: "PIN entfernen", a: "pin-clear", fn: () => { sessionStorage.removeItem(PINKEY); toast("Schnell-PIN entfernt"); render(); } },
    { t: "Speichern", cls: "ok", a: "pin-save", fn: () => {
      if (!/^\d{4,8}$/.test(a.value)) { toast("PIN: 4–8 Ziffern"); return false; }
      if (a.value !== b.value) { toast("PINs stimmen nicht überein"); return false; }
      const salt = randHex(16), v = a.value; hashPin(v, salt).then((hh) => { sessionStorage.setItem(PINKEY, JSON.stringify({ salt, hash: hh })); pinTries = 0; toast("Schnell-PIN gesetzt"); render(); });
    } }]);
}

/* Tageseinstellungen / Besatzung – erscheint nach jeder Anmeldung (vgl. GA Kap. 3.4.12 / 4.1). Fahrzeuge und Kolleg/innen aus der Cloud. */
function showCrew(opts) {
  opts = opts || {};
  const me = curUser(); if (!me) return showLogin();
  const vehNames = DIR.vehicles.length ? DIR.vehicles.map((v) => v.funkruf) : VEHICLES_FALLBACK;
  const st = opts.state || (() => {
    const ids = Object.assign({}, S.crew.ids || {});
    Object.keys(ids).forEach((k) => { if (ids[k] && !uById(ids[k])) ids[k] = ""; });
    if (opts.start && ![ids.beifahrer, ids.fahrer, ids.praktikant, ids.notarzt].includes(me.id)) { if (me.qual === "NA") ids.notarzt = me.id; else if (me.role === "user") ids.beifahrer = me.id; }
    const today = S.vchecks.some((c) => fmtD(c.t) === fmtD(Date.now()));
    return { fahrzeug: S.crew.fahrzeug && vehNames.includes(S.crew.fahrzeug) ? S.crew.fahrzeug : vehNames[0] || "", wache: S.crew.wache || me.wache || "", ids, schicht: opts.start || !S.crew.schicht ? fmtHM(Date.now()) : S.crew.schicht, vcheck: !!opts.start && !today && me.role === "user" };
  })();
  const err = authErr();
  const dl = h("datalist", { id: "vehlist" }, vehNames.map((v) => h("option", { value: v })));
  const roles = [["beifahrer", "Beifahrer/in – Transportführer/in *", true], ["fahrer", "Fahrer/in *", true], ["praktikant", "Praktikant/in / 3. Person", false], ["notarzt", "Notärztin / Notarzt", false]];
  const people = [me].concat(DIR.profiles.filter((u) => u.id !== me.id && u.role !== "superadmin"));
  const sel = ([k, , req]) => h("select", { "data-f": "crew-" + k, onchange: (e) => (st.ids[k] = e.target.value) },
    h("option", { value: "" }, req ? "– bitte wählen –" : "– niemand –"),
    people.map((u) => h("option", { value: u.id, selected: st.ids[k] === u.id ? true : null }, uName(u) + " · " + u.pnr + (u.id === me.id ? " ← angemeldet" : ""))));
  const finish = (cloud) => {
    const ids = st.ids, nm = (id) => (id ? uName(uById(id)) : "");
    Object.assign(S.crew, { fahrzeug: st.fahrzeug.trim(), wache: st.wache.trim(), beifahrer: nm(ids.beifahrer), fahrer: nm(ids.fahrer), praktikant: nm(ids.praktikant), notarzt: nm(ids.notarzt), ids: Object.assign({}, ids), schicht: st.schicht, angemeldet: uName(me) });
    if (cloud) {
      const members = ["beifahrer", "fahrer", "praktikant", "notarzt"].filter((k) => ids[k]).map((k) => ({ user_id: ids[k], funktion: k }));
      if (!members.some((m) => m.user_id === me.id)) members.push({ user_id: me.id, funktion: "praktikant" });
      const veh = DIR.vehicles.find((v) => v.funkruf === S.crew.fahrzeug);
      const sig = S.crew.fahrzeug + "|" + members.map((m) => m.user_id + ":" + m.funktion).sort().join(",") + "|" + fmtD(Date.now());
      if (!S.cloud || S.cloud.sig !== sig) { const id = uuid(); S.cloud = { crewId: id, sig, pending: { id, vehicle_id: veh ? veh.id : null, fahrzeug: S.crew.fahrzeug, members: members.map((m) => Object.assign({ crew_id: id }, m)) } }; }
      S.missions.forEach((m) => { if (!(m._sync && m._sync.rid)) { m._sync = m._sync || {}; m._sync.crew = S.cloud.crewId; } });
    }
    const p = P(); if (!p.closed) p.forms.crew = Object.assign({}, p.forms.crew || {}, { fahrzeug: S.crew.fahrzeug, wache: S.crew.wache, beifahrer: S.crew.beifahrer, fahrer: S.crew.fahrer, praktikant: S.crew.praktikant, notarzt: S.crew.notarzt });
    logSys((opts.start ? "Schichtbeginn " + st.schicht + " – " : "Tageseinstellungen – ") + "Besatzung: " + [S.crew.fahrzeug, S.crew.beifahrer, S.crew.fahrer, S.crew.praktikant, S.crew.notarzt].filter(Boolean).join(", "));
    saveNow(); osClear(true); scheduleSync(300);
    if (opts.start) V = [{ t: "home" }];
    if (st.vcheck) go({ t: "tool", tool: "vcheck" }, true); else if (opts.start) render(); else home();
    toast(opts.start ? "Angemeldet: " + uName(me) + " (" + ROLE_L[me.role] + ")" : "Tageseinstellungen übernommen");
  };
  const submit = () => {
    const ids = st.ids;
    if (!st.fahrzeug.trim()) return showErr(err, "Bitte Fahrzeug / Funkrufname angeben.");
    if (!ids.beifahrer || !ids.fahrer) return showErr(err, "Bitte Beifahrer/in (Transportführer/in) und Fahrer/in auswählen.");
    const used = ["beifahrer", "fahrer", "praktikant", "notarzt"].map((k) => ids[k]).filter(Boolean);
    if (new Set(used).size !== used.length) return showErr(err, "Eine Person kann nur eine Funktion in der Besatzung haben.");
    finish(true);
  };
  const tin = (k, attrs) => h("input", Object.assign({ "data-f": "crew-" + k, value: st[k], maxlength: "60", oninput: (e) => (st[k] = e.target.value) }, attrs || {}));
  osShow("auth", h("div", { class: "auth-wrap", "data-a": "screen-crew" }, authHd("Tageseinstellungen – Besatzung"),
    h("div", { class: "auth-card" }, h("h2", null, "Besatzung für alle folgenden Einsätze"),
      h("div", { class: "form" }, fldI("Fahrzeug / Funkrufname *", tin("fahrzeug", { list: "vehlist", autocomplete: "off" })), dl, fldI("Wache", tin("wache")),
        roles.map((r) => fldI(r[1], sel(r))), fldI("Schichtbeginn", tin("schicht", { type: "time" }))),
      h("label", { class: "row", style: "margin-top:8px;gap:8px;align-items:center" }, h("input", { type: "checkbox", "data-f": "crew-vcheck", checked: st.vcheck ? true : null, style: "width:24px;height:24px", onchange: (e) => (st.vcheck = e.target.checked) }), "Fahrzeugcheck zu Schichtbeginn durchführen"),
      h("div", { class: "crewline" }, "Angemeldet: ", h("b", null, uName(me)), " · Pers.-Nr. " + me.pnr + " · " + ROLE_L[me.role] + (DIR.profiles.length ? "" : " · (Kollegenliste offline nicht verfügbar)")), err),
    h("div", { class: "auth-foot" }, h("div", { class: "row" }, h("button", { class: "tbtn ok", "data-a": "crew-ok", onclick: submit }, "OK"),
      me.role !== "user" ? h("button", { class: "tbtn", "data-a": "crew-skip", onclick: () => { st.vcheck = false; finish(false); } }, "Ohne Fahrzeug (Verwaltung)") : null,
      opts.start ? null : h("button", { class: "tbtn", "data-a": "crew-cancel", onclick: () => osClear() }, "Abbrechen")),
      h("button", { class: "tbtn danger", "data-a": "auth-logout", onclick: () => logout(true) }, "Abmelden"))));
}
async function endSession(why) {
  const u = ME;
  if (SESSION) { try { await Promise.race([syncNow(), new Promise((r) => setTimeout(r, 4000))]); } catch (e) {} }
  if (u) { logSys(why + ": " + uName(u)); stashMissions(); }
  try { sessionStorage.removeItem(PINKEY); } catch (e) {}
  SESSION = null; ME = null; S.admin = false; locked = false; ADMIN_UI = false; DIR = { profiles: [], vehicles: [] }; S.cloud = null; S.owner = null; S.crew = Object.assign({}, S.crew, { ids: {} });
  if (sb) { try { await sb.auth.signOut({ scope: "local" }); } catch (e) {} }
  saveNow();
  return u;
}
function logout(noConfirm) {
  const go_ = async () => { stopCam(); const u = await endSession("Abmeldung"); V = [{ t: "home" }]; render(); showLogin(u && !String(u.pnr).includes("@") ? u.pnr : "", "Abgemeldet. Nächste/r Benutzer/in bitte anmelden."); };
  if (noConfirm) return go_();
  const n = pendingCount();
  confirmBox("Abmelden / Benutzerwechsel", "„" + uName(curUser()) + "“ abmelden?" + (n ? " " + n + " Einsatz/Einsätze sind noch nicht in der Cloud – sie bleiben auf diesem Gerät für Sie zwischengespeichert und werden bei der nächsten Anmeldung synchronisiert." : " Alle Einsätze sind in der Cloud gespeichert."), "Abmelden", go_);
}
function shutdownMenu() {
  modal("Herunterfahren / Neustart", h("p", null, "Alle Daten bleiben gespeichert. Nach dem Start ist eine neue Anmeldung nötig."), [
    { t: "Abbr." },
    { t: "App neu starten", a: "sd-app", fn: () => { setTimeout(restartApp, 0); } },
    { t: "Gerät neu starten", cls: "primary", a: "sd-reboot", fn: () => { setTimeout(() => shutdown(true), 0); } },
    { t: "⏻ Herunterfahren", cls: "danger", a: "sd-off", fn: () => { setTimeout(() => shutdown(false), 0); } }]);
}

/* ================= Start ================= */
const _render = render;
render = function () { const t = top(); if (!(t.t === "tool" && t.tool === "camera")) stopCam(); _render(); };
if (S.settings.medtech) { S.settings.medtech = false; }
layout();
render();
bootDevice();
setInterval(() => { const c = document.querySelector("#statusbar .clock"); if (c) c.textContent = fmtT(Date.now()); }, 1000);
setInterval(() => { S.battery = S.battery.map((b, i) => (b <= 8 ? 100 : b - (i === 0 ? 1 : 0))); const sb = document.getElementById("statusbar"); if (sb) sb.replaceWith(renderStatus()); save(); }, 90000);
if (!window.__RPT_STANDALONE && /^https?:$/.test(location.protocol) && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
/* Tastatur (PC): Esc schließt den obersten Dialog bzw. geht eine Ebene zurück; Alt+← = zurück */
document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.isComposing) return;
  const back1 = () => { if (osEl || !SESSION) return false; if (ADMIN_UI && top().t === "adm") return false; if (V.length > 1) { back(); return true; } return false; };
  if (e.key === "Escape") {
    const m = [...document.querySelectorAll(".modal-bg")].pop();
    if (m) { e.preventDefault(); m._close ? m._close() : m.remove(); return; }
    const sb_ = document.querySelector(".standby"); if (sb_) { sb_.remove(); return; }
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { a.blur(); return; }
    if (back1()) e.preventDefault();
  } else if (e.key === "ArrowLeft" && e.altKey) { if (back1()) e.preventDefault(); }
});
window.__rpt = { get S() { return S; }, get V() { return V; }, back, render, go, home, INDEX, missing: () => missing(P()), P: () => P(), get session() { return SESSION && Object.assign({ name: uName(curUser()), role: ME.role, pnr: ME.pnr }, SESSION); }, get locked() { return locked; }, get sync() { return Object.assign({ pending: pendingCount() }, SYNC); }, syncNow, isAdm, lock: () => showLock("Test"), get sb() { return sb; }, layout, setView, sha256js, sha256hex, installed: isInstalled, get canPrompt() { return !!instPrompt; } };
})();
