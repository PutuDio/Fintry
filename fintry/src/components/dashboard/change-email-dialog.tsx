"use client";

import { useState } from "react";
import { authClient } from "@/infrastructure/auth/client";

interface ChangeEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
}

export function ChangeEmailDialog({ isOpen, onClose, currentEmail }: ChangeEmailDialogProps) {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newEmail === currentEmail) {
      setError("Email baru harus berbeda dengan email saat ini");
      return;
    }

    if (!newEmail.includes("@")) {
      setError("Format email tidak valid");
      return;
    }

    setLoading(true);
    try {
      await authClient.changeEmail({
        newEmail,
        callbackURL: "/dashboard",
      });
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengganti email.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setNewEmail("");
    setError(null);
    setSuccess(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-email-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="change-email-title"
          className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50"
        >
          Ganti Email
        </h2>

        {success ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-300">
              <p className="font-medium">Link verifikasi telah dikirim!</p>
              <p className="mt-2 text-sm">
                Cek email <strong>{newEmail}</strong> dan klik link verifikasi untuk mengaktifkan email baru Anda.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              OK
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="current-email-display" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email Saat Ini
              </label>
              <input
                type="email"
                id="current-email-display"
                value={currentEmail}
                disabled
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
              />
            </div>

            <div>
              <label htmlFor="new-email" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email Baru
              </label>
              <input
                type="email"
                id="new-email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
                autoComplete="email"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Link verifikasi akan dikirim ke email baru
              </p>
            </div>


            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? "Mengirim..." : "Kirim Verifikasi"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
