import type { PropsWithChildren, ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export const Card = ({ title, actions, className = '', children }: PropsWithChildren<CardProps>) => {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          {actions}
        </header>
      )}
      <div className="px-6 py-5 text-slate-700 dark:text-slate-200">{children}</div>
    </section>
  );
};
