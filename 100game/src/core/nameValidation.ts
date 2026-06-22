import { NAME_NG_WORDS } from "./nameNgWords";
import { MAX_PLAYER_NAME_LENGTH, countPlayerNameChars } from "./userSettings";

export type NameValidationResult = "ok" | "empty" | "tooLong" | "ng";

function normalizeNameForValidation(name: string) {
  return name.trim().toLowerCase();
}

export function validatePlayerName(name: string): NameValidationResult {
  const normalized = normalizeNameForValidation(name);
  if (!normalized) return "empty";
  if (countPlayerNameChars(name) > MAX_PLAYER_NAME_LENGTH) return "tooLong";

  const hasNgWord = NAME_NG_WORDS.some((word) => {
    const normalizedWord = normalizeNameForValidation(word);
    return normalizedWord !== "" && normalized.includes(normalizedWord);
  });

  return hasNgWord ? "ng" : "ok";
}
