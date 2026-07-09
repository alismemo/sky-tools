const fs = require('fs');
const path = require('path');

const SOURCES = {
  daily: 'https://9-bit.jp/skygold/6593/',
  candles: 'https://9-bit.jp/skygold/4920/',
  shards: 'https://9-bit.jp/skygold/23767/'
};

const headers = {
  'user-agent': 'Mozilla/5.0 (compatible; sky-tools/1.0; +https://github.com/alismemo/sky-tools)',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'ja,en-US;q=0.9,en;q=0.8'
};

function clean(s) {
  return String(s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(arr) {
  return [...new Set(arr.map(v => clean(v)).filter(Boolean))];
}

async function fetchText(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

function between(text, start, end) {
  const a = text.indexOf(start);
  if (a < 0) return '';
  const b = text.indexOf(end, a + start.length);
  return b < 0 ? text.slice(a) : text.slice(a, b);
}

function parseDaily(html) {
  const body = clean(html);
  const area = (body.match(/主な対象エリア\s*([^\s]+)\s*デイリークエスト/) || [])[1] || '未取得';
  const start = (body.match(/開始時間\s*([^終]+?)\s*終了時間/) || [])[1] || '';
  const end = (body.match(/終了時間\s*([^主]+?)\s*主な対象エリア/) || [])[1] || '';
  const section = body.match(/デイリークエスト一\s*覧\s*(.*?)\s*関連情報/);
  let quests = [];
  if (section) {
    const s = section[1];
    quests = s.split(/(?=\d|[一-龠ぁ-んァ-ヶーA-Za-z０-９])/)
      .map(x => clean(x))
      .filter(x => x.length > 4 && !x.includes('Image') && !x.includes('デイリークエストのアイコン'));
    // 9bitのテキスト化では4件が連続するため、よくあるクエスト終端で分割し直す
    const joined = clean(section[1]);
    const parts = joined.match(/[^。]*?(?:呼びかける|呼び起こす|捕まえる|会いましょう|瞑想する|集める|灯す|座る|ハイタッチする|お辞儀をする|手を振る|抱きしめる|転がす|倒す|眺める|奏でる|送る|受け取る)/g);
    if (parts && parts.length >= 4) quests = parts.slice(0, 4);
  }
  return { area, start, end, quests: unique(quests).slice(0, 4) };
}

function parseCandles(html) {
  const body = clean(html);
  const period = (body.match(/期間\s*([^エ]+?)\s*エリア/) || [])[1] || '';
  const area = (body.match(/エリア\s*([^\s]+)\s*個数/) || [])[1] || '未取得';
  const count = (body.match(/個数\s*([0-9０-９]+個)/) || [])[1] || '';
  const section = body.match(/今日のデイリー大キャンドルの場所\s*(.*?)\s*関連情報/);
  let locations = [];
  if (section) {
    locations = [...section[1].matchAll(/▲\s*([^▲]+?)(?=▲|関連情報|$)/g)].map(m => m[1]);
  }
  return { period, area, count, locations: unique(locations).slice(0, 8) };
}

function parseShards(html) {
  const body = clean(html);
  const today = body.match(/今日.*?闇の破片.*?(?:場所|落ちる場所)?\s*([^。]*?)(?:時間|種類|報酬|$)/);
  const location = today ? clean(today[1]) : (body.match(/場所\s*([^\s]+(?:エリア|地方|郷|森|谷|庫|地|島)[^\s]*)/) || [,'未取得'])[1];
  const type = (body.match(/種類\s*([^\s]+(?:破片|黒|赤|闇)[^\s]*)/) || [,'未取得'])[1];
  const times = unique([...(body.matchAll(/\b([0-2]?\d:[0-5]\d)\b/g))].map(m => m[1])).slice(0, 12);
  return { period: '', location: clean(location), type: clean(type), times };
}

function nowJstString() {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(new Date());
}

async function main() {
  fs.mkdirSync('data', { recursive: true });
  const result = {
    source: SOURCES,
    updatedAt: new Date().toISOString(),
    updatedAtJst: nowJstString(),
    status: 'ok',
    daily: null,
    bigCandles: null,
    shards: null,
    timers: {
      bread: ['01:35','03:35','05:35','07:35','09:35','11:35','13:35','15:35','17:35','19:35','21:35','23:35'],
      geyser: ['00:05','02:05','04:05','06:05','08:05','10:05','12:05','14:05','16:05','18:05','20:05','22:05'],
      turtle: ['00:50','02:50','04:50','06:50','08:50','10:50','12:50','14:50','16:50','18:50','20:50','22:50']
    },
    notes: []
  };

  try {
    const [dailyHtml, candlesHtml, shardsHtml] = await Promise.all([
      fetchText(SOURCES.daily), fetchText(SOURCES.candles), fetchText(SOURCES.shards)
    ]);
    result.daily = parseDaily(dailyHtml);
    result.bigCandles = parseCandles(candlesHtml);
    result.shards = parseShards(shardsHtml);

    if (!result.daily.quests?.length) result.notes.push('デイリーの抽出件数が0です。9bitの構造変更の可能性があります。');
    if (!result.bigCandles.locations?.length) result.notes.push('大キャンドルの場所抽出件数が0です。9bitの構造変更の可能性があります。');
  } catch (err) {
    result.status = 'error';
    result.error = String(err && err.stack || err);
    result.notes.push('取得に失敗しました。前回データがある場合は手動確認してください。');
  }

  fs.writeFileSync(path.join('data','sky.json'), JSON.stringify(result, null, 2), 'utf8');
  fs.writeFileSync(path.join('data','latest.txt'), `${result.status} ${result.updatedAtJst}\n`, 'utf8');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
