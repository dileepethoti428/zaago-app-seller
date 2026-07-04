// Generate & hash one-time recovery codes for MFA fallback.
// Format: XXXX-XXXX-XXXX (12 chars from base32-ish alphabet)

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function randomChunk(len: number): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () =>
    `${randomChunk(4)}-${randomChunk(4)}-${randomChunk(4)}`
  );
}

export async function hashRecoveryCode(code: string): Promise<string> {
  // Normalize: uppercase, strip dashes/spaces
  const normalized = code.trim().toUpperCase().replace(/[-\s]/g, "");
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function downloadRecoveryCodes(codes: string[], filename = "zaago-recovery-codes.txt") {
  const content = [
    "Zaago Seller — Two-Factor Recovery Codes",
    "Generated: " + new Date().toISOString(),
    "",
    "Keep these codes safe. Each code can be used ONCE to sign in if",
    "you lose access to your authenticator app.",
    "",
    ...codes,
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
