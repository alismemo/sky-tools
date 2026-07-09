# Sky便利ツール 完成版 v7

## 使い方
1. このZIPの中身をGitHubリポジトリ `sky-tools` に全部アップロード
2. GitHubの `Actions` タブを開く
3. `Update Sky Data` を選んで `Run workflow`
4. 数分後に `data/sky.json` が更新されます
5. 公開URLを開きます

通常版:
`https://alismemo.github.io/sky-tools/`

OBS版:
`https://alismemo.github.io/sky-tools/overlay.html`

## 自動更新
`.github/workflows/update-sky.yml` により2時間ごとに9bitを確認します。

## OBS設定
- ソース: ブラウザ
- URL: `https://alismemo.github.io/sky-tools/overlay.html`
- 幅: 520
- 高さ: 900
- カスタムCSSは不要

## 注意
9bit側のページ構造が変わった場合は取得がずれることがあります。その時はアプリ内の手動補正を使えます。
