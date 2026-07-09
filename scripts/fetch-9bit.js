import fs from 'fs';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const URL = 'https://9-bit.jp/skygold/4920/';
const outPath = 'data/sky.json';

function clean(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}
function uniq(arr) {
  return [...new Set(arr.map(clean).filter(Boolean))];
}
function pickLines(text, keywords, limit = 8) {
  const lines = text.split(/[\n。]/).map(clean).filter(Boolean);
  return uniq(lines.filter(line => keywords.some(k => line.includes(k))).slice(0, limit));
}

async function main() {
  const res = await fetch(URL, {
    headers: {
      'user-agent': 'Mozilla/5.0 sky-free-tool/6.0'
    }
  });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  $('script,style,noscript,iframe').remove();
  const title = clean($('title').text());
  const text = clean($('body').text()).replace(/ /g, '\n');

  const daily = pickLines(text, ['デイリー', 'クエスト', '今日のクエスト', '日替わり'], 12);
  const candles = pickLines(text, ['大キャンドル', 'キャンドル', 'キャンマラ'], 12);
  const shards = pickLines(text, ['闇の破片', '闇のかけら', '破片', 'かけら', '赤石', '黒石'], 12);

  const data = {
    updatedAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    source: URL,
    pageTitle: title,
    daily: daily.length ? daily : ['取得は成功しましたが、デイリー本文を自動判定できませんでした。9bit本文を確認してください。'],
    candles: candles.length ? candles : ['取得は成功しましたが、大キャンドル本文を自動判定できませんでした。'],
    shards: shards.length ? shards : ['取得は成功しましたが、闇のかけら本文を自動判定できませんでした。'],
    bread: {
      title: 'パン焼きタイマー',
      schedule: '毎時 00分 / 30分 ごろ開始目安',
      note: 'ゲーム内イベント状況によりズレる場合があります。'
    }
  };
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`saved ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
