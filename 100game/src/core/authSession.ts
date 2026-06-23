export type MockAuthSession = {
  email: string;
  expiresAt: number;
};

const MOCK_AUTH_SESSION_KEY = "100game.mockAuthSession";
const MOCK_AUTH_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getMockAuthSession(): MockAuthSession | null {
  try {
    const raw = localStorage.getItem(MOCK_AUTH_SESSION_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      localStorage.removeItem(MOCK_AUTH_SESSION_KEY);
      return null;
    }

    const email = parsed.email;
    const expiresAt = parsed.expiresAt;
    if (typeof email !== "string" || typeof expiresAt !== "number") {
      localStorage.removeItem(MOCK_AUTH_SESSION_KEY);
      return null;
    }

    if (Date.now() >= expiresAt) {
      localStorage.removeItem(MOCK_AUTH_SESSION_KEY);
      return null;
    }

    return { email, expiresAt };
  } catch {
    return null;
  }
}

export function saveMockAuthSession(email: string): MockAuthSession {
  const session: MockAuthSession = {
    email,
    expiresAt: Date.now() + MOCK_AUTH_SESSION_DURATION_MS,
  };

  try {
    localStorage.setItem(MOCK_AUTH_SESSION_KEY, JSON.stringify(session));
  } catch { }

  return session;
}

export function clearMockAuthSession() {
  try {
    localStorage.removeItem(MOCK_AUTH_SESSION_KEY);
  } catch { }
}
