import { AnimatePresence } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent
} from 'react';

import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { GachaCard } from '../components/GachaCard';
import {
  extractProvisionsByKeyword,
  getLawById,
  searchLaws,
  LawApiError,
  type LawClientConfig
} from '../lib/api/lawClient';
import { highlightKeyword } from '../lib/utils/highlight';
import { useGachaStore, type GachaHistoryEntry, type GachaState } from '../store/gachaStore';
import type { LawDetail, Provision, SearchParams } from '../types/law';

interface CategoryOption {
  label: string;
  query: string;
}

interface GachaResult {
  entry: GachaHistoryEntry;
  law: LawDetail;
  provision: Provision;
  categoryLabel: string;
  keyword?: string;
}

const CATEGORY_OPTIONS: readonly CategoryOption[] = [
  { label: '技術・IT', query: '情報 技術 デジタル' },
  { label: '金融', query: '金融 銀行 証券' },
  { label: '環境', query: '環境 保全' },
  { label: '労働', query: '労働 労働基準' },
  { label: '著作・会社法', query: '著作権 会社法' }
];

const DEFAULT_CATEGORY_SELECTION = CATEGORY_OPTIONS.slice(0, 3).map((option) => option.label);
const SEARCH_CONFIG: LawClientConfig = { maxRetries: 2 };

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const shuffle = <T,>(input: T[]): T[] => {
  const copy = [...input];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
};

const buildCiteUrl = (lawId: string) =>
  `https://elaws.e-gov.go.jp/document?lawid=${encodeURIComponent(lawId)}`;

const categoryByLabel = (label: string): CategoryOption | undefined =>
  CATEGORY_OPTIONS.find((option) => option.label === label);

const normalizeKeywordTokens = (keyword: string): string[] => {
  const tokens = keyword
    .split(/[\s,、]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  return [...new Set(tokens)];
};

export const GachaPage = () => {
  const [result, setResult] = useState<GachaResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keywordOnly, setKeywordOnly] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');

  const history = useGachaStore((state: GachaState) => state.history);
  const favorites = useGachaStore((state: GachaState) => state.favorites);
  const addHistory = useGachaStore((state: GachaState) => state.addHistory);
  const toggleFavorite = useGachaStore((state: GachaState) => state.toggleFavorite);
  const settings = useGachaStore((state: GachaState) => state.settings);
  const setCategories = useGachaStore((state: GachaState) => state.setCategories);
  const setKeyword = useGachaStore((state: GachaState) => state.setKeyword);
  const generateShareText = useGachaStore((state: GachaState) => state.generateShareText);

  const keywordCheckboxId = useId();
  const keywordInputId = useId();
  const hasAutoSpunRef = useRef(false);
  const resolvedCategories = useMemo(() => {
    if (settings.categories.length) {
      return settings.categories;
    }
    return DEFAULT_CATEGORY_SELECTION;
  }, [settings.categories]);

  useEffect(() => {
    if (!settings.categories.length) {
      setCategories(DEFAULT_CATEGORY_SELECTION);
    }
  }, [settings.categories.length, setCategories]);

  useEffect(() => {
    if (settings.keyword) {
      setKeywordOnly(true);
      setKeywordInput(settings.keyword);
    }
  }, [settings.keyword]);

  useEffect(() => {
    setKeyword(keywordInput);
  }, [keywordInput, setKeyword]);

  const buildSearchParams = useCallback(
    (category: CategoryOption, keyword?: string): SearchParams => {
      const trimmedKeyword = keyword?.trim();
      const keywords = normalizeKeywordTokens(trimmedKeyword ?? '');
      const categoryTokens = normalizeKeywordTokens(category.query);
      const allKeywords = trimmedKeyword
        ? [...keywords, ...categoryTokens]
        : categoryTokens;

      return {
        keyword: allKeywords.join(' ').trim() || undefined,
        keywords: allKeywords,
        numberOfRecords: 40,
        pageSize: 40,
        sort: 'relevance'
      };
    },
    []
  );

  const pickProvision = useCallback(
    (law: LawDetail, keyword?: string): Provision[] => {
      if (keyword?.trim()) {
        const extracted = extractProvisionsByKeyword(law, keyword.trim());
        if (extracted.length) {
          return extracted;
        }
      }
      return law.provisions;
    },
    []
  );

  const resolveUniqueProvision = useCallback(
    (
      candidateProvisions: Provision[],
      law: LawDetail
    ): { provision: Provision; entryId: string } | null => {
      const candidates = shuffle(candidateProvisions);
      for (const provision of candidates) {
        const entryId = `${law.lawId}:${provision.path}`;
        const exists = history.some((entry: GachaHistoryEntry) => entry.id === entryId);
        if (!exists) {
          return { provision, entryId };
        }
      }
      return null;
    },
    [history]
  );

  const fetchRandomResult = useCallback(
    async (keyword?: string): Promise<GachaResult> => {
      const categoriesPool: CategoryOption[] = shuffle(
        resolvedCategories.map((label: string) => categoryByLabel(label) ?? { label, query: label })
      );

      if (!categoriesPool.length) {
        categoriesPool.push(...shuffle([...CATEGORY_OPTIONS]));
      }

      const attemptedLawIds = new Set<string>();
      for (const category of categoriesPool) {
        const params = buildSearchParams(category, keyword);
        const searchResult = await searchLaws(params, SEARCH_CONFIG);
        const lawQueue = shuffle(searchResult.results);

        for (const lawSummary of lawQueue) {
          if (attemptedLawIds.has(lawSummary.lawId)) {
            continue;
          }
          attemptedLawIds.add(lawSummary.lawId);

          const lawDetail = await getLawById(lawSummary.lawId, SEARCH_CONFIG);
          const provisions = pickProvision(lawDetail, keyword);
          if (!provisions.length) {
            continue;
          }

          const resolved = resolveUniqueProvision(provisions, lawDetail);
          if (!resolved) {
            continue;
          }

          const entry: GachaHistoryEntry = {
            id: resolved.entryId,
            title: `${lawDetail.lawName} ${resolved.provision.path}`,
            category: category.label,
            keyword: keyword?.trim() || undefined,
            timestamp: new Date().toISOString()
          };

          return {
            entry,
            law: lawDetail,
            provision: resolved.provision,
            categoryLabel: category.label,
            keyword: keyword?.trim() || undefined
          };
        }
      }

      throw new LawApiError(
        keyword?.trim()
          ? '指定したキーワードを含む条文が見つかりません。条件を調整して再度お試しください。'
          : '新しい条文を取得できませんでした。カテゴリーを変更して再度お試しください。'
      );
    },
    [buildSearchParams, pickProvision, resolveUniqueProvision, resolvedCategories]
  );

  const handleSpin = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();

      const trimmedKeyword = keywordOnly ? keywordInput.trim() : '';
      if (keywordOnly && !trimmedKeyword) {
        setError('キーワードを入力してください。');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const next = await fetchRandomResult(trimmedKeyword || undefined);
        setResult(next);
        addHistory(next.entry);
      } catch (err) {
        const message = err instanceof LawApiError ? err.message : '条文の取得に失敗しました。時間をおいて再度お試しください。';
        setError(message);
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    },
    [addHistory, fetchRandomResult, keywordInput, keywordOnly]
  );

  useEffect(() => {
    if (!hasAutoSpunRef.current) {
      hasAutoSpunRef.current = true;
      void handleSpin();
    }
  }, [handleSpin]);

  const handleCategoryToggle = useCallback(
    (label: string) => {
      const isSelected = settings.categories.includes(label);
      if (isSelected) {
        const next = settings.categories.filter((item: string) => item !== label);
        setCategories(next);
        return;
      }
      setCategories([...settings.categories, label]);
    },
    [setCategories, settings.categories]
  );

  const handleFavoriteToggle = useCallback(() => {
    if (!result) {
      return;
    }
    toggleFavorite(result.entry);
  }, [result, toggleFavorite]);

  const handleShare = useCallback(async () => {
    if (!result) {
      return;
    }

    const citeUrl = buildCiteUrl(result.law.lawId);
    const shareText = generateShareText();

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: result.law.lawName, text: shareText, url: citeUrl });
        return;
      } catch (shareError) {
        if ((shareError as { name?: string })?.name === 'AbortError') {
          return;
        }
      }
    }

    const tweetUrl = new URL('https://twitter.com/intent/tweet');
    tweetUrl.searchParams.set('text', shareText);
    tweetUrl.searchParams.set('url', citeUrl);
    if (typeof window !== 'undefined') {
      window.open(tweetUrl.toString(), '_blank', 'noopener,noreferrer');
    }
  }, [generateShareText, result]);

  const isFavorite = useMemo(() => {
    if (!result) {
      return false;
    }
    return Boolean(favorites[result.entry.id]);
  }, [favorites, result]);

  const keywordTokens = useMemo(
    () => normalizeKeywordTokens(keywordOnly ? keywordInput : ''),
    [keywordInput, keywordOnly]
  );

  const renderControls = () => (
    <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70">
      <form className="space-y-6" onSubmit={handleSpin}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">カテゴリー</h2>
            <span className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              未選択の場合は推奨カテゴリーから抽選
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((option) => {
              const active = settings.categories.includes(option.label);
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleCategoryToggle(option.label)}
                  aria-pressed={active}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    active
                      ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-primary/60 hover:text-primary dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor={keywordCheckboxId} className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <input
                id={keywordCheckboxId}
                type="checkbox"
                checked={keywordOnly}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setKeywordOnly(event.target.checked);
                  if (!event.target.checked) {
                    setError(null);
                  }
                }}
                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-primary focus:ring-primary"
              />
              キーワードを含む条文ガチャ
            </label>
            <span className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              例: 個人情報 / 金融 / 環境 など
            </span>
          </div>
          <input
            id={keywordInputId}
            type="text"
            value={keywordInput}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setKeywordInput(event.target.value)}
            placeholder="キーワードを入力"
            disabled={!keywordOnly}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700/60">
          <div
            className="flex items-center gap-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
            role="status"
            aria-live="polite"
          >
            {isLoading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span>抽選中です…</span>
              </>
            ) : (
              <span>新しい条文を引いてみましょう。</span>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full px-6 text-base sm:w-auto"
            >
              {isLoading ? '抽選中…' : '引く'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setKeywordInput('');
                setKeywordOnly(false);
                setError(null);
              }}
              className="h-12 w-full px-6 text-base sm:w-auto"
            >
              条件をクリア
            </Button>
          </div>
        </div>
      </form>
    </section>
  );

  const renderSkeleton = () => (
    <div className="animate-pulse rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-inner dark:border-slate-700/70 dark:bg-slate-900/70">
      <div className="mb-4 h-5 w-1/3 rounded-full bg-slate-200 dark:bg-slate-700" />
      <div className="mb-3 h-4 w-1/2 rounded-full bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-11/12 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-10/12 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="h-10 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-10 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-10 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );

  const highlightedText = useMemo(() => {
    if (!result) {
      return '';
    }
    const base = escapeHtml(result.provision.text).replace(/\n/g, '<br />');
    if (!keywordTokens.length) {
      return base;
    }
    return keywordTokens.reduce(
      (acc: string, token: string) => highlightKeyword(acc, token, { caseSensitive: false }),
      base
    );
  }, [keywordTokens, result]);

  return (
    <div className="space-y-8">
      {renderControls()}

      <AnimatePresence mode="wait">
        {isLoading ? (
          <div key="gacha-skeleton">{renderSkeleton()}</div>
        ) : result ? (
          <GachaCard
            key={result.entry.id}
            lawName={result.law.lawName}
            lawNumber={result.law.lawNumber}
            lawType={result.law.lawType}
            provisionPath={result.provision.path}
            provisionText={highlightedText}
            citeUrl={buildCiteUrl(result.law.lawId)}
            categoryLabel={result.categoryLabel}
            keyword={result.keyword}
            onSpin={handleSpin}
            onToggleFavorite={handleFavoriteToggle}
            onShare={handleShare}
            isFavorite={isFavorite}
            isSpinning={isLoading}
            createdAt={result.entry.timestamp}
          />
        ) : (
          <div key="gacha-empty">
            <EmptyState
              heading={error ? '条文の取得に失敗しました' : 'まだガチャは引かれていません'}
              description={
                error ?? '「引く」ボタンから最初の条文を手に入れましょう。カテゴリーを変更するとバリエーションが広がります。'
              }
              actionLabel="もう一度試す"
              onAction={handleSpin}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
