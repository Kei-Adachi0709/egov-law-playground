export const PageSkeleton = () => {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="animate-pulse space-y-4 rounded-2xl bg-slate-100 p-6 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800/60 dark:ring-slate-700/60">
        <div className="h-5 w-2/5 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-3/5 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-1/2 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="animate-pulse space-y-4 rounded-2xl bg-slate-100 p-6 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800/60 dark:ring-slate-700/60">
        <div className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-4/5 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-2/3 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
};
