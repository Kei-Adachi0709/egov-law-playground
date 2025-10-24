export interface LawSummary {
  id: string;
  title: string;
  excerpt: string;
  reference: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: readonly string[];
  answerIndex: number;
}
