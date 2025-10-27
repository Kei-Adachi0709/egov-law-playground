# egov-law-playground

電子政府の法令 API を素材に、「法令ガチャ」「条文穴埋めクイズ」「キーワード・ハンター」からなる学習／探索体験を提供する React + TypeScript + Vite プロジェクトです。Tailwind CSS、Framer Motion、Zustand、Playwright を軸に、モーションとアクセシビリティに配慮した SwiftUI ライクな UI を目指しています。

## アプリ概要

- **法令ガチャ**: ランダム抽選で条文を提示し、関連メタデータ・引用リンク・お気に入り管理をサポート。
- **条文穴埋めクイズ**: e-Gov 提供データからブランク生成し、難易度表示・キーボードショートカット付きのフィードバックを表示。
- **キーワード・ハンター**: 法令タイトル・条文テキストを高速検索し、条件に応じたハイライト表示と保存済み検索の復元を提供。

## セットアップと開発フロー

### 推奨環境
- Node.js 18 以上 / npm 9 以上
- Git / bash (Windows の場合は Git Bash or WSL を推奨)

### 初期セットアップ
1. 依存関係インストール・型チェック・単体テスト・E2E テストまでをまとめて実行する自動化スクリプトを利用します。
   ```bash
   bash scripts/setup.sh
   ```
   - Windows ネイティブ環境で実行する場合は Git Bash など POSIX シェル互換環境から実行してください。
   - スクリプトは `npm install` / `npm run build` / `npm run test` / `npm run test:e2e` などを順に呼び出し、初期ブートストラップの成否を検証します。
2. `.env.example` をコピーし、必要な API エンドポイントやプロキシ設定を入力します。
   ```bash
   cp .env.example .env
   ```

### 開発サーバーと主要スクリプト
- 開発サーバー: `npm run dev`
- 型チェック: `npm run typecheck`
- 本番ビルド: `npm run build`
- ビルドプレビュー: `npm run preview`
- Lint: `npm run lint`
- フォーマット: `npm run format`
- 単体テスト: `npm run test`
- ウォッチ付きテスト: `npm run test:watch`
- Playwright E2E: `npm run test:e2e`

推奨フローは「ソース修正 → `npm run lint` / `npm run test` → `npm run test:e2e`（必要時）→ コミット」です。

## e-Gov 法令 API の利用について

- データソースは e-Gov 法令 API v1 を利用しています。API から返される情報は最新の官報と完全一致しない場合があります。正確性の最終確認は必ず公式ソースで行ってください。
- レスポンスは XML が基本のため、`fast-xml-parser` で JSON へ変換し、構造化した上でアプリに渡しています。生の XML を保持する必要がある箇所は `src/lib/utils/xml.ts` 周辺のユーティリティを使用してください。
- API レート制限や一時的なメンテナンスに備え、`src/lib/utils/cache.ts` を介してメモリ／セッションストレージキャッシュを実装しています。クリティカルな操作前にはキャッシュの有効期限を確認してください。
- 取得した法令データの再配布や改変には、内閣官房が定める利用規約・注意事項を遵守する必要があります。商用利用などが想定される場合は、必ず最新の規約を再確認してください。

## CORS / プロキシ設定とデプロイ

### 環境変数
`.env` で以下を設定します。

```
VITE_EGOV_LAW_API_BASE_URL=https://www.e-gov.go.jp/elaws/api/v1/
VITE_API_BASE_URL=https://www.e-gov.go.jp/elaws/api/v1/
VITE_USE_PROXY=true
VITE_PROXY_BASE_URL=/api/proxy?target=
PROXY_ORIGIN=
VITE_FEATURE_GACHA=true
VITE_FEATURE_QUIZ=true
VITE_FEATURE_HUNTER=true
```

- `VITE_USE_PROXY` を `true` にすると、フロントエンドはすべての法令 API リクエストを `/api/proxy` にフォワードします。
- `PROXY_ORIGIN` を指定すると、サーバーレス関数が CORS レスポンスヘッダーをその値で返すようになります。空欄時はワイルドカードが適用されます。

### ローカル開発時
- Vite の開発サーバーが `vite.config.ts` の `server.proxy` 設定に従って `/api/proxy` をローカルの Netlify Function 相当へフォワードします。
- `npm run dev` 開始時に Framer Motion や API キャッシュ用ユーティリティが自動読み込みされます。必要に応じて `src/lib/utils/logger.ts` を参照してロギングを有効化してください。

### Netlify へのデプロイ
1. ビルドコマンド: `npm run build`
2. 公開ディレクトリ: `dist`
3. Functions ディレクトリ: `netlify/functions`
4. `netlify.toml` には `/api/*` のフォワードと関数ビルド設定が定義済みです。
5. Netlify ダッシュボード上で `.env` と同じ値を環境変数に登録し、必要に応じて `PROXY_ORIGIN` を配信ドメインに合わせて設定します。

### Vercel へのデプロイ
1. `vercel.json` に記載された `buildCommand: npm run build` を使用します。
2. `api/proxy.ts` が Serverless Function としてデプロイされ、`/api/proxy` エンドポイントを提供します。
3. Vercel の Environment Variables に `.env` と同じ設定を反映します。
4. Playwright E2E や Unit テストを CI に組み込む場合は、Vercel Projects の「Settings > Git > Install Command / Build Command」で `npm run test` 等を組み合わせて実行してください。

## Lighthouse 計測メモ

90 点以上のスコアを維持するため、開発ローカルで定期的に Lighthouse を計測します。

1. `npm run build`
2. 別ターミナルで `npm run preview` を実行し、`http://localhost:4173` を公開
3. 計測ターミナルで以下を実行します
   ```bash
   npx @lhci/cli autorun --config=./lighthouserc.json
   ```
4. レポートは `.lighthouseci/` に保存され、主要カテゴリ（Performance / Accessibility / Best Practices / SEO）が 0.90 以上であることを確認してください。

`lighthouserc.json` にはデスクトップ向けプリセットと主要ページの URL を定義しています。必要に応じて測定対象ページや閾値を調整してください。

## スクリーンショット（ダミー）

差し替え用のダミー画像配置例です。`docs/screenshots` 配下に PNG や WebP を置き、以下リンクを更新してください。

| 画面 | 仮置きパス | 備考 |
| ---- | ---------- | ---- |
| ホーム | `docs/screenshots/placeholder-home.png` | ランディング＋テーマトグル |
| 法令ガチャ | `docs/screenshots/placeholder-gacha.png` | 抽選後カードと操作ボタン |
| クイズ | `docs/screenshots/placeholder-quiz.png` | 穴埋め UI・正誤フィードバック |
| キーワード・ハンター | `docs/screenshots/placeholder-hunter.png` | 検索フォームと結果リスト |

`npm run build` 後に生成される `dist` を Vite の `preview` で確認しながら実際のスクリーンショットを撮影してください。

## ライセンスと免責

- 本リポジトリは MIT License を前提としています（別途 `LICENSE` ファイルを参照／必要に応じて整備してください）。
- e-Gov 法令データの利用に際しては、原典の正確性保証は行っていません。学習・参考用途で利用し、最終判断は公式文書で確認してください。
- 本プロジェクトを利用したことによるあらゆる損害について、作者は一切の責任を負いません。
