import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";

export default async function HomePage() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center dark:bg-zinc-950 sm:px-6">
      <div className="max-w-md space-y-6">
        <div className="inline-block rounded-full bg-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          Fintry v0.1 MVP
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Kelola Keuangan Pribadi via Chat
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400">
          Catat pemasukan, pengeluaran, transfer, dan portofolio investasi Anda
          secara natural dalam hitungan detik.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Daftar Akun
          </Link>
        </div>
      </div>
    </div>
  );
}
