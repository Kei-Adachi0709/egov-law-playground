import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

import type { QuizDifficulty, QuizQuestion } from '../types';

export type QuizCardStatus = 'idle' | 'correct' | 'incorrect';

interface QuizCardProps {
  question: QuizQuestion;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  status: QuizCardStatus;
  reveal: boolean;
  disableInteraction?: boolean;
  keyboardHints?: boolean;
  progressLabel?: string;
  difficulty?: QuizDifficulty;
}

const difficultyStyles: Record<QuizDifficulty, string> = {
  easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300',
  hard: 'bg-amber-100 text-amber-700 dark:bg-amber-800/40 dark:text-amber-300'
};

const statusVariants = {
  idle: { scale: 1, x: 0 },
  correct: { scale: [1, 1.05, 1], x: 0, transition: { duration: 0.45, ease: 'easeOut' } },
  incorrect: {
    scale: 1,
    x: [0, -12, 12, -8, 8, 0],
    transition: { duration: 0.5, ease: 'easeOut' }
  }
};

const highlightMaskedText = (text: string | undefined): Array<{ key: string; text: string; masked: boolean }> => {
  if (!text) {
    return [];
  }
  const parts = text.split('[ 〇〇 ]');
  const result: Array<{ key: string; text: string; masked: boolean }> = [];
  parts.forEach((part, index) => {
    if (part) {
      result.push({ key: `segment-${index}-content`, text: part, masked: false });
    }
    if (index < parts.length - 1) {
      result.push({ key: `segment-${index}-mask`, text: '[ 〇〇 ]', masked: true });
    }
  });
  return result;
};

const getChoiceTone = (
  reveal: boolean,
  answerIndex: number,
  index: number,
  isSelected: boolean
): string => {
  if (!reveal) {
    return isSelected
      ? 'border-primary bg-primary/10 text-slate-900 dark:text-slate-100'
      : 'border-slate-200 hover:border-primary dark:border-slate-700';
  }
  if (index === answerIndex) {
    return 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  if (isSelected && index !== answerIndex) {
    return 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-300';
  }
  return 'border-slate-200 dark:border-slate-700';
};

const KEY_HINTS = ['1', '2', '3', '4'] as const;

const feedbackCopy = (status: QuizCardStatus, question: QuizQuestion): string | null => {
  if (status === 'correct') {
    return '正解です！よくできました。';
  }
  if (status === 'incorrect') {
    const blanks = question.blanks?.join('／');
    return blanks ? `残念！正解は ${blanks} です。` : '残念！もう一度挑戦してみましょう。';
  }
  return null;
};

export const QuizCard = memo(
  ({
    question,
    selectedIndex,
    onSelect,
    status,
    reveal,
    disableInteraction = false,
    keyboardHints = true,
    progressLabel,
    difficulty
  }: QuizCardProps) => {
    const maskedSegments = useMemo(() => highlightMaskedText(question.maskedText), [question.maskedText]);
    const feedback = feedbackCopy(status, question);
    const appliedDifficulty = difficulty ?? question.metadata?.difficulty ?? 'normal';

    return (
      <motion.article
        className="flex h-full flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        variants={statusVariants}
        animate={status}
        transition={{ type: 'spring', damping: 14, stiffness: 140 }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {progressLabel && (
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {progressLabel}
              </span>
            )}
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{question.prompt}</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {question.metadata?.category && (
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-700/60 dark:text-slate-200">
                {question.metadata.category}
              </span>
            )}
            <span className={`rounded-full px-3 py-1 font-semibold ${difficultyStyles[appliedDifficulty]}`}>
              {appliedDifficulty === 'easy' ? '初級' : appliedDifficulty === 'hard' ? '上級' : '標準'}
            </span>
          </div>
        </div>

        {maskedSegments.length > 0 ? (
          <p className="rounded-lg bg-slate-100/70 p-4 text-base leading-relaxed text-slate-800 dark:bg-slate-800/40 dark:text-slate-200">
            {maskedSegments.map((segment) =>
              segment.masked ? (
                <span
                  key={segment.key}
                  className="mx-1 inline-flex items-center rounded-md bg-amber-200 px-2 py-0.5 text-sm font-semibold text-amber-800 dark:bg-amber-500/30 dark:text-amber-200"
                >
                  {segment.text}
                </span>
              ) : (
                <span key={segment.key}>{segment.text}</span>
              )
            )}
          </p>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">
            選択肢の中から最も適切なものを選択してください。
          </p>
        )}

        <ul className="grid gap-3">
          {question.choices.map((choice, index) => {
            const isSelected = selectedIndex === index;
            const tone = getChoiceTone(reveal, question.answerIndex, index, isSelected);
            return (
              <li key={choice}>
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  disabled={disableInteraction || reveal}
                  className={`group flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${tone}`}
                >
                  <span className="flex items-center gap-3">
                    {keyboardHints && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 text-xs font-semibold text-slate-500 shadow-inner dark:border-slate-600 dark:text-slate-300">
                        {KEY_HINTS[index]}
                      </span>
                    )}
                    <span>{choice}</span>
                  </span>
                  {reveal && index === question.answerIndex && (
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-300">✔</span>
                  )}
                  {reveal && isSelected && index !== question.answerIndex && (
                    <span className="text-sm font-bold text-rose-500 dark:text-rose-300">✖</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {feedback && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-semibold ${
              status === 'correct'
                ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-200'
            }`}
          >
            {feedback}
          </div>
        )}

        {question.explanation && reveal && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            {question.explanation}
          </div>
        )}

        {question.metadata?.sourceUrl && (
          <div className="flex items-center justify-between rounded-lg bg-slate-100/70 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/40 dark:text-slate-300">
            <span>
              {question.metadata.lawName}
              {question.metadata.articleNumber ? `／${question.metadata.articleNumber}` : ''}
            </span>
            <a
              href={question.metadata.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-md border border-primary/20 px-3 font-semibold text-primary transition hover:bg-primary/10"
            >
              原文を開く
            </a>
          </div>
        )}
      </motion.article>
    );
  }
);

QuizCard.displayName = 'QuizCard';
