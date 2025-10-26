import { createId, randomFromArray } from '.';
import type { QuizDifficulty, QuizQuestion } from '../../types';
import type { QuizBankEntry, QuizCategory } from './quizBank';
import { getDistractorPool, getEntriesByCategory } from './quizBank';

export type QuizGenerationMode = 'manual' | 'auto' | 'mixed';

export interface GenerateQuizQuestionOptions {
  category?: QuizCategory;
  difficulty?: QuizDifficulty;
  mode?: QuizGenerationMode;
  random?: () => number;
}

const DEFAULT_DIFFICULTY: QuizDifficulty = 'normal';
const STOP_WORDS = new Set(['こと', 'ため', 'する', 'おいて', 'もの', '場合', 'その他']);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const tokenizeCandidates = (text: string): string[] => {
  const tokens = text
    .match(/[一-龠々〆ヶ]{2,}|[ァ-ヶー]{3,}|[A-Za-z]{4,}|[0-9]{2,}/gu)
    ?.map((token) => token.trim())
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token)) ?? [];
  return Array.from(new Set(tokens));
};

const pickTermsForMasking = (
  entry: QuizBankEntry,
  difficulty: QuizDifficulty,
  random: () => number
): string[] => {
  const baseCandidates = entry.keywords ? [...entry.keywords] : [];
  const automaticCandidates = tokenizeCandidates(entry.text);
  const pool = Array.from(new Set([...baseCandidates, ...automaticCandidates]));
  if (!pool.length) {
    return [];
  }

  const blanks = difficulty === 'hard' && pool.length > 1 ? 2 : 1;
  const shuffled = shuffle([...pool], random);
  return shuffled.slice(0, Math.min(blanks, shuffled.length));
};

const replaceFirstOccurrence = (source: string, search: string, replacement: string): string => {
  const pattern = new RegExp(escapeRegExp(search));
  return source.replace(pattern, replacement);
};

export const maskTextWithTerms = (text: string, terms: readonly string[]): string => {
  let masked = text;
  terms.forEach((term) => {
    masked = replaceFirstOccurrence(masked, term, '[ 〇〇 ]');
  });
  return masked;
};

const choiceLabelFromTerms = (terms: readonly string[]): string => terms.join('／');

const buildChoiceSet = (
  correctTerms: readonly string[],
  entry: QuizBankEntry,
  difficulty: QuizDifficulty,
  random: () => number
): { choices: string[]; answerIndex: number } => {
  const correctLabel = choiceLabelFromTerms(correctTerms);
  const pool = new Set<string>();
  entry.distractors?.forEach((word) => pool.add(word));
  entry.keywords?.forEach((word) => pool.add(word));
  getDistractorPool(entry.category, entry.lawId).forEach((word) => pool.add(word));

  const distractors: string[] = [];
  const poolArray = shuffle(Array.from(pool), random).filter((word) => !correctTerms.includes(word));

  if (correctTerms.length > 1) {
    while (distractors.length < 3 && poolArray.length >= correctTerms.length) {
      const slice = poolArray.splice(0, correctTerms.length);
      if (slice.length === correctTerms.length) {
        const label = choiceLabelFromTerms(slice);
        if (label !== correctLabel && !distractors.includes(label)) {
          distractors.push(label);
        }
      }
    }
  } else {
    for (const candidate of poolArray) {
      if (candidate === correctLabel || distractors.includes(candidate)) {
        continue;
      }
      distractors.push(candidate);
      if (distractors.length === 3) {
        break;
      }
    }
  }

  while (distractors.length < 3) {
    const filler = `選択肢${String.fromCharCode(65 + distractors.length)}`;
    if (!distractors.includes(filler) && filler !== correctLabel) {
      distractors.push(filler);
    }
  }

  const combined = shuffle([correctLabel, ...distractors], random);
  const answerIndex = combined.indexOf(correctLabel);

  return { choices: combined, answerIndex };
};

const buildManualQuestion = (entry: QuizBankEntry): QuizQuestion => {
  if (!entry.manual) {
    throw new Error('Manual question requested but preset is missing.');
  }

  return {
    id: `quiz-${entry.id}-${createId()}`,
    prompt: entry.manual.prompt,
    choices: entry.manual.choices,
    answerIndex: entry.manual.answerIndex,
    maskedText: entry.manual.maskedText,
    blanks: entry.manual.blanks,
    explanation: entry.manual.explanation,
    metadata: {
      lawId: entry.lawId,
      lawName: entry.lawName,
      articleNumber: entry.articleNumber,
      category: entry.category,
      difficulty: entry.difficulty,
      sourceUrl: entry.sourceUrl
    }
  };
};

const buildAutomaticQuestion = (
  entry: QuizBankEntry,
  difficulty: QuizDifficulty,
  random: () => number
): QuizQuestion => {
  const maskedTerms = pickTermsForMasking(entry, difficulty, random);
  if (!maskedTerms.length) {
    throw new Error('Unable to determine masking terms for automatic quiz generation.');
  }
  const maskedText = maskTextWithTerms(entry.text, maskedTerms);
  const { choices, answerIndex } = buildChoiceSet(maskedTerms, entry, difficulty, random);
  const prompt =
    maskedTerms.length > 1
      ? `${entry.lawName}（${entry.articleNumber}）の本文中にある二箇所の[ 〇〇 ]に当てはまる語句の組み合わせはどれか。`
      : `${entry.lawName}（${entry.articleNumber}）の本文の[ 〇〇 ]に当てはまる語句はどれか。`;

  return {
    id: `quiz-auto-${entry.id}-${createId()}`,
    prompt,
    choices,
    answerIndex,
    maskedText,
    blanks: maskedTerms,
    metadata: {
      lawId: entry.lawId,
      lawName: entry.lawName,
      articleNumber: entry.articleNumber,
      category: entry.category,
      difficulty,
      sourceUrl: entry.sourceUrl
    }
  };
};

const shuffle = <T>(items: T[], random: () => number): T[] => {
  const array = [...items];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
};

const resolveEntry = (category: QuizCategory | undefined, random: () => number): QuizBankEntry => {
  const entries = getEntriesByCategory(category);
  if (!entries.length) {
    throw new Error('No quiz bank entries available for the requested category.');
  }
  return entries.length === 1 ? entries[0] : randomFromArray(entries, random);
};

export const generateQuizQuestion = async (
  options: GenerateQuizQuestionOptions = {}
): Promise<QuizQuestion> => {
  const random = options.random ?? Math.random;
  const category = options.category;
  const difficulty = options.difficulty ?? DEFAULT_DIFFICULTY;
  const mode = options.mode ?? 'mixed';

  const entry = resolveEntry(category, random);

  if (mode === 'manual' && entry.manual) {
    return buildManualQuestion(entry);
  }

  if (mode === 'auto') {
    try {
      return buildAutomaticQuestion(entry, difficulty, random);
    } catch (error) {
      if (entry.manual) {
        return buildManualQuestion(entry);
      }
      throw error;
    }
  }

  if (mode === 'mixed' && entry.manual) {
    const useManual = random() < 0.5;
    if (useManual) {
      return buildManualQuestion(entry);
    }
  }

  return buildAutomaticQuestion(entry, difficulty, random);
};

export const ensureValidQuestion = (question: QuizQuestion): void => {
  if (!question.choices || question.choices.length !== 4) {
    throw new Error('Quiz question must provide exactly four choices.');
  }
  const uniqueChoices = new Set(question.choices);
  if (uniqueChoices.size !== question.choices.length) {
    throw new Error('Quiz choices must be unique.');
  }
  if (question.answerIndex < 0 || question.answerIndex >= question.choices.length) {
    throw new Error('Answer index out of bounds.');
  }
};

export const pickModeFromDifficulty = (
  difficulty: QuizDifficulty,
  random: () => number
): QuizGenerationMode => {
  if (difficulty === 'easy') {
    return random() < 0.7 ? 'manual' : 'mixed';
  }
  if (difficulty === 'hard') {
    return random() < 0.6 ? 'auto' : 'mixed';
  }
  return 'mixed';
};
