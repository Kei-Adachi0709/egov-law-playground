export interface LawSummary {
  id: string;
  title: string;
  excerpt: string;
  reference: string;
}

export type QuizDifficulty = 'easy' | 'normal' | 'hard';

export interface QuizQuestionMetadata {
  lawId?: string;
  lawName?: string;
  articleNumber?: string;
  category?: string;
  difficulty?: QuizDifficulty;
  sourceUrl?: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: readonly string[];
  answerIndex: number;
  maskedText?: string;
  blanks?: readonly string[];
  explanation?: string;
  metadata?: QuizQuestionMetadata;
}
