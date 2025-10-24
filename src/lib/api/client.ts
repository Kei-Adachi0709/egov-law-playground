import type { LawSummary, QuizQuestion } from '../../types';
import { createId, delay, randomFromArray } from '../utils';

const lawSummaries: LawSummary[] = [
  {
    id: 'law-01',
    title: '行政手続法 第 3 条',
    excerpt: '行政機関は、公正な手続を保障するため、処分の基準を定めなければならない。',
    reference: 'https://elaws.e-gov.go.jp/document?lawid=405AC1000000088'
  },
  {
    id: 'law-02',
    title: '情報公開法 第 5 条',
    excerpt: '実施機関は、開示請求に係る行政文書を開示するものとする。',
    reference: 'https://elaws.e-gov.go.jp/document?lawid=411AC0000000042'
  },
  {
    id: 'law-03',
    title: '個人情報保護法 第 16 条',
    excerpt: '個人情報取扱事業者は、利用目的の達成に必要な範囲を超えて個人情報を取扱ってはならない。',
    reference: 'https://elaws.e-gov.go.jp/document?lawid=415AC0000000057'
  }
];

const quizQuestions: QuizQuestion[] = [
  {
    id: 'quiz-01',
    prompt: '行政手続法で定められている処分の基準の趣旨はどれか。',
    choices: [
      '行政機関の裁量を拡大する',
      '行政手続の公正を確保する',
      '行政不服申立てを制限する'
    ],
    answerIndex: 1
  },
  {
    id: 'quiz-02',
    prompt: '情報公開法で開示請求できる主体はだれか。',
    choices: ['日本国民に限られる', '外国人を含むすべての者', '法人のみ'],
    answerIndex: 1
  },
  {
    id: 'quiz-03',
    prompt: '個人情報保護法における利用目的の制限に関する正しい記述はどれか。',
    choices: [
      '本人の同意があれば目的外利用は常に可能である',
      '利用目的の達成に必要な範囲内でのみ個人情報を利用できる',
      '第三者提供がある場合のみ制限される'
    ],
    answerIndex: 1
  }
];

export const fetchRandomLawSummary = async (): Promise<LawSummary> => {
  await delay(400);
  const summary = randomFromArray(lawSummaries);
  return { ...summary, id: createId() };
};

export const fetchQuizDeck = async (count = 3): Promise<QuizQuestion[]> => {
  await delay(350);
  return quizQuestions.slice(0, count);
};

export const searchLawSummaries = async (keyword: string): Promise<LawSummary[]> => {
  await delay(500);
  if (!keyword.trim()) {
    return [];
  }

  const normalized = keyword.trim().toLowerCase();
  return lawSummaries.filter((summary) => {
    return (
      summary.title.toLowerCase().includes(normalized) ||
      summary.excerpt.toLowerCase().includes(normalized)
    );
  });
};
