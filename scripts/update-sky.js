const fs = require('fs');
const path = require('path');

const URLS = {
  daily: 'https://9-bit.jp/skygold/6593/',
  candles: 'https://9-bit.jp/skygold/4920/',
  shards: 'https://9-bit.jp/skygold/23767/'
};

function decodeEntities(s) {
  return String(s || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function htmlToLines(html) {
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/tr>|<\/li>|<\/td>|<\/th>/gi, '\n')
    .replace(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi, '\n$1\n')
    .replace(/<[^>]+>/g, '\n');
  t = decodeEntities(t);
  return t.split(/\n+/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function findLine(lines, re) {
  const line = lines.find(l => re.test(l));
  return line || '';
}

function afterLabelValue(lines, labelRe, maxAhead = 3) {
  const i = lines.findIndex(l => labelRe.test(l));
  if (i < 0) return '';
  const same = lines[i].replace(labelRe, '').trim();
  if (same) return same;
  for (let j = i + 1; j <= Math.min(lines.length - 1, i + maxAhead); j++) {
    const v = lines[j].trim();
    if (v && !/^(Image|画像|▲)$/.test(v)) return v;
  }
  return '';
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 SkyToolsBot/1.0 (+https://github.com/alismemo/sky-tools)'
    }
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

function parseDaily(html) {
  const lines = htmlToLines(html);
  const area = afterLabelValue(lines, /^主な対象エリア\s*/);
  const start = afterLabelValue(lines, /^開始時間\s*/);
  const end = afterLabelValue(lines, /^終了時間\s*/);
  const idx = lines.findIndex(l => l.replace(/\s/g, '').includes('デイリークエスト一覧'));
  const quests = [];
  if (idx >= 0) {
    for (let i = idx + 1; i < Math.min(lines.length, idx + 40); i++) {
      const l = lines[i];
      if (/関連情報|デイリークエストとは/.test(l)) break;
      if (/Image|アイコン|今日の|一覧|デイリークエスト$|^\d+$/.test(l)) continue;
      if (l.length >= 5 && !quests.includes(l)) quests.push(l);
      if (quests.length >= 4) break;
    }
  }
  return { area: area || '未取得', start, end, quests: quests.length ? quests : ['取得できませんでした'] };
}

function parseCandles(html) {
  const lines = htmlToLines(html);
  const period = afterLabelValue(lines, /^期間\s*/);
  const area = afterLabelValue(lines, /^エリア\s*/);
  const count = afterLabelValue(lines, /^個数\s*/);
  const idx = lines.findIndex(l => l.includes('今日のデイリー大キャンドルの場所'));
  const locations = [];
  if (idx >= 0) {
    for (let i = idx + 1; i < Math.min(lines.length, idx + 60); i++) {
      const l = lines[i];
      if (/関連情報|おすすめ記事|日替わり大キャンドルとは/.test(l)) break;
      if (/^▲/.test(l)) locations.push(l.replace(/^▲\s*/, '').trim());
    }
  }
  return { period, area: area || '未取得', count: count || '', locations: locations.length ? locations : ['取得できませんでした'] };
}

function parseShards(html) {
  const lines = htmlToLines(html);
  const idx = lines.findIndex(l => l.includes('場所と報酬'));
  let location = '', type = '', reward = '';
  if (idx >= 0) {
    const block = lines.slice(idx, idx + 20);
    const locLine = block.find(l => /^場所\s*/.test(l));
    if (locLine) location = locLine.replace(/^場所\s*/, '').trim();
    else location = afterLabelValue(lines, /^場所\s*/);
    type = afterLabelValue(lines, /^種類\s*/);
    reward = afterLabelValue(lines, /^報酬\s*/);
  }
  const timeIdx = lines.findIndex(l => l.includes('落ちる時間'));
  const times = [];
  if (timeIdx >= 0) {
    for (let i = timeIdx + 1; i < Math.min(lines.length, timeIdx + 25); i++) {
      const l = lines[i];
      if (/関連情報|闇の破片カレンダー/.test(l)) break;
      const m = l.match(/(\d+回目\s*)?\d{1,2}:\d{2}\s*[～〜-]\s*\d{1,2}:\d{2}/);
      if (m) times.push(l.trim());
    }
  }
  return { location: location || '未取得', type: type || '未取得', reward: reward || '', times };
}

function makeEveryTwoHours(minute) {
  const arr = [];
  for (let h = 0; h < 24; h += 2) arr.push(String(h).padStart(2, '0') + ':' + String(minute).padStart(2, '0'));
  return arr;
}

async function main() {
  const errors = [];
  let daily = { area: '未取得', quests: ['取得できませんでした'] };
  let bigCandles = { area: '未取得', locations: ['取得できませんでした'] };
  let shards = { location: '未取得', type: '未取得', times: [] };

  try { daily = parseDaily(await fetchText(URLS.daily)); } catch (e) { errors.push('daily: ' + e.message); }
  try { bigCandles = parseCandles(await fetchText(URLS.candles)); } catch (e) { errors.push('candles: ' + e.message); }
  try { shards = parseShards(await fetchText(URLS.shards)); } catch (e) { errors.push('shards: ' + e.message); }

  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const updatedAtJst = jst.toISOString().replace('T', ' ').slice(0, 19) + ' JST';

  const data = {
    status: errors.length >= 3 ? 'error' : 'ok',
    source: URLS,
    updatedAt: now.toISOString(),
    updatedAtJst,
    daily,
    bigCandles,
    shards,
    timers: {
      bread: makeEveryTwoHours(35).map((t, i) => String((i*2+1)%24).padStart(2,'0') + ':35'),
      geyser: makeEveryTwoHours(5),
      turtle: makeEveryTwoHours(50)
    },
    notes: errors.length ? errors : ['9bitから自動取得しました']
  };

  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), 'data', 'sky.json'), JSON.stringify(data, null, 2), 'utf8');
  fs.writeFileSync(path.join(process.cwd(), 'data', 'latest.txt'), updatedAtJst, 'utf8');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
