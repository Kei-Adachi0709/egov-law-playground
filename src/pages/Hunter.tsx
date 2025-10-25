import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { SearchResults } from '../components/SearchResults';
import { searchLaws } from '../lib/api/lawClient';
import { useSearchStore } from '../store/searchStore';
import type { LawsSearchResult, SearchParams } from '../types/law';

const CATEGORY_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'すべて', value: '' },
  { label: '行政法', value: '行政法' },
  { label: '民法', value: '民法' },
  { label: '商法', value: '商法' },
  { label: '労働法', value: '労働法' },
  { label: '刑法', value: '刑法' },
  { label: '知的財産', value: '知的財産' },
  { label: '金融', value: '金融' },
  { label: '環境', value: '環境' }
];

const SORT_OPTIONS: Array<{ label: string; value: SearchParams['sort'] }> = [
  { label: '関連度順', value: 'relevance' },
  { label: '公布日が新しい順', value: 'promulgationDate' },
  { label: '法令番号順', value: 'lawNumber' }
];

const STORAGE_KEY = 'hunter-game-stats-v1';

interface LeaderboardEntry {
  keyword: string;
  bestHit: number;
  searches: number;
  lastSearched: string;
}

interface GuessSnapshot {
  keyword: string;
  guess: number;
  actual: number;
  error: number;
  points: number;
  timestamp: string;
}

interface HunterStats {
  score: number;
  totalGames: number;
  leaderboard: LeaderboardEntry[];
  lastGuess: GuessSnapshot | null;
}

const createDefaultStats = (): HunterStats => ({
  score: 0,
  totalGames: 0,
  leaderboard: [],
  lastGuess: null
});

const parseGuess = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(0, Math.round(parsed));
};

const updateLeaderboard = (
  entries: LeaderboardEntry[],
  keyword: string,
  totalCount: number,
  timestamp: string
): LeaderboardEntry[] => {
  if (!keyword.trim()) {
    return entries;
  }
  const normalized = keyword.toLowerCase();
  const snapshot = [...entries];
  const index = snapshot.findIndex((entry) => entry.keyword.toLowerCase() === normalized);
  if (index >= 0) {
    const current = snapshot[index];
    snapshot[index] = {
      ...current,
      bestHit: Math.max(current.bestHit, totalCount),
      searches: current.searches + 1,
      lastSearched: timestamp
    };
  } else {
    snapshot.push({ keyword, bestHit: totalCount, searches: 1, lastSearched: timestamp });
  }
  return snapshot
    .sort((a, b) => {
      if (b.bestHit !== a.bestHit) {
        return b.bestHit - a.bestHit;
      }
      if (b.searches !== a.searches) {
        return b.searches - a.searches;
      }
      return b.lastSearched.localeCompare(a.lastSearched);
    })
    .slice(0, 10);
};

interface ExecuteSearchOptions {
  page?: number;
  pageSize?: number;
  recordGame?: boolean;
  guess?: number | null;
}

export const HunterPage = () => {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<SearchParams['sort']>('relevance');
  const [guessInput, setGuessInput] = useState('');
  const [result, setResult] = useState<LawsSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeKeyword, setActiveKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSort, setActiveSort] = useState<SearchParams['sort']>('relevance');

  const page = useStore(useSearchStore, (state) => state.page);
  const pageSize = useStore(useSearchStore, (state) => state.pageSize);
  const setPage = useStore(useSearchStore, (state) => state.setPage);
  const setPageSize = useStore(useSearchStore, (state) => state.setPageSize);
  const addHistory = useStore(useSearchStore, (state) => state.addHistory);
  const setLastParams = useStore(useSearchStore, (state) => state.setLastParams);

  const [stats, setStats] = useState<HunterStats>(() => createDefaultStats());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as HunterStats;
        setStats({
          score: parsed.score ?? 0,
          totalGames: parsed.totalGames ?? 0,
          leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
          lastGuess: parsed.lastGuess ?? null
        });
      } catch {
        setStats(createDefaultStats());
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }, [stats, hydrated]);

  const executeSearch = useCallback(
    async ({ page: targetPage = page, pageSize: targetPageSize = pageSize, recordGame = false, guess = null }: ExecuteSearchOptions = {}) => {
      const resolvedKeywordSource = recordGame ? keyword : activeKeyword || keyword;
      const trimmedKeyword = resolvedKeywordSource.trim();
      if (!trimmedKeyword) {
        setError('検索するキーワードを入力してください。');
        setResult(null);
        setHasSearched(false);
        return;
      }

      setLoading(true);
      setError(null);

      const resolvedCategory = recordGame ? category : activeCategory;
      const resolvedSort = recordGame ? sort : activeSort;

      const params: SearchParams = {
        keyword: trimmedKeyword,
        sort: resolvedSort,
        page: targetPage,
        numberOfRecords: targetPageSize,
        pageSize: targetPageSize
      };
      if (resolvedCategory) {
        params.lawCategory = resolvedCategory;
      }

      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

      try {
        const response = await searchLaws(params);
        const elapsed = Math.round(
          (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
        );
        const totalCount = response.totalCount ?? response.results.length;
        const totalPages = targetPageSize > 0 ? Math.ceil(totalCount / targetPageSize) : 1;
        const enriched: LawsSearchResult = {
          ...response,
          page: targetPage,
          pageSize: targetPageSize,
          numberOfRecords: response.numberOfRecords ?? response.results.length,
          hasNext: targetPage < totalPages,
          hasPrevious: targetPage > 1,
          query: params,
          executionTimeMs: elapsed
        };

        setResult(enriched);
        setHasSearched(true);
        setActiveKeyword(trimmedKeyword);
        setActiveCategory(resolvedCategory ?? '');
        setActiveSort(resolvedSort ?? 'relevance');

        if (recordGame) {
          addHistory(params);
        }
        setLastParams(params);

        const timestamp = new Date().toISOString();
        setStats((prev) => {
          const leaderboard = updateLeaderboard(prev.leaderboard, trimmedKeyword, totalCount, timestamp);
          if (!recordGame || guess === null) {
            return { ...prev, leaderboard };
          }
          const errorDistance = Math.abs(totalCount - guess);
          const points = Math.max(0, Math.round(100 - Math.min(errorDistance, 100)));
          return {
            score: prev.score + points,
            totalGames: prev.totalGames + 1,
            leaderboard,
            lastGuess: {
              keyword: trimmedKeyword,
              guess,
              actual: totalCount,
              error: errorDistance,
              points,
              timestamp
            }
          };
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '検索に失敗しました。時間をおいて再度お試しください。');
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [keyword, activeKeyword, category, activeCategory, sort, activeSort, page, pageSize, addHistory, setLastParams]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const guessValue = parseGuess(guessInput);
    setPage(1);
    void executeSearch({ page: 1, pageSize, recordGame: true, guess: guessValue ?? null });
  };

  const handlePageChange = (nextPage: number) => {
    if (!hasSearched || !activeKeyword) {
      return;
    }
    if (nextPage === page || nextPage < 1) {
      return;
    }
    setPage(nextPage);
    void executeSearch({ page: nextPage });
  };

  const handlePageSizeChange = (nextSize: number) => {
    if (!hasSearched || !activeKeyword) {
      return;
    }
    if (nextSize === pageSize) {
      return;
    }
    setPageSize(nextSize);
    setPage(1);
    void executeSearch({ page: 1, pageSize: nextSize });
  };

  const handleResetStats = () => {
    setStats(createDefaultStats());
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const keywordTokens = useMemo(
    () => activeKeyword.split(/\s+/).map((token) => token.trim()).filter(Boolean),
    [activeKeyword]
  );

  const searchKey = useMemo(
    () => JSON.stringify({ keyword: activeKeyword, category: activeCategory, sort: activeSort }),
    [activeKeyword, activeCategory, activeSort]
  );

  const leaderboardDisplay = useMemo(() => stats.leaderboard.slice(0, 5), [stats.leaderboard]);

  return (
    <div className="space-y-8">
      <Card title="ハンター検索">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-200">キーワード</span>
              <input
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="例: 個人情報保護"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-200">カテゴリ</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-200">ソート順</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SearchParams['sort'])}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value ?? 'relevance'} value={option.value ?? 'relevance'}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-200">予想件数</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={guessInput}
                onChange={(event) => setGuessInput(event.target.value)}
                placeholder="例: 25"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <div className="flex items-end justify-end gap-3">
              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? '検索中…' : '検索する'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setKeyword('');
                  setGuessInput('');
                }}
              >
                クリア
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {error && (
        <Card title="エラー">
          <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div>
          <SearchResults
            keyword={activeKeyword}
            keywordTokens={keywordTokens}
            result={result}
            loading={loading}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            searchKey={searchKey}
          />
        </div>
        <div className="space-y-6">
          <Card
            title="予想クイズスコア"
            actions={
              <Button variant="ghost" onClick={handleResetStats} className="text-xs">
                リセット
              </Button>
            }
          >
            {hydrated ? (
              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-100/70 p-3 dark:bg-slate-800/60">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 dark:text-slate-400">総スコア</span>
                    <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {stats.score}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 dark:text-slate-400">参加回数</span>
                    <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {stats.totalGames}
                    </span>
                  </div>
                </div>

                {stats.lastGuess ? (
                  <div className="space-y-1 rounded-lg border border-slate-200 bg-white/70 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                    <div className="font-semibold text-slate-700 dark:text-slate-100">
                      直近の予想: {stats.lastGuess.keyword}
                    </div>
                    <div>予想 {stats.lastGuess.guess.toLocaleString()} 件 / 実際 {stats.lastGuess.actual.toLocaleString()} 件</div>
                    <div>誤差 {stats.lastGuess.error.toLocaleString()} 件 / +{stats.lastGuess.points} pt</div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    予想件数を入力して検索するとスコアが加算されます。
                  </p>
                )}

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    キーワードランキング
                  </h3>
                  {leaderboardDisplay.length ? (
                    <ol className="space-y-1 text-xs">
                      {leaderboardDisplay.map((entry, index) => (
                        <li key={entry.keyword} className="flex items-center justify-between rounded-md bg-slate-100/60 px-3 py-2 dark:bg-slate-800/60">
                          <span>
                            <span className="mr-2 text-slate-400">#{index + 1}</span>
                            {entry.keyword}
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-100">
                            {entry.bestHit.toLocaleString()} 件
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">まだランキングはありません。</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">スコアデータを読み込み中です…</p>
            )}
          </Card>

          {!hasSearched && (
            <Card>
              <EmptyState
                heading="検索を開始しましょう"
                description="キーワードと条件を設定して検索を実行してください。"
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
