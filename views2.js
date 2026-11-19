'use strict';
/* 筋トレ管理 PWA - 画面(グラフ・レポート・体組成・食事・目標・ルーティン・設定) */
const sheetHd = (title, right) => '<header class="hd">' + backBtn('close') + '<div class="ht"><b>' + title + '</b></div>' + (right || '<span class="hs"></span>') + '</header>';

/* ---------- グラフ ---------- */
function rngSeg() { return '<div class="seg">' + [['m1', '1か月'], ['m3', '3か月'], ['all', '全期間']].map(p => '<button class="' + (V.rng === p[0] ? 'on' : '') + '" data-a="rng" data-v="' + p[0] + '">' + p[1] + '</button>').join('') + '</div>'; }
function weekStart(d) { return addD(d, -((dow(d) + 6) % 7)); }
function viewGraph() {
  const used = exUsage(), ids = Object.keys(used).filter(id => exById(id) && exById(id).type === 'wr').sort((a, b) => used[b] - used[a]);
  if (!V.gex || !ids.includes(V.gex)) V.gex = ids[0] || null;
  const rf = rangeFrom(), tn = ymd(), t0 = Object.keys(S.work).sort()[0] || addD(tn, -29);
  let h = '<header class="hd"><div class="ht l"><b>成長グラフ</b></div></header><div class="scroll"><div class="pad">' + rngSeg();
  if (!ids.length && !Object.keys(S.body).length) h += '<section class="card"><div class="empty big">記録がたまるとここに成長が表示されます。<br>設定 → デモデータで見た目を試せます。</div></section>';
  if (V.gex) {
    const ex = exById(V.gex), pbs = pbEvents().filter(p => p.ex === V.gex).map(p => p.d);
    const pts = e1Series(V.gex).filter(p => p.d >= rf).map(p => ({ d: p.d, v: p.v, pb: pbs.includes(p.d) }));
    const best = bestE1(V.gex), g = S.goals[V.gex] || 0;
    h += '<section class="card"><div class="ct">' + ico('bolt') + '推定1RMの推移</div><select class="sel" data-c="gex" aria-label="種目を選ぶ">' + ids.map(id => '<option value="' + id + '"' + (id === V.gex ? ' selected' : '') + '>' + esc(exById(id).name) + '</option>').join('') + '</select>';
    h += '<div class="stats"><div><b>' + fmtKg(best) + '</b><small>最高 推定1RM(kg)</small></div><div><b>' + (pts.length ? fmtKg(pts[pts.length - 1].v) : '-') + '</b><small>直近</small></div><div><b>' + (g ? Math.round(best / g * 100) + '%' : '-') + '</b><small>目標達成</small></div></div>';
    h += lineChart(pts, { goal: g || null, label: ex.name + 'の推定1RM', dec: 0 }) + '<small class="mut">黄色の点は自己ベスト更新日 ・ 推定1RMはEpley式(重量×(1+回数÷30))</small></section>';
  }
  const wb = [];
  const mon = weekStart(ymd()), nW = V.rng === 'm1' ? 5 : V.rng === 'm3' ? 13 : clamp(Math.ceil(diffDays(tn, t0) / 7) + 1, 8, 52);
  for (let i = nW - 1; i >= 0; i--) { const a = addD(mon, -7 * i), s = rangeStats(a, addD(a, 6)); wb.push({ label: pd(a).getMonth() + 1 + '/' + pd(a).getDate(), v: s.vol, n: s.n, color: i === 0 ? 'var(--acc)' : 'var(--acc2)' }); }
  h += '<section class="card"><div class="ct">' + ico('chart') + '週ごとの総ボリューム(kg)</div>' + barChart(wb, { h: 130, fmt: v => v >= 1000 ? (v / 1000).toFixed(1) + 't' : Math.round(v), label: '週ごとの総ボリューム' }) + '</section>';
  h += '<section class="card"><div class="ct">' + ico('cal') + '週ごとのトレーニング日数</div>' + barChart(wb.map(x => ({ label: x.label, v: x.n, color: x.color })), { h: 100, label: '週ごとのトレーニング日数' }) + '</section>';
  const rs = rangeStats(V.rng === 'm1' ? addD(tn, -29) : V.rng === 'm3' ? addD(tn, -89) : t0, tn), items = MAIN_PARTS.filter(p => rs.bal[p]).map(p => ({ label: PN[p], v: rs.bal[p], color: pcol(p) }));
  h += '<section class="card"><div class="ct">' + ico('target') + '部位バランス(' + (V.rng === 'm1' ? '直近1か月' : V.rng === 'm3' ? '直近3か月' : '全期間') + '・セット数)</div>' + (items.length ? '<div class="bal">' + donut(items, rs.sets + '', 'セット') + '<div class="lg">' + items.map(i => '<div><i style="background:' + i.color + '"></i>' + i.label + ' <b>' + Math.round(i.v / rs.sets * 100) + '%</b></div>').join('') + '</div></div>' : '<div class="empty">データがまだありません</div>') + '</section>';
  const bd = Object.keys(S.body).sort().filter(d => d >= rf);
  h += '<section class="card"><div class="ct">' + ico('scale') + '体組成<button class="lnk" data-a="sheet" data-t="body">記録する</button></div>';
  const wp = bd.filter(d => S.body[d].w > 0).map(d => ({ d, v: S.body[d].w })), fp = bd.filter(d => S.body[d].f > 0).map(d => ({ d, v: S.body[d].f }));
  h += '<small class="mut">体重(kg)</small>' + lineChart(wp, { dec: 1, h: 120, goal: S.settings.targetWeight || null, label: '体重の推移' }) + '<small class="mut">体脂肪率(%)</small>' + lineChart(fp, { dec: 1, h: 120, color: 'var(--acc3)', goal: S.settings.targetFat || null, label: '体脂肪率の推移' }) + '</section>';
  const pbs = pbEvents().slice(-5).reverse();
  if (pbs.length) h += '<section class="card"><div class="ct">' + ico('star') + '最近の自己ベスト更新</div>' + pbs.map(p => '<div class="ex"><i class="pd big" style="background:var(--warn)"></i><div><b>' + esc((exById(p.ex) || { name: '?' }).name) + '</b><small>' + fmtMD(p.d) + ' ・ 推定1RM ' + fmtKg(p.prev) + ' → ' + fmtKg(p.v) + 'kg</small></div></div>').join('') + '</section>';
  return h + '<div class="sp"></div></div></div>';
}

/* ---------- 週・月レポート ---------- */
function reportRange(mode, off) {
  const t = ymd();
  if (mode === 'w') { const a = addD(weekStart(t), off * 7); return [a, addD(a, 6)]; }
  const d = pd(t); d.setMonth(d.getMonth() + off, 1);
  const a = ymd(d), e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return [a, ymd(e)];
}
function viewReport() {
  const m = V.rep.mode, off = V.rep.off, [a, b] = reportRange(m, off), [pa, pb] = reportRange(m, off - 1);
  const cur = rangeStats(a, b), prev = rangeStats(pa, pb);
  const df = (c, p, unit) => { const d = c - p; if (!p && !c) return ''; return '<em class="' + (d > 0 ? 'up' : d < 0 ? 'dn' : 'eq') + '">' + (d > 0 ? '+' : '') + (unit === 'kg' ? fmtN(d) : Math.round(d * 10) / 10) + '</em>'; };
  let h = sheetHd('レポート') + '<div class="scroll"><div class="pad">';
  h += '<div class="seg"><button class="' + (m === 'w' ? 'on' : '') + '" data-a="repMode" data-v="w">週</button><button class="' + (m === 'm' ? 'on' : '') + '" data-a="repMode" data-v="m">月</button></div>';
  h += '<div class="nav2"><button class="ib" data-a="repOff" data-v="-1" aria-label="前へ">' + ico('left') + '</button><b>' + fmtMD(a).replace(/\(.\)/, '') + ' 〜 ' + fmtMD(b).replace(/\(.\)/, '') + '</b><button class="ib" data-a="repOff" data-v="1" aria-label="次へ"' + (off >= 0 ? ' disabled' : '') + '>' + ico('right') + '</button></div>';
  h += '<section class="card"><div class="stats big">' +
    '<div><b>' + cur.n + '</b><small>トレ日数' + df(cur.n, prev.n) + '</small></div>' +
    '<div><b>' + cur.sets + '</b><small>セット' + df(cur.sets, prev.sets) + '</small></div>' +
    '<div><b>' + fmtN(cur.vol) + '</b><small>総ボリューム(kg)' + df(cur.vol, prev.vol, 'kg') + '</small></div>' +
    '<div><b>' + Math.round(cur.min) + '</b><small>合計時間(分)' + df(cur.min, prev.min) + '</small></div>' +
    '<div><b>' + (cur.rpe ? cur.rpe.toFixed(1) : '-') + '</b><small>平均RPE</small></div></div><small class="mut">増減は前の' + (m === 'w' ? '週' : '月') + 'との比較</small></section>';
  const items = MAIN_PARTS.filter(p => cur.bal[p]).map(p => ({ label: PN[p], v: cur.bal[p], color: pcol(p) }));
  h += '<section class="card"><div class="ct">部位バランス</div>' + stackBar(items) + '<div class="lg2">' + items.map(i => '<span><i style="background:' + i.color + '"></i>' + i.label + ' ' + i.v + 'セット</span>').join('') + '</div></section>';
  const pbs = pbEvents().filter(p => p.d >= a && p.d <= b);
  h += '<section class="card"><div class="ct">' + ico('star') + '自己ベスト更新 ' + pbs.length + '件</div>' + (pbs.length ? pbs.map(p => '<div class="ex"><i class="pd big" style="background:var(--warn)"></i><div><b>' + esc((exById(p.ex) || { name: '?' }).name) + '</b><small>' + fmtMD(p.d) + ' ・ 推定1RM ' + fmtKg(p.prev) + ' → ' + fmtKg(p.v) + 'kg</small></div></div>').join('') : '<p class="mut">この期間の更新はありません</p>') + '</section>';
  const days = cur.days; let pr = 0, pn = 0;
  for (const d of days) { const f = foodTotal(d); if (f) { pr += f; pn++; } }
  h += '<section class="card"><div class="ct">' + ico('meat') + 'たんぱく質</div><p>記録した日の平均 <b>' + (pn ? Math.round(pr / pn) : '-') + 'g</b> / 目標 ' + proteinGoal() + 'g</p></section>';
  return h + '</div></div>';
}

/* ---------- 体組成 ---------- */
function viewBody(tab) {
  tab = tab === true;
  const t = ymd(), cur = S.body[t] || {};
  let h = (tab ? '<header class="hd"><div class="ht l"><b>体組成</b></div></header>' : sheetHd('体重・体脂肪')) + '<div class="scroll"><div class="pad"><section class="card"><div class="ct">' + fmtMD(t) + ' の記録</div><div class="frm">' +
    '<label>体重(kg)<input type="number" inputmode="decimal" step="0.1" min="0" id="bw" value="' + (cur.w || latestBody('w') || '') + '"></label>' +
    '<label>体脂肪率(%)<input type="number" inputmode="decimal" step="0.1" min="0" id="bf" value="' + (cur.f || latestBody('f') || '') + '"></label></div>' +
    '<button class="btn pri" data-a="saveBody">保存</button></section>';
  h += '<section class="card"><div class="ct">目標</div><div class="frm"><label>目標体重(kg)<input type="number" inputmode="decimal" step="0.1" min="0" data-i="tw" value="' + (S.settings.targetWeight || '') + '"></label><label>目標体脂肪(%)<input type="number" inputmode="decimal" step="0.1" min="0" data-i="tf" value="' + (S.settings.targetFat || '') + '"></label></div><label class="field">目標BMI(身長が必要。入力すると目標体重に換算)<input type="number" inputmode="decimal" step="0.1" min="10" max="40" data-i="tbmi" value="' + bmiOf(S.settings.targetWeight) + '"></label><label class="field">身長(cm)・BMIの計算に使います<input type="number" inputmode="decimal" step="0.1" min="100" max="250" data-i="hgt" value="' + (S.settings.height || '') + '"></label></section>';
  if (tab) h += predCard('w', '体重', 'kg', S.settings.targetWeight) + predCard('f', '体脂肪率', '%', S.settings.targetFat);
  const ds = Object.keys(S.body).sort().reverse().slice(0, 20);
  h += '<section class="card"><div class="ct">履歴</div>' + (ds.length ? ds.map(d => '<div class="ex"><div><b>' + fmtMD(d) + '</b><small>' + (S.body[d].w ? S.body[d].w + 'kg' : '') + (S.body[d].f ? ' ・ ' + S.body[d].f + '%' : '') + '</small></div><button class="ib sm" data-a="delBody" data-d="' + d + '" aria-label="削除">' + ico('trash') + '</button></div>').join('') : '<p class="mut">まだ記録がありません</p>') + '</section>';
  if (tab) {
    const rf = rangeFrom(), bd = Object.keys(S.body).sort().filter(d => d >= rf);
    const wp = bd.filter(d => S.body[d].w > 0).map(d => ({ d, v: S.body[d].w })), fp = bd.filter(d => S.body[d].f > 0).map(d => ({ d, v: S.body[d].f }));
    h += '<section class="card"><div class="ct">' + ico('chart') + '推移</div>' + rngSeg() + '<small class="mut">体重(kg)</small>' + lineChart(wp, { dec: 1, h: 120, goal: S.settings.targetWeight || null, label: '体重の推移' }) + '<small class="mut">体脂肪率(%)</small>' + lineChart(fp, { dec: 1, h: 120, color: 'var(--acc3)', goal: S.settings.targetFat || null, label: '体脂肪率の推移' }) + '</section>';
  }
  return h + '</div></div>';
}

function predCard(k, name, unit, target) {
  const p = predict(k, target); let body;
  if (p.st === 'none') return '';
  const cur = fmtKg(p.cur) + unit;
  if (p.st === 'notarget') body = '<p class="mut">目標' + name + 'を上の「目標」に入れると、達成予定日を計算します。</p>';
  else if (p.st === 'done') body = '<p><b>目標に到達しています!</b></p>';
  else if (p.st === 'few') body = '<p class="mut">予測には、1週間以上にわたる3回以上の記録が必要です。</p>';
  else if (p.st === 'away') body = '<p class="mut">直近の傾向では、目標に近づいていません。</p>';
  else if (p.st === 'far') body = '<p class="mut">このペースだと、達成まで3年以上かかる見込みです。</p>';
  else body = '<div class="pred"><b>' + fmtMD(p.date).replace(/\(.\)/, '') + '頃</b><span>あと約' + (p.left > 0 ? p.left : 0) + '日</span></div><small class="mut">直近6週間の傾向(週' + (p.slope * 7 > 0 ? '+' : '') + fmtKg(p.slope * 7) + unit + ')が続いた場合の目安です</small>';
  return '<section class="card"><div class="ct">' + ico('target') + name + 'の目標達成予測</div><small class="mut">現在 ' + cur + ' → 目標 ' + (target > 0 ? target + unit : '未設定') + '</small>' + body + '</section>';
}

/* ---------- 食事(たんぱく質) ---------- */
function viewFood() {
  const t = ymd(), tot = foodTotal(t), goal = proteinGoal(), list = S.food[t] || [];
  let h = sheetHd('たんぱく質') + '<div class="scroll"><div class="pad"><section class="card ctr">' + ring(tot / goal, 'var(--acc)', tot + 'g', '目標 ' + goal + 'g', 130) + '<small class="mut">目標は体重×1.8g(体重未記録時は設定値)の目安です</small></section>';
  h += '<section class="card"><div class="ct">ワンタップ追加</div><div class="foods">' + FOOD_BUILTIN.map((f, i) => '<button class="fd" data-a="addFood" data-n="' + esc(f[0]) + '" data-g="' + f[1] + '"><i style="background:' + f[3] + '">' + f[2] + '</i><b>' + esc(f[0]) + '</b><small>' + f[1] + 'g</small></button>').join('') + S.foodPreset.map(f => '<button class="fd" data-a="addFood" data-n="' + esc(f.name) + '" data-g="' + f.g + '"><i style="background:var(--acc2)">★</i><b>' + esc(f.name) + '</b><small>' + f.g + 'g</small></button>').join('') + '</div></section>';
  h += '<section class="card"><div class="ct">自由入力</div><div class="frm"><label>名前<input type="text" id="fn" maxlength="30" placeholder="例:ささみ"></label><label>たんぱく質(g)<input type="number" inputmode="decimal" id="fg" min="0" step="1"></label></div><div class="btns"><button class="btn pri" data-a="addFoodFree">追加</button><button class="btn" data-a="addPreset">よく使う食品に登録</button></div></section>';
  h += '<section class="card"><div class="ct">今日の記録</div>' + (list.length ? list.map(f => '<div class="ex"><div><b>' + esc(f.name) + '</b><small>' + esc(f.t) + ' ・ ' + f.g + 'g</small></div><button class="ib sm" data-a="delFood" data-id="' + esc(f.id) + '" aria-label="削除">' + ico('trash') + '</button></div>').join('') : '<p class="mut">まだ記録がありません</p>') + '</section>';
  return h + '</div></div>';
}

/* ---------- 目標 ---------- */
function viewGoals() {
  const base = ['bench', 'squat', 'deadlift', 'ohp'], used = Object.keys(exUsage()), more = Object.keys(S.goals).concat(used).filter(id => !base.includes(id) && exById(id) && exById(id).type === 'wr');
  const ids = base.concat(more.filter((x, i) => more.indexOf(x) === i));
  let h = sheetHd('1RM の目標') + '<div class="scroll"><div class="pad"><p class="mut">推定1RM(Epley式)での目標を設定します。空欄にすると目標を解除します。</p>';
  for (const id of ids) {
    const ex = exById(id), b = bestE1(id), g = S.goals[id] || 0;
    h += '<section class="card gl2"><div>' + ring(g ? b / g : 0, 'var(--acc)', g ? Math.round(b / g * 100) + '%' : '-', '', 70) + '</div><div class="gf"><b>' + esc(ex.name) + '</b><small>現在 ' + (b ? fmtKg(b) : '-') + 'kg</small><label>目標(kg)<input type="number" inputmode="decimal" min="0" step="2.5" data-i="goal" data-id="' + id + '" value="' + (g || '') + '"></label></div></section>';
  }
  h += '<div class="field"><label>他の種目の目標を追加<select class="sel" data-c="goalAdd"><option value="">種目を選ぶ…</option>' + allEx().filter(e => e.type === 'wr' && !ids.includes(e.id)).map(e => '<option value="' + e.id + '">' + esc(e.name) + '</option>').join('') + '</select></label></div>';
  return h + '</div></div>';
}

/* ---------- ルーティン ---------- */
function viewRoutine() {
  let h = sheetHd('ルーティン(曜日ごと)') + '<div class="scroll"><div class="pad">';
  for (const i of [1, 2, 3, 4, 5, 6, 0]) {
    const r = S.routine[i];
    h += '<section class="card"><div class="ct">' + WD[i] + '曜日<span class="seg sm"><button class="' + (!r ? 'on' : '') + '" data-a="rtKind" data-w="' + i + '" data-v="none">未設定</button><button class="' + (r && !r.rest ? 'on' : '') + '" data-a="rtKind" data-w="' + i + '" data-v="train">トレ</button><button class="' + (r && r.rest ? 'on' : '') + '" data-a="rtKind" data-w="' + i + '" data-v="rest">休養</button></span></div>';
    if (r && !r.rest) {
      h += '<input type="text" class="srch" maxlength="20" placeholder="メニュー名(例:胸・腕)" value="' + esc(r.name) + '" data-i="rtname" data-w="' + i + '" aria-label="メニュー名">';
      h += '<div class="rtl">' + r.exIds.map((id, k) => { const e = exById(id); return e ? '<span class="rt">' + partDot(e.parts[0]) + esc(e.name) + '<button data-a="rtDel" data-w="' + i + '" data-k="' + k + '" aria-label="外す">' + ico('x') + '</button></span>' : ''; }).join('') + '</div>';
      h += '<button class="btn" data-a="rtAdd" data-w="' + i + '">' + ico('plus') + '種目を追加</button>';
    }
    h += '</section>';
  }
  return h + '</div></div>';
}

/* ---------- 種目の自作・管理 ---------- */
function viewExEdit(sh) {
  const e = sh.id ? exById(sh.id) : null, d = sh.draft || (sh.draft = e ? JSON.parse(JSON.stringify(e)) : { name: '', parts: ['chest'], equip: 'db', type: 'wr', rest: 90, custom: true });
  const builtin = e && !e.custom;
  let h = sheetHd(e ? (builtin ? '休憩時間の設定' : '種目の編集') : '種目を自作') + '<div class="scroll"><div class="pad"><section class="card">';
  if (builtin) h += '<p><b>' + esc(e.name) + '</b></p><p class="mut">組み込み種目は休憩時間のみ変更できます。</p>';
  else {
    h += '<label class="field">種目名<input type="text" maxlength="40" data-i="exname" value="' + esc(d.name) + '" placeholder="例:インクラインケーブルフライ"></label>';
    h += '<div class="field">部位(最大3つ・先頭が主な部位)<div class="chips wrap">' + PARTS.map(p => '<button class="fc' + (d.parts.includes(p[0]) ? ' on' : '') + '" data-a="exPart" data-v="' + p[0] + '">' + p[1] + '</button>').join('') + '</div></div>';
    h += '<div class="field">器具<div class="chips wrap">' + EQ.map(p => '<button class="fc' + (d.equip === p[0] ? ' on' : '') + '" data-a="exEq" data-v="' + p[0] + '">' + p[1] + '</button>').join('') + '</div></div>';
    h += '<div class="field">記録のしかた<div class="chips wrap">' + TYPES.map(p => '<button class="fc' + (d.type === p[0] ? ' on' : '') + '" data-a="exType" data-v="' + p[0] + '">' + p[1] + '</button>').join('') + '</div></div>';
  }
  const restV = builtin ? exRest(e) : d.rest;
  h += '<label class="field">休憩時間(秒)<input type="number" inputmode="numeric" min="15" max="600" step="5" data-i="exrest" value="' + restV + '"></label></section>';
  h += '<div class="btns"><button class="btn pri" data-a="exSave">保存</button>' + (e && e.custom ? '<button class="btn dng" data-a="exDel">この種目を削除</button>' : '') + (builtin && S.exOv[e.id] ? '<button class="btn" data-a="exReset">標準に戻す(' + e.rest + '秒)</button>' : '') + '</div>';
  return h + '</div></div>';
}
function viewExMgr() {
  const q = (V.exq || '').toLowerCase();
  const list = allEx().filter(e => !q || e.name.toLowerCase().includes(q));
  let h = sheetHd('種目の管理', '<button class="ib" data-a="newEx" aria-label="種目を自作">' + ico('plus') + '</button>') + '<div class="pk"><input type="search" class="srch" placeholder="種目名で検索" value="' + esc(V.exq || '') + '" data-i="exq" aria-label="種目検索"></div><div class="scroll"><div class="pad tight">';
  h += '<p class="mut sm">タップで休憩時間・自作種目の編集ができます。</p>';
  for (const e of list.slice(0, 200)) h += '<button class="pi pm2" data-a="exEdit" data-id="' + e.id + '">' + partDot(e.parts[0], 1) + '<div><b>' + esc(e.name) + (e.custom ? ' <em>自作</em>' : '') + '</b><small>' + e.parts.map(p => PN[p]).join('・') + ' ・ ' + EQN[e.equip] + '</small></div><span class="rs2">' + exRest(e) + '秒</span></button>';
  return h + '<div class="sp"></div></div></div>';
}

/* ---------- 設定 ---------- */
function viewSettings() {
  const st = S.settings;
  let h = '<header class="hd"><div class="ht l"><b>設定</b></div><span class="ver">Ver.' + VER + '</span></header><div class="scroll"><div class="pad">';
  h += '<section class="card"><div class="ct">表示</div><div class="seg">' + [['auto', '自動'], ['light', 'ライト'], ['dark', 'ダーク']].map(t => '<button class="' + (st.theme === t[0] ? 'on' : '') + '" data-a="theme" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '</div><div class="ct" style="margin-top:14px">テーマカラー</div><div class="sw2 big">' + Object.keys(THEMES).map(k => '<button style="background:linear-gradient(135deg,' + THEMES[k][1] + ',' + THEMES[k][2] + ')" class="' + (st.themeColor === k ? 'on' : '') + '" data-a="themeColor" data-v="' + k + '" aria-label="' + THEMES[k][0] + '"></button>').join('') + '</div><div class="ct" style="margin-top:14px">ホーム上部の3枠</div>' + ['上', '中', '下'].map((n, i) => '<label class="field hrow"><span>' + n + '</span><select class="sel" data-c="heroSlot" data-k="' + i + '">' + HERO_IDS.map(id => '<option value="' + id + '"' + (st.hero[i] === id ? ' selected' : '') + '>' + HERO_NAMES[id] + '</option>').join('') + '</select></label>').join('') + '<button class="row2" data-a="sheet" data-t="order">' + ico('list') + '<span>ホーム画面の並び順・表示</span>' + ico('right') + '</button></section>';
  h += '<section class="card"><div class="ct">連続日数・休養日</div><label class="sw"><span><b>休養日も連続日数に数える</b><small>休養日に設定した日は連続が途切れません</small></span><input type="checkbox" data-c="countRest"' + (st.countRest ? ' checked' : '') + '></label>' +
    '<label class="field">休養日を提案する連続トレ日数<select class="sel" data-c="restAfter">' + [3, 4, 5, 6, 7].map(n => '<option' + (st.restAfter === n ? ' selected' : '') + ' value="' + n + '">' + n + '日連続</option>').join('') + '</select></label></section>';
  h += '<section class="card"><div class="ct">カレンダーの色分け</div>' + PARTS.map(p => '<div class="cr"><b>' + partDot(p[0], 1) + p[1] + '</b><div class="sw2">' + PALETTE.map(c => '<button style="background:' + c + '" class="' + (pcol(p[0]).toLowerCase() === c.toLowerCase() ? 'on' : '') + '" data-a="setCol" data-p="' + p[0] + '" data-c="' + c + '" aria-label="' + p[1] + 'の色 ' + c + '"></button>').join('') + '</div></div>').join('') + '<button class="btn" data-a="colReset">標準の色に戻す</button></section>';
  h += '<section class="card"><div class="ct">トレーニング</div><button class="row2" data-a="sheet" data-t="routine">' + ico('cal') + '<span>ルーティン(曜日ごとのメニュー)</span>' + ico('right') + '</button><button class="row2" data-a="sheet" data-t="goals">' + ico('target') + '<span>1RMの目標</span>' + ico('right') + '</button><button class="row2" data-a="sheet" data-t="exmgr">' + ico('list') + '<span>種目の管理・休憩時間</span>' + ico('right') + '</button><label class="field">週のトレーニング目標(日)<select class="sel" data-c="weekGoal">' + [1, 2, 3, 4, 5, 6, 7].map(n => '<option value="' + n + '"' + (st.weekGoal === n ? ' selected' : '') + '>' + n + '日/週</option>').join('') + '</select></label><label class="field">標準の休憩時間(秒)<input type="number" inputmode="numeric" min="15" max="600" step="5" data-i="defRest" value="' + st.defaultRest + '"></label><label class="field">たんぱく質の目標(g・体重未記録時)<input type="number" inputmode="numeric" min="20" max="400" data-i="pgoal" value="' + st.proteinGoal + '"></label></section>';
  h += '<section class="card"><div class="ct">リマインド</div><p class="mut sm">iPhoneのホーム画面アプリは、サーバーなしでは指定時刻に通知を出せません。代わりにカレンダーへ繰り返し予定(通知つき)を登録します。</p><label class="field">時刻<input type="time" data-i="rtime" value="' + st.remindTime + '"></label><div class="chips wrap">' + [1, 2, 3, 4, 5, 6, 0].map(i => '<button class="fc' + (st.remindDays.includes(i) ? ' on' : '') + '" data-a="rDay" data-v="' + i + '">' + WD[i] + '</button>').join('') + '</div><button class="btn" data-a="ics">' + ico('cal') + 'カレンダーに登録(.ics)</button></section>';
  h += '<section class="card"><div class="ct">保存・共有</div>' + (FSA.ok && FSA.h ? '<div class="kv"><span>保存先</span><b>フォルダ「' + esc(FSA.h.name) + '」' + (FSA.perm === 'granted' ? '' : '(要許可)') + '</b></div>' : '<div class="kv"><span>保存先</span><b>この端末のアプリ内(ブラウザ保存)</b></div>') + '<div class="kv"><span>最終保存</span><b id="lastSaved">' + (st.lastSaved ? new Date(st.lastSaved).toLocaleString('ja-JP') : '-') + '</b></div><div class="kv"><span>最終バックアップ</span><b>' + (st.lastBackup ? new Date(st.lastBackup).toLocaleString('ja-JP') : '未実施') + '</b></div><div class="kv"><span>端末名</span><input type="text" class="inl" maxlength="20" data-i="device" value="' + esc(st.device) + '" aria-label="端末名"></div>' +
    '<div class="btns col"><button class="btn pri" data-a="backup">' + ico('copy') + 'バックアップを書き出す</button><label class="btn file">設定を読み込む<input type="file" data-c="import" hidden></label><button class="btn" data-a="saveNow">今すぐ保存</button></div>' + (FSA.ok ? '<div class="ct" style="margin-top:14px">PCの保存先フォルダ</div><p class="mut sm">Googleドライブのフォルダなども指定できます。指定すると、バックアップはこのフォルダに「' + fileName() + '」として上書き保存されます。</p><div class="btns col"><button class="btn" data-a="fsaPick">場所を変更</button>' + (FSA.h ? '<button class="btn" data-a="fsaLoad">保存先から読み込む</button><button class="btn" data-a="fsaClear">既定に戻す</button></div><label class="sw"><span><b>変更のたびに自動で上書き保存</b><small>許可済みの間、数秒ごとにまとめて保存します</small></span><input type="checkbox" data-c="fsaAuto"' + (FSA.auto ? ' checked' : '') + '></label>' : '</div>') : '<p class="mut sm">iPhoneで読み込む時は「設定を読み込む」から「ファイル」アプリ→Googleドライブを選べます(ファイルアプリの「…」→「編集」でGoogle Driveをオンにしてください)。書き出し時も、共有画面の「ファイルに保存」からGoogleドライブを選べます。</p>') + '<small class="mut">ブラウザの保存領域はiOSの仕様で消える場合があります。定期的にバックアップを書き出し、iCloud Driveなどに保存してください。書き出したファイルは別の端末でも読み込めます。</small></section>';
  h += '<section class="card"><div class="ct">デモデータ</div><p class="mut sm">見た目を試すためのサンプルです。いつでもまとめて消せます(自分の記録は消えません)。</p><div class="btns"><button class="btn" data-a="demoOn">サンプルを追加</button><button class="btn dng" data-a="demoOff">サンプルを削除</button></div></section>';
  h += '<section class="card"><div class="ct">このアプリについて</div><p class="mut sm">筋トレ管理 Ver.' + VER + '<br>ウィジェット・Apple Watch・ロック画面表示・指定時刻の通知は、ホーム画面アプリ(PWA)では実現できません。</p></section>';
  return h + '<div class="sp"></div></div></div>';
}

/* ---------- バックアップ ---------- */
function exportObj() {
  const s = S.settings, common = JSON.parse(JSON.stringify({ created: S.created, settings: Object.assign({}, s), custom: S.custom, exOv: S.exOv, fav: S.fav, work: S.work, rest: S.rest, body: S.body, food: S.food, foodPreset: S.foodPreset, goals: S.goals, routine: S.routine, demo: S.demo }));
  const pcv = { theme: s.theme, hideInstall: s.hideInstall };
  for (const k of ['theme', 'hideInstall', 'device', 'lastSaved', 'lastBackup']) delete common.settings[k];
  const pc = Object.assign({}, S.pcOther); pc[s.device || 'iPhone'] = pcv;
  return { 'アプリ': '筋トレ管理', 'Ver': VER, '共通': common, 'PC': pc };
}
function importObj(o) {
  if (!isObj(o) || !isObj(o['共通'])) throw new Error('形式が違います');
  const c = o['共通'], dev = S.settings.device, mine = S.settings;
  const n = fixState(Object.assign({}, c, { settings: Object.assign({}, c.settings || {}, { device: dev }) }));
  const pc = isObj(o['PC']) ? o['PC'] : {};
  const my = isObj(pc[dev]) ? pc[dev] : {};
  n.settings.device = dev;
  n.settings.theme = ['auto', 'dark', 'light'].includes(my.theme) ? my.theme : mine.theme;
  n.settings.hideInstall = typeof my.hideInstall === 'boolean' ? my.hideInstall : mine.hideInstall;
  const other = Object.assign({}, pc); delete other[dev];
  n.pcOther = other;
  S = n; _exCache = null; save();
}
function fileName() { return '筋トレ管理設定.json'; }
async function doBackup() {
  if (await fsaBackup()) return;
  const txt = JSON.stringify(exportObj(), null, 1), name = fileName();
  S.settings.lastBackup = Date.now(); save();
  try {
    const f = new File([txt], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('バックアップを書き出しました');
}
function buildIcs() {
  const days = S.settings.remindDays, tm = S.settings.remindTime.replace(':', '') + '00', map = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const t = ymd().replace(/-/g, '');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kintore//JP', 'BEGIN:VEVENT', 'UID:kintore-remind@local', 'DTSTAMP:' + t + 'T000000Z', 'DTSTART:' + t + 'T' + tm, 'DURATION:PT1H', 'RRULE:FREQ=WEEKLY;BYDAY=' + days.map(i => map[i]).join(','), 'SUMMARY:筋トレの時間です', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:筋トレの時間です', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

/* ---------- ホームの並び順 ---------- */
function viewOrder() {
  let h = sheetHd('ホーム画面の並び順') + '<div class="scroll"><div class="pad"><p class="mut sm">左の「≡」を押したまま上下に動かすと並べ替えられます。▲▼でも動かせます。</p><div class="olist" id="olist">';
  S.settings.homeOrder.forEach(k => {
    h += '<div class="oi" data-id="' + k + '"><span class="dh" data-drag aria-label="ドラッグで並べ替え">' + ico('drag') + '</span><b>' + HOME_NAMES[k] + '</b><button class="ib sm" data-a="ordMove" data-id="' + k + '" data-v="-1" aria-label="上へ">' + ico('up') + '</button><button class="ib sm" data-a="ordMove" data-id="' + k + '" data-v="1" aria-label="下へ">' + ico('down') + '</button><input type="checkbox" data-c="ordShow" data-id="' + k + '"' + (S.settings.homeHide.includes(k) ? '' : ' checked') + ' aria-label="表示する"></div>';
  });
  return h + '</div><small class="mut">右のチェックを外すと、ホームに表示しません。</small><button class="btn" data-a="ordReset">標準の並びに戻す</button></div></div>';
}

/* ---------- 連続記録の履歴 ---------- */
function viewStreak() {
  const runs = streakRuns(), best = runs.reduce((a, r) => Math.max(a, r.n), 0), cur = streak();
  let h = sheetHd('連続記録の履歴') + '<div class="scroll"><div class="pad"><section class="card ctr"><div class="stats big" style="width:100%"><div><b>' + cur + '</b><small>いまの連続(日)</small></div><div><b>' + best + '</b><small>最長の連続(日)</small></div><div><b>' + runs.length + '</b><small>連続の回数</small></div></div><small class="mut">' + (S.settings.countRest ? '休養日も連続に数える設定です' : '休養日は連続に数えない設定です') + '</small></section>';
  h += '<section class="card"><div class="ct">' + ico('flame') + '期間ごとの記録</div>';
  if (!runs.length) h += '<p class="mut">まだ連続記録がありません</p>';
  const bi = runs.findIndex(r => r.n === best);
  runs.slice(0, 30).forEach((r, i) => {
    h += '<div class="run"><div class="rt2"><b>' + fmtMD(r.a).replace(/\(.\)/, '') + (r.n > 1 ? ' 〜 ' + fmtMD(r.b).replace(/\(.\)/, '') : '') + '</b><span>' + r.n + '日' + (r.now ? '(継続中)' : '') + (i === bi && best > 1 ? ' ★最長' : '') + '</span></div><div class="rb"><i style="width:' + Math.max(r.n / best * 100, 4) + '%"></i></div></div>';
  });
  return h + '</section></div></div>';
}

function bmiOf(w) { const h = S.settings.height; return (w > 0 && h > 0) ? (Math.round(w / Math.pow(h / 100, 2) * 10) / 10) : ''; }
