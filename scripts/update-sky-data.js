const fs = require('fs');
const path = require('path');

const SOURCES = {
  daily: 'https://9-bit.jp/skygold/6593',
  candles: 'https://9-bit.jp/skygold/4920/',
  shards: 'https://9-bit.jp/skygold/23767/'
};

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r/g, '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .join('\n');
}
function between(text, start, end) {
  const a = text.indexOf(start);
  if (a < 0) return '';
  const b = text.indexOf(end, a + start.length);
  return text.slice(a + start.length, b < 0 ? undefined : b);
}
function first(re, text, fallback='') {
  const m = text.match(re);
  return m ? m[1].trim() : fallback;
}
async function getText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 sky-tools-bot' }});
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return strip(await res.text());
}
function parseDaily(text) {
  const sec = between(text, '今日（', '関連情報') || between(text, '今日', '関連情報');
  const area = first(/主な対象エリア\s*([^\n]+)/, sec, '取得失敗');
  const start = first(/開始時間\s*([^\n]+)/, sec);
  const end = first(/終了時間\s*([^\n]+)/, sec);
  const listPart = between(sec, 'デイリークエスト一 覧', '関連情報') || between(sec, 'デイリークエスト一覧', '関連情報');
  const quests = listPart.split('\n')
    .map(s => s.replace(/^Image:.*$/,'').trim())
    .filter(s => s && !s.includes('Image') && !s.includes('デイリークエスト') && !s.includes('今日の'))
    .slice(0,4);
  return { area, start, end, quests };
}
function parseCandles(text) {
  const sec = between(text, '今日のデイリー大キャンドル', '関連情報');
  const period = first(/期間\s*([^\n]+)/, sec);
  const area = first(/エリア\s*([^\n]+)/, sec, '取得失敗');
  const count = first(/個数\s*([^\n]+)/, sec);
  const locPart = between(sec, '今日のデイリー大キャンドルの場所', '関連情報');
  const locations = locPart.split('\n')
    .map(s => s.replace(/^▲\s*/, '').trim())
    .filter(s => s && !s.includes('Image') && !s.includes('今日の') && !s.includes('場所'))
    .slice(0,4);
  return { period, area, count, locations };
}
function parseShards(text) {
  const sec = between(text, '今日の闇の破片', '関連情報');
  const period = first(/▼([^▼\n]+～[^▼\n]+)▼?/, sec);
  const place = first(/場所\s*([^\n]+)/, sec, '取得失敗');
  const type = first(/種類\s*([^\n]+)/, sec);
  const reward = first(/報酬\s*([^\n]+)/, sec);
  const times = [...sec.matchAll(/\d回目\s*([^\n]+)/g)].map(m => m[1].trim());
  return { period, place, type, reward, times };
}
function breadSchedule() {
  return {
    name: 'パン焼き',
    note: '花鳥郷カフェ。ゲーム内仕様変更時は手動で確認してください。',
    times: ['毎時00分ごろ', '毎時30分ごろ']
  };
}
(async () => {
  const now = new Date();
  let dailyText='', candleText='', shardText='';
  const errors = [];
  try { dailyText = await getText(SOURCES.daily); } catch(e){ errors.push(String(e)); }
  try { candleText = await getText(SOURCES.candles); } catch(e){ errors.push(String(e)); }
  try { shardText = await getText(SOURCES.shards); } catch(e){ errors.push(String(e)); }
  const data = {
    updatedAt: now.toISOString(),
    updatedAtJST: now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    sources: SOURCES,
    daily: dailyText ? parseDaily(dailyText) : { area:'取得失敗', quests:[] },
    candles: candleText ? parseCandles(candleText) : { area:'取得失敗', locations:[] },
    shards: shardText ? parseShards(shardText) : { place:'取得失敗', times:[] },
    bread: breadSchedule(),
    errors
  };
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), 'data/sky.json'), JSON.stringify(data, null, 2), 'utf8');
  console.log(JSON.stringify(data, null, 2));
})();
