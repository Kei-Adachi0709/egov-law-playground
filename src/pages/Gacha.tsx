import { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { ResultList } from '../components/ResultList';
import { fetchRandomLawSummary } from '../lib/api/client';
import type { LawSummary } from '../types';

export const GachaPage = () => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<LawSummary[]>([]);

  const handleDraw = async () => {
    setLoading(true);
    try {
      const summary = await fetchRandomLawSummary();
      setHistory((prev: LawSummary[]) => [summary, ...prev].slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="判例ガチャ"
        actions={
          <Button onClick={handleDraw} disabled={loading} className="min-w-[120px]">
            {loading ? '抽選中...' : 'ガチャを回す'}
          </Button>
        }
      >
        電子政府の法令データからランダムに判例情報を取得し、参考リンクとともに表示します。
      </Card>

      {loading && <Loading />}

      <ResultList<LawSummary>
        items={history}
        empty={
          <EmptyState
            heading="まだガチャは回されていません"
            description="「ガチャを回す」ボタンから最初の判例を取得しましょう。"
            actionLabel="ガチャを回す"
            onAction={handleDraw}
          />
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
