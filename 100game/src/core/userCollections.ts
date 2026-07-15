export const DEFAULT_USER_TITLE_ID = "title-start-001";

export type UserTitleDefinition = {
  id: string;
  name: string;
  rarity: string;
  condition: string;
  acquiredAt?: string;
  acquiredAtOrder?: number;
  comment: string;
  owned: boolean;
  sortOrder?: number;
};

export type UserIconDefinition = {
  id: string;
  name: string;
  comment: string;
  imagePath?: string;
  owned: boolean;
  sortOrder?: number;
  iconTypeIds?: string[];
};

export type LoadingIllustrationDefinition = {
  id: string;
  name: string;
  src: string;
  comment: string;
  owned: boolean;
  sortOrder?: number;
};

type UserCollectionsApiTitle = Partial<UserTitleDefinition> & {
  id?: string;
  sortOrder?: number;
};

type UserCollectionsApiIcon = Partial<UserIconDefinition> & {
  id?: string;
  sortOrder?: number;
};

type UserCollectionsApiIllustration = Partial<LoadingIllustrationDefinition> & {
  id?: string;
  sortOrder?: number;
};

type UserCollectionsApiResponse = {
  ok?: boolean;
  message?: string;
  collection?: {
    titles?: UserCollectionsApiTitle[];
    icons?: UserCollectionsApiIcon[];
    loadingIllustrations?: UserCollectionsApiIllustration[];
    defaultIconId?: string | null;
  };
};

const FALLBACK_TITLE_DEFINITIONS: UserTitleDefinition[] = [
  {
    id: "title-start-001",
    name: "はじまりの挑戦者",
    rarity: "☆",
    condition: "最初から所持",
    acquiredAt: "2026年06月01日に取得",
    comment: "千里の道も一歩よりだけど、ここでは100から。まずは一枚、まずは一戦。挑戦の記録はここから始まる。",
    owned: true,
    sortOrder: 1,
  },
  {
    id: "title-joker-001",
    name: "JOKERを告げし者",
    rarity: "☆",
    condition: "JOKERを1回使用する",
    acquiredAt: "2026年06月01日に取得",
    comment: "運命を乱す札を手に取り、数字を宣言した者に贈られる称号。偶然も実力も、ここでは同じ一手になる。",
    owned: true,
    sortOrder: 2,
  },
  {
    id: "title-fate-001",
    name: "運命を拒む者",
    rarity: "☆☆",
    condition: "敗北目前の状況を回避する",
    acquiredAt: "2026年06月02日に取得",
    comment: "終わりが見えた盤面で、なお手を伸ばした者の証。あきらめの悪さは、ときに最高の武器になる。",
    owned: true,
    sortOrder: 3,
  },
  {
    id: "title-alive-001",
    name: "堕ちぬ者",
    rarity: "☆☆",
    condition: "ALIVEで5回ゲームを終える",
    acquiredAt: "2026年06月02日に取得",
    comment: "勝利ではなく、生き残った事実に意味がある。危うい境界を越えず、最後まで盤面に立ち続けた者の称号。",
    owned: true,
    sortOrder: 4,
  },
  {
    id: "title-boundary-001",
    name: "百の境界を越えし者",
    rarity: "☆☆☆",
    condition: "100到達寸前の危険状態を複数回生還する",
    acquiredAt: "2026年06月03日に取得",
    comment: "100という境界線のそばで、幾度も足を止めた者に贈られる。越えれば終わり、越えなければ伝説。",
    owned: true,
    sortOrder: 5,
  },
  {
    id: "title-abyss-001",
    name: "深淵を覗く者",
    rarity: "☆☆☆",
    condition: "危険なJOKER宣言を成功させる",
    acquiredAt: "2026年06月03日に取得",
    comment: "その一手は無謀か、それとも読み切りか。深淵を覗き込みながら、なお笑って札を置いた者の称号。",
    owned: true,
    sortOrder: 6,
  },
  {
    id: "title-spade3-001",
    name: "黒き三刃の返礼",
    rarity: "☆☆",
    condition: "♠3で直前のJOKERを無効化する",
    acquiredAt: "2026年06月04日に取得",
    comment: "切り札には切り返しを。黒き三の刃で、混沌の札を沈黙させた者に贈られる称号。",
    owned: true,
    sortOrder: 7,
  },
  {
    id: "title-unknown-001",
    name: "星狩りの観測者",
    rarity: "☆☆☆☆",
    condition: "未所持",
    comment: "未所持",
    owned: false,
    sortOrder: 8,
  },
  {
    id: "title-unknown-002",
    name: "百界の覇者",
    rarity: "☆☆☆☆☆",
    condition: "未所持",
    comment: "未所持",
    owned: false,
    sortOrder: 9,
  },
];

const FALLBACK_ICON_DEFINITIONS: UserIconDefinition[] = [];

const FALLBACK_LOADING_ILLUSTRATION_DEFINITIONS: LoadingIllustrationDefinition[] = [
  {
    id: "load-illustration-001",
    name: "ロード画面１(男の子)",
    src: "/assets/loading-illustrations/01_load.png",
    comment: "文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30",
    owned: true,
    sortOrder: 1,
  },
  {
    id: "load-illustration-002",
    name: "ロード画面２(女の子)",
    src: "/assets/loading-illustrations/02_load.png",
    comment: "文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30",
    owned: true,
    sortOrder: 2,
  },
];

export const USER_TITLE_DEFINITIONS: UserTitleDefinition[] = cloneTitles(FALLBACK_TITLE_DEFINITIONS);
export const USER_ICON_DEFINITIONS: UserIconDefinition[] = cloneIcons(FALLBACK_ICON_DEFINITIONS);
export const LOADING_ILLUSTRATION_DEFINITIONS: LoadingIllustrationDefinition[] = cloneIllustrations(FALLBACK_LOADING_ILLUSTRATION_DEFINITIONS);

let defaultUserIconId: string | null = null;

export async function loadUserCollectionsFromApi(): Promise<boolean> {
  let response: Response;

  try {
    response = await fetch("/api/user-collections", {
      method: "GET",
      credentials: "include",
    });
  } catch {
    return false;
  }

  let result: UserCollectionsApiResponse = {};
  try {
    const parsed: unknown = await response.json();
    if (typeof parsed === "object" && parsed !== null) result = parsed as UserCollectionsApiResponse;
  } catch {
    // no-op
  }

  if (!response.ok || result.ok === false || !result.collection) return false;

  applyCollectionsSnapshot(result.collection);
  return true;
}


export async function loadGuestIconsFromApi(): Promise<boolean> {
  let response: Response;

  try {
    response = await fetch("/api/guest-icons", {
      method: "GET",
      credentials: "include",
    });
  } catch {
    return false;
  }

  let result: UserCollectionsApiResponse = {};
  try {
    const parsed: unknown = await response.json();
    if (typeof parsed === "object" && parsed !== null) result = parsed as UserCollectionsApiResponse;
  } catch {
    // no-op
  }

  if (!response.ok || result.ok === false || !result.collection) return false;

  applyCollectionsSnapshot(result.collection);
  return true;
}

export function getDefaultUserIconId(): string | null {
  return defaultUserIconId;
}

export function resetUserCollectionsCache() {
  replaceArray(USER_TITLE_DEFINITIONS, cloneTitles(FALLBACK_TITLE_DEFINITIONS));
  replaceArray(USER_ICON_DEFINITIONS, cloneIcons(FALLBACK_ICON_DEFINITIONS));
  replaceArray(LOADING_ILLUSTRATION_DEFINITIONS, cloneIllustrations(FALLBACK_LOADING_ILLUSTRATION_DEFINITIONS));
  defaultUserIconId = null;
}

function applyCollectionsSnapshot(collection: NonNullable<UserCollectionsApiResponse["collection"]>) {
  defaultUserIconId = normalizeText(collection.defaultIconId) ?? null;

  if (Array.isArray(collection.titles)) {
    replaceArray(USER_TITLE_DEFINITIONS, normalizeTitles(collection.titles));
  }

  if (Array.isArray(collection.icons)) {
    replaceArray(USER_ICON_DEFINITIONS, normalizeIcons(collection.icons));
  }

  if (Array.isArray(collection.loadingIllustrations)) {
    replaceArray(LOADING_ILLUSTRATION_DEFINITIONS, normalizeIllustrations(collection.loadingIllustrations));
  }
}

function normalizeTitles(values: UserCollectionsApiTitle[]) {
  const fallbackById = new Map(FALLBACK_TITLE_DEFINITIONS.map((title) => [title.id, title] as const));
  return values
    .map((value, index): UserTitleDefinition | null => {
      const id = normalizeText(value.id);
      if (!id) return null;

      const fallback = fallbackById.get(id);
      const owned = Boolean(value.owned);
      return {
        id,
        name: normalizeText(value.name) ?? fallback?.name ?? (owned ? id : "未開放"),
        rarity: normalizeText(value.rarity) ?? fallback?.rarity ?? "☆",
        condition: normalizeText(value.condition) ?? fallback?.condition ?? (owned ? "取得条件未設定" : "未所持"),
        acquiredAt: normalizeText(value.acquiredAt) ?? fallback?.acquiredAt,
        acquiredAtOrder: normalizeNumber(value.acquiredAtOrder) ?? fallback?.acquiredAtOrder,
        comment: normalizeText(value.comment) ?? fallback?.comment ?? (owned ? "" : "未所持"),
        owned,
        sortOrder: normalizeSortOrder(value.sortOrder, fallback?.sortOrder ?? index + 1),
      };
    })
    .filter((value): value is UserTitleDefinition => value !== null)
    .sort(compareSortOrder);
}

function normalizeIcons(values: UserCollectionsApiIcon[]) {
  const fallbackById = new Map(FALLBACK_ICON_DEFINITIONS.map((icon) => [icon.id, icon] as const));
  return values
    .map((value, index): UserIconDefinition | null => {
      const id = normalizeText(value.id);
      if (!id) return null;

      const fallback = fallbackById.get(id);
      const owned = Boolean(value.owned);
      return {
        id,
        name: normalizeText(value.name) ?? fallback?.name ?? (owned ? id : "未開放"),
        comment: normalizeText(value.comment) ?? fallback?.comment ?? (owned ? "" : "未所持"),
        imagePath: normalizeText(value.imagePath) ?? fallback?.imagePath ?? id,
        owned,
        sortOrder: normalizeSortOrder(value.sortOrder, fallback?.sortOrder ?? index + 1),
        iconTypeIds: normalizeStringList((value as { iconTypeIds?: unknown }).iconTypeIds),
      };
    })
    .filter((value): value is UserIconDefinition => value !== null)
    .sort(compareSortOrder);
}

function normalizeIllustrations(values: UserCollectionsApiIllustration[]) {
  const fallbackById = new Map(FALLBACK_LOADING_ILLUSTRATION_DEFINITIONS.map((illustration) => [illustration.id, illustration] as const));
  return values
    .map((value, index): LoadingIllustrationDefinition | null => {
      const id = normalizeText(value.id);
      if (!id) return null;

      const fallback = fallbackById.get(id);
      const owned = Boolean(value.owned);
      return {
        id,
        name: normalizeText(value.name) ?? fallback?.name ?? (owned ? id : "未開放"),
        src: normalizeText(value.src) ?? fallback?.src ?? "",
        comment: normalizeText(value.comment) ?? fallback?.comment ?? (owned ? "" : "未所持"),
        owned,
        sortOrder: normalizeSortOrder(value.sortOrder, fallback?.sortOrder ?? index + 1),
      };
    })
    .filter((value): value is LoadingIllustrationDefinition => value !== null)
    .sort(compareSortOrder);
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => normalizeText(item)).filter((item): item is string => Boolean(item)))];
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function normalizeSortOrder(value: unknown, fallback: number): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeNumber(value: unknown): number | undefined {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : undefined;
}

function compareSortOrder(a: { id: string; sortOrder?: number }, b: { id: string; sortOrder?: number }) {
  const diff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  return diff || a.id.localeCompare(b.id, "ja", { numeric: true, sensitivity: "base" });
}

function cloneTitles(values: UserTitleDefinition[]) {
  return values.map((value) => ({ ...value }));
}

function cloneIcons(values: UserIconDefinition[]) {
  return values.map((value) => ({ ...value }));
}

function cloneIllustrations(values: LoadingIllustrationDefinition[]) {
  return values.map((value) => ({ ...value }));
}

function replaceArray<T>(target: T[], source: T[]) {
  target.splice(0, target.length, ...source);
}
