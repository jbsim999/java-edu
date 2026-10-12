const { readFileSync, writeFileSync, renameSync } = require('node:fs');
const path = require('node:path');

const MAX_BYTES = 8 * 1024 * 1024;
const validKey = (key) => typeof key === 'string' && /^java-edu:[a-z0-9:-]{1,100}$/.test(key);

module.exports.createDesktopStorage = (dataRoot) => {
  const filename = path.join(dataRoot, 'learning-state.json');
  let data = Object.create(null);
  try {
    const text = readFileSync(filename, 'utf8');
    if (Buffer.byteLength(text) <= MAX_BYTES) {
      const stored = JSON.parse(text);
      for (const [key, value] of Object.entries(stored)) if (validKey(key) && typeof value === 'string') data[key] = value;
    }
  } catch { /* New or corrupt storage starts with an empty, recoverable learning state. */ }
  const save = (next) => {
    const text = JSON.stringify(next);
    if (Buffer.byteLength(text) > MAX_BYTES) throw new Error('학습 저장 공간 8 MiB를 초과했습니다.');
    writeFileSync(`${filename}.tmp`, text, { mode: 0o600 });
    renameSync(`${filename}.tmp`, filename);
    data = next;
  };
  return {
    getItem(key) { if (!validKey(key)) throw new Error('지원하지 않는 학습 데이터 키입니다.'); return data[key] ?? null; },
    setItem(key, value) { if (!validKey(key) || typeof value !== 'string') throw new Error('학습 데이터 형식을 확인하세요.'); save({ ...data, [key]: value }); },
    removeItem(key) { if (!validKey(key)) throw new Error('지원하지 않는 학습 데이터 키입니다.'); const next = { ...data }; delete next[key]; save(next); },
  };
};
