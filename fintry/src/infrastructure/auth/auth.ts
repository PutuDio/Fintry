import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { Resend } from "resend";
import { db } from "../db/client";
import * as schema from "../db/schema/auth";

// Satu-satunya tempat yang mengenal Better Auth (ADR-003).
// Kode lain hanya boleh memakai userId, bukan objek dari library ini.
// Secret dan base URL dibaca otomatis dari BETTER_AUTH_SECRET dan BETTER_AUTH_URL.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
  emailAndPassword: { 
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        // Dev mode: log ke console kalau RESEND_API_KEY tidak ada
        console.log(`[DEV] Password reset link for ${user.email}:\n${url}`);
        return;
      }
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: "Fintry <noreply@fintry.app>",
        to: user.email,
        subject: "Reset Password - Fintry",
        html: `<p>Klik link berikut untuk reset password Anda:</p><p><a href="${url}">${url}</a></p><p>Link berlaku 10 menit.</p>`,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
  ],
  user: {
    changeEmail: {
      enabled: true,
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.log(`[DEV] Email verification link for ${user.email}:\n${url}`);
        return;
      }
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: "Fintry <noreply@fintry.app>",
        to: user.email,
        subject: "Verifikasi Email - Fintry",
        html: `<p>Klik link berikut untuk verifikasi email Anda:</p><p><a href="${url}">${url}</a></p><p>Link berlaku 10 menit.</p>`,
      });
    },
  },
  advanced: { database: { generateId: "uuid" } },
  rateLimit: { enabled: true, storage: "database" },
});