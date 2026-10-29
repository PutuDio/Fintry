import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";
import {
  TrendingUp,
  Sparkles,
  Building2,
  CreditCard,
  Send,
  CheckCircle2,
} from "lucide-react";

export default async function HomePage() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0B1F3B] text-[#F2F5F8] selection:bg-[#00E5A2] selection:text-[#0B1F3B]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#2F5D8C]/50 bg-[#0B1F3B]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <img src="/Icon.svg" alt="Fintry" className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight text-[#F2F5F8]">
              Fintry
            </span>
            <span className="rounded-full border border-[#00E5A2]/30 bg-[#00E5A2]/10 px-2 py-0.5 text-[10px] font-semibold text-[#00E5A2]">
              v1.2
            </span>
          </div>


          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-[#C9D6E5] transition hover:text-[#F2F5F8]"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[#00E5A2] px-4 py-2 text-sm font-semibold text-[#0B1F3B] shadow-sm transition hover:bg-[#00E5A2]/90"
            >
              Daftar Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-20 sm:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2F5D8C] bg-[#123A63]/60 px-3.5 py-1.5 text-xs font-medium text-[#C9D6E5] backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#00E5A2]" />
              <span>Rilis Terbaru Fintry v1.2</span>
              <span className="h-1 w-1 rounded-full bg-[#00E5A2]" />
              <span className="text-[#00E5A2] font-semibold">Ledger Navy Edition</span>
            </div>

            {/* Headline */}
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#F2F5F8] sm:text-6xl sm:leading-tight">
              Kelola Finansial Pribadi Semudah{" "}
              <span className="bg-gradient-to-r from-[#00E5A2] to-[#38BDF8] bg-clip-text text-transparent">
                Mengirim Pesan Chat
              </span>
            </h1>

            {/* Description */}
            <p className="mt-5 text-base text-[#C9D6E5] sm:text-lg sm:leading-relaxed">
              Catat mutasi kas, pantau aset perbankan & investasi, serta analisa pola
              pengeluaran lewat percakapan bahasa alami dengan financial engine deterministik
              tanpa halusinasi.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href="/register"
                className="w-full rounded-xl bg-[#00E5A2] px-6 py-3.5 text-center text-sm font-semibold text-[#0B1F3B] shadow-lg shadow-[#00E5A2]/20 transition hover:bg-[#00E5A2]/90 sm:w-auto"
              >
                Mulai Kelola Keuangan Sekarang →
              </Link>
              <Link
                href="/login"
                className="w-full rounded-xl border border-[#2F5D8C] bg-[#123A63]/80 px-6 py-3.5 text-center text-sm font-medium text-[#F2F5F8] transition hover:bg-[#163252] sm:w-auto"
              >
                Masuk ke Dashboard
              </Link>
            </div>

            {/* Trust Highlights */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#C9D6E5]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#00E5A2]" />
                Enkripsi Data Pengguna Terisolasi
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#00E5A2]" />
                Mesin Kalkulasi Deterministik
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#00E5A2]" />
                Audit Trail & Riwayat Append-Only
              </span>
            </div>
          </div>

          {/* Realistic Laptop Mockup Section */}
          <div id="mockup" className="relative mx-auto mt-16 max-w-5xl">
            {/* Glow effect behind laptop */}
            <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-b from-[#00E5A2]/20 via-[#38BDF8]/10 to-transparent blur-2xl opacity-60" />

            {/* Laptop Body Outer Container */}
            <div className="relative mx-auto w-full">
              {/* Laptop Display Lid */}
              <div className="relative rounded-t-2xl border-4 border-[#2F5D8C] bg-[#091528] p-2.5 sm:p-3 shadow-2xl">
                {/* Camera dot & sensor */}
                <div className="absolute top-1.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1b3453]" />
                  <span className="h-1 w-1 rounded-full bg-[#00E5A2]/80" />
                </div>

                {/* Laptop Inner Screen */}
                <div className="overflow-hidden rounded-lg border border-[#2F5D8C]/60 bg-[#0B1F3B] text-left text-xs text-[#F2F5F8]">
                  {/* Screen Header Bar */}
                  <div className="flex items-center justify-between border-b border-[#2F5D8C]/80 bg-[#123A63] px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <img src="/Icon.svg" alt="Fintry" className="h-5 w-5" />
                      <span className="font-bold text-xs tracking-tight text-[#F2F5F8]">
                        Fintry Dashboard
                      </span>
                      <span className="rounded bg-[#0B1F3B] px-1.5 py-0.5 text-[9px] font-semibold text-[#00E5A2]">
                        v1.2 Active
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-[#C9D6E5]">
                      <span className="hidden sm:inline">Dio — Sesi Aktif</span>
                      <div className="h-5 w-5 rounded-full bg-[#0B1F3B] border border-[#2F5D8C] flex items-center justify-center text-[10px] font-bold text-[#00E5A2]">
                        D
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Mockup Content */}
                  <div className="space-y-3.5 p-3.5 sm:p-4 bg-[#0B1F3B]">
                    {/* Metrics Row */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
                      <div className="rounded-lg border border-[#2F5D8C] bg-[#123A63] p-2.5">
                        <span className="text-[10px] uppercase tracking-wider text-[#C9D6E5]">
                          Kekayaan Bersih
                        </span>
                        <p className="mt-1 font-mono text-xs font-bold text-[#00E5A2] sm:text-sm">
                          Rp 142.500.000
                        </p>
                      </div>

                      <div className="rounded-lg border border-[#2F5D8C] bg-[#123A63] p-2.5">
                        <span className="text-[10px] uppercase tracking-wider text-[#C9D6E5]">
                          Pemasukan Bulan Ini
                        </span>
                        <p className="mt-1 font-mono text-xs font-bold text-[#F2F5F8] sm:text-sm">
                          Rp 28.500.000
                        </p>
                      </div>

                      <div className="rounded-lg border border-[#2F5D8C] bg-[#123A63] p-2.5">
                        <span className="text-[10px] uppercase tracking-wider text-[#C9D6E5]">
                          Pengeluaran Bulan Ini
                        </span>
                        <p className="mt-1 font-mono text-xs font-bold text-[#FF4B72] sm:text-sm">
                          Rp 9.850.000
                        </p>
                      </div>

                      <div className="rounded-lg border border-[#2F5D8C] bg-[#123A63] p-2.5">
                        <span className="text-[10px] uppercase tracking-wider text-[#C9D6E5]">
                          Arus Kas Bersih
                        </span>
                        <p className="mt-1 font-mono text-xs font-bold text-[#38BDF8] sm:text-sm">
                          +Rp 18.650.000
                        </p>
                      </div>
                    </div>

                    {/* Chat Assistant Bar */}
                    <div className="rounded-lg border border-[#2F5D8C] bg-[#123A63] p-2.5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#00E5A2] shrink-0" />
                        <div className="flex-1 rounded-md border border-[#2F5D8C] bg-[#0B1F3B] px-2.5 py-1.5 font-sans text-[11px] text-[#F2F5F8]">
                          gaji masuk 18jt di bca, beli reksadana 5jt dari mandiri
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#00E5A2] text-[#0B1F3B]">
                          <Send className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* 2-Column Side-by-Side: Akun & Saldo (left) vs Transaksi Terakhir (right) */}
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {/* Left: Akun & Saldo */}
                      <div className="rounded-lg border border-[#2F5D8C] bg-[#123A63] p-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[#2F5D8C]">
                          <span className="font-semibold text-xs text-[#F2F5F8]">
                            Akun & Saldo Aktif
                          </span>
                          <span className="text-[10px] text-[#00E5A2] font-medium">
                            4 Akun Terdaftar
                          </span>
                        </div>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between rounded border border-[#2F5D8C]/50 bg-[#0B1F3B] px-2.5 py-1.5">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-[#38BDF8]" />
                              <div>
                                <p className="font-medium text-[11px] text-[#F2F5F8]">
                                  BCA Utama
                                </p>
                                <span className="text-[9px] text-[#C9D6E5]">Bank</span>
                              </div>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-[#F2F5F8]">
                              Rp 45.250.000
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded border border-[#2F5D8C]/50 bg-[#0B1F3B] px-2.5 py-1.5">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-3.5 w-3.5 text-[#A855F7]" />
                              <div>
                                <p className="font-medium text-[11px] text-[#F2F5F8]">
                                  Bibit Reksadana
                                </p>
                                <span className="text-[9px] text-[#C9D6E5]">Investasi</span>
                              </div>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-[#A855F7]">
                              Rp 82.000.000
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded border border-[#2F5D8C]/50 bg-[#0B1F3B] px-2.5 py-1.5">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-3.5 w-3.5 text-[#00E5A2]" />
                              <div>
                                <p className="font-medium text-[11px] text-[#F2F5F8]">
                                  GoPay / Dana
                                </p>
                                <span className="text-[9px] text-[#C9D6E5]">E-Wallet</span>
                              </div>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-[#F2F5F8]">
                              Rp 3.250.000
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Transaksi Terakhir */}
                      <div className="rounded-lg border border-[#2F5D8C] bg-[#123A63] p-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[#2F5D8C]">
                          <span className="font-semibold text-xs text-[#F2F5F8]">
                            Transaksi Terakhir
                          </span>
                          <span className="text-[10px] text-[#C9D6E5]">Real-time Sync</span>
                        </div>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between rounded border border-[#2F5D8C]/50 bg-[#0B1F3B] px-2.5 py-1.5">
                            <div>
                              <p className="font-medium text-[11px] text-[#F2F5F8]">
                                Gaji Bulanan PT Tech
                              </p>
                              <span className="text-[9px] text-[#C9D6E5]">
                                Hari ini · Masuk ke BCA
                              </span>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-[#00E5A2]">
                              +Rp 18.000.000
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded border border-[#2F5D8C]/50 bg-[#0B1F3B] px-2.5 py-1.5">
                            <div>
                              <p className="font-medium text-[11px] text-[#F2F5F8]">
                                Belanja Kebutuhan Bulanan
                              </p>
                              <span className="text-[9px] text-[#C9D6E5]">
                                Kemarin · Keluar dari GoPay
                              </span>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-[#FF4B72]">
                              -Rp 850.000
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded border border-[#2F5D8C]/50 bg-[#0B1F3B] px-2.5 py-1.5">
                            <div>
                              <p className="font-medium text-[11px] text-[#F2F5F8]">
                                Beli Reksa Dana Saham
                              </p>
                              <span className="text-[9px] text-[#C9D6E5]">
                                Kemarin · Transfer Mandiri → Bibit
                              </span>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-[#38BDF8]">
                              Rp 5.000.000
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Laptop Keyboard Deck & Base */}
              <div className="relative mx-auto -mt-0.5 h-4 sm:h-5 w-[104%] -left-[2%] rounded-b-xl border-t-2 border-[#1e4875] bg-gradient-to-r from-[#173357] via-[#214b7c] to-[#173357] shadow-xl">
                {/* Thumb opening notch */}
                <div className="absolute top-0 left-1/2 h-1.5 w-20 -translate-x-1/2 rounded-b-md bg-[#091528]/80" />
              </div>
              {/* Table shadow underneath */}
              <div className="mx-auto mt-1 h-3 w-[90%] rounded-full bg-black/40 blur-md" />
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-[#2F5D8C]/60 bg-[#0B1F3B] py-8 text-center text-xs text-[#C9D6E5]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/Icon.svg" alt="Fintry" className="h-5 w-5" />
            <span className="font-bold text-[#F2F5F8]">Fintry v1.2</span>
            <span>— Ledger Navy Architecture</span>
          </div>
          <p>© 2026 Fintry. Hak cipta dilindungi.</p>
        </div>
      </footer>
    </div>
  );
}
