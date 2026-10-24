const SKELETON_ROWS = ["a", "b", "c", "d"];

export default function HistoryLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl animate-pulse space-y-6 px-4 py-8 sm:px-6">
        <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-10 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
        {SKELETON_ROWS.map((key) => (
          <div
            key={key}
            className="h-20 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    </div>
  );
}
