import { expect, type Page } from "@playwright/test";

const PASSWORD = "rahasia-e2e-123";

export function uniqueEmail(prefix: string): string {
  const stamp = Date.now().toString(36);
  const random = Math.floor(Math.random() * 1_000_000).toString(36);
  return `${prefix}-${stamp}-${random}@contoh.test`;
}

export async function registerUser(page: Page, email: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Konfirmasi Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Daftar" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Dashboard Keuangan" })).toBeVisible({
    timeout: 30_000,
  });
}

export async function loginUser(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Dashboard Keuangan" })).toBeVisible({
    timeout: 30_000,
  });
}

export async function logoutUser(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 45_000 });
}

export async function createAsset(
  page: Page,
  input: { name: string; type: "Bank" | "E-Wallet" | "Investasi"; openingBalance?: string },
): Promise<void> {
  await page.getByRole("button", { name: "Tambah Akun" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Nama Akun").fill(input.name);
  await dialog.getByLabel("Tipe Akun").selectOption({ label: input.type });
  if (input.openingBalance) {
    await dialog.getByLabel("Saldo Awal (opsional)").fill(input.openingBalance);
  }
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText(input.name, { exact: true }).first()).toBeVisible();
}

export async function sendChat(page: Page, message: string): Promise<void> {
  const input = page.getByLabel("Pesan transaksi");
  await input.fill(message);
  await page.getByRole("button", { name: "Kirim" }).click();
  await expect(input).toBeEnabled({ timeout: 30_000 });
}
