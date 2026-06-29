type LoadingIllustrationApiResponse = {
  ok?: boolean;
  imagePath?: unknown;
};

export async function loadAuthenticatedLoadingImagePath(): Promise<string | null> {
  let response: Response;

  try {
    response = await fetch("/api/loading-illustration", {
      method: "GET",
      credentials: "include",
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  try {
    const parsed: unknown = await response.json();
    if (typeof parsed !== "object" || parsed === null) return null;

    const result = parsed as LoadingIllustrationApiResponse;
    if (result.ok === false || typeof result.imagePath !== "string") return null;

    const imagePath = result.imagePath.trim();
    return imagePath || null;
  } catch {
    return null;
  }
}
