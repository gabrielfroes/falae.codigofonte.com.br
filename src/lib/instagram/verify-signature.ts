import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PREFIX = "sha256=";

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }
  const providedHex = signatureHeader.slice(SIGNATURE_PREFIX.length);
  const expectedHex = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  const provided = Buffer.from(providedHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  if (provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(provided, expected);
}
