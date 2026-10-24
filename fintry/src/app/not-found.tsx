import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center dark:bg-zinc-950">
      <div className="max-w-md space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          404
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Halaman tidak ditemukan
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Alamat yang Anda tuju tidak tersedia.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Ke Dashboard
        </Link>
      </div>
    </div>
  );
}
