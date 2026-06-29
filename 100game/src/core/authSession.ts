import { resetSoundToDefault } from "./sound";
import { clearUserSettingsCache } from "./userSettings";
export type AuthSession = {
  email: string;
  expiresAt: number;
};

export type MockAuthSession = AuthSession;

type AuthApiFieldErrors = Record<string, string>;

type AuthApiResponse = {
  ok?: boolean;
  message?: string;
  errors?: AuthApiFieldErrors;
  user?: {
    email?: string;
  };
};

type AuthMeResponse = AuthApiResponse & {
  authenticated?: boolean;
  accountUnavailable?: boolean;
};

const AUTH_SESSION_KEY = "100game.authSession";
const LEGACY_MOCK_AUTH_SESSION_KEY = "100game.mockAuthSession";
const AUTH_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
export const ACCOUNT_UNAVAILABLE_MESSAGE = "このアカウントは現在利用できません。心当たりがない場合はお問い合わせください。";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class AuthApiError extends Error {
  readonly fieldErrors: AuthApiFieldErrors;

  constructor(message: string, fieldErrors: AuthApiFieldErrors = {}) {
    super(message);
    this.name = "AuthApiError";
    this.fieldErrors = fieldErrors;
  }
}

export function getAuthSession(): AuthSession | null {
  const session = readStoredSession(AUTH_SESSION_KEY) ?? readStoredSession(LEGACY_MOCK_AUTH_SESSION_KEY);
  if (!session) return null;

  if (Date.now() >= session.expiresAt) {
    clearAuthSession();
    return null;
  }

  return session;
}

export function getMockAuthSession(): MockAuthSession | null {
  return getAuthSession();
}

export function saveAuthSession(email: string): AuthSession {
  const session: AuthSession = {
    email,
    expiresAt: Date.now() + AUTH_SESSION_DURATION_MS,
  };

  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(LEGACY_MOCK_AUTH_SESSION_KEY);
  } catch { }

  return session;
}

export function saveMockAuthSession(email: string): MockAuthSession {
  return saveAuthSession(email);
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(LEGACY_MOCK_AUTH_SESSION_KEY);
  } catch { }

  clearUserSettingsCache();
  resetSoundToDefault();
}

export function clearMockAuthSession() {
  clearAuthSession();
}

export async function loginWithEmailPassword(values: { email: string; password: string }) {
  const response = await postAuthJson("/api/auth/login", values);
  return {
    email: response.user?.email ?? values.email,
  };
}

export async function registerPendingUser(values: { email: string; password: string; displayName: string }) {
  await postAuthJson("/api/auth/register", values);
}

export async function logoutAuthSession() {
  clearAuthSession();

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // local logout is already complete
  }
}

export async function requireActiveAuthSession() {
  if (!getAuthSession()) {
    throw new AuthApiError("ログイン状態を確認できませんでした。もう一度ログインしてください。");
  }

  let response: Response;
  try {
    response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
    });
  } catch {
    throw new AuthApiError("通信に失敗しました。時間をおいて再度お試しください。");
  }

  let result: AuthMeResponse = {};
  try {
    const parsed: unknown = await response.json();
    if (isRecord(parsed)) result = parsed as AuthMeResponse;
  } catch { }

  if (result.accountUnavailable) {
    clearAuthSession();
    throw new AuthApiError(result.message ?? ACCOUNT_UNAVAILABLE_MESSAGE);
  }

  if (!response.ok || result.ok === false || !result.authenticated) {
    clearAuthSession();
    throw new AuthApiError(result.message ?? "ログイン状態を確認できませんでした。もう一度ログインしてください。");
  }

  return result;
}


export async function requestPasswordReset(email: string) {
  await postAuthJson("/api/auth/password-reset-request", { email });
}

export async function resetPassword(values: { token: string; password: string }) {
  await postAuthJson("/api/auth/password-reset", values);
}

async function postAuthJson(path: string, payload: unknown): Promise<AuthApiResponse> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AuthApiError("通信に失敗しました。時間をおいて再度お試しください。");
  }

  let result: AuthApiResponse = {};
  try {
    const parsed: unknown = await response.json();
    if (isRecord(parsed)) result = parsed as AuthApiResponse;
  } catch { }

  if (!response.ok || result.ok === false) {
    throw new AuthApiError(result.message ?? "処理に失敗しました。時間をおいて再度お試しください。", result.errors ?? {});
  }

  return result;
}

function readStoredSession(storageKey: string): AuthSession | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      localStorage.removeItem(storageKey);
      return null;
    }

    const email = parsed.email;
    const expiresAt = parsed.expiresAt;
    if (typeof email !== "string" || typeof expiresAt !== "number") {
      localStorage.removeItem(storageKey);
      return null;
    }

    return { email, expiresAt };
  } catch {
    return null;
  }
}
