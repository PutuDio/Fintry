import { expect, test } from "@playwright/test";
import { createAsset, registerUser, sendChat, uniqueEmail } from "./helpers";

test("alur utama: buat akun, catat transaksi via chat, dashboard ter-update", async ({ page }) => {
  await registerUser(page, uniqueEmail("alur"));

  await expect(page.getByText("Belum ada akun.")).toBeVisible();

  await createAsset(page, { name: "BCA", type: "Bank", openingBalance: "1000000" });
  await createAsset(page, { name: "GoPay", type: "E-Wallet" });

  // Klarifikasi: dua akun aktif dan akun sumber tidak disebut.
  await sendChat(page, "makan siang 50rb");
  await expect(
    page.getByText("Sebutkan akun sumber pembayaran (contoh: pake GoPay)."),
  ).toBeVisible();

  await sendChat(page, "beli kopi 25rb pake BCA");
  await expect(
    page.getByText("Berhasil catat pengeluaran Rp25.000 dari BCA. Sisa saldo: Rp975.000."),
  ).toBeVisible();

  await sendChat(page, "transfer 100rb dari BCA ke GoPay");
  await expect(
    page.getByText(
      "Berhasil catat transfer Rp100.000 dari BCA ke GoPay. Sisa saldo BCA: Rp875.000, saldo GoPay: Rp100.000.",
    ),
  ).toBeVisible();

  await sendChat(page, "gaji 50rb masuk ke BCA");
  await expect(
    page.getByText("Berhasil catat pemasukan Rp50.000 ke BCA. Saldo sekarang: Rp925.000."),
  ).toBeVisible();

  // Kekayaan bersih: 1.000.000 - 25.000 + 50.000 (transfer netral) = 1.025.000
  await expect(page.getByText("Kekayaan Bersih")).toBeVisible();
  await expect(page.getByText("Rp1.025.000").first()).toBeVisible();

  // Ledger menampilkan ketiga transaksi.
  await expect(page.getByText("beli kopi", { exact: true })).toBeVisible();
  await expect(
    page.getByText("transfer 100rb dari BCA ke GoPay", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("gaji 50rb masuk ke BCA", { exact: true })).toBeVisible();
});
