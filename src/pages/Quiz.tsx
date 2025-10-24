import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { fetchQuizDeck } from '../lib/api/client';
import type { QuizQuestion } from '../types';

type QuizStatus = 'idle' | 'loading' | 'answered';

export const QuizPage = () => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [status, setStatus] = useState<QuizStatus>('loading');

  const loadDeck = useCallback(async () => {
    setStatus('loading');
    const deck = await fetchQuizDeck();
    setQuestions(deck);
    setCurrentIndex(0);
    setSelectedChoice(null);
    setStatus('idle');
  }, []);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  const currentQuestion = questions[currentIndex];
  const isCorrect = useMemo(() => {
    if (selectedChoice === null || !currentQuestion) {
      return null;
    }
    return selectedChoice === currentQuestion.answerIndex;
  }, [currentQuestion, selectedChoice]);

  const hasMoreQuestions = currentIndex < questions.length - 1;

  const handleAnswer = (index: number) => {
    setSelectedChoice(index);
    setStatus('answered');
  };

  const handleNext = () => {
    if (hasMoreQuestions) {
      setCurrentIndex((prevIndex: number) => prevIndex + 1);
      setSelectedChoice(null);
      setStatus('idle');
    } else {
      void loadDeck();
    }
  };

  if (status === 'loading') {
    return <Loading />;
  }

  if (!currentQuestion) {
    return (
      <EmptyState
        heading="クイズの読み込みに失敗しました"
        description="ネットワーク状況を確認し、再読み込みしてください。"
        actionLabel="再試行"
        onAction={() => {
          void loadDeck();
        }}
      />
    );
  }

  return (
    <Card
      title={`問題 ${currentIndex + 1} / ${questions.length}`}
      actions={
        <Button onClick={handleNext} disabled={status !== 'answered'}>
          {hasMoreQuestions ? '次の問題へ' : 'もう一度'}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {currentQuestion.prompt}
        </p>
        <ol className="space-y-3">
          {currentQuestion.choices.map((choice: string, index: number) => {
            const isSelected = selectedChoice === index;
            const showFeedback = status === 'answered';
            const isAnswer = index === currentQuestion.answerIndex;
            const background = showFeedback
              ? isAnswer
                ? 'bg-green-500/10 border-green-500 text-green-700 dark:text-green-300'
                : isSelected
                  ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-300'
                  : 'bg-transparent'
              : isSelected
                ? 'bg-primary/10 border-primary'
                : 'bg-transparent';

            return (
              <li
                key={choice}
                className={`rounded-lg border px-4 py-3 transition ${background}`}
              >
                <button
                  type="button"
                  onClick={() => handleAnswer(index)}
                  disabled={status === 'answered'}
                  className="flex w-full justify-between text-left text-sm font-medium"
                >
                  <span>{choice}</span>
                  {showFeedback && isAnswer && <span>O</span>}
                  {showFeedback && isSelected && !isAnswer && <span>X</span>}
                </button>
              </li>
            );
          })}
        </ol>
        {status === 'answered' && isCorrect !== null && (
          <p className={`text-sm font-medium ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
            {isCorrect ? '正解です!' : '残念、不正解です。'}
          </p>
        )}
      </div>
    </Card>
  );
};
