# 開発まとめ

GROWIに進捗バー・マイルストーン・カウンター(いいねボタン)を追加するプラグインを
ゼロから作った記録。実装そのものより、ハマった箇所とその原因の方が再利用価値が高いので、
そこを中心にまとめる。

## できたもの

| 記法 | 見た目 |
|---|---|
| `::progress[開発]{value=75 max=100 color=#2f6f4f}` | ラベル+%表示+進捗バー |
| `:::milestone{title="v2.0 リリース"}` + GFMタスクリスト | タイトル+達成率バー+チェックリスト |
| `::counter[いいね]{id="likes-top"}` | 押す/解除するトグルボタン。表示数=いいねしている人数(1人1票) |

進捗バー・マイルストーンはMarkdown内の値をそのまま表示するだけ。カウンターだけは
`growi-socialcredit-API`(既存の別サービス)にPostgresのテーブルを1個増やして、
GROWIのログインユーザー名で1人1票を管理する共有カウンターにしてある。

## 構成

```
growi-plugin-tracker/
  client-entry.tsx      GROWIのgrowiFacadeに接続するエントリーポイント
  src/directives.ts      remark-directiveのノードをhast要素に変換するプラグイン
  src/components.tsx     figure/dataタグを既存コンポーネントごとラップして横取りする
  src/ProgressBar.tsx
  src/Milestone.tsx
  src/Counter.tsx         いいねボタン本体(サーバーfetchあり)
  src/currentUser.ts      ログインユーザー名の取得(/_api/v3/personal-setting/)
  src/config.ts           カウンター保存先APIのURL(ハードコード)
  src/styles.css
```

GROWI側は`growi-socialcredit-API`(`/mnt/d/growi-socialcredit-API`、既存のNode/Express +
Postgresサービス)に`counter_likes`テーブルと`/counters/:id/like` `/unlike` `/likes`を追加。
公開URLは`https://sc-api.butsuri-kori.club`(Cloudflare Tunnel経由)。

## ハマった箇所

### 1. GROWIの「プラグイン」は静的JSファイルでしかない

GitHub URLからインストールするタイプのGROWIプラグインは、サーバー側コードを一切
実行できない(`apps/app/src/features/growi-plugin/server/`を読んで確認: `dist/manifest.json`
を読むだけで、`require`も`import()`もされない)。だからカウンターを共有にするには
GROWI本体ではなく、外部の別APIをブラウザから直接叩くしかなかった。

### 2. `hast-util-sanitize`は独自タグ名を許可してくれない

`::progress`・`::milestone`・`::counter`用に独自のhastタグ名(`gpt-progress`など)を
使おうとしたら、GROWIのサニタイズ処理(タグ名ホワイトリスト方式)が問答無用で消してしまう。
サードパーティプラグインからはこのホワイトリストを拡張できない。

→ 対策: 既に許可されている`figure`(進捗バー・マイルストーン用)と`data`(カウンター用)
タグを流用し、ペイロードは常に許可される`data-*`属性に載せる。`components.figure`/
`components.data`を「元のコンポーネントをラップして、目印の属性が無ければ素通しする」形で
上書きする(GROWI公式の`growi-plugin-datatables`が`table`タグに対して使っているのと同じ手法)。

### 3. GROWI組み込みの`echo-directive`が中身を先回りで上書きしてくる

`::progress[開発]{value=75}`を書くと、属性(75%・色)は正しく反映されるのに、
ラベルだけ生の`"::progress[開発]"`という文字列がそのまま表示される謎の不具合が出た。

原因: GROWIのMarkdownパイプラインには「未知のdirectiveは元のMarkdown風の見た目のまま
表示する」というフォールバック(`echo-directive.ts`)が標準で組み込まれていて、
`leafDirective`/`textDirective`に対して無条件に`data.hChildren`(表示内容)を
「構文を再現したテキスト」にセットする。これは自分たちのプラグインより先に動くので、
自分たちが`hName`/`hProperties`を上書きしても、`hChildren`だけ残ってしまっていた。

→ 対策: 自分たちの変換処理で`data.hChildren`を明示的に削除し、mdastの本来のchildren
(実際のラベル)から作り直させる。

### 4. remark-directiveの属性順序

`::counter{id="..." value=0}[いいね]`(属性が先、ラベルが後)は構文として無効で、
directiveとして認識されずただの文字列になる。正しくは`::counter[いいね]{id="..."}`
(ラベルが先、属性が後)。地味に一番時間を溶かした。

### 5. プラグインが自分でバンドルしたReactでhooksを呼ぶとクラッシュする

`useState`/`useRef`を呼んだ瞬間に`Cannot read properties of null (reading 'useRef')`
で画面が丸ごと壊れた。

原因: このプラグインはReactを自前でバンドルしている(`vite build`が`react`を
`client-entry.js`に含めてしまう)。GROWI本体も別に自分のReactを持っていて、実際に
コンポーネントをレンダリングしているのはGROWI側のReactインスタンス。hooksは
「今レンダリング中のReactインスタンス」のdispatcherを見に行くので、プラグイン側の
Reactモジュールから呼んだhooksは、GROWI側が使っているdispatcherを見つけられずnullになる。

→ 対策: GROWIは`growiFacade.react`として自分自身のReactインスタンスを公開している
(`apps/app/.../GrowiPluginsActivator.tsx`で`registerGrowiFacade({ react: React })`)。
`Milestone`/`Counter`は`createXxx(React)`というファクトリ関数にして、GROWI側の
Reactインスタンスを外から渡してもらう形にした。JSX自体(要素オブジェクトを作るだけ)は
Reactインスタンスをまたいでも問題ないので、`<figure>`のようなJSXはそのまま書ける。
問題になるのはhooks呼び出しだけ。

### 6. プラグインには設定画面がない

GROWIプラグインの管理画面から「このプラグイン用の設定」を保存する仕組みは存在しない
(サーバー側コードを持てない制約の裏返し)。なので保存先APIのURL(`COUNTER_API_BASE_URL`)
は`src/config.ts`にハードコードし、変更したい場合はコードを書き換えてビルドし直す運用にした。

### 7. いいねの「連打で増える」問題

最初のカウンター実装は「誰でも何度でも+1/-1できる」単純なカウンターだったが、
それだと1人が連打すればいくらでも数字を増やせてしまう。

→ 対策: GROWIのログインユーザー名(`/_api/v3/personal-setting/`から取得。growiFacadeには
ユーザー情報が無いので別途fetchが必要)を使い、`counter_likes(counter_id, username)`を
主キーにしたテーブルで「1ユーザー1票」を強制。表示される数は行数(=いいねしている人数)
そのもの。

## 今の制限

- カウンターの保存先APIはハードコードされたURLで、管理画面からは変更できない
- APIは無認証・レート制限なし(ウィキ自体が承認済みアカウントのみ閲覧という前提で許容)
- 進捗バー・マイルストーンの数値は手入力で、実際のサブページ数やタスク数からの自動計算はしていない
