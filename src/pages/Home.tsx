import { Link } from 'react-router-dom';
import { Card } from '../components/Card';

const featureCards = [
  {
    title: '判例ガチャ',
    description: 'ランダムに判例を取得し、概要を素早く把握できます。',
    to: '/gacha'
  },
  {
    title: 'クイズブリーフィング',
    description: '条文や判例をクイズ形式で復習し、理解を深めましょう。',
    to: '/quiz'
  },
  {
    title: 'ハンター検索',
    description: 'キーワード検索で関連法令や判例を横断的に探索します。',
    to: '/hunter'
  }
];

export const HomePage = () => {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 px-8 py-14 text-white shadow-xl">
        <h1 className="text-4xl font-bold tracking-tight">eGov Law Playground</h1>
        <p className="mt-4 max-w-2xl text-lg text-blue-50">
          電子政府の法令 API を活用したリーガルリサーチ支援ツールの実験場です。ガチャ、クイズ、ハンターの 3
          モードで素早く情報を探索できます。
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/gacha"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-blue-600"
          >
            判例ガチャを回す
          </Link>
          <Link
            to="/quiz"
            className="inline-flex items-center justify-center rounded-md border border-white/60 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            クイズに挑戦
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {featureCards.map((card) => (
          <Card
            key={card.to}
            title={card.title}
            actions={
              <Link
                to={card.to}
                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-blue-600"
              >
                開く
              </Link>
            }
          >
            {card.description}
          </Card>
        ))}
      </section>
    </div>
  );
};
