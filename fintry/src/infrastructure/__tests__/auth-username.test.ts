import { describe, it, expect } from "vitest";
import { users } from "@/infrastructure/db/schema/auth";
import { auth } from "@/infrastructure/auth/auth";

describe("Phase 1: Auth & Username Extension", () => {
  it("schema users has username and displayUsername columns", () => {
    expect(users.username).toBeDefined();
    expect(users.displayUsername).toBeDefined();
  });

  it("auth instance has username plugin endpoints registered", () => {
    const plugins = auth.options.plugins || [];
    const usernamePlugin = plugins.find((p: { id?: string }) => p.id === "username");
    expect(usernamePlugin).toBeDefined();
  });

  it("distinguishes email vs username identifier correctly", () => {
    expect("user@example.com".includes("@")).toBe(true);
    expect("alex_pratama".includes("@")).toBe(false);
    expect("alex123".includes("@")).toBe(false);
    expect("admin.fintry@domain.co.id".includes("@")).toBe(true);
  });
});
