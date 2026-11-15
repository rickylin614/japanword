(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./vendor/msgpack.min.js'));
  else root.JP_FAVORITES_TRANSFER = factory(root.MessagePack);
})(typeof window === 'object' ? window : globalThis, function (messagePack) {
  'use strict';
  const MAX_BYTES = 2 * 1024 * 1024;
  const MAX_ITEMS = 50000;
  function validate(data) {
    if (!data || data.format !== 'japanword-favorites' || data.version !== 1 ||
        typeof data.exportedAt !== 'string' || !Number.isFinite(Date.parse(data.exportedAt)) ||
        !Array.isArray(data.favorites) || data.favorites.length > MAX_ITEMS ||
        data.favorites.some(id => typeof id !== 'string' || !id.length || id.length > 128)) {
      throw new Error('這不是支援的收藏備份，或檔案內容已損壞。');
    }
    return data;
  }
  function encode(ids, now = new Date()) {
    return messagePack.encode(validate({format:'japanword-favorites', version:1, exportedAt:now.toISOString(), favorites:[...new Set(ids)]}));
  }
  function decode(bytes) {
    if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) throw new Error('請選擇小於或等於 2 MB 的收藏備份。');
    try {
      return validate(messagePack.decode(bytes, {maxStrLength:256, maxArrayLength:MAX_ITEMS, maxMapLength:16, maxBinLength:0, maxExtLength:0}));
    } catch { throw new Error('無法讀取收藏備份：格式不支援或檔案已損壞。'); }
  }
  function merge(existing, incoming, knownIds, migration = {}) {
    const migrate = id => Object.hasOwn(migration, id) ? migration[id] : id;
    const result = new Set(existing.map(migrate));
    let added = 0, skipped = 0;
    for (const id of new Set(incoming.map(migrate))) {
      if (!knownIds.has(id)) { skipped++; continue; }
      if (!result.has(id)) { result.add(id); added++; }
    }
    return {favorites:[...result], added, skipped};
  }
  function filename(now = new Date()) {
    // UTC is included explicitly so files from different devices remain comparable.
    return 'japanword-favorites-' + now.toISOString().replace(/[:.]/g, '-') + '.msgpack';
  }
  return {MAX_BYTES, encode, decode, merge, filename};
});
