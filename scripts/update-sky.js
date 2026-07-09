import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const URLS = {
  daily: 'https://9-bit.jp/skygold/6593/',
  candles: 'https://9-bit.jp/skygold/4920/',
  shards: 'https://9-bit.jp/skygold/23767/'
};

const breadTimes = ['01:35','03:35','05:35','07:35','09:35','11:35','13:35','15:35','17:35','19:35','21:35','23:35'];
const geyserTimes = ['00:05','02:05','04:05','06:05','08:05','10:05','12:05','14:05','16:05','18:05','20:05','22:05'];
const turtleTimes = ['00:50','02:50','04:50','06:50','08:50','10:50','12:50','14:50','16:50','18:50','20:50','22:50'];

function jstNow() {
  const d = new Date();
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(d).replaceAll('/', '-');
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (GitHub Actions; Sky tools) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
    }
  });
  if (!res.ok) throw new Error(`${url} ${res.status} ${res.statusText}`);
  return await res.text();
}

function linesFromHtml(html) {
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, form, .comments, #comments').remove();
  const text = $('article').text() || $('body').text();
  return text
    .replace(/\u00a0/g, ' ')
    .split(/\n+/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function findValue(lines, label) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === label && lines[i + 1]) return lines[i + 1];
    if (line.startsWith(label)) return line.slice(label.length).trim();
  }
  return '';
}

function sliceBetween(lines, startPattern, endPatterns) {
  const start = lines.findIndex(l => startPattern.test(l));
  if (start < 0) return [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (endPatterns.some(p => p.test(lines[i]))) { end = i; break; }
  }
  return lines.slice(start + 1, end);
}

function cleanItem(s) {
  return s
    .replace(/^▲\s*/, '')
    .replace(/^・\s*/, '')
    .replace(/^[0-9０-９]+[.)．、]\s*/, '')
    .trim();
}

function unique(arr) {
  return [...new Set(arr.map(cleanItem).filter(Boolean))];
}

function parseDaily(lines) {
  const area = findValue(lines, '主な対象エリア') || findValue(lines, '対象エリア') || '未取得';
  const start = findValue(lines, '開始時間');
  const end = findValue(lines, '終了時間');
  const section = sliceBetween(lines, /デイリークエスト.*覧/, [/関連情報/, /デイリークエストとは/, /おすすめ記事/]);
  const quests = unique(section.filter(l =>
    !/デイリークエスト|Image|一覧|攻略|開始時間|終了時間|主な対象エリア/.test(l) &&
    l.length >= 4 && l.length <= 80
  )).slice(0, 4);
  return { area, start, end, quests: quests.length ? quests : ['取得できませんでした'] };
}

function parseCandles(lines) {
  const period = findValue(lines, '期間');
  const area = findValue(lines, 'エリア') || '未取得';
  const count = findValue(lines, '個数') || '';
  const section = sliceBetween(lines, /今日のデイリー大キャンドルの場所/, [/関連情報/, /日替わり大キャンドルとは/, /おすすめ記事/]);
  const locations = unique(section.filter(l =>
    (l.includes('▲') || /エリア|広場|神殿|入口|出口|洞窟|塔|祠|船|階|岩|左|右|手前|奥|上|下/.test(l)) &&
    !/Image|今日の|場所$|関連情報|一覧/.test(l) &&
    l.length >= 3 && l.length <= 90
  )).slice(0, 8);
  return { period, area, count, locations: locations.length ? locations : ['取得できませんでした'] };
}

function parseShards(lines) {
  const section = sliceBetween(lines, /今日.*闇の破片|闇の破片.*今日|本日.*闇の破片/, [/関連情報/, /闇の破片とは/, /おすすめ記事/, /コメント/]);
  const target = section.length ? section : lines.slice(0, 120);
  const joined = target.join(' / ');
  const location = findValue(target, '場所') || findValue(target, 'エリア') ||
    (joined.match(/(?:場所|エリア)\s*[:：]?\s*([^/]{2,30})/)?.[1]?.trim() || '未取得');
  const type = joined.includes('赤') ? '赤' : joined.includes('黒') ? '黒' : '未取得';
  const times = unique((joined.match(/\d{1,2}\s*時\s*\d{0,2}\s*分?/g) || [])
    .map(t => t.replace(/\s+/g, '').replace('時', ':').replace(/分$/, '')));
  const notes = unique(target.filter(l => /▲|場所|時間|赤|黒|破片|星のキャンドル|通常キャンドル/.test(l) && l.length <= 100)).slice(0, 6);
  return { location, type, times, notes };
}

async function main() {
  const errors = [];
  let daily = { area: '未取得', quests: [] };
  let bigCandles = { area: '未取得', locations: [] };
  let shards = { location: '未取得', type: '未取得', times: [] };

  try { daily = parseDaily(linesFromHtml(await fetchHtml(URLS.daily))); } catch (e) { errors.push(`daily: ${e.message}`); }
  try { bigCandles = parseCandles(linesFromHtml(await fetchHtml(URLS.candles))); } catch (e) { errors.push(`candles: ${e.message}`); }
  try { shards = parseShards(linesFromHtml(await fetchHtml(URLS.shards))); } catch (e) { errors.push(`shards: ${e.message}`); }

  const ok = daily.quests?.length && !daily.quests[0].includes('取得できません')
    || bigCandles.locations?.length && !bigCandles.locations[0].includes('取得できません')
    || shards.location !== '未取得';

  const data = {
    status: ok ? 'ok' : 'error',
    source: URLS,
    updatedAtJst: jstNow(),
    daily,
    bigCandles,
    shards,
    timers: { bread: breadTimes, geyser: geyserTimes, turtle: turtleTimes },
    errors
  };

  await fs.mkdir('data', { recursive: true });
  await fs.writeFile('data/sky.json', JSON.stringify(data, null, 2), 'utf8');
  await fs.writeFile('data/latest.txt', `${data.updatedAtJst} status=${data.status}\n`, 'utf8');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(async err => {
  await fs.mkdir('data', { recursive: true });
  const data = {
    status: 'error',
    updatedAtJst: jstNow(),
    daily: { area: '未取得', quests: ['取得中にエラーが発生しました'] },
    bigCandles: { area: '未取得', locations: ['取得中にエラーが発生しました'] },
    shards: { location: '未取得', type: '未取得', times: [] },
    timers: { bread: breadTimes, geyser: geyserTimes, turtle: turtleTimes },
    errors: [err.stack || err.message]
  };
  await fs.writeFile('data/sky.json', JSON.stringify(data, null, 2), 'utf8');
  console.error(err);
  process.exit(0);
});
