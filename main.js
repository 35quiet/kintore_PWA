'use strict';
/* 筋トレ管理 PWA - 描画・操作・起動 */
function viewSum(sh) {
  const st = sh.st;
  let h = '<header class="hd"><span class="hs"></span><div class="ht"><b>お疲れさまでした</b></div><span class="hs"></span></header><div class="scroll"><div class="pad"><section class="card ctr sumc"><div class="trophy">' + ico('flame') + '</div><h2>' + fmtMD(sh.d) + ' のトレーニング完了</h2><div class="stats big"><div><b>' + st.ex + '</b><small>種目</small></div><div><b>' + st.sets + '</b><small>セット</small></div><div><b>' + fmtN(st.vol) + '</b><small>総ボリューム(kg)</small></div><div><b>' + (st.min ? Math.round(st.min) : '-') + '</b><small>分</small></div><div><b>' + (st.rpe ? st.rpe.toFixed(1) : '-') + '</b><small>平均RPE</small></div></div>';
  if (sh.pbs) h += '<p class="pbline">' + ico('star') + '自己ベスト更新 ' + sh.pbs + '件!</p>';
  h += '<p class="mut">連続 ' + streak() + ' 日</p><button class="btn pri big" data-a="close">ホームへ</button></section></div></div>';
  return h;
}
const SHEETS = { work: viewWorkout, pick: viewPick, body: viewBody, food: viewFood, goals: viewGoals, routine: viewRoutine, report: viewReport, exmgr: viewExMgr, exedit: viewExEdit, sum: viewSum, rm: viewRm, order: viewOrder, streak: viewStreak };
let _wl = null, _focus = null;

function applyTheme() {
  const t = S.settings.theme, r = document.documentElement, th = THEMES[S.settings.themeColor] || THEMES.orange;
  r.style.setProperty('--acc', th[1]); r.style.setProperty('--acc-b', th[2]);
  if (t === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#0e0f13' : '#f4f5f8';
}
function render() {
  const root = $('#root'); if (!root) return;
  const ms = root.querySelector('.main .scroll'); if (ms && !V._rt && !V._skip) V._ms = ms.scrollTop; V._skip = 0;
  const ss = root.querySelector('.sheet .scroll'); if (ss && V._rt) V._rt._sc = ss.scrollTop;
  const sh = topSh();
  let main = '';
  if (V.tab === 'home') main = viewHome(); else if (V.tab === 'hist') main = viewHist(); else if (V.tab === 'body') main = viewBody(true); else main = viewSettings();
  root.innerHTML = '<div class="main">' + main + tabbar() + '</div>' + (sh ? '<div class="sheet" role="dialog" aria-modal="true">' + SHEETS[sh.t](sh) + '</div>' : '');
  const ns = root.querySelector(sh ? '.sheet .scroll' : '.main .scroll');
  if (ns) ns.scrollTop = sh ? (sh._sc || 0) : (V._ms || 0);
  V._rt = sh;
  if (_focus) { const el = root.querySelector(_focus.sel); if (el) { el.focus(); try { el.setSelectionRange(_focus.pos, _focus.pos); } catch (e) {} } _focus = null; }
  applyTheme(); wakeSync();
}
async function wakeSync() {
  const want = topSh() && topSh().t === 'work' && S.active && S.active.d === topSh().d;
  try {
    if (want && !_wl && navigator.wakeLock) { _wl = await navigator.wakeLock.request('screen'); _wl.addEventListener('release', () => { _wl = null; }); }
    else if (!want && _wl) { await _wl.release(); _wl = null; }
  } catch (e) { _wl = null; }
}

/* ---------- 音 ---------- */
let _ac = null;
function unlockAudio() { try { if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)(); if (_ac.state === 'suspended') _ac.resume(); } catch (e) {} }
function beep(seq) {
  try {
    unlockAudio(); if (!_ac) return;
    let t = _ac.currentTime;
    for (const f of seq) { const o = _ac.createOscillator(), g = _ac.createGain(); o.frequency.value = f; o.connect(g); g.connect(_ac.destination); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.start(t); o.stop(t + 0.25); t += 0.2; }
  } catch (e) {}
}

/* ---------- PB 演出 ---------- */
function showPB(name, v, prev) {
  beep([660, 880, 1100]);
  try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch (e) {}
  const el = $('#pb'); if (!el) return;
  let c = '';
  for (let i = 0; i < 28; i++) c += '<i style="left:' + Math.round(Math.random() * 100) + '%;background:' + PALETTE[i % PALETTE.length] + ';animation-delay:' + (Math.random() * 0.5).toFixed(2) + 's;animation-duration:' + (1.6 + Math.random()).toFixed(2) + 's"></i>';
  el.innerHTML = '<div class="pbc" data-a="pbClose" role="alert">' + c + '<div class="pbb"><div class="pbt">' + ico('star') + '</div><b>自己ベスト更新!</b><span>' + esc(name) + '</span><em>推定1RM ' + fmtKg(prev) + ' → ' + fmtKg(v) + 'kg</em><small>タップで閉じる</small></div></div>';
  el.classList.add('on');
  clearTimeout(showPB._t); showPB._t = setTimeout(() => el.classList.remove('on'), 4200);
}

/* ---------- 休憩タイマー ---------- */
function startTimer(sec) { S.timer = { end: Date.now() + sec * 1000, total: sec }; save(); }
function endTimer(quiet) {
  S.timer = null; save();
  if (!quiet) { beep([880, 880, 1320]); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} toast('休憩終了。次のセットへ!'); }
  render();
}
setInterval(() => {
  if (S && S.timer) {
    const left = Math.ceil((S.timer.end - Date.now()) / 1000);
    if (left <= 0) { endTimer(false); return; }
    const a = $('#tleft'), f = $('#tfill');
    if (a) a.textContent = fmtClock(left);
    if (f) f.style.width = clamp((1 - left / S.timer.total) * 100, 0, 100) + '%';
  }
  const w = topSh() && topSh().t === 'work' && S.active && S.active.d === topSh().d ? S.work[topSh().d] : null;
  const e1 = $('#wkEl'); if (w && e1) e1.innerHTML = ico('timer', 'sm') + '経過 ' + fmtDur(elapsedMs(w));
  const e2 = $('#homeEl'); if (e2 && S.active && S.work[S.active.d]) e2.textContent = fmtDur(elapsedMs(S.work[S.active.d]));
}, 250);

/* ---------- 操作 ---------- */
let _sv = 0;
function saveSoon() { clearTimeout(_sv); _sv = setTimeout(save, 400); }
const dnum = el => parseInt(el.dataset.ei, 10);
const dsi = el => parseInt(el.dataset.si, 10);
function curWork() { const s = V.stack.slice().reverse().find(x => x.t === 'work'); return s ? S.work[s.d] : null; }
function curD() { const s = V.stack.slice().reverse().find(x => x.t === 'work'); return s ? s.d : null; }

function startToday(m) {
  const t = ymd(), w = ensureDay(t);
  if (m === 'auto') { const r = S.routine[dow(t)]; m = (r && !r.rest && (r.exIds || []).length) ? 'routine' : 'empty'; }
  if (m === 'routine') { const r = S.routine[dow(t)]; (r && r.exIds || []).forEach(id => { if (exById(id)) addEntry(t, id); }); }
  else if (m === 'last') {
    const ld = lastWorkDay(t);
    if (ld) for (const e of S.work[ld].entries) { const ds = e.sets.filter(isDone); if (ds.length && exById(e.ex) && !w.entries.some(x => x.ex === e.ex)) w.entries.push({ ex: e.ex, sets: ds.map(s => ({ kg: s.kg, reps: s.reps, rpe: null, done: false })) }); }
  }
  startSession(t); save(); push({ t: 'work', d: t });
}
function finishWork() {
  const d = curD(); if (!d) return;
  const w = S.work[d], live = S.active && S.active.d === d;
  for (const e of w.entries) e.sets = e.sets.filter(isDone);
  w.entries = w.entries.filter(e => e.sets.length);
  if (!wDone(w)) { delete S.work[d]; if (live) S.active = null; S.timer = null; save(); V.stack = V.stack.filter(x => x.t !== 'work' && x.t !== 'pick'); toast('記録がないため保存しませんでした'); render(); return; }
  if (live) { w.end = lastSetTs(w) || Date.now(); if (w.end < w.start) w.end = Date.now(); S.active = null; S.timer = null; }
  save();
  const st = dayStats(d), pbs = pbEvents().filter(p => p.d === d).length;
  V.stack = V.stack.filter(x => x.t !== 'work' && x.t !== 'pick');
  if (live) V.stack.push({ t: 'sum', d, st, pbs });
  render();
}
function closeWork() {
  const d = curD();
  if (d && S.work[d] && !S.work[d].entries.length && !S.work[d].start) delete S.work[d];
  V.stack = V.stack.filter(x => x.t !== 'work' && x.t !== 'pick'); save(); render();
}
function pickToggle(id) {
  const sh = topSh();
  if (sh.mode === 'routine') {
    const r = S.routine[sh.dow] || (S.routine[sh.dow] = { name: '', parts: [], exIds: [] }), i = r.exIds.indexOf(id);
    if (i >= 0) r.exIds.splice(i, 1); else r.exIds.push(id);
    r.parts = r.exIds.map(x => exById(x)).filter(Boolean).map(e => e.parts[0]).filter((p, k, a) => a.indexOf(p) === k);
    save(); render(); return;
  }
  const w = ensureDay(sh.d), i = w.entries.findIndex(e => e.ex === id);
  if (i >= 0) { if (w.entries[i].sets.some(isDone)) { toast('記録済みの種目は外せません'); return; } w.entries.splice(i, 1); }
  else addEntry(sh.d, id);
  save(); render();
}
function setDone(ei, si) {
  const d = curD(), w = S.work[d], e = w.entries[ei], s = e.sets[si], ex = entryEx(e);
  s.done = !s.done;
  if (s.done) {
    const now = Date.now(), t = ymd();
    if (d === t) { s.ts = now; if (!(S.active && S.active.d === d)) startSession(d); else if (!w.start) w.start = now; }
    if (ex.type === 'wr') { const v = e1rm(s.kg, s.reps), prev = bestE1(e.ex, s); if (prev > 0 && v > prev + 0.01) showPB(ex.name, v, prev); }
    if (d === t) startTimer(exRest(ex));
  } else { delete s.ts; if (S.timer && S.timer.fromSet === s) S.timer = null; }
  save(); render();
}
function icsDownload() {
  const txt = buildIcs(), a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' })); a.download = '筋トレリマインド.ics';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const A = {
  tab: el => { V.tab = el.dataset.t; V._ms = 0; V._skip = 1; render(); },
  close: () => pop(),
  closeWork, finish: finishWork,
  closePick: () => { const sh = topSh(); if (sh && sh.startAfter && ensureDay(sh.d).entries.length) { const d = sh.d; startSession(d); save(); V.stack.pop(); push({ t: 'work', d }); } else { if (sh && sh.startAfter) cleanupEmptyDay(sh.d); pop(); } },
  heroTap: el => {
    const id = el.dataset.k, t = ymd();
    if (id === 'streak') push({ t: 'streak' });
    else if (id === 'goal') { S.settings.goalMode = S.settings.goalMode === 'f' ? 'w' : 'f'; save(); render(); }
    else if (id === 'reco') { const sg = suggest(), part = sg.k === 'train' ? sg.parts[0] : ''; if (sg.k === 'rest') toast('今日は休養日がおすすめです。種目一覧を開きます'); push({ t: 'pick', mode: 'work', d: t, q: '', part, equip: '', startAfter: true }); }
    else if (id === 'week') { V.tab = 'hist'; V.hist = 'cal'; V._ms = 0; V._skip = 1; render(); }
    else if (id === 'protein') push({ t: 'food' });
    else if (id === 'vol') push({ t: 'report' });
  },
  sheet: el => push({ t: el.dataset.t }),
  calPrev: () => { const [y, m] = V.cm.split('-').map(Number), d = new Date(y, m - 2, 1); V.cm = ymd(d).slice(0, 7); render(); },
  calNext: () => { const [y, m] = V.cm.split('-').map(Number), d = new Date(y, m, 1); V.cm = ymd(d).slice(0, 7); render(); },
  hcSel: el => { V.sel = el.dataset.d; V.cm = el.dataset.d.slice(0, 7); V.tab = 'hist'; V.hist = 'cal'; V._ms = 0; V._skip = 1; render(); },
  histMode: el => { V.hist = el.dataset.v; V._ms = 0; V._skip = 1; render(); },
  selDay: el => { V.sel = addD(V.sel, parseInt(el.dataset.v, 10)); V.cm = V.sel.slice(0, 7); render(); },
  rng: el => { V.rng = el.dataset.v; render(); },
  themeColor: el => { S.settings.themeColor = el.dataset.v; save(); render(); },
  rmGoal: el => { const e = e1rm(num(V.rmkg), Math.round(num(V.rmreps))); if (!(e > 0)) return; const id = V.rmex || 'bench', v = el.dataset.v === '5' ? Math.round(e * 1.05 / 2.5) * 2.5 : Math.round(e * 2) / 2; S.goals[id] = v; save(); render(); toast(exById(id).name + 'の目標を ' + fmtKg(v) + 'kg にしました'); },
  ordMove: el => { const o = S.settings.homeOrder, i = o.indexOf(el.dataset.id), j = i + parseInt(el.dataset.v, 10); if (i < 0 || j < 0 || j >= o.length) return; o.splice(j, 0, o.splice(i, 1)[0]); save(); render(); },
  ordReset: () => { S.settings.homeOrder = HOME_IDS.slice(); S.settings.homeHide = []; save(); render(); },
  calSel: el => { V.sel = el.dataset.d; render(); },
  startToday: el => startToday(el.dataset.m),
  cont: () => { if (S.active) push({ t: 'work', d: S.active.d }); },
  openDay: el => { ensureDay(el.dataset.d); push({ t: 'work', d: el.dataset.d }); },
  copyToToday: el => {
    const t = ymd(), w = ensureDay(t), src = S.work[el.dataset.d];
    for (const e of src.entries) { const ds = e.sets.filter(isDone); if (ds.length && exById(e.ex) && !w.entries.some(x => x.ex === e.ex)) w.entries.push({ ex: e.ex, sets: ds.map(s => ({ kg: s.kg, reps: s.reps, rpe: null, done: false })) }); }
    startSession(t); save(); push({ t: 'work', d: t });
  },
  restDay: el => { const d = el.dataset.d; if (el.dataset.v === '1') S.rest[d] = 1; else delete S.rest[d]; save(); render(); toast(el.dataset.v === '1' ? '休養日にしました' : '休養日を解除しました'); },
  hideInstall: () => { S.settings.hideInstall = true; save(); render(); },
  openPick: el => push({ t: 'pick', mode: 'work', d: el.dataset.d, q: '', part: '', equip: '' }),
  pf: el => { const sh = topSh(); sh[el.dataset.k] = el.dataset.v; render(); },
  pickEx: el => pickToggle(el.dataset.id),
  fav: el => { const id = el.dataset.id; if (S.fav[id]) delete S.fav[id]; else S.fav[id] = true; save(); render(); },
  newEx: () => push({ t: 'exedit', id: null }),
  exEdit: el => push({ t: 'exedit', id: el.dataset.id }),
  exPart: el => { const d = topSh().draft, p = el.dataset.v, i = d.parts.indexOf(p); if (i >= 0) { if (d.parts.length > 1) d.parts.splice(i, 1); } else if (d.parts.length < 3) d.parts.push(p); render(); },
  exEq: el => { const d = topSh().draft; d.equip = el.dataset.v; if (!topSh()._restSet) d.rest = REST_EQ[d.equip]; render(); },
  exType: el => { topSh().draft.type = el.dataset.v; render(); },
  exSave: () => {
    const sh = topSh(), d = sh.draft, e = sh.id ? exById(sh.id) : null;
    if (e && !e.custom) { S.exOv[e.id] = { rest: clamp(Math.round(num(d.rest, e.rest)), 15, 600) }; }
    else {
      d.name = (d.name || '').trim();
      if (!d.name) { toast('種目名を入力してください'); return; }
      d.rest = clamp(Math.round(num(d.rest, 90)), 15, 600);
      if (e) Object.assign(e, { name: d.name, parts: d.parts, equip: d.equip, type: d.type, rest: d.rest });
      else S.custom.push({ id: 'c' + Date.now().toString(36), name: d.name, parts: d.parts, equip: d.equip, type: d.type, rest: d.rest, custom: true });
    }
    _exCache = null; save(); pop(); toast('保存しました');
  },
  exDel: () => {
    const id = topSh().id; if (!confirm('この種目を削除しますか?(過去の記録には「削除された種目」と表示されます)')) return;
    S.custom = S.custom.filter(e => e.id !== id); delete S.fav[id]; delete S.goals[id]; _exCache = null; save(); pop();
  },
  exReset: () => { delete S.exOv[topSh().id]; save(); pop(); },
  addSet: el => { const e = curWork().entries[dnum(el)], l = e.sets[e.sets.length - 1]; e.sets.push({ kg: l ? l.kg : 0, reps: l ? l.reps : 10, rpe: null, done: false }); save(); render(); },
  delSet: el => { const e = curWork().entries[dnum(el)]; if (e.sets.length > 1) { e.sets.pop(); save(); render(); } },
  delEntry: el => { const w = curWork(), e = w.entries[dnum(el)]; if (e.sets.some(isDone) && !confirm('記録済みのセットも一緒に消えます。削除しますか?')) return; w.entries.splice(dnum(el), 1); save(); render(); },
  setDone: el => setDone(dnum(el), dsi(el)),
  tAdd: () => { if (S.timer) { S.timer.end += 15000; S.timer.total += 15; save(); render(); } },
  tSkip: () => { S.timer = null; save(); render(); },
  pbClose: () => { $('#pb').classList.remove('on'); },
  saveBody: () => {
    const w = num($('#bw').value), f = num($('#bf').value);
    if (!(w > 0) && !(f > 0)) { toast('体重か体脂肪率を入力してください'); return; }
    const t = ymd(), o = S.body[t] || { w: 0, f: 0 };
    if (w > 0) o.w = w; if (f > 0) o.f = f; delete o.demo; S.body[t] = o; save(); render(); toast('保存しました');
  },
  delBody: el => { delete S.body[el.dataset.d]; save(); render(); },
  addFood: el => { const t = ymd(); (S.food[t] = S.food[t] || []).push({ id: Math.random().toString(36).slice(2, 8), t: new Date().getHours() + ':' + pad(new Date().getMinutes()), name: el.dataset.n, g: num(el.dataset.g) }); save(); render(); },
  addFoodFree: () => { const n = ($('#fn').value || '').trim() || '食品', g = num($('#fg').value); if (!(g > 0)) { toast('たんぱく質(g)を入力してください'); return; } const t = ymd(); (S.food[t] = S.food[t] || []).push({ id: Math.random().toString(36).slice(2, 8), t: new Date().getHours() + ':' + pad(new Date().getMinutes()), name: n, g }); save(); render(); },
  addPreset: () => { const n = ($('#fn').value || '').trim(), g = num($('#fg').value); if (!n || !(g > 0)) { toast('名前とグラム数を入力してください'); return; } S.foodPreset.push({ name: n, g }); save(); render(); toast('登録しました'); },
  delFood: el => { const t = ymd(); S.food[t] = (S.food[t] || []).filter(f => f.id !== el.dataset.id); save(); render(); },
  repMode: el => { V.rep = { mode: el.dataset.v, off: 0 }; render(); },
  repOff: el => { const n = V.rep.off + parseInt(el.dataset.v, 10); if (n <= 0) { V.rep.off = n; render(); } },
  rtKind: el => { const w = el.dataset.w, v = el.dataset.v; if (v === 'none') delete S.routine[w]; else if (v === 'rest') S.routine[w] = { rest: true }; else if (!S.routine[w] || S.routine[w].rest) S.routine[w] = { name: '', parts: [], exIds: [] }; save(); render(); },
  rtAdd: el => push({ t: 'pick', mode: 'routine', dow: parseInt(el.dataset.w, 10), q: '', part: '', equip: '' }),
  rtDel: el => { const r = S.routine[el.dataset.w]; r.exIds.splice(parseInt(el.dataset.k, 10), 1); r.parts = r.exIds.map(x => exById(x)).filter(Boolean).map(e => e.parts[0]).filter((p, k, a) => a.indexOf(p) === k); save(); render(); },
  theme: el => { S.settings.theme = el.dataset.v; save(); render(); },
  setCol: el => { S.settings.partColors[el.dataset.p] = el.dataset.c; save(); render(); },
  colReset: () => { S.settings.partColors = Object.assign({}, DEF_COLORS); save(); render(); },
  rDay: el => { const i = parseInt(el.dataset.v, 10), a = S.settings.remindDays, k = a.indexOf(i); if (k >= 0) a.splice(k, 1); else a.push(i); save(); render(); },
  ics: () => { if (!S.settings.remindDays.length) { toast('曜日を選んでください'); return; } icsDownload(); toast('開いたらカレンダーに追加してください'); },
  backup: async () => { await doBackup(); render(); },
  fsaPick: () => fsaPick(), fsaClear: () => fsaClear(), fsaLoad: () => fsaLoad(),
  saveNow: () => { save(); render(); toast('保存しました'); },
  demoOn: () => { seedDemo(); render(); toast('サンプルを追加しました'); },
  demoOff: () => { if (!confirm('サンプルデータを削除しますか?(自分の記録は残ります)')) return; removeDemo(); render(); toast('サンプルを削除しました'); }
};
function rmHtml() {
  const kg = num(V.rmkg), r = Math.round(num(V.rmreps)), e = e1rm(kg, r);
  if (!(e > 0)) return '<p class="mut">重量と回数を入れると、推定1RMが出ます。</p>';
  let h = '<div class="rmbig"><small>推定1RM(Epley式)</small><b>' + fmtKg(e) + ' kg</b></div><div class="rmt">';
  for (const p of [95, 90, 85, 80, 75, 70, 65, 60, 50]) h += '<div><span>' + p + '%</span><b>' + fmtKg(Math.round(e * p / 100 * 2) / 2) + 'kg</b></div>';
  const ex = exById(V.rmex || 'bench') || exById('bench'), g = S.goals[ex.id];
  h += '</div><div class="rmg"><small>この1RMを目標にする種目</small><select class="sel" data-c="rmex">' + rmExOpts() + '</select>' + (g ? '<small>現在の目標:' + g + 'kg</small>' : '') + '<div class="btns"><button class="btn pri" data-a="rmGoal" data-v="0">' + fmtKg(Math.round(e * 2) / 2) + 'kgを目標に</button><button class="btn" data-a="rmGoal" data-v="5">+5%(' + fmtKg(Math.round(e * 1.05 / 2.5) * 2.5) + 'kg)を目標に</button></div></div>';
  return h;
}
function rmExOpts() {
  const ids = ['bench', 'squat', 'deadlift', 'ohp'], rest = allEx().filter(e => e.type === 'wr' && !ids.includes(e.id)).map(e => e.id);
  return ids.concat(rest).map(id => '<option value="' + id + '"' + (id === (V.rmex || 'bench') ? ' selected' : '') + '>' + esc(exById(id).name) + '</option>').join('');
}
function viewRm() {
  return sheetHd('RM計算') + '<div class="scroll"><div class="pad"><section class="card"><div class="frm"><label>重量(kg)<input type="number" inputmode="decimal" step="0.5" min="0" data-i="rmkg" value="' + (V.rmkg || '') + '"></label><label>回数<input type="number" inputmode="numeric" step="1" min="1" data-i="rmreps" value="' + (V.rmreps || '') + '"></label></div></section><section class="card" id="rmres">' + rmHtml() + '</section></div></div>';
}
const I = {
  rmkg: el => { V.rmkg = el.value; const r = $('#rmres'); if (r) r.innerHTML = rmHtml(); },
  rmreps: el => { V.rmreps = el.value; const r = $('#rmres'); if (r) r.innerHTML = rmHtml(); },
  kg: el => { const s = curWork().entries[dnum(el)].sets[dsi(el)]; s.kg = Math.max(0, num(el.value)); saveSoon(); },
  reps: el => { const s = curWork().entries[dnum(el)].sets[dsi(el)]; s.reps = Math.max(0, num(el.value)); saveSoon(); },
  pq: el => { topSh().q = el.value; _focus = { sel: '[data-i=pq]', pos: el.selectionStart }; render(); },
  exq: el => { V.exq = el.value; _focus = { sel: '[data-i=exq]', pos: el.selectionStart }; render(); },
  goal: el => { const v = num(el.value); if (v > 0) S.goals[el.dataset.id] = v; else delete S.goals[el.dataset.id]; saveSoon(); },
  tw: el => { S.settings.targetWeight = Math.max(0, num(el.value)); const b = document.querySelector('[data-i=tbmi]'); if (b) b.value = bmiOf(S.settings.targetWeight); saveSoon(); },
  hgt: el => { const v = num(el.value); S.settings.height = (v >= 100 && v <= 250) ? v : 0; const b = document.querySelector('[data-i=tbmi]'); if (b) b.value = bmiOf(S.settings.targetWeight); saveSoon(); },
  tbmi: el => { const v = num(el.value), h = S.settings.height; if (!(v > 0)) return; if (!(h > 0)) { toast('先に身長を入力してください'); return; } S.settings.targetWeight = Math.round(v * Math.pow(h / 100, 2) * 10) / 10; const w = document.querySelector('[data-i=tw]'); if (w) w.value = S.settings.targetWeight; saveSoon(); },
  tf: el => { S.settings.targetFat = Math.max(0, num(el.value)); saveSoon(); },
  defRest: el => { S.settings.defaultRest = clamp(Math.round(num(el.value, 120)), 15, 600); saveSoon(); },
  pgoal: el => { S.settings.proteinGoal = clamp(Math.round(num(el.value, 120)), 20, 400); saveSoon(); },
  rtime: el => { if (/^\d{2}:\d{2}$/.test(el.value)) { S.settings.remindTime = el.value; saveSoon(); } },
  device: el => { S.settings.device = (el.value || 'iPhone').slice(0, 20); saveSoon(); },
  rtname: el => { if (S.routine[el.dataset.w]) { S.routine[el.dataset.w].name = el.value.slice(0, 20); saveSoon(); } },
  exname: el => { topSh().draft.name = el.value; },
  exrest: el => { topSh().draft.rest = num(el.value, 90); topSh()._restSet = true; }
};
const C = {
  heroSlot: el => { const i = parseInt(el.dataset.k, 10), h = S.settings.hero, v = el.value, j = h.indexOf(v); if (j >= 0 && j !== i) h[j] = h[i]; h[i] = v; save(); render(); },
  rmex: el => { V.rmex = el.value; render(); },
  weekGoal: el => { S.settings.weekGoal = parseInt(el.value, 10); save(); },
  ordShow: el => { const h = S.settings.homeHide, k = el.dataset.id, i = h.indexOf(k); if (el.checked) { if (i >= 0) h.splice(i, 1); } else if (i < 0) h.push(k); save(); },
  rpe: el => { const s = curWork().entries[dnum(el)].sets[dsi(el)]; s.rpe = el.value ? parseFloat(el.value) : null; save(); },
  gex: el => { V.gex = el.value; render(); },
  countRest: el => { S.settings.countRest = el.checked; save(); render(); },
  restAfter: el => { S.settings.restAfter = parseInt(el.value, 10); save(); },
  goalAdd: el => { if (el.value) { S.goals[el.value] = Math.max(S.goals[el.value] || 0, 100); save(); render(); } },
  fsaAuto: el => fsaAutoSet(el.checked),
  import: el => {
    const f = el.files && el.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { if (!confirm('いまのデータを、読み込んだ内容で置き換えます。よろしいですか?')) return; importObj(JSON.parse(r.result)); V.stack = []; render(); toast('読み込みました'); } catch (e) { toast('読み込めませんでした:' + e.message); } };
    r.readAsText(f); el.value = '';
  }
};

function init() {
  loadState(); applyTheme();
  const root = $('#root');
  root.addEventListener('click', ev => { unlockAudio(); const el = ev.target.closest('[data-a]'); if (!el || el.disabled) return; const f = A[el.dataset.a]; if (f) { ev.preventDefault(); f(el, ev); } });
  root.addEventListener('input', ev => { const el = ev.target.closest('[data-i]'); if (el && I[el.dataset.i]) I[el.dataset.i](el); });
  root.addEventListener('change', ev => { const el = ev.target.closest('[data-c]'); if (el && C[el.dataset.c]) C[el.dataset.c](el); });
  let sx = 0, sy = 0, st0 = 0;
  root.addEventListener('touchstart', ev => { const t = ev.touches[0]; sx = t.clientX; sy = t.clientY; st0 = Date.now(); }, { passive: true });
  root.addEventListener('touchend', ev => {
    if (V.tab !== 'hist' || (V.hist || 'cal') !== 'cal' || topSh() || ev.target.closest('input,select,.dh')) return;
    const t = ev.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Date.now() - st0 > 700 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    V.sel = addD(V.sel, dx < 0 ? 1 : -1); V.cm = V.sel.slice(0, 7); render();
  }, { passive: true });
  let dr = null;
  root.addEventListener('pointerdown', ev => { const hd = ev.target.closest('[data-drag]'); if (!hd) return; const li = hd.closest('.oi'); dr = { li, list: li.parentNode }; li.classList.add('drag'); try { hd.setPointerCapture(ev.pointerId); } catch (e) {} ev.preventDefault(); });
  root.addEventListener('pointermove', ev => {
    if (!dr) return;
    const y = ev.clientY, items = Array.prototype.filter.call(dr.list.children, x => x !== dr.li);
    const nxt = items.find(x => { const r = x.getBoundingClientRect(); return y < r.top + r.height / 2; });
    if (nxt) { if (dr.li.nextSibling !== nxt) dr.list.insertBefore(dr.li, nxt); } else if (dr.list.lastChild !== dr.li) dr.list.appendChild(dr.li);
  });
  const endDrag = () => { if (!dr) return; S.settings.homeOrder = Array.prototype.map.call(dr.list.children, x => x.dataset.id); dr.li.classList.remove('drag'); dr = null; save(); };
  root.addEventListener('pointerup', endDrag); root.addEventListener('pointercancel', endDrag);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { if (S.timer && S.timer.end <= Date.now()) endTimer(false); else render(); } });
  matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  if (S.timer && S.timer.end <= Date.now()) S.timer = null;
  if (S.active && !S.work[S.active.d]) S.active = null;
  render();
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
window.addEventListener('error', e => { try { const r = $('#root'); if (r && !r.innerHTML) r.innerHTML = '<div class="pad"><p>読み込みに失敗しました。再読み込みしてください。</p></div>'; } catch (x) {} });
document.addEventListener('DOMContentLoaded', init);
