import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isEmailAllowed } from "./allowlist";

const ORIGINAL_ENV = process.env.AUTH_ALLOWED_EMAILS;

describe("isEmailAllowed", () => {
  beforeEach(() => {
    process.env.AUTH_ALLOWED_EMAILS = "gabriel.froes@gmail.com, vweberfroes@gmail.com";
  });

  afterEach(() => {
    process.env.AUTH_ALLOWED_EMAILS = ORIGINAL_ENV;
  });

  it("permite email exatamente na lista", () => {
    expect(isEmailAllowed("gabriel.froes@gmail.com")).toBe(true);
  });

  it("ignora caixa e espaços", () => {
    expect(isEmailAllowed("  VWEBERFROES@GMAIL.COM  ")).toBe(true);
  });

  it("rejeita email fora da lista", () => {
    expect(isEmailAllowed("intruso@gmail.com")).toBe(false);
  });

  it("rejeita tudo quando a variável de ambiente está vazia", () => {
    process.env.AUTH_ALLOWED_EMAILS = "";
    expect(isEmailAllowed("gabriel.froes@gmail.com")).toBe(false);
  });
});
