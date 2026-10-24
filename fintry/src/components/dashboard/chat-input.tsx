"use client";

import { useState } from "react";
import { sendChatMessageAction } from "@/app/dashboard/actions";

export function ChatInput() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setResponse(null);

    try {
      const res = await sendChatMessageAction(message.trim());
      setResponse(res.message);
      if (res.success) {
        setMessage("");
      }
    } catch (err) {
      setResponse(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          aria-label="Pesan transaksi"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder='Contoh: "beli kopi 25rb pake BCA" atau "gaji 5jt masuk ke BCA"'
          disabled={loading}
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Memproses..." : "Kirim"}
        </button>
      </form>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Tulis transaksi dengan bebas. Yang penting: <strong>jenis</strong> (beli/gaji/transfer), <strong>nominal</strong> (25rb/5jt), dan <strong>akun</strong> (BCA/GoPay).
      </p>

      {response && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {response}
        </div>
      )}
    </div>
  );
}
