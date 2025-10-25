import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { extractProvisionsByKeyword, getLawById } from '../lib/api/lawClient';
import { highlightKeyword } from '../lib/utils/highlight';
import type { LawDetail, LawSummary, LawsSearchResult, Provision } from '../types/law';

import { Button } from './Button';
import { Card } from './Card';
import { EmptyState } from './EmptyState';

interface SearchResultsProps {
  keyword: string;
  keywordTokens: string[];
  result: LawsSearchResult | null;
  loading: boolean;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  searchKey: string;
  collapseThreshold?: number;
}

interface DetailState {
  loading: boolean;
  error?: string;
  detail?: LawDetail;
  provisions: Provision[];
}

const COLLAPSE_THRESHOLD_DEFAULT = 40;
const MAX_COLLAPSED_VISIBLE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildLawUrl = (lawId: string): string =>
  `https://elaws.e-gov.go.jp/document?lawid=${encodeURIComponent(lawId)}`;

const formatProvisionLabel = (provision: Provision): string => {
  const segments: string[] = [];
  if (provision.articleNumber) {
    const raw = provision.articleNumber.trim();
    segments.push(raw.includes('条') ? raw : `第${raw}条`);
  }
  if (provision.paragraphNumber) {
    const raw = provision.paragraphNumber.trim();
    segments.push(raw.includes('項') ? raw : `${raw}項`);
  }
  if (provision.itemNumber) {
    const raw = provision.itemNumber.trim();
    segments.push(raw.includes('号') ? raw : `${raw}号`);
  }
  return segments.join(' ');
};

export const SearchResults = ({
  keyword,
  keywordTokens,
  result,
  loading,
  pageSize,
  onPageChange,
  onPageSizeChange,
  searchKey,
  collapseThreshold = COLLAPSE_THRESHOLD_DEFAULT
}: SearchResultsProps) => {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<Record<string, DetailState>>({});
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const shouldCollapse = (result?.totalCount ?? 0) > collapseThreshold;
    setCollapsed(shouldCollapse);
  }, [result?.totalCount, collapseThreshold]);

  useEffect(() => {
    setExpandedMap({});
  }, [searchKey]);

  const applyHighlights = useCallback(
    (text: string): string => {
      const base = escapeHtml(text).replace(/\n/g, '<br />');
      if (!keywordTokens.length) {
        return base;
      }
      return keywordTokens.reduce(
        (acc, token) => highlightKeyword(acc, token, { caseSensitive: false }),
        base
      );
    },
    [keywordTokens]
  );

  const totalPages = useMemo(() => {
    if (!result || pageSize <= 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(result.totalCount / pageSize));
  }, [result, pageSize]);

  const visibleResults = useMemo(() => {
    if (!result) {
      return [] as LawSummary[];
    }
    if (!collapsed) {
      return result.results;
    }
    return result.results.slice(0, Math.min(result.results.length, MAX_COLLAPSED_VISIBLE));
  }, [collapsed, result]);

  const currentResultCount = result?.results?.length ?? 0;
  const hiddenCount = collapsed ? Math.max(0, currentResultCount - MAX_COLLAPSED_VISIBLE) : 0;

  const handleToggleCollapse = () => {
    setCollapsed((prev) => !prev);
  };

  const loadDetail = useCallback(
    async (law: LawSummary) => {
      setDetails((prev) => ({
        ...prev,
        [law.lawId]: {
          loading: true,
          error: undefined,
          detail: prev[law.lawId]?.detail,
          provisions: prev[law.lawId]?.provisions ?? []
        }
      }));
      try {
        const detail = await getLawById(law.lawId);
        let matched = extractProvisionsByKeyword(detail, keyword);
        if (!matched.length && keywordTokens.length > 1) {
          const dedup = new Map<string, Provision>();
          keywordTokens.forEach((token) => {
            extractProvisionsByKeyword(detail, token).forEach((provision) => {
              const key = `${provision.path}-${provision.text}`;
              if (!dedup.has(key)) {
                dedup.set(key, provision);
              }
            });
          });
          matched = Array.from(dedup.values());
        }
        if (!matched.length) {
          matched = detail.provisions.slice(0, 3);
        }
        setDetails((prev) => ({
          ...prev,
          [law.lawId]: {
            loading: false,
            detail,
            provisions: matched
          }
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : '条文の取得に失敗しました。';
        setDetails((prev) => ({
          ...prev,
          [law.lawId]: {
            loading: false,
            error: message,
            detail: prev[law.lawId]?.detail,
            provisions: prev[law.lawId]?.provisions ?? []
          }
        }));
      }
    },
    [keyword, keywordTokens]
  );

  const handleToggleLaw = (law: LawSummary) => {
    const isCurrentlyExpanded = !!expandedMap[law.lawId];
    const nextState = !isCurrentlyExpanded;
    setExpandedMap((prev) => ({ ...prev, [law.lawId]: nextState }));
    const currentDetail = details[law.lawId];
    if (nextState && !(currentDetail?.detail || currentDetail?.loading)) {
      void loadDetail(law);
    }
  };

  const handleRetryDetail = (law: LawSummary) => {
    void loadDetail(law);
  };

  const renderHeader = () => {
    if (!result && !loading) {
      return null;
    }

    const totalCount = result?.totalCount ?? 0;
    const currentPage = result?.page ?? 1;
    const hasPrevious = currentPage > 1;
    const hasNext = currentPage < totalPages;
    const showCollapseToggle =
      (result?.totalCount ?? 0) > collapseThreshold && currentResultCount > MAX_COLLAPSED_VISIBLE;

    return (
      <Card
        title="検索結果サマリ"
        actions={
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <label className="text-slate-500" htmlFor="hunter-page-size">
                表示件数
              </label>
              <select
                id="hunter-page-size"
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={pageSize}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" disabled={!hasPrevious} onClick={() => onPageChange(currentPage - 1)}>
                前へ
              </Button>
              <Button variant="ghost" disabled={!hasNext} onClick={() => onPageChange(currentPage + 1)}>
                次へ
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
          <span>
            総件数: <strong className="text-slate-900 dark:text-slate-100">{totalCount.toLocaleString()}</strong>
          </span>
          <span>
            ページ: <strong className="text-slate-900 dark:text-slate-100">{currentPage}</strong> / {totalPages}
          </span>
          {result?.executionTimeMs !== undefined && (
            <span>取得時間: {result.executionTimeMs} ms</span>
          )}
          {showCollapseToggle && (
            <Button variant="ghost" onClick={handleToggleCollapse}>
              {collapsed ? '全件を表示' : '先頭のみ表示'}
            </Button>
          )}
        </div>
      </Card>
    );
  };

  const renderLawCard = (law: LawSummary) => {
    const expanded = !!expandedMap[law.lawId];
    const detailState = details[law.lawId];
    const snippetSource = law.highlights?.find((entry) => entry?.trim().length) ?? '';
    const snippetHtml = snippetSource
      ? applyHighlights(snippetSource)
      : applyHighlights(law.lawNumber ? `法令番号: ${law.lawNumber}` : '条文を展開して詳細を確認できます。');

    return (
      <motion.li
        key={law.lawId}
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          title={
            <div className="flex flex-col gap-1 text-left">
              <span className="text-base font-semibold text-slate-900 dark:text-slate-50">
                <span dangerouslySetInnerHTML={{ __html: applyHighlights(law.lawName) }} />
              </span>
              {law.lawNumber && (
                <span className="text-xs text-slate-500 dark:text-slate-400">{law.lawNumber}</span>
              )}
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => handleToggleLaw(law)}>
                {expanded ? '折りたたむ' : '詳細を見る'}
              </Button>
              <a
                href={buildLawUrl(law.lawId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/10 dark:border-slate-700"
              >
                e-Gov で確認
              </a>
            </div>
          }
        >
          <div className="space-y-4 text-sm">
            <div
              className="text-slate-600 dark:text-slate-300"
              dangerouslySetInnerHTML={{ __html: snippetHtml }}
            />
            {law.promulgationDate && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                公布日: {law.promulgationDate}
              </div>
            )}
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  {detailState?.loading ? (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-600">
                      <svg
                        className="h-4 w-4 animate-spin text-primary"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      条文を読み込み中です…
                    </div>
                  ) : detailState?.error ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                      <span>{detailState.error}</span>
                      <Button variant="ghost" onClick={() => handleRetryDetail(law)}>
                        再試行
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        該当条文
                      </p>
                      <ul className="space-y-3 text-sm">
                        {(detailState?.provisions ?? []).map((provision, index) => {
                          const provisionHtml = applyHighlights(provision.text);
                          return (
                            <li
                              key={`${provision.path}-${index}`}
                              className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200"
                            >
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {formatProvisionLabel(provision) || '条文'}
                              </div>
                              <div
                                className="text-sm leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: provisionHtml }}
                              />
                              <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                                参照パス: {provision.path}
                              </div>
                            </li>
                          );
                        })}
                        {!detailState?.provisions?.length && (
                          <li className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            該当する条文は見つかりませんでした。
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </motion.li>
    );
  };

  if (!result && !loading) {
    return (
      <EmptyState
        heading="検索を開始しましょう"
        description="キーワードと条件を設定して検索を実行すると結果が表示されます。"
      />
    );
  }

  if (result && !result.results.length && !loading) {
    return (
      <Card title="検索結果">
        <EmptyState
          heading="一致する法令が見つかりませんでした"
          description="キーワードやカテゴリを変更して再度お試しください。"
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {renderHeader()}
      <AnimatePresence initial={false}>
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300"
          >
            検索中です…
          </motion.div>
        ) : (
          <motion.ul key="results" className="space-y-4">
            {visibleResults.map((law) => renderLawCard(law))}
            {hiddenCount > 0 && (
              <li className="text-center text-sm text-slate-500 dark:text-slate-400">
                他 {hiddenCount} 件は折りたたまれています。
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};
