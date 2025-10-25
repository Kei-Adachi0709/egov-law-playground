import type { QuizDifficulty } from '../../types';

export type QuizCategory = '金融法' | '会社法' | '著作権法' | '行政手続法';

export interface QuizBankEntry {
  id: string;
  lawId: string;
  lawName: string;
  articleNumber: string;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  text: string;
  sourceUrl?: string;
  keywords?: readonly string[];
  distractors?: readonly string[];
  manual?: {
    prompt: string;
    maskedText: string;
    blanks: readonly string[];
    choices: readonly string[];
    answerIndex: number;
    explanation?: string;
  };
}

export const QUIZ_BANK_ENTRIES: readonly QuizBankEntry[] = [
  {
    id: 'banking-01',
    lawId: '410AC0000000059',
    lawName: '銀行法',
    articleNumber: '第1条',
    category: '金融法',
    difficulty: 'easy',
    text: '銀行は、預金者等の保護を図り、その業務の健全かつ適切な運営を確保することにより、信用秩序の維持に資することを目的とする。',
    sourceUrl: 'https://elaws.e-gov.go.jp/document?lawid=410AC0000000059',
    keywords: ['預金者', '保護', '信用秩序'],
    distractors: ['財務諸表', '内部統制', '変動金利'],
    manual: {
      prompt: '銀行法第1条の目的として正しい語句はどれか。',
      maskedText:
        '銀行は、[ 〇〇 ]等の保護を図り、その業務の健全かつ適切な運営を確保することにより、信用秩序の維持に資することを目的とする。',
      blanks: ['預金者'],
      choices: ['預金者', '行政機関', '監査法人', '労働組合'],
      answerIndex: 0,
      explanation: '銀行法は銀行利用者、とりわけ預金者を保護することを目的に掲げている。'
    }
  },
  {
    id: 'corporate-02',
    lawId: '417AC0000000086',
    lawName: '会社法',
    articleNumber: '第362条',
    category: '会社法',
    difficulty: 'normal',
    text: '取締役会は、会社の業務執行の決定、取締役の職務の執行の監督及び代表取締役の選定並びに解職を行う。',
    sourceUrl: 'https://elaws.e-gov.go.jp/document?lawid=417AC0000000086',
    keywords: ['取締役会', '業務執行', '監督', '代表取締役'],
    distractors: ['株主割当増資', '決算公告', '委員会設置会社'],
    manual: {
      prompt: '会社法第362条における取締役会の権限として適切なものはどれか。',
      maskedText:
        '取締役会は、会社の[ 〇〇 ]の決定、取締役の職務の執行の監督及び代表取締役の選定並びに解職を行う。',
      blanks: ['業務執行'],
      choices: ['業務執行', '定款変更', '剰余金の配当', '会計監査'],
      answerIndex: 0
    }
  },
  {
    id: 'copyright-01',
    lawId: '345AC0000000048',
    lawName: '著作権法',
    articleNumber: '第21条',
    category: '著作権法',
    difficulty: 'normal',
    text: '著作者は、その著作物を上映する権利を専有する。',
    sourceUrl: 'https://elaws.e-gov.go.jp/document?lawid=345AC0000000048',
    keywords: ['著作者', '著作物', '上映する権利'],
    distractors: ['頒布権', '翻案権', '複製権'],
    manual: {
      prompt: '著作権法第21条で著作者が専有すると規定されている権利はどれか。',
      maskedText: '著作者は、その著作物を[ 〇〇 ]権利を専有する。',
      blanks: ['上映する'],
      choices: ['上映する', '複製する', '翻案する', '放送する'],
      answerIndex: 0
    }
  },
  {
    id: 'administrative-01',
    lawId: '405AC1000000088',
    lawName: '行政手続法',
    articleNumber: '第5条',
    category: '行政手続法',
    difficulty: 'hard',
    text: '行政庁は、申請に対して標準処理期間を定め、申請者に対してその期間を公表しなければならない。',
    sourceUrl: 'https://elaws.e-gov.go.jp/document?lawid=405AC1000000088',
    keywords: ['申請', '標準処理期間', '公表'],
    distractors: ['行政指導', '聴聞', '教示'],
    manual: {
      prompt: '行政手続法第5条に関する記述のうち正しい語句を選べ。',
      maskedText: '行政庁は、申請に対して[ 〇〇 ]を定め、申請者に対してその期間を公表しなければならない。',
      blanks: ['標準処理期間'],
      choices: ['標準処理期間', '行政指導計画', '聴聞日程', '審査基準'],
      answerIndex: 0,
      explanation: '申請手続の迅速化を図るため、行政手続法は標準処理期間の設定・公表を義務づけている。'
    }
  },
  {
    id: 'banking-02',
    lawId: '410AC0000000059',
    lawName: '銀行法',
    articleNumber: '第13条',
    category: '金融法',
    difficulty: 'hard',
    text: '銀行は、内閣総理大臣の認可を受けなければ他の銀行と合併することができない。',
    sourceUrl: 'https://elaws.e-gov.go.jp/document?lawid=410AC0000000059',
    keywords: ['認可', '合併', '内閣総理大臣'],
    distractors: ['登録', '届出', '許可']
  },
  {
    id: 'corporate-04',
    lawId: '417AC0000000086',
    lawName: '会社法',
    articleNumber: '第296条',
    category: '会社法',
    difficulty: 'easy',
    text: '株主総会は、株主により構成され、会社の基本的な意思決定を行う機関である。',
    sourceUrl: 'https://elaws.e-gov.go.jp/document?lawid=417AC0000000086',
    keywords: ['株主総会', '意思決定'],
    distractors: ['監査役会', '委員会', '社外取締役']
  },
  {
    id: 'copyright-03',
    lawId: '345AC0000000048',
    lawName: '著作権法',
    articleNumber: '第30条',
    category: '著作権法',
    difficulty: 'hard',
    text: '著作物は、家庭内その他これに準ずる限られた範囲内において私的に利用することができる。',
    sourceUrl: 'https://elaws.e-gov.go.jp/document?lawid=345AC0000000048',
    keywords: ['家庭内', '私的', '利用'],
    distractors: ['営利目的', '公衆送信', '海外利用']
  }
];

export const QUIZ_CATEGORIES: readonly QuizCategory[] = Array.from(
  new Set(QUIZ_BANK_ENTRIES.map((entry) => entry.category))
);

export const getEntriesByCategory = (category?: QuizCategory): QuizBankEntry[] => {
  if (!category) {
    return [...QUIZ_BANK_ENTRIES];
  }
  return QUIZ_BANK_ENTRIES.filter((entry) => entry.category === category);
};

export const getDistractorPool = (
  category?: QuizCategory,
  excludeLawId?: string
): string[] => {
  const candidates = QUIZ_BANK_ENTRIES.filter((entry) =>
    !category || entry.category === category
  );
  const words = new Set<string>();
  candidates.forEach((entry) => {
    if (excludeLawId && entry.lawId === excludeLawId) {
      return;
    }
    entry.keywords?.forEach((word) => words.add(word));
    entry.distractors?.forEach((word) => words.add(word));
  });
  return Array.from(words);
};

export const getPresetEntries = () =>
  QUIZ_BANK_ENTRIES.filter((entry) => entry.manual);
