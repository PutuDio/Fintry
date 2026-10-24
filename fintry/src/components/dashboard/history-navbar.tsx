"use client";

import { useState } from "react";
import Link from "next/link";
import { ProfileDropdown } from "./profile-dropdown";
import { ChangePasswordDialog } from "./change-password-dialog";
import { ChangeEmailDialog } from "./change-email-dialog";

interface HistoryNavbarProps {
  userEmail: string;
}

export function HistoryNavbar({ userEmail }: HistoryNavbarProps) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              ← Dashboard
            </Link>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Riwayat Transaksi
            </span>
          </div>
          <ProfileDropdown
            userEmail={userEmail}
            onChangePassword={() => setShowChangePassword(true)}
            onChangeEmail={() => setShowChangeEmail(true)}
          />
        </div>
      </header>

      <ChangePasswordDialog
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      <ChangeEmailDialog
        isOpen={showChangeEmail}
        onClose={() => setShowChangeEmail(false)}
        currentEmail={userEmail}
      />
    </>
  );
}
