"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Laptop,
  Mail,
  Lock,
  LogOut,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { authClient } from "@/infrastructure/auth/client";
import type { SessionUser } from "@/infrastructure/auth/session";
import { deleteUserAccountAction } from "@/app/dashboard/actions";

interface ProfileViewProps {
  user: SessionUser;
}

type TabType = "general" | "security" | "sessions";

export function ProfileView({ user }: ProfileViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("general");

  // General tab states
  const [name, setName] = useState(user.name || "");
  const [username, setUsername] = useState(user.username || "");
  const [generalLoading, setGeneralLoading] = useState(false);
  const [generalMessage, setGeneralMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Email change states
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password tab states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Social accounts state
  const [linkedAccounts, setLinkedAccounts] = useState<Array<{ id: string; providerId: string }>>([]);
  const isGoogleLinked = linkedAccounts.some((a) => a.providerId === "google");

  // Sessions tab states
  interface SessionItem {
    id: string;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt: string | Date;
    expiresAt: string | Date;
  }
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Delete user account state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState("");
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  // Load accounts and sessions on mount
  useEffect(() => {
    async function loadData() {
      try {
        const accRes = await authClient.listAccounts();
        if (accRes.data) {
          setLinkedAccounts(accRes.data as Array<{ id: string; providerId: string }>);
        }
      } catch {
        // Ignored in dev/fallback
      }

      try {
        setSessionsLoading(true);
        const sessRes = await authClient.listSessions();
        if (sessRes.data) {
          setSessions(sessRes.data as unknown as SessionItem[]);
        }
      } catch {
        // Ignored in dev/fallback
      } finally {
        setSessionsLoading(false);
      }
    }

    loadData();
  }, []);

  // Update profile handler (name & username)
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setGeneralMessage(null);

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername && (cleanUsername.length < 3 || cleanUsername.length > 30)) {
      setGeneralMessage({ type: "error", text: "Username harus antara 3 - 30 karakter." });
      return;
    }

    if (cleanUsername && !/^[a-z0-9_-]+$/.test(cleanUsername)) {
      setGeneralMessage({ type: "error", text: "Username hanya boleh huruf, angka, underscore (_), atau strip (-)." });
      return;
    }

    setGeneralLoading(true);
    try {
      const res = await authClient.updateUser({
        name: name.trim(),
        username: cleanUsername || undefined,
        displayUsername: username.trim() || undefined,
      });

      if (res.error) {
        setGeneralMessage({ type: "error", text: res.error.message || "Gagal memperbarui profil." });
      } else {
        setGeneralMessage({ type: "success", text: "Profil berhasil diperbarui." });
        router.refresh();
      }
    } catch (err) {
      setGeneralMessage({ type: "error", text: err instanceof Error ? err.message : "Terjadi kesalahan." });
    } finally {
      setGeneralLoading(false);
    }
  }

  // Request change email handler
  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailMessage(null);

    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setEmailMessage({ type: "error", text: "Masukkan alamat email yang valid." });
      return;
    }

    setEmailLoading(true);
    try {
      const res = await authClient.changeEmail({
        newEmail: cleanEmail,
        callbackURL: "/dashboard/profile",
      });

      if (res.error) {
        setEmailMessage({ type: "error", text: res.error.message || "Gagal meminta perubahan email." });
      } else {
        setEmailMessage({
          type: "success",
          text: `Tautan verifikasi telah dikirim ke ${cleanEmail}. Periksa kotak masuk email Anda.`,
        });
        setNewEmail("");
      }
    } catch (err) {
      setEmailMessage({ type: "error", text: err instanceof Error ? err.message : "Terjadi kesalahan." });
    } finally {
      setEmailLoading(false);
    }
  }

  // Change password handler
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "Password baru minimal 8 karakter." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Konfirmasi password baru tidak cocok." });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (res.error) {
        setPasswordMessage({ type: "error", text: res.error.message || "Gagal mengubah password." });
      } else {
        setPasswordMessage({ type: "success", text: "Password berhasil diubah." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setPasswordMessage({ type: "error", text: err instanceof Error ? err.message : "Terjadi kesalahan." });
    } finally {
      setPasswordLoading(false);
    }
  }

  // Revoke session handler
  async function handleRevokeSession(token: string) {
    setSessionMessage(null);
    try {
      const res = await authClient.revokeSession({ token });
      if (res.error) {
        setSessionMessage({ type: "error", text: res.error.message || "Gagal mencabut sesi." });
      } else {
        setSessions((prev) => prev.filter((s) => s.token !== token));
        setSessionMessage({ type: "success", text: "Sesi berhasil dicabut." });
      }
    } catch (err) {
      setSessionMessage({ type: "error", text: err instanceof Error ? err.message : "Terjadi kesalahan." });
    }
  }

  // Logout handler
  async function handleLogout() {
    try {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      setSessionMessage({ type: "error", text: err instanceof Error ? err.message : "Gagal logout." });
    }
  }

  async function handleDeleteUserAccount() {
    if (confirmDeleteInput !== "HAPUS") return;
    setDeleteAccountLoading(true);
    setDeleteAccountError(null);
    try {
      const res = await deleteUserAccountAction();
      if (res.success) {
        try {
          await authClient.signOut();
        } catch {
          // ignored
        }
        window.location.href = "/";
      } else {
        setDeleteAccountError(res.message);
      }
    } catch (err) {
      setDeleteAccountError(err instanceof Error ? err.message : "Gagal menghapus akun pengguna.");
    } finally {
      setDeleteAccountLoading(false);
    }
  }


  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 rounded-xl border border-[#2F5D8C] bg-[#123A63] p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#2F5D8C] bg-[#0B1F3B] text-2xl font-bold text-[#F2F5F8]">
            {(user.username || user.name || user.email)[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F2F5F8]">
              {user.name || user.username || "Pengguna Fintry"}
            </h1>
            <p className="text-sm text-[#C9D6E5]">
              @{user.username || user.email.split("@")[0]} · {user.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 rounded-lg border border-[#FF4B72]/30 bg-[#FF4B72]/10 px-4 py-2 text-sm font-medium text-[#FF4B72] transition hover:bg-[#FF4B72]/20"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-[#2F5D8C]">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "general"
              ? "border-[#00E5A2] text-[#00E5A2]"
              : "border-transparent text-[#C9D6E5] hover:text-[#F2F5F8]"
          }`}
        >
          <User className="h-4 w-4" />
          Profil & Akun
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "security"
              ? "border-[#00E5A2] text-[#00E5A2]"
              : "border-transparent text-[#C9D6E5] hover:text-[#F2F5F8]"
          }`}
        >
          <Shield className="h-4 w-4" />
          Keamanan & Password
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("sessions")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
            activeTab === "sessions"
              ? "border-[#00E5A2] text-[#00E5A2]"
              : "border-transparent text-[#C9D6E5] hover:text-[#F2F5F8]"
          }`}
        >
          <Laptop className="h-4 w-4" />
          Sesi Aktif
        </button>
      </div>

      {/* Tab 1: General Profile */}
      {activeTab === "general" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Form edit profile */}
          <div className="rounded-xl border border-[#2F5D8C] bg-[#123A63] p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#F2F5F8]">
              Informasi Pengguna
            </h2>
            <p className="mt-1 text-xs text-[#C9D6E5]">
              Perbarui nama tampilan dan username unik akun Anda.
            </p>

            {generalMessage && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-sm ${
                  generalMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                }`}
              >
                {generalMessage.type === "success" ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{generalMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#C9D6E5]">
                  Nama Tampilan (Display Name)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3 py-2 text-sm text-[#F2F5F8] placeholder-[#C9D6E5]/40 focus:border-[#00E5A2] focus:outline-none"
                  placeholder="Nama Lengkap Anda"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C9D6E5]">
                  Username Unik
                </label>
                <div className="mt-1 flex rounded-lg border border-[#2F5D8C] bg-[#0B1F3B]">
                  <span className="inline-flex items-center px-3 text-sm text-[#C9D6E5]">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full rounded-r-lg border-0 bg-transparent px-3 py-2 text-sm text-[#F2F5F8] placeholder-[#C9D6E5]/40 focus:outline-none"
                    placeholder="username"
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  3–30 karakter alfanumerik, underscore, atau tanda hubung.
                </p>
              </div>

              <button
                type="submit"
                disabled={generalLoading}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#00E5A2] px-4 py-2 text-sm font-semibold text-[#0B1F3B] transition hover:bg-[#00E5A2]/90 disabled:opacity-50"
              >
                {generalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </button>
            </form>
          </div>

          {/* Form change email */}
          <div className="rounded-xl border border-[#2F5D8C] bg-[#123A63] p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#F2F5F8]">
              Alamat Email
            </h2>
            <p className="mt-1 text-xs text-[#C9D6E5]">
              Email saat ini: <strong className="text-[#F2F5F8]">{user.email}</strong>
            </p>

            {emailMessage && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-sm ${
                  emailMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                }`}
              >
                {emailMessage.type === "success" ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{emailMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangeEmail} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#C9D6E5]">
                  Email Baru
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3 py-2 text-sm text-[#F2F5F8] placeholder-[#C9D6E5]/40 focus:border-[#00E5A2] focus:outline-none"
                  placeholder="emailbaru@domain.com"
                  required
                />
              </div>

              <p className="text-xs text-[#C9D6E5]">
                Tautan konfirmasi verifikasi akan dikirimkan ke email baru Anda untuk konfirmasi keamanan.
              </p>

              <button
                type="submit"
                disabled={emailLoading}
                className="flex items-center justify-center gap-2 rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-4 py-2 text-sm font-medium text-[#C9D6E5] transition hover:bg-[#163252] hover:text-[#F2F5F8] disabled:opacity-50"
              >
                {emailLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Mail className="h-4 w-4" />
                Kirim Tautan Verifikasi Email
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Security & Password */}
      {activeTab === "security" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Change password form */}
          <div className="rounded-xl border border-[#2F5D8C] bg-[#123A63] p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#F2F5F8]">
              Ganti Password
            </h2>
            <p className="mt-1 text-xs text-[#C9D6E5]">
              Amankan akun Anda dengan password yang kuat (minimal 8 karakter).
            </p>

            {passwordMessage && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-sm ${
                  passwordMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                }`}
              >
                {passwordMessage.type === "success" ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#C9D6E5]">
                  Password Saat Ini
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3 py-2 text-sm text-[#F2F5F8] placeholder-[#C9D6E5]/40 focus:border-[#00E5A2] focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C9D6E5]">
                  Password Baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3 py-2 text-sm text-[#F2F5F8] placeholder-[#C9D6E5]/40 focus:border-[#00E5A2] focus:outline-none"
                  placeholder="Minimal 8 karakter"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C9D6E5]">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3 py-2 text-sm text-[#F2F5F8] placeholder-[#C9D6E5]/40 focus:border-[#00E5A2] focus:outline-none"
                  placeholder="Ulangi password baru"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#00E5A2] px-4 py-2 text-sm font-semibold text-[#0B1F3B] transition hover:bg-[#00E5A2]/90 disabled:opacity-50"
              >
                {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Lock className="h-4 w-4" />
                Ubah Password
              </button>
            </form>
          </div>

          {/* Social login / Google OAuth integration */}
          <div className="rounded-xl border border-[#2F5D8C] bg-[#123A63] p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#F2F5F8]">
              Akun Terhubung (Social Login)
            </h2>
            <p className="mt-1 text-xs text-[#C9D6E5]">
              Hubungkan akun eksternal untuk kemudahan akses login satu klik.
            </p>

            <div className="mt-6 divide-y divide-[#2F5D8C]">
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-[#F2F5F8]">
                      Google
                    </p>
                    <p className="text-xs text-[#C9D6E5]">
                      {isGoogleLinked ? "Terhubung ke akun Google Anda" : "Belum dihubungkan"}
                    </p>
                  </div>
                </div>

                {isGoogleLinked ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    Terhubung
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/dashboard/profile" })}
                    className="rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3 py-1.5 text-xs font-medium text-[#C9D6E5] hover:bg-[#163252] hover:text-[#F2F5F8]"
                  >
                    Tautkan Akun
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Active Sessions */}
      {activeTab === "sessions" && (
        <div className="rounded-xl border border-[#2F5D8C] bg-[#123A63] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#F2F5F8]">
                Sesi Perangkat Aktif
              </h2>
              <p className="mt-1 text-xs text-[#C9D6E5]">
                Daftar browser dan perangkat yang sedang masuk dengan akun Anda.
              </p>
            </div>
          </div>

          {sessionMessage && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-sm ${
                sessionMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
              }`}
            >
              {sessionMessage.type === "success" ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{sessionMessage.text}</span>
            </div>
          )}

          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : (
            <div className="mt-6 divide-y divide-[#2F5D8C]">
              {sessions.map((sess) => (
                <div key={sess.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[#0B1F3B] border border-[#2F5D8C] p-2">
                      <Laptop className="h-5 w-5 text-[#38BDF8]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#F2F5F8]">
                        {sess.userAgent?.includes("Mozilla") ? "Web Browser" : sess.userAgent || "Perangkat Tidak Dikenal"}
                      </p>
                      <p className="text-xs text-[#C9D6E5]">
                        IP: {sess.ipAddress || "Lokal / Tersembunyi"} · Aktif sejak{" "}
                        {new Date(sess.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRevokeSession(sess.token)}
                    className="text-xs font-medium text-[#FF4B72] hover:underline"
                  >
                    Cabut Akses
                  </button>
                </div>
              ))}

              {sessions.length === 0 && (
                <p className="py-6 text-center text-sm text-[#C9D6E5]">
                  Tidak ada sesi perangkat lain yang terdeteksi.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Danger Zone: Delete User Account */}
      <div className="rounded-xl border border-[#FF4B72]/40 bg-[#123A63] p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#FF4B72] flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Zona Bahaya: Hapus Akun Pengguna
            </h2>
            <p className="mt-1 text-xs text-[#C9D6E5] leading-relaxed max-w-xl">
              Hapus akun email Anda (<strong className="text-[#F2F5F8]">{user.email}</strong>) beserta seluruh data transaksi,
              kategori, dan mutasi keuangan secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmDeleteInput("");
              setDeleteAccountError(null);
              setIsDeleteModalOpen(true);
            }}
            className="shrink-0 rounded-lg border border-[#FF4B72]/40 bg-[#FF4B72]/10 px-4 py-2.5 text-xs font-semibold text-[#FF4B72] transition hover:bg-[#FF4B72]/20"
          >
            Hapus Akun Saya
          </button>
        </div>
      </div>

      {/* Modal Konfirmasi Hapus Akun */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[#2F5D8C] bg-[#123A63] p-6 shadow-2xl text-[#F2F5F8]">
            <div className="flex items-center gap-3 text-[#FF4B72]">
              <div className="rounded-lg bg-[#FF4B72]/15 p-2.5">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">Hapus Akun Pengguna?</h3>
            </div>

            <p className="mt-3 text-sm text-[#C9D6E5] leading-relaxed">
              Tindakan ini akan menghapus akun <strong className="text-[#F2F5F8]">{user.email}</strong> dan seluruh riwayat mutasi keuangan Anda secara permanen.
            </p>

            <div className="mt-4 rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] p-3 text-xs text-[#C9D6E5] space-y-1">
              <p>• Seluruh akun bank, e-wallet, kas, dan investasi akan dihapus.</p>
              <p>• Seluruh catatan mutasi transaksi dan riwayat audit akan dibersihkan.</p>
              <p>• Sesi login Anda akan langsung dihentikan.</p>
            </div>

            {deleteAccountError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#FF4B72]/15 p-2.5 text-xs text-[#FF4B72]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{deleteAccountError}</span>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-medium text-[#C9D6E5]">
                Ketik <span className="font-bold text-[#FF4B72]">HAPUS</span> untuk konfirmasi:
              </label>
              <input
                type="text"
                value={confirmDeleteInput}
                onChange={(e) => setConfirmDeleteInput(e.target.value)}
                placeholder="HAPUS"
                className="mt-1.5 block w-full rounded-lg border border-[#2F5D8C] bg-[#0B1F3B] px-3 py-2 font-mono text-sm text-[#F2F5F8] placeholder-[#C9D6E5]/30 focus:border-[#FF4B72] focus:outline-none"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteAccountLoading}
                className="rounded-lg border border-[#2F5D8C] px-4 py-2 text-sm font-medium text-[#C9D6E5] hover:bg-[#163252] hover:text-[#F2F5F8]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteUserAccount}
                disabled={confirmDeleteInput !== "HAPUS" || deleteAccountLoading}
                className="flex items-center gap-2 rounded-lg bg-[#FF4B72] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#FF4B72]/90 disabled:opacity-40"
              >
                {deleteAccountLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Hapus Akun Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
