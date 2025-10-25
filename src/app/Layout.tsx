import { Suspense, useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { NavBar } from '../components/NavBar';
import { PageSkeleton } from '../components/PageSkeleton';

const META_MAP: Record<
  string,
  {
    title: string;
    description: string;
    note: string;
  }
> = {
  '/': {
    title: 'Home',
    description: '省庁横断で公開される法令データを検索・可視化し、素早く概要を把握できるハブです。',
    note: '正確性の保証は公式原文をご確認ください。'
  },
  '/gacha': {
    title: 'Gacha',
    description: 'ランダム抽出で新しい法令に出会い、要点を学べる体験を提供します。',
    note: '提示される解説は参考情報であり、法的効力を持ちません。'
  },
  '/quiz': {
    title: 'Quiz',
    description: '判例や条文をもとにしたクイズで理解度をセルフチェックできます。',
    note: '各問の正誤は最新の法改正状況と異なる場合があります。'
  },
  '/hunter': {
    title: 'Hunter',
    description: '詳細検索で目的の法令や条文を精密に絞り込み、研究・業務に活用できます。',
    note: '最終判断は必ず政府公式サイトの原文で行ってください。'
  },
  default: {
    title: 'eGov Law Playground',
    description: '行政機関が提供する法令データを探索し、学習を支援するための実験的なユーザー体験です。',
    note: '正確性の保証は公式原文をご確認ください。'
  }
};

export const Layout = () => {
  const { pathname } = useLocation();

  const meta = useMemo(() => META_MAP[pathname] ?? META_MAP.default, [pathname]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = `${meta.title} | eGov Law Playground`;
    }
  }, [meta]);

  return (
    <div className="min-h-screen bg-surface-light text-slate-900 transition-colors duration-300 dark:bg-surface-dark dark:text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:rounded-full focus-visible:bg-primary focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-semibold focus-visible:text-white"
      >
        メインコンテンツへスキップ
      </a>
      <NavBar />
      <main
        id="main-content"
        role="main"
        aria-labelledby="page-heading"
        aria-describedby="page-summary"
        className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10 lg:py-12"
      >
        <header className="rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/60">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/80" id="page-heading">
              {meta.title}
            </p>
            <p className="text-base text-slate-700 dark:text-slate-300" id="page-summary">
              {meta.description}
            </p>
          </div>
          <p className="mt-4 text-xs text-slate-600 dark:text-slate-400" aria-live="polite">
            {meta.note}
          </p>
        </header>
        <section className="mt-8">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white/60 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
        <p className="font-medium">© {new Date().getFullYear()} eGov Law Playground</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">正確性の保証は公式原文をご確認ください。</p>
      </footer>
    </div>
  );
};
