import type { ReactNode } from 'react';

interface ResultListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  empty?: ReactNode;
}

export const ResultList = <T,>({ items, renderItem, empty }: ResultListProps<T>) => {
  if (!items.length) {
    return <>{empty}</>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item: T, index: number) => (
        <li key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
};
