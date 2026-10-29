"use client";

import { useState } from "react";
import { Terminal, Send } from "lucide-react";
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
      setResponse(`Error: ${err instanceof Error ? err.message : "Terjadi kesalahan"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Terminal className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9D6E5]" />
          <input
            aria-label="Pesan transaksi"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder='Contoh: "beli kopi 25rb pake BCA" atau "gaji 5jt masuk ke Mandiri"'
            disabled={loading}
            className="w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] py-2.5 pl-10 pr-3.5 font-mono text-sm text-[#F2F5F8] placeholder-zinc-500 focus:border-[#00E5A2] focus:outline-none disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#00E5A2] px-4 py-2.5 text-sm font-semibold text-[#0B1F3B] transition hover:bg-[#00E5A2]/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          <span>{loading ? "Memproses..." : "Kirim"}</span>
        </button>
      </form>

      <p className="text-xs text-[#C9D6E5]">
        Instruksi natural: Sebut <strong>aktivitas</strong> (beli/bayar/gaji/transfer), <strong>nominal</strong> (25rb/5jt), dan <strong>akun</strong> (BCA/GoPay).
      </p>

      {response && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-[#2F5D8C] bg-[#163252] p-3.5 font-mono text-xs text-[#F2F5F8]"
        >
          {response}
        </div>
      )}
    </div>
  );
}
