# Sky便利ツール 完全無料自動版 v9

## 使い方

1. このZIPを解凍
2. GitHub の `alismemo/sky-tools` を開く
3. `Add file` → `Upload files`
4. 解凍した中身を全部アップロード
5. **`.github` フォルダも必ずアップロード**
6. `Commit changes`
7. `Actions` を開く
8. 左側に **Update Sky Data** が出る
9. **Run workflow** を押す

## URL

通常版:

`https://alismemo.github.io/sky-tools/`

OBS版:

`https://alismemo.github.io/sky-tools/overlay.html`

## `.github` が見えない場合

Windowsで隠しファイルが非表示だと見えないことがあります。
エクスプローラー上部の「表示」→「隠しファイル」にチェックを入れてください。

## 自動更新

GitHub Actions が毎日 16時台以降に複数回実行し、`data/sky.json` を更新します。
手動更新したい時は Actions → Update Sky Data → Run workflow。

## 参照元

9bit Sky攻略ページをGitHub Actions側で取得してJSON化します。
ブラウザから直接取得しないため、CORSで止まりません。
