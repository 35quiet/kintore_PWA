/* PC用: 保存先フォルダの指定(File System Access API)。フォルダの記憶はこのPC/ブラウザだけに保存(設定ファイルには入れない) */
const FSA = { ok: typeof window.showDirectoryPicker === 'function', h: null, auto: false, perm: '', t: 0 };
function _idb() { return new Promise((res, rej) => { const q = indexedDB.open('kintore-fs', 1); q.onupgradeneeded = () => q.result.createObjectStore('k'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
async function _idbGet(k) { const d = await _idb(); return new Promise(res => { const r = d.transaction('k').objectStore('k').get(k); r.onsuccess = () => res(r.result); r.onerror = () => res(undefined); }); }
async function _idbSet(k, v) { const d = await _idb(); return new Promise(res => { const tx = d.transaction('k', 'readwrite'); if (v === undefined) tx.objectStore('k').delete(k); else tx.objectStore('k').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => res(); }); }
async function fsaInit() {
  if (!FSA.ok) return;
  try { FSA.h = (await _idbGet('dir')) || null; FSA.auto = !!(await _idbGet('auto')); if (FSA.h) FSA.perm = await FSA.h.queryPermission({ mode: 'readwrite' }); } catch (e) { FSA.h = null; }
  if (typeof render === 'function' && FSA.h) render();
}
async function fsaEnsure() {
  if (!FSA.h) return false;
  try { FSA.perm = await FSA.h.queryPermission({ mode: 'readwrite' }); if (FSA.perm !== 'granted') FSA.perm = await FSA.h.requestPermission({ mode: 'readwrite' }); } catch (e) { return false; }
  return FSA.perm === 'granted';
}
async function fsaPick() {
  try { const h = await window.showDirectoryPicker({ id: 'kintore', mode: 'readwrite' }); FSA.h = h; FSA.perm = 'granted'; await _idbSet('dir', h); toast('保存先を「' + h.name + '」にしました'); } catch (e) { if (!e || e.name !== 'AbortError') toast('フォルダを選べませんでした'); }
  render();
}
async function fsaClear() { FSA.h = null; FSA.perm = ''; FSA.auto = false; await _idbSet('dir'); await _idbSet('auto'); toast('保存先を既定(ブラウザ内)に戻しました'); render(); }
async function fsaWrite() {
  const txt = JSON.stringify(exportObj(), null, 1);
  const fh = await FSA.h.getFileHandle(fileName(), { create: true }), w = await fh.createWritable();
  await w.write(txt); await w.close();
}
async function fsaBackup() { /* doBackupから呼ぶ。成功したらtrue */
  if (!FSA.h) return false;
  if (!(await fsaEnsure())) { toast('フォルダへの書き込みが許可されませんでした'); return false; }
  try { await fsaWrite(); S.settings.lastBackup = Date.now(); save(); toast('「' + FSA.h.name + '」に上書き保存しました'); return true; } catch (e) { toast('フォルダに保存できませんでした'); return false; }
}
async function fsaLoad() {
  if (!FSA.h) return;
  if (!(await fsaEnsure())) { toast('フォルダの読み取りが許可されませんでした'); return; }
  try {
    const f = await (await FSA.h.getFileHandle(fileName())).getFile(), o = JSON.parse(await f.text());
    if (!confirm('いまのデータを、「' + FSA.h.name + '」の内容で置き換えます。よろしいですか?')) return;
    importObj(o); V.stack = []; render(); toast('読み込みました');
  } catch (e) { toast('保存先に「' + fileName() + '」が見つかりません'); }
}
async function fsaAutoSet(on) { FSA.auto = !!on; await _idbSet('auto', FSA.auto); if (on && FSA.perm !== 'granted') await fsaEnsure(); render(); }
(function () { /* 変更のたびに、許可済みなら保存先フォルダへ自動で上書き(数秒まとめて) */
  const base = save;
  save = function () { base(); if (FSA.ok && FSA.h && FSA.auto && FSA.perm === 'granted') { clearTimeout(FSA.t); FSA.t = setTimeout(() => { fsaWrite().then(() => { S.settings.lastBackup = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }).catch(() => {}); }, 3000); } };
})();
fsaInit();
