# Sky便利ツール 無料自動版 v6

完全無料で動かす構成です。

- GitHub Actions が 9bit を取得
- `data/sky.json` を自動更新
- `public/index.html` がWebアプリ
- `public/overlay.html` がOBS用
- Firebase Functions不要
- クレジットカード不要

## 初回設定

1. GitHubで新しいリポジトリを作る
2. この中身をアップロード
3. GitHubの Actions を有効化
4. Actions → `Update Sky Data` → `Run workflow` を押す
5. `data/sky.json` が更新されれば成功

## Firebase Hostingで公開

```bat
firebase deploy --project dawa-hato
```

公開後：

- Webアプリ: `https://dawa-hato.web.app/`
- OBS: `https://dawa-hato.web.app/overlay.html`

## GitHub Pagesで公開する場合

Settings → Pages → Deploy from branch → main を選択してください。
ただし `data/sky.json` の相対パス調整が必要になる場合があります。

## 注意

9bitのページ構造が変わると、自動判定がずれる場合があります。
その場合でもWebアプリの「手動補正」でOBSに反映できます。
