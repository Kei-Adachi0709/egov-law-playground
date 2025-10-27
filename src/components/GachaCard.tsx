import { motion, useReducedMotion } from 'framer-motion';
import { useId, useMemo } from 'react';

import { Button } from './Button';
import { Stack } from './Stack';

export interface GachaCardProps {
  lawName: string;
  lawNumber?: string;
  lawType?: string;
  provisionPath: string;
  provisionText: string;
  citeUrl: string;
  categoryLabel: string;
  keyword?: string;
  createdAt: string;
  onSpin: () => void | Promise<void>;
  onToggleFavorite: () => void | Promise<void>;
  onShare: () => void | Promise<void>;
  isFavorite: boolean;
  isSpinning?: boolean;
}

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return {
    display: new Intl.DateTimeFormat('ja-JP', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date),
    iso: date.toISOString()
  };
};

export const GachaCard = ({
  lawName,
  lawNumber,
  lawType,
  provisionPath,
  provisionText,
  citeUrl,
  categoryLabel,
  keyword,
  createdAt,
  onSpin,
  onToggleFavorite,
  onShare,
  isFavorite,
  isSpinning = false
}: GachaCardProps) => {
  const formattedDate = useMemo(() => formatDateTime(createdAt), [createdAt]);
  const provisionHtml = useMemo(() => ({ __html: provisionText }), [provisionText]);
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  const metadataLabelId = useId();

  const favoriteLabel = isFavorite ? 'お気に入りから削除' : 'お気に入りに追加';

  return (
    <motion.section
      initial={shouldAnimate ? { opacity: 0, y: 24, scale: 0.98 } : undefined}
      animate={shouldAnimate ? { opacity: 1, y: 0, scale: 1 } : undefined}
      exit={shouldAnimate ? { opacity: 0, y: -24, scale: 0.98 } : undefined}
      transition={
        shouldAnimate ? { type: 'spring', stiffness: 240, damping: 26, mass: 1 } : undefined
      }
      className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 shadow-lg backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/80"
    >
      <Stack className="p-8" gap="6">
        <header>
          <Stack gap="3">
            <Stack
              id={metadataLabelId}
              direction="row"
              wrap
              align="center"
              className="gap-3 text-[13px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
              aria-label="条文メタデータ"
            >
              <span className="rounded-full bg-blue-600 px-3 py-1 text-white shadow-sm dark:bg-blue-500">
                {categoryLabel}
              </span>
              {keyword ? (
                <span className="rounded-full bg-emerald-600 px-3 py-1 text-white shadow-sm dark:bg-emerald-500">
                  キーワード: {keyword}
                </span>
              ) : null}
              {lawType ? <span className="text-slate-700 dark:text-slate-200">{lawType}</span> : null}
              {formattedDate ? (
                <time
                  dateTime={formattedDate.iso}
                  className="text-slate-700 dark:text-slate-200"
                >
                  {formattedDate.display}
                </time>
              ) : null}
            </Stack>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
              {lawName}
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
              {provisionPath}
              {lawNumber ? ` ・ ${lawNumber}` : null}
            </p>
          </Stack>
        </header>

        <div
          className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5 text-slate-800 shadow-inner dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-100"
          role="region"
          aria-labelledby={metadataLabelId}
        >
          <article
            className="prose prose-sm max-w-none prose-neutral dark:prose-invert [&_mark]:rounded-[0.35rem] [&_mark]:bg-amber-200/60 [&_mark]:px-0.5 [&_mark]:py-0"
            dangerouslySetInnerHTML={provisionHtml}
          />
        </div>

        <footer>
          <Stack direction="row" wrap align="center" justify="between" className="gap-4 text-[15px] leading-relaxed">
            <Stack direction="row" wrap className="gap-3">
              <Button
                type="button"
                onClick={onSpin}
                disabled={isSpinning}
                className="h-11 px-6 text-base"
              >
                {isSpinning ? '抽選中…' : 'もう一度引く'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onToggleFavorite}
                aria-pressed={isFavorite}
                className={`h-11 px-5 text-base ${
                  isFavorite
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-100 dark:hover:bg-amber-500/30'
                    : ''
                }`}
              >
                {favoriteLabel}
                <span className="sr-only" aria-live="polite">
                  {isFavorite ? 'お気に入りに登録済み' : 'お気に入りから除外'}
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onShare}
                className="h-11 px-5 text-base"
                aria-label={`${lawName} を共有`}
                title="条文を共有"
              >
                この条文をシェア
              </Button>
            </Stack>
            <a
              href={citeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary underline-offset-4 transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
              aria-label={`${lawName} を e-Gov で開く`}
            >
              e-Gov で確認する
            </a>
          </Stack>
        </footer>
      </Stack>
    </motion.section>
  );
};
