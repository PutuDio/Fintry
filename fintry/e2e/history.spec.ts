import { expect, test } from "@playwright/test";
import { createAsset, registerUser, sendChat, uniqueEmail } from "./helpers";

test("riwayat: edit nominal memakai VOID + replacement, lalu void transaksi pengganti", async ({
  page,
}) => {
  await registerUser(page, uniqueEmail("riwayat"));

  await createAsset(page, { name: "BCA", type: "Bank", openingBalance: "1000000" });
  await sendChat(page, "beli makan 100rb pake BCA");
  await expect(
    page.getByText("Berhasil catat pengeluaran Rp100.000 dari BCA. Sisa saldo: Rp900.000."),
  ).toBeVisible();

  await page.getByRole("link", { name: "Riwayat", exact: true }).click();
  await page.waitForURL(/\/dashboard\/history/, { timeout: 30_000 });

  await expect(page.getByText("beli makan", { exact: true })).toBeVisible();
  await expect(page.getByText("Rp100.000").first()).toBeVisible();

  // Edit nominal → jalur VOID + transaksi pengganti.
  await page.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await expect(editDialog).toBeVisible();
  await editDialog.getByLabel("Nominal (Rp)").fill("50000");
  await editDialog.getByRole("button", { name: "Simpan" }).click();

  await expect(
    page.getByText(
      "Perubahan finansial diterapkan: transaksi lama di-VOID dan diganti transaksi baru.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Digantikan oleh transaksi baru.")).toBeVisible();
  await expect(page.getByText("Menggantikan transaksi sebelumnya.")).toBeVisible();
  await expect(page.getByText("VOIDED", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Rp50.000").first()).toBeVisible();

  // Void transaksi pengganti → kedua baris menjadi VOIDED.
  await page.getByRole("button", { name: "Batalkan" }).click();
  const voidDialog = page.getByRole("dialog");
  await expect(voidDialog).toBeVisible();
  await voidDialog.getByLabel("Alasan (opsional)").fill("salah input nominal");
  await voidDialog.getByRole("button", { name: "Batalkan Transaksi" }).click();

  await expect(
    page.getByText("Transaksi dibatalkan. Status menjadi VOIDED."),
  ).toBeVisible();
  await expect(page.getByText("VOIDED", { exact: true })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Batalkan" })).toHaveCount(0);

  // Filter status VOIDED tetap menampilkan kedua baris.
  await page.getByRole("link", { name: "Voided", exact: true }).click();
  await expect(page).toHaveURL(/status=VOIDED/);
  await expect(page.getByText("beli makan", { exact: true })).toHaveCount(2);

  // Semua transaksi VOIDED → kekayaan bersih kembali ke saldo awal.
  await page.getByRole("link", { name: /Dashboard/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Rp1.000.000").first()).toBeVisible();
});
