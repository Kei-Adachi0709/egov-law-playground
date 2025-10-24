import { useState, type ChangeEvent } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { ResultList } from '../components/ResultList';
import { searchLawSummaries } from '../lib/api/client';
import type { LawSummary } from '../types';

export const HunterPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LawSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const summaries = await searchLawSummaries(query);
      setResults(summaries);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="ハンター検索"
        actions={
          <Button onClick={handleSearch} disabled={!query.trim() || loading} className="min-w-[120px]">
            {loading ? '検索中...' : '検索する'}
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            キーワードから e-Gov の法令・判例データを横断検索する簡易ハンター機能です。
          </p>
          <input
            type="search"
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="例: 個人情報保護"
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </Card>

      {loading && <Loading />}

      <ResultList<LawSummary>
        items={results}
        empty={
          hasSearched ? (
            <EmptyState
              heading="一致する結果が見つかりませんでした"
              description="キーワードを変えて再度検索してみてください。"
            />
          ) : (
            <EmptyState
              heading="検索を始めましょう"
              description="探したい法令やトピックのキーワードを入力して検索してください。"
              actionLabel="検索する"
              onAction={handleSearch}
            />
          )
        }
        renderItem={(item) => (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{item.excerpt}</p>
            <a
              href={item.reference}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              e-Gov で確認する
            </a>
          </div>
        )}
      />
    </div>
  );
};
