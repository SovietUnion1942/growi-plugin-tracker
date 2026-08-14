// カウンターウィジェットはこの外部HTTP API経由で共有状態を永続化する
// (growi-socialcredit-API の /counters ルート)。このプラグインには
// サーバー側コンポーネントが無く、GROWIは静的JSバンドルとしてしか
// 読み込まないため、管理画面から設定変更できる仕組みは存在しない。
// フォークして別のAPIを使う場合はこの定数を書き換えてビルドし直すこと。
export const COUNTER_API_BASE_URL = 'https://sc-api.butsuri-kori.club';
