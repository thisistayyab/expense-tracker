/**
 * UUID v4 for row ids (02 rule 4). Rows are created on device and must stay
 * collision-free when a second device's data is merged later.
 *
 * Uses the platform crypto when present (Hermes, Node 19+) and falls back to a
 * Math.random v4 otherwise; ids are never used as secrets.
 */
export function newId(): string {
  const platformCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof platformCrypto?.randomUUID === "function") {
    return platformCrypto.randomUUID();
  }

  const hex = "0123456789abcdef";
  let id = "";
  for (let index = 0; index < 36; index += 1) {
    if (index === 8 || index === 13 || index === 18 || index === 23) {
      id += "-";
    } else if (index === 14) {
      id += "4";
    } else if (index === 19) {
      id += hex[(Math.random() * 4) | 8];
    } else {
      id += hex[(Math.random() * 16) | 0];
    }
  }
  return id;
}
