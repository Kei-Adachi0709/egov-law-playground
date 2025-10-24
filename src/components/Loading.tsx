export const Loading = () => {
  return (
    <div className="flex items-center justify-center py-10" role="status" aria-live="polite">
      <svg
        className="h-6 w-6 animate-spin text-primary"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <span className="ml-3 text-sm font-medium text-slate-600 dark:text-slate-300">Loading...</span>
    </div>
  );
};
