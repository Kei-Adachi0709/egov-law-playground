import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { QuizCard } from '../components/QuizCard';
import type { QuizDifficulty } from '../types';
import { QUIZ_CATEGORIES, type QuizCategory } from '../lib/utils/quizBank';
import {
  ensureValidQuestion,
  generateQuizQuestion,
  pickModeFromDifficulty,
  type QuizGenerationMode
} from '../lib/utils/quizGenerator';
import { useQuizStore } from '../store/quizStore';

type QuizPhase = 'config' | 'loading' | 'answering' | 'revealed' | 'error';

const MODE_LABELS: Record<QuizGenerationMode, string> = {
  manual: 'プリセット',
  auto: '自動生成',
  mixed: 'ミックス'
};

const SCORE_BASE: Record<QuizDifficulty, number> = {
  easy: 8,
  normal: 12,
  hard: 18
};

const KEYBOARD_MAP: Record<string, number> = {
  1: 0,
  2: 1,
  3: 2,
  4: 3
};

const formatElapsed = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const computeScoreDelta = (correct: boolean, difficulty: QuizDifficulty, elapsedMs?: number): number => {
  if (!correct) {
    return 0;
  }
  const base = SCORE_BASE[difficulty];
  if (!elapsedMs || elapsedMs <= 0) {
    return base;
  }
  const bonus = Math.max(0, 4 - Math.floor(elapsedMs / 15000));
  return base + bonus;
};

export const QuizPage = () => {
  const score = useQuizStore((state) => state.score);
  const streak = useQuizStore((state) => state.streak);
  const bestStreak = useQuizStore((state) => state.bestStreak);
  const weakWords = useQuizStore((state) => state.weakWords);
  const difficulty = useQuizStore((state) => state.difficulty);
  const setDifficulty = useQuizStore((state) => state.setDifficulty);
  const currentQuestion = useQuizStore((state) => state.currentQuestion);
  const setQuestion = useQuizStore((state) => state.setQuestion);
  const submitAnswer = useQuizStore((state) => state.submitAnswer);
  const clearWeakWords = useQuizStore((state) => state.clearWeakWords);

  const [phase, setPhase] = useState<QuizPhase>('config');
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory | null>(null);
  const [baseMode, setBaseMode] = useState<QuizGenerationMode>('mixed');
  const [activeMode, setActiveMode] = useState<QuizGenerationMode>('mixed');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(true);

  const [configCategory, setConfigCategory] = useState<QuizCategory>(QUIZ_CATEGORIES[0]);
  const [configDifficulty, setConfigDifficulty] = useState<QuizDifficulty>(difficulty);
  const [configMode, setConfigMode] = useState<QuizGenerationMode>('mixed');

  const timerStartRef = useRef<number | null>(null);
  const timerHandleRef = useRef<number | null>(null);

  useEffect(() => {
    setConfigDifficulty(difficulty);
  }, [difficulty]);

  useEffect(() => {
    return () => {
      if (timerHandleRef.current) {
        window.clearInterval(timerHandleRef.current);
      }
    };
  }, []);

  const stopTimer = useCallback((): number | undefined => {
    let finalElapsed: number | undefined;
    if (timerHandleRef.current) {
      window.clearInterval(timerHandleRef.current);
      timerHandleRef.current = null;
    }
    if (timerStartRef.current !== null) {
      finalElapsed = Math.max(0, Math.round(performance.now() - timerStartRef.current));
      setElapsedMs(finalElapsed);
      timerStartRef.current = null;
    }
    return finalElapsed;
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerStartRef.current = performance.now();
    setElapsedMs(0);
    timerHandleRef.current = window.setInterval(() => {
      if (timerStartRef.current !== null) {
        setElapsedMs(Math.max(0, Math.round(performance.now() - timerStartRef.current)));
      }
    }, 200);
  }, [stopTimer]);

  const resolvedCategory = selectedCategory ?? configCategory;

  const loadQuestion = useCallback(
    async (
      overrides?: {
        category: QuizCategory;
        difficulty: QuizDifficulty;
        baseMode: QuizGenerationMode;
      }
    ) => {
  const targetCategory = overrides?.category ?? resolvedCategory;
  const targetDifficulty = overrides?.difficulty ?? difficulty;
      const targetBaseMode = overrides?.baseMode ?? baseMode;

      if (!targetCategory) {
        setPhase('config');
        setShowConfig(true);
        return;
      }

      setPhase('loading');
      setErrorMessage(null);

      try {
        const modeToUse =
          targetBaseMode === 'mixed'
            ? pickModeFromDifficulty(targetDifficulty, Math.random)
            : targetBaseMode;
        const question = await generateQuizQuestion({
          category: targetCategory,
          difficulty: targetDifficulty,
          mode: modeToUse
        });
        ensureValidQuestion(question);
        setQuestion(question);
        setSelectedIndex(null);
        setQuestionNumber((prev) => prev + 1);
        setSelectedCategory(targetCategory);
        setActiveMode(modeToUse);
        startTimer();
        setPhase('answering');
      } catch (error) {
        stopTimer();
        setPhase('error');
        setErrorMessage(
          error instanceof Error ? error.message : '問題の生成に失敗しました。再度お試しください。'
        );
      }
    },
    [resolvedCategory, difficulty, baseMode, setQuestion, startTimer, stopTimer]
  );

  const handleSubmitConfig = useCallback(() => {
    if (!configCategory) {
      return;
    }
    setDifficulty(configDifficulty);
    setBaseMode(configMode);
    setShowConfig(false);
    setQuestionNumber(0);
    void loadQuestion({
      category: configCategory,
      difficulty: configDifficulty,
      baseMode: configMode
    });
  }, [configCategory, configDifficulty, configMode, setDifficulty, loadQuestion]);

  const isCorrect = useMemo(() => {
    if (selectedIndex === null || !currentQuestion) {
      return null;
    }
    return selectedIndex === currentQuestion.answerIndex;
  }, [currentQuestion, selectedIndex]);

  const handleSelectChoice = useCallback(
    (index: number) => {
      if (!currentQuestion || phase !== 'answering') {
        return;
      }
  setSelectedIndex(index);
  const elapsed = stopTimer() ?? elapsedMs;
      const correct = index === currentQuestion.answerIndex;
      const blanks = currentQuestion.blanks ?? [];
      const weakWordsPayload = correct ? [] : [...blanks];
      submitAnswer({
        correct,
        weakWords: weakWordsPayload,
        scoreDelta: computeScoreDelta(correct, difficulty, elapsed),
        elapsedMs: elapsed,
        difficulty,
        category: currentQuestion.metadata?.category ?? selectedCategory ?? undefined,
        questionId: currentQuestion.id,
        choiceIndex: index
      });
      setPhase('revealed');
    },
    [
      currentQuestion,
      difficulty,
      elapsedMs,
      phase,
      selectedCategory,
      stopTimer,
      submitAnswer
    ]
  );

  const handleNextQuestion = useCallback(() => {
    void loadQuestion();
  }, [loadQuestion]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (phase === 'answering' && event.key in KEYBOARD_MAP) {
        event.preventDefault();
        handleSelectChoice(KEYBOARD_MAP[event.key]);
        return;
      }
      if (phase === 'revealed' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        handleNextQuestion();
      }
      if (event.key === 'Escape') {
        setShowConfig(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNextQuestion, handleSelectChoice, phase]);

  const renderConfigDialog = () => (
    <AnimatePresence>
      {showConfig && (
        <motion.div
          className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/60 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">クイズ設定</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              カテゴリと難易度、生成モードを選択してクイズを開始してください。
            </p>

            <div className="mt-6 space-y-5 text-sm">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  カテゴリ
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {QUIZ_CATEGORIES.map((category) => {
                    const active = configCategory === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setConfigCategory(category)}
                        className={`rounded-xl border px-3 py-2 font-semibold transition ${
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 hover:border-primary dark:border-slate-700'
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  難易度
                </h3>
                <div className="mt-3 flex gap-3">
                  {(['easy', 'normal', 'hard'] as QuizDifficulty[]).map((level) => {
                    const labels: Record<QuizDifficulty, string> = {
                      easy: '初級',
                      normal: '標準',
                      hard: '上級'
                    };
                    const active = configDifficulty === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setConfigDifficulty(level)}
                        className={`rounded-xl border px-3 py-2 font-semibold transition ${
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 hover:border-primary dark:border-slate-700'
                        }`}
                      >
                        {labels[level]}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  生成モード
                </h3>
                <div className="mt-3 flex gap-3">
                  {(['manual', 'auto', 'mixed'] as QuizGenerationMode[]).map((mode) => {
                    const active = configMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setConfigMode(mode)}
                        className={`rounded-xl border px-3 py-2 font-semibold transition ${
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 hover:border-primary dark:border-slate-700'
                        }`}
                      >
                        {MODE_LABELS[mode]}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowConfig(false)}>
                閉じる
              </Button>
              <Button onClick={handleSubmitConfig}>クイズ開始</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderContent = () => {
    if (phase === 'loading') {
      return <Loading />;
    }

    if (phase === 'error') {
      return (
        <EmptyState
          heading="問題の生成に失敗しました"
          description={errorMessage ?? '時間をおいてから再度お試しください。'}
          actionLabel="再試行"
          onAction={() => void loadQuestion()}
        />
      );
    }

    if (!currentQuestion) {
      return (
        <EmptyState
          heading="クイズを開始するには設定が必要です"
          actionLabel="設定する"
          onAction={() => setShowConfig(true)}
        />
      );
    }

    const status: 'idle' | 'correct' | 'incorrect' =
      phase === 'revealed'
        ? isCorrect
          ? 'correct'
          : 'incorrect'
        : 'idle';

    return (
      <div className="space-y-6">
        <QuizCard
          question={currentQuestion}
          selectedIndex={selectedIndex}
          onSelect={handleSelectChoice}
          status={status}
          reveal={phase === 'revealed'}
          disableInteraction={phase !== 'answering'}
          keyboardHints
          progressLabel={`問題 ${questionNumber}`}
          difficulty={difficulty}
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowConfig(true)}>
              設定を変更
            </Button>
            <Button variant="ghost" onClick={() => void loadQuestion()}>問題を更新</Button>
          </div>
          <Button onClick={handleNextQuestion} disabled={phase !== 'revealed'}>
            次の問題へ
          </Button>
        </div>
      </div>
    );
  };

  const categoryLabel = selectedCategory ?? configCategory;

  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-6">
      {renderConfigDialog()}

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="スコア" className="md:col-span-1">
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{score}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">累積ポイント</p>
        </Card>
        <Card title="連続正解" className="md:col-span-1">
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{streak}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">現在の連続記録</p>
        </Card>
        <Card title="ベスト" className="md:col-span-1">
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{bestStreak}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">最高連続正解</p>
        </Card>
        <Card title="タイム" className="md:col-span-1">
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{formatElapsed(elapsedMs)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">経過時間</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-300">
        {categoryLabel && <span>カテゴリ: {categoryLabel}</span>}
  <span>難易度: {difficulty === 'easy' ? '初級' : difficulty === 'hard' ? '上級' : '標準'}</span>
        <span>モード: {MODE_LABELS[activeMode]}</span>
      </div>

      {renderContent()}

      {weakWords.length > 0 && (
        <Card
          title="苦手ワード"
          actions={
            <Button variant="ghost" onClick={clearWeakWords}>
              クリア
            </Button>
          }
        >
          <div className="flex flex-wrap gap-2">
            {weakWords.map((word) => (
              <span
                key={word}
                className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600 dark:bg-rose-500/20 dark:text-rose-200"
              >
                {word}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
