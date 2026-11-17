'use strict';
/* 筋トレ管理 PWA - 状態・保存・計算 */
const KEY = 'kintore.v1';
let S = null;

/* ---------- 基本ヘルパー ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2,'0');
const ymd = d => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); };
const pd = s => { const a = s.split('-').map(Number); return new Date(a[0], a[1]-1, a[2]); };
const addD = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
const dow = s => pd(s).getDay();
const WD = ['日','月','火','水','木','金','土'];
const fmtMD = s => { const d = pd(s); return (d.getMonth()+1) + '/' + d.getDate() + '(' + WD[d.getDay()] + ')'; };
const diffDays = (a, b) => Math.round((pd(a) - pd(b)) / 864e5);
const num = (v, def) => { const n = parseFloat(v); return isFinite(n) ? n : (def === undefined ? 0 : def); };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmtN = n => Math.round(n).toLocaleString('ja-JP');
const fmtKg = n => String(Math.round(n * 10) / 10);
const fmtDur = ms => { const s = Math.max(0, Math.floor(ms/1000)); const h = Math.floor(s/3600), m = Math.floor(s%3600/60), ss = s%60; return h ? h + ':' + pad(m) + ':' + pad(ss) : pad(m) + ':' + pad(ss); };
const fmtMin = min => { const h = Math.floor(min/60), m = Math.round(min%60); return h ? h + '時間' + m + '分' : m + '分'; };
const fmtClock = sec => Math.floor(sec/60) + ':' + pad(Math.round(sec%60));
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/* ---------- 状態 ---------- */
function defState() {
  return {
    v: 1, created: ymd(),
    settings: {
      theme: 'auto', countRest: true, restAfter: 4,
      partColors: Object.assign({}, DEF_COLORS),
      proteinGoal: 120, targetWeight: 0, targetFat: 0,
      remindTime: '19:00', remindDays: [1,3,5], defaultRest: 120, themeColor: 'orange', weekGoal: 3, height: 0, hero: ['streak', 'goal', 'reco'], goalMode: 'w', homeOrder: HOME_IDS.slice(), homeHide: [],
      device: 'iPhone', lastSaved: 0, lastBackup: 0, hideInstall: false
    },
    custom: [], exOv: {}, fav: {}, work: {}, rest: {}, body: {}, food: {}, foodPreset: [],
    goals: {}, routine: {}, active: null, timer: null, demo: {}, pcOther: {}
  };
}
function cleanSet(s) {
  s = s || {};
  const rpe = num(s.rpe, 0);
  const o = { kg: Math.max(0, num(s.kg)), reps: Math.max(0, num(s.reps)), rpe: (rpe >= 1 && rpe <= 10) ? rpe : null, done: !!s.done };
  if (s.ts) o.ts = num(s.ts);
  return o;
}
function cleanWork(w) {
  if (!isObj(w)) return null;
  const entries = Array.isArray(w.entries) ? w.entries.filter(e => e && typeof e.ex === 'string' && Array.isArray(e.sets)).map(e => ({ ex: e.ex, sets: e.sets.map(cleanSet) })) : [];
  const o = { start: w.start ? num(w.start) : null, end: w.end ? num(w.end) : null, entries };
  if (w.demo) o.demo = true;
  return o;
}
function fixState(x) {
  const o = defState();
  if (!isObj(x)) return o;
  if (typeof x.created === 'string' && DATE_RE.test(x.created)) o.created = x.created;
  const xs = isObj(x.settings) ? x.settings : {};
  for (const k of Object.keys(o.settings)) {
    if (k === 'partColors') {
      const pc = isObj(xs.partColors) ? xs.partColors : {};
      for (const p of Object.keys(DEF_COLORS)) if (typeof pc[p] === 'string' && HEX_RE.test(pc[p])) o.settings.partColors[p] = pc[p];
    } else if (k === 'remindDays') {
      if (Array.isArray(xs.remindDays)) o.settings.remindDays = xs.remindDays.map(Number).filter(n => n >= 0 && n <= 6);
    } else if (typeof xs[k] === typeof o.settings[k]) {
      o.settings[k] = xs[k];
    }
  }
  if (!['auto','dark','light'].includes(o.settings.theme)) o.settings.theme = 'auto';
  if (!THEMES[o.settings.themeColor]) o.settings.themeColor = 'orange';
  if (!['w', 'f'].includes(o.settings.goalMode)) o.settings.goalMode = 'w';
  { const hv = Array.isArray(o.settings.hero) ? o.settings.hero.slice(0, 3) : [], d0 = ['streak', 'goal', 'reco'];
    for (let i = 0; i < 3; i++) if (!HERO_IDS.includes(hv[i]) || hv.indexOf(hv[i]) !== i) hv[i] = null;
    for (let i = 0; i < 3; i++) if (!hv[i]) hv[i] = d0.concat(HERO_IDS).find(k => !hv.includes(k));
    o.settings.hero = hv; }
  o.settings.height = (o.settings.height >= 100 && o.settings.height <= 250) ? Math.round(o.settings.height * 10) / 10 : 0;
  o.settings.weekGoal = clamp(Math.round(num(o.settings.weekGoal, 3)), 1, 7);
  const ho = Array.isArray(o.settings.homeOrder) ? o.settings.homeOrder.filter((k, i, a) => HOME_IDS.includes(k) && a.indexOf(k) === i) : [];
  HOME_IDS.forEach(k => { if (!ho.includes(k)) ho.push(k); });
  o.settings.homeOrder = ho;
  o.settings.homeHide = Array.isArray(o.settings.homeHide) ? o.settings.homeHide.filter((k, i, a) => HOME_IDS.includes(k) && a.indexOf(k) === i) : [];
  o.settings.restAfter = clamp(Math.round(num(o.settings.restAfter, 4)), 2, 10);
  o.settings.defaultRest = clamp(Math.round(num(o.settings.defaultRest, 120)), 15, 600);
  if (!/^\d{2}:\d{2}$/.test(o.settings.remindTime)) o.settings.remindTime = '19:00';
  if (Array.isArray(x.custom)) o.custom = x.custom.filter(e => e && typeof e.id === 'string' && typeof e.name === 'string' && e.name).map(e => ({
    id: e.id, name: e.name.slice(0, 40),
    parts: (Array.isArray(e.parts) ? e.parts : []).filter(p => PN[p]).slice(0, 3).concat([]).length ? e.parts.filter(p => PN[p]).slice(0, 3) : ['full'],
    equip: EQN[e.equip] ? e.equip : 'oth', type: ['wr','reps','time'].includes(e.type) ? e.type : 'wr',
    rest: clamp(Math.round(num(e.rest, 90)), 15, 600), custom: true
  }));
  if (isObj(x.exOv)) for (const k of Object.keys(x.exOv)) if (isObj(x.exOv[k]) && x.exOv[k].rest > 0) o.exOv[k] = { rest: clamp(Math.round(num(x.exOv[k].rest)), 15, 600) };
  if (isObj(x.fav)) for (const k of Object.keys(x.fav)) if (x.fav[k]) o.fav[k] = true;
  if (isObj(x.work)) for (const d of Object.keys(x.work)) if (DATE_RE.test(d)) { const w = cleanWork(x.work[d]); if (w) o.work[d] = w; }
  if (isObj(x.rest)) for (const d of Object.keys(x.rest)) if (DATE_RE.test(d) && x.rest[d]) o.rest[d] = 1;
  if (isObj(x.body)) for (const d of Object.keys(x.body)) if (DATE_RE.test(d) && isObj(x.body[d])) {
    const b = { w: Math.max(0, num(x.body[d].w)), f: Math.max(0, num(x.body[d].f)) };
    if (x.body[d].demo) b.demo = true;
    o.body[d] = b;
  }
  if (isObj(x.food)) for (const d of Object.keys(x.food)) if (DATE_RE.test(d) && Array.isArray(x.food[d])) {
    o.food[d] = x.food[d].filter(f => f && typeof f.name === 'string').map(f => { const r = { id: String(f.id || Math.random().toString(36).slice(2,8)), t: String(f.t || ''), name: f.name.slice(0, 30), g: Math.max(0, num(f.g)) }; if (f.demo) r.demo = true; return r; });
  }
  if (Array.isArray(x.foodPreset)) o.foodPreset = x.foodPreset.filter(f => f && typeof f.name === 'string' && num(f.g) > 0).map(f => ({ name: f.name.slice(0, 30), g: num(f.g) }));
  if (isObj(x.goals)) for (const k of Object.keys(x.goals)) if (num(x.goals[k]) > 0) o.goals[k] = num(x.goals[k]);
  if (isObj(x.routine)) for (let i = 0; i < 7; i++) {
    const r = x.routine[i];
    if (!isObj(r)) continue;
    if (r.rest) o.routine[i] = { rest: true };
    else o.routine[i] = { name: String(r.name || '').slice(0, 20), parts: (Array.isArray(r.parts) ? r.parts : []).filter(p => PN[p]), exIds: (Array.isArray(r.exIds) ? r.exIds : []).filter(s => typeof s === 'string') };
  }
  if (isObj(x.active) && typeof x.active.d === 'string' && DATE_RE.test(x.active.d)) o.active = { d: x.active.d };
  if (isObj(x.timer) && x.timer.end > 0 && x.timer.total > 0) o.timer = { end: num(x.timer.end), total: num(x.timer.total) };
  if (isObj(x.demo)) o.demo = { routine: !!x.demo.routine, goals: !!x.demo.goals };
  if (isObj(x.pcOther)) o.pcOther = x.pcOther;
  return o;
}
function loadState() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = null; }
  S = fixState(raw);
  _exCache = null;
}
function save() {
  S.settings.lastSaved = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { if (typeof toast === 'function') toast('保存できませんでした(容量不足の可能性)'); }
}

/* ---------- 種目 ---------- */
let _exCache = null;
function allEx() { return BUILTIN.concat(S.custom); }
function exMap() { if (!_exCache) { _exCache = {}; allEx().forEach(e => { _exCache[e.id] = e; }); } return _exCache; }
function exById(id) { return exMap()[id] || null; }
function entryEx(e) { return exById(e.ex) || { id: e.ex, name: '(削除された種目)', parts: ['full'], equip: 'oth', type: 'wr', rest: 90, custom: true }; }
function exRest(ex) { return (S.exOv[ex.id] && S.exOv[ex.id].rest) || ex.rest || S.settings.defaultRest; }
function pcol(p) { return S.settings.partColors[p] || DEF_COLORS[p] || '#888888'; }
function exUsage() {
  const u = {};
  for (const d in S.work) for (const e of S.work[d].entries) if (e.sets.some(s => s.done)) u[e.ex] = (u[e.ex] || 0) + 1;
  return u;
}

/* ---------- 計算 ---------- */
function e1rm(kg, reps) { if (!(kg > 0 && reps > 0)) return 0; return reps === 1 ? kg : kg * (1 + reps / 30); }
const isDone = s => !!s.done;
function wDone(w) { return !!(w && w.entries && w.entries.some(e => e.sets.some(isDone))); }
function lastSetTs(w) { let t = 0; for (const e of w.entries) for (const s of e.sets) if (s.done && s.ts > t) t = s.ts; return t; }
function elapsedMs(w) {
  if (!w || !w.start) return 0;
  let end = w.end;
  if (!end) { const lt = lastSetTs(w); end = (Date.now() - w.start > 6 * 3600e3) ? (lt || w.start) : Date.now(); }
  return Math.max(0, end - w.start);
}
function dayStats(d) {
  const r = { vol: 0, ex: 0, sets: 0, parts: [], rpe: null, min: 0 };
  const w = S.work[d];
  if (!w) return r;
  let rs = 0, rn = 0;
  for (const e of w.entries) {
    const ex = entryEx(e), ds = e.sets.filter(isDone);
    if (!ds.length) continue;
    r.ex++; r.sets += ds.length;
    for (const s of ds) { if (ex.type === 'wr') r.vol += (s.kg || 0) * (s.reps || 0); if (s.rpe) { rs += s.rpe; rn++; } }
    if (!r.parts.includes(ex.parts[0])) r.parts.push(ex.parts[0]);
  }
  r.rpe = rn ? rs / rn : null;
  r.min = elapsedMs(w) / 60000;
  return r;
}
function e1Series(exId) {
  const out = [];
  for (const d of Object.keys(S.work).sort()) {
    let best = 0;
    for (const e of S.work[d].entries) if (e.ex === exId) for (const s of e.sets) if (s.done) best = Math.max(best, e1rm(s.kg, s.reps));
    if (best > 0) out.push({ d, v: best });
  }
  return out;
}
function bestE1(exId, skip) {
  let b = 0;
  for (const d in S.work) for (const e of S.work[d].entries) if (e.ex === exId) for (const s of e.sets) if (s.done && s !== skip) b = Math.max(b, e1rm(s.kg, s.reps));
  return b;
}
function lastSession(exId, before) {
  const ds = Object.keys(S.work).filter(d => d < before).sort().reverse();
  for (const d of ds) {
    const e = S.work[d].entries.find(x => x.ex === exId && x.sets.some(isDone));
    if (e) return { d, sets: e.sets.filter(isDone) };
  }
  return null;
}
function pbEvents() {
  const ev = [], byEx = {};
  for (const d of Object.keys(S.work).sort()) {
    for (const e of S.work[d].entries) {
      const ex = exById(e.ex); if (ex && ex.type !== 'wr') continue;
      let dayBest = 0;
      for (const s of e.sets) if (s.done) dayBest = Math.max(dayBest, e1rm(s.kg, s.reps));
      if (dayBest <= 0) continue;
      const best = byEx[e.ex] || 0;
      if (best > 0 && dayBest > best + 0.01) ev.push({ ex: e.ex, d, v: dayBest, prev: best });
      byEx[e.ex] = Math.max(best, dayBest);
    }
  }
  return ev;
}

/* ---------- 連続日数・休養日 ---------- */
function isRestDay(d) { if (S.rest[d]) return true; const r = S.routine[dow(d)]; return !!(r && r.rest); }
function dayState(d) {
  if (wDone(S.work[d])) return 'w';
  if (S.settings.countRest && d >= S.created && d <= ymd() && isRestDay(d)) return 'r';
  return null;
}
function streak() {
  let d = ymd();
  if (!dayState(d)) d = addD(d, -1);
  let n = 0;
  while (dayState(d)) { n++; d = addD(d, -1); if (n > 3650) break; }
  return n;
}
function trainStreak() {
  const t = ymd();
  let d = wDone(S.work[t]) ? t : addD(t, -1), n = 0;
  while (wDone(S.work[d])) { n++; d = addD(d, -1); if (n > 400) break; }
  return n;
}

/* ---------- 回復と休養日の提案 ---------- */
function lastTrainedTs(part) {
  let best = 0;
  for (const d of Object.keys(S.work)) for (const e of S.work[d].entries) {
    if (entryEx(e).parts[0] !== part) continue;
    for (const s of e.sets) if (s.done) { const ts = s.ts || (pd(d).getTime() + 18 * 3600e3); if (ts > best) best = ts; }
  }
  return best;
}
function recovery() {
  const out = {}, now = Date.now();
  for (const p of Object.keys(PN)) {
    const ts = lastTrainedTs(p);
    if (!ts) { out[p] = { st: 'ok', h: null, rem: 0, never: true, days: null }; continue; }
    const h = (now - ts) / 3600e3, need = REC_H[p], r = h / need;
    out[p] = { st: r < 0.5 ? 'bad' : r < 1 ? 'warn' : 'ok', h, rem: Math.max(0, need - h), days: Math.floor(h / 24) };
  }
  return out;
}
const remTxt = h => h <= 0 ? 'OK' : h < 24 ? 'あと半日' : 'あと' + Math.ceil(h / 24) + '日';
function suggest() {
  const t = ymd(), rec = recovery(), ts = trainStreak();
  const ns = S.settings.countRest ? '休養日も連続日数に数えられます。' : '';
  if (S.rest[t]) return { k: 'rest', title: '今日は休養日に設定済み', body: 'しっかり回復する日です。' + ns, btn: 'unrest' };
  if (wDone(S.work[t])) return { k: 'info', title: '今日はトレーニング済み', body: 'お疲れさまです。食事と睡眠で回復しましょう。' };
  const main = MAIN_PARTS;
  const ready = main.filter(p => rec[p].st === 'ok');
  const tired = main.filter(p => rec[p].st === 'bad').length;
  const r = S.routine[dow(t)];
  if (ts >= S.settings.restAfter) return { k: 'rest', title: '今日は休養日がおすすめ', body: ts + '日連続でトレーニングしています。休むことも成長の一部です。' + ns, btn: 'rest' };
  if (ready.length <= 1 && tired >= 3) return { k: 'rest', title: '今日は休養日がおすすめ', body: '疲労が残っている部位が多めです。今日は回復を優先しましょう。' + ns, btn: 'rest' };
  if (r && r.rest) return { k: 'rest', title: 'ルーティン上は休養日です', body: '予定どおり休むのもトレーニングです。' + ns, btn: 'rest' };
  const sorted = ready.slice().sort((a, b) => (rec[b].h == null ? 1e9 : rec[b].h) - (rec[a].h == null ? 1e9 : rec[a].h)).slice(0, 2);
  if (!sorted.length) return { k: 'info', title: '全体的にまだ回復中', body: '軽めのメニューか、休養日にするのがおすすめです。', btn: 'rest' };
  return { k: 'train', title: '今日のおすすめ:' + sorted.map(p => PN[p]).join('・'), body: sorted.map(p => PN[p] + (rec[p].never ? '(まだ記録なし)' : '(' + rec[p].days + '日ぶり)')).join('、') + 'は回復済みの目安です。', parts: sorted };
}

/* ---------- 期間集計 ---------- */
function rangeDays(a, b) { const out = []; let d = a, n = 0; while (d <= b && n < 800) { out.push(d); d = addD(d, 1); n++; } return out; }
function rangeStats(a, b) {
  const days = rangeDays(a, b);
  let vol = 0, sets = 0, min = 0, n = 0, rs = 0, rn = 0;
  const bal = {};
  for (const d of days) {
    const w = S.work[d];
    if (!wDone(w)) continue;
    n++;
    const st = dayStats(d);
    vol += st.vol; sets += st.sets; min += st.min;
    for (const e of w.entries) {
      const ex = entryEx(e), c = e.sets.filter(isDone);
      if (!c.length) continue;
      bal[ex.parts[0]] = (bal[ex.parts[0]] || 0) + c.length;
      for (const s of c) if (s.rpe) { rs += s.rpe; rn++; }
    }
  }
  return { days, n, vol, sets, min, bal, rpe: rn ? rs / rn : null };
}

/* ---------- 食事・体組成 ---------- */
function foodTotal(d) { return (S.food[d] || []).reduce((a, x) => a + x.g, 0); }
function latestBody(k) { const ds = Object.keys(S.body).filter(d => S.body[d][k] > 0).sort(); return ds.length ? S.body[ds[ds.length - 1]][k] : null; }
function proteinGoal() { const w = latestBody('w'); return w ? Math.round(w * 1.8) : S.settings.proteinGoal; }

/* ---------- セッション操作 ---------- */
function ensureDay(d) { if (!S.work[d]) S.work[d] = { start: null, end: null, entries: [] }; return S.work[d]; }
function addEntry(d, exId, prefill) {
  const w = ensureDay(d);
  const ex0 = w.entries.find(e => e.ex === exId);
  if (ex0) return ex0;
  const ex = exById(exId);
  const last = lastSession(exId, d);
  let sets = [];
  if (prefill !== false && last) sets = last.sets.map(s => ({ kg: s.kg, reps: s.reps, rpe: null, done: false }));
  if (!sets.length) sets = [1, 2, 3].map(() => ({ kg: ex && ex.type === 'wr' ? (last ? last.sets[0].kg : 20) : 0, reps: ex && ex.type === 'time' ? 60 : 10, rpe: null, done: false }));
  const e = { ex: exId, sets };
  w.entries.push(e);
  return e;
}
function startSession(d) {
  const w = ensureDay(d), now = Date.now();
  if (!w.start) w.start = now; else if (w.end) w.start = now - Math.max(0, w.end - w.start);
  w.end = null; S.active = { d };
}
function cleanupEmptyDay(d) { const w = S.work[d]; if (w && !w.entries.length && !w.start) delete S.work[d]; }

/* ---------- デモデータ ---------- */
function seedDemo() {
  const today = ymd(), start = addD(today, -84);
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const r25 = v => Math.round(v / 2.5) * 2.5;
  if (!Object.keys(S.routine).length) {
    S.routine = {
      0: { rest: true },
      1: { name: '胸・腕', parts: ['chest','arm'], exIds: ['bench','x006','x040','x060'] },
      2: { name: '背中', parts: ['back'], exIds: ['deadlift','x027','x029','x030'] },
      3: { rest: true },
      4: { name: '脚', parts: ['leg'], exIds: ['squat','x088','x094'] },
      5: { name: '肩・腹', parts: ['sho','abs'], exIds: ['ohp','x052','x120'] },
      6: { name: '背中・腕', parts: ['back','arm'], exIds: ['x028','x029','x058'] }
    };
    S.demo.routine = true;
  }
  const byName = n => { const e = allEx().find(x => x.name === n); return e ? e.id : null; };
  const plan = {
    1: [['bench', 60, 1.0], [byName('ダンベルフライ'), 20, 0.4], [byName('ケーブルプッシュダウン'), 25, 0.5], [byName('ダンベルカール'), 12, 0.3]],
    2: [['deadlift', 90, 1.0], [byName('ラットプルダウン'), 45, 0.6], [byName('シーテッドケーブルロウ'), 40, 0.6]],
    4: [['squat', 80, 1.0], [byName('レッグプレス'), 120, 1.4], [byName('ルーマニアンデッドリフト'), 70, 0.8]],
    5: [['ohp', 35, 1.0], [byName('サイドレイズ'), 8, 0.2], [byName('クランチ'), 0, 0]],
    6: [[byName('ベントオーバーロウ'), 50, 0.8], [byName('ハンマーカール'), 12, 0.3], [byName('ケーブルカール'), 25, 0.4]]
  };
  for (let d = start; d < today; d = addD(d, 1)) {
    const p = plan[dow(d)];
    if (!p) continue;
    const wk = diffDays(d, start) / 7;
    if (rnd() < 0.12 && diffDays(today, d) > 9) continue;
    const base = pd(d).getTime() + (18 + rnd()) * 3600e3;
    let t = base;
    const entries = [];
    for (const [id, kg0, gain] of p) {
      if (!id) continue;
      const ex = exById(id);
      const kg = ex.type === 'wr' ? Math.max(0, r25(kg0 + wk * gain * 1.6)) : 0;
      const sets = [];
      for (let i = 0; i < 3 + (rnd() < 0.3 ? 1 : 0); i++) {
        t += (2 + rnd() * 1.5) * 60e3;
        sets.push({ kg: ex.type === 'wr' ? kg : 0, reps: ex.type === 'time' ? 45 : (ex.type === 'reps' ? 15 + Math.floor(rnd() * 5) : 8 + Math.floor(rnd() * 3) - (i > 1 ? 1 : 0)), rpe: [7, 7.5, 8, 8.5, 9][Math.floor(rnd() * 5)], done: true, ts: Math.round(t) });
      }
      entries.push({ ex: id, sets });
    }
    S.work[d] = { start: Math.round(base - 6 * 60e3), end: Math.round(t + 4 * 60e3), entries, demo: true };
  }
  for (let d = start, i = 0; d <= today; d = addD(d, 3), i++) {
    if (!S.body[d]) S.body[d] = { w: Math.round((74.2 - i * 0.065 + (rnd() - .5) * .3) * 10) / 10, f: Math.round((18 - i * 0.04 + (rnd() - .5) * .2) * 10) / 10, demo: true };
  }
  for (let i = 0; i < 7; i++) {
    const d = addD(today, -i);
    if (S.food[d]) continue;
    S.food[d] = [{ id: 'd' + i + 'a', t: '7:30', name: 'ゆで卵×2', g: 12, demo: true }, { id: 'd' + i + 'b', t: '12:10', name: '鶏むね肉150g', g: 35, demo: true }, { id: 'd' + i + 'c', t: '15:30', name: 'プロテイン', g: 20, demo: true }, { id: 'd' + i + 'd', t: '19:00', name: '納豆×3', g: 24 + (i % 3) * 8, demo: true }];
  }
  if (!Object.keys(S.goals).length) { S.goals = { bench: 100, squat: 140, deadlift: 160, ohp: 60 }; S.demo.goals = true; }
  if (!S.settings.targetWeight) S.settings.targetWeight = 70;
  save();
}
function removeDemo() {
  for (const d of Object.keys(S.work)) if (S.work[d].demo) delete S.work[d];
  for (const d of Object.keys(S.body)) if (S.body[d].demo) delete S.body[d];
  for (const d of Object.keys(S.food)) { S.food[d] = S.food[d].filter(f => !f.demo); if (!S.food[d].length) delete S.food[d]; }
  if (S.demo.routine) S.routine = {};
  if (S.demo.goals) S.goals = {};
  S.demo = {};
  S.active = null; S.timer = null;
  save();
}

/* ---------- グラフ期間・目標達成予測 ---------- */
function rangeFrom() { const t = ymd(); return V.rng === 'm1' ? addD(t, -29) : V.rng === 'm3' ? addD(t, -89) : '0000-01-01'; }
function predict(k, target) {
  const ds = Object.keys(S.body).filter(d => S.body[d][k] > 0).sort();
  if (!ds.length) return { st: 'none' };
  const last = ds[ds.length - 1], from = addD(last, -41);
  const pts = ds.filter(d => d >= from).map(d => ({ x: diffDays(d, last), y: S.body[d][k] }));
  const cur = pts[pts.length - 1].y;
  if (!(target > 0)) return { st: 'notarget', cur };
  if (Math.abs(cur - target) < 0.05) return { st: 'done', cur };
  if (pts.length < 3 || pts[pts.length - 1].x - pts[0].x < 7) return { st: 'few', cur };
  const n = pts.length, mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n;
  let nu = 0, de = 0; pts.forEach(p => { nu += (p.x - mx) * (p.y - my); de += (p.x - mx) * (p.x - mx); });
  const slope = de ? nu / de : 0, need = target - cur;
  if (Math.abs(slope) < 1e-4 || need * slope <= 0) return { st: 'away', cur, slope };
  const days = Math.ceil(need / slope);
  if (days > 1095) return { st: 'far', cur, slope };
  const date = addD(last, days);
  return { st: 'ok', cur, slope, date, left: diffDays(date, ymd()) };
}

/* ---------- 連続記録の履歴 ---------- */
function streakRuns() {
  const t = ymd(), ds = Object.keys(S.work).filter(d => wDone(S.work[d])).sort();
  let first = S.created; if (ds[0] && ds[0] < first) first = ds[0];
  const runs = []; let cur = null;
  for (let d = first, n = 0; d <= t && n < 4000; d = addD(d, 1), n++) {
    if (dayState(d)) { if (!cur) cur = { a: d, b: d, n: 0, w: 0 }; cur.b = d; cur.n++; if (dayState(d) === 'w') cur.w++; }
    else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  const y = addD(t, -1);
  runs.forEach(r => { r.now = r.b >= y; });
  return runs.reverse();
}
