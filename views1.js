'use strict';
/* 筋トレ管理 PWA - 画面(ホーム・カレンダー・記録・種目選択) */
const IC = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  moon: '<path d="M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z"/>',
  flame: '<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 2 4-5z"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  dumb: '<path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/>',
  scale: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9a5 5 0 0 1 8 0M12 9l2-2"/>',
  meat: '<path d="M7 17a6 6 0 1 1 9-8l3 3-3 3-3-1-3 3z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  rep: '<path d="M4 4h16v16H4zM8 15v-4M12 15V8M16 15v-6"/>',
  drag: '<path d="M5 8h14M5 12h14M5 16h14"/>', up: '<path d="M6 14l6-6 6 6"/>', down: '<path d="M6 10l6 6 6-6"/>'
};
const ico = (n, c) => '<svg class="ic ' + (c || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>';

const V = { rng: 'm3', tab: 'home', cm: ymd().slice(0, 7), sel: ymd(), stack: [], pb: null, gex: null, rep: { mode: 'w', off: 0 }, exq: '' };
const topSh = () => V.stack[V.stack.length - 1] || null;
function push(s) { V.stack.push(s); render(); }
function pop() { V.stack.pop(); render(); }

let _toastT = 0;
function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('on');
  clearTimeout(_toastT); _toastT = setTimeout(() => t.classList.remove('on'), 2400);
}

/* ---------- 共通部品 ---------- */
function partDot(p, big) { return '<i class="pd' + (big ? ' big' : '') + '" style="background:' + pcol(p) + '"></i>'; }
function partChip(p) { return '<span class="chip" style="--c:' + pcol(p) + '">' + PN[p] + '</span>'; }
function hdr(title, sub, left, right) {
  return '<header class="hd">' + (left || '<span class="hs"></span>') + '<div class="ht"><b>' + esc(title) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' + (right || '<span class="hs"></span>') + '</header>';
}
const backBtn = (a) => '<button class="ib" data-a="' + (a || 'close') + '" aria-label="戻る">' + ico('left') + '</button>';

/* ---------- ホーム ---------- */
function heroCal() {
  const [Y, M] = V.cm.split('-').map(Number), first = new Date(Y, M - 1, 1), lead = first.getDay(), t = ymd();
  const total = Math.ceil((lead + new Date(Y, M, 0).getDate()) / 7) * 7;
  let h = '';
  for (let i = 0; i < total; i++) {
    const dt = new Date(Y, M - 1, 1 - lead + i), d = ymd(dt), other = dt.getMonth() !== M - 1, s = dayState(d);
    h += '<button class="hc' + (other ? ' oth' : '') + (s === 'w' ? ' w' : s === 'r' ? ' r' : '') + (d === t ? ' td' : '') + '" data-a="hcSel" data-d="' + d + '" aria-label="' + fmtMD(d) + '"><span>' + dt.getDate() + '</span></button>';
  }
  return h;
}
function heroCard(id, ctx) {
  const t = ymd(), mon = weekStart(t);
  const wrap = (cls, label, inner, extra) => '<button class="hs1 ' + cls + '" data-a="heroTap" data-k="' + id + '"><small>' + label + '</small>' + inner + (extra || '') + '</button>';
  if (id === 'streak') return wrap('t-streak', '連続日数', '<div class="hbig"><span class="hfl">' + ico('flame') + '</span><b>' + ctx.st + '</b><u>日</u></div>');
  if (id === 'week') {
    const n = rangeStats(mon, addD(mon, 6)).n, g = S.settings.weekGoal;
    return wrap('t-week', '今週のトレ日数', '<div class="hbig"><b>' + n + '</b><u>/ ' + g + '日</u></div><em>' + (n >= g ? '目標達成!' : 'あと ' + (g - n) + ' 日') + '</em>');
  }
  if (id === 'protein') {
    const g = proteinGoal(), v = foodTotal(t);
    return wrap('t-protein', '今日のたんぱく質', '<div class="hbig"><b>' + v + '</b><u>g</u></div><em>目標 ' + g + 'g' + (v >= g ? '(達成)' : '') + '</em>');
  }
  if (id === 'vol') {
    const v = rangeStats(addD(t, -6), t).vol;
    return wrap('t-vol', '7日間の負荷量', '<div class="hbig"><b>' + (v / 1000).toFixed(2) + '</b><u>t</u></div><em>軽自動車 × ' + (v / 1000).toFixed(1) + '</em>');
  }
  if (id === 'reco') {
    const sg = ctx.sg, rec = ctx.rec;
    const ps = sg.k === 'train' ? sg.parts : (sg.k === 'rest' ? [] : MAIN_PARTS.filter(p => rec[p].st === 'ok').slice(0, 2));
    let inner;
    if (!ps.length) inner = '<div class="hbig"><b class="sm2">休養</b></div><em>' + (sg.k === 'rest' ? '今日は休むのがおすすめ' : '回復待ちです') + '</em>';
    else inner = '<div class="hparts">' + ps.map(p => '<span><i style="background:' + pcol(p) + '"></i>' + PN[p] + '</span>').join('') + '</div><em>' + ps.map(p => PN[p] + (rec[p].never ? ' 未記録' : ' ' + rec[p].days + '日ぶり')).join(' / ') + '</em>';
    return wrap('t-reco', '今日のオススメ部位', inner);
  }
  /* goal: 体重(BMI) / 体脂肪率 を切り替え */
  const fm = S.settings.goalMode === 'f', k = fm ? 'f' : 'w', tg = fm ? S.settings.targetFat : S.settings.targetWeight, cur = latestBody(k);
  const dots = '<span class="hmode"><i class="' + (fm ? '' : 'on') + '"></i><i class="' + (fm ? 'on' : '') + '"></i></span>';
  const label = fm ? '目標体脂肪率まで' : '目標体重 / BMIまで';
  if (!cur || !(tg > 0)) return wrap('t-goal', label, '<div class="hbig"><b>--</b><u>日</u></div><em>' + (fm ? '体脂肪率と目標を入力' : '体重と目標を入力') + '</em>', dots);
  const p = predict(k, tg), days = p.st === 'ok' ? p.left : null;
  let rows;
  if (fm) rows = '<div class="hkv"><span>体脂肪</span><i>' + fmtKg(cur) + ' → ' + fmtKg(tg) + '%</i></div><div class="hkv"><span>ペース</span><i>' + (p.slope != null ? (p.slope * 7 > 0 ? '+' : '') + (p.slope * 7).toFixed(2) + '%/週' : '--') + '</i></div>';
  else {
    const hcm = S.settings.height, bmi = w => w / Math.pow(hcm / 100, 2);
    rows = '<div class="hkv"><span>体重</span><i>' + fmtKg(cur) + ' → ' + fmtKg(tg) + 'kg</i></div><div class="hkv"><span>BMI</span><i>' + (hcm > 0 ? bmi(cur).toFixed(1) + ' → ' + bmi(tg).toFixed(1) : '身長を設定') + '</i></div>';
  }
  return wrap('t-goal', label, '<div class="hbig"><b>' + (days != null ? days : '--') + '</b><u>日</u></div><div class="hkvw">' + rows + '</div>', dots);
}
function viewHome() {
  const t = ymd(), st = streak(), ts = trainStreak(), sg = suggest(), rec = recovery();
  const act = S.active && S.work[S.active.d];
  const [Y, M] = V.cm.split('-').map(Number);
  const MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const mFirst = V.cm + '-01', mLast = ymd(new Date(Y, M, 0));
  const monthDays = rangeStats(mFirst, mLast).n;
  const allDays = Object.keys(S.work).filter(d => wDone(S.work[d])).length;
  const v7 = rangeStats(addD(t, -6), t).vol, v28 = rangeStats(addD(t, -27), t).vol;
  let vAll = 0; for (const d in S.work) vAll += dayStats(d).vol;
  const tt = v => (v / 1000).toFixed(2) + ' t';
  const mon = weekStart(t), wk = [];
  for (let i = 0; i < 6; i++) { const a = addD(mon, -7 * i); wk.push({ l: i ? i + '週前' : '今週', v: rangeStats(a, addD(a, 6)).vol }); }
  const wmax = Math.max.apply(null, wk.map(x => x.v).concat([1]));
  let h = '<div class="scroll"><div class="hero"><div class="htop"><button class="hg" data-a="tab" data-t="set" aria-label="設定">' + ico('gear') + '</button><b>筋トレ管理</b><span class="hv">Ver.' + VER + '</span></div><div class="hline"></div><div class="hgrid"><div class="hl">' +
    '<div class="hm"><button class="hn" data-a="calPrev" aria-label="前の月">' + ico('left') + '</button><div class="hmt">' + MN[M - 1] + ' ' + Y + '</div><button class="hn" data-a="calNext" aria-label="次の月">' + ico('right') + '</button></div>' +
    '<div class="hwd">' + ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(x => '<span>' + x + '</span>').join('') + '</div><div class="hcal">' + heroCal() + '</div>' +
    '<div class="harc"><div class="hat">MONTHLY<br>ARCHIVE</div><div class="had"><b>' + monthDays + '</b> days</div><div class="hall"><small>TOTAL</small><span>' + allDays + ' days</span></div></div></div>' +
    '<div class="hr">' + S.settings.hero.map(id => heroCard(id, { st, sg, rec })).join('') + '</div></div></div><div class="pad">';
  const B = {};
  B.btn = '<div class="hbtn"><button class="btn pri big" data-a="startToday" data-m="' + (wDone(S.work[t]) || act ? 'empty' : 'auto') + '">' + ico('plus') + '今日のトレーニング追加</button><button class="btn big out" data-a="sheet" data-t="rm">' + ico('dumb') + 'RM計算</button></div>';
  if (act) B.btn += '<section class="card act"><div class="row"><div><small>トレーニング中</small><div class="big2" id="homeEl">' + fmtDur(elapsedMs(act)) + '</div></div><button class="btn pri" data-a="cont">続ける</button></div></section>';
  else {
    const r = S.routine[dow(t)], opts = [];
    if (r && !r.rest && (r.exIds || []).length) opts.push('<button class="btn" data-a="startToday" data-m="routine">' + ico('bolt') + 'ルーティン:' + esc(r.name || '今日のメニュー') + '</button>');
    if (lastWorkDay(t)) opts.push('<button class="btn" data-a="startToday" data-m="last">' + ico('copy') + '前回と同じ内容(' + fmtMD(lastWorkDay(t)) + ')</button>');
    if (opts.length) B.btn += '<div class="btns col">' + opts.join('') + '</div>';
  }
  const wg = S.settings.weekGoal, wdn = rangeStats(mon, addD(mon, 6)).n;
  B.week = '<section class="card wkc"><div>' + ring(wdn / wg, 'var(--acc)', wdn + '/' + wg, '日', 78) + '</div><div class="wkb"><div class="ct">' + ico('target') + '今週の目標</div><b>' + (wdn >= wg ? '達成!おつかれさま' : 'あと ' + (wg - wdn) + ' 日') + '</b><div class="wkd">' + [0, 1, 2, 3, 4, 5, 6].map(i => { const d = addD(mon, i), s2 = dayState(d); return '<span class="' + (s2 === 'w' ? 'w' : d === t ? 'td' : '') + '">' + WD[dow(d)] + '</span>'; }).join('') + '</div></div></section>';
  B.backup = '<button class="bk" data-a="backup"><i>' + ico('copy') + '</i><div><b>バックアップ</b><small>' + (S.settings.lastBackup ? '最終 ' + new Date(S.settings.lastBackup).toLocaleDateString('ja-JP') + '。タップで書き出し' : '未実施。大切なデータをファイルに保存') + '</small></div>' + ico('right') + '</button>';
  B.streak = '<section class="card streak"><div class="fl">' + ico('flame') + '</div><div><div class="big"><b>' + st + '</b><span>日連続</span></div><small>' + (S.settings.countRest ? '休養日も連続に数える' : '休養日は連続に数えない') + (ts ? ' ・ 実トレ' + ts + '日連続' : '') + '</small></div></section>';
  const kc = sg.k === 'rest' ? 'rest' : sg.k === 'train' ? 'train' : '';
  B.sug = '<section class="card sug ' + kc + '"><div class="ct">' + ico(sg.k === 'rest' ? 'moon' : 'bolt') + esc(sg.title) + '</div><p class="mut">' + esc(sg.body) + '</p>' +
    (sg.btn === 'rest' ? '<button class="btn" data-a="restDay" data-d="' + t + '" data-v="1">今日を休養日にする</button>' : '') + (sg.btn === 'unrest' ? '<button class="btn" data-a="restDay" data-d="' + t + '" data-v="0">休養日を解除</button>' : '') + '</section>';
  let rc = '<section class="card"><div class="ct">' + ico('flame') + '部位ごとの回復状況</div><div class="recg">';
  for (const p of MAIN_PARTS) {
    const r = rec[p], c = r.st === 'bad' ? 'var(--bad)' : r.st === 'warn' ? 'var(--warn)' : 'var(--ok)';
    rc += '<div class="rec"><i style="background:' + pcol(p) + '"></i><b>' + PN[p] + '</b><span style="color:' + c + '">' + (r.never ? '未記録' : r.st === 'ok' ? '回復済み' : remTxt(r.rem)) + '</span></div>';
  }
  B.rec = rc + '</div><small class="mut">運動後の経過時間からの目安です(大筋群72h/小筋群48h)</small></section>';
  B.goal = bigRings();
  B.quick = '<section class="card quick"><button class="qb" data-a="sheet" data-t="food">' + ico('meat') + 'たんぱく質 ' + foodTotal(t) + '/' + proteinGoal() + 'g</button><button class="qb" data-a="sheet" data-t="report">' + ico('rep') + '週・月レポート</button></section>';
  B.info = '<div class="info"><div class="it">INFORMATION</div>' + INFO.map(x => '<div><span>' + x[0] + '</span>' + esc(x[1]) + '</div>').join('') + '</div>';
  S.settings.homeOrder.forEach(k => { if (!S.settings.homeHide.includes(k) && B[k]) h += B[k]; });
  if (!isStandalone() && !S.settings.hideInstall) h += '<section class="card inst"><b>ホーム画面に追加しましょう</b><p class="mut">Safariの共有ボタン →「ホーム画面に追加」で、アプリのように全画面で使えます。</p><button class="btn" data-a="hideInstall">閉じる</button></section>';
  return h + '<div class="sp"></div></div></div>';
}
const INFO = [['2026/11/18', 'ホーム上部を「連続日数・目標までの日数・おすすめ部位」に変更しました(Ver.1.3.0)'], ['2026/11/18', 'ホームの並び替え・配色・週目標などを追加しました(Ver.1.2.0)'], ['2026/11/18', 'ホーム画面を新しいレイアウトにしました(Ver.1.1.0)'], ['2026/11/03', '筋トレ管理 Ver.1.0.0 を公開しました']];
function viewHist() {
  const seg = '<div class="seg">' + [['cal', '履歴'], ['graph', '分析']].map(p => '<button class="' + ((V.hist || 'cal') === p[0] ? 'on' : '') + '" data-a="histMode" data-v="' + p[0] + '">' + p[1] + '</button>').join('') + '</div>';
  const h = (V.hist || 'cal') === 'graph' ? viewGraph() : viewCal();
  return h.replace('<div class="pad">', '<div class="pad">' + seg);
}
function isStandalone() { return window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches); }
function lastWorkDay(before) { return Object.keys(S.work).filter(d => d < before && wDone(S.work[d])).sort().pop() || null; }
function weekBars() {
  const t = ymd(), mon = addD(t, -((dow(t) + 6) % 7)), out = [];
  for (let i = 0; i < 7; i++) { const d = addD(mon, i); out.push({ label: WD[dow(d)], v: dayStats(d).vol, color: d === t ? 'var(--acc)' : 'var(--acc2)', dim: d > t }); }
  return out;
}
function bigRings() {
  const ids = ['bench', 'squat', 'deadlift'];
  let h = '<section class="card"><div class="ct">' + ico('target') + '1RM 目標の達成度<button class="lnk" data-a="sheet" data-t="goals">設定</button></div><div class="rings">';
  for (const id of ids) {
    const ex = exById(id), b = bestE1(id), g = S.goals[id] || 0;
    h += '<div class="rg">' + ring(g ? b / g : 0, 'var(--acc)', g ? Math.round(b / g * 100) + '%' : '-', '', 84) + '<b>' + esc(ex.name.replace('バーベル', '').replace('(バーベル)', '')) + '</b><small>' + (b ? fmtKg(b) : '-') + ' / ' + (g || '未設定') + 'kg</small></div>';
  }
  return h + '</div></section>';
}

/* ---------- カレンダー ---------- */
function viewCal() {
  const [Y, M] = V.cm.split('-').map(Number), first = new Date(Y, M - 1, 1), last = new Date(Y, M, 0).getDate(), t = ymd();
  let h = '<header class="hd"><button class="ib" data-a="calPrev" aria-label="前の月">' + ico('left') + '</button><div class="ht"><b>' + Y + '年' + M + '月</b></div><button class="ib" data-a="calNext" aria-label="次の月">' + ico('right') + '</button></header><div class="scroll"><div class="pad">';
  h += '<section class="card cal"><div class="wd">' + WD.map((w, i) => '<span class="' + (i === 0 ? 'su' : i === 6 ? 'sa' : '') + '">' + w + '</span>').join('') + '</div><div class="grid">';
  for (let i = 0; i < first.getDay(); i++) h += '<span></span>';
  for (let n = 1; n <= last; n++) {
    const d = Y + '-' + pad(M) + '-' + pad(n), s = dayState(d), st = dayStats(d);
    let dots = '';
    if (s === 'w') dots = st.parts.slice(0, 3).map(p => partDot(p)).join('');
    else if (S.rest[d] || (isRestDay(d) && d < t)) dots = '<em>休</em>';
    h += '<button class="dc' + (d === t ? ' today' : '') + (d === V.sel ? ' sel' : '') + (s === 'w' ? ' w' : s === 'r' ? ' r' : '') + '" data-a="calSel" data-d="' + d + '"><b>' + n + '</b><div class="dd">' + dots + '</div></button>';
  }
  h += '</div><div class="leg">' + MAIN_PARTS.map(p => '<span>' + partDot(p) + PN[p] + '</span>').join('') + '</div></section>';
  h += dayDetail(V.sel) + '<div class="sp"></div></div></div>';
  return h;
}
function dayDetail(d) {
  const w = S.work[d], t = ymd();
  let h = '<section class="card"><div class="ct"><span>' + fmtMD(d) + (d === t ? '(今日)' : '') + '</span><span class="dn2"><button class="ib sm" data-a="selDay" data-v="-1" aria-label="前の日">' + ico('left') + '</button><button class="ib sm" data-a="selDay" data-v="1" aria-label="次の日">' + ico('right') + '</button></span></div>';
  if (wDone(w)) {
    const st = dayStats(d);
    h += '<div class="stats"><div><b>' + st.ex + '</b><small>種目</small></div><div><b>' + st.sets + '</b><small>セット</small></div><div><b>' + fmtN(st.vol) + '</b><small>kg</small></div><div><b>' + (st.min ? Math.round(st.min) : '-') + '</b><small>分</small></div><div><b>' + (st.rpe ? st.rpe.toFixed(1) : '-') + '</b><small>RPE</small></div></div>';
    for (const e of w.entries) {
      const ex = entryEx(e), ds = e.sets.filter(isDone);
      if (!ds.length) continue;
      h += '<div class="ex">' + partDot(ex.parts[0], 1) + '<div><b>' + esc(ex.name) + '</b><small>' + ds.map(s => setTxt(ex, s)).join(' / ') + '</small></div></div>';
    }
    h += '<div class="btns"><button class="btn pri" data-a="openDay" data-d="' + d + '">' + (d === t ? '記録を開く・追加' : '記録を編集') + '</button>' + (d !== t ? '<button class="btn" data-a="copyToToday" data-d="' + d + '">' + ico('copy') + 'この内容で今日開始</button>' : '') + '</div>';
  } else {
    const rs = S.rest[d] ? '休養日に設定済み' : (isRestDay(d) ? 'ルーティン上の休養日' : '記録はありません');
    h += '<p class="mut">' + rs + '</p><div class="btns"><button class="btn pri" data-a="openDay" data-d="' + d + '">' + ico('plus') + 'この日の記録を追加</button><button class="btn" data-a="restDay" data-d="' + d + '" data-v="' + (S.rest[d] ? 0 : 1) + '">' + ico('moon') + (S.rest[d] ? '休養日を解除' : '休養日にする') + '</button></div>';
  }
  return h + '</section>';
}
function setTxt(ex, s) {
  if (ex.type === 'time') return s.reps + '秒';
  if (ex.type === 'reps') return s.reps + '回';
  return fmtKg(s.kg) + '×' + s.reps;
}

/* ---------- 記録(ワークアウト)シート ---------- */
function topSet(ex, sets) {
  let best = null, bv = -1;
  for (const s of sets) { const v = ex.type === 'wr' ? e1rm(s.kg, s.reps) : s.reps; if (v > bv) { bv = v; best = s; } }
  return best;
}
function vsLast(e, d) {
  const ex = entryEx(e), last = lastSession(e.ex, d);
  if (!last) return '<span class="vs new">初回</span>';
  const lt = topSet(ex, last.sets), cd = e.sets.filter(isDone);
  let h = '<span class="vs">前回 ' + setTxt(ex, lt) + '</span>';
  if (cd.length) {
    const ct = topSet(ex, cd);
    let d1 = ex.type === 'wr' ? ct.kg - lt.kg : 0, d2 = ct.reps - lt.reps, txt = '', cls = 'eq';
    if (d1) { txt = (d1 > 0 ? '+' : '') + fmtKg(d1) + 'kg'; cls = d1 > 0 ? 'up' : 'dn'; }
    else if (d2) { txt = (d2 > 0 ? '+' : '') + d2 + (ex.type === 'time' ? '秒' : '回'); cls = d2 > 0 ? 'up' : 'dn'; }
    else txt = '±0';
    h += '<span class="vs ' + cls + '">' + txt + '</span>';
  }
  return h;
}
function viewWorkout(sh) {
  const d = sh.d, w = ensureDay(d), live = S.active && S.active.d === d, t = ymd();
  let h = '<header class="hd">' + backBtn('closeWork') + '<div class="ht"><b>' + fmtMD(d) + (d === t ? ' のトレーニング' : ' の記録') + '</b><small id="wkEl">' + (w.start ? ico('timer', 'sm') + (live ? '経過 ' + fmtDur(elapsedMs(w)) : '所要 ' + fmtMin(elapsedMs(w) / 60000)) : (live ? '' : '時間は未計測')) + '</small></div><button class="btn pri sm" data-a="finish">' + (live ? '終了' : '完了') + '</button></header><div class="scroll"><div class="pad">';
  if (!w.entries.length) h += '<div class="empty big">種目を追加して記録を始めましょう</div>';
  w.entries.forEach((e, ei) => {
    const ex = entryEx(e);
    h += '<section class="card en"><div class="eh">' + partDot(ex.parts[0], 1) + '<div class="en-t"><b>' + esc(ex.name) + '</b><small>' + ex.parts.map(p => PN[p]).join('・') + ' ・ ' + EQN[ex.equip] + ' ・ 休憩' + exRest(ex) + '秒</small></div><button class="ib sm" data-a="delEntry" data-ei="' + ei + '" aria-label="種目を削除">' + ico('trash') + '</button></div><div class="vsr">' + vsLast(e, d) + '</div>';
    h += '<div class="sh"><span>#</span><span>' + (ex.type === 'wr' ? 'kg' : '') + '</span><span>' + (ex.type === 'time' ? '秒' : '回') + '</span><span>RPE</span><span></span></div>';
    e.sets.forEach((s, si) => {
      h += '<div class="sr' + (s.done ? ' dn' : '') + '"><span class="n">' + (si + 1) + '</span>' +
        (ex.type === 'wr' ? '<input type="number" inputmode="decimal" step="0.5" min="0" value="' + s.kg + '" data-i="kg" data-ei="' + ei + '" data-si="' + si + '" aria-label="重量">' : '<span></span>') +
        '<input type="number" inputmode="numeric" step="1" min="0" value="' + s.reps + '" data-i="reps" data-ei="' + ei + '" data-si="' + si + '" aria-label="回数">' +
        '<select data-c="rpe" data-ei="' + ei + '" data-si="' + si + '" aria-label="きつさ(RPE)"><option value="">-</option>' + [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => '<option' + (s.rpe === v ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>' +
        '<button class="ck' + (s.done ? ' on' : '') + '" data-a="setDone" data-ei="' + ei + '" data-si="' + si + '" aria-label="セット完了">' + ico('check') + '</button></div>';
    });
    h += '<div class="btns r"><button class="lnk" data-a="addSet" data-ei="' + ei + '">' + ico('plus') + 'セット追加</button>' + (e.sets.length > 1 ? '<button class="lnk" data-a="delSet" data-ei="' + ei + '">最後のセットを削除</button>' : '') + '</div></section>';
  });
  h += '<button class="btn big pri" data-a="openPick" data-d="' + d + '">' + ico('plus') + '種目を追加</button>';
  h += '<div class="sp tm"></div></div></div>';
  h += timerBar();
  return h;
}
function timerBar() {
  if (!S.timer) return '';
  const left = Math.max(0, Math.ceil((S.timer.end - Date.now()) / 1000));
  return '<div class="tbar" id="tbar"><div class="tp"><i id="tfill" style="width:' + clamp((1 - left / S.timer.total) * 100, 0, 100) + '%"></i></div><div class="tr"><span>休憩</span><b id="tleft">' + fmtClock(left) + '</b><button class="btn sm" data-a="tAdd">+15秒</button><button class="btn sm" data-a="tSkip">スキップ</button></div></div>';
}

/* ---------- 種目選択 ---------- */
function viewPick(sh) {
  const used = exUsage(), q = (sh.q || '').trim().toLowerCase();
  let list = allEx().filter(e => (!sh.part || (sh.part === 'fav' ? S.fav[e.id] : e.parts.includes(sh.part))) && (!sh.equip || e.equip === sh.equip) && (!q || e.name.toLowerCase().includes(q)));
  list.sort((a, b) => (used[b.id] || 0) - (used[a.id] || 0) || (a.custom === b.custom ? 0 : a.custom ? -1 : 1));
  const added = sh.mode === 'routine' ? ((S.routine[sh.dow] || {}).exIds || []) : ensureDay(sh.d).entries.map(e => e.ex);
  let h = '<header class="hd">' + backBtn('closePick') + '<div class="ht"><b>種目を選ぶ</b><small>' + list.length + '件</small></div><button class="btn pri sm" data-a="closePick">' + (sh.startAfter ? '開始' : '完了') + '</button></header>';
  h += '<div class="pk"><input type="search" class="srch" placeholder="種目名で検索" value="' + esc(sh.q || '') + '" data-i="pq" aria-label="種目検索">';
  h += '<div class="chips">' + [['', 'すべて'], ['fav', '★お気に入り']].concat(PARTS).map(p => '<button class="fc' + ((sh.part || '') === p[0] ? ' on' : '') + '" data-a="pf" data-k="part" data-v="' + p[0] + '">' + p[1] + '</button>').join('') + '</div>';
  h += '<div class="chips">' + [['', '器具:すべて']].concat(EQ).map(p => '<button class="fc' + ((sh.equip || '') === p[0] ? ' on' : '') + '" data-a="pf" data-k="equip" data-v="' + p[0] + '">' + p[1] + '</button>').join('') + '</div></div>';
  h += '<div class="scroll"><div class="pad tight">';
  if (!list.length) h += '<div class="empty">該当する種目がありません</div>';
  for (const e of list) {
    const on = added.includes(e.id);
    h += '<div class="pi' + (on ? ' on' : '') + '"><button class="pm" data-a="pickEx" data-id="' + e.id + '">' + partDot(e.parts[0], 1) + '<div><b>' + esc(e.name) + (e.custom ? ' <em>自作</em>' : '') + '</b><small>' + e.parts.map(p => PN[p]).join('・') + ' ・ ' + EQN[e.equip] + (used[e.id] ? ' ・ ' + used[e.id] + '回実施' : '') + '</small></div><span class="tg">' + (on ? ico('check') : ico('plus')) + '</span></button><button class="ib sm fv' + (S.fav[e.id] ? ' on' : '') + '" data-a="fav" data-id="' + e.id + '" aria-label="お気に入り">' + ico('star') + '</button></div>';
  }
  h += '<button class="btn big" data-a="newEx">' + ico('plus') + '種目を自作する</button><div class="sp"></div></div></div>';
  return h;
}

/* ---------- タブ ---------- */
function tabbar() {
  const T = [['home', 'ホーム', 'home'], ['hist', '履歴/分析', 'cal'], ['body', '体組成', 'scale'], ['set', 'その他', 'gear']];
  return '<nav class="tabs" role="tablist">' + T.map(t => '<button role="tab" aria-selected="' + (V.tab === t[0]) + '" class="' + (V.tab === t[0] ? 'on' : '') + '" data-a="tab" data-t="' + t[0] + '">' + ico(t[2]) + '<span>' + t[1] + '</span></button>').join('') + '</nav>';
}
