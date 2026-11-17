'use strict';
/* 筋トレ管理 PWA - SVG グラフ */
function lineChart(pts, o) {
  o = o || {};
  const W = 320, H = o.h || 150, L = 34, R = 10, T = 12, B = 22;
  if (!pts.length) return '<div class="empty">データがまだありません</div>';
  const col = o.color || 'var(--acc)';
  let vals = pts.map(p => p.v);
  if (o.goal) vals = vals.concat([o.goal]);
  let mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
  if (mx - mn < 1) { mx += 1; mn -= 1; }
  const pad2 = (mx - mn) * 0.12; mn -= pad2; mx += pad2;
  const t0 = pd(pts[0].d).getTime(), t1 = pd(pts[pts.length - 1].d).getTime();
  const X = d => pts.length === 1 || t1 === t0 ? (L + W - R) / 2 : L + (pd(d).getTime() - t0) / (t1 - t0) * (W - L - R);
  const Y = v => T + (1 - (v - mn) / (mx - mn)) * (H - T - B);
  let g = '';
  for (let i = 0; i < 4; i++) {
    const v = mn + (mx - mn) * i / 3, y = Y(v);
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" class="gl"/><text x="' + (L - 4) + '" y="' + (y + 3) + '" text-anchor="end" class="gt">' + (o.dec ? v.toFixed(o.dec) : Math.round(v)) + '</text>';
  }
  const path = pts.map((p, i) => (i ? 'L' : 'M') + X(p.d).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
  const area = pts.length > 1 ? path + ' L' + X(pts[pts.length - 1].d).toFixed(1) + ' ' + (H - B) + ' L' + X(pts[0].d).toFixed(1) + ' ' + (H - B) + ' Z' : '';
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img" aria-label="' + esc(o.label || 'グラフ') + '">' + g;
  if (o.goal) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(o.goal) + '" y2="' + Y(o.goal) + '" stroke="var(--ok)" stroke-dasharray="4 3" stroke-width="1.5"/><text x="' + (W - R) + '" y="' + (Y(o.goal) - 4) + '" text-anchor="end" class="gt" fill="var(--ok)">目標 ' + o.goal + '</text>';
  if (area) s += '<path d="' + area + '" fill="' + col + '" opacity=".12"/>';
  s += '<path d="' + path + '" fill="none" stroke="' + col + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
  pts.forEach((p, i) => { s += '<circle cx="' + X(p.d).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="' + (i === pts.length - 1 ? 4.5 : 2.5) + '" fill="' + (p.pb ? 'var(--warn)' : col) + '"/>'; });
  const lab = [pts[0], pts[pts.length - 1]];
  s += '<text x="' + X(lab[0].d) + '" y="' + (H - 6) + '" class="gt" text-anchor="start">' + fmtMD(lab[0].d).replace(/\(.\)/, '') + '</text>';
  if (pts.length > 1) s += '<text x="' + X(lab[1].d) + '" y="' + (H - 6) + '" class="gt" text-anchor="end">' + fmtMD(lab[1].d).replace(/\(.\)/, '') + '</text>';
  return s + '</svg>';
}
function barChart(items, o) {
  o = o || {};
  const W = 320, H = o.h || 120, L = 8, R = 8, T = 14, B = 20;
  if (!items.length) return '<div class="empty">データがまだありません</div>';
  const mx = Math.max.apply(null, items.map(i => i.v).concat([1]));
  const bw = (W - L - R) / items.length;
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img" aria-label="' + esc(o.label || '棒グラフ') + '"><line x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" class="gl"/>';
  items.forEach((it, i) => {
    const h = it.v / mx * (H - T - B), x = L + i * bw + bw * 0.2, w = bw * 0.6;
    s += '<rect x="' + x.toFixed(1) + '" y="' + (H - B - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(h, it.v > 0 ? 2 : 0).toFixed(1) + '" rx="3" fill="' + (it.color || 'var(--acc)') + '"' + (it.dim ? ' opacity=".35"' : '') + '/>';
    if (it.v > 0 && items.length <= 10) s += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - B - h - 3).toFixed(1) + '" text-anchor="middle" class="gt">' + (o.fmt ? o.fmt(it.v) : Math.round(it.v)) + '</text>';
    if (i % Math.ceil(items.length / 7) === 0 || i === items.length - 1 && items.length <= 8) s += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" class="gt">' + esc(it.label) + '</text>';
  });
  return s + '</svg>';
}
function donut(items, centerTop, centerSub) {
  const tot = items.reduce((a, i) => a + i.v, 0);
  if (!tot) return '<div class="empty">データがまだありません</div>';
  const r = 38, c = 2 * Math.PI * r;
  let off = 0, s = '<svg viewBox="0 0 100 100" class="donut" role="img" aria-label="部位バランス"><g transform="rotate(-90 50 50)">';
  items.forEach(i => {
    const len = i.v / tot * c;
    s += '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + i.color + '" stroke-width="14" stroke-dasharray="' + len.toFixed(2) + ' ' + (c - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"/>';
    off += len;
  });
  s += '</g><text x="50" y="' + (centerSub ? 50 : 55) + '" text-anchor="middle" class="dn">' + esc(centerTop) + '</text>';
  if (centerSub) s += '<text x="50" y="62" text-anchor="middle" class="ds">' + esc(centerSub) + '</text>';
  return s + '</svg>';
}
function ring(pct, color, big, sub, size) {
  const r = 40, c = 2 * Math.PI * r, p = clamp(pct, 0, 1);
  return '<svg viewBox="0 0 100 100" width="' + (size || 96) + '" height="' + (size || 96) + '" role="img" aria-label="' + esc(sub || '') + '"><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="10"/><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (p * c).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 50 50)"/><text x="50" y="' + (sub ? 52 : 57) + '" text-anchor="middle" class="rn">' + esc(big) + '</text>' + (sub ? '<text x="50" y="66" text-anchor="middle" class="rs">' + esc(sub) + '</text>' : '') + '</svg>';
}
function stackBar(items) {
  const tot = items.reduce((a, i) => a + i.v, 0);
  if (!tot) return '<div class="empty">データがまだありません</div>';
  return '<div class="stack">' + items.map(i => '<i style="flex:' + i.v + ';background:' + i.color + '" title="' + esc(i.label) + '"></i>').join('') + '</div>';
}
