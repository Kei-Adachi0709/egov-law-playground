import type { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  heading: string;
  description?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ heading, description, actionLabel, onAction }: EmptyStateProps) => {
  return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-300 px-8 py-12 text-center dark:border-slate-600"
        role="status"
        aria-live="polite"
      >
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{heading}</h3>
        {description && (
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
        )}
      {actionLabel && (
        <Button variant="primary" onClick={onAction} className="px-6">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
