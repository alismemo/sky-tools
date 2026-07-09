import fs from 'node:fs/promises';

const URLS = {
  candle: 'https://9-bit.jp/skygold/4920/',
  daily: 'https://9-bit.jp/skygold/6593',
  shard: 'https://9-bit.jp/skygold/23767/'
};

function clean(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/li>|<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#038;/g, '&')
    .replace(/\r/g, '')
    .split('\n')
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 sky-tools updater (+GitHub Actions)',
      'accept': 'text/html,application/xhtml+xml'
    }
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return clean(await res.text());
}

function lines(text) { return text.split('\n').map(s => s.trim()).filter(Boolean); }
function between(text, startRe, endReList = []) {
  const a = text.search(startRe);
  if (a < 0) return '';
  const rest = text.slice(a);
  let end = rest.length;
  for (const re of endReList) {
    const m = rest.slice(10).search(re);
    if (m >= 0) end = Math.min(end, m + 10);
  }
  return rest.slice(0, end);
}
function valueAfter(arr, label) {
  const i = arr.findIndex(l => l.includes(label));
  if (i < 0) return '';
  const same = arr[i].replace(label, '').trim();
  if (same) return same;
  return arr[i + 1] || '';
}
function uniq(a) { return [...new Set(a.map(s => s.trim()).filter(Boolean))]; }

function parseDaily(text) {
  const sec = between(text, /今日（|今日\(/, [/関連情報/, /デイリークエストとは/]) || text;
  const ls = lines(sec);
  const quests = [];
  const start = ls.findIndex(l => /デイリークエスト.*覧/.test(l));
  for (let i = Math.max(0, start + 1); i < ls.length; i++) {
    const l = ls[i];
    if (/関連情報|デイリークエストとは|おすすめ/.test(l)) break;
    if (/Image|開始時間|終了時間|主な対象エリア|今日/.test(l)) continue;
    if (l.length >= 4 && l.length <= 80) quests.push(l);
  }
  return {
    period: `${valueAfter(ls, '開始時間') || ''} ～ ${valueAfter(ls, '終了時間') || ''}`.replace(/^ ～ $/, ''),
    area: valueAfter(ls, '主な対象エリア') || '未取得',
    quests: uniq(quests).slice(0, 4)
  };
}

function parseCandle(text) {
  const sec = between(text, /今日のデイリー大キャンドル/, [/関連情報/, /日替わり大キャンドルとは/]) || text;
  const ls = lines(sec);
  const locStart = ls.findIndex(l => l.includes('今日のデイリー大キャンドルの場所'));
  const locations = [];
  for (let i = locStart + 1; i > 0 && i < ls.length; i++) {
    const l = ls[i].replace(/^▲\s*/, '');
    if (/関連情報|おすすめ|日替わり/.test(l)) break;
    if (/Image|今日のデイリー|対象期間|期間|エリア|個数|一覧/.test(l)) continue;
    if (l.length >= 4) locations.push(l);
  }
  return {
    period: valueAfter(ls, '期間') || '未取得',
    area: valueAfter(ls, 'エリア') || '未取得',
    count: valueAfter(ls, '個数') || String(locations.length || '未取得'),
    locations: uniq(locations).slice(0, 8)
  };
}

function parseShard(text) {
  const sec = between(text, /今日.*闇の破片|本日.*闇の破片|闇の破片.*今日/, [/関連情報/, /闇の破片とは/, /コメント/]) || text.slice(0, 3000);
  const ls = lines(sec);
  const locations = [];
  const times = [];
  for (const l of ls) {
    if (/\d{1,2}:\d{2}|\d{1,2}時/.test(l) && l.length < 100) times.push(l);
    if (/(場所|エリア|落下|出現|赤色|黒色|雨林|草原|峡谷|捨て|書庫|孤島)/.test(l) && l.length >= 3 && l.length < 120) {
      if (!/目次|攻略|まとめ|コメント|SHARE|CATEGORY/.test(l)) locations.push(l.replace(/^▲\s*/, ''));
    }
  }
  return {
    summary: ls.find(l => /今日|本日/.test(l) && /闇|破片/.test(l)) || '9bitから取得しました',
    locations: uniq(locations).slice(0, 8),
    times: uniq(times).slice(0, 8)
  };
}

async function main() {
  const errors = [];
  let dailyText = '', candleText = '', shardText = '';
  for (const [key, url] of Object.entries(URLS)) {
    try {
      const t = await fetchText(url);
      if (key === 'daily') dailyText = t;
      if (key === 'candle') candleText = t;
      if (key === 'shard') shardText = t;
    } catch (e) { errors.push(String(e.message || e)); }
  }
  const data = {
    updatedAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    source: URLS,
    status: errors.length ? 'partial' : 'ok',
    daily: dailyText ? parseDaily(dailyText) : { period:'取得失敗', area:'取得失敗', quests:[] },
    candle: candleText ? parseCandle(candleText) : { period:'取得失敗', area:'取得失敗', count:'取得失敗', locations:[] },
    shard: shardText ? parseShard(shardText) : { summary:'取得失敗', locations:[], times:[] },
    notes: errors
  };
  await fs.mkdir('data', { recursive: true });
  await fs.writeFile('data/sky.json', JSON.stringify(data, null, 2), 'utf8');
  await fs.writeFile('data/latest.txt', data.updatedAt + '\n', 'utf8');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
