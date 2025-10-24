# egov-law-playground

React + TypeScript + Vite をベースに、電子政府の法令データを扱う実験的な UI を構築するプロジェクトです。Tailwind CSS でスタイルを管理し、Zustand によるシンプルな状態管理と React Router によるページ遷移を採用しています。

## セットアップ

1. 依存関係のインストールから初回ビルド、テスト、初回コミットまでを自動化するスクリプトを実行します。
   ```bash
   bash scripts/setup.sh
   ```
2. 開発サーバーを起動します。
   ```bash
   npm run dev
   ```

## 利用可能なスクリプト

- `npm run dev` : Vite の開発サーバーを起動します。
- `npm run build` : 本番ビルドを実行します。
- `npm run preview` : ビルド成果物をプレビューします。
- `npm run lint` : ESLint による静的解析を実行します。
- `npm run format` : Prettier でコードを整形します。
- `npm run test` : Vitest による単体テストを実行します。
- `npm run test:watch` : テストをウォッチモードで実行します。
- `npm run test:e2e` : Playwright 導入前のプレースホルダーです。

## ディレクトリ構成

```
src/
  app/
    Layout.tsx
    ThemeProvider.tsx
    routes.tsx
  components/
    Button.tsx
    Card.tsx
    EmptyState.tsx
    Loading.tsx
    NavBar.tsx
    ResultList.tsx
    ThemeToggle.tsx
  lib/
    api/
      client.ts
    utils/
      index.ts
  pages/
    Gacha.tsx
    Home.tsx
    Hunter.tsx
    Quiz.tsx
  store/
    themeStore.ts
  types/
    index.ts
  index.css
  main.tsx
  vite-env.d.ts
```

## 環境変数

`.env.example` を `.env` にコピーして利用してください。

```
VITE_API_BASE_URL=
VITE_FEATURE_GACHA=true
VITE_FEATURE_QUIZ=true
VITE_FEATURE_HUNTER=true
```

## テスト

Vitest と Testing Library を用意しているため、コンポーネントの振る舞いを簡単に検証できます。新しいコンポーネントを作成した際は `src/components/__tests__` 以下にテストを追加してください。
