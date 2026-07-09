import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const SOURCES = {
  daily: 'https://9-bit.jp/skygold/6593/',
  candles: 'https://9-bit.jp/skygold/4920/',
  shards: 'https://9-bit.jp/skygold/23767/'
};

function jstNow() {
  const d = new Date();
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(d).reduce((a, p) => (a[p.type] = p.value, a), {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; SkyToolsBot/1.0; +https://github.com/alismemo/sky-tools)',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return await res.text();
}

function clean(s) {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\t\r]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/[ 　]+/g, ' ')
    .trim();
}

function linesFrom($) {
  $('script, style, noscript, iframe, form').remove();
  const txt = clean($('article').text() || $('body').text());
  return txt.split('\n').map(clean).filter(Boolean);
}

function between(lines, startRe, endRe) {
  const start = lines.findIndex(l => startRe.test(l));
  if (start < 0) return [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (endRe.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start + 1, end);
}

function uniq(arr) {
  return [...new Set(arr.map(clean).filter(Boolean))];
}

function parseDaily(html) {
  const $ = cheerio.load(html);
  const lines = linesFrom($);
  const dailyBlock = between(lines, /今日.*デイリークエスト/, /今日のデイリークエスト達成方法|デイリークエストとは|関連情報/);
  const start = dailyBlock.find(l => /開始時間/.test(l))?.replace(/^開始時間\s*/, '') || '';
  const end = dailyBlock.find(l => /終了時間/.test(l))?.replace(/^終了時間\s*/, '') || '';
  const area = dailyBlock.find(l => /主な対象エリア/.test(l))?.replace(/^主な対象エリア\s*/, '') || '';

  let quests = [];
  const qIndex = dailyBlock.findIndex(l => /デイリークエスト一覧/.test(l));
  if (qIndex >= 0) {
    quests = dailyBlock.slice(qIndex + 1)
      .filter(l => !/^関連情報/.test(l))
      .filter(l => !/^開始時間|^終了時間|^主な対象エリア|^※/.test(l))
      .filter(l => !/未解放|場合は|クエスト一覧/.test(l))
      .filter(l => l.length > 1)
      .slice(0, 4);
  }

  // HTML構造が変わった場合の保険：リンクテキストから4件拾う
  if (quests.length < 4) {
    const fallback = [];
    $('a').each((_, a) => {
      const t = clean($(a).text());
      if (t && !/今日|シーズン|大キャンドル|闇の破片|関連|情報|ホーム|トップ/.test(t)) fallback.push(t);
    });
    quests = uniq([...quests, ...fallback]).slice(0, 4);
  }

  return { start, end, area, quests: uniq(quests).slice(0, 4) };
}

function parseCandles(html) {
  const $ = cheerio.load(html);
  const lines = linesFrom($);
  const block = between(lines, /今日のデイリー大キャンドル/, /関連情報|日替わり大キャンドルとは|Sky 星を紡ぐ子どもたち攻略情報/);
  const period = block.find(l => /^期間/.test(l))?.replace(/^期間\s*/, '') || '';
  const area = block.find(l => /^エリア/.test(l))?.replace(/^エリア\s*/, '') || '';
  const count = block.find(l => /^個数/.test(l))?.replace(/^個数\s*/, '') || '';
  const locations = uniq(block
    .filter(l => /^▲/.test(l))
    .map(l => l.replace(/^▲\s*/, ''))
  ).slice(0, 8);
  return { period, area, count, locations };
}

function parseShards(html) {
  const $ = cheerio.load(html);
  const lines = linesFrom($);
  const block = between(lines, /今日の『?闇の破片|今日の闇の破片/, /関連情報|闇の破片カレンダー|闇の破片の墜ちる場所/);
  const period = block.find(l => /▼.*～/.test(l))?.replace(/[▼]/g, '').trim() || '';
  const location = block.find(l => /^場所/.test(l))?.replace(/^場所\s*/, '') || '';
  const type = block.find(l => /^種類/.test(l))?.replace(/^種類\s*/, '') || '';
  const reward = block.find(l => /^報酬/.test(l))?.replace(/^報酬\s*/, '') || '';
  const times = block
    .filter(l => /^[123１２３]回目/.test(l))
    .map(l => l.replace(/^[１２３]/, m => ({'１':'1','２':'2','３':'3'}[m])));
  return { period, location, type, reward, times };
}

function makeTimers() {
  return {
    bread: ['01:35','03:35','05:35','07:35','09:35','11:35','13:35','15:35','17:35','19:35','21:35','23:35'],
    geyser: ['00:05','02:05','04:05','06:05','08:05','10:05','12:05','14:05','16:05','18:05','20:05','22:05'],
    turtle: ['00:50','02:50','04:50','06:50','08:50','10:50','12:50','14:50','16:50','18:50','20:50','22:50']
  };
}

async function main() {
  const [dailyHtml, candleHtml, shardHtml] = await Promise.all([
    fetchHtml(SOURCES.daily), fetchHtml(SOURCES.candles), fetchHtml(SOURCES.shards)
  ]);

  const data = {
    source: SOURCES,
    updatedAt: new Date().toISOString(),
    updatedAtJst: jstNow(),
    status: 'ok',
    daily: parseDaily(dailyHtml),
    bigCandles: parseCandles(candleHtml),
    shards: parseShards(shardHtml),
    timers: makeTimers(),
    notes: ['9bitからGitHub Actionsで自動取得しました']
  };

  const outDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'sky.json'), JSON.stringify(data, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'latest.txt'), `updated ${data.updatedAtJst}\n`, 'utf8');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
