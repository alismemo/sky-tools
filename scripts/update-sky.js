import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { decode } from 'html-entities';

const URL = 'https://9-bit.jp/skygold/4920/';
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const OUT = path.join(DATA_DIR, 'sky.json');
const DEBUG = path.join(DATA_DIR, 'debug-9bit.txt');

const now = new Date();
const jstDate = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
}).format(now);

function clean(s = '') {
  return decode(String(s))
    .replace(/\u00a0/g, ' ')
    .replace(/[\t\r]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

function uniq(list) {
  const out = [];
  const seen = new Set();
  for (const item of list.map(clean).filter(Boolean)) {
    const key = item.replace(/\s/g, '');
    if (!seen.has(key)) { seen.add(key); out.push(item); }
  }
  return out;
}

function splitLines(text) {
  return uniq(clean(text).split(/\n|。|・|●|◆|■|★|\|/).map(clean).filter(v => v.length >= 2));
}

function sectionByKeywords($, keywords, maxChars = 1200) {
  const blocks = [];
  $('h1,h2,h3,h4,p,li,table,div').each((_, el) => {
    const t = clean($(el).text());
    if (!t || t.length < 2) return;
    if (keywords.some(k => t.includes(k))) {
      let block = t;
      let next = $(el).next();
      for (let i = 0; i < 8 && next.length; i++, next = next.next()) {
        const nt = clean(next.text());
        if (nt) block += '\n' + nt;
        if (block.length > maxChars) break;
      }
      blocks.push(block.slice(0, maxChars));
    }
  });
  return uniq(blocks);
}

function extractListFromSections(sections, fallbackText, keywords) {
  const joined = sections.join('\n');
  let lines = splitLines(joined);
  lines = lines.filter(line => {
    if (line.length > 140) return false;
    if (/関連記事|コメント|スポンサー|広告|Twitter|LINE|©|目次/.test(line)) return false;
    return true;
  });
  if (lines.length === 0) {
    const idx = keywords.map(k => fallbackText.indexOf(k)).filter(i => i >= 0).sort((a,b)=>a-b)[0];
    if (idx >= 0) lines = splitLines(fallbackText.slice(idx, idx + 1200));
  }
  return uniq(lines).slice(0, 12);
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const res = await fetch(URL, {
    headers: {
      'user-agent': 'Mozilla/5.0 sky-tools GitHub Actions',
      'accept': 'text/html,application/xhtml+xml'
    }
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  $('script,style,noscript,iframe').remove();
  const title = clean($('title').first().text());
  const bodyText = clean($('body').text());

  const dailySections = sectionByKeywords($, ['デイリー', 'クエスト', '今日の任務', '日替わりクエスト']);
  const candleSections = sectionByKeywords($, ['大キャンドル', 'キャンドルのかたまり', 'キャンドル']);
  const shardSections = sectionByKeywords($, ['闇の破片', '闇のかけら', '破片', '赤石', '黒石']);

  const data = {
    source: URL,
    title,
    updatedAt: now.toISOString(),
    updatedAtJst: jstDate,
    status: 'ok',
    daily: extractListFromSections(dailySections, bodyText, ['デイリー', 'クエスト']),
    bigCandles: extractListFromSections(candleSections, bodyText, ['大キャンドル', 'キャンドルのかたまり']),
    shards: extractListFromSections(shardSections, bodyText, ['闇の破片', '闇のかけら', '破片']),
    notes: [
      '9bitのページ構造が変わった場合、抽出結果がずれることがあります。',
      'おかしい場合はdata/debug-9bit.txtを確認してください。'
    ]
  };

  await fs.writeFile(OUT, JSON.stringify(data, null, 2), 'utf8');
  await fs.writeFile(DEBUG, [
    `URL: ${URL}`,
    `Fetched: ${data.updatedAtJst}`,
    `Title: ${title}`,
    '',
    '--- daily sections ---', dailySections.join('\n---\n'),
    '', '--- candle sections ---', candleSections.join('\n---\n'),
    '', '--- shard sections ---', shardSections.join('\n---\n')
  ].join('\n'), 'utf8');
  console.log('Wrote data/sky.json');
}

main().catch(async err => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const fallback = {
    source: URL,
    updatedAt: now.toISOString(),
    updatedAtJst: jstDate,
    status: 'error',
    error: String(err?.message || err),
    daily: [], bigCandles: [], shards: [], notes: ['取得に失敗しました。Actionsのログを確認してください。']
  };
  await fs.writeFile(OUT, JSON.stringify(fallback, null, 2), 'utf8');
  console.error(err);
  process.exit(1);
});
