import fs from 'node:fs/promises';

const SOURCES = {
  daily: 'https://9-bit.jp/skygold/6593',
  candles: 'https://9-bit.jp/skygold/4920/',
  shards: 'https://9-bit.jp/skygold/23767/'
};

function clean(s='') {
  return s.replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/g,' ')
    .replace(/&amp;/g,'&')
    .replace(/&#8211;|&ndash;/g,'-')
    .replace(/\s+/g,' ')
    .trim();
}
function pick(text, start, end) {
  const a = text.indexOf(start);
  if (a < 0) return '';
  const b = text.indexOf(end, a + start.length);
  return text.slice(a, b > a ? b : a + 1800);
}
function linesFrom(block) {
  return block.split(/(?=▲|\d回目|場所 |種類 |報酬 |開始時間 |終了時間 |主な対象エリア |期間 |エリア |個数 )/)
    .map(s=>s.trim()).filter(Boolean);
}
async function get(url) {
  const res = await fetch(url, {headers:{'user-agent':'Mozilla/5.0 sky-tools GitHubActions'}});
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return await res.text();
}
function parseDaily(html) {
  const text = clean(html);
  const block = pick(text, '今日（', '関連情報');
  const area = (block.match(/主な対象エリア\s+(.+?)\s+デイリークエスト/)||[])[1] || '';
  const start = (block.match(/開始時間\s+(.+?)\s+終了時間/)||[])[1] || '';
  const end = (block.match(/終了時間\s+(.+?)\s+主な対象エリア/)||[])[1] || '';
  const listPart = (block.match(/デイリークエスト一 覧\s+(.+)/)||[])[1] || block;
  const quests = listPart.split(/(?=\S+に呼びかける|(?=\S+で精霊)|(?=\S+で彷徨う)|(?=\S+に.*会いましょう)|(?=\S+で瞑想)|(?=\S+を捕まえる)|(?=\S+人の)/)
    .map(s=>s.replace(/^Image:[^　\s]+\s*/,'').trim())
    .filter(s=>s && !s.includes('関連情報'))
    .slice(0,4);
  // fallback: take link-like sentences between list and related
  let finalQuests = quests;
  if (finalQuests.length < 4) {
    const m = block.match(/デイリークエスト一 覧\s+(.+?)\s+関連情報/);
    if (m) {
      finalQuests = m[1].replace(/Image:[^\s]+/g,'').split(/\s{2,}|(?<=る)\s+(?=\S)|(?<=す)\s+(?=\S)/).map(x=>x.trim()).filter(Boolean).slice(0,4);
    }
  }
  return { area, start, end, quests: finalQuests };
}
function parseCandles(html) {
  const text = clean(html);
  const block = pick(text, '今日のデイリー大キャンドル（', '関連情報');
  const period = (block.match(/期間\s+(.+?)\s+エリア/)||[])[1] || '';
  const area = (block.match(/エリア\s+(.+?)\s+個数/)||[])[1] || '';
  const count = (block.match(/個数\s+(.+?)\s+大キャンドル/)||[])[1] || '';
  const placePart = (block.match(/今日のデイリー大キャンドルの場所\s+(.+)/)||[])[1] || '';
  const locations = [...placePart.matchAll(/▲\s*([^▲]+)/g)].map(m=>m[1].trim()).filter(Boolean).slice(0,6);
  return { period, area, count, locations };
}
function parseShards(html) {
  const text = clean(html);
  const block = pick(text, '今日の闇の破片（', '関連情報');
  const period = (block.match(/▼\s*(.+?)\s*▼/)||[])[1] || '';
  const location = (block.match(/場所\s+(.+?)\s+種類/)||[])[1] || '';
  const type = (block.match(/種類\s+(.+?)\s+報酬/)||[])[1] || '';
  const reward = (block.match(/報酬\s+(.+?)\s+今日の/)||[])[1] || '';
  const times = [...block.matchAll(/\d回目\s+([0-9:～〜]+(?:\s*[0-9:～〜]+)?)/g)].map(m=>m[0].trim()).slice(0,3);
  return { period, location, type, reward, times };
}
function breadSchedule() {
  // Skyのパン焼き/おばあちゃんは2時間ごと（JST）。表示用の固定時刻。
  return ['01:35','03:35','05:35','07:35','09:35','11:35','13:35','15:35','17:35','19:35','21:35','23:35'];
}
async function main() {
  const [dailyHtml, candlesHtml, shardsHtml] = await Promise.all([
    get(SOURCES.daily), get(SOURCES.candles), get(SOURCES.shards)
  ]);
  const now = new Date();
  const data = {
    source: SOURCES,
    updatedAt: now.toISOString(),
    updatedAtJst: now.toLocaleString('ja-JP', {timeZone:'Asia/Tokyo'}),
    status: 'ok',
    daily: parseDaily(dailyHtml),
    bigCandles: parseCandles(candlesHtml),
    shards: parseShards(shardsHtml),
    timers: { bread: breadSchedule() },
    notes: ['9bitからGitHub Actionsで取得しました']
  };
  await fs.mkdir('data', {recursive:true});
  await fs.writeFile('data/sky.json', JSON.stringify(data, null, 2), 'utf8');
  await fs.writeFile('data/latest.txt', `updated ${data.updatedAtJst}\n`, 'utf8');
  console.log(JSON.stringify(data, null, 2));
}
main().catch(async (err)=>{
  console.error(err);
  await fs.mkdir('data', {recursive:true});
  await fs.writeFile('data/sky.json', JSON.stringify({status:'error', error:String(err), updatedAt:new Date().toISOString()}, null, 2));
  process.exit(1);
});
