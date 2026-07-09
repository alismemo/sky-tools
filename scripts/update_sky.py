#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""9bitのSky日替わり情報を取得して data/sky.json を作るスクリプト。
外部ライブラリ不要。GitHub Actionsでそのまま動きます。
"""
from __future__ import annotations
import datetime as dt
import html
import json
import os
import re
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

URLS = {
    "daily": "https://9-bit.jp/skygold/6593",
    "candle": "https://9-bit.jp/skygold/4920/",
    "shard": "https://9-bit.jp/skygold/23767/",
}
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
JST = dt.timezone(dt.timedelta(hours=9), "JST")
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "sky.json"

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript", "svg"}:
            self.skip += 1
        if tag in {"p","div","br","li","tr","h1","h2","h3","h4","td","th"}:
            self.parts.append("\n")
    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript", "svg"} and self.skip:
            self.skip -= 1
        if tag in {"p","div","li","tr","h1","h2","h3","h4"}:
            self.parts.append("\n")
    def handle_data(self, data):
        if not self.skip:
            s = html.unescape(data).strip()
            if s:
                self.parts.append(s)

def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language":"ja,en;q=0.8"})
    with urllib.request.urlopen(req, timeout=25) as r:
        charset = r.headers.get_content_charset() or "utf-8"
        return r.read().decode(charset, errors="replace")

def to_text(src: str) -> str:
    p = TextExtractor(); p.feed(src)
    txt = "\n".join(p.parts)
    txt = re.sub(r"[ \t\u3000]+", " ", txt)
    txt = re.sub(r"\n{2,}", "\n", txt)
    return txt.strip()

def lines_between(text: str, start_pat: str, end_pats: list[str]) -> list[str]:
    lines = [x.strip() for x in text.splitlines() if x.strip()]
    start = 0
    for i,l in enumerate(lines):
        if re.search(start_pat, l):
            start = i + 1
            break
    end = min(len(lines), start + 80)
    for i in range(start, min(len(lines), start + 120)):
        if any(re.search(p, lines[i]) for p in end_pats):
            end = i
            break
    return lines[start:end]

def uniq(seq):
    out=[]
    for x in seq:
        x = re.sub(r"^▲\s*", "", x).strip()
        if x and x not in out:
            out.append(x)
    return out

def parse_daily(text: str) -> dict:
    sec = lines_between(text, r"今日.*デイリークエスト", [r"関連情報", r"デイリークエストとは"])
    target = "取得できませんでした"
    quests=[]
    for l in sec:
        m = re.search(r"主な対象エリア\s*(.+)", l)
        if m: target = m.group(1).strip()
        if re.search(r"一覧", l) or re.search(r"開始時間|終了時間|主な対象エリア", l):
            continue
        # クエスト名っぽい行だけ拾う
        if any(k in l for k in ["呼びかけ", "精霊", "光", "会い", "瞑想", "キャンドル", "プレイヤー", "記憶", "捕まえる", "花", "蟹", "マンタ"]):
            cleaned = re.sub(r"^Image:.*?\s", "", l).strip()
            if 5 <= len(cleaned) <= 70:
                quests.append(cleaned)
    return {"area": target, "quests": uniq(quests)[:4], "source": URLS["daily"]}

def parse_candle(text: str) -> dict:
    sec = lines_between(text, r"今日のデイリー大キャンドル", [r"関連情報", r"日替わり大キャンドルとは"])
    area = "取得できませんでした"
    count = "4個"
    places=[]
    for l in sec:
        m = re.search(r"エリア\s*(.+)", l)
        if m: area = m.group(1).strip()
        m = re.search(r"個数\s*(.+)", l)
        if m: count = m.group(1).strip()
        if l.startswith("▲") or "エリア" in l and ("手前" in l or "岩" in l or "出口" in l or "左" in l or "右" in l or "船" in l or "祠" in l):
            if not re.search(r"対象期間|エリア\s|個数|今日の", l):
                places.append(l)
    return {"area": area, "count": count, "places": uniq(places)[:8], "source": URLS["candle"]}

def parse_shard(text: str) -> dict:
    sec = lines_between(text, r"今日.*闇の破片|本日.*闇の破片|闇の破片.*今日", [r"関連情報", r"闇の破片とは", r"過去"])
    if not sec: sec = text.splitlines()[:120]
    place="取得できませんでした"; reward=""; times=[]; notes=[]
    for l in sec:
        if re.search(r"場所|エリア|落下", l) and not re.search(r"目次|まとめ", l):
            val = re.sub(r"^(場所|エリア|落下場所)\s*", "", l).strip()
            if 2 <= len(val) <= 80: place = val
        if re.search(r"赤|黒|星のキャンドル|通常キャンドル|報酬", l):
            if len(l) <= 90: reward = l
        if re.search(r"\d{1,2}[:：時]\d{0,2}|\d{1,2}時", l):
            if len(l) <= 100: times.append(l)
        if any(k in l for k in ["噴火", "浄化", "火種", "強い", "普通", "ありません"]):
            if len(l) <= 90: notes.append(l)
    return {"place": place, "reward": reward, "times": uniq(times)[:6], "notes": uniq(notes)[:5], "source": URLS["shard"]}

def next_bakery(now: dt.datetime) -> dict:
    # パン焼きは毎時 00/15/30/45 分を目安表示（ユーザー側で補正可能）
    slots=[]
    base = now.replace(second=0, microsecond=0)
    for h in range(0, 24):
        for m in (0,15,30,45):
            t = base.replace(hour=h, minute=m)
            if t <= now: t += dt.timedelta(days=1)
            slots.append(t)
    nxt = min(slots)
    return {"label":"パン焼き", "next": nxt.isoformat(), "memo":"毎時 00 / 15 / 30 / 45 分目安。ゲーム内とズレる場合はアプリの手動補正を使用してください。"}

def main() -> int:
    now = dt.datetime.now(JST)
    result = {"updatedAt": now.isoformat(), "ok": True, "errors": [], "daily": {}, "candle": {}, "shard": {}, "timers": {}}
    for key,url in URLS.items():
        try:
            text = to_text(fetch(url))
            if key == "daily": result[key] = parse_daily(text)
            elif key == "candle": result[key] = parse_candle(text)
            elif key == "shard": result[key] = parse_shard(text)
        except Exception as e:
            result["ok"] = False
            result["errors"].append(f"{key}: {e}")
    result["timers"]["bakery"] = next_bakery(now)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0
if __name__ == "__main__":
    raise SystemExit(main())
