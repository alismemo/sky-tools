# Sky便利ツール 完全無料自動版 v8

## 使い方

1. ZIPを解凍します。
2. GitHub の `alismemo/sky-tools` を開きます。
3. **Add file → Upload files** で中身を全部アップロードします。
4. `.github` フォルダも必ず入れてください。
5. **Commit changes** を押します。
6. **Actions** を開きます。
7. 左側に **Update Sky Data** が出たらクリックします。
8. **Run workflow** を押します。
9. 緑のチェックになれば成功です。

## URL

通常版:
`https://alismemo.github.io/sky-tools/`

OBS版:
`https://alismemo.github.io/sky-tools/overlay.html`

## 自動更新

GitHub Actions が毎日 JST 16:10 / 17:10 / 20:10 に9bitを確認し、`data/sky.json` を更新します。

## 注意

9bit側のページ構造が大きく変わると取得に失敗する場合があります。その場合でもWebアプリの「手動補正」で表示できます。
