import { NAME_NG_WORDS } from "./nameNgWords";

export type NameValidationResult = "ok" | "empty" | "ng";

function normalizeNameForValidation(name: string) {
  return name.trim().toLowerCase();
}

export function validatePlayerName(name: string): NameValidationResult {
  const normalized = normalizeNameForValidation(name);
  if (!normalized) return "empty";

  const hasNgWord = NAME_NG_WORDS.some((word) => {
    const normalizedWord = normalizeNameForValidation(word);
    return normalizedWord !== "" && normalized.includes(normalizedWord);
  });

  return hasNgWord ? "ng" : "ok";
}
