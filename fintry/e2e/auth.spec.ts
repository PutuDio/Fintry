import { expect, test } from "@playwright/test";
import { loginUser, logoutUser, registerUser, uniqueEmail } from "./helpers";

test.describe("Autentikasi", () => {
  test("registrasi akun baru langsung masuk ke dashboard", async ({ page }) => {
    const email = uniqueEmail("daftar");
    await registerUser(page, email);

    await expect(page.getByRole("heading", { name: "Dashboard Keuangan" })).toBeVisible();
    await expect(page.getByText(`(${email})`)).toBeVisible();
  });

  test("dashboard dialihkan ke login bila belum punya sesi", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
  });

  test("logout mengembalikan pengguna ke halaman login", async ({ page }) => {
    const email = uniqueEmail("keluar");
    await registerUser(page, email);
    await logoutUser(page);

    await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
  });

  test("user terdaftar dapat login kembali", async ({ page }) => {
    const email = uniqueEmail("masuk");
    await registerUser(page, email);
    await logoutUser(page);

    await loginUser(page, email);
    await expect(page.getByRole("heading", { name: "Dashboard Keuangan" })).toBeVisible();
  });

  test("password salah menampilkan pesan error dan tetap di halaman login", async ({ page }) => {
    const email = uniqueEmail("salah");
    await registerUser(page, email);
    await logoutUser(page);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("password-yang-salah");
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
