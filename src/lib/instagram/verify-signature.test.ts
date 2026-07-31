import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "./verify-signature";

const APP_SECRET = "segredo-de-teste";

function assinar(body: string, secret = APP_SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

describe("verifyWebhookSignature", () => {
  it("aceita uma assinatura válida", () => {
    const body = JSON.stringify({ entry: [{ id: "123" }] });
    expect(verifyWebhookSignature(body, assinar(body), APP_SECRET)).toBe(true);
  });

  it("rejeita quando o corpo foi alterado depois de assinado", () => {
    const body = JSON.stringify({ entry: [{ id: "123" }] });
    const assinaturaDoOutroCorpo = assinar(JSON.stringify({ entry: [{ id: "999" }] }));
    expect(verifyWebhookSignature(body, assinaturaDoOutroCorpo, APP_SECRET)).toBe(false);
  });

  it("rejeita quando o app secret usado pra assinar é diferente", () => {
    const body = "{}";
    expect(verifyWebhookSignature(body, assinar(body, "outro-segredo"), APP_SECRET)).toBe(false);
  });

  it("rejeita header ausente", () => {
    expect(verifyWebhookSignature("{}", null, APP_SECRET)).toBe(false);
  });

  it("rejeita header sem o prefixo sha256=", () => {
    const body = "{}";
    const semPrefixo = assinar(body).replace("sha256=", "");
    expect(verifyWebhookSignature(body, semPrefixo, APP_SECRET)).toBe(false);
  });
});
