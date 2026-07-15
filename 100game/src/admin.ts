import "./admin.css";
import { NAME_NG_WORDS } from "./core/nameNgWords";
import { isAllowedTitleConditionStatKeyForScope } from "./shared/titleConditionMetrics";
import {
  TITLE_CONDITION_GRAPH_CANVAS_HEIGHT,
  TITLE_CONDITION_GRAPH_CANVAS_WIDTH,
  TITLE_CONDITION_GRAPH_CONDITION_HEIGHT,
  TITLE_CONDITION_GRAPH_CONDITION_WIDTH,
  TITLE_CONDITION_GRAPH_MAX_CONDITIONS,
  TITLE_CONDITION_GRAPH_MAX_OPERATORS,
  TITLE_CONDITION_GRAPH_OPERATOR_HEIGHT,
  TITLE_CONDITION_GRAPH_OPERATOR_WIDTH,
  autoLayoutTitleConditionGraph,
  buildConditionTreeFromGraph,
  buildTitleConditionExpression,
  createEmptyTitleConditionGraph,
  createGraphFromConditionTree,
  createSingleConditionGraph,
  isCompoundConditionType,
  normalizeConditionTree,
  parseTitleConditionGraph,
  resetTitleConditionGraphPositions,
  serializeTitleConditionGraph,
  validateTitleConditionGraph,
  type TitleConditionGraph,
  type TitleConditionGraphConditionNode,
  type TitleConditionGraphEdge,
  type TitleConditionGraphNode,
  type TitleConditionTree,
} from "./adminTitleConditionGraph";

type AdminRole = "admin" | "owner";
type AdminTab = "titles" | "icons" | "assets" | "loadingIllustrations" | "announcements" | "changeBatches" | "playerUsers" | "users";
type AdminListPageKey = "titles" | "icons" | "assetIcons" | "assetLoadingIllustrations" | "loadingIllustrations" | "announcements" | "changeBatches" | "users";
type MasterTargetType = "title" | "icon" | "iconType";
type AppearanceMode = "auto" | "manual";
type AnnouncementCategory = "normal" | "maintenance" | "bug" | "update" | "important";

type TitleConditionMode = "builder" | "raw_json";
type TitleConditionOperator = ">=" | "<=" | "=";
type TitleConditionPlayStyle = "any" | "solo" | "multi";
type TitleConditionGameMode = "any" | "normal" | "hidden";
type TitleConditionDifficulty = "any" | "casual" | "smart";
type TitleConditionGameType = "any" | "100" | "200" | "300" | "400" | "500" | "extra";
type TitleConditionTemplateKind = "initial" | "stat" | "play_count" | "card_play_count" | "experience" | "joker_event" | "match_count_compare" | "rematch_session" | "host_other_leave" | "card_set" | "card_sequence" | "hand_sequence" | "table_suit_all" | "asset_count" | "participant_icon_composition" | "lose_certain_event" | "ng_name_streak" | "unimplemented";
type TitleConditionAssetType = "icon" | "loading_illustration";
type TitleConditionCardRule = "contains_all" | "contains_any" | "ordered_contains" | "contiguous_contains" | "contiguous_unordered" | "exact" | "unordered" | "same_rank" | "same_suit";
type TitleConditionCardTargetRange = "self" | "table";
type TitleConditionHandTarget = "self" | "next_1" | "next_2" | "next_3";
type TitleConditionHandTiming = "initial" | "in_match";
type TitleConditionAllSuitRule = "exact" | "exact_count_minus_1" | "exact_count_minus_2" | "exact_count_minus_3";
type TitleConditionParticipantSpecMode = "icon" | "icon_type";
type TitleConditionParticipantOrder = "unordered" | "turn_order";
type TitleConditionParticipantRelation = "any" | "self" | "other" | "npc";
type TitleConditionCardActor = "any" | "self" | "not_self" | "other" | "npc";
type TitleConditionLoseCertainRole = "creator" | "target" | "witness";
type TitleConditionLoseCertainAction = "any" | "self_exit" | "target_exit" | "target_spade3" | "target_dead" | "creator_exit";
type TitleConditionExperienceDetail = "alive" | "dead" | "normal_finish" | "void_match" | "redeal" | "timeout_deck_play" | "timeout_only_finish";
type TitleConditionExperienceUnit = "total" | "match";
type TitleConditionExperienceActor = "any" | "self" | "next_1" | "next_2" | "next_3";
type TitleConditionJokerEventDetail = "spade3_counter" | "my_joker_countered" | "joker_after_previous_joker" | "joker_used_match_dead" | "joker_bust" | "dead_with_joker_in_hand";
type TitleConditionJokerEventUnit = "total" | "match";
type TitleConditionJokerEventActor = "any" | "self" | "next_1" | "next_2" | "next_3";
type TitleConditionMatchCountCompareActor = "any" | "self" | "next_1" | "next_2" | "next_3";
type TitleConditionMatchCountCompareMetric = "played_card_count" | "manual_card_play_count" | "hand_play_count" | "deck_play_count" | "manual_deck_play_count" | "timeout_deck_play_count" | "joker_play_count" | "spade3_counter_count" | "my_joker_countered_by_spade3_count" | "self_joker_after_previous_joker_count";
type TitleConditionMatchCountCompareOperator = "gt" | "gte" | "eq" | "lte" | "lt";
type TitleConditionMatchCountCompareRight = "fixed_value" | TitleConditionMatchCountCompareMetric;
type TitleConditionRematchRecord = "any" | "alive" | "dead";
type TitleConditionRematchMode = "streak" | "total";
type TitleConditionHostOtherLeaveStartCount = "any" | "2" | "3" | "4";
type TitleConditionHostOtherLeavePattern = "any" | "same_turn_all" | "one_per_turn" | "one_per_consecutive_turn";
type TitleConditionCardPlaySource = "all" | "deck" | "hand";
type TitleConditionCardPlayActor = "self" | "previous" | "all";
type TitleConditionCardPlayGroup = "all" | "ace" | "number" | "jack" | "queen" | "king" | "joker";

type TitleConditionParticipantSlotInput = {
  relation: TitleConditionParticipantRelation;
  iconId: string;
  iconTypeId?: string;
};

type TitleConditionTemplate = {
  id: string;
  category: string;
  target: string;
  label: string;
  kind: TitleConditionTemplateKind;
  statKey?: string;
  jsonStatKey?: string;
  assetType?: TitleConditionAssetType;
  rankStatKey?: string;
  suitStatKey?: string;
  cardStatKey?: string;
  actorCardStatKey?: string;
  implemented: boolean;
  defaultValue?: number;
  hiddenFromTemplateSelect?: boolean;
};

type TitleConditionPreview = {
  mode: TitleConditionMode;
  conditionType: string;
  conditionParamsJson: string;
  conditionBuilderJson: string;
  implemented: boolean;
  message: string;
};

type TitleConditionCardInput = {
  rank: string;
  suit: string;
  suits?: string[];
  actor?: TitleConditionCardActor;
  wildcard?: boolean;
};

type TitleConditionPreviewInput = {
  mode: TitleConditionMode;
  templateId: string;
  playStyle: TitleConditionPlayStyle;
  gameMode: TitleConditionGameMode;
  difficulty?: TitleConditionDifficulty;
  gameType?: TitleConditionGameType;
  operator: TitleConditionOperator;
  value: number;
  cardRule?: TitleConditionCardRule;
  allSuitRule?: TitleConditionAllSuitRule;
  assetType?: TitleConditionAssetType;
  assetTargetId?: string;
  participantSpecMode?: TitleConditionParticipantSpecMode;
  participantOrder?: TitleConditionParticipantOrder;
  participantSlots?: TitleConditionParticipantSlotInput[];
  ngName?: string;
  loseCertainRole?: TitleConditionLoseCertainRole;
  loseCertainAction?: TitleConditionLoseCertainAction;
  experienceDetail?: TitleConditionExperienceDetail;
  experienceUnit?: TitleConditionExperienceUnit;
  experienceActor?: TitleConditionExperienceActor;
  jokerEventDetail?: TitleConditionJokerEventDetail;
  jokerEventUnit?: TitleConditionJokerEventUnit;
  jokerEventActor?: TitleConditionJokerEventActor;
  matchCountCompareActor?: TitleConditionMatchCountCompareActor;
  matchCountCompareLeftMetric?: TitleConditionMatchCountCompareMetric;
  matchCountCompareOperator?: TitleConditionMatchCountCompareOperator;
  matchCountCompareRight?: TitleConditionMatchCountCompareRight;
  matchCountCompareValue?: number;
  rematchRecord?: TitleConditionRematchRecord;
  rematchMode?: TitleConditionRematchMode;
  hostOtherLeaveStartCount?: TitleConditionHostOtherLeaveStartCount;
  hostOtherLeavePattern?: TitleConditionHostOtherLeavePattern;
  cardPlaySource?: TitleConditionCardPlaySource;
  cardPlayActor?: TitleConditionCardPlayActor;
  cardPlayGroup?: TitleConditionCardPlayGroup;
  cardTargetRange?: TitleConditionCardTargetRange;
  handTarget?: TitleConditionHandTarget;
  handTiming?: TitleConditionHandTiming;
  legacySameRank?: boolean;
  sameSuit?: boolean;
  cards?: TitleConditionCardInput[];
};


type TitleMaster = {
  id: string;
  code: string;
  name: string;
  description: string;
  unlockConditionText: string;
  rarity: number;
  conditionType: string;
  conditionParamsJson: string;
  conditionBuilderJson: string;
  isInitial: boolean;
  isActive: boolean;
  sortOrder: number;
  iconRewardIds: string[];
  updatedAt: string;
};

type IconMaster = {
  id: string;
  code: string;
  name: string;
  description: string;
  unlockConditionText: string;
  imagePath: string;
  rarity: number;
  conditionType: string;
  conditionParamsJson: string;
  isInitial: boolean;
  isGuestAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
  iconTypeIds: string[];
  isDefault: boolean;
  updatedAt: string;
};

type IconTypeMaster = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
};

type AdminUser = {
  userId: string;
  adminId?: string;
  email: string;
  status: string;
  role: AdminRole;
  roleLabel: string;
  displayName: string;
  lastLoginAt: string | null;
  passwordChangedAt?: string | null;
  mustChangePassword?: boolean;
  isSelf?: boolean;
  createdAt: string;
};

type PlayerUser = {
  userId: string;
  email: string;
  emailNormalized: string;
  status: string;
  role: string;
  roleLabel: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  displayName: string;
  lastLoginAt: string | null;
  createdAt: string;
  titleCount: number;
  iconCount: number;
  stats: {
    matchCount: number;
    winCount: number;
    loseCount: number;
    winRate: number;
    soloMatchCount: number;
    multiMatchCount: number;
  };
};

type PlayerStatsSummary = {
  matchCount: number;
  winCount: number;
  loseCount: number;
  winRate: number;
};

type PlayerUserStatusAction = "suspend" | "unsuspend";

type PlayerUserDetail = {
  user: {
    userId: string;
    email: string;
    emailNormalized: string;
    status: string;
    role: string;
    roleLabel: string;
    emailVerified: boolean;
    emailVerifiedAt: string | null;
    displayName: string;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
    settingsUpdatedAt: string | null;
  };
  current: {
    title: { id: string; name: string; rarity: number } | null;
    icon: { id: string; name: string; imagePath: string; rarity: number } | null;
  };
  collectionSummary: {
    titleCount: number;
    iconCount: number;
    illustrationCount: number;
    viewedIllustrationCount: number;
    unreadNotificationCount: number;
    activeSessionCount: number;
  };
  stats: {
    total: PlayerStatsSummary;
    solo: PlayerStatsSummary;
    multi: PlayerStatsSummary;
    currentWinStreak: number;
    maxWinStreak: number;
    currentLoseStreak: number;
    maxLoseStreak: number;
  };
  titles: Array<{ id: string; name: string; description: string; rarity: number; acquiredAt: string }>;
  icons: Array<{ id: string; name: string; description: string; imagePath: string; rarity: number; acquiredAt: string }>;
  matchHistory: Array<{ matchId: string; mode: string; difficulty: string; gameType: string; result: string; endedAt: string }>;
  statusLogs: Array<{
    id: string;
    actionType: PlayerUserStatusAction;
    beforeStatus: string;
    afterStatus: string;
    reason: string;
    createdAt: string;
    admin: { id: string; displayName: string; email: string };
  }>;
};

type PaginationState = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

type AnnouncementItem = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: AnnouncementCategory;
  categoryLabel: string;
  priority: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AssetItem = {
  id: string;
  code: string;
  name: string;
  imagePath: string;
  previewPath: string;
  isActive: boolean;
  sortOrder: number;
  storageProvider: string;
  storageKey: string | null;
  mimeType: string | null;
  fileSize: number | null;
  uploadedAt: string | null;
};

type LoadingIllustrationAssetItem = AssetItem & {
  requiredTitleId: string | null;
  appearanceMode: AppearanceMode;
  manualUnviewedRate: number;
  manualViewedRate: number;
};

type ChangeBatchStatus = "draft" | "scheduled" | "applied" | "cancelled" | "failed";
type ChangeBatchActionMode = "detail" | "apply" | "cancel" | "itemCancel";

type ChangeBatchActor = {
  id: string;
  displayName: string;
  email: string;
};

type ChangeBatchItem = {
  id: string;
  batchId?: string;
  changeType: string;
  targetType: string;
  targetId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  effect: Record<string, unknown> | null;
  currentEffect?: Record<string, unknown> | null;
  reason: string;
  createdAt: string;
  status: "draft" | "cancelled";
  parentItemId: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  cancelledBy: ChangeBatchActor | null;
};

type ChangeBatch = {
  id: string;
  name: string;
  status: ChangeBatchStatus;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string | null;
  appliedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  errorMessage: string | null;
  createdBy: ChangeBatchActor;
  appliedBy: ChangeBatchActor | null;
  cancelledBy: ChangeBatchActor | null;
  changeItemCount?: number;
  items: ChangeBatchItem[];
};


type TitleAchievementEffect = {
  achievementCountStatus: "counted" | "not_countable";
  achievedUserCount: number | null;
  note: string;
  iconRewardCount?: number;
};

type TitleSaveConfirmState = {
  isEdit: boolean;
  payload: SavePayload;
  effect: TitleAchievementEffect;
  conditionExpression: string;
};

type TitleWizardStep = "graph" | "basic";
type TitleWizardGraphMode = "visual" | "json";

type TitleBasicDraft = {
  titleId: string;
  titleCode: string;
  titleName: string;
  description: string;
  unlockConditionText: string;
  rarity: number;
  sortOrder: number;
  isInitial: boolean;
  isActive: boolean;
  iconRewardIds: string[];
  titleIconRewardChangeReason: string;
  unlockConditionTextEdited: boolean;
};

type TitleWizardDeleteTarget = {
  kind: "node" | "edge" | "all_edges";
  id: string;
};

type TitleWizardState = {
  step: TitleWizardStep;
  graphMode: TitleWizardGraphMode;
  graph: TitleConditionGraph;
  graphJsonText: string;
  graphErrors: string[];
  graphErrorNodeIds: string[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  editingConditionNodeId: string | "new" | null;
  deleteTarget: TitleWizardDeleteTarget | null;
  discardConfirmOpen: boolean;
  basic: TitleBasicDraft;
  dirty: boolean;
};

type CurrentUser = {
  userId: string;
  email: string;
  displayName?: string;
  role: AdminRole;
  roleLabel?: string;
  mustChangePassword?: boolean;
};

type AdminApiResponse = {
  ok?: boolean;
  message?: string;
  id?: string;
  currentUser?: CurrentUser;
  masters?: {
    titles?: TitleMaster[];
    icons?: IconMaster[];
    iconTypes?: IconTypeMaster[];
  };
  users?: AdminUser[];
  playerUsers?: PlayerUser[];
  playerUserDetail?: PlayerUserDetail;
  pagination?: PaginationState;
  query?: string;
  announcements?: AnnouncementItem[];
  changeBatches?: ChangeBatch[];
  batchId?: string;
  effect?: TitleAchievementEffect;
  assets?: {
    icons?: AssetItem[];
    loadingIllustrations?: LoadingIllustrationAssetItem[];
  };
};

type SavePayloadValue = string | number | boolean | null | string[] | Record<string, unknown>;
type SavePayload = Record<string, SavePayloadValue>;

const appElement = document.querySelector<HTMLDivElement>("#adminApp");
if (!appElement) throw new Error("#adminApp not found");

const app = appElement;
const ADMIN_LIST_PAGE_SIZE = 10;
const TITLE_CONDITION_NG_NAME_OPTIONS = Array.from(new Set(NAME_NG_WORDS.map((word) => word.trim()).filter(Boolean)));
const TITLE_CONDITION_DEFAULT_NG_NAME = TITLE_CONDITION_NG_NAME_OPTIONS.includes("運営仕事しろ") ? "運営仕事しろ" : (TITLE_CONDITION_NG_NAME_OPTIONS[0] ?? "");
const TITLE_CONDITION_NG_NAME_MAX_STREAK_STAT_KEY = "ng_name_max_streak_counts_json";
const TITLE_CONDITION_LOSE_CERTAIN_EVENT_STAT_KEY = "lose_certain_event_counts_json";
const TITLE_CONDITION_DEFAULT_EXPERIENCE_DETAIL: TitleConditionExperienceDetail = "alive";
const TITLE_CONDITION_DEFAULT_EXPERIENCE_UNIT: TitleConditionExperienceUnit = "total";
const TITLE_CONDITION_DEFAULT_EXPERIENCE_ACTOR: TitleConditionExperienceActor = "self";
const TITLE_CONDITION_TIMEOUT_ONLY_FINISH_STAT_KEY = "timeout_only_finish_counts_json";
const TITLE_CONDITION_EXPERIENCE_DETAILS: Array<{ value: TitleConditionExperienceDetail; label: string; statKey: string }> = [
  { value: "alive", label: "ALIVE", statKey: "win_count" },
  { value: "dead", label: "DEAD", statKey: "lose_count" },
  { value: "normal_finish", label: "通常決着", statKey: "normal_finish_count" },
  { value: "void_match", label: "無効試合", statKey: "void_match_count" },
  { value: "redeal", label: "再配布", statKey: "redeal_count" },
  { value: "timeout_deck_play", label: "時間切れによる山札使用", statKey: "timeout_deck_play_count" },
  { value: "timeout_only_finish", label: "時間切れによる山札使用だけでゲーム終了", statKey: TITLE_CONDITION_TIMEOUT_ONLY_FINISH_STAT_KEY },
];
const TITLE_CONDITION_EXPERIENCE_UNITS: Array<{ value: TitleConditionExperienceUnit; label: string }> = [
  { value: "total", label: "累計" },
  { value: "match", label: "1試合内" },
];
const TITLE_CONDITION_EXPERIENCE_ACTORS: Array<{ value: TitleConditionExperienceActor; label: string }> = [
  { value: "any", label: "指定なし" },
  { value: "self", label: "自分" },
  { value: "next_1", label: "手番①" },
  { value: "next_2", label: "手番②" },
  { value: "next_3", label: "手番③" },
];
const TITLE_CONDITION_DEFAULT_JOKER_EVENT_DETAIL: TitleConditionJokerEventDetail = "spade3_counter";
const TITLE_CONDITION_DEFAULT_JOKER_EVENT_UNIT: TitleConditionJokerEventUnit = "total";
const TITLE_CONDITION_DEFAULT_JOKER_EVENT_ACTOR: TitleConditionJokerEventActor = "self";
const TITLE_CONDITION_JOKER_EVENT_MATCH_STAT_KEY = "joker_event_counts_json";
const TITLE_CONDITION_JOKER_EVENT_DETAILS: Array<{ value: TitleConditionJokerEventDetail; label: string; statKey: string; matchCount: boolean; note: string }> = [
  { value: "spade3_counter", label: "JOKERを♠3で無効化", statKey: "spade3_counter_count", matchCount: true, note: "対象者が♠3を出し、直前のJOKERを無効化した回数です。" },
  { value: "my_joker_countered", label: "出したJOKERが♠3で無効化された", statKey: "my_joker_countered_by_spade3_count", matchCount: true, note: "対象者が出したJOKERを、その後の♠3で無効化された回数です。" },
  { value: "joker_after_previous_joker", label: "直前のJOKER後にJOKERを使用", statKey: "self_joker_after_previous_joker_count", matchCount: true, note: "場の直前カードがJOKERの状態で、対象者がJOKERを出した回数です。" },
  { value: "joker_used_match_dead", label: "JOKERを使用した試合でDEAD", statKey: "joker_used_match_dead_count", matchCount: false, note: "対象者がその試合でJOKERを1回以上使用し、最終的にDEADになった場合です。JOKERとDEADの因果関係は問いません。" },
  { value: "joker_bust", label: "JOKERの使用が原因でDEAD", statKey: "joker_bust_count", matchCount: false, note: "対象者がJOKERを出した結果、その場で上限または下限のDEAD値へ到達した場合です。" },
  { value: "dead_with_joker_in_hand", label: "JOKERを所持した状態でDEAD", statKey: "dead_with_joker_in_hand_count", matchCount: false, note: "対象者がDEADになった時点の手札にJOKERが残っていた場合です。JOKERを使用したかは問いません。" },
];
const TITLE_CONDITION_JOKER_EVENT_UNITS: Array<{ value: TitleConditionJokerEventUnit; label: string }> = [
  { value: "total", label: "累計" },
  { value: "match", label: "1試合内" },
];
const TITLE_CONDITION_JOKER_EVENT_ACTORS: Array<{ value: TitleConditionJokerEventActor; label: string }> = [
  { value: "any", label: "指定なし" },
  { value: "self", label: "自分" },
  { value: "next_1", label: "手番①" },
  { value: "next_2", label: "手番②" },
  { value: "next_3", label: "手番③" },
];
const TITLE_CONDITION_DEFAULT_MATCH_COUNT_COMPARE_ACTOR: TitleConditionMatchCountCompareActor = "self";
const TITLE_CONDITION_DEFAULT_MATCH_COUNT_COMPARE_LEFT_METRIC: TitleConditionMatchCountCompareMetric = "timeout_deck_play_count";
const TITLE_CONDITION_DEFAULT_MATCH_COUNT_COMPARE_OPERATOR: TitleConditionMatchCountCompareOperator = "gt";
const TITLE_CONDITION_DEFAULT_MATCH_COUNT_COMPARE_RIGHT: TitleConditionMatchCountCompareRight = "manual_card_play_count";
const TITLE_CONDITION_MATCH_COUNT_COMPARE_ACTORS: Array<{ value: TitleConditionMatchCountCompareActor; label: string }> = [
  { value: "any", label: "指定なし" },
  { value: "self", label: "自分" },
  { value: "next_1", label: "手番①" },
  { value: "next_2", label: "手番②" },
  { value: "next_3", label: "手番③" },
];
const TITLE_CONDITION_MATCH_COUNT_COMPARE_METRICS: Array<{ value: TitleConditionMatchCountCompareMetric; label: string }> = [
  { value: "played_card_count", label: "全カード使用回数" },
  { value: "manual_card_play_count", label: "手動カード使用回数" },
  { value: "hand_play_count", label: "手札使用回数" },
  { value: "deck_play_count", label: "山札使用回数" },
  { value: "manual_deck_play_count", label: "手動による山札使用回数" },
  { value: "timeout_deck_play_count", label: "時間切れによる山札使用回数" },
  { value: "joker_play_count", label: "JOKER使用回数" },
  { value: "spade3_counter_count", label: "JOKERを♠3で無効化した回数" },
  { value: "my_joker_countered_by_spade3_count", label: "出したJOKERを♠3で無効化された回数" },
  { value: "self_joker_after_previous_joker_count", label: "直前のJOKER後にJOKERを使用した回数" },
];
const TITLE_CONDITION_MATCH_COUNT_COMPARE_OPERATORS: Array<{ value: TitleConditionMatchCountCompareOperator; label: string }> = [
  { value: "gt", label: "より多い" },
  { value: "gte", label: "以上" },
  { value: "eq", label: "同じ" },
  { value: "lte", label: "以下" },
  { value: "lt", label: "より少ない" },
];
const TITLE_CONDITION_DEFAULT_REMATCH_RECORD: TitleConditionRematchRecord = "any";
const TITLE_CONDITION_DEFAULT_REMATCH_MODE: TitleConditionRematchMode = "streak";
const TITLE_CONDITION_HOST_OTHER_LEAVE_STAT_KEY = "host_other_leave_pattern_counts_json";
const TITLE_CONDITION_DEFAULT_HOST_OTHER_LEAVE_START_COUNT: TitleConditionHostOtherLeaveStartCount = "4";
const TITLE_CONDITION_DEFAULT_HOST_OTHER_LEAVE_PATTERN: TitleConditionHostOtherLeavePattern = "any";
const TITLE_CONDITION_REMATCH_RECORDS: Array<{ value: TitleConditionRematchRecord; label: string }> = [
  { value: "any", label: "指定なし" },
  { value: "alive", label: "ALIVE" },
  { value: "dead", label: "DEAD" },
];
const TITLE_CONDITION_REMATCH_MODES: Array<{ value: TitleConditionRematchMode; label: string }> = [
  { value: "streak", label: "連続記録" },
  { value: "total", label: "連戦内合計" },
];
const TITLE_CONDITION_HOST_OTHER_LEAVE_START_COUNTS: Array<{ value: TitleConditionHostOtherLeaveStartCount; label: string }> = [
  { value: "any", label: "指定なし" },
  { value: "2", label: "2人" },
  { value: "3", label: "3人" },
  { value: "4", label: "4人" },
];
const TITLE_CONDITION_HOST_OTHER_LEAVE_PATTERNS: Array<{ value: TitleConditionHostOtherLeavePattern; label: string }> = [
  { value: "any", label: "指定なし" },
  { value: "same_turn_all", label: "1ターンでHOST以外全員" },
  { value: "one_per_turn", label: "1ターンで1人抜けが必要人数分" },
  { value: "one_per_consecutive_turn", label: "1ターンで1人抜けが必要人数分、連続ターンで発生" },
];
const TITLE_CONDITION_CARD_PLAY_COUNT_STAT_KEY = "actor_source_card_play_counts_json";
const TITLE_CONDITION_CARD_PLAY_SOURCES: Array<{ value: TitleConditionCardPlaySource; label: string }> = [
  { value: "all", label: "指定なし" },
  { value: "deck", label: "山札" },
  { value: "hand", label: "手札" },
];
const TITLE_CONDITION_CARD_PLAY_ACTORS: Array<{ value: TitleConditionCardPlayActor; label: string }> = [
  { value: "self", label: "自分" },
  { value: "previous", label: "自分の前の手番" },
  { value: "all", label: "全体" },
];
const TITLE_CONDITION_CARD_PLAY_GROUPS: Array<{ value: Exclude<TitleConditionCardPlayGroup, "all">; label: string; statKey: string }> = [
  { value: "ace", label: "A", statKey: "ace_play_count" },
  { value: "number", label: "数字カード（2～10）", statKey: "number_card_play_count" },
  { value: "jack", label: "J", statKey: "jack_play_count" },
  { value: "queen", label: "Q", statKey: "queen_play_count" },
  { value: "king", label: "K", statKey: "king_play_count" },
  { value: "joker", label: "JOKER", statKey: "joker_play_count" },
];

const TITLE_CONDITION_DIFFICULTIES: Array<{ value: TitleConditionDifficulty; label: string; statKey: string }> = [
  { value: "any", label: "指定なし", statKey: "match_count" },
  { value: "casual", label: "CASUAL", statKey: "casual_match_count" },
  { value: "smart", label: "SMART", statKey: "smart_match_count" },
];
const TITLE_CONDITION_GAME_TYPES: Array<{ value: TitleConditionGameType; label: string; statKey: string }> = [
  { value: "any", label: "指定なし", statKey: "match_count" },
  { value: "100", label: "100", statKey: "type_100_match_count" },
  { value: "200", label: "200", statKey: "type_200_match_count" },
  { value: "300", label: "300", statKey: "type_300_match_count" },
  { value: "400", label: "400", statKey: "type_400_match_count" },
  { value: "500", label: "500", statKey: "type_500_match_count" },
  { value: "extra", label: "EXTRA", statKey: "type_extra_match_count" },
];

const TITLE_CONDITION_TEMPLATES: TitleConditionTemplate[] = [
  { id: "initial_grant", category: "初期付与", target: "初期所持称号", label: "初期所持称号", kind: "initial", implemented: true },
  { id: "play_count", category: "プレイ回数", target: "プレイ回数", label: "プレイ回数", kind: "play_count", implemented: true, defaultValue: 1 },
  { id: "match_count", category: "プレイ回数", target: "総プレイ回数", label: "総プレイ回数", kind: "stat", statKey: "match_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "solo_match_count", category: "プレイ回数", target: "ソロプレイ回数", label: "ソロプレイ回数", kind: "stat", statKey: "match_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "multi_match_count", category: "プレイ回数", target: "マルチプレイ回数", label: "マルチプレイ回数", kind: "stat", statKey: "match_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "dead_count", category: "勝敗 / リザルト", target: "DEAD回数", label: "DEAD回数", kind: "stat", statKey: "lose_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "alive_count", category: "勝敗 / リザルト", target: "DEADにならなかった回数", label: "ARIVE回数", kind: "stat", statKey: "win_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "experience", category: "勝敗 / リザルト", target: "経験系", label: "経験系", kind: "experience", implemented: true, defaultValue: 1 },
  { id: "match_count_compare", category: "試合内記録", target: "1試合内の回数比較", label: "1試合内の回数比較", kind: "match_count_compare", implemented: true, defaultValue: 1 },
  { id: "rematch_session", category: "勝敗 / リザルト", target: "連戦内の記録", label: "連戦内の記録", kind: "rematch_session", implemented: true, defaultValue: 5 },
  { id: "host_other_leave", category: "マルチ", target: "HOST中の他参加者途中退出", label: "HOST中の他参加者途中退出", kind: "host_other_leave", implemented: true, defaultValue: 1 },
  { id: "casual_match_count", category: "難易度", target: "CASUALプレイ回数", label: "CASUALプレイ回数", kind: "stat", statKey: "casual_match_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "smart_match_count", category: "難易度", target: "SMARTプレイ回数", label: "SMARTプレイ回数", kind: "stat", statKey: "smart_match_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "type_100_match_count", category: "ゲームタイプ", target: "100プレイ回数", label: "100プレイ回数", kind: "stat", statKey: "type_100_match_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "type_200_match_count", category: "ゲームタイプ", target: "200プレイ回数", label: "200プレイ回数", kind: "stat", statKey: "type_200_match_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "type_300_match_count", category: "ゲームタイプ", target: "300プレイ回数", label: "300プレイ回数", kind: "stat", statKey: "type_300_match_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "type_400_match_count", category: "ゲームタイプ", target: "400プレイ回数", label: "400プレイ回数", kind: "stat", statKey: "type_400_match_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "type_500_match_count", category: "ゲームタイプ", target: "500プレイ回数", label: "500プレイ回数", kind: "stat", statKey: "type_500_match_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "type_extra_match_count", category: "ゲームタイプ", target: "EXTRAプレイ回数", label: "EXTRAプレイ回数", kind: "stat", statKey: "type_extra_match_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "card_source_play_count", category: "カード使用", target: "カード使用回数（使用元別）", label: "カード使用回数（使用元別）", kind: "card_play_count", implemented: true, defaultValue: 1 },
  { id: "specific_card_play_count", category: "カード使用", target: "特定カード使用回数", label: "特定カード使用回数", kind: "card_play_count", implemented: true, defaultValue: 1 },
  { id: "played_card_count", category: "カード使用", target: "カード使用回数", label: "カード使用回数", kind: "stat", statKey: "played_card_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "joker_play_count", category: "JOKER / ♠3", target: "JOKER使用回数", label: "JOKER使用回数", kind: "stat", statKey: "joker_play_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "joker_spade3_event", category: "JOKER / ♠3", target: "JOKER／♠3イベント", label: "JOKER／♠3イベント", kind: "joker_event", implemented: true, defaultValue: 1 },
  { id: "spade3_counter_count", category: "JOKER / ♠3", target: "JOKERを♠3で無効化した回数", label: "♠3無効化回数", kind: "stat", statKey: "spade3_counter_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "timeout_deck_play_count", category: "勝敗 / リザルト", target: "時間切れ経験回数", label: "時間切れ経験回数", kind: "stat", statKey: "timeout_deck_play_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "initial_hand_all_red_count", category: "初期手札 / 手札状態", target: "初期手札が全部赤", label: "初期手札：全部赤", kind: "stat", statKey: "initial_hand_all_red_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "initial_hand_all_black_count", category: "初期手札 / 手札状態", target: "初期手札が全部黒", label: "初期手札：全部黒", kind: "stat", statKey: "initial_hand_all_black_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "initial_hand_same_suit_count", category: "初期手札 / 手札状態", target: "初期手札が同一スート", label: "初期手札：同一スート", kind: "stat", statKey: "initial_hand_same_suit_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "initial_hand_sequence", category: "初期手札 / 手札状態", target: "手札4枚条件", label: "手札4枚条件", kind: "hand_sequence", statKey: "initial_hand_card_sequence_json", implemented: true },
  { id: "in_match_hand_sequence", category: "初期手札 / 手札状態", target: "試合中の手札4枚条件", label: "試合中の手札4枚条件", kind: "hand_sequence", statKey: "hand_sequence_signatures_json", implemented: true, hiddenFromTemplateSelect: true },
  { id: "hand_play_count", category: "カード使用", target: "手札使用回数", label: "手札使用回数", kind: "stat", statKey: "hand_play_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "deck_play_count", category: "カード使用", target: "山札使用回数", label: "山札使用回数", kind: "stat", statKey: "deck_play_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "normal_finish_count", category: "勝敗 / リザルト", target: "通常決着回数", label: "通常決着回数", kind: "stat", statKey: "normal_finish_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "finish_turn_count", category: "勝敗 / リザルト", target: "決着手番数", label: "決着手番数", kind: "stat", statKey: "turn_count", implemented: true, defaultValue: 1 },
  { id: "match_log_count", category: "場全体", target: "ログ行数", label: "ログ行数", kind: "stat", statKey: "match_log_count", implemented: true, defaultValue: 1 },
  { id: "joker_used_match_dead_count", category: "JOKER / ♠3", target: "JOKER使用試合でDEAD回数", label: "JOKER使用試合でDEAD回数", kind: "stat", statKey: "joker_used_match_dead_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "joker_bust_count", category: "JOKER / ♠3", target: "JOKER起因DEAD回数", label: "JOKER起因DEAD回数", kind: "stat", statKey: "joker_bust_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "dead_with_joker_in_hand_count", category: "JOKER / ♠3", target: "JOKER所持中DEAD回数", label: "JOKER所持中DEAD回数", kind: "stat", statKey: "dead_with_joker_in_hand_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "my_joker_countered_by_spade3_count", category: "JOKER / ♠3", target: "自分のJOKERを♠3で無効化された回数", label: "自分のJOKERを♠3で無効化された回数", kind: "stat", statKey: "my_joker_countered_by_spade3_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "self_joker_after_previous_joker_count", category: "JOKER / ♠3", target: "直前JOKER後に自分がJOKERを出した回数", label: "直前JOKER後のJOKER使用回数", kind: "stat", statKey: "self_joker_after_previous_joker_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "self_spade3_after_previous_joker_count", category: "JOKER / ♠3", target: "直前JOKER後に自分が♠3を出した回数", label: "直前JOKER後の♠3使用回数", kind: "stat", statKey: "self_spade3_after_previous_joker_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "self_spade3_after_previous_joker_dead_margin1_count", category: "JOKER / ♠3", target: "直前JOKER後、DEAD値1つ前状態で自分が♠3を出した回数", label: "DEAD値1つ前の直前JOKER後♠3回数", kind: "stat", statKey: "self_spade3_after_previous_joker_dead_margin1_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "lose_certain_event", category: "負け確", target: "負け確イベント状況", label: "負け確イベント状況", kind: "lose_certain_event", statKey: TITLE_CONDITION_LOSE_CERTAIN_EVENT_STAT_KEY, implemented: true, defaultValue: 1 },
  { id: "played_card_set", category: "カード順 / カード集合", target: "出したカードに含まれるもの", label: "出したカードに含まれるもの", kind: "card_set", implemented: true },
  { id: "consecutive_played_cards", category: "カード順 / カード集合", target: "連続して出たカード", label: "連続して出たカード", kind: "card_sequence", implemented: true },
  { id: "self_play_card_set", category: "カード順 / カード集合", target: "自分が出したカードに含まれるもの", label: "自分が出したカードに含まれるもの", kind: "card_set", rankStatKey: "self_play_rank_set_json", suitStatKey: "self_play_suit_set_json", cardStatKey: "self_play_card_set_json", implemented: true, hiddenFromTemplateSelect: true },
  { id: "table_play_card_set", category: "カード順 / カード集合", target: "場に出たカードに含まれるもの", label: "場に出たカードに含まれるもの", kind: "card_set", rankStatKey: "table_play_rank_set_json", suitStatKey: "table_play_suit_set_json", cardStatKey: "table_play_card_set_json", implemented: true, hiddenFromTemplateSelect: true },
  { id: "self_play_sequence", category: "カード順 / カード集合", target: "自分が出したカードの順番", label: "自分が出したカードの順番", kind: "card_sequence", rankStatKey: "self_play_rank_sequence_json", cardStatKey: "self_play_card_sequence_json", implemented: true, hiddenFromTemplateSelect: true },
  { id: "field_play_sequence", category: "カード順 / カード集合", target: "場に出たカードの順番", label: "場に出たカードの順番", kind: "card_sequence", rankStatKey: "table_play_rank_sequence_json", cardStatKey: "table_play_card_sequence_json", actorCardStatKey: "table_play_actor_card_sequence_json", implemented: true, hiddenFromTemplateSelect: true },
  { id: "table_all_same_suit", category: "場全体", target: "場に出たカードがすべて指定スート", label: "場に出たカードがすべて指定スート", kind: "table_suit_all", implemented: true },
  { id: "all_participants_played_card_match_count", category: "場全体", target: "参加者全員がカードを出した回数", label: "参加者全員がカードを出した回数", kind: "stat", statKey: "all_participants_played_card_match_count", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "asset_usage_count", category: "素材", target: "素材利用回数", label: "素材利用回数", kind: "asset_count", implemented: true, defaultValue: 1 },
  { id: "loading_illustration_display_count", category: "ロードイラスト", target: "ロードイラスト表示回数", label: "ロードイラスト表示回数", kind: "asset_count", statKey: "loading_illustration_display_count", jsonStatKey: "loading_illustration_display_counts_json", assetType: "loading_illustration", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "icon_use_count", category: "アイコン", target: "アイコン使用回数", label: "アイコン使用回数", kind: "asset_count", statKey: "icon_use_count", jsonStatKey: "icon_use_counts_json", assetType: "icon", implemented: true, defaultValue: 1, hiddenFromTemplateSelect: true },
  { id: "participant_icon_composition", category: "アイコン", target: "ゲーム開始時の参加者アイコン構成", label: "ゲーム開始時の参加者アイコン構成", kind: "participant_icon_composition", implemented: true },
  { id: "ng_name_streak_count", category: "ユーザー設定", target: "NGネーム連続押下回数", label: "NGネーム連続押下回数", kind: "ng_name_streak", statKey: TITLE_CONDITION_NG_NAME_MAX_STREAK_STAT_KEY, implemented: true, defaultValue: 10 },
  { id: "title_acquired_count", category: "称号獲得数", target: "称号獲得数", label: "称号獲得数", kind: "stat", statKey: "title_acquired_count", implemented: true, defaultValue: 1 },
  { id: "hidden_mode_match_count", category: "ゲームモード", target: "HIDDENプレイ回数", label: "HIDDENプレイ回数", kind: "unimplemented", implemented: false },
];

const TITLE_CONDITION_OPERATORS: Array<{ value: TitleConditionOperator; label: string }> = [
  { value: ">=", label: "以上" },
  { value: "<=", label: "以下" },
  { value: "=", label: "一致" },
];

const TITLE_CONDITION_CARD_RULES: Array<{ value: TitleConditionCardRule; label: string }> = [
  { value: "contains_all", label: "すべて含む" },
  { value: "contains_any", label: "いずれかを含む" },
  { value: "ordered_contains", label: "指定順で含む" },
  { value: "contiguous_contains", label: "連続で含む" },
  { value: "contiguous_unordered", label: "連続・順不同" },
  { value: "exact", label: "完全一致" },
  { value: "unordered", label: "順番は問わない" },
];

const TITLE_CONDITION_ALL_SUIT_RULES: Array<{ value: TitleConditionAllSuitRule; offset: number; label: (selectedCount: number) => string }> = [
  { value: "exact", offset: 0, label: () => "完全一致" },
  { value: "exact_count_minus_1", offset: 1, label: (selectedCount) => `どれか${selectedCount - 1}種類のみ一致` },
  { value: "exact_count_minus_2", offset: 2, label: (selectedCount) => `どれか${selectedCount - 2}種類のみ一致` },
  { value: "exact_count_minus_3", offset: 3, label: (selectedCount) => `どれか${selectedCount - 3}種類のみ一致` },
];

const TITLE_CONDITION_CARD_RANKS = ["any", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "JOKER"];
const TITLE_CONDITION_CARD_SEQUENCE_RANKS = [...TITLE_CONDITION_CARD_RANKS.slice(0, -1), "JQK", "JOKER"];
const TITLE_CONDITION_CARD_SUITS = ["any", "S", "H", "D", "C"];
const TITLE_CONDITION_CARD_ACTORS: Array<{ value: TitleConditionCardActor; label: string }> = [
  { value: "any", label: "指定なし" },
  { value: "self", label: "自分" },
  { value: "not_self", label: "自分以外" },
  { value: "other", label: "他プレイヤー" },
  { value: "npc", label: "NPC" },
];
const TITLE_CONDITION_CARD_TARGET_RANGES: Array<{ value: TitleConditionCardTargetRange; label: string }> = [
  { value: "self", label: "自分" },
  { value: "table", label: "場全体" },
];
const TITLE_CONDITION_CARD_SLOT_COUNT = 14;
const TITLE_CONDITION_PARTICIPANT_SLOT_COUNT = 4;
const TITLE_CONDITION_NPC_ICON_ID = "npc_default";


let activeTab: AdminTab = "titles";
let currentUser: CurrentUser | null = null;
let titles: TitleMaster[] = [];
let icons: IconMaster[] = [];
let iconTypes: IconTypeMaster[] = [];
let users: AdminUser[] = [];
let playerUsers: PlayerUser[] = [];
let playerUserPagination: PaginationState = { page: 1, pageSize: ADMIN_LIST_PAGE_SIZE, total: 0, totalPages: 1, hasPrevious: false, hasNext: false };
let adminListPages: Record<AdminListPageKey, number> = createDefaultAdminListPages();
let playerUserQuery = "";
let playerUserSearchInput = "";
let selectedPlayerUserDetail: PlayerUserDetail | null = null;
let isPlayerUserHistoryModalOpen = false;
let playerUserStatusAction: PlayerUserStatusAction | null = null;
let announcements: AnnouncementItem[] = [];
let changeBatches: ChangeBatch[] = [];
let assetIcons: AssetItem[] = [];
let assetLoadingIllustrations: LoadingIllustrationAssetItem[] = [];
let editingTitle: TitleMaster | null = null;
let editingIcon: IconMaster | null = null;
let editingLoadingIllustration: LoadingIllustrationAssetItem | null = null;
let editingAnnouncement: AnnouncementItem | null = null;
let titleDeleteTargetId: string | null = null;
let iconDeleteTargetId: string | null = null;
let iconReplaceTargetId: string | null = null;
let loadingIllustrationDeleteTargetId: string | null = null;
let loadingIllustrationReplaceTargetId: string | null = null;
let changeBatchActionTarget: { batchId: string; mode: ChangeBatchActionMode; itemId?: string } | null = null;
let isTitleCreateModalOpen = false;
let isIconCreateModalOpen = false;
let isAnnouncementCreateModalOpen = false;
let isAdminCreateModalOpen = false;
let titleSaveConfirmState: TitleSaveConfirmState | null = null;
let titleWizardState: TitleWizardState | null = null;
let adminNameTargetAdminId: string | null = null;
let adminRoleTargetAdminId: string | null = null;
let passwordTargetAdminId: string | null = null;
let messageText = "";
let errorText = "";
let isLoading = false;

void initialize();

async function initialize() {
  await loadAdminMe();
  if (currentUser) await loadAdminData();
  render();
}

async function loadAdminData() {
  await Promise.all([loadMasters(), loadUsers(), loadPlayerUsers(), loadAssets(), loadAnnouncements(), loadChangeBatches()]);
}

async function loadAdminMe() {
  const result = await fetchAdminJson("/api/admin/auth/me", {}, { suppressError: true });
  currentUser = result.ok && result.currentUser ? result.currentUser : null;
  if (!currentUser) {
    messageText = "";
    errorText = "";
  }
}

async function loadMasters() {
  const result = await fetchAdminJson("/api/admin/masters");
  if (!result.ok) return;

  currentUser = result.currentUser ?? currentUser;
  titles = result.masters?.titles ?? [];
  icons = result.masters?.icons ?? [];
  iconTypes = result.masters?.iconTypes ?? [];
}

async function loadUsers() {
  const result = await fetchAdminJson("/api/admin/users");
  if (!result.ok) return;

  currentUser = result.currentUser ?? currentUser;
  users = result.users ?? [];
}

async function loadPlayerUsers() {
  const params = new URLSearchParams();
  params.set("page", String(playerUserPagination.page));
  params.set("pageSize", String(ADMIN_LIST_PAGE_SIZE));
  if (playerUserQuery) params.set("q", playerUserQuery);

  const result = await fetchAdminJson(`/api/admin/player-users?${params.toString()}`);
  if (!result.ok) return;

  currentUser = result.currentUser ?? currentUser;
  playerUsers = result.playerUsers ?? [];
  playerUserPagination = result.pagination ?? playerUserPagination;
  playerUserSearchInput = result.query ?? playerUserQuery;
}

async function loadAssets() {
  const result = await fetchAdminJson("/api/admin/assets");
  if (!result.ok) return;

  assetIcons = result.assets?.icons ?? [];
  assetLoadingIllustrations = result.assets?.loadingIllustrations ?? [];
}

async function loadAnnouncements() {
  const result = await fetchAdminJson("/api/admin/announcements");
  if (!result.ok) return;

  currentUser = result.currentUser ?? currentUser;
  announcements = result.announcements ?? [];
}

async function loadChangeBatches() {
  const result = await fetchAdminJson("/api/admin/change-batches");
  if (!result.ok) return;

  changeBatches = result.changeBatches ?? [];
}

async function fetchAdminJson(path: string, init: RequestInit = {}, options: { suppressError?: boolean } = {}): Promise<AdminApiResponse> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "include",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    errorText = "通信に失敗しました。";
    return { ok: false };
  }

  return readAdminResponse(response, options);
}

async function fetchAdminFormJson(path: string, formData: FormData): Promise<AdminApiResponse> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
  } catch {
    errorText = "通信に失敗しました。";
    return { ok: false };
  }

  return readAdminResponse(response);
}

async function readAdminResponse(response: Response, options: { suppressError?: boolean } = {}): Promise<AdminApiResponse> {
  let result: AdminApiResponse = {};
  try {
    const parsed: unknown = await response.json();
    if (isRecord(parsed)) result = parsed as AdminApiResponse;
  } catch { }

  if (!response.ok || result.ok === false) {
    const message = result.message ?? "処理に失敗しました。";
    if (!options.suppressError) errorText = message;
    return { ok: false, message };
  }

  if (result.message) messageText = result.message;
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseJson<T = unknown>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getAdminDisplayName(user: { displayName?: string; email: string }) {
  const displayName = (user.displayName ?? "").trim();
  if (!displayName) return "";
  if (displayName.toLowerCase() === user.email.toLowerCase()) return "";
  return displayName;
}

function formatAdminIdentity(user: { displayName?: string; email: string; role?: AdminRole; roleLabel?: string }) {
  const displayName = getAdminDisplayName(user);
  const parts = displayName ? [displayName, user.email] : [user.email];
  if (user.role) parts.push(user.roleLabel ?? roleLabel(user.role));
  return parts.join(" / ");
}

function renderAdminIdentity(user: { displayName?: string; email: string; role?: AdminRole; roleLabel?: string }) {
  return formatAdminIdentity(user).split(" / ").map((part) => escapeHtml(part)).join(" / ");
}

function render() {
  if (!currentUser) {
    app.innerHTML = renderAdminLoginPage();
    bindAdminLoginEvents();
    return;
  }

  app.innerHTML = `
    <main class="adminPage">
      <div class="adminShell">
        <header class="adminHeader">
          <div>
            <div class="adminBrand">100GAME⁺</div>
            <h1>管理者ページ</h1>
            <p>${renderAdminIdentity(currentUser)}</p>
          </div>
          <button type="button" class="adminBtn" data-admin-logout>ログアウト</button>
        </header>
        ${currentUser.mustChangePassword ? `<div class="adminMessage is-error">初期パスワードのままです。管理者管理タブの自分の行からパスワードを変更してください。</div>` : ""}
        ${renderMessages()}
        ${renderTabs()}
        ${renderActiveTab()}
      </div>
    </main>
  `;

  bindCommonEvents();
  if (activeTab === "titles") bindTitleEvents();
  if (activeTab === "icons") bindIconEvents();
  if (activeTab === "assets") bindAssetEvents();
  if (activeTab === "loadingIllustrations") bindLoadingIllustrationEvents();
  if (activeTab === "announcements") bindAnnouncementEvents();
  if (activeTab === "changeBatches") bindChangeBatchEvents();
  if (activeTab === "playerUsers") bindPlayerUserEvents();
  if (activeTab === "users") bindUserEvents();
}

function renderMessages() {
  if (errorText) return `<div class="adminMessage is-error">${escapeHtml(errorText)}</div>`;
  if (messageText) return `<div class="adminMessage">${escapeHtml(messageText)}</div>`;
  return "";
}

function createDefaultAdminListPages(): Record<AdminListPageKey, number> {
  return {
    titles: 1,
    icons: 1,
    assetIcons: 1,
    assetLoadingIllustrations: 1,
    loadingIllustrations: 1,
    announcements: 1,
    changeBatches: 1,
    users: 1,
  };
}

function getAdminListTotalPages(total: number) {
  return Math.max(1, Math.ceil(total / ADMIN_LIST_PAGE_SIZE));
}

function getAdminListPage(key: AdminListPageKey, total: number) {
  const totalPages = getAdminListTotalPages(total);
  const currentPage = adminListPages[key] ?? 1;
  const page = Math.min(Math.max(currentPage, 1), totalPages);
  if (page !== currentPage) adminListPages[key] = page;
  return page;
}

function getPagedAdminItems<T>(key: AdminListPageKey, items: T[]) {
  const page = getAdminListPage(key, items.length);
  const start = (page - 1) * ADMIN_LIST_PAGE_SIZE;
  return items.slice(start, start + ADMIN_LIST_PAGE_SIZE);
}

function renderAdminPagination(key: AdminListPageKey, total: number) {
  const totalPages = getAdminListTotalPages(total);
  if (totalPages <= 1) return "";
  const page = getAdminListPage(key, total);
  return `
    <div class="adminPagination" data-admin-pagination="${key}">
      <button type="button" class="adminBtn" data-admin-page-key="${key}" data-admin-page-direction="previous" ${page > 1 ? "" : "disabled"}>前へ</button>
      <span class="adminMuted">${page} / ${totalPages}</span>
      <button type="button" class="adminBtn" data-admin-page-key="${key}" data-admin-page-direction="next" ${page < totalPages ? "" : "disabled"}>次へ</button>
    </div>
  `;
}

function resetAdminListPageForTab(tab: AdminTab) {
  if (tab === "titles") adminListPages.titles = 1;
  if (tab === "icons") adminListPages.icons = 1;
  if (tab === "assets") {
    adminListPages.assetIcons = 1;
    adminListPages.assetLoadingIllustrations = 1;
  }
  if (tab === "loadingIllustrations") adminListPages.loadingIllustrations = 1;
  if (tab === "announcements") adminListPages.announcements = 1;
  if (tab === "changeBatches") adminListPages.changeBatches = 1;
  if (tab === "users") adminListPages.users = 1;
}

function renderAdminLoginPage() {
  return `
    <main class="adminPage adminLoginPage">
      <section class="adminLoginCard">
        <div class="adminBrand">100GAME⁺</div>
        <h1>管理者ログイン</h1>
        <p class="adminMuted">管理者用のメールアドレスとパスワードを入力してください。100GAME⁺のプレイヤーログイン状態とは別管理です。</p>
        ${renderMessages()}
        <form id="adminLoginForm" class="adminForm">
          ${renderTextField("adminLoginEmail", "メールアドレス", "")}
          <div class="adminField">
            <label for="adminLoginPassword">パスワード</label>
            <input id="adminLoginPassword" name="adminLoginPassword" type="password" autocomplete="current-password">
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>ログイン</button>
          </div>
        </form>
      </section>
    </main>
  `;
}

function renderTabs() {
  return `
    <nav class="adminTabs" aria-label="管理メニュー">
      ${renderTabButton("titles", "称号管理")}
      ${renderTabButton("icons", "アイコン管理")}
      ${renderTabButton("assets", "画像素材管理")}
      ${renderTabButton("loadingIllustrations", "ロードイラスト管理")}
      ${renderTabButton("announcements", "お知らせ管理")}
      ${renderTabButton("changeBatches", "反映設定")}
      ${renderTabButton("playerUsers", "ユーザー管理")}
      ${renderTabButton("users", "管理者管理")}
    </nav>
  `;
}

function renderTabButton(tab: AdminTab, label: string) {
  return `<button type="button" class="adminTab${activeTab === tab ? " is-active" : ""}" data-tab="${tab}">${label}</button>`;
}

function renderActiveTab() {
  if (activeTab === "titles") return renderTitleTab();
  if (activeTab === "icons") return renderIconTab();
  if (activeTab === "assets") return renderAssetTab();
  if (activeTab === "loadingIllustrations") return renderLoadingIllustrationTab();
  if (activeTab === "announcements") return renderAnnouncementTab();
  if (activeTab === "changeBatches") return renderChangeBatchTab();
  if (activeTab === "playerUsers") return renderPlayerUserTab();
  return renderUserTab();
}

function renderTitleTab() {
  const visibleTitles = getPagedAdminItems("titles", titles);
  return `
    <section class="adminGrid is-list-only">
      <div class="adminCard">
        <div class="adminCardHeader">
          <h2>称号一覧</h2>
          <button type="button" class="adminBtn primary" data-open-title-create>称号追加</button>
        </div>
        <div class="adminTableWrap">
          <table class="adminTable">
            <thead><tr><th>並び</th><th>称号</th><th>状態</th><th>条件</th><th>操作</th></tr></thead>
            <tbody>${visibleTitles.map(renderTitleRow).join("") || `<tr><td colspan="5">称号がありません。</td></tr>`}</tbody>
          </table>
        </div>
        ${renderAdminPagination("titles", titles.length)}
      </div>
    </section>
    ${isTitleCreateModalOpen && titleWizardState ? renderTitleWizardModal() : ""}
    ${titleDeleteTargetId ? renderTitleDeleteModal(titles.find((title) => title.id === titleDeleteTargetId) ?? null) : ""}
  `;
}

function renderTitleRow(title: TitleMaster) {
  const hasPendingIconRewardChange = Boolean(findPendingTitleIconRewardsBatch(title.id));
  const pendingDelete = hasPendingTitleDelete(title.id);
  return `
    <tr>
      <td>${title.sortOrder}</td>
      <td>
        <strong>${escapeHtml(title.name)}</strong><br>
        <span class="adminMuted">${escapeHtml(title.code)}</span>
      </td>
      <td>
        <span class="adminBadge${title.isActive ? " is-on" : ""}">${title.isActive ? "公開" : "非公開"}</span>
        ${title.isInitial ? `<span class="adminBadge">初期</span>` : ""}
        ${title.iconRewardIds.length > 0 ? `<span class="adminBadge is-on">アイコン${title.iconRewardIds.length}</span>` : ""}
        ${hasPendingIconRewardChange ? `<span class="adminBadge is-owner">報酬変更あり</span>` : ""}
        ${pendingDelete ? `<span class="adminBadge is-danger">削除予定</span>` : ""}
      </td>
      <td><span class="adminMuted">${escapeHtml(title.conditionType)}</span></td>
      <td>${renderTitleManagementActions(title, hasPendingIconRewardChange, pendingDelete)}</td>
    </tr>
  `;
}

function renderTitleManagementActions(title: TitleMaster, hasPendingIconRewardChange: boolean, pendingDelete: boolean) {
  const editButton = `<button type="button" class="adminBtn" data-edit-title="${escapeAttribute(title.id)}">編集</button>`;
  if (pendingDelete) return `${editButton} <button type="button" class="adminBtn" disabled>削除予定</button>`;
  if (title.isInitial || title.id === getDefaultTitleId()) return `${editButton} <button type="button" class="adminBtn" disabled>削除不可</button>`;
  if (hasPendingIconRewardChange) return `${editButton} <button type="button" class="adminBtn" disabled>報酬変更あり</button>`;
  return `${editButton} <button type="button" class="adminBtn danger" data-open-title-delete="${escapeAttribute(title.id)}">削除</button>`;
}

function createTitleWizardState(title: TitleMaster | null): TitleWizardState {
  const graph = createTitleGraphFromMaster(title);
  const expression = buildTitleConditionExpression(graph);
  const basic: TitleBasicDraft = {
    titleId: title?.id ?? "",
    titleCode: title?.code ?? "",
    titleName: title?.name ?? "",
    description: title?.description ?? "",
    unlockConditionText: title?.unlockConditionText ?? expression,
    rarity: title?.rarity ?? 1,
    sortOrder: title?.sortOrder ?? nextSortOrder(titles),
    isInitial: title?.isInitial ?? false,
    isActive: title?.isActive ?? true,
    iconRewardIds: [...(title?.iconRewardIds ?? [])],
    titleIconRewardChangeReason: "",
    unlockConditionTextEdited: Boolean(title?.unlockConditionText),
  };
  return {
    step: "graph",
    graphMode: "visual",
    graph,
    graphJsonText: titleGraphConditionJson(graph),
    graphErrors: [],
    graphErrorNodeIds: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    editingConditionNodeId: null,
    deleteTarget: null,
    discardConfirmOpen: false,
    basic,
    dirty: false,
  };
}

function createTitleGraphFromMaster(title: TitleMaster | null): TitleConditionGraph {
  if (!title) return createEmptyTitleConditionGraph();
  const rawBuilder = parseJson<Record<string, unknown>>(title.conditionBuilderJson);
  const graph = parseTitleConditionGraph(rawBuilder);
  if (graph) return graph;
  const params = parseJson<Record<string, unknown>>(title.conditionParamsJson) ?? {};
  const conditionBuilder = rawBuilder && typeof rawBuilder === "object" ? rawBuilder : { version: 1, mode: "raw_json" };
  return createSingleConditionGraph({
    conditionType: title.conditionType,
    conditionParams: params,
    conditionBuilder,
    summary: summarizeTitleCondition(title.conditionType, params, conditionBuilder),
    legacyCompound: isCompoundConditionType(title.conditionType),
  });
}

function titleMasterFromConditionNode(node: TitleConditionGraphConditionNode): TitleMaster {
  return {
    id: node.id,
    code: "",
    name: "",
    description: "",
    unlockConditionText: "",
    rarity: 1,
    conditionType: node.conditionType,
    conditionParamsJson: JSON.stringify(node.conditionParams),
    conditionBuilderJson: JSON.stringify(node.conditionBuilder),
    isInitial: node.conditionType === "initial_grant",
    isActive: true,
    sortOrder: 0,
    iconRewardIds: [],
    updatedAt: "",
  };
}

function summarizeTitleCondition(conditionType: string, params: Record<string, unknown>, builder: Record<string, unknown>) {
  const templateId = typeof builder.templateId === "string" ? builder.templateId : "";
  const template = templateId ? getTitleConditionTemplate(templateId) : null;
  const parts: string[] = [template?.label ?? conditionType];
  const playStyle = typeof builder.playStyle === "string" ? builder.playStyle : typeof params.scope === "string" ? params.scope : "";
  if (playStyle === "solo") parts.push("ソロ");
  if (playStyle === "multi") parts.push("マルチ");
  const gameMode = typeof builder.gameMode === "string" ? builder.gameMode : "";
  if (gameMode === "normal") parts.push("通常");
  if (gameMode === "hidden") parts.push("HIDDEN");
  const value = Number(builder.value ?? params.value);
  const operator = typeof builder.operator === "string" ? builder.operator : conditionType.endsWith("_at_most") ? "<=" : ">=";
  if (Number.isFinite(value) && !Number.isNaN(value)) parts.push(`${operator}${Math.trunc(value)}`);
  if (typeof builder.assetTargetId === "string" && builder.assetTargetId && builder.assetTargetId !== "any") {
    const icon = icons.find((item) => item.id === builder.assetTargetId);
    parts.push(icon?.name ?? builder.assetTargetId);
  }
  if (typeof builder.experienceDetail === "string") parts.push(readTitleConditionExperienceDetailLabel(builder.experienceDetail));
  if (typeof builder.jokerEventDetail === "string") parts.push(readTitleConditionJokerEventDetailLabel(builder.jokerEventDetail));
  if (typeof builder.rematchRecord === "string") parts.push(builder.rematchRecord === "alive" ? "ALIVE" : builder.rematchRecord === "dead" ? "DEAD" : "連戦");
  return parts.filter(Boolean).join(" / ");
}

function readTitleConditionExperienceDetailLabel(value: string) {
  const labels: Record<string, string> = {
    alive: "ALIVE",
    dead: "DEAD",
    normal_finish: "通常決着",
    void_match: "無効試合",
    redeal: "再配布",
    timeout_deck_play: "時間切れ山札使用",
    timeout_only_finish: "時間切れ山札使用のみで終了",
  };
  return labels[value] ?? value;
}

function readTitleConditionJokerEventDetailLabel(value: string) {
  const labels: Record<string, string> = {
    spade3_counter: "JOKERを♠3で無効化",
    my_joker_countered: "JOKERが♠3で無効化",
    joker_after_previous_joker: "JOKER後にJOKER使用",
    joker_used_match_dead: "JOKER使用試合でDEAD",
    joker_bust: "JOKER起因DEAD",
    dead_with_joker_in_hand: "JOKER所持中DEAD",
  };
  return labels[value] ?? value;
}

function titleGraphConditionJson(graph: TitleConditionGraph) {
  const built = buildConditionTreeFromGraph(graph);
  return built.ok ? JSON.stringify(built.tree, null, 2) : "";
}

function nextTitleGraphNodeId(graph: TitleConditionGraph, prefix: "condition" | "operator") {
  let index = 1;
  const ids = new Set(graph.nodes.map((node) => node.id));
  while (ids.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

function nextTitleGraphEdgeId(graph: TitleConditionGraph) {
  let index = 1;
  const ids = new Set(graph.edges.map((edge) => edge.id));
  while (ids.has(`edge-${index}`)) index += 1;
  return `edge-${index}`;
}


function renderTitleConditionBuilder(title: TitleMaster | null) {
  const state = createTitleConditionInitialState(title) as TitleConditionPreviewInput & TitleConditionPreview;
  const template = getTitleConditionTemplate(state.templateId);
  const valueDisabled = isTitleConditionValueDisabled(template);
  const operatorHidden = isTitleConditionOperatorHidden(template, state.experienceDetail, state.experienceUnit, state.jokerEventDetail, state.jokerEventUnit);
  const valueHidden = isTitleConditionValueHidden(template, state.jokerEventDetail, state.jokerEventUnit);
  const playStyleHidden = isTitleConditionPlayStyleHidden(template);
  const gameModeHidden = isTitleConditionGameModeHidden(template);
  const valueLabel = getTitleConditionValueLabel(template);
  return `
      <div class="adminConditionBox adminFull" data-title-condition-builder>
        <input type="hidden" id="conditionType" name="conditionType" value="${escapeAttribute(state.conditionType)}">
        <input type="hidden" id="conditionParamsJson" name="conditionParamsJson" value="${escapeAttribute(state.conditionParamsJson)}">
        <input type="hidden" id="conditionBuilderJson" name="conditionBuilderJson" value="${escapeAttribute(state.conditionBuilderJson)}">
        <input type="hidden" id="conditionInputMode" name="conditionInputMode" value="${escapeAttribute(state.mode)}">
        <div class="adminConditionHeader">
          <div>
            <h3>称号条件</h3>
            <p class="adminMuted">デフォルトはコードレス入力です。JSON入力は必要な場合だけ使用します。</p>
          </div>
          <button type="button" class="adminBtn" data-open-title-condition-json>JSONで記載</button>
        </div>
        <div class="adminFormGrid">
          ${renderSelectField("titleConditionTemplate", "条件対象", getTitleConditionTemplateOptions(state.templateId), state.templateId)}
          ${renderConditionFieldVisibility(renderSelectField("titleConditionPlayStyle", getTitleConditionPlayStyleLabel(template), [
            { value: "any", label: "指定なし" },
            { value: "solo", label: "ソロ" },
            { value: "multi", label: "マルチ" },
          ], state.playStyle), playStyleHidden)}
          ${renderConditionFieldVisibility(renderSelectField("titleConditionGameMode", "ゲームモード", [
            { value: "any", label: "指定なし" },
            { value: "normal", label: "通常" },
            { value: "hidden", label: "HIDDEN（未実装）" },
          ], state.gameMode), gameModeHidden)}
          ${renderConditionFieldVisibility(renderSelectField("titleConditionOperator", "比較", TITLE_CONDITION_OPERATORS.map((item) => ({ value: item.value, label: item.label })), state.operator, valueDisabled), operatorHidden)}
          ${renderConditionFieldVisibility(renderNumberFieldWithDisabled("titleConditionValue", valueLabel, state.value, getTitleConditionValueMin(template), 999999999, valueDisabled), valueHidden)}
        </div>
        ${renderTitleConditionMatchCountControls(state)}
        ${renderTitleConditionCardPlayCountControls(state)}
        ${renderTitleConditionCardControls(state)}
        ${renderTitleConditionAssetControls(state)}
        ${renderTitleConditionExperienceControls(state)}
        ${renderTitleConditionJokerEventControls(state)}
        ${renderTitleConditionMatchCountCompareControls(state)}
        ${renderTitleConditionRematchSessionControls(state)}
        ${renderTitleConditionHostOtherLeaveControls(state)}
        ${renderTitleConditionParticipantIconControls(state)}
        ${renderTitleConditionLoseCertainEventControls(state)}
        ${renderTitleConditionNgNameControls(state)}
        <p class="adminConditionStatus${state.implemented ? "" : " is-error"}" data-title-condition-status>${escapeHtml(state.message)}</p>
        <div class="adminConditionPreview">
          <strong>生成結果プレビュー</strong>
          <div><span>condition_type</span><code data-title-condition-type-preview>${escapeHtml(state.conditionType || "-")}</code></div>
          <div><span>condition_params_json</span><pre data-title-condition-params-preview>${escapeHtml(state.conditionParamsJson || "-")}</pre></div>
          <div><span>condition_builder_json</span><pre data-title-condition-builder-preview>${escapeHtml(state.conditionBuilderJson || "-")}</pre></div>
        </div>
      </div>`;
}


function renderTitleConditionMatchCountControls(state: TitleConditionPreviewInput & TitleConditionPreview) {
  const template = getTitleConditionTemplate(state.templateId);
  const difficulty = readTitleConditionDifficulty(state.difficulty);
  const gameType = readTitleConditionGameType(state.gameType);
  const isPlayCount = template.kind === "play_count";
  return `
        <div class="adminConditionDifficultyArea adminFull" data-title-condition-difficulty-area${isPlayCount ? "" : " hidden"}>
          ${renderSelectField("titleConditionDifficulty", "難易度", TITLE_CONDITION_DIFFICULTIES.map((item) => ({ value: item.value, label: item.label })), difficulty, isPlayCount && gameType !== "any")}
        </div>
        <div class="adminConditionGameTypeArea adminFull" data-title-condition-game-type-area${isPlayCount ? "" : " hidden"}>
          ${renderSelectField("titleConditionGameType", "ゲームタイプ", TITLE_CONDITION_GAME_TYPES.map((item) => ({ value: item.value, label: item.label })), gameType, isPlayCount && difficulty !== "any")}
          <p class="adminMuted">難易度とゲームタイプはどちらか一方のみ指定できます。</p>
        </div>`;
}

function renderTitleConditionCardPlayCountControls(state: TitleConditionPreviewInput & TitleConditionPreview) {
  const template = getTitleConditionTemplate(state.templateId);
  const isCardPlayCount = template.kind === "card_play_count";
  const source = readTitleConditionCardPlaySource(state.cardPlaySource);
  const actor = readTitleConditionCardPlayActor(state.cardPlayActor);
  const group = readTitleConditionCardPlayGroup(state.cardPlayGroup, template);
  return `
        <div class="adminConditionCardPlayCountArea adminFull" data-title-condition-card-play-count-area${isCardPlayCount ? "" : " hidden"}>
          <div class="adminFormGrid">
            ${renderConditionFieldVisibility(renderSelectField("titleConditionCardPlayGroup", "カード種別", TITLE_CONDITION_CARD_PLAY_GROUPS.map((item) => ({ value: item.value, label: item.label })), group), template.id !== "specific_card_play_count")}
            ${renderSelectField("titleConditionCardPlaySource", "使用元", TITLE_CONDITION_CARD_PLAY_SOURCES.map((item) => ({ value: item.value, label: item.label })), source)}
            ${renderSelectField("titleConditionCardPlayActor", "カウント対象", TITLE_CONDITION_CARD_PLAY_ACTORS.map((item) => ({ value: item.value, label: item.label })), actor)}
          </div>
          <p class="adminMuted">「自分の前の手番」は試合開始時の確定手番順における直前席です。全体には自分・他ユーザー・NPCを含みます。</p>
        </div>`;
}

function renderTitleConditionAssetControls(state: TitleConditionPreviewInput & TitleConditionPreview) {
  const template = getTitleConditionTemplate(state.templateId);
  const isAssetTemplate = template.kind === "asset_count";
  const assetType = resolveTitleConditionAssetType(template, state.assetType);
  const isUnifiedAssetTemplate = template.id === "asset_usage_count";
  const iconTargetId = assetType === "icon" ? normalizeTitleConditionAssetTargetId(state.assetTargetId) : "any";
  const illustrationTargetId = assetType === "loading_illustration" ? normalizeTitleConditionAssetTargetId(state.assetTargetId) : "any";
  return `
        <div class="adminConditionAssetArea adminFull" data-title-condition-asset-area${isAssetTemplate ? "" : " hidden"}>
          <div class="adminFormGrid">
            <div class="adminField" data-title-condition-asset-kind-field${isUnifiedAssetTemplate ? "" : " hidden"}>
              <label for="titleConditionAssetType">素材種別</label>
              <select id="titleConditionAssetType" name="titleConditionAssetType">
                <option value="loading_illustration" ${assetType === "loading_illustration" ? "selected" : ""}>ロードイラスト</option>
                <option value="icon" ${assetType === "icon" ? "selected" : ""}>アイコン</option>
              </select>
            </div>
            <div class="adminField" data-title-condition-asset-type="loading_illustration"${assetType === "loading_illustration" ? "" : " hidden"}>
              <label for="titleConditionIllustrationTargetId">対象素材</label>
              <select id="titleConditionIllustrationTargetId" name="titleConditionIllustrationTargetId">
                <option value="any" ${illustrationTargetId === "any" ? "selected" : ""}>指定なし</option>
                ${assetLoadingIllustrations.filter((item) => !hasPendingLoadingIllustrationDelete(item.id)).map((item) => `<option value="${escapeAttribute(item.id)}" ${item.id === illustrationTargetId ? "selected" : ""}>${escapeHtml(`${item.name} / ${item.code}`)}</option>`).join("")}
              </select>
            </div>
            <div class="adminField" data-title-condition-asset-type="icon"${assetType === "icon" ? "" : " hidden"}>
              <label for="titleConditionIconTargetId">対象素材</label>
              <select id="titleConditionIconTargetId" name="titleConditionIconTargetId">
                <option value="any" ${iconTargetId === "any" ? "selected" : ""}>指定なし</option>
                ${icons.filter((item) => !hasPendingIconDelete(item.id)).map((item) => `<option value="${escapeAttribute(item.id)}" ${item.id === iconTargetId ? "selected" : ""}>${escapeHtml(`${item.name} / ${item.code}`)}</option>`).join("")}
              </select>
            </div>
          </div>
          <p class="adminMuted" data-title-condition-asset-note>${assetType === "loading_illustration" ? "指定なしの場合は、ロード画面に何らかのロードイラストが表示された総回数を条件にします。" : "指定なしの場合は、何らかのアイコンを設定した状態でゲームを開始した総回数を条件にします。"}</p>
        </div>`;
}


function renderTitleConditionExperienceControls(state: TitleConditionPreviewInput & TitleConditionPreview) {
  const template = getTitleConditionTemplate(state.templateId);
  const isExperienceTemplate = template.kind === "experience";
  const detail = readTitleConditionExperienceDetail(state.experienceDetail);
  const unit = readTitleConditionExperienceUnit(state.experienceUnit);
  const actor = readTitleConditionExperienceActor(state.experienceActor);
  const unitHidden = !isTitleConditionExperienceUnitSelectable(detail);
  const actorHidden = !isTitleConditionExperienceActorVisible(detail, unit);
  return `
        <div class="adminConditionExperienceArea adminFull" data-title-condition-experience-area${isExperienceTemplate ? "" : " hidden"}>
          <div class="adminFormGrid">
            ${renderSelectField("titleConditionExperienceDetail", "詳細", TITLE_CONDITION_EXPERIENCE_DETAILS.map((item) => ({ value: item.value, label: item.label })), detail)}
            <div class="adminField" data-title-condition-experience-unit-field${unitHidden ? " hidden" : ""}>
              <label for="titleConditionExperienceUnit">集計単位</label>
              <select id="titleConditionExperienceUnit" name="titleConditionExperienceUnit">
                ${TITLE_CONDITION_EXPERIENCE_UNITS.map((item) => `<option value="${escapeAttribute(item.value)}" ${item.value === unit ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
              </select>
            </div>
            <div class="adminField" data-title-condition-experience-actor-field${actorHidden ? " hidden" : ""}>
              <label for="titleConditionExperienceActor">カウント対象</label>
              <select id="titleConditionExperienceActor" name="titleConditionExperienceActor">
                ${TITLE_CONDITION_EXPERIENCE_ACTORS.map((item) => `<option value="${escapeAttribute(item.value)}" ${item.value === actor ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
              </select>
            </div>
          </div>
          <p class="adminMuted" data-title-condition-experience-actor-note${actorHidden ? " hidden" : ""}>手番①～③は、自分の次から順に手番が来る参加者を指します。NPCも対象となり、途中退出後は同じ席として扱います。</p>
          <p class="adminMuted">再配布と時間切れによる山札使用は、累計または1試合内を選択できます。1試合内だけ比較条件を選択できます。</p>
        </div>`;
}


function renderTitleConditionJokerEventControls(state: TitleConditionPreviewInput & TitleConditionPreview) {
  const template = getTitleConditionTemplate(state.templateId);
  const isJokerEventTemplate = template.kind === "joker_event";
  const detail = readTitleConditionJokerEventDetail(state.jokerEventDetail);
  const unitSelectable = isTitleConditionJokerEventUnitSelectable(detail);
  const unit = normalizeTitleConditionJokerEventUnit(detail, state.jokerEventUnit);
  const actor = unit === "match" ? readTitleConditionJokerEventActor(state.jokerEventActor) : "self";
  const actorHidden = !unitSelectable || unit !== "match";
  return `
        <div class="adminConditionJokerEventArea adminFull" data-title-condition-joker-event-area${isJokerEventTemplate ? "" : " hidden"}>
          <div class="adminFormGrid">
            ${renderSelectField("titleConditionJokerEventDetail", "イベント内容", TITLE_CONDITION_JOKER_EVENT_DETAILS.map((item) => ({ value: item.value, label: item.label })), detail)}
            <div class="adminField" data-title-condition-joker-event-unit-field${unitSelectable ? "" : " hidden"}>
              <label for="titleConditionJokerEventUnit">集計単位</label>
              <select id="titleConditionJokerEventUnit" name="titleConditionJokerEventUnit">
                ${TITLE_CONDITION_JOKER_EVENT_UNITS.map((item) => `<option value="${escapeAttribute(item.value)}" ${item.value === unit ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
              </select>
            </div>
            <div class="adminField" data-title-condition-joker-event-actor-field${actorHidden ? " hidden" : ""}>
              <label for="titleConditionJokerEventActor">カウント対象</label>
              <select id="titleConditionJokerEventActor" name="titleConditionJokerEventActor">
                ${TITLE_CONDITION_JOKER_EVENT_ACTORS.map((item) => `<option value="${escapeAttribute(item.value)}" ${item.value === actor ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
              </select>
            </div>
          </div>
          <p class="adminMuted" data-title-condition-joker-event-actor-note${actorHidden ? " hidden" : ""}>手番①～③は、自分の次から順に手番が来る参加者を指します。NPCも対象となり、途中退出後は同じ席として扱います。指定なしは4席を合計せず、いずれか1席が成立すれば条件成立です。</p>
          <p class="adminMuted" data-title-condition-joker-event-detail-note>${escapeHtml(getTitleConditionJokerEventDetailOption(detail).note)}</p>
          <p class="adminMuted">上3つの回数イベントは累計または1試合内を選択できます。下3つのDEADイベントは累計固定で、自分の累計回数を指定回数以上で判定します。</p>
        </div>`;
}

function renderTitleConditionMatchCountCompareControls(state: TitleConditionPreviewInput & TitleConditionPreview) {
  const template = getTitleConditionTemplate(state.templateId);
  const isMatchCountCompareTemplate = template.kind === "match_count_compare";
  const actor = readTitleConditionMatchCountCompareActor(state.matchCountCompareActor);
  const leftMetric = readTitleConditionMatchCountCompareMetric(state.matchCountCompareLeftMetric);
  const compareOperator = readTitleConditionMatchCountCompareOperator(state.matchCountCompareOperator);
  const right = readTitleConditionMatchCountCompareRight(state.matchCountCompareRight);
  const value = Math.max(0, Math.floor(state.matchCountCompareValue ?? 0));
  const rightOptions = [
    { value: "fixed_value", label: "固定値" },
    ...TITLE_CONDITION_MATCH_COUNT_COMPARE_METRICS.filter((item) => item.value !== leftMetric),
  ];
  return `
        <div class="adminConditionMatchCountCompareArea adminFull" data-title-condition-match-count-compare-area${isMatchCountCompareTemplate ? "" : " hidden"}>
          <div class="adminFormGrid">
            ${renderSelectField("titleConditionMatchCountCompareActor", "カウント対象", TITLE_CONDITION_MATCH_COUNT_COMPARE_ACTORS.map((item) => ({ value: item.value, label: item.label })), actor)}
            ${renderSelectField("titleConditionMatchCountCompareLeftMetric", "比較元", TITLE_CONDITION_MATCH_COUNT_COMPARE_METRICS.map((item) => ({ value: item.value, label: item.label })), leftMetric)}
            ${renderSelectField("titleConditionMatchCountCompareOperator", "比較条件", TITLE_CONDITION_MATCH_COUNT_COMPARE_OPERATORS.map((item) => ({ value: item.value, label: item.label })), compareOperator)}
            ${renderSelectField("titleConditionMatchCountCompareRight", "比較先", rightOptions, right)}
            ${renderConditionFieldVisibility(renderNumberFieldWithDisabled("titleConditionMatchCountCompareValue", "値", value, 0, 999999999), right !== "fixed_value")}
          </div>
          <p class="adminMuted">手番①～③は、自分の次から順に手番が来る参加者を指します。NPCも対象となり、途中退出後は同じ席として扱います。指定なしは4席を合計せず、各席を個別に比較して、いずれか1席が成立すれば条件成立です。</p>
          <p class="adminMuted">回数項目同士の比較では、両方が0回の場合は不成立です。比較先が固定値の場合だけ値を使用します。</p>
        </div>`;
}


function renderTitleConditionRematchSessionControls(state: TitleConditionPreviewInput & TitleConditionPreview) {
  const template = getTitleConditionTemplate(state.templateId);
  const isRematchTemplate = template.kind === "rematch_session";
  const record = readTitleConditionRematchRecord(state.rematchRecord);
  const mode = readTitleConditionRematchMode(state.rematchMode, record);
  return `
        <div class="adminConditionRematchArea adminFull" data-title-condition-rematch-area${isRematchTemplate ? "" : " hidden"}>
          <div class="adminFormGrid">
            ${renderSelectField("titleConditionRematchRecord", "記録", TITLE_CONDITION_REMATCH_RECORDS.map((item) => ({ value: item.value, label: item.label })), record)}
            ${renderConditionFieldVisibility(renderSelectField("titleConditionRematchMode", "集計方法", TITLE_CONDITION_REMATCH_MODES.map((item) => ({ value: item.value, label: item.label })), mode), record === "any")}
          </div>
          <p class="adminMuted">ホームに戻らず「もう一度プレイする」で続けた連戦内の記録を条件にします。記録が指定なしの場合は連戦した試合数で判定します。</p>
        </div>`;
}

function renderTitleConditionHostOtherLeaveControls(state: TitleConditionPreviewInput & TitleConditionPreview) {
  const template = getTitleConditionTemplate(state.templateId);
  const isHostOtherLeaveTemplate = template.kind === "host_other_leave";
  const startCount = readTitleConditionHostOtherLeaveStartCount(state.hostOtherLeaveStartCount);
  const pattern = readTitleConditionHostOtherLeavePattern(state.hostOtherLeavePattern);
  return `
        <div class="adminConditionHostOtherLeaveArea adminFull" data-title-condition-host-other-leave-area${isHostOtherLeaveTemplate ? "" : " hidden"}>
          <div class="adminFormGrid">
            ${renderSelectField("titleConditionHostOtherLeaveStartCount", "開始時の人間参加者数", TITLE_CONDITION_HOST_OTHER_LEAVE_START_COUNTS.map((item) => ({ value: item.value, label: item.label })), startCount)}
            ${renderSelectField("titleConditionHostOtherLeavePattern", "退出パターン", TITLE_CONDITION_HOST_OTHER_LEAVE_PATTERNS.map((item) => ({ value: item.value, label: item.label })), pattern)}
          </div>
          <p class="adminMuted">自分がHOSTのマルチで、開始時のHOST以外の人間参加者が全員途中退出した場合にカウントします。退出パターン指定なしは、抜け方を問わず全員途中退出で判定します。</p>
        </div>`;
}

function renderTitleConditionParticipantIconControls(state: TitleConditionPreviewInput & TitleConditionPreview) {
  const template = getTitleConditionTemplate(state.templateId);
  const isParticipantTemplate = template.kind === "participant_icon_composition";
  const specMode = readTitleConditionParticipantSpecMode(state.participantSpecMode);
  const participantOrder = readTitleConditionParticipantOrder(state.participantOrder);
  const slots = normalizeTitleConditionParticipantSlots(state.participantSlots);
  return `
        <div class="adminConditionParticipantArea adminFull" data-title-condition-participant-area${isParticipantTemplate ? "" : " hidden"}>
          <div class="adminFormGrid">
            <div class="adminField">
              <label for="titleConditionParticipantSpecMode">指定条件</label>
              <select id="titleConditionParticipantSpecMode" name="titleConditionParticipantSpecMode">
                <option value="icon" ${specMode === "icon" ? "selected" : ""}>アイコンで指定</option>
                <option value="icon_type" ${specMode === "icon_type" ? "selected" : ""}>アイコン種別で指定</option>
              </select>
            </div>
            ${renderSelectField("titleConditionParticipantOrder", "各手番の並び順", [
              { value: "unordered", label: "順不同" },
              { value: "turn_order", label: "順番も一致" },
            ], participantOrder)}
          </div>
          <div class="adminConditionParticipantGrid">
            ${slots.map((slot, index) => renderTitleConditionParticipantSlot(index, slot)).join("")}
          </div>
          <p class="adminMuted">「自分」は手番1〜4のうち必ず1つだけ必要です。他プレイヤーにはNPCを含めません。NPCを選ぶとアイコンはNPC固定になります。</p>
        </div>`;
}


function renderTitleConditionLoseCertainEventControls(state: TitleConditionPreviewInput & TitleConditionPreview) {
  const template = getTitleConditionTemplate(state.templateId);
  const isLoseCertainTemplate = template.kind === "lose_certain_event";
  const role = readTitleConditionLoseCertainRole(state.loseCertainRole);
  const action = readTitleConditionLoseCertainAction(state.loseCertainAction, role);
  return `
        <div class="adminConditionLoseCertainArea adminFull" data-title-condition-lose-certain-area${isLoseCertainTemplate ? "" : " hidden"}>
          <div class="adminFormGrid">
            ${renderSelectField("titleConditionLoseCertainRole", "自分の立場", [
              { value: "creator", label: "作成者" },
              { value: "target", label: "対象者" },
              { value: "witness", label: "第三者" },
            ], role)}
            <div class="adminField">
              <label for="titleConditionLoseCertainAction">その後の行動</label>
              <select id="titleConditionLoseCertainAction" name="titleConditionLoseCertainAction">
                ${getTitleConditionLoseCertainActionOptions(role).map((option) => `<option value="${escapeAttribute(option.value)}" ${option.value === action ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
              </select>
            </div>
          </div>
          <p class="adminMuted">負け確イベント発生後、対象者が♠3返し/DEAD/退出するか、負け確状態が解消されるか、試合が終了するまで追跡します。必要回数以上で取得します。</p>
        </div>`;
}

function renderTitleConditionNgNameControls(state: TitleConditionPreviewInput & TitleConditionPreview) {
  const template = getTitleConditionTemplate(state.templateId);
  const isNgNameTemplate = template.kind === "ng_name_streak";
  const ngName = readTitleConditionNgName(state.ngName);
  return `
        <div class="adminConditionNgNameArea adminFull" data-title-condition-ng-name-area${isNgNameTemplate ? "" : " hidden"}>
          <div class="adminField">
            <label for="titleConditionNgName">対象NGネーム</label>
            <select id="titleConditionNgName" name="titleConditionNgName">
              ${TITLE_CONDITION_NG_NAME_OPTIONS.map((word) => `<option value="${escapeAttribute(word)}" ${word === ngName ? "selected" : ""}>${escapeHtml(word)}</option>`).join("")}
            </select>
          </div>
          <p class="adminMuted">選択したNGネームを入力して決定ボタンを押し、NGネームエラーになった連続回数が必要回数以上になった場合に取得します。別の名前で決定した場合や、空欄など別エラーの場合は連続回数がリセットされます。</p>
        </div>`;
}

function renderTitleConditionParticipantSlot(index: number, slot: TitleConditionParticipantSlotInput) {
  const relation = readTitleConditionParticipantRelation(slot.relation);
  const iconId = relation === "npc" ? TITLE_CONDITION_NPC_ICON_ID : normalizeTitleConditionParticipantIconId(slot.iconId);
  const iconTypeId = relation === "npc" ? "any" : normalizeTitleConditionParticipantIconTypeId(slot.iconTypeId);
  return `
            <div class="adminConditionParticipantSlot" data-title-condition-participant-slot="${index}">
              <span>手番${index + 1}</span>
              <select name="titleConditionParticipantRelation${index}">
                ${[
                  { value: "any", label: "指定なし" },
                  { value: "self", label: "自分" },
                  { value: "other", label: "他プレイヤー" },
                  { value: "npc", label: "NPC" },
                ].map((option) => `<option value="${escapeAttribute(option.value)}" ${option.value === relation ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
              </select>
              <select name="titleConditionParticipantIcon${index}" data-participant-icon-select ${relation === "npc" ? "disabled" : ""}>
                <option value="any" ${iconId === "any" ? "selected" : ""}>アイコン指定なし</option>
                ${icons.filter((item) => !hasPendingIconDelete(item.id)).map((item) => `<option value="${escapeAttribute(item.id)}" ${item.id === iconId ? "selected" : ""}>${escapeHtml(`${item.name} / ${item.code}`)}</option>`).join("")}
                <option value="${TITLE_CONDITION_NPC_ICON_ID}" ${iconId === TITLE_CONDITION_NPC_ICON_ID ? "selected" : ""} disabled>NPC固定</option>
              </select>
              <select name="titleConditionParticipantIconType${index}" data-participant-icon-type-select ${relation === "npc" ? "disabled" : ""}>
                <option value="any" ${iconTypeId === "any" ? "selected" : ""}>種別指定なし</option>
                ${iconTypes.map((item) => `<option value="${escapeAttribute(item.id)}" ${item.id === iconTypeId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
              </select>
            </div>`;
}

function renderTitleConditionCardControls(state: TitleConditionPreviewInput & TitleConditionPreview) {
  const template = getTitleConditionTemplate(state.templateId);
  const isCardTemplate = isTitleConditionCardTemplate(template);
  const cardRule = normalizeTitleConditionCardRuleForTemplate(template, state.cardRule);
  const cards = state.cards ?? [];
  if (template.kind === "table_suit_all") {
    const selectedSuits = new Set(cards.map((card) => normalizeTitleConditionSuit(card.suit)).filter((cardSuit) => cardSuit !== "any"));
    const allSuitRule = normalizeTitleConditionAllSuitRuleForCount(state.allSuitRule, selectedSuits.size);
    return `
        <div class="adminConditionCardArea" data-title-condition-card-area data-title-condition-card-mode="table_suit_all"${isCardTemplate ? "" : " hidden"}>
          <div class="adminField adminSuitChoiceField">
            <span class="adminFieldLabel">指定スート</span>
            <div class="adminSuitChoiceGrid" role="group" aria-label="指定スート">
              ${TITLE_CONDITION_CARD_SUITS.filter((suit) => suit !== "any").map((suit) => `
                <label class="adminSuitChoice">
                  <input type="checkbox" name="titleConditionAllSuit" value="${escapeAttribute(suit)}" ${selectedSuits.has(suit) ? "checked" : ""}>
                  <span>${escapeHtml(titleConditionSuitLabel(suit))}</span>
                </label>`).join("")}
            </div>
          </div>
          <div class="adminField">
            <label for="titleConditionAllSuitRule">含み方</label>
            <select id="titleConditionAllSuitRule" name="titleConditionAllSuitRule">
              ${getTitleConditionAllSuitRuleOptions(selectedSuits.size).map((option) => `<option value="${escapeAttribute(option.value)}" ${option.value === allSuitRule ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
            </select>
          </div>
          <p class="adminMuted">場に出たカードのスート種類が、選択したスート条件に一致した場合に成立します。JOKERが1枚でも出た試合は不成立です。</p>
        </div>`;
  }
  const hideHandCards = false;
  const cardTargetRange = readTitleConditionCardTargetRange(state.cardTargetRange);
  const isUnifiedTemplate = isUnifiedTitleConditionCardTemplate(template);
  const showSameSuit = template.kind === "card_sequence" && template.id !== "consecutive_played_cards";
  const cardMode = template.id === "field_play_sequence"
    ? "field_card_grid"
    : template.id === "consecutive_played_cards"
      ? `consecutive_card_grid_${cardTargetRange}`
      : template.id === "played_card_set"
        ? "unified_card_set"
        : template.id === "initial_hand_sequence"
          ? `initial_hand_card_grid_${cardRule}`
          : "card_grid";
  return `
        <div class="adminConditionCardArea" data-title-condition-card-area data-title-condition-card-mode="${cardMode}"${isCardTemplate ? "" : " hidden"}>
          <div class="adminFormGrid">
            ${template.id === "initial_hand_sequence" ? `<div class="adminField">
              <label for="titleConditionHandTarget">判定対象</label>
              <select id="titleConditionHandTarget" name="titleConditionHandTarget">
                ${[
                  { value: "self", label: "自分" },
                  { value: "next_1", label: "1番手" },
                  { value: "next_2", label: "2番手" },
                  { value: "next_3", label: "3番手" },
                ].map((option) => `<option value="${escapeAttribute(option.value)}" ${option.value === readTitleConditionHandTarget(state.handTarget) ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
              </select>
            </div>
            <div class="adminField">
              <label for="titleConditionHandTiming">判定タイミング</label>
              <select id="titleConditionHandTiming" name="titleConditionHandTiming">
                <option value="initial" ${readTitleConditionHandTiming(state.handTiming) === "initial" ? "selected" : ""}>初期手札のみ</option>
                <option value="in_match" ${readTitleConditionHandTiming(state.handTiming) === "in_match" ? "selected" : ""}>試合中に一度でも</option>
              </select>
            </div>` : ""}
            ${isUnifiedTemplate ? `<div class="adminField">
              <label for="titleConditionCardTargetRange">対象範囲</label>
              <select id="titleConditionCardTargetRange" name="titleConditionCardTargetRange">
                ${TITLE_CONDITION_CARD_TARGET_RANGES.map((option) => `<option value="${escapeAttribute(option.value)}" ${option.value === cardTargetRange ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
              </select>
            </div>` : ""}
            ${renderTitleConditionCardRuleField(template, cardRule)}
            <label class="adminCheck adminFull" data-title-condition-same-suit-row${showSameSuit ? "" : " hidden"}><input type="checkbox" name="titleConditionSameSuit" ${state.sameSuit ? "checked" : ""}> 全カード同一スートとして判定する</label>
          </div>
          ${template.id === "initial_hand_sequence" ? `<p class="adminMuted">1番手～3番手は、自分の次から順に手番が来る参加者を指します。「試合中に一度でも」は初期手札を含みます。初期手札のみの順番判定は、配布時の手札順を基準に判定します。</p>` : ""}
          <div class="adminConditionCardGrid" data-title-condition-card-grid${hideHandCards ? " hidden" : ""}>
            ${Array.from({ length: TITLE_CONDITION_CARD_SLOT_COUNT }, (_, index) => renderTitleConditionCardSlot(index, cards[index], template, cardTargetRange, cardRule, template.kind === "hand_sequence" && index >= 4)).join("")}
          </div>
          <p class="adminMuted" data-title-condition-card-grid-note${hideHandCards ? " hidden" : ""}>${template.id === "consecutive_played_cards"
            ? "指定した枚数分の出札が途中に別カードを挟まず連続した場合に成立します。スートはボタンから複数選択でき、選択したいずれかに一致すれば成立します。順不同でも重複カードを1回ずつ別の出札として判定します。JOKERはスート指定なしで扱います。"
            : "未指定行は無視します。ランクのみ・スートのみ・ランク＋スートは入力内容から自動判定します。JOKERはランクJOKERを選ぶとスート指定なしで扱います。手札条件ではカード1〜4のみ使用します。"}</p>
          <p class="adminMuted" data-title-condition-same-rank-note${cardRule === "same_rank" ? "" : " hidden"}>どこか1つのランクを変更すると、ほか3枚にも同じランクを自動反映します。A～Kの同じランク4枚で判定します。</p>
          <p class="adminMuted" data-title-condition-same-suit-note${cardRule === "same_suit" ? "" : " hidden"}>どこか1つのスートを変更すると、ほか3枚にも同じスート設定を自動反映します。複数スート指定では4枚すべてが選択スートのいずれかなら成立し、JOKERはスート判定から除外します。</p>
        </div>`;
}

function renderTitleConditionCardRuleField(template: TitleConditionTemplate, selectedValue: TitleConditionCardRule) {
  const options = getTitleConditionCardRuleOptions(template);
  return `
    <div class="adminField">
      <label for="titleConditionCardRule" data-title-condition-card-rule-label>${getTitleConditionCardRuleLabel(template)}</label>
      <select id="titleConditionCardRule" name="titleConditionCardRule">
        ${options.map((option) => `<option value="${escapeAttribute(option.value)}" ${option.value === selectedValue ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </div>
  `;
}

function renderTitleConditionCardSlot(index: number, card: TitleConditionCardInput | undefined, template: TitleConditionTemplate, cardTargetRange: TitleConditionCardTargetRange, cardRule: TitleConditionCardRule, disabled = false) {
  const showActor = template.id === "field_play_sequence" || (template.id === "consecutive_played_cards" && cardTargetRange === "table");
  const rankOptions = template.id === "initial_hand_sequence" && cardRule === "same_rank"
    ? getTitleConditionRankOptions(template).filter((rank) => rank !== "JQK" && rank !== "JOKER")
    : getTitleConditionRankOptions(template);
  const selectedRank = card?.rank ?? "any";
  const useMultipleSuitSelection = template.id === "consecutive_played_cards" || template.id === "initial_hand_sequence";
  const selectedSuits = getTitleConditionCardSuitValues(card);
  const suitDisabled = disabled || selectedRank === "JOKER";
  return `
            <div class="adminConditionCardSlot${showActor ? " has-actor" : ""}${disabled ? " is-disabled" : ""}">
              <span>カード${index + 1}</span>
              <div class="adminConditionCardSelects">
                ${showActor ? `<select name="titleConditionCardActor${index}" ${disabled ? "disabled" : ""}>
                  ${TITLE_CONDITION_CARD_ACTORS.map((actor) => `<option value="${escapeAttribute(actor.value)}" ${actor.value === (card?.actor ?? "any") ? "selected" : ""}>${escapeHtml(actor.label)}</option>`).join("")}
                </select>` : ""}
                <select name="titleConditionCardRank${index}" ${disabled ? "disabled" : ""}>
                  ${rankOptions.map((rank) => `<option value="${escapeAttribute(rank)}" ${rank === selectedRank ? "selected" : ""}>${escapeHtml(titleConditionRankLabel(rank))}</option>`).join("")}
                </select>
                ${useMultipleSuitSelection ? `
                  <input type="hidden" name="titleConditionCardSuits${index}" value="${escapeAttribute(selectedRank === "JOKER" ? "" : selectedSuits.join(","))}">
                  <button type="button" class="adminConditionSuitButton" data-open-title-condition-suit-modal="${index}" ${suitDisabled ? "disabled" : ""}>${escapeHtml(titleConditionSuitSelectionLabel(selectedRank === "JOKER" ? [] : selectedSuits))}</button>` : `
                  <select name="titleConditionCardSuit${index}" ${disabled ? "disabled" : ""}>
                    ${TITLE_CONDITION_CARD_SUITS.map((suit) => `<option value="${escapeAttribute(suit)}" ${suit === (card?.suit ?? "any") ? "selected" : ""}>${escapeHtml(titleConditionSuitLabel(suit))}</option>`).join("")}
                  </select>`}
              </div>
            </div>`;
}

function getTitleConditionCardSuitValues(card: TitleConditionCardInput | undefined) {
  const suits = normalizeTitleConditionSuitList(card?.suits ?? []);
  if (suits.length > 0) return suits;
  const suit = normalizeTitleConditionSuit(card?.suit);
  return suit === "any" ? [] : [suit];
}

function titleConditionSuitSelectionLabel(suits: readonly string[]) {
  const normalized = normalizeTitleConditionSuitList(suits);
  return normalized.length > 0 ? normalized.map(titleConditionSuitLabel).join("・") : "指定なし";
}

function getTitleConditionCardRuleOptions(template: TitleConditionTemplate) {
  if (template.kind === "card_set") return [
    { value: "contains_all" as TitleConditionCardRule, label: "すべて含む" },
    { value: "contains_any" as TitleConditionCardRule, label: "いずれかを含む" },
  ];
  if (template.id === "consecutive_played_cards") return [
    { value: "contiguous_contains" as TitleConditionCardRule, label: "順番まで一致" },
    { value: "contiguous_unordered" as TitleConditionCardRule, label: "順不同" },
  ];
  if (template.kind === "card_sequence") return [
    { value: "ordered_contains" as TitleConditionCardRule, label: "指定順で含む" },
    { value: "contiguous_contains" as TitleConditionCardRule, label: "連続で含む" },
    { value: "exact" as TitleConditionCardRule, label: "完全一致" },
  ];
  if (template.kind === "hand_sequence") {
    const options = [
      { value: "exact" as TitleConditionCardRule, label: "並び順まで一致" },
      { value: "unordered" as TitleConditionCardRule, label: "順番は問わない" },
    ];
    if (template.id === "initial_hand_sequence") {
      options.push({ value: "same_rank" as TitleConditionCardRule, label: "4枚全てのランク" });
      options.push({ value: "same_suit" as TitleConditionCardRule, label: "4枚全てのスート" });
    }
    return options;
  }
  return TITLE_CONDITION_CARD_RULES;
}

function getTitleConditionCardRuleLabel(template: TitleConditionTemplate) {
  if (template.kind === "card_set") return "カードの含み方";
  if (template.id === "consecutive_played_cards") return "並び順判定";
  if (template.kind === "card_sequence") return "順番の判定方法";
  if (template.kind === "hand_sequence") return "手札の判定方法";
  return "カード条件ルール";
}

function isTitleConditionCardTemplate(template: TitleConditionTemplate) {
  return template.kind === "card_set" || template.kind === "card_sequence" || template.kind === "hand_sequence" || template.kind === "table_suit_all";
}

function isTitleConditionValueDisabled(template: TitleConditionTemplate) {
  return template.kind === "initial" || isTitleConditionCardTemplate(template) || template.kind === "participant_icon_composition" || template.kind === "match_count_compare" || !template.implemented;
}

function isTitleConditionOperatorHidden(template: TitleConditionTemplate, experienceDetail?: TitleConditionExperienceDetail, experienceUnit?: TitleConditionExperienceUnit, jokerEventDetail?: TitleConditionJokerEventDetail, jokerEventUnit?: TitleConditionJokerEventUnit) {
  if (template.kind === "match_count_compare") return true;
  if (template.kind === "experience") return !isTitleConditionExperienceMatchCountDetail(readTitleConditionExperienceDetail(experienceDetail), readTitleConditionExperienceUnit(experienceUnit));
  if (template.kind === "joker_event") {
    const detail = readTitleConditionJokerEventDetail(jokerEventDetail);
    return !isTitleConditionJokerEventMatchCountDetail(detail, normalizeTitleConditionJokerEventUnit(detail, jokerEventUnit));
  }
  return isTitleConditionValueHidden(template, jokerEventDetail, jokerEventUnit) || template.id === "asset_usage_count" || template.kind === "play_count" || template.kind === "card_play_count" || template.kind === "ng_name_streak" || template.kind === "lose_certain_event" || template.kind === "rematch_session" || template.kind === "host_other_leave";
}

function isTitleConditionValueHidden(template: TitleConditionTemplate, jokerEventDetail?: TitleConditionJokerEventDetail, jokerEventUnit?: TitleConditionJokerEventUnit) {
  if (template.kind === "match_count_compare") return true;
  if (template.kind === "joker_event") {
    const detail = readTitleConditionJokerEventDetail(jokerEventDetail);
    return normalizeTitleConditionJokerEventUnit(detail, jokerEventUnit) === "match" && !isTitleConditionJokerEventCountDetail(detail);
  }
  return isTitleConditionCardTemplate(template) || template.kind === "participant_icon_composition";
}

function isTitleConditionPlayStyleHidden(template: TitleConditionTemplate) {
  return template.id === "asset_usage_count" || template.kind === "ng_name_streak" || template.kind === "lose_certain_event" || template.kind === "host_other_leave";
}

function isTitleConditionGameModeHidden(template: TitleConditionTemplate) {
  return template.id === "asset_usage_count" || template.kind === "ng_name_streak" || template.kind === "lose_certain_event" || template.kind === "host_other_leave";
}

function getTitleConditionPlayStyleLabel(template: TitleConditionTemplate) {
  return template.id === "play_count" ? "プレイ形式" : "プレイスタイル";
}

function getTitleConditionValueLabel(template: TitleConditionTemplate) {
  if (template.id === "asset_usage_count" || template.kind === "play_count" || template.kind === "card_play_count") return "回数";
  return template.kind === "ng_name_streak" || template.kind === "lose_certain_event" || template.kind === "experience" || template.kind === "joker_event" || template.kind === "rematch_session" || template.kind === "host_other_leave" ? "必要回数" : "値";
}

function getTitleConditionValueMin(template: TitleConditionTemplate) {
  return template.id === "asset_usage_count" || template.kind === "play_count" || template.kind === "card_play_count" || template.kind === "ng_name_streak" || template.kind === "lose_certain_event" || template.kind === "experience" || template.kind === "joker_event" || template.kind === "rematch_session" || template.kind === "host_other_leave" ? 1 : 0;
}

function getTitleConditionRankOptions(template: TitleConditionTemplate) {
  return template.kind === "card_sequence" ? TITLE_CONDITION_CARD_SEQUENCE_RANKS : TITLE_CONDITION_CARD_RANKS;
}

function isUnifiedTitleConditionCardTemplate(template: TitleConditionTemplate) {
  return template.id === "played_card_set" || template.id === "consecutive_played_cards";
}

function readTitleConditionCardTargetRange(value: unknown): TitleConditionCardTargetRange {
  return value === "table" ? "table" : "self";
}

function readTitleConditionHandTarget(value: unknown): TitleConditionHandTarget {
  if (value === "next_1" || value === "next_2" || value === "next_3") return value;
  return "self";
}

function readTitleConditionHandTiming(value: unknown): TitleConditionHandTiming {
  return value === "in_match" ? "in_match" : "initial";
}

function getTitleConditionHandStatKey(target: TitleConditionHandTarget, timing: TitleConditionHandTiming) {
  if (timing === "in_match") {
    if (target === "next_1") return "hand_next_1_sequence_signatures_json";
    if (target === "next_2") return "hand_next_2_sequence_signatures_json";
    if (target === "next_3") return "hand_next_3_sequence_signatures_json";
    return "hand_sequence_signatures_json";
  }
  if (target === "next_1") return "initial_hand_next_1_sequence_json";
  if (target === "next_2") return "initial_hand_next_2_sequence_json";
  if (target === "next_3") return "initial_hand_next_3_sequence_json";
  return "initial_hand_card_sequence_json";
}

function normalizeTitleConditionCardRuleForTemplate(template: TitleConditionTemplate, cardRule: TitleConditionCardRule | undefined): TitleConditionCardRule {
  if (template.kind === "card_set") return cardRule === "contains_any" ? "contains_any" : "contains_all";
  if (template.id === "consecutive_played_cards") return cardRule === "contiguous_unordered" ? "contiguous_unordered" : "contiguous_contains";
  if (template.kind === "card_sequence") {
    if (cardRule === "contiguous_contains" || cardRule === "exact") return cardRule;
    return "ordered_contains";
  }
  if (template.kind === "hand_sequence") {
    if (template.id === "initial_hand_sequence" && (cardRule === "same_rank" || cardRule === "same_suit")) return cardRule;
    return cardRule === "unordered" ? "unordered" : "exact";
  }
  return cardRule ?? "contains_all";
}

function normalizeTitleConditionAllSuitRuleForCount(value: TitleConditionAllSuitRule | undefined, selectedCount: number): TitleConditionAllSuitRule {
  const normalized = value ?? "exact";
  const option = TITLE_CONDITION_ALL_SUIT_RULES.find((item) => item.value === normalized);
  if (!option || selectedCount - option.offset <= 0) return "exact";
  return normalized;
}

function getTitleConditionAllSuitRuleOptions(selectedCount: number): Array<{ value: TitleConditionAllSuitRule; label: string }> {
  return TITLE_CONDITION_ALL_SUIT_RULES
    .filter((item) => selectedCount - item.offset > 0)
    .map((item) => ({ value: item.value, label: item.label(selectedCount) }));
}

function syncTitleConditionCardRuleField(form: HTMLFormElement, template: TitleConditionTemplate) {
  const select = form.querySelector<HTMLSelectElement>("#titleConditionCardRule");
  if (!select) return;
  const current = readTitleConditionCardRule(select.value);
  const normalized = normalizeTitleConditionCardRuleForTemplate(template, current);
  const options = getTitleConditionCardRuleOptions(template);
  select.innerHTML = options.map((option) => `<option value="${escapeAttribute(option.value)}" ${option.value === normalized ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
  select.disabled = false;
  const label = form.querySelector<HTMLElement>("[data-title-condition-card-rule-label]");
  if (label) label.textContent = getTitleConditionCardRuleLabel(template);
}

function syncTitleConditionAllSuitRuleField(form: HTMLFormElement, preview: TitleConditionPreviewInput & TitleConditionPreview) {
  const select = form.querySelector<HTMLSelectElement>("#titleConditionAllSuitRule");
  if (!select) return;
  const selectedSuitCount = normalizeTitleConditionSuitList(preview.cards?.map((card) => card.suit) ?? []).length;
  const normalized = normalizeTitleConditionAllSuitRuleForCount(preview.allSuitRule, selectedSuitCount);
  const options = getTitleConditionAllSuitRuleOptions(selectedSuitCount);
  select.innerHTML = options.map((option) => `<option value="${escapeAttribute(option.value)}" ${option.value === normalized ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
  select.disabled = selectedSuitCount === 0;
}


function syncTitleConditionExperienceFields(form: HTMLFormElement, preview: TitleConditionPreviewInput & TitleConditionPreview) {
  const detail = readTitleConditionExperienceDetail(preview.experienceDetail);
  const unit = isTitleConditionExperienceUnitSelectable(detail) ? readTitleConditionExperienceUnit(preview.experienceUnit) : "total";
  const actor = isTitleConditionExperienceActorVisible(detail, unit) ? readTitleConditionExperienceActor(preview.experienceActor) : "self";
  const unitSelect = form.querySelector<HTMLSelectElement>("#titleConditionExperienceUnit");
  const actorSelect = form.querySelector<HTMLSelectElement>("#titleConditionExperienceActor");
  if (unitSelect) unitSelect.value = unit;
  if (actorSelect) actorSelect.value = actor;
  form.querySelector<HTMLElement>("[data-title-condition-experience-unit-field]")?.toggleAttribute("hidden", !isTitleConditionExperienceUnitSelectable(detail));
  form.querySelector<HTMLElement>("[data-title-condition-experience-actor-field]")?.toggleAttribute("hidden", !isTitleConditionExperienceActorVisible(detail, unit));
  form.querySelector<HTMLElement>("[data-title-condition-experience-actor-note]")?.toggleAttribute("hidden", !isTitleConditionExperienceActorVisible(detail, unit));
}


function syncTitleConditionJokerEventFields(form: HTMLFormElement, preview: TitleConditionPreviewInput & TitleConditionPreview) {
  const detail = readTitleConditionJokerEventDetail(preview.jokerEventDetail);
  const unitSelectable = isTitleConditionJokerEventUnitSelectable(detail);
  const unit = normalizeTitleConditionJokerEventUnit(detail, preview.jokerEventUnit);
  const actor = unit === "match" ? readTitleConditionJokerEventActor(preview.jokerEventActor) : "self";
  const unitSelect = form.querySelector<HTMLSelectElement>("#titleConditionJokerEventUnit");
  const actorSelect = form.querySelector<HTMLSelectElement>("#titleConditionJokerEventActor");
  if (unitSelect) unitSelect.value = unit;
  if (actorSelect) actorSelect.value = actor;
  form.querySelector<HTMLElement>("[data-title-condition-joker-event-unit-field]")?.toggleAttribute("hidden", !unitSelectable);
  form.querySelector<HTMLElement>("[data-title-condition-joker-event-actor-field]")?.toggleAttribute("hidden", !unitSelectable || unit !== "match");
  form.querySelector<HTMLElement>("[data-title-condition-joker-event-actor-note]")?.toggleAttribute("hidden", !unitSelectable || unit !== "match");
  const note = form.querySelector<HTMLElement>("[data-title-condition-joker-event-detail-note]");
  if (note) note.textContent = getTitleConditionJokerEventDetailOption(detail).note;
}

function syncTitleConditionRematchModeField(form: HTMLFormElement, preview: TitleConditionPreviewInput & TitleConditionPreview) {
  const select = form.querySelector<HTMLSelectElement>("#titleConditionRematchMode");
  if (!select) return;
  const record = readTitleConditionRematchRecord(preview.rematchRecord);
  const mode = readTitleConditionRematchMode(preview.rematchMode, record);
  select.value = mode;
  select.closest<HTMLElement>(".adminField")?.toggleAttribute("hidden", record === "any");
}

function syncTitleConditionLoseCertainActionField(form: HTMLFormElement, preview: TitleConditionPreviewInput & TitleConditionPreview) {
  const select = form.querySelector<HTMLSelectElement>("#titleConditionLoseCertainAction");
  if (!select) return;
  const role = readTitleConditionLoseCertainRole(preview.loseCertainRole);
  const action = readTitleConditionLoseCertainAction(preview.loseCertainAction, role);
  const options = getTitleConditionLoseCertainActionOptions(role);
  select.innerHTML = options.map((option) => `<option value="${escapeAttribute(option.value)}" ${option.value === action ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
}

function createTitleConditionInitialState(title: TitleMaster | null) {
  const rawBuilder = parseJson<Record<string, unknown>>(title?.conditionBuilderJson ?? null);
  if (rawBuilder?.mode === "builder") return createTitleConditionPreview({
    mode: "builder",
    templateId: readUnknownStringValue(rawBuilder.templateId, "play_count"),
    playStyle: readTitleConditionPlayStyle(rawBuilder.playStyle),
    gameMode: readTitleConditionGameMode(rawBuilder.gameMode),
    difficulty: readTitleConditionDifficulty(rawBuilder.difficulty),
    gameType: readTitleConditionGameType(rawBuilder.gameType),
    operator: readTitleConditionOperator(rawBuilder.operator),
    value: readTitleConditionNumber(rawBuilder.value, 1),
    experienceDetail: readTitleConditionExperienceDetail(rawBuilder.experienceDetail),
    experienceUnit: readTitleConditionExperienceUnit(rawBuilder.experienceUnit ?? rawBuilder.unit, rawBuilder.experienceDetail),
    experienceActor: readTitleConditionExperienceActor(rawBuilder.experienceActor ?? rawBuilder.actor),
    jokerEventDetail: readTitleConditionJokerEventDetail(rawBuilder.jokerEventDetail ?? rawBuilder.eventDetail),
    jokerEventUnit: readTitleConditionJokerEventUnit(rawBuilder.jokerEventUnit ?? rawBuilder.unit),
    jokerEventActor: readTitleConditionJokerEventActor(rawBuilder.jokerEventActor ?? rawBuilder.actor),
    matchCountCompareActor: readTitleConditionMatchCountCompareActor(rawBuilder.matchCountCompareActor ?? rawBuilder.actor),
    matchCountCompareLeftMetric: readTitleConditionMatchCountCompareMetric(rawBuilder.matchCountCompareLeftMetric ?? rawBuilder.leftMetric),
    matchCountCompareOperator: readTitleConditionMatchCountCompareOperator(rawBuilder.matchCountCompareOperator ?? rawBuilder.compareOperator ?? rawBuilder.operator),
    matchCountCompareRight: readTitleConditionMatchCountCompareRight(rawBuilder.matchCountCompareRight ?? (rawBuilder.rightType === "value" ? "fixed_value" : rawBuilder.rightMetric)),
    matchCountCompareValue: readTitleConditionNumber(rawBuilder.matchCountCompareValue ?? rawBuilder.value, 0),
    rematchRecord: readTitleConditionRematchRecord(rawBuilder.rematchRecord ?? rawBuilder.record),
    rematchMode: readTitleConditionRematchMode(rawBuilder.rematchMode ?? rawBuilder.modeType, readTitleConditionRematchRecord(rawBuilder.rematchRecord ?? rawBuilder.record)),
    hostOtherLeaveStartCount: readTitleConditionHostOtherLeaveStartCount(rawBuilder.hostOtherLeaveStartCount ?? rawBuilder.startCount),
    hostOtherLeavePattern: readTitleConditionHostOtherLeavePattern(rawBuilder.hostOtherLeavePattern ?? rawBuilder.pattern),
    cardPlaySource: readTitleConditionCardPlaySource(rawBuilder.cardPlaySource ?? rawBuilder.source),
    cardPlayActor: readTitleConditionCardPlayActor(rawBuilder.cardPlayActor ?? rawBuilder.actorScope),
    cardPlayGroup: readTitleConditionCardPlayGroup(rawBuilder.cardPlayGroup ?? rawBuilder.cardGroup, getTitleConditionTemplate(readUnknownStringValue(rawBuilder.templateId, "play_count"))),
    cardTargetRange: readTitleConditionCardTargetRange(rawBuilder.cardTargetRange ?? rawBuilder.targetRange),
    handTarget: readTitleConditionHandTarget(rawBuilder.handTarget ?? rawBuilder.targetParticipant),
    handTiming: readTitleConditionHandTiming(rawBuilder.handTiming ?? rawBuilder.timing),
    legacySameRank: readTitleConditionCardRule(rawBuilder.cardRule) === "same_rank" && (!Array.isArray(rawBuilder.cards) || rawBuilder.cards.length === 0),
    cardRule: readTitleConditionCardRule(rawBuilder.cardRule),
    allSuitRule: readTitleConditionAllSuitRule(rawBuilder.allSuitRule ?? rawBuilder.rule),
    assetType: readTitleConditionBuilderAssetType(rawBuilder, getTitleConditionTemplate(readUnknownStringValue(rawBuilder.templateId, "play_count"))),
    assetTargetId: readTitleConditionBuilderAssetTargetId(rawBuilder),
    participantSpecMode: readTitleConditionParticipantSpecMode(rawBuilder.specMode),
    participantOrder: readTitleConditionParticipantOrder(rawBuilder.order),
    participantSlots: readTitleConditionBuilderParticipantSlots(rawBuilder.slots),
    ngName: readTitleConditionNgName(rawBuilder.ngName ?? rawBuilder.key),
    loseCertainRole: readTitleConditionLoseCertainRole(rawBuilder.loseCertainRole ?? rawBuilder.role),
    loseCertainAction: readTitleConditionLoseCertainAction(rawBuilder.loseCertainAction ?? rawBuilder.action, readTitleConditionLoseCertainRole(rawBuilder.loseCertainRole ?? rawBuilder.role)),
    sameSuit: rawBuilder.sameSuit === true,
    cards: readTitleConditionBuilderCards(rawBuilder.cards, rawBuilder.suit, rawBuilder.suits),
  });
  if (rawBuilder?.mode === "raw_json" || title) return createRawTitleConditionPreview(title?.conditionType ?? "stat_count_at_least", title?.conditionParamsJson ?? "{}", title?.conditionBuilderJson ? title.conditionBuilderJson : JSON.stringify({ version: 1, mode: "raw_json" }));
  return createTitleConditionPreview({ mode: "builder", templateId: "play_count", playStyle: "any", gameMode: "any", difficulty: "any", gameType: "any", operator: ">=", value: 1, cardPlaySource: "all", cardPlayActor: "self", cardPlayGroup: "ace", cardTargetRange: "self", handTarget: "self", handTiming: "initial", cardRule: "contains_all", allSuitRule: "exact", assetType: "loading_illustration", assetTargetId: "any", participantSpecMode: "icon", participantOrder: "unordered", participantSlots: createDefaultTitleConditionParticipantSlots(), ngName: TITLE_CONDITION_DEFAULT_NG_NAME, loseCertainRole: "creator", loseCertainAction: "any", experienceDetail: TITLE_CONDITION_DEFAULT_EXPERIENCE_DETAIL, experienceUnit: TITLE_CONDITION_DEFAULT_EXPERIENCE_UNIT, experienceActor: TITLE_CONDITION_DEFAULT_EXPERIENCE_ACTOR, jokerEventDetail: TITLE_CONDITION_DEFAULT_JOKER_EVENT_DETAIL, jokerEventUnit: TITLE_CONDITION_DEFAULT_JOKER_EVENT_UNIT, jokerEventActor: TITLE_CONDITION_DEFAULT_JOKER_EVENT_ACTOR, matchCountCompareActor: TITLE_CONDITION_DEFAULT_MATCH_COUNT_COMPARE_ACTOR, matchCountCompareLeftMetric: TITLE_CONDITION_DEFAULT_MATCH_COUNT_COMPARE_LEFT_METRIC, matchCountCompareOperator: TITLE_CONDITION_DEFAULT_MATCH_COUNT_COMPARE_OPERATOR, matchCountCompareRight: TITLE_CONDITION_DEFAULT_MATCH_COUNT_COMPARE_RIGHT, matchCountCompareValue: 1, rematchRecord: TITLE_CONDITION_DEFAULT_REMATCH_RECORD, rematchMode: TITLE_CONDITION_DEFAULT_REMATCH_MODE, hostOtherLeaveStartCount: TITLE_CONDITION_DEFAULT_HOST_OTHER_LEAVE_START_COUNT, hostOtherLeavePattern: TITLE_CONDITION_DEFAULT_HOST_OTHER_LEAVE_PATTERN, sameSuit: false, cards: [] });
}

function createRawTitleConditionPreview(conditionType: string, conditionParamsJson: string, conditionBuilderJson: string) {
  return {
    mode: "raw_json" as TitleConditionMode,
    templateId: "play_count",
    playStyle: "any" as TitleConditionPlayStyle,
    gameMode: "any" as TitleConditionGameMode,
    difficulty: "any" as TitleConditionDifficulty,
    gameType: "any" as TitleConditionGameType,
    operator: ">=" as TitleConditionOperator,
    value: 1,
    assetType: "loading_illustration" as TitleConditionAssetType,
    assetTargetId: "any",
    participantSpecMode: "icon" as TitleConditionParticipantSpecMode,
    participantOrder: "unordered" as TitleConditionParticipantOrder,
    participantSlots: createDefaultTitleConditionParticipantSlots(),
    ngName: TITLE_CONDITION_DEFAULT_NG_NAME,
    loseCertainRole: "creator" as TitleConditionLoseCertainRole,
    loseCertainAction: "any" as TitleConditionLoseCertainAction,
    experienceDetail: TITLE_CONDITION_DEFAULT_EXPERIENCE_DETAIL,
    experienceUnit: TITLE_CONDITION_DEFAULT_EXPERIENCE_UNIT,
    experienceActor: TITLE_CONDITION_DEFAULT_EXPERIENCE_ACTOR,
    jokerEventDetail: TITLE_CONDITION_DEFAULT_JOKER_EVENT_DETAIL,
    jokerEventUnit: TITLE_CONDITION_DEFAULT_JOKER_EVENT_UNIT,
    jokerEventActor: TITLE_CONDITION_DEFAULT_JOKER_EVENT_ACTOR,
    matchCountCompareActor: TITLE_CONDITION_DEFAULT_MATCH_COUNT_COMPARE_ACTOR,
    matchCountCompareLeftMetric: TITLE_CONDITION_DEFAULT_MATCH_COUNT_COMPARE_LEFT_METRIC,
    matchCountCompareOperator: TITLE_CONDITION_DEFAULT_MATCH_COUNT_COMPARE_OPERATOR,
    matchCountCompareRight: TITLE_CONDITION_DEFAULT_MATCH_COUNT_COMPARE_RIGHT,
    matchCountCompareValue: 1,
    rematchRecord: TITLE_CONDITION_DEFAULT_REMATCH_RECORD,
    rematchMode: TITLE_CONDITION_DEFAULT_REMATCH_MODE,
    hostOtherLeaveStartCount: TITLE_CONDITION_DEFAULT_HOST_OTHER_LEAVE_START_COUNT,
    hostOtherLeavePattern: TITLE_CONDITION_DEFAULT_HOST_OTHER_LEAVE_PATTERN,
    cardPlaySource: "all" as TitleConditionCardPlaySource,
    cardPlayActor: "self" as TitleConditionCardPlayActor,
    cardPlayGroup: "ace" as TitleConditionCardPlayGroup,
    cardTargetRange: "self" as TitleConditionCardTargetRange,
    conditionType,
    conditionParamsJson,
    conditionBuilderJson,
    implemented: true,
    message: "JSON入力条件です。コードレス項目を変更するとコードレス条件として再生成します。",
  };
}

function createTitleConditionPreview(input: TitleConditionPreviewInput) {
  const template = getTitleConditionTemplate(input.templateId);
  if (!template.implemented || template.kind === "unimplemented") {
    return {
      ...input,
      conditionType: "",
      conditionParamsJson: "",
      conditionBuilderJson: JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, operator: input.operator, value: input.value }),
      implemented: false,
      message: "この条件は未実装のため保存できません。",
    };
  }
  if (input.gameMode === "hidden" && template.kind !== "ng_name_streak" && template.id !== "asset_usage_count") {
    return {
      ...input,
      conditionType: "",
      conditionParamsJson: "",
      conditionBuilderJson: JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, operator: input.operator, value: input.value }),
      implemented: false,
      message: "HIDDENモード条件は未実装のため保存できません。",
    };
  }
  if (template.kind === "initial") {
    return {
      ...input,
      conditionType: "initial_grant",
      conditionParamsJson: "",
      conditionBuilderJson: JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode }),
      implemented: true,
      message: "保存可能です。初期所持称号として保存します。",
    };
  }

  if (template.kind === "card_set") return createCardSetConditionPreview(input, template);
  if (template.kind === "card_sequence") return createCardSequenceConditionPreview(input, template);
  if (template.kind === "hand_sequence") return createHandSequenceConditionPreview(input, template);
  if (template.kind === "table_suit_all") return createTableSuitAllConditionPreview(input, template);
  if (template.kind === "asset_count") return createAssetCountConditionPreview(input, template);
  if (template.kind === "play_count") return createPlayCountConditionPreview(input, template);
  if (template.kind === "card_play_count") return createCardPlayCountConditionPreview(input, template);
  if (template.kind === "experience") return createExperienceConditionPreview(input, template);
  if (template.kind === "joker_event") return createJokerEventConditionPreview(input, template);
  if (template.kind === "match_count_compare") return createMatchCountCompareConditionPreview(input, template);
  if (template.kind === "rematch_session") return createRematchSessionConditionPreview(input, template);
  if (template.kind === "host_other_leave") return createHostOtherLeaveConditionPreview(input, template);
  if (template.kind === "participant_icon_composition") return createParticipantIconCompositionConditionPreview(input, template);
  if (template.kind === "lose_certain_event") return createLoseCertainEventConditionPreview(input, template);
  if (template.kind === "ng_name_streak") return createNgNameStreakConditionPreview(input, template);

  const scope = resolveTitleConditionScope(template, input.playStyle);
  const value = Math.max(0, Math.floor(input.value));
  const params = { scope, statKey: template.statKey ?? "", value };
  const condition = createConditionByOperator(input.operator, params);
  return {
    ...input,
    value,
    conditionType: condition.conditionType,
    conditionParamsJson: condition.conditionParamsJson,
    conditionBuilderJson: JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, operator: input.operator, value }),
    implemented: true,
    message: "保存可能です。",
  };
}

function createPlayCountConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const difficulty = readTitleConditionDifficulty(input.difficulty);
  const gameType = difficulty === "any" ? readTitleConditionGameType(input.gameType) : "any";
  const statKey = difficulty !== "any"
    ? getTitleConditionDifficultyOption(difficulty).statKey
    : getTitleConditionGameTypeOption(gameType).statKey;
  const scope = resolveTitleConditionScope(template, input.playStyle);
  const value = Math.max(1, Math.floor(input.value));
  const operator: TitleConditionOperator = ">=";
  const condition = createConditionByOperator(operator, { scope, statKey, value });
  return {
    ...input,
    difficulty,
    gameType,
    operator,
    value,
    conditionType: condition.conditionType,
    conditionParamsJson: condition.conditionParamsJson,
    conditionBuilderJson: JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, difficulty, gameType, operator, value }),
    implemented: true,
    message: "保存可能です。",
  };
}

function createCardPlayCountConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const source = readTitleConditionCardPlaySource(input.cardPlaySource);
  const actor = readTitleConditionCardPlayActor(input.cardPlayActor);
  const group = readTitleConditionCardPlayGroup(input.cardPlayGroup, template);
  const scope = resolveTitleConditionScope(template, input.playStyle);
  const value = Math.max(1, Math.floor(input.value));
  const operator: TitleConditionOperator = ">=";
  const scalarStatKey = resolveTitleConditionCardPlayScalarStatKey(source, actor, group);
  const condition = scalarStatKey
    ? createConditionByOperator(operator, { scope, statKey: scalarStatKey, value })
    : createJsonValueConditionByOperator(operator, {
      scope,
      statKey: TITLE_CONDITION_CARD_PLAY_COUNT_STAT_KEY,
      key: toTitleConditionCardPlayCountKey(actor, source, group),
      value,
    });
  return {
    ...input,
    cardPlaySource: source,
    cardPlayActor: actor,
    cardPlayGroup: group,
    operator,
    value,
    conditionType: condition.conditionType,
    conditionParamsJson: condition.conditionParamsJson,
    conditionBuilderJson: JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, cardPlaySource: source, cardPlayActor: actor, cardPlayGroup: group, operator, value }),
    implemented: true,
    message: "保存可能です。",
  };
}

function resolveTitleConditionCardPlayScalarStatKey(source: TitleConditionCardPlaySource, actor: TitleConditionCardPlayActor, group: TitleConditionCardPlayGroup) {
  if (actor !== "self") return null;
  if (group === "all") {
    if (source === "hand") return "hand_play_count";
    if (source === "deck") return "deck_play_count";
    return "played_card_count";
  }
  if (source !== "all") return null;
  return TITLE_CONDITION_CARD_PLAY_GROUPS.find((item) => item.value === group)?.statKey ?? null;
}

function toTitleConditionCardPlayCountKey(actor: TitleConditionCardPlayActor, source: TitleConditionCardPlaySource, group: TitleConditionCardPlayGroup) {
  return `actor_${actor}:source_${source}:card_${group}`;
}

function createCardSetConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const cardRule = input.cardRule === "contains_any" ? "contains_any" : "contains_all";
  const cardTargetRange = readTitleConditionCardTargetRange(input.cardTargetRange);
  const cards = normalizeTitleConditionCards(input.cards ?? []);
  if (cards.length === 0) return createInvalidCardConditionPreview(input, template, "カード条件を1件以上指定してください。");

  const metricTemplate = template.id === "played_card_set"
    ? {
      ...template,
      rankStatKey: cardTargetRange === "table" ? "table_play_rank_set_json" : "self_play_rank_set_json",
      suitStatKey: cardTargetRange === "table" ? "table_play_suit_set_json" : "self_play_suit_set_json",
      cardStatKey: cardTargetRange === "table" ? "table_play_card_set_json" : "self_play_card_set_json",
    }
    : template;
  const classified = classifyTitleConditionSetCards(cards, metricTemplate);
  if (!classified.ok) return createInvalidCardConditionPreview(input, template, classified.message);

  const baseCondition = cardRule === "contains_any"
    ? createContainsAnyCondition(classified.items)
    : createContainsAllCondition(classified.items);
  const condition = applyTitleConditionPlayStyleConstraint(baseCondition, input.playStyle);
  const builder = { version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, cardRule, cards } as Record<string, unknown>;
  if (template.id === "played_card_set") builder.cardTargetRange = cardTargetRange;

  return {
    ...input,
    cardRule,
    cardTargetRange,
    cards,
    conditionType: condition.conditionType,
    conditionParamsJson: JSON.stringify(condition.conditionParams),
    conditionBuilderJson: JSON.stringify(builder),
    implemented: true,
    message: "保存可能です。",
  };
}

function createCardSequenceConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const cardRule = normalizeTitleConditionCardRuleForTemplate(template, input.cardRule);
  const cardTargetRange = readTitleConditionCardTargetRange(input.cardTargetRange);
  const normalizedCards = normalizeTitleConditionCards(input.cards ?? [], template.id === "consecutive_played_cards", template.id === "consecutive_played_cards");
  const cards = template.id === "consecutive_played_cards" && cardTargetRange === "self"
    ? normalizedCards.map((card) => ({ ...card, actor: "any" as TitleConditionCardActor }))
    : normalizedCards;
  if (cards.length === 0) return createInvalidCardConditionPreview(input, template, "カード条件を1件以上指定してください。");
  if (template.id === "consecutive_played_cards") {
    if (cards.some((card) => card.rank === "any" && getTitleConditionCardSuitValues(card).length === 0)) {
      return createInvalidCardConditionPreview(input, template, "連続カード条件ではランクまたはスートを指定してください。出した人だけの指定は使用できません。");
    }
  } else if (cards.some((card) => card.rank === "any")) {
    return createInvalidCardConditionPreview(input, template, "カード順ではランク指定なしのスートのみ条件は使用できません。");
  }

  const hasActorCondition = cards.some((card) => readTitleConditionCardActor(card.actor) !== "any");
  const statKey = template.id === "consecutive_played_cards"
    ? cardTargetRange === "self"
      ? "self_play_card_sequence_json"
      : hasActorCondition
        ? "table_play_actor_card_sequence_json"
        : "table_play_card_sequence_json"
    : hasActorCondition ? template.actorCardStatKey : template.cardStatKey;
  if (!statKey) return createInvalidCardConditionPreview(input, template, "カード順metricを生成できませんでした。");

  const sameSuit = template.id === "consecutive_played_cards" ? false : Boolean(input.sameSuit);
  const baseCondition = {
    conditionType: "card_sequence_match",
    conditionParams: template.id === "consecutive_played_cards"
      ? { scope: "match", statKey, rule: cardRule, cards }
      : { scope: "match", statKey, rule: cardRule, cards, sameSuit },
  };
  const condition = applyTitleConditionPlayStyleConstraint(baseCondition, input.playStyle);
  const builder = { version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, cardRule, sameSuit, cards } as Record<string, unknown>;
  if (template.id === "consecutive_played_cards") builder.cardTargetRange = cardTargetRange;

  return {
    ...input,
    cardRule,
    cardTargetRange,
    sameSuit,
    cards,
    conditionType: condition.conditionType,
    conditionParamsJson: JSON.stringify(condition.conditionParams),
    conditionBuilderJson: JSON.stringify(builder),
    implemented: true,
    message: "保存可能です。",
  };
}

function createHandSequenceConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const baseStatKey = template.statKey;
  if (!baseStatKey) return createInvalidCardConditionPreview(input, template, "手札条件metricを生成できませんでした。");

  const cardRule = normalizeTitleConditionCardRuleForTemplate(template, input.cardRule);
  const handTarget = template.id === "initial_hand_sequence" ? readTitleConditionHandTarget(input.handTarget) : "self";
  const handTiming = template.id === "in_match_hand_sequence" ? "in_match" : readTitleConditionHandTiming(input.handTiming);
  const statKey = template.id === "initial_hand_sequence" ? getTitleConditionHandStatKey(handTarget, handTiming) : baseStatKey;
  const builderBase = { version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, handTarget, handTiming, cardRule } as Record<string, unknown>;

  if (cardRule === "same_rank") {
    const ranks = (input.cards ?? []).map((card) => normalizeTitleConditionRank(card.rank)).filter((rank) => rank !== "any");
    const rank = ranks[0];
    if (!rank && input.legacySameRank) {
      const baseCondition = { conditionType: "hand_sequence_match", conditionParams: { scope: "match", statKey, rule: cardRule } };
      const condition = applyTitleConditionPlayStyleConstraint(baseCondition, input.playStyle);
      return { ...input, handTarget, handTiming, cardRule, cards: [], conditionType: condition.conditionType, conditionParamsJson: JSON.stringify(condition.conditionParams), conditionBuilderJson: JSON.stringify({ ...builderBase, legacySameRank: true }), implemented: true, message: "保存可能です。（旧条件）" };
    }
    if (!rank || rank === "JQK" || rank === "JOKER" || ranks.some((item) => item !== rank)) return createInvalidCardConditionPreview({ ...input, handTarget, handTiming }, template, "4枚全てのランクはA～Kから同じランクを指定してください。");
    const cards = Array.from({ length: 4 }, () => ({ rank, suit: "any", suits: [] as string[] }));
    const baseCondition = { conditionType: "hand_sequence_match", conditionParams: { scope: "match", statKey, rule: cardRule, cards } };
    const condition = applyTitleConditionPlayStyleConstraint(baseCondition, input.playStyle);
    return { ...input, handTarget, handTiming, cardRule, cards, conditionType: condition.conditionType, conditionParamsJson: JSON.stringify(condition.conditionParams), conditionBuilderJson: JSON.stringify({ ...builderBase, cards }), implemented: true, message: "保存可能です。" };
  }

  if (cardRule === "same_suit") {
    const firstSuits = normalizeTitleConditionSuitList((input.cards?.[0]?.suits ?? [input.cards?.[0]?.suit]));
    if (firstSuits.length === 0) return createInvalidCardConditionPreview({ ...input, handTarget, handTiming }, template, "4枚全てのスートを1つ以上指定してください。");
    const normalized = normalizeTitleConditionHandCards(input.cards ?? [], cardRule);
    if (!normalized.ok) return createInvalidCardConditionPreview({ ...input, handTarget, handTiming }, template, normalized.message);
    const cards = normalized.cards;
    const baseCondition = { conditionType: "hand_sequence_match", conditionParams: { scope: "match", statKey, rule: cardRule, suits: firstSuits, cards } };
    const condition = applyTitleConditionPlayStyleConstraint(baseCondition, input.playStyle);
    return { ...input, handTarget, handTiming, cardRule, cards, conditionType: condition.conditionType, conditionParamsJson: JSON.stringify(condition.conditionParams), conditionBuilderJson: JSON.stringify({ ...builderBase, suits: firstSuits, cards }), implemented: true, message: "保存可能です。" };
  }

  const normalized = normalizeTitleConditionHandCards(input.cards ?? [], cardRule);
  if (!normalized.ok) return createInvalidCardConditionPreview({ ...input, handTarget, handTiming }, template, normalized.message);
  const cards = normalized.cards;
  const baseCondition = { conditionType: "hand_sequence_match", conditionParams: { scope: "match", statKey, rule: cardRule, cards } };
  const condition = applyTitleConditionPlayStyleConstraint(baseCondition, input.playStyle);

  return { ...input, handTarget, handTiming, cardRule, sameSuit: false, cards, conditionType: condition.conditionType, conditionParamsJson: JSON.stringify(condition.conditionParams), conditionBuilderJson: JSON.stringify({ ...builderBase, cards }), implemented: true, message: "保存可能です。" };
}


function createTableSuitAllConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const suits = normalizeTitleConditionSuitList(input.cards?.map((card) => card.suit) ?? []);
  if (suits.length === 0) return createInvalidCardConditionPreview(input, template, "指定スートを1つ以上選択してください。");

  const allSuitRule = normalizeTitleConditionAllSuitRuleForCount(input.allSuitRule, suits.length);
  const cards = suits.map((suit) => ({ rank: "any", suit }));
  const baseCondition = {
    conditionType: "table_all_suit_match",
    conditionParams: { scope: "match", suits, rule: allSuitRule },
  };
  const condition = applyTitleConditionPlayStyleConstraint(baseCondition, input.playStyle);

  return {
    ...input,
    cardRule: "contains_all" as TitleConditionCardRule,
    allSuitRule,
    sameSuit: false,
    cards,
    conditionType: condition.conditionType,
    conditionParamsJson: JSON.stringify(condition.conditionParams),
    conditionBuilderJson: JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, allSuitRule, suits, cards }),
    implemented: true,
    message: "保存可能です。",
  };
}



function createAssetCountConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const isUnifiedAssetTemplate = template.id === "asset_usage_count";
  const value = Math.max(isUnifiedAssetTemplate ? 1 : 0, Math.floor(input.value));
  const operator: TitleConditionOperator = isUnifiedAssetTemplate ? ">=" : input.operator;
  const playStyle: TitleConditionPlayStyle = isUnifiedAssetTemplate ? "any" : input.playStyle;
  const gameMode: TitleConditionGameMode = isUnifiedAssetTemplate ? "any" : input.gameMode;
  const assetType = resolveTitleConditionAssetType(template, input.assetType);
  const metricKeys = getTitleConditionAssetMetricKeys(template, assetType);
  const assetTargetId = normalizeTitleConditionAssetTargetId(input.assetTargetId);
  const statKey = assetTargetId === "any" ? metricKeys.statKey : metricKeys.jsonStatKey;
  const builder = isUnifiedAssetTemplate
    ? { version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle, gameMode, operator, value, assetType, assetTargetId }
    : { version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, operator, value, assetTargetId };
  if (!statKey) {
    return {
      ...input,
      playStyle,
      gameMode,
      operator,
      value,
      assetType,
      assetTargetId,
      conditionType: "",
      conditionParamsJson: "",
      conditionBuilderJson: JSON.stringify(builder),
      implemented: false,
      message: "対象metricを生成できませんでした。",
    };
  }

  const condition = assetTargetId === "any"
    ? createConditionByOperator(operator, { scope: "global", statKey, value })
    : createJsonValueConditionByOperator(operator, { scope: "global", statKey, key: assetTargetId, value });

  return {
    ...input,
    playStyle,
    gameMode,
    operator,
    value,
    assetType,
    assetTargetId,
    conditionType: condition.conditionType,
    conditionParamsJson: condition.conditionParamsJson,
    conditionBuilderJson: JSON.stringify(builder),
    implemented: true,
    message: "保存可能です。",
  };
}


function createExperienceConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const detail = readTitleConditionExperienceDetail(input.experienceDetail);
  const unit = isTitleConditionExperienceUnitSelectable(detail) ? readTitleConditionExperienceUnit(input.experienceUnit) : "total";
  const actor = isTitleConditionExperienceActorVisible(detail, unit) ? readTitleConditionExperienceActor(input.experienceActor) : "self";
  const option = getTitleConditionExperienceDetailOption(detail);
  const operator = isTitleConditionExperienceMatchCountDetail(detail, unit) ? input.operator : ">=";
  const value = Math.max(1, Math.floor(input.value));
  let condition: AdminGeneratedCondition;

  if (detail === "timeout_only_finish") {
    const generated = createJsonValueConditionByOperator(">=", {
      scope: resolveTitleConditionScope(template, input.playStyle),
      statKey: TITLE_CONDITION_TIMEOUT_ONLY_FINISH_STAT_KEY,
      key: actor,
      value,
    });
    condition = { conditionType: generated.conditionType, conditionParams: JSON.parse(generated.conditionParamsJson) as Record<string, unknown> };
  } else if (detail === "timeout_deck_play" && unit === "match") {
    condition = applyTitleConditionPlayStyleConstraint(createTitleConditionExperienceActorMatchCondition(operator, actor, value), input.playStyle);
  } else if (detail === "redeal" && unit === "match") {
    const generated = createConditionByOperator(operator, { scope: "match", statKey: option.statKey, value });
    condition = applyTitleConditionPlayStyleConstraint({ conditionType: generated.conditionType, conditionParams: JSON.parse(generated.conditionParamsJson) as Record<string, unknown> }, input.playStyle);
  } else {
    const generated = createConditionByOperator(">=", { scope: resolveTitleConditionScope(template, input.playStyle), statKey: option.statKey, value });
    condition = { conditionType: generated.conditionType, conditionParams: JSON.parse(generated.conditionParamsJson) as Record<string, unknown> };
  }

  return {
    ...input,
    experienceDetail: detail,
    experienceUnit: unit,
    experienceActor: actor,
    operator,
    value,
    conditionType: condition.conditionType,
    conditionParamsJson: JSON.stringify(condition.conditionParams),
    conditionBuilderJson: JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, experienceDetail: detail, experienceUnit: unit, experienceActor: actor, operator, value }),
    implemented: true,
    message: "保存可能です。",
  };
}

function createTitleConditionExperienceActorMatchCondition(operator: TitleConditionOperator, actor: TitleConditionExperienceActor, value: number): AdminGeneratedCondition {
  const createForActor = (target: Exclude<TitleConditionExperienceActor, "any">): AdminGeneratedCondition => {
    const generated = createConditionByOperator(operator, { scope: "match", statKey: getTitleConditionExperienceTimeoutMatchStatKey(target), value });
    return { conditionType: generated.conditionType, conditionParams: JSON.parse(generated.conditionParamsJson) as Record<string, unknown> };
  };
  if (actor !== "any") return createForActor(actor);
  return {
    conditionType: "any_condition",
    conditionParams: {
      conditions: (["self", "next_1", "next_2", "next_3"] as const).map((target) => {
        const generated = createForActor(target);
        return { condition_type: generated.conditionType, condition_params_json: generated.conditionParams };
      }),
    },
  };
}


function createJokerEventConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const detail = readTitleConditionJokerEventDetail(input.jokerEventDetail);
  const option = getTitleConditionJokerEventDetailOption(detail);
  const unit = normalizeTitleConditionJokerEventUnit(detail, input.jokerEventUnit);
  const actor = unit === "match" ? readTitleConditionJokerEventActor(input.jokerEventActor) : "self";
  const isMatchCount = isTitleConditionJokerEventMatchCountDetail(detail, unit);
  const operator: TitleConditionOperator = isMatchCount ? input.operator : ">=";
  const value = unit === "match" && !option.matchCount ? 1 : Math.max(1, Math.floor(input.value));
  let condition: AdminGeneratedCondition;

  if (unit === "match") {
    condition = applyTitleConditionPlayStyleConstraint(createTitleConditionJokerEventActorMatchCondition(operator, actor, detail, value), input.playStyle);
  } else {
    const generated = createConditionByOperator(">=", { scope: resolveTitleConditionScope(template, input.playStyle), statKey: option.statKey, value });
    condition = { conditionType: generated.conditionType, conditionParams: JSON.parse(generated.conditionParamsJson) as Record<string, unknown> };
  }

  return {
    ...input,
    jokerEventDetail: detail,
    jokerEventUnit: unit,
    jokerEventActor: actor,
    operator,
    value,
    conditionType: condition.conditionType,
    conditionParamsJson: JSON.stringify(condition.conditionParams),
    conditionBuilderJson: JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, jokerEventDetail: detail, jokerEventUnit: unit, jokerEventActor: actor, operator, value }),
    implemented: true,
    message: "保存可能です。",
  };
}

function createTitleConditionJokerEventActorMatchCondition(operator: TitleConditionOperator, actor: TitleConditionJokerEventActor, detail: TitleConditionJokerEventDetail, value: number): AdminGeneratedCondition {
  const createForActor = (target: Exclude<TitleConditionJokerEventActor, "any">): AdminGeneratedCondition => {
    const generated = createJsonValueConditionByOperator(operator, {
      scope: "match",
      statKey: TITLE_CONDITION_JOKER_EVENT_MATCH_STAT_KEY,
      key: toTitleConditionJokerEventMatchKey(target, detail),
      value,
    });
    return { conditionType: generated.conditionType, conditionParams: JSON.parse(generated.conditionParamsJson) as Record<string, unknown> };
  };
  if (actor !== "any") return createForActor(actor);
  return {
    conditionType: "any_condition",
    conditionParams: {
      conditions: (["self", "next_1", "next_2", "next_3"] as const).map((target) => {
        const generated = createForActor(target);
        return { condition_type: generated.conditionType, condition_params_json: generated.conditionParams };
      }),
    },
  };
}

function createMatchCountCompareConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const actor = readTitleConditionMatchCountCompareActor(input.matchCountCompareActor);
  const leftMetric = readTitleConditionMatchCountCompareMetric(input.matchCountCompareLeftMetric);
  const compareOperator = readTitleConditionMatchCountCompareOperator(input.matchCountCompareOperator);
  const right = readTitleConditionMatchCountCompareRight(input.matchCountCompareRight);
  const value = Math.max(0, Math.floor(input.matchCountCompareValue ?? input.value));
  const builder = { version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, matchCountCompareActor: actor, matchCountCompareLeftMetric: leftMetric, matchCountCompareOperator: compareOperator, matchCountCompareRight: right, matchCountCompareValue: value };

  if (right !== "fixed_value" && right === leftMetric) {
    return {
      ...input,
      matchCountCompareActor: actor,
      matchCountCompareLeftMetric: leftMetric,
      matchCountCompareOperator: compareOperator,
      matchCountCompareRight: right,
      matchCountCompareValue: value,
      conditionType: "",
      conditionParamsJson: "",
      conditionBuilderJson: JSON.stringify(builder),
      implemented: false,
      message: "比較元と比較先には異なる回数項目を指定してください。",
    };
  }

  const baseCondition: AdminGeneratedCondition = {
    conditionType: "match_count_compare",
    conditionParams: {
      scope: "match",
      actor,
      leftMetric,
      operator: compareOperator,
      rightType: right === "fixed_value" ? "value" : "metric",
      ...(right === "fixed_value" ? { value } : { rightMetric: right }),
    },
  };
  const condition = applyTitleConditionPlayStyleConstraint(baseCondition, input.playStyle);
  return {
    ...input,
    matchCountCompareActor: actor,
    matchCountCompareLeftMetric: leftMetric,
    matchCountCompareOperator: compareOperator,
    matchCountCompareRight: right,
    matchCountCompareValue: value,
    conditionType: condition.conditionType,
    conditionParamsJson: JSON.stringify(condition.conditionParams),
    conditionBuilderJson: JSON.stringify(builder),
    implemented: true,
    message: "保存可能です。",
  };
}


function createRematchSessionConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const record = readTitleConditionRematchRecord(input.rematchRecord);
  const mode = readTitleConditionRematchMode(input.rematchMode, record);
  const value = Math.max(1, Math.floor(input.value));
  const statKey = getTitleConditionRematchStatKey(record, mode);
  const baseCondition = createConditionByOperator(">=", { scope: "match", statKey, value });
  const condition = applyTitleConditionPlayStyleConstraint({ conditionType: baseCondition.conditionType, conditionParams: JSON.parse(baseCondition.conditionParamsJson) as Record<string, unknown> }, input.playStyle);

  return {
    ...input,
    rematchRecord: record,
    rematchMode: mode,
    operator: ">=" as TitleConditionOperator,
    value,
    conditionType: condition.conditionType,
    conditionParamsJson: JSON.stringify(condition.conditionParams),
    conditionBuilderJson: JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, rematchRecord: record, rematchMode: mode, operator: ">=", value }),
    implemented: true,
    message: "保存可能です。",
  };
}

function createHostOtherLeaveConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const startCount = readTitleConditionHostOtherLeaveStartCount(input.hostOtherLeaveStartCount);
  const pattern = readTitleConditionHostOtherLeavePattern(input.hostOtherLeavePattern);
  const value = Math.max(1, Math.floor(input.value));
  const key = toTitleConditionHostOtherLeavePatternKey(startCount, pattern);

  return {
    ...input,
    playStyle: "multi" as TitleConditionPlayStyle,
    gameMode: "any" as TitleConditionGameMode,
    operator: ">=" as TitleConditionOperator,
    value,
    hostOtherLeaveStartCount: startCount,
    hostOtherLeavePattern: pattern,
    conditionType: "stat_json_value_at_least",
    conditionParamsJson: JSON.stringify({ scope: "multi", statKey: TITLE_CONDITION_HOST_OTHER_LEAVE_STAT_KEY, key, value }),
    conditionBuilderJson: JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, hostOtherLeaveStartCount: startCount, hostOtherLeavePattern: pattern, operator: ">=", value }),
    implemented: true,
    message: "保存可能です。HOST中の他参加者途中退出は必要回数以上で判定します。",
  };
}

function createParticipantIconCompositionConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const specMode = readTitleConditionParticipantSpecMode(input.participantSpecMode);
  const participantOrder = readTitleConditionParticipantOrder(input.participantOrder);
  const slots = normalizeTitleConditionParticipantSlots(input.participantSlots);
  const conditionBuilderJson = JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, specMode, order: participantOrder, slots });

  const selfCount = slots.filter((slot) => slot.relation === "self").length;
  if (selfCount !== 1) {
    return {
      ...input,
      participantSpecMode: specMode,
      participantOrder,
      participantSlots: slots,
      conditionType: "",
      conditionParamsJson: "",
      conditionBuilderJson,
      implemented: false,
      message: "「自分」は手番1〜4のうち必ず1つだけ選択してください。",
    };
  }

  if (!slots.every((slot) => isValidTitleConditionParticipantSlot(slot, specMode))) {
    return {
      ...input,
      participantSpecMode: specMode,
      participantOrder,
      participantSlots: slots,
      conditionType: "",
      conditionParamsJson: "",
      conditionBuilderJson,
      implemented: false,
      message: "対象アイコンを確認してください。",
    };
  }

  const baseCondition = {
    conditionType: "participant_icon_composition_match",
    conditionParams: { scope: "match", specMode, order: participantOrder, slots },
  };
  const condition = applyTitleConditionPlayStyleConstraint(baseCondition, input.playStyle);

  return {
    ...input,
    participantSpecMode: specMode,
    participantOrder,
    participantSlots: slots,
    conditionType: condition.conditionType,
    conditionParamsJson: JSON.stringify(condition.conditionParams),
    conditionBuilderJson,
    implemented: true,
    message: "保存可能です。",
  };
}


function createLoseCertainEventConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const role = readTitleConditionLoseCertainRole(input.loseCertainRole);
  const action = readTitleConditionLoseCertainAction(input.loseCertainAction, role);
  const value = Math.max(1, Math.floor(input.value));
  const key = toTitleConditionLoseCertainEventKey(role, action);
  return {
    ...input,
    playStyle: "any" as TitleConditionPlayStyle,
    gameMode: "any" as TitleConditionGameMode,
    operator: ">=" as TitleConditionOperator,
    value,
    loseCertainRole: role,
    loseCertainAction: action,
    conditionType: "stat_json_value_at_least",
    conditionParamsJson: JSON.stringify({ scope: "global", statKey: TITLE_CONDITION_LOSE_CERTAIN_EVENT_STAT_KEY, key, value }),
    conditionBuilderJson: JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, role, action, operator: ">=", value }),
    implemented: true,
    message: "保存可能です。負け確イベント状況は必要回数以上で判定します。",
  };
}

function createNgNameStreakConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate) {
  const ngName = readTitleConditionNgName(input.ngName);
  const value = Math.max(1, Math.floor(input.value));

  if (!ngName) {
    return {
      ...input,
      playStyle: "any" as TitleConditionPlayStyle,
      gameMode: "any" as TitleConditionGameMode,
      operator: ">=" as TitleConditionOperator,
      value,
      conditionType: "",
      conditionParamsJson: "",
      conditionBuilderJson: JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, ngName, operator: ">=", value }),
      implemented: false,
      message: "対象NGネームを選択してください。",
    };
  }

  const condition = {
    conditionType: "stat_json_value_at_least",
    conditionParams: { scope: "global", statKey: TITLE_CONDITION_NG_NAME_MAX_STREAK_STAT_KEY, key: ngName, value },
  };

  return {
    ...input,
    playStyle: "any" as TitleConditionPlayStyle,
    gameMode: "any" as TitleConditionGameMode,
    operator: ">=" as TitleConditionOperator,
    value,
    ngName,
    conditionType: condition.conditionType,
    conditionParamsJson: JSON.stringify(condition.conditionParams),
    conditionBuilderJson: JSON.stringify({ version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, ngName, operator: ">=", value }),
    implemented: true,
    message: "保存可能です。",
  };
}

function createInvalidCardConditionPreview(input: TitleConditionPreviewInput, template: TitleConditionTemplate, message: string) {
  const builder = { version: 1, mode: "builder", templateId: template.id, category: template.category, target: template.target, playStyle: input.playStyle, gameMode: input.gameMode, handTarget: input.handTarget, handTiming: input.handTiming, cardRule: input.cardRule, allSuitRule: input.allSuitRule, sameSuit: Boolean(input.sameSuit), cards: input.cards ?? [] } as Record<string, unknown>;
  if (isUnifiedTitleConditionCardTemplate(template)) builder.cardTargetRange = readTitleConditionCardTargetRange(input.cardTargetRange);
  return {
    ...input,
    conditionType: "",
    conditionParamsJson: "",
    conditionBuilderJson: JSON.stringify(builder),
    implemented: false,
    message,
  };
}

type AdminGeneratedCondition = {
  conditionType: string;
  conditionParams: Record<string, unknown>;
};

type AdminClassifiedCardCondition = {
  statKey: string;
  key: string;
};

function classifyTitleConditionSetCards(cards: TitleConditionCardInput[], template: TitleConditionTemplate): { ok: true; items: AdminClassifiedCardCondition[] } | { ok: false; message: string } {
  const items: AdminClassifiedCardCondition[] = [];
  for (const card of cards) {
    if (card.rank === "JQK") return { ok: false, message: "J/Q/Kまとめ指定はカード順条件のみ使用できます。" };
    if (card.rank === "JOKER") {
      const statKey = template.rankStatKey ?? template.cardStatKey;
      if (!statKey) return { ok: false, message: "JOKER条件metricを生成できませんでした。" };
      items.push({ statKey, key: "JOKER" });
      continue;
    }
    if (card.rank === "any") {
      if (card.suit === "any") continue;
      if (!template.suitStatKey) return { ok: false, message: "スート条件metricを生成できませんでした。" };
      items.push({ statKey: template.suitStatKey, key: card.suit });
      continue;
    }
    if (card.suit === "any") {
      if (!template.rankStatKey) return { ok: false, message: "ランク条件metricを生成できませんでした。" };
      items.push({ statKey: template.rankStatKey, key: card.rank });
      continue;
    }
    if (!template.cardStatKey) return { ok: false, message: "カード条件metricを生成できませんでした。" };
    items.push({ statKey: template.cardStatKey, key: toCardKey(card) });
  }
  const uniqueItems = uniqueCardConditionItems(items);
  return uniqueItems.length > 0 ? { ok: true, items: uniqueItems } : { ok: false, message: "カード条件を1件以上指定してください。" };
}

function uniqueCardConditionItems(items: AdminClassifiedCardCondition[]) {
  const result: AdminClassifiedCardCondition[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.statKey}:${item.key}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function createContainsAllCondition(items: AdminClassifiedCardCondition[]): AdminGeneratedCondition {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const values = groups.get(item.statKey) ?? [];
    values.push(item.key);
    groups.set(item.statKey, values);
  }

  const conditions = [...groups.entries()].map(([statKey, values]) => ({
    condition_type: "stat_json_contains_all",
    condition_params_json: { scope: "match", statKey, values: uniqueStrings(values) },
  }));

  if (conditions.length === 1) {
    const condition = conditions[0];
    return { conditionType: condition?.condition_type ?? "stat_json_contains_all", conditionParams: condition?.condition_params_json ?? {} };
  }
  return { conditionType: "all_conditions", conditionParams: { conditions } };
}

function createContainsAnyCondition(items: AdminClassifiedCardCondition[]): AdminGeneratedCondition {
  const conditions = items.map((item) => ({ condition_type: "stat_json_contains_key", condition_params_json: { scope: "match", statKey: item.statKey, key: item.key } }));
  if (conditions.length === 1) {
    const condition = conditions[0];
    return { conditionType: condition?.condition_type ?? "stat_json_contains_key", conditionParams: condition?.condition_params_json ?? {} };
  }
  return { conditionType: "any_condition", conditionParams: { conditions } };
}

function applyTitleConditionPlayStyleConstraint(condition: AdminGeneratedCondition, playStyle: TitleConditionPlayStyle): AdminGeneratedCondition {
  const statKey = playStyle === "solo" ? "is_solo_match" : playStyle === "multi" ? "is_multi_match" : "";
  if (!statKey) return condition;

  const playStyleCondition = { condition_type: "stat_flag_true", condition_params_json: { scope: "match", statKey } };
  const targetCondition = { condition_type: condition.conditionType, condition_params_json: condition.conditionParams };
  return { conditionType: "all_conditions", conditionParams: { conditions: [playStyleCondition, targetCondition] } };
}

function normalizeTitleConditionCards(cards: TitleConditionCardInput[], preserveJqkSuit = false, preserveMultipleSuits = false): TitleConditionCardInput[] {
  const normalized: TitleConditionCardInput[] = [];
  for (const card of cards) {
    const rank = normalizeTitleConditionRank(card.rank);
    const suits = preserveMultipleSuits
      ? normalizeTitleConditionSuitList(card.suits?.length ? card.suits : [card.suit])
      : normalizeTitleConditionSuitList([card.suit]);
    const suit = suits.length === 1 ? suits[0] ?? "any" : "any";
    const actor = readTitleConditionCardActor(card.actor);
    if (rank === "any" && suits.length === 0 && actor === "any") continue;
    if (rank === "JOKER") {
      normalized.push({ rank: "JOKER", suit: "any", ...(preserveMultipleSuits ? { suits: [] } : {}), actor });
      continue;
    }
    if (rank === "JQK") {
      const normalizedSuits = preserveJqkSuit ? suits : [];
      normalized.push({ rank: "JQK", suit: normalizedSuits.length === 1 ? normalizedSuits[0] ?? "any" : "any", ...(preserveMultipleSuits ? { suits: normalizedSuits } : {}), actor });
      continue;
    }
    normalized.push({ rank, suit, ...(preserveMultipleSuits ? { suits } : {}), actor });
  }
  return normalized;
}

function normalizeTitleConditionHandCards(cards: TitleConditionCardInput[], rule: TitleConditionCardRule): { ok: true; cards: TitleConditionCardInput[] } | { ok: false; message: string } {
  const normalized: TitleConditionCardInput[] = [];
  for (let index = 0; index < 4; index += 1) {
    const source = cards[index] ?? { rank: "any", suit: "any" };
    const rank = normalizeTitleConditionRank(source.rank);
    const suits = normalizeTitleConditionSuitList(source.suits ?? [source.suit]);
    if (rank === "JQK") return { ok: false, message: `手札${index + 1}にJ/Q/Kまとめ指定は使用できません。` };
    if (rank === "JOKER") {
      normalized.push({ rank: "JOKER", suit: "any", suits: [] });
      continue;
    }
    if (rank === "any" && suits.length === 0) {
      if (rule === "exact" || rule === "same_suit") normalized.push({ rank: "any", suit: "any", suits: [], wildcard: true });
      continue;
    }
    normalized.push({ rank, suit: suits.length === 1 ? suits[0] ?? "any" : "any", suits });
  }
  if (rule === "exact" && normalized.length !== 4) return { ok: false, message: "順番まで一致ではカード1〜4の位置を判定します。" };
  if (rule === "unordered" && normalized.length === 0) return { ok: false, message: "カード条件を1件以上指定してください。" };
  return { ok: true, cards: normalized };
}

function toCardKey(card: TitleConditionCardInput) {
  if (card.rank === "JOKER") return "JOKER";
  return card.suit === "any" ? card.rank : `${card.suit}${card.rank}`;
}

function uniqueStrings(values: string[]) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function createConditionByOperator(operator: TitleConditionOperator, params: { scope: string; statKey: string; value: number }) {
  if (operator === "<=") return { conditionType: "stat_value_at_most", conditionParamsJson: JSON.stringify(params) };
  if (operator === "=") return {
    conditionType: "all_conditions",
    conditionParamsJson: JSON.stringify({
      conditions: [
        { condition_type: "stat_value_at_least", condition_params_json: params },
        { condition_type: "stat_value_at_most", condition_params_json: params },
      ],
    }),
  };
  return { conditionType: "stat_count_at_least", conditionParamsJson: JSON.stringify(params) };
}

function createJsonValueConditionByOperator(operator: TitleConditionOperator, params: { scope: string; statKey: string; key: string; value: number }) {
  if (operator === "<=") return { conditionType: "stat_json_value_at_most", conditionParamsJson: JSON.stringify(params) };
  if (operator === "=") return {
    conditionType: "all_conditions",
    conditionParamsJson: JSON.stringify({
      conditions: [
        { condition_type: "stat_json_value_at_least", condition_params_json: params },
        { condition_type: "stat_json_value_at_most", condition_params_json: params },
      ],
    }),
  };
  return { conditionType: "stat_json_value_at_least", conditionParamsJson: JSON.stringify(params) };
}

function resolveTitleConditionScope(template: TitleConditionTemplate, playStyle: TitleConditionPlayStyle) {
  if (template.id === "title_acquired_count") return "global";
  if (template.id === "finish_turn_count" || template.id === "match_log_count") return "match";
  if (template.id === "solo_match_count") return "solo";
  if (template.id === "multi_match_count") return "multi";
  if (playStyle === "solo" || playStyle === "multi") return playStyle;
  return "total";
}

function getTitleConditionTemplate(templateId: string) {
  return TITLE_CONDITION_TEMPLATES.find((item) => item.id === templateId) ?? TITLE_CONDITION_TEMPLATES[1];
}

function titleConditionTemplateOptionLabel(template: TitleConditionTemplate, isCurrentHidden = false) {
  const implementationLabel = template.implemented ? "" : "（未実装）";
  const hiddenLabel = isCurrentHidden ? "（旧条件）" : "";
  return `${template.label}${implementationLabel}${hiddenLabel}`;
}

function getTitleConditionTemplateOptions(selectedTemplateId: string) {
  return TITLE_CONDITION_TEMPLATES
    .filter((template) => !template.hiddenFromTemplateSelect || template.id === selectedTemplateId)
    .map((template) => ({
      value: template.id,
      label: titleConditionTemplateOptionLabel(template, Boolean(template.hiddenFromTemplateSelect && template.id === selectedTemplateId)),
    }));
}

function renderSelectField(name: string, label: string, options: Array<{ value: string; label: string }>, selectedValue: string, disabled = false) {
  return `
    <div class="adminField">
      <label for="${name}">${label}</label>
      <select id="${name}" name="${name}" ${disabled ? "disabled" : ""}>
        ${options.map((option) => `<option value="${escapeAttribute(option.value)}" ${option.value === selectedValue ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </div>
  `;
}

function renderNumberFieldWithDisabled(name: string, label: string, value: number, min: number, max: number, disabled = false) {
  return `
    <div class="adminField">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="number" min="${min}" max="${max}" value="${value}" ${disabled ? "disabled" : ""}>
    </div>
  `;
}

function renderConditionFieldVisibility(html: string, hidden: boolean) {
  return hidden ? html.replace('<div class="adminField">', '<div class="adminField" hidden>') : html;
}

function renderTitleWizardModal() {
  if (!titleWizardState) return "";
  const content = titleWizardState.step === "graph" ? renderTitleGraphStep() : renderTitleBasicStep();
  return `
    <div class="adminModalBackdrop adminTitleWizardBackdrop" data-title-modal-backdrop>
      ${content}
      ${titleWizardState.editingConditionNodeId ? renderTitleConditionEditorModal() : ""}
      ${titleWizardState.deleteTarget ? renderTitleWizardDeleteConfirm() : ""}
      ${titleWizardState.discardConfirmOpen ? renderTitleWizardDiscardConfirm() : ""}
    </div>
  `;
}

function renderTitleGraphStep() {
  if (!titleWizardState) return "";
  const state = titleWizardState;
  const graph = state.graph;
  const conditionCount = graph.nodes.filter((node) => node.type === "condition").length;
  const operatorCount = graph.nodes.filter((node) => node.type === "operator").length;
  const hasInitialGrant = graph.nodes.some((node) => node.type === "condition" && node.conditionType === "initial_grant");
  return `
    <section class="adminModal adminTitleGraphModal" role="dialog" aria-modal="true" aria-labelledby="titleGraphModalTitle">
      <div class="adminCardHeader adminTitleWizardHeader">
        <div>
          <h2 id="titleGraphModalTitle">${editingTitle ? "称号編集" : "称号追加"}：条件相関図</h2>
          <p class="adminMuted">条件処理は左から右へ進みます。接続元ブロック右側の●をドラッグし、接続先のAND／ORブロックへ重ねてください。</p>
        </div>
        <button type="button" class="adminIconBtn" aria-label="称号設定を閉じる" data-close-title-wizard>×</button>
      </div>
      <div class="adminTitleGraphToolbar">
        <div class="adminActions">
          <button type="button" class="adminBtn primary" data-add-title-condition ${conditionCount >= TITLE_CONDITION_GRAPH_MAX_CONDITIONS || hasInitialGrant ? "disabled" : ""}>条件を追加</button>
          <button type="button" class="adminBtn" data-add-title-operator="and" ${operatorCount >= TITLE_CONDITION_GRAPH_MAX_OPERATORS || hasInitialGrant ? "disabled" : ""}>ANDブロックを追加</button>
          <button type="button" class="adminBtn" data-add-title-operator="or" ${operatorCount >= TITLE_CONDITION_GRAPH_MAX_OPERATORS || hasInitialGrant ? "disabled" : ""}>ORブロックを追加</button>
          <button type="button" class="adminBtn" data-toggle-title-graph-json>${state.graphMode === "visual" ? "JSONで記載" : "相関図で編集"}</button>
        </div>
        <div class="adminActions">
          <button type="button" class="adminBtn" data-auto-layout-title-graph ${state.graphMode === "json" ? "disabled" : ""}>自動整列</button>
          <button type="button" class="adminBtn" data-reset-title-graph ${state.graphMode === "json" ? "disabled" : ""}>配置を初期化</button>
          <span class="adminBadge">条件 ${conditionCount}/${TITLE_CONDITION_GRAPH_MAX_CONDITIONS}</span>
          <span class="adminBadge">AND／OR ${operatorCount}/${TITLE_CONDITION_GRAPH_MAX_OPERATORS}</span>
        </div>
      </div>
      ${renderTitleGraphErrors(state.graphErrors)}
      ${state.graphMode === "json" ? renderTitleGraphJsonEditor() : renderTitleGraphCanvas()}
      <div class="adminActions adminTitleWizardFooter">
        <button type="button" class="adminBtn" data-close-title-wizard>キャンセル</button>
        <button type="button" class="adminBtn primary" data-title-graph-next>次へ</button>
      </div>
    </section>
  `;
}

function renderTitleGraphErrors(errors: string[]) {
  if (errors.length === 0) return "";
  return `
    <div class="adminNotice is-error adminTitleGraphErrors">
      <strong>相関図を確認してください。</strong>
      <ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>
    </div>
  `;
}

function renderTitleGraphJsonEditor() {
  if (!titleWizardState) return "";
  return `
    <div class="adminTitleGraphJsonEditor">
      <p class="adminMuted">判定用条件JSON全体を入力します。相関図へ戻す際に、条件5件・AND／OR4件・ネスト4階層の上限を検証します。</p>
      <textarea data-title-graph-json-input spellcheck="false">${escapeHtml(titleWizardState.graphJsonText)}</textarea>
    </div>
  `;
}

function renderTitleGraphCanvas() {
  if (!titleWizardState) return "";
  const graph = titleWizardState.graph;
  const edges = graph.edges.map((edge) => renderTitleGraphEdge(edge, graph)).join("");
  const nodes = graph.nodes.map((node) => renderTitleGraphNode(node, graph)).join("");
  return `
    <div class="adminTitleGraphViewport">
      <div class="adminTitleGraphCanvas" data-title-graph-canvas style="width:${TITLE_CONDITION_GRAPH_CANVAS_WIDTH}px;height:${TITLE_CONDITION_GRAPH_CANVAS_HEIGHT}px;">
        <svg class="adminTitleGraphSvg" width="${TITLE_CONDITION_GRAPH_CANVAS_WIDTH}" height="${TITLE_CONDITION_GRAPH_CANVAS_HEIGHT}" aria-hidden="true">
          <defs>
            <marker id="titleGraphArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L8,4 L0,8 Z"></path>
            </marker>
          </defs>
          ${edges}
          <path class="adminTitleGraphPreviewEdge" data-title-graph-preview-edge hidden></path>
        </svg>
        ${nodes || `<div class="adminTitleGraphEmpty">「条件を追加」から最初の条件ブロックを追加してください。</div>`}
      </div>
    </div>
  `;
}

function renderTitleGraphEdge(edge: TitleConditionGraphEdge, graph: TitleConditionGraph) {
  const source = graph.nodes.find((node) => node.id === edge.source);
  const target = graph.nodes.find((node) => node.id === edge.target);
  if (!source || !target) return "";
  const startX = source.x + (source.type === "condition" ? TITLE_CONDITION_GRAPH_CONDITION_WIDTH : TITLE_CONDITION_GRAPH_OPERATOR_WIDTH);
  const startY = source.y + (source.type === "condition" ? TITLE_CONDITION_GRAPH_CONDITION_HEIGHT / 2 : TITLE_CONDITION_GRAPH_OPERATOR_HEIGHT / 2);
  const endX = target.x;
  const endY = target.y + TITLE_CONDITION_GRAPH_OPERATOR_HEIGHT / 2;
  const controlOffset = Math.max(54, Math.abs(endX - startX) * 0.45);
  const path = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
  const selected = titleWizardState?.selectedEdgeId === edge.id;
  return `<path class="adminTitleGraphEdge${selected ? " is-selected" : ""}" d="${path}" marker-end="url(#titleGraphArrow)" data-title-graph-edge="${escapeAttribute(edge.id)}"></path>`;
}

function renderTitleGraphNode(node: TitleConditionGraphNode, graph: TitleConditionGraph) {
  const selected = titleWizardState?.selectedNodeId === node.id;
  const invalid = titleWizardState?.graphErrorNodeIds.includes(node.id);
  const outgoing = graph.edges.filter((edge) => edge.source === node.id);
  const connected = graph.edges.filter((edge) => edge.source === node.id || edge.target === node.id);
  const classes = ["adminTitleGraphNode", node.type === "condition" ? "is-condition" : "is-operator", selected ? "is-selected" : "", invalid ? "is-invalid" : ""].filter(Boolean).join(" ");
  const style = `left:${node.x}px;top:${node.y}px;`;
  if (node.type === "condition") {
    const conditionNumber = graph.nodes.filter((item) => item.type === "condition").findIndex((item) => item.id === node.id) + 1;
    return `
      <article class="${classes}" style="${style}" data-title-graph-node="${escapeAttribute(node.id)}" data-title-graph-target-node="${escapeAttribute(node.id)}">
        <button type="button" class="adminTitleGraphMoveHandle" data-title-graph-move="${escapeAttribute(node.id)}" aria-label="条件ブロックを移動">⋮⋮</button>
        <button type="button" class="adminTitleGraphNodeBody" data-title-graph-select-node="${escapeAttribute(node.id)}">
          <span class="adminTitleGraphNodeKicker">条件${conditionNumber}</span>
          <strong>${escapeHtml(node.summary)}</strong>
          <small>${escapeHtml(node.conditionType)}</small>
        </button>
        <button type="button" class="adminTitleGraphConnectHandle" data-title-graph-connect="${escapeAttribute(node.id)}" aria-label="接続を開始">●</button>
        ${selected ? renderTitleGraphNodeMenu(node, connected, outgoing) : ""}
      </article>
    `;
  }
  return `
    <article class="${classes}" style="${style}" data-title-graph-node="${escapeAttribute(node.id)}" data-title-graph-target-node="${escapeAttribute(node.id)}">
      <button type="button" class="adminTitleGraphMoveHandle" data-title-graph-move="${escapeAttribute(node.id)}" aria-label="${node.operator.toUpperCase()}ブロックを移動">⋮⋮</button>
      <button type="button" class="adminTitleGraphOperatorBody" data-title-graph-select-node="${escapeAttribute(node.id)}">${node.operator.toUpperCase()}</button>
      <button type="button" class="adminTitleGraphConnectHandle" data-title-graph-connect="${escapeAttribute(node.id)}" aria-label="接続を開始">●</button>
      ${selected ? renderTitleGraphNodeMenu(node, connected, outgoing) : ""}
    </article>
  `;
}

function renderTitleGraphNodeMenu(node: TitleConditionGraphNode, connectedEdges: TitleConditionGraphEdge[], outgoingEdges: TitleConditionGraphEdge[]) {
  return `
    <div class="adminTitleGraphNodeMenu" data-title-graph-node-menu>
      ${node.type === "condition"
        ? `<button type="button" class="adminBtn" data-edit-title-condition-node="${escapeAttribute(node.id)}">編集</button>`
        : `<button type="button" class="adminBtn" data-change-title-operator="${escapeAttribute(node.id)}">${node.operator === "and" ? "OR" : "AND"}ブロックに変える</button>`}
      <button type="button" class="adminBtn danger" data-delete-title-graph-node="${escapeAttribute(node.id)}">削除</button>
      ${connectedEdges.length > 0 ? `
        <div class="adminTitleGraphDisconnectList">
          <strong>接続を解除</strong>
          ${connectedEdges.map((edge) => `<button type="button" class="adminBtn" data-disconnect-title-graph-edge="${escapeAttribute(edge.id)}">${escapeHtml(titleGraphEdgeLabel(edge))}</button>`).join("")}
          ${connectedEdges.length > 1 ? `<button type="button" class="adminBtn danger" data-disconnect-all-title-graph-node="${escapeAttribute(node.id)}">すべての接続を解除</button>` : ""}
        </div>
      ` : ""}
      ${outgoingEdges.length > 0 ? `<span class="adminMuted">出力先への接続は1本までです。</span>` : ""}
    </div>
  `;
}

function titleGraphEdgeLabel(edge: TitleConditionGraphEdge) {
  if (!titleWizardState) return "接続";
  const source = titleWizardState.graph.nodes.find((node) => node.id === edge.source);
  const target = titleWizardState.graph.nodes.find((node) => node.id === edge.target);
  return `${titleGraphNodeShortLabel(source)} → ${titleGraphNodeShortLabel(target)}`;
}

function titleGraphNodeShortLabel(node: TitleConditionGraphNode | undefined) {
  if (!node) return "不明なブロック";
  return node.type === "condition" ? node.summary : node.operator.toUpperCase();
}

function renderTitleConditionEditorModal() {
  if (!titleWizardState?.editingConditionNodeId) return "";
  const nodeId = titleWizardState.editingConditionNodeId;
  const node = nodeId === "new" ? null : titleWizardState.graph.nodes.find((item): item is TitleConditionGraphConditionNode => item.id === nodeId && item.type === "condition") ?? null;
  const title = node ? titleMasterFromConditionNode(node) : null;
  return `
    <div class="adminNestedModalBackdrop">
      <section class="adminModal adminWideModal adminTitleConditionEditorModal" role="dialog" aria-modal="true" aria-labelledby="titleConditionEditorModalTitle">
        <div class="adminCardHeader">
          <h2 id="titleConditionEditorModalTitle">${node ? "条件ブロックを編集" : "条件ブロックを追加"}</h2>
          <button type="button" class="adminIconBtn" aria-label="条件設定を閉じる" data-close-title-condition-editor>×</button>
        </div>
        <form id="titleConditionEditorForm" class="adminForm">
          ${renderTitleConditionBuilder(title)}
          <div class="adminActions">
            <button type="button" class="adminBtn" data-close-title-condition-editor>キャンセル</button>
            <button type="submit" class="adminBtn primary">${node ? "変更" : "追加"}</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderTitleBasicStep() {
  if (!titleWizardState) return "";
  const basic = titleWizardState.basic;
  const expression = buildTitleConditionExpression(titleWizardState.graph);
  const initial = titleWizardState.graph.nodes.some((node) => node.type === "condition" && node.conditionType === "initial_grant");
  return `
    <section class="adminModal adminWideModal adminTitleBasicModal" role="dialog" aria-modal="true" aria-labelledby="titleBasicModalTitle">
      <div class="adminCardHeader adminTitleWizardHeader">
        <div>
          <h2 id="titleBasicModalTitle">${editingTitle ? "称号編集" : "称号追加"}：基本情報</h2>
          <p class="adminMuted">取得条件テキストは相関図から参考文言を生成します。管理者が自由に編集できます。</p>
        </div>
        <button type="button" class="adminIconBtn" aria-label="称号設定を閉じる" data-close-title-wizard>×</button>
      </div>
      <form id="titleBasicForm" class="adminForm">
        ${basic.titleId ? `<input type="hidden" name="titleId" value="${escapeAttribute(basic.titleId)}">` : ""}
        <div class="adminFormGrid">
          ${renderTextField("titleCode", "称号コード", basic.titleCode)}
          ${renderTextField("titleName", "称号名", basic.titleName)}
          ${renderNumberField("rarity", "レア度", basic.rarity, 1, 5)}
          ${renderNumberField("sortOrder", "並び順", basic.sortOrder, -999999, 999999)}
          <div class="adminField adminFull">
            <label for="unlockConditionText">取得条件テキスト</label>
            <textarea id="unlockConditionText" name="unlockConditionText" data-title-unlock-condition-text>${escapeHtml(basic.unlockConditionText)}</textarea>
            <button type="button" class="adminBtn" data-regenerate-title-condition-text>条件式から文言を再生成</button>
          </div>
          ${renderTextareaField("description", "説明", basic.description)}
        </div>
        <section class="adminSubCard adminFullWidthCard">
          <h3>条件式プレビュー</h3>
          <p class="adminTitleConditionExpression">${escapeHtml(expression || "条件式を生成できませんでした。")}</p>
        </section>
        <div class="adminActions">
          <div class="adminCheck">
            <input id="isInitial" name="isInitial" type="checkbox" ${initial ? "checked" : ""} disabled>
            <label for="isInitial">初期所持</label>
          </div>
          ${renderCheckField("isActive", "公開", basic.isActive)}
        </div>
        ${renderTitleIconRewardFieldForDraft(basic)}
        <div class="adminActions adminTitleWizardFooter">
          <button type="button" class="adminBtn" data-title-basic-back>戻る</button>
          <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>確認へ</button>
        </div>
      </form>
    </section>
  `;
}

function renderTitleIconRewardFieldForDraft(basic: TitleBasicDraft) {
  const title = editingTitle ? { ...editingTitle, iconRewardIds: basic.iconRewardIds } : null;
  if (title) return renderTitleIconRewardField(title);
  const temporary: TitleMaster = {
    id: "",
    code: "",
    name: "",
    description: "",
    unlockConditionText: "",
    rarity: 1,
    conditionType: "",
    conditionParamsJson: "{}",
    conditionBuilderJson: "{}",
    isInitial: false,
    isActive: true,
    sortOrder: 0,
    iconRewardIds: basic.iconRewardIds,
    updatedAt: "",
  };
  return renderTitleIconRewardField(temporary);
}

function renderTitleWizardDeleteConfirm() {
  if (!titleWizardState?.deleteTarget) return "";
  const target = titleWizardState.deleteTarget;
  const isNode = target.kind === "node";
  const isAll = target.kind === "all_edges";
  const title = isNode ? "ブロックを削除" : isAll ? "すべての接続を解除" : "接続を解除";
  const message = isNode
    ? "このブロックを削除しますか？接続されている線も削除されます。"
    : isAll
      ? "このブロックに接続されている線をすべて解除しますか？ブロック自体は残ります。"
      : "この接続を解除しますか？ブロック自体は残ります。";
  return `
    <div class="adminNestedModalBackdrop">
      <section class="adminModal adminSmallModal" role="dialog" aria-modal="true" aria-labelledby="titleGraphDeleteConfirmTitle">
        <h2 id="titleGraphDeleteConfirmTitle">${title}</h2>
        <p>${message}</p>
        <div class="adminActions">
          <button type="button" class="adminBtn" data-cancel-title-graph-delete>キャンセル</button>
          <button type="button" class="adminBtn danger" data-confirm-title-graph-delete>実行</button>
        </div>
      </section>
    </div>
  `;
}

function renderTitleWizardDiscardConfirm() {
  return `
    <div class="adminNestedModalBackdrop">
      <section class="adminModal adminSmallModal" role="dialog" aria-modal="true" aria-labelledby="titleWizardDiscardTitle">
        <h2 id="titleWizardDiscardTitle">編集内容を破棄</h2>
        <p>編集内容を破棄して閉じますか？</p>
        <div class="adminActions">
          <button type="button" class="adminBtn" data-cancel-title-wizard-discard>編集を続ける</button>
          <button type="button" class="adminBtn danger" data-confirm-title-wizard-discard>破棄して閉じる</button>
        </div>
      </section>
    </div>
  `;
}

function renderIconTab() {
  const visibleIcons = getPagedAdminItems("icons", icons);
  const detailPanel = editingIcon ? `
      <div class="adminCard adminDetailCard">
        <div class="adminCardHeader">
          <h2>アイコン詳細・編集</h2>
          <button type="button" class="adminIconBtn" aria-label="アイコン詳細を閉じる" data-close-icon-detail>×</button>
        </div>
        ${renderIconForm()}
      </div>` : "";
  return `
    <section class="adminGrid${editingIcon ? "" : " is-list-only"}">
      <div class="adminCard">
        <div class="adminCardHeader">
          <h2>アイコン一覧</h2>
          <button type="button" class="adminBtn primary" data-open-icon-create>アイコン追加</button>
        </div>
        <p class="adminMuted">画像素材管理に存在する有効なアイコンだけを表示します。</p>
        <div class="adminTableWrap">
          <table class="adminTable">
            <thead><tr><th>並び</th><th>アイコン</th><th>状態</th><th>画像</th><th>操作</th></tr></thead>
            <tbody>${visibleIcons.map(renderIconRow).join("") || `<tr><td colspan="5">登録済みアイコンはありません。画像素材管理で素材をアップロード後、アイコン追加から登録してください。</td></tr>`}</tbody>
          </table>
        </div>
        ${renderAdminPagination("icons", icons.length)}
      </div>
      ${detailPanel}
    </section>
    ${isIconCreateModalOpen ? renderIconCreateModal() : ""}
  `;
}

function renderIconRow(icon: IconMaster) {
  const pendingDelete = hasPendingIconDelete(icon.id);
  return `
    <tr>
      <td>${icon.sortOrder}</td>
      <td>
        <strong>${escapeHtml(icon.name)}</strong><br>
        <span class="adminMuted">${escapeHtml(icon.code)}</span><br>
        ${renderIconTypeBadges(icon.iconTypeIds)}
      </td>
      <td>
        <span class="adminBadge${icon.isActive ? " is-on" : ""}">${icon.isActive ? "公開" : "非公開"}</span>
        ${icon.isInitial ? `<span class="adminBadge">初期</span>` : ""}
        ${icon.isGuestAvailable ? `<span class="adminBadge">ゲスト可</span>` : ""}
        ${icon.isDefault ? `<span class="adminBadge is-owner">デフォルト</span>` : ""}
        ${pendingDelete ? `<span class="adminBadge is-owner">削除予定</span>` : ""}
      </td>
      <td><span class="adminMuted">${escapeHtml(icon.imagePath)}</span></td>
      <td>${renderIconManagementActions(icon)}</td>
    </tr>
  `;
}

function renderIconManagementActions(icon: IconMaster) {
  const asset = assetIcons.find((item) => item.id === icon.id);
  const editButton = `<button type="button" class="adminBtn" data-edit-icon="${escapeHtml(icon.id)}">編集</button>`;
  if (!asset) return `${editButton} <span class="adminMuted">素材なし</span>`;
  return editButton;
}

function renderIconTypeBadges(iconTypeIds: string[]) {
  const labels = iconTypeIds
    .map((id) => iconTypes.find((item) => item.id === id)?.name ?? "")
    .filter(Boolean);
  if (labels.length === 0) return `<span class="adminMuted">種別なし</span>`;
  return labels.map((label) => `<span class="adminBadge">${escapeHtml(label)}</span>`).join(" ");
}

function renderIconTypeSelectFields(selectedIds: string[]) {
  const normalized = normalizeIconTypeIds(selectedIds);
  return Array.from({ length: 3 }, (_, index) => {
    const selected = normalized[index] ?? "";
    return `
        <div class="adminField">
          <label for="iconTypeId${index + 1}">アイコン種別${index + 1}</label>
          <select id="iconTypeId${index + 1}" name="iconTypeIds" data-icon-type-select>
            <option value="" ${selected ? "" : "selected"}>未選択</option>
            ${iconTypes.map((item) => `<option value="${escapeAttribute(item.id)}" ${item.id === selected ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
            <option value="__new_icon_type__">新規追加</option>
          </select>
        </div>`;
  }).join("");
}

function normalizeIconTypeIds(values: readonly string[]) {
  const result: string[] = [];
  for (const value of values) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized || result.includes(normalized)) continue;
    if (!iconTypes.some((item) => item.id === normalized && item.isActive)) continue;
    result.push(normalized);
    if (result.length >= 3) break;
  }
  return result;
}

function renderIconForm() {
  const icon = editingIcon;
  return `
    <form id="iconForm" class="adminForm">
      ${icon ? `<input type="hidden" name="iconId" value="${escapeAttribute(icon.id)}">` : ""}
      <div class="adminFormGrid">
        ${renderTextField("iconCode", "アイコンコード", icon?.code ?? "")}
        ${renderTextField("iconName", "アイコン名", icon?.name ?? "")}
        ${renderTextField("imagePath", "画像パス", icon?.imagePath ?? "/assets/icons/01_boy.png")}
        ${renderIconTypeSelectFields(icon?.iconTypeIds ?? [])}
        ${renderNumberField("rarity", "レア度", icon?.rarity ?? 1, 1, 5)}
        ${renderNumberField("sortOrder", "並び順", icon?.sortOrder ?? nextSortOrder(icons), -999999, 999999)}
        ${renderTextField("conditionType", "condition_type", icon?.conditionType ?? "stat_count_at_least")}
        ${renderTextareaField("conditionParamsJson", "condition_params_json", icon?.conditionParamsJson ?? `{"scope":"total","statKey":"match_count","value":1}`)}
        ${renderTextareaField("unlockConditionText", "取得条件テキスト", icon?.unlockConditionText ?? "")}
        ${renderTextareaField("description", "説明", icon?.description ?? "")}
      </div>
      <div class="adminActions">
        ${renderCheckField("isInitial", "初期所持", icon?.isInitial ?? false)}
        ${renderCheckField("isGuestAvailable", "ゲスト利用可", icon?.isGuestAvailable ?? false)}
        ${renderCheckField("isDefault", "デフォルトアイコンにする", icon?.isDefault ?? false)}
        ${renderCheckField("isActive", "公開", icon?.isActive ?? true)}
      </div>
      <div class="adminActions">
        <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>保存</button>
        ${icon ? `<button type="button" class="adminBtn" data-cancel-icon>詳細を閉じる</button>` : ""}
      </div>
    </form>
  `;
}

function renderTitleDeleteModal(title: TitleMaster | null) {
  if (!title) return "";
  return `
    <div class="adminModalBackdrop" data-title-delete-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="titleDeleteModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="titleDeleteModalTitle">称号削除の一時保存</h2>
            <p class="adminMuted">この時点ではまだ反映されません。反映設定タブから反映してください。</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="称号削除を閉じる" data-close-title-delete>×</button>
        </div>
        <form id="titleDeleteForm" class="adminForm">
          <input type="hidden" name="titleId" value="${escapeAttribute(title.id)}">
          <section class="adminSubCard adminFullWidthCard">
            <h3>${escapeHtml(title.name)}</h3>
            <p class="adminMuted">${escapeHtml(title.code)} / ${escapeHtml(title.id)}</p>
            <p>${escapeHtml(title.description)}</p>
          </section>
          <p class="adminMuted">反映時に、この称号は一覧・図鑑・取得判定対象から外れます。所持履歴と過去通知は内部的に残し、現在設定中のユーザーはデフォルト称号へ戻します。</p>
          ${renderTextareaField("titleDeleteReason", "削除理由（必須）", "")}
          ${renderCheckField("titleDeleteCreateAnnouncement", "お知らせで周知する", false)}
          <div class="adminSubCard adminFullWidthCard">
            <h3>お知らせ内容</h3>
            <p class="adminMuted">周知する場合のみ入力してください。反映時にお知らせも作成されます。</p>
            <div class="adminFormGrid">
              ${renderTextField("titleDeleteAnnouncementTitle", "タイトル", `${title.name}の削除について`)}
              ${renderNumberField("titleDeleteAnnouncementPriority", "優先度", 0, -999999, 999999)}
              <div class="adminField">
                <label for="titleDeleteAnnouncementCategory">種別</label>
                <select id="titleDeleteAnnouncementCategory" name="titleDeleteAnnouncementCategory">
                  ${renderAnnouncementCategoryOption("normal", "通常", "important")}
                  ${renderAnnouncementCategoryOption("maintenance", "メンテナンス", "important")}
                  ${renderAnnouncementCategoryOption("bug", "不具合", "important")}
                  ${renderAnnouncementCategoryOption("update", "アップデート", "important")}
                  ${renderAnnouncementCategoryOption("important", "重要", "important")}
                </select>
              </div>
              ${renderDateTimeField("titleDeleteAnnouncementStartsAt", "表示開始日時", null)}
              ${renderDateTimeField("titleDeleteAnnouncementEndsAt", "表示終了日時", null)}
              ${renderTextareaField("titleDeleteAnnouncementSummary", "概要", `${title.name}の称号を削除します。`)}
              ${renderTextareaField("titleDeleteAnnouncementBody", "本文", `${title.name}の称号を削除します。反映後、この称号は称号一覧や図鑑、取得対象から外れます。`)}
            </div>
            <div class="adminActions">
              ${renderCheckField("titleDeleteAnnouncementIsActive", "公開", true)}
            </div>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn danger" ${isLoading ? "disabled" : ""}>一時保存する</button>
          </div>
        </form>
      </section>
    </div>
  `;
}


function renderTitleSaveConfirmModal(confirm: TitleSaveConfirmState) {
  const payload = confirm.payload;
  const titleName = readPayloadString(payload.titleName);
  const rarity = readPayloadString(payload.rarity);
  const isActive = payload.isActive === true || payload.isActive === 1 ? "公開" : "非公開";
  const iconRewardIds = Array.isArray(payload.iconRewardIds) ? payload.iconRewardIds.filter((value): value is string => typeof value === "string") : [];
  return `
    <div class="adminModalBackdrop" data-title-save-confirm-backdrop>
      <section class="adminModal adminWideModal" role="dialog" aria-modal="true" aria-labelledby="titleSaveConfirmModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="titleSaveConfirmModalTitle">称号反映前確認</h2>
            <p class="adminMuted">この時点ではまだ反映されません。内容を確認してから反映設定に追加してください。</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="称号反映前確認を閉じる" data-close-title-save-confirm>×</button>
        </div>
        <div class="adminForm">
          <section class="adminSubCard adminFullWidthCard">
            <h3>${escapeHtml(titleName || "-")}</h3>
            <dl class="adminDefinitionList">
              ${renderDefinitionItem("操作", confirm.isEdit ? "称号編集" : "称号追加")}
              ${renderDefinitionItem("称号コード", readPayloadString(payload.titleCode) || "-")}
              ${renderDefinitionItem("レア度", rarity || "-")}
              ${renderDefinitionItem("公開状態", isActive)}
              ${renderDefinitionItem("取得条件テキスト", readPayloadString(payload.unlockConditionText) || "-")}
              ${renderDefinitionItem("条件式", confirm.conditionExpression || "-")}
              ${renderDefinitionItem("報酬アイコン", iconRewardIds.length > 0 ? iconRewardIds.join("、") : "なし")}
              ${renderDefinitionItem("取得条件を達成しているユーザー", renderTitleAchievementCount(confirm.effect))}
            </dl>
            <p class="adminMuted">${escapeHtml(confirm.effect.note || "")}</p>
          </section>
          <details class="adminSubCard adminFullWidthCard">
            <summary>生成JSONを表示</summary>
            <div class="adminJsonPreviewGrid">
              <div><span>condition_type</span><pre>${escapeHtml(readPayloadString(payload.conditionType) || "-")}</pre></div>
              <div><span>condition_params_json</span><pre>${escapeHtml(readPayloadString(payload.conditionParamsJson) || "{}")}</pre></div>
              <div><span>condition_builder_json</span><pre>${escapeHtml(readPayloadString(payload.conditionBuilderJson) || "{}")}</pre></div>
            </div>
          </details>
          <div class="adminNotice is-warning">
            ${confirm.effect.achievementCountStatus === "counted"
              ? "反映後、条件を満たしているユーザーは次回称号判定時に取得対象になります。"
              : "この条件は過去試合を再判定しません。反映後、新たに条件を満たした場合に取得対象になります。"}
          </div>
          <div class="adminActions">
            <button type="button" class="adminBtn" data-close-title-save-confirm>修正する</button>
            <button type="button" class="adminBtn primary" data-confirm-title-save ${isLoading ? "disabled" : ""}>反映設定に追加</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderTitleAchievementCount(effect: TitleAchievementEffect) {
  if (effect.achievementCountStatus !== "counted") return "集計対象外";
  return `${effect.achievedUserCount ?? 0}人`;
}

function readPayloadString(value: SavePayloadValue | undefined) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function renderIconCreateModal() {
  return `
    <div class="adminModalBackdrop" data-icon-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="iconCreateModalTitle">
        <div class="adminCardHeader">
          <h2 id="iconCreateModalTitle">アイコン追加</h2>
          <button type="button" class="adminIconBtn" aria-label="アイコン追加を閉じる" data-close-icon-create>×</button>
        </div>
        ${renderIconForm()}
      </section>
    </div>
  `;
}

function renderAssetTab() {
  const iconDeleteTarget = iconDeleteTargetId ? assetIcons.find((item) => item.id === iconDeleteTargetId) ?? null : null;
  const iconReplaceTarget = iconReplaceTargetId ? assetIcons.find((item) => item.id === iconReplaceTargetId) ?? null : null;
  const loadingIllustrationDeleteTarget = loadingIllustrationDeleteTargetId ? assetLoadingIllustrations.find((item) => item.id === loadingIllustrationDeleteTargetId) ?? null : null;
  const loadingIllustrationReplaceTarget = loadingIllustrationReplaceTargetId ? assetLoadingIllustrations.find((item) => item.id === loadingIllustrationReplaceTargetId) ?? null : null;
  return `
    <section class="adminAssetGrid">
      <div class="adminCard">
        <h2>アイコン素材アップロード</h2>
        <p class="adminMuted">png / jpg / jpeg / webp、3MBまで。登録直後は非公開です。</p>
        ${renderAssetUploadForm("icon", "assetIconForm", "アイコン画像を選択", "アイコン素材名")}${renderAssetTable(assetIcons, "アイコン素材", "icon")}
      </div>
      <div class="adminCard">
        <h2>ロードイラスト素材アップロード</h2>
        <p class="adminMuted">png / jpg / jpeg / webp、5MBまで。登録直後は非公開です。</p>
        ${renderAssetUploadForm("loading-illustration", "assetLoadingIllustrationForm", "ロードイラスト画像を選択", "ロードイラスト素材名")}${renderAssetTable(assetLoadingIllustrations, "ロードイラスト素材", "loading-illustration")}
      </div>
    </section>
    ${iconDeleteTarget ? renderIconDeleteModal(iconDeleteTarget) : ""}
    ${iconReplaceTarget ? renderIconReplaceModal(iconReplaceTarget) : ""}
    ${loadingIllustrationDeleteTarget ? renderLoadingIllustrationDeleteModal(loadingIllustrationDeleteTarget) : ""}
    ${loadingIllustrationReplaceTarget ? renderLoadingIllustrationReplaceModal(loadingIllustrationReplaceTarget) : ""}
  `;
}

function renderAssetUploadForm(assetType: "icon" | "loading-illustration", formId: string, fileLabel: string, nameLabel: string) {
  return `
    <form id="${formId}" class="adminForm adminAssetForm">
      <input type="hidden" name="assetType" value="${assetType}">
      <div class="adminField">
        <label for="${formId}File">${fileLabel}</label>
        <input id="${formId}File" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" required>
      </div>
      <div class="adminField">
        <label for="${formId}AssetName">${nameLabel}</label>
        <input id="${formId}AssetName" name="assetName" type="text" value="">
      </div>
      ${assetType === "icon" ? renderIconTypeSelectFields([]) : ""}
      <div class="adminField adminFull">
        <label for="${formId}Description">説明（任意）</label>
        <textarea id="${formId}Description" name="description"></textarea>
      </div>
      <div class="adminActions">
        <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>アップロード</button>
      </div>
    </form>
  `;
}

function renderAssetTable(items: AssetItem[], label: string, assetType: "icon" | "loading-illustration") {
  const pageKey: AdminListPageKey = assetType === "icon" ? "assetIcons" : "assetLoadingIllustrations";
  const visibleItems = getPagedAdminItems(pageKey, items);
  return `
    <div class="adminAssetList">
      <h3>${label}一覧</h3>
      <div class="adminTableWrap">
        <table class="adminTable">
          <thead><tr><th>プレビュー</th><th>素材</th><th>保存</th><th>状態</th><th>操作</th></tr></thead>
          <tbody>${visibleItems.map((item) => renderAssetRow(item, assetType)).join("") || `<tr><td colspan="5">素材がありません。</td></tr>`}</tbody>
        </table>
      </div>
      ${renderAdminPagination(pageKey, items.length)}
    </div>
  `;
}

function renderAssetRow(item: AssetItem, assetType: "icon" | "loading-illustration") {
  const previewClass = assetType === "icon" ? "adminAssetPreview is-icon" : "adminAssetPreview";
  return `
    <tr>
      <td><img class="${previewClass}" src="${escapeAttribute(item.previewPath)}" alt="${escapeAttribute(item.name)}"></td>
      <td>
        <strong>${escapeHtml(item.name)}</strong><br>
        <span class="adminMuted">${escapeHtml(item.code)}</span><br>
        <span class="adminMuted">${escapeHtml(item.id)}</span>
      </td>
      <td>
        <span class="adminBadge${item.storageProvider === "r2" ? " is-on" : ""}">${escapeHtml(item.storageProvider)}</span><br>
        <span class="adminMuted">${escapeHtml(formatBytes(item.fileSize))}</span><br>
        <span class="adminMuted">${escapeHtml(item.mimeType ?? "-")}</span>
      </td>
      <td>
        <span class="adminBadge${item.isActive ? " is-on" : ""}">${item.isActive ? "公開" : "非公開"}</span><br>
        <span class="adminMuted">${escapeHtml(formatDateTime(item.uploadedAt))}</span>
      </td>
      <td>${renderAssetActions(item, assetType)}</td>
    </tr>
  `;
}

function renderAssetActions(item: AssetItem, assetType: "icon" | "loading-illustration") {
  if (assetType === "icon") {
    if (hasPendingIconDelete(item.id)) return `<button type="button" class="adminBtn" disabled>削除予定</button>`;
    if (hasPendingIconReplace(item.id)) return `<button type="button" class="adminBtn" disabled>差し替え予定</button>`;
    if (item.storageProvider !== "r2") return `<button type="button" class="adminBtn" disabled>差し替え不可 / 削除不可</button>`;
    return `<div class="adminActions"><button type="button" class="adminBtn" data-open-icon-replace="${escapeAttribute(item.id)}">差し替え</button><button type="button" class="adminBtn danger" data-open-icon-delete="${escapeAttribute(item.id)}">削除</button></div>`;
  }

  if (hasPendingLoadingIllustrationDelete(item.id)) return `<button type="button" class="adminBtn" disabled>削除予定</button>`;
  if (hasPendingLoadingIllustrationReplace(item.id)) return `<button type="button" class="adminBtn" disabled>差し替え予定</button>`;
  if (item.storageProvider !== "r2") return `<button type="button" class="adminBtn" disabled>差し替え不可 / 削除不可</button>`;
  return `<div class="adminActions"><button type="button" class="adminBtn" data-open-loading-illustration-replace="${escapeAttribute(item.id)}">差し替え</button><button type="button" class="adminBtn danger" data-open-loading-illustration-delete="${escapeAttribute(item.id)}">削除</button></div>`;
}

function renderIconDeleteModal(item: AssetItem) {
  return `
    <div class="adminModalBackdrop" data-icon-delete-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="iconDeleteModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="iconDeleteModalTitle">アイコン削除の一時保存</h2>
            <p class="adminMuted">この時点ではまだ反映されません。反映設定タブから反映してください。</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="アイコン削除を閉じる" data-close-icon-delete>×</button>
        </div>
        <form id="iconDeleteForm" class="adminForm">
          <input type="hidden" name="iconId" value="${escapeAttribute(item.id)}">
          <div class="adminLoadingPreview">
            <img class="adminAssetPreview is-icon" src="${escapeAttribute(item.previewPath)}" alt="${escapeAttribute(item.name)}">
            <div>
              <strong>${escapeHtml(item.name)}</strong><br>
              <span class="adminMuted">${escapeHtml(item.code)}</span><br>
              <span class="adminMuted">${escapeHtml(item.id)}</span>
            </div>
          </div>
          <p class="adminMuted">反映時に、このアイコンは一覧から削除され、所持ユーザーからも外れます。現在設定中のユーザーは初期アイコンへ戻ります。</p>
          ${renderTextareaField("iconDeleteReason", "削除理由（必須）", "")}
          ${renderCheckField("iconDeleteCreateAnnouncement", "お知らせで周知する", false)}
          <div class="adminSubCard adminFullWidthCard">
            <h3>お知らせ内容</h3>
            <p class="adminMuted">周知する場合のみ入力してください。反映時にお知らせも作成されます。</p>
            <div class="adminFormGrid">
              ${renderTextField("iconDeleteAnnouncementTitle", "タイトル", `${item.name}の削除について`)}
              ${renderNumberField("iconDeleteAnnouncementPriority", "優先度", 0, -999999, 999999)}
              <div class="adminField">
                <label for="iconDeleteAnnouncementCategory">種別</label>
                <select id="iconDeleteAnnouncementCategory" name="iconDeleteAnnouncementCategory">
                  ${renderAnnouncementCategoryOption("normal", "通常", "important")}
                  ${renderAnnouncementCategoryOption("maintenance", "メンテナンス", "important")}
                  ${renderAnnouncementCategoryOption("bug", "不具合", "important")}
                  ${renderAnnouncementCategoryOption("update", "アップデート", "important")}
                  ${renderAnnouncementCategoryOption("important", "重要", "important")}
                </select>
              </div>
              ${renderDateTimeField("iconDeleteAnnouncementStartsAt", "表示開始日時", null)}
              ${renderDateTimeField("iconDeleteAnnouncementEndsAt", "表示終了日時", null)}
              ${renderTextareaField("iconDeleteAnnouncementSummary", "概要", `${item.name}のアイコンを削除します。`)}
              ${renderTextareaField("iconDeleteAnnouncementBody", "本文", `${item.name}のアイコンを削除します。現在このアイコンを設定している場合は、初期アイコンへ変更されます。`)}
            </div>
            <div class="adminActions">
              ${renderCheckField("iconDeleteAnnouncementIsActive", "公開", true)}
            </div>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn danger" ${isLoading ? "disabled" : ""}>一時保存する</button>
          </div>
        </form>
      </section>
    </div>
  `;
}


function renderIconReplaceModal(item: AssetItem) {
  return `
    <div class="adminModalBackdrop" data-icon-replace-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="iconReplaceModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="iconReplaceModalTitle">アイコン差し替えの一時保存</h2>
            <p class="adminMuted">この時点ではまだ反映されません。反映設定タブから反映してください。</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="アイコン差し替えを閉じる" data-close-icon-replace>×</button>
        </div>
        <form id="iconReplaceForm" class="adminForm">
          <input type="hidden" name="assetAction" value="icon_replace">
          <input type="hidden" name="iconId" value="${escapeAttribute(item.id)}">
          <div class="adminLoadingPreview">
            <img class="adminAssetPreview is-icon" src="${escapeAttribute(item.previewPath)}" alt="${escapeAttribute(item.name)}">
            <div>
              <strong>${escapeHtml(item.name)}</strong><br>
              <span class="adminMuted">${escapeHtml(item.code)}</span><br>
              <span class="adminMuted">${escapeHtml(item.id)}</span>
            </div>
          </div>
          <p class="adminMuted">反映時に、このアイコンの画像だけを差し替えます。所持ユーザー、設定中ユーザー、称号報酬紐づけは維持されます。</p>
          <div class="adminField">
            <label for="iconReplaceFile">差し替え後のアイコン画像（png / jpg / jpeg / webp、3MBまで）</label>
            <input id="iconReplaceFile" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" required>
          </div>
          ${renderTextareaField("iconReplaceReason", "差し替え理由（必須）", "")}
          ${renderCheckField("iconReplaceCreateAnnouncement", "お知らせで周知する", false)}
          <div class="adminSubCard adminFullWidthCard">
            <h3>お知らせ内容</h3>
            <p class="adminMuted">周知する場合のみ入力してください。反映時にお知らせも作成されます。</p>
            <div class="adminFormGrid">
              ${renderTextField("iconReplaceAnnouncementTitle", "タイトル", `${item.name}の画像差し替えについて`)}
              ${renderNumberField("iconReplaceAnnouncementPriority", "優先度", 0, -999999, 999999)}
              <div class="adminField">
                <label for="iconReplaceAnnouncementCategory">種別</label>
                <select id="iconReplaceAnnouncementCategory" name="iconReplaceAnnouncementCategory">
                  ${renderAnnouncementCategoryOption("normal", "通常", "update")}
                  ${renderAnnouncementCategoryOption("maintenance", "メンテナンス", "update")}
                  ${renderAnnouncementCategoryOption("bug", "不具合", "update")}
                  ${renderAnnouncementCategoryOption("update", "アップデート", "update")}
                  ${renderAnnouncementCategoryOption("important", "重要", "update")}
                </select>
              </div>
              ${renderDateTimeField("iconReplaceAnnouncementStartsAt", "表示開始日時", null)}
              ${renderDateTimeField("iconReplaceAnnouncementEndsAt", "表示終了日時", null)}
              ${renderTextareaField("iconReplaceAnnouncementSummary", "概要", `${item.name}のアイコン画像を差し替えます。`)}
              ${renderTextareaField("iconReplaceAnnouncementBody", "本文", `${item.name}のアイコン画像を差し替えます。所持状態や設定状態はそのまま維持されます。`)}
            </div>
            <div class="adminActions">
              ${renderCheckField("iconReplaceAnnouncementIsActive", "公開", true)}
            </div>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>一時保存する</button>
          </div>
        </form>
      </section>
    </div>
  `;
}


function renderLoadingIllustrationDeleteModal(item: LoadingIllustrationAssetItem) {
  return `
    <div class="adminModalBackdrop" data-loading-illustration-delete-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="loadingIllustrationDeleteModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="loadingIllustrationDeleteModalTitle">ロードイラスト削除の一時保存</h2>
            <p class="adminMuted">この時点ではまだ反映されません。反映設定タブから反映してください。</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="ロードイラスト削除を閉じる" data-close-loading-illustration-delete>×</button>
        </div>
        <form id="loadingIllustrationDeleteForm" class="adminForm">
          <input type="hidden" name="illustrationId" value="${escapeAttribute(item.id)}">
          <div class="adminLoadingPreview">
            <img class="adminAssetPreview" src="${escapeAttribute(item.previewPath)}" alt="${escapeAttribute(item.name)}">
            <div>
              <strong>${escapeHtml(item.name)}</strong><br>
              <span class="adminMuted">${escapeHtml(item.code)}</span><br>
              <span class="adminMuted">${escapeHtml(item.id)}</span>
            </div>
          </div>
          <p class="adminMuted">反映時に、このロードイラストは抽選・表示・管理対象から外れます。閲覧済み履歴は内部的に残し、報酬紐づきは解除します。</p>
          ${renderTextareaField("loadingIllustrationDeleteReason", "削除理由（必須）", "")}
          ${renderCheckField("loadingIllustrationDeleteCreateAnnouncement", "お知らせで周知する", false)}
          <div class="adminSubCard adminFullWidthCard">
            <h3>お知らせ内容</h3>
            <p class="adminMuted">周知する場合のみ入力してください。反映時にお知らせも作成されます。</p>
            <div class="adminFormGrid">
              ${renderTextField("loadingIllustrationDeleteAnnouncementTitle", "タイトル", `${item.name}の削除について`)}
              ${renderNumberField("loadingIllustrationDeleteAnnouncementPriority", "優先度", 0, -999999, 999999)}
              <div class="adminField">
                <label for="loadingIllustrationDeleteAnnouncementCategory">種別</label>
                <select id="loadingIllustrationDeleteAnnouncementCategory" name="loadingIllustrationDeleteAnnouncementCategory">
                  ${renderAnnouncementCategoryOption("normal", "通常", "important")}
                  ${renderAnnouncementCategoryOption("maintenance", "メンテナンス", "important")}
                  ${renderAnnouncementCategoryOption("bug", "不具合", "important")}
                  ${renderAnnouncementCategoryOption("update", "アップデート", "important")}
                  ${renderAnnouncementCategoryOption("important", "重要", "important")}
                </select>
              </div>
              ${renderDateTimeField("loadingIllustrationDeleteAnnouncementStartsAt", "表示開始日時", null)}
              ${renderDateTimeField("loadingIllustrationDeleteAnnouncementEndsAt", "表示終了日時", null)}
              ${renderTextareaField("loadingIllustrationDeleteAnnouncementSummary", "概要", `${item.name}のロードイラストを削除します。`)}
              ${renderTextareaField("loadingIllustrationDeleteAnnouncementBody", "本文", `${item.name}のロードイラストを削除します。反映後、このロードイラストはロード画面や図鑑に表示されなくなります。`)}
            </div>
            <div class="adminActions">
              ${renderCheckField("loadingIllustrationDeleteAnnouncementIsActive", "公開", true)}
            </div>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn danger" ${isLoading ? "disabled" : ""}>一時保存する</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderLoadingIllustrationReplaceModal(item: LoadingIllustrationAssetItem) {
  return `
    <div class="adminModalBackdrop" data-loading-illustration-replace-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="loadingIllustrationReplaceModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="loadingIllustrationReplaceModalTitle">ロードイラスト差し替えの一時保存</h2>
            <p class="adminMuted">この時点ではまだ反映されません。反映設定タブから反映してください。</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="ロードイラスト差し替えを閉じる" data-close-loading-illustration-replace>×</button>
        </div>
        <form id="loadingIllustrationReplaceForm" class="adminForm">
          <input type="hidden" name="assetAction" value="loading_illustration_replace">
          <input type="hidden" name="illustrationId" value="${escapeAttribute(item.id)}">
          <div class="adminLoadingPreview">
            <img class="adminAssetPreview" src="${escapeAttribute(item.previewPath)}" alt="${escapeAttribute(item.name)}">
            <div>
              <strong>${escapeHtml(item.name)}</strong><br>
              <span class="adminMuted">${escapeHtml(item.code)}</span><br>
              <span class="adminMuted">${escapeHtml(item.id)}</span>
            </div>
          </div>
          <p class="adminMuted">反映時に、このロードイラストの画像だけを差し替えます。閲覧済み履歴、出現設定、報酬紐づきは維持されます。</p>
          <div class="adminField">
            <label for="loadingIllustrationReplaceFile">差し替え後のロードイラスト画像（png / jpg / jpeg / webp、5MBまで）</label>
            <input id="loadingIllustrationReplaceFile" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" required>
          </div>
          ${renderTextareaField("loadingIllustrationReplaceReason", "差し替え理由（必須）", "")}
          ${renderCheckField("loadingIllustrationReplaceCreateAnnouncement", "お知らせで周知する", false)}
          <div class="adminSubCard adminFullWidthCard">
            <h3>お知らせ内容</h3>
            <p class="adminMuted">周知する場合のみ入力してください。反映時にお知らせも作成されます。</p>
            <div class="adminFormGrid">
              ${renderTextField("loadingIllustrationReplaceAnnouncementTitle", "タイトル", `${item.name}の画像差し替えについて`)}
              ${renderNumberField("loadingIllustrationReplaceAnnouncementPriority", "優先度", 0, -999999, 999999)}
              <div class="adminField">
                <label for="loadingIllustrationReplaceAnnouncementCategory">種別</label>
                <select id="loadingIllustrationReplaceAnnouncementCategory" name="loadingIllustrationReplaceAnnouncementCategory">
                  ${renderAnnouncementCategoryOption("normal", "通常", "update")}
                  ${renderAnnouncementCategoryOption("maintenance", "メンテナンス", "update")}
                  ${renderAnnouncementCategoryOption("bug", "不具合", "update")}
                  ${renderAnnouncementCategoryOption("update", "アップデート", "update")}
                  ${renderAnnouncementCategoryOption("important", "重要", "update")}
                </select>
              </div>
              ${renderDateTimeField("loadingIllustrationReplaceAnnouncementStartsAt", "表示開始日時", null)}
              ${renderDateTimeField("loadingIllustrationReplaceAnnouncementEndsAt", "表示終了日時", null)}
              ${renderTextareaField("loadingIllustrationReplaceAnnouncementSummary", "概要", `${item.name}のロードイラスト画像を差し替えます。`)}
              ${renderTextareaField("loadingIllustrationReplaceAnnouncementBody", "本文", `${item.name}のロードイラスト画像を差し替えます。閲覧済み履歴や出現設定はそのまま維持されます。`)}
            </div>
            <div class="adminActions">
              ${renderCheckField("loadingIllustrationReplaceAnnouncementIsActive", "公開", true)}
            </div>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>一時保存する</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderLoadingIllustrationTab() {
  const visibleLoadingIllustrations = getPagedAdminItems("loadingIllustrations", assetLoadingIllustrations);
  const detailPanel = editingLoadingIllustration ? `
      <div class="adminCard adminDetailCard">
        <div class="adminCardHeader">
          <h2>ロードイラスト詳細・出現設定</h2>
          <button type="button" class="adminIconBtn" aria-label="ロードイラスト詳細を閉じる" data-close-loading-illustration-detail>×</button>
        </div>
        ${renderLoadingIllustrationForm(editingLoadingIllustration)}
      </div>` : "";

  return `
    <section class="adminGrid${editingLoadingIllustration ? "" : " is-list-only"}">
      <div class="adminCard">
        <div class="adminCardHeader">
          <h2>ロードイラスト一覧</h2>
          <span class="adminMuted">素材追加は画像素材管理から行います。</span>
        </div>
        <div class="adminTableWrap">
          <table class="adminTable">
            <thead><tr><th>プレビュー</th><th>ロードイラスト</th><th>紐づけ称号</th><th>出現設定</th><th>状態</th><th>操作</th></tr></thead>
            <tbody>${visibleLoadingIllustrations.map(renderLoadingIllustrationRow).join("") || `<tr><td colspan="6">ロードイラストがありません。</td></tr>`}</tbody>
          </table>
        </div>
        ${renderAdminPagination("loadingIllustrations", assetLoadingIllustrations.length)}
      </div>
      ${detailPanel}
    </section>
  `;
}

function renderLoadingIllustrationRow(item: LoadingIllustrationAssetItem) {
  const title = titles.find((entry) => entry.id === item.requiredTitleId);
  const modeLabel = item.appearanceMode === "manual" ? "手動" : "自動";
  return `
    <tr>
      <td><img class="adminAssetPreview" src="${escapeAttribute(item.previewPath)}" alt="${escapeAttribute(item.name)}"></td>
      <td>
        <strong>${escapeHtml(item.name)}</strong><br>
        <span class="adminMuted">${escapeHtml(item.code)}</span><br>
        <span class="adminMuted">${escapeHtml(item.id)}</span>
      </td>
      <td>
        ${title ? `<strong>${escapeHtml(title.name)}</strong><br><span class="adminMuted">${escapeHtml(title.code)}</span>` : `<span class="adminBadge">未設定</span>`}
      </td>
      <td>
        <span class="adminBadge${item.appearanceMode === "manual" ? " is-owner" : " is-on"}">${modeLabel}</span><br>
        ${item.appearanceMode === "manual" ? `<span class="adminMuted">未閲覧 ${formatRate(item.manualUnviewedRate)} / 閲覧済み ${formatRate(item.manualViewedRate)}</span>` : `<span class="adminMuted">未閲覧70% / 閲覧済み30%</span>`}
      </td>
      <td><span class="adminBadge${item.isActive ? " is-on" : ""}">${item.isActive ? "公開" : "非公開"}</span>${renderLoadingIllustrationPendingBadge(item.id)}</td>
      <td><button type="button" class="adminBtn" data-edit-loading-illustration="${escapeAttribute(item.id)}">設定</button></td>
    </tr>
  `;
}


function renderLoadingIllustrationPendingBadge(illustrationId: string) {
  if (hasPendingLoadingIllustrationDelete(illustrationId)) return `<br><span class="adminBadge is-danger">削除予定</span>`;
  if (hasPendingLoadingIllustrationReplace(illustrationId)) return `<br><span class="adminBadge is-owner">差し替え予定</span>`;
  return "";
}

function renderLoadingIllustrationForm(item: LoadingIllustrationAssetItem) {
  return `
    <form id="loadingIllustrationForm" class="adminForm">
      <input type="hidden" name="illustrationId" value="${escapeAttribute(item.id)}">
      <div class="adminLoadingPreview">
        <img class="adminLoadingPreviewImage" src="${escapeAttribute(item.previewPath)}" alt="${escapeAttribute(item.name)}">
        <div>
          <strong>${escapeHtml(item.name)}</strong><br>
          <span class="adminMuted">${escapeHtml(item.code)}</span><br>
          <span class="adminMuted">${escapeHtml(item.id)}</span>
        </div>
      </div>
      <div class="adminFormGrid">
        <div class="adminField adminFull">
          <label for="requiredTitleId">紐づける称号</label>
          <select id="requiredTitleId" name="requiredTitleId" required>
            <option value="">称号を選択</option>
            ${titles.map((title) => renderRequiredTitleOption(title, item.requiredTitleId)).join("")}
          </select>
        </div>
        <div class="adminField">
          <label for="appearanceMode">出現設定</label>
          <select id="appearanceMode" name="appearanceMode" data-appearance-mode>
            <option value="auto" ${item.appearanceMode === "auto" ? "selected" : ""}>自動</option>
            <option value="manual" ${item.appearanceMode === "manual" ? "selected" : ""}>手動</option>
          </select>
        </div>
        ${renderRateField("manualUnviewedRate", "未閲覧時出現率", item.manualUnviewedRate)}
        ${renderRateField("manualViewedRate", "閲覧済み時出現率", item.manualViewedRate)}
      </div>
      <p class="adminMuted">自動は未閲覧70% / 閲覧済み30%。手動は同じ閲覧状態内での出現率として扱い、0.0000は抽選対象外です。</p>
      <div class="adminActions">
        ${renderCheckField("isActive", "公開", item.isActive)}
      </div>
      <div class="adminActions">
        <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>保存</button>
        <button type="button" class="adminBtn" data-cancel-loading-illustration>詳細を閉じる</button>
      </div>
    </form>
  `;
}

function renderRequiredTitleOption(title: TitleMaster, selectedTitleId: string | null) {
  return `<option value="${escapeAttribute(title.id)}" ${title.id === selectedTitleId ? "selected" : ""}>${escapeHtml(title.name)} / ${escapeHtml(title.code)}</option>`;
}

function renderRateField(name: string, label: string, value: number) {
  return `
    <div class="adminField" data-rate-field>
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="number" min="0" max="100" step="0.0001" value="${formatRateValue(value)}">
    </div>
  `;
}


function renderAnnouncementTab() {
  const visibleAnnouncements = getPagedAdminItems("announcements", announcements);
  const detailPanel = editingAnnouncement ? `
      <div class="adminCard adminDetailCard">
        <div class="adminCardHeader">
          <h2>お知らせ詳細・編集</h2>
          <button type="button" class="adminIconBtn" aria-label="お知らせ詳細を閉じる" data-close-announcement-detail>×</button>
        </div>
        ${renderAnnouncementForm(editingAnnouncement)}
      </div>` : "";

  return `
    <section class="adminGrid${editingAnnouncement ? "" : " is-list-only"}">
      <div class="adminCard">
        <div class="adminCardHeader">
          <h2>お知らせ一覧</h2>
          <button type="button" class="adminBtn primary" data-open-announcement-create>お知らせ追加</button>
        </div>
        <p class="adminMuted">公開中かつ表示期間内のお知らせだけがホームに表示されます。お知らせが0件の場合、ホームには「お知らせはありません」と表示されます。</p>
        <div class="adminTableWrap">
          <table class="adminTable">
            <thead><tr><th>状態</th><th>お知らせ</th><th>種別</th><th>表示期間</th><th>優先度</th><th>操作</th></tr></thead>
            <tbody>${visibleAnnouncements.map(renderAnnouncementRow).join("") || `<tr><td colspan="6">お知らせがありません。</td></tr>`}</tbody>
          </table>
        </div>
        ${renderAdminPagination("announcements", announcements.length)}
      </div>
      ${detailPanel}
    </section>
    ${isAnnouncementCreateModalOpen ? renderAnnouncementCreateModal() : ""}
  `;
}

function renderAnnouncementRow(announcement: AnnouncementItem) {
  return `
    <tr>
      <td><span class="adminBadge${announcement.isActive ? " is-on" : ""}">${announcement.isActive ? "公開" : "非公開"}</span></td>
      <td>
        <strong>${escapeHtml(announcement.title)}</strong><br>
        <span class="adminMuted">${escapeHtml(announcement.summary || "概要なし")}</span><br>
        <span class="adminMuted">${escapeHtml(announcement.id)}</span>
      </td>
      <td><span class="adminBadge${announcement.category === "important" ? " is-owner" : ""}">${escapeHtml(announcement.categoryLabel)}</span></td>
      <td>
        <span class="adminMuted">開始：${escapeHtml(formatDateTime(announcement.startsAt))}</span><br>
        <span class="adminMuted">終了：${escapeHtml(formatDateTime(announcement.endsAt))}</span>
      </td>
      <td>${announcement.priority}</td>
      <td>
        <div class="adminActions">
          <button type="button" class="adminBtn" data-edit-announcement="${escapeAttribute(announcement.id)}">編集</button>
          <button type="button" class="adminBtn danger" data-delete-announcement="${escapeAttribute(announcement.id)}">削除</button>
        </div>
      </td>
    </tr>
  `;
}

function renderAnnouncementForm(announcement: AnnouncementItem | null) {
  return `
    <form id="announcementForm" class="adminForm">
      ${announcement ? `<input type="hidden" name="announcementId" value="${escapeAttribute(announcement.id)}">` : ""}
      <div class="adminFormGrid">
        ${renderTextField("announcementTitle", "タイトル", announcement?.title ?? "")}
        ${renderNumberField("announcementPriority", "優先度", announcement?.priority ?? 0, -999999, 999999)}
        <div class="adminField">
          <label for="announcementCategory">種別</label>
          <select id="announcementCategory" name="announcementCategory">
            ${renderAnnouncementCategoryOption("normal", "通常", announcement?.category ?? "normal")}
            ${renderAnnouncementCategoryOption("maintenance", "メンテナンス", announcement?.category ?? "normal")}
            ${renderAnnouncementCategoryOption("bug", "不具合", announcement?.category ?? "normal")}
            ${renderAnnouncementCategoryOption("update", "アップデート", announcement?.category ?? "normal")}
            ${renderAnnouncementCategoryOption("important", "重要", announcement?.category ?? "normal")}
          </select>
        </div>
        ${renderDateTimeField("announcementStartsAt", "表示開始日時", announcement?.startsAt ?? null)}
        ${renderDateTimeField("announcementEndsAt", "表示終了日時", announcement?.endsAt ?? null)}
        ${renderTextareaField("announcementSummary", "概要", announcement?.summary ?? "")}
        ${renderTextareaField("announcementBody", "本文", announcement?.body ?? "")}
      </div>
      <p class="adminMuted">本文はプレーンテキストのみです。概要が空の場合は本文の先頭から自動補完します。</p>
      <div class="adminActions">
        ${renderCheckField("announcementIsActive", "公開", announcement?.isActive ?? false)}
      </div>
      <div class="adminActions">
        <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>保存</button>
        ${announcement ? `<button type="button" class="adminBtn" data-cancel-announcement>詳細を閉じる</button>` : ""}
      </div>
    </form>
  `;
}

function renderAnnouncementCategoryOption(value: AnnouncementCategory, label: string, selected: AnnouncementCategory) {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function renderDateTimeField(name: string, label: string, value: string | null) {
  return `
    <div class="adminField">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="datetime-local" value="${escapeAttribute(toDateTimeLocalValue(value))}">
    </div>
  `;
}

function renderAnnouncementCreateModal() {
  return `
    <div class="adminModalBackdrop" data-announcement-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="announcementCreateModalTitle">
        <div class="adminCardHeader">
          <h2 id="announcementCreateModalTitle">お知らせ追加</h2>
          <button type="button" class="adminIconBtn" aria-label="お知らせ追加を閉じる" data-close-announcement-create>×</button>
        </div>
        ${renderAnnouncementForm(null)}
      </section>
    </div>
  `;
}


function renderChangeBatchTab() {
  const visibleChangeBatches = getPagedAdminItems("changeBatches", changeBatches);
  const modal = changeBatchActionTarget ? renderChangeBatchModal(changeBatchActionTarget) : "";
  return `
    <section class="adminGrid is-list-only">
      <div class="adminCard">
        <div class="adminCardHeader">
          <div>
            <h2>反映設定</h2>
            <p class="adminMuted">一時保存された変更をまとめて確認してから反映します。未反映の変更は基本1つの反映予定にまとまります。</p>
          </div>
        </div>
        <div class="adminTableWrap">
          <table class="adminTable">
            <thead><tr><th>状態</th><th>反映内容</th><th>作成者</th><th>反映/キャンセル</th><th>操作</th></tr></thead>
            <tbody>${visibleChangeBatches.map(renderChangeBatchRow).join("") || `<tr><td colspan="5">反映待ちの変更はありません。</td></tr>`}</tbody>
          </table>
        </div>
        ${renderAdminPagination("changeBatches", changeBatches.length)}
      </div>
    </section>
    ${modal}
  `;
}

function isActiveChangeBatchItem(item: ChangeBatchItem) {
  return item.status !== "cancelled";
}

function isMainChangeBatchItem(item: ChangeBatchItem) {
  return item.changeType !== "announcement_create";
}

function getChangeBatchMainItemCount(batch: ChangeBatch) {
  if (typeof batch.changeItemCount === "number") return batch.changeItemCount;
  return batch.items.filter((item) => isActiveChangeBatchItem(item) && isMainChangeBatchItem(item)).length;
}

function renderChangeBatchRow(batch: ChangeBatch) {
  return `
    <tr>
      <td><span class="adminBadge ${changeBatchStatusClass(batch.status)}">${escapeHtml(changeBatchStatusLabel(batch.status))}</span></td>
      <td>
        <strong>${escapeHtml(batch.name)}</strong><br>
        <span class="adminMuted">${escapeHtml(batch.id)}</span><br>
        <span class="adminMuted">作成：${escapeHtml(formatDateTime(batch.createdAt))} / 最終更新：${escapeHtml(formatDateTime(batch.updatedAt))} / 変更 ${getChangeBatchMainItemCount(batch)}件</span>
      </td>
      <td>${renderChangeBatchActor(batch.createdBy)}</td>
      <td>${renderChangeBatchStatusMeta(batch)}</td>
      <td>
        <div class="adminActions">
          <button type="button" class="adminBtn" data-open-change-batch-detail="${escapeAttribute(batch.id)}">詳細</button>
          ${batch.status === "draft" ? `<button type="button" class="adminBtn primary" data-open-change-batch-apply="${escapeAttribute(batch.id)}">反映設定</button><button type="button" class="adminBtn danger" data-open-change-batch-cancel="${escapeAttribute(batch.id)}">キャンセル</button>` : ""}
        </div>
      </td>
    </tr>
  `;
}

function renderChangeBatchStatusMeta(batch: ChangeBatch) {
  if (batch.status === "applied") {
    return `<span class="adminMuted">反映：${escapeHtml(formatDateTime(batch.appliedAt))}</span><br>${batch.appliedBy ? renderChangeBatchActor(batch.appliedBy) : ""}`;
  }
  if (batch.status === "cancelled") {
    return `<span class="adminMuted">キャンセル：${escapeHtml(formatDateTime(batch.cancelledAt))}</span><br>${batch.cancelledBy ? renderChangeBatchActor(batch.cancelledBy) : ""}<br><span class="adminMuted">理由：${escapeHtml(batch.cancelReason ?? "-")}</span>`;
  }
  if (batch.status === "failed") {
    return `<span class="adminMuted">失敗：${escapeHtml(batch.errorMessage ?? "-")}</span>`;
  }
  return `<span class="adminMuted">未反映</span>`;
}

function renderChangeBatchActor(actor: ChangeBatchActor) {
  return `<strong>${escapeHtml(actor.displayName || actor.id)}</strong>${actor.email ? `<br><span class="adminMuted">${escapeHtml(actor.email)}</span>` : ""}`;
}

function renderChangeBatchModal(target: { batchId: string; mode: ChangeBatchActionMode; itemId?: string }) {
  const batch = changeBatches.find((item) => item.id === target.batchId);
  if (!batch) return "";
  const title = target.mode === "apply" ? "反映設定" : target.mode === "cancel" ? "反映キャンセル" : target.mode === "itemCancel" ? "変更キャンセル" : "反映詳細";
  return `
    <div class="adminModalBackdrop" data-change-batch-modal-backdrop>
      <section class="adminModal adminWideModal" role="dialog" aria-modal="true" aria-labelledby="changeBatchModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="changeBatchModalTitle">${escapeHtml(title)}</h2>
            <p class="adminMuted">${escapeHtml(batch.name)} / ${escapeHtml(changeBatchStatusLabel(batch.status))}</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="反映設定を閉じる" data-close-change-batch-modal>×</button>
        </div>
        ${renderChangeBatchModalBody(batch, target.mode)}
      </section>
    </div>
  `;
}

function renderChangeBatchModalBody(batch: ChangeBatch, mode: ChangeBatchActionMode) {
  if (mode === "cancel") return renderChangeBatchCancelForm(batch);
  if (mode === "itemCancel" && changeBatchActionTarget?.itemId) {
    const item = batch.items.find((entry) => entry.id === changeBatchActionTarget?.itemId);
    return item ? renderChangeItemCancelForm(batch, item) : `<p class="adminError">変更が見つかりません。</p>`;
  }
  return `
    ${renderChangeBatchDetail(batch)}
    ${mode === "apply" ? renderChangeBatchApplyForm(batch) : ""}
  `;
}

function renderChangeBatchDetail(batch: ChangeBatch) {
  return `
    <div class="adminChangeDetail">
      <section class="adminSubCard">
        <h3>概要</h3>
        <dl class="adminDefinitionList">
          ${renderDefinitionItem("反映ID", batch.id)}
          ${renderDefinitionItem("状態", changeBatchStatusLabel(batch.status))}
          ${renderDefinitionItem("作成日時", formatDateTime(batch.createdAt))}
          ${renderDefinitionItem("最終更新", formatDateTime(batch.updatedAt))}
          ${renderDefinitionItem("変更件数", `${getChangeBatchMainItemCount(batch)}件`)}
          ${renderDefinitionItem("作成者", `${batch.createdBy.displayName}${batch.createdBy.email ? ` / ${batch.createdBy.email}` : ""}`)}
        </dl>
      </section>
      ${batch.items.map((item) => renderChangeBatchItemDetail(item, batch.status)).join("")}
    </div>
  `;
}

function renderChangeBatchItemDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  if (item.changeType === "icon_delete") return renderIconDeleteChangeDetail(item, batchStatus);
  if (item.changeType === "icon_replace") return renderIconReplaceChangeDetail(item, batchStatus);
  if (item.changeType === "loading_illustration_delete") return renderLoadingIllustrationDeleteChangeDetail(item, batchStatus);
  if (item.changeType === "loading_illustration_replace") return renderLoadingIllustrationReplaceChangeDetail(item, batchStatus);
  if (item.changeType === "title_create") return renderTitleCreateChangeDetail(item, batchStatus);
  if (item.changeType === "title_update") return renderTitleUpdateChangeDetail(item, batchStatus);
  if (item.changeType === "title_icon_rewards_update") return renderTitleIconRewardsChangeDetail(item, batchStatus);
  if (item.changeType === "title_delete") return renderTitleDeleteChangeDetail(item, batchStatus);
  if (item.changeType === "announcement_create") return renderAnnouncementCreateChangeDetail(item, batchStatus);
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader(changeTypeLabel(item.changeType), item, batchStatus)}
      <p class="adminMuted">対象：${escapeHtml(item.targetId)}</p>
      <p>理由：${escapeHtml(item.reason)}</p>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}

function renderIconDeleteChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const before = item.before ?? {};
  const effect = item.effect ?? {};
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("アイコン削除", item, batchStatus)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("対象アイコン", `${readUnknownString(before.icon_name)} / ${item.targetId}`)}
        ${renderDefinitionItem("削除理由", item.reason)}
        ${renderDefinitionItem("所持ユーザー", `${readUnknownNumber(effect.ownedUserCount)}人`)}
        ${renderDefinitionItem("現在設定中", `${readUnknownNumber(effect.selectedUserCount)}人`)}
        ${renderDefinitionItem("称号報酬紐づけ", `${readUnknownNumber(effect.rewardLinkCount)}件`)}
        ${renderDefinitionItem("戻し先アイコン", readUnknownString(effect.fallbackIconId))}
      </dl>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}


function renderIconReplaceChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const before = item.before ?? {};
  const after = item.after ?? {};
  const effect = item.effect ?? {};
  const beforePreviewPath = buildIconReplacementPreviewPath(item, "before")
    ?? readUnknownNullableString(before.previewPath)
    ?? readUnknownNullableString(before.image_path);
  const afterPreviewPath = buildIconReplacementPreviewPath(item, "after")
    ?? readUnknownNullableString(after.previewPath);
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("アイコン差し替え", item, batchStatus)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("対象アイコン", `${readUnknownString(before.icon_name)} / ${item.targetId}`)}
        ${renderDefinitionItem("差し替え理由", item.reason)}
        ${renderDefinitionItem("所持ユーザー", `${readUnknownNumber(effect.ownedUserCount)}人`)}
        ${renderDefinitionItem("現在設定中", `${readUnknownNumber(effect.selectedUserCount)}人`)}
        ${renderDefinitionItem("称号報酬紐づけ", `${readUnknownNumber(effect.rewardLinkCount)}件`)}
        ${renderDefinitionItem("差し替え後ファイル", `${formatBytes(readUnknownNumber(after.fileSize))} / ${readUnknownString(after.mimeType) || "-"}`)}
      </dl>
      <div class="adminCompareImages">
        <div>
          <strong>差し替え前</strong>
          ${beforePreviewPath ? `<img class="adminAssetPreview is-icon" src="${escapeAttribute(beforePreviewPath)}" alt="差し替え前">` : `<span class="adminMuted">プレビューなし</span>`}
        </div>
        <div>
          <strong>差し替え後</strong>
          ${afterPreviewPath ? `<img class="adminAssetPreview is-icon" src="${escapeAttribute(afterPreviewPath)}" alt="差し替え後">` : `<span class="adminMuted">プレビューなし</span>`}
        </div>
      </div>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}


function renderLoadingIllustrationDeleteChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const before = item.before ?? {};
  const effect = item.effect ?? {};
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("ロードイラスト削除", item, batchStatus)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("対象ロードイラスト", `${readUnknownString(before.illustration_name)} / ${item.targetId}`)}
        ${renderDefinitionItem("削除理由", item.reason)}
        ${renderDefinitionItem("閲覧済みユーザー", `${readUnknownNumber(effect.viewedUserCount)}人`)}
        ${renderDefinitionItem("報酬紐づき", `${readUnknownNumber(effect.rewardLinkCount)}件`)}
      </dl>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}

function renderLoadingIllustrationReplaceChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const before = item.before ?? {};
  const after = item.after ?? {};
  const effect = item.effect ?? {};
  const beforePreviewPath = buildLoadingIllustrationReplacementPreviewPath(item, "before")
    ?? readUnknownNullableString(before.previewPath)
    ?? readUnknownNullableString(before.image_path);
  const afterPreviewPath = buildLoadingIllustrationReplacementPreviewPath(item, "after")
    ?? readUnknownNullableString(after.previewPath);
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("ロードイラスト差し替え", item, batchStatus)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("対象ロードイラスト", `${readUnknownString(before.illustration_name)} / ${item.targetId}`)}
        ${renderDefinitionItem("差し替え理由", item.reason)}
        ${renderDefinitionItem("閲覧済みユーザー", `${readUnknownNumber(effect.viewedUserCount)}人`)}
        ${renderDefinitionItem("報酬紐づき", `${readUnknownNumber(effect.rewardLinkCount)}件`)}
        ${renderDefinitionItem("差し替え後ファイル", `${formatBytes(readUnknownNumber(after.fileSize))} / ${readUnknownString(after.mimeType) || "-"}`)}
      </dl>
      <div class="adminCompareImages">
        <div>
          <strong>差し替え前</strong>
          ${beforePreviewPath ? `<img class="adminAssetPreview" src="${escapeAttribute(beforePreviewPath)}" alt="差し替え前">` : `<span class="adminMuted">プレビューなし</span>`}
        </div>
        <div>
          <strong>差し替え後</strong>
          ${afterPreviewPath ? `<img class="adminAssetPreview" src="${escapeAttribute(afterPreviewPath)}" alt="差し替え後">` : `<span class="adminMuted">プレビューなし</span>`}
        </div>
      </div>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}

function buildIconReplacementPreviewPath(item: ChangeBatchItem, variant: "before" | "after") {
  if (!item.batchId || !item.targetId) return null;
  const params = new URLSearchParams({ replacementBatchId: item.batchId, variant });
  return `/api/admin/assets/icons/${encodeURIComponent(item.targetId)}?${params.toString()}`;
}

function buildLoadingIllustrationReplacementPreviewPath(item: ChangeBatchItem, variant: "before" | "after") {
  if (!item.batchId || !item.targetId) return null;
  const params = new URLSearchParams({ replacementBatchId: item.batchId, variant });
  return `/api/admin/assets/loading-illustrations/${encodeURIComponent(item.targetId)}?${params.toString()}`;
}



function renderTitleCreateChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const after = item.after ?? {};
  const effect = item.effect ?? {};
  const currentEffect = item.currentEffect ?? effect;
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("称号追加", item, batchStatus)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("称号名", `${readUnknownString(after.titleName)} / ${item.targetId}`)}
        ${renderDefinitionItem("称号コード", readUnknownString(after.titleCode))}
        ${renderDefinitionItem("レア度", `${readUnknownNumber(after.rarity)}`)}
        ${renderDefinitionItem("公開", readUnknownBoolean(after.isActive) ? "公開" : "非公開")}
        ${renderDefinitionItem("取得条件", readUnknownString(after.unlockConditionText))}
        ${renderDefinitionItem("達成ユーザー（追加時点）", renderChangeAchievementCount(effect))}
        ${renderDefinitionItem("達成ユーザー（現在）", renderChangeAchievementCount(currentEffect))}
        ${renderDefinitionItem("報酬アイコン", renderIdList(after.iconRewardIds))}
      </dl>
      ${renderTitleAchievementCurrentNote(effect, currentEffect)}
      ${renderTitleChangeJsonDetails(after)}
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}

function renderTitleUpdateChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const before = item.before ?? {};
  const after = item.after ?? {};
  const title = isRecord(before.title) ? before.title : {};
  const effect = item.effect ?? {};
  const currentEffect = item.currentEffect ?? effect;
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("称号編集", item, batchStatus)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("対象称号", `${readUnknownString(title.title_name)} / ${item.targetId}`)}
        ${renderDefinitionItem("変更後称号名", readUnknownString(after.titleName))}
        ${renderDefinitionItem("称号コード", readUnknownString(after.titleCode))}
        ${renderDefinitionItem("レア度", `${readUnknownNumber(after.rarity)}`)}
        ${renderDefinitionItem("公開", readUnknownBoolean(after.isActive) ? "公開" : "非公開")}
        ${renderDefinitionItem("取得条件", readUnknownString(after.unlockConditionText))}
        ${renderDefinitionItem("達成ユーザー（追加時点）", renderChangeAchievementCount(effect))}
        ${renderDefinitionItem("達成ユーザー（現在）", renderChangeAchievementCount(currentEffect))}
        ${renderDefinitionItem("報酬アイコン", renderIdList(after.iconRewardIds))}
      </dl>
      ${renderTitleAchievementCurrentNote(effect, currentEffect)}
      ${renderTitleChangeJsonDetails(after)}
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}

function renderChangeAchievementCount(effect: Record<string, unknown>) {
  const status = readUnknownString(effect.achievementCountStatus);
  if (status !== "counted") return "集計対象外";
  return `${readUnknownNumber(effect.achievedUserCount)}人`;
}

function renderTitleAchievementCurrentNote(addEffect: Record<string, unknown>, currentEffect: Record<string, unknown>) {
  const addStatus = readUnknownString(addEffect.achievementCountStatus);
  const currentStatus = readUnknownString(currentEffect.achievementCountStatus);
  if (addStatus !== "counted" || currentStatus !== "counted") {
    const note = readUnknownString(currentEffect.note) || readUnknownString(addEffect.note);
    return note ? `<p class="adminMuted">${escapeHtml(note)}</p>` : "";
  }
  const addCount = readUnknownNumber(addEffect.achievedUserCount);
  const currentCount = readUnknownNumber(currentEffect.achievedUserCount);
  const diff = currentCount - addCount;
  if (diff === 0) return `<p class="adminMuted">現在の達成ユーザー数は詳細表示時点で再集計しています。</p>`;
  return `<p class="adminMuted">現在の達成ユーザー数は詳細表示時点で再集計しています。追加時点から${diff > 0 ? "+" : ""}${diff}人です。</p>`;
}

function renderTitleChangeJsonDetails(after: Record<string, unknown>) {
  return `
    <details class="adminJsonDetails">
      <summary>生成JSON</summary>
      <div class="adminJsonPreviewGrid">
        <div><span>condition_type</span><pre>${escapeHtml(readUnknownString(after.conditionType))}</pre></div>
        <div><span>condition_params_json</span><pre>${escapeHtml(readUnknownString(after.conditionParamsJson))}</pre></div>
        <div><span>condition_builder_json</span><pre>${escapeHtml(readUnknownString(after.conditionBuilderJson))}</pre></div>
      </div>
    </details>
  `;
}

function renderTitleDeleteChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const before = item.before ?? {};
  const effect = item.effect ?? {};
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("称号削除", item, batchStatus)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("対象称号", `${readUnknownString(before.title_name)} / ${item.targetId}`)}
        ${renderDefinitionItem("削除理由", item.reason)}
        ${renderDefinitionItem("所持ユーザー", `${readUnknownNumber(effect.ownedUserCount)}人`)}
        ${renderDefinitionItem("現在設定中", `${readUnknownNumber(effect.selectedUserCount)}人`)}
        ${renderDefinitionItem("称号報酬紐づけ", `${readUnknownNumber(effect.rewardLinkCount)}件`)}
        ${renderDefinitionItem("戻し先称号", readUnknownString(effect.fallbackTitleId))}
      </dl>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}

function renderTitleIconRewardsChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const before = item.before ?? {};
  const after = item.after ?? {};
  const effect = item.effect ?? {};
  const title = isRecord(before.title) ? before.title : {};
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("称号アイコン報酬変更", item, batchStatus)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("対象称号", `${readUnknownString(title.title_name)} / ${item.targetId}`)}
        ${renderDefinitionItem("変更理由", item.reason)}
        ${renderDefinitionItem("変更前", renderIconRewardSummary(before.iconRewards))}
        ${renderDefinitionItem("変更後", renderIconRewardSummary(after.iconRewards))}
        ${renderDefinitionItem("追加", renderIdList(effect.addedIconIds))}
        ${renderDefinitionItem("解除", renderIdList(effect.removedIconIds))}
        ${renderDefinitionItem("称号所持ユーザー", `${readUnknownNumber(effect.titleHolderCount)}人`)}
        ${renderDefinitionItem("反映時付与見込み", `${readUnknownNumber(effect.retroactiveGrantCount)}件`)}
      </dl>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}

function renderAnnouncementCreateChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const after = item.after ?? {};
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("お知らせ作成", item, batchStatus, false)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("タイトル", readUnknownString(after.title))}
        ${renderDefinitionItem("種別", announcementCategoryLabel(readUnknownString(after.category)))}
        ${renderDefinitionItem("公開", readUnknownBoolean(after.isActive) ? "公開" : "非公開")}
        ${renderDefinitionItem("表示開始", formatDateTime(readUnknownNullableString(after.startsAt)))}
        ${renderDefinitionItem("表示終了", formatDateTime(readUnknownNullableString(after.endsAt)))}
        ${renderDefinitionItem("概要", readUnknownString(after.summary))}
        ${renderDefinitionItem("本文", readUnknownString(after.body))}
      </dl>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}


function renderChangeItemHeader(title: string, item: ChangeBatchItem, batchStatus: ChangeBatchStatus, canCancel = true) {
  const statusBadge = item.status === "cancelled" ? `<span class="adminBadge is-danger">個別キャンセル済み</span>` : `<span class="adminBadge is-info">有効</span>`;
  const cancelButton = canCancel && batchStatus === "draft" && item.status === "draft" && isMainChangeBatchItem(item)
    ? `<button type="button" class="adminBtn danger" data-open-change-item-cancel="${escapeAttribute(item.id)}">この変更をキャンセル</button>`
    : "";
  return `
    <div class="adminCardHeader adminSubCardHeader">
      <div>
        <h3>${escapeHtml(title)}</h3>
        ${statusBadge}
      </div>
      <div class="adminActions">${cancelButton}</div>
    </div>
  `;
}

function renderChangeItemCancelMeta(item: ChangeBatchItem) {
  if (item.status !== "cancelled") return "";
  const cancelledBy = item.cancelledBy ? `${item.cancelledBy.displayName}${item.cancelledBy.email ? ` / ${item.cancelledBy.email}` : ""}` : "-";
  return `
    <div class="adminNotice is-warning">
      <strong>個別キャンセル済み</strong><br>
      <span>キャンセル日時：${escapeHtml(formatDateTime(item.cancelledAt))}</span><br>
      <span>キャンセル者：${escapeHtml(cancelledBy)}</span><br>
      <span>理由：${escapeHtml(item.cancelReason ?? "-")}</span>
    </div>
  `;
}

function renderChangeItemCancelForm(batch: ChangeBatch, item: ChangeBatchItem) {
  if (batch.status !== "draft" || item.status !== "draft" || !isMainChangeBatchItem(item)) {
    return `<p class="adminError">この変更はキャンセルできる状態ではありません。</p>`;
  }
  return `
    <form id="changeItemCancelForm" class="adminForm">
      <input type="hidden" name="batchId" value="${escapeAttribute(batch.id)}">
      <input type="hidden" name="itemId" value="${escapeAttribute(item.id)}">
      <section class="adminSubCard">
        <h3>キャンセル対象</h3>
        <p><strong>${escapeHtml(changeTypeLabel(item.changeType))}</strong></p>
        <p class="adminMuted">対象：${escapeHtml(item.targetId)}</p>
        <p class="adminMuted">元の理由：${escapeHtml(item.reason)}</p>
      </section>
      <p class="adminMuted">この変更だけを個別キャンセルします。付随するお知らせ作成がある場合は一緒にキャンセルされます。</p>
      ${renderTextareaField("changeItemCancelReason", "個別キャンセル理由", "")}
      <div class="adminActions">
        <button type="submit" class="adminBtn danger" ${isLoading ? "disabled" : ""}>この変更をキャンセルする</button>
      </div>
    </form>
  `;
}

function renderChangeBatchApplyForm(batch: ChangeBatch) {
  return `
    <form id="changeBatchApplyForm" class="adminForm adminChangeConfirmForm">
      <input type="hidden" name="batchId" value="${escapeAttribute(batch.id)}">
      <p class="adminMuted">すべて確認すると、この反映予定に含まれる変更をまとめて反映できます。Phase15Fでは日時予約は行わず、この場で反映します。</p>
      ${renderCheckField("confirmChangeTargets", "変更内容を確認しました", false)}
      ${renderCheckField("confirmUserEffects", "ユーザー影響を確認しました", false)}
      ${renderCheckField("confirmIrreversible", "反映後はゲーム内表示へ影響することを確認しました", false)}
      <div class="adminActions">
        <button type="submit" class="adminBtn primary" data-apply-change-batch-submit disabled ${isLoading ? "disabled" : ""}>反映する</button>
      </div>
    </form>
  `;
}

function renderChangeBatchCancelForm(batch: ChangeBatch) {
  return `
    <form id="changeBatchCancelForm" class="adminForm">
      <input type="hidden" name="batchId" value="${escapeAttribute(batch.id)}">
      <p class="adminMuted">キャンセルすると、この反映予定に含まれる変更はすべてキャンセルされ、履歴として残ります。個別キャンセルは詳細内の各変更から実行できます。</p>
      ${renderTextareaField("changeBatchCancelReason", "キャンセル理由", "")}
      <div class="adminActions">
        <button type="submit" class="adminBtn danger" ${isLoading ? "disabled" : ""}>キャンセルする</button>
      </div>
    </form>
  `;
}

function renderPlayerUserTab() {
  if (selectedPlayerUserDetail) return renderPlayerUserDetailPage(selectedPlayerUserDetail);

  return `
    <section class="adminGrid is-list-only">
      <div class="adminCard">
        <div class="adminCardHeader">
          <div>
            <h2>ユーザー管理</h2>
            <p class="adminMuted">100GAME⁺にアカウント登録しているユーザーの一覧です。管理者管理とは別管理です。</p>
          </div>
        </div>
        <form class="adminSearchForm" id="playerUserSearchForm">
          <div class="adminSearchField">
            <label for="playerUserSearch">検索</label>
            <input id="playerUserSearch" name="playerUserSearch" type="search" value="${escapeAttribute(playerUserSearchInput)}" placeholder="メール / 表示名 / user_id">
          </div>
          <div class="adminActions adminSearchActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>検索</button>
            <button type="button" class="adminBtn" data-clear-player-user-search ${playerUserQuery ? "" : "disabled"}>クリア</button>
          </div>
        </form>
        <div class="adminListMeta">
          <span>全 ${playerUserPagination.total} 件</span>
          <span>${playerUserPagination.page} / ${playerUserPagination.totalPages} ページ</span>
          ${playerUserQuery ? `<span>検索条件: ${escapeHtml(playerUserQuery)}</span>` : ""}
        </div>
        <div class="adminTableWrap">
          <table class="adminTable adminUserTable">
            <thead>
              <tr>
                <th>ユーザー</th>
                <th>状態</th>
                <th>認証</th>
                <th>role</th>
                <th>所持</th>
                <th>戦績</th>
                <th>登録/ログイン</th>
                <th class="adminActionColumn">操作</th>
              </tr>
            </thead>
            <tbody>${playerUsers.map(renderPlayerUserRow).join("") || `<tr><td colspan="8">ユーザーがありません。</td></tr>`}</tbody>
          </table>
        </div>
        <div class="adminPagination">
          <button type="button" class="adminBtn" data-player-users-page="previous" ${playerUserPagination.hasPrevious ? "" : "disabled"}>前へ</button>
          <span class="adminMuted">${playerUserPagination.page} / ${playerUserPagination.totalPages}</span>
          <button type="button" class="adminBtn" data-player-users-page="next" ${playerUserPagination.hasNext ? "" : "disabled"}>次へ</button>
        </div>
      </div>
    </section>
  `;
}

function renderPlayerUserRow(user: PlayerUser) {
  return `
    <tr>
      <td>
        <strong>${escapeHtml(user.displayName || "未設定")}</strong><br>
        <span class="adminMuted">${escapeHtml(user.email)}</span><br>
        <span class="adminMuted">${escapeHtml(user.userId)}</span>
      </td>
      <td><span class="adminBadge${user.status === "active" ? " is-on" : ""}">${escapeHtml(user.status)}</span></td>
      <td><span class="adminBadge${user.emailVerified ? " is-on" : ""}">${user.emailVerified ? "認証済" : "未認証"}</span></td>
      <td><span class="adminBadge">${escapeHtml(user.roleLabel)}</span></td>
      <td>
        <span class="adminMuted">称号: ${user.titleCount}</span><br>
        <span class="adminMuted">アイコン: ${user.iconCount}</span>
      </td>
      <td>
        <span class="adminMuted">試合: ${user.stats.matchCount}</span><br>
        <span class="adminMuted">勝利: ${user.stats.winCount} / 敗北: ${user.stats.loseCount}</span><br>
        <span class="adminMuted">勝率: ${user.stats.winRate.toFixed(1)}%</span>
      </td>
      <td>
        <span class="adminMuted">登録: ${escapeHtml(formatDateTime(user.createdAt))}</span><br>
        <span class="adminMuted">最終: ${escapeHtml(formatDateTime(user.lastLoginAt))}</span>
      </td>
      <td class="adminActionCell"><button type="button" class="adminBtn" data-open-player-user-detail="${escapeAttribute(user.userId)}" ${isLoading ? "disabled" : ""}>詳細</button></td>
    </tr>
  `;
}

function renderPlayerUserDetailPage(detail: PlayerUserDetail) {
  return `
    <section class="adminGrid is-list-only">
      <div class="adminCard adminPlayerDetailCard">
        <div class="adminCardHeader">
          <div>
            <button type="button" class="adminBackBtn" data-back-player-users>←</button>
            <h2>ユーザー詳細</h2>
            <p class="adminMuted">${escapeHtml(detail.user.displayName || "未設定")} / ${escapeHtml(detail.user.email)}</p>
          </div>
          <button type="button" class="adminBtn" data-open-player-user-history>直近の試合履歴</button>
        </div>
        <div class="adminPlayerDetailGrid">
          ${renderPlayerUserBasicDetail(detail)}
          ${renderPlayerUserAccountStatus(detail)}
          ${renderPlayerUserCurrentDetail(detail)}
          ${renderPlayerUserCollectionSummary(detail)}
          ${renderPlayerUserStatsSummary(detail)}
        </div>
        ${renderPlayerUserTitles(detail)}
        ${renderPlayerUserIcons(detail)}
      </div>
    </section>
    ${isPlayerUserHistoryModalOpen ? renderPlayerUserHistoryModal(detail) : ""}
    ${playerUserStatusAction ? renderPlayerUserStatusModal(detail, playerUserStatusAction) : ""}
  `;
}

function renderPlayerUserBasicDetail(detail: PlayerUserDetail) {
  return `
    <section class="adminSubCard">
      <h3>基本情報</h3>
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("ユーザーID", detail.user.userId)}
        ${renderDefinitionItem("表示名", detail.user.displayName || "未設定")}
        ${renderDefinitionItem("メール", detail.user.email)}
        ${renderDefinitionItem("status", detail.user.status)}
        ${renderDefinitionItem("role", detail.user.roleLabel)}
        ${renderDefinitionItem("メール認証", detail.user.emailVerified ? "認証済" : "未認証")}
        ${renderDefinitionItem("認証日時", formatDateTime(detail.user.emailVerifiedAt))}
        ${renderDefinitionItem("登録日時", formatDateTime(detail.user.createdAt))}
        ${renderDefinitionItem("最終ログイン", formatDateTime(detail.user.lastLoginAt))}
        ${renderDefinitionItem("ユーザー更新日時", formatDateTime(detail.user.updatedAt))}
      </dl>
    </section>
  `;
}

function renderPlayerUserAccountStatus(detail: PlayerUserDetail) {
  const action = detail.user.status === "active" ? "suspend" : detail.user.status === "suspended" ? "unsuspend" : null;
  return `
    <section class="adminSubCard">
      <h3>アカウント状態</h3>
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("現在の状態", detail.user.status)}
        ${renderDefinitionItem("有効セッション", `${detail.collectionSummary.activeSessionCount}`)}
      </dl>
      <p class="adminMuted">停止すると対象ユーザーはログインできなくなり、既存セッションも失効します。</p>
      <div class="adminActions">
        ${action ? `<button type="button" class="adminBtn${action === "suspend" ? " danger" : " primary"}" data-open-player-user-status-action="${action}">${action === "suspend" ? "停止する" : "停止解除"}</button>` : `<button type="button" class="adminBtn" disabled>操作対象外</button>`}
      </div>
      <div class="adminStatusLogPreview">
        <strong>状態操作履歴</strong>
        ${renderPlayerUserStatusLogs(detail)}
      </div>
    </section>
  `;
}

function renderPlayerUserStatusLogs(detail: PlayerUserDetail) {
  const logs = detail.statusLogs.slice(0, 5);
  if (logs.length === 0) return `<p class="adminMuted">停止/解除履歴はありません。</p>`;
  return logs.map((log) => `
    <div class="adminStatusLogItem">
      <p>${escapeHtml(formatStatusActionLabel(log.actionType))}：${escapeHtml(formatDateTime(log.createdAt))}</p>
      <p class="adminMuted">実行者：${escapeHtml(formatStatusLogAdmin(log))}</p>
      <p class="adminMuted">理由：${escapeHtml(log.reason)}</p>
    </div>
  `).join("");
}

function renderPlayerUserCurrentDetail(detail: PlayerUserDetail) {
  return `
    <section class="adminSubCard">
      <h3>現在の設定</h3>
      <div class="adminCurrentSettingList">
        <div>
          <span class="adminMuted">現在設定中の称号</span><br>
          ${detail.current.title ? `<strong>${escapeHtml(detail.current.title.name)}</strong><br><span class="adminMuted">★${detail.current.title.rarity} / ${escapeHtml(detail.current.title.id)}</span>` : `<span class="adminMuted">未設定</span>`}
        </div>
        <div class="adminCurrentIconRow">
          ${detail.current.icon?.imagePath ? `<img class="adminOwnedIconImage" src="${escapeAttribute(detail.current.icon.imagePath)}" alt="${escapeAttribute(detail.current.icon.name)}">` : `<div class="adminIconPlaceholder">未設定</div>`}
          <div>
            <span class="adminMuted">現在設定中のアイコン</span><br>
            ${detail.current.icon ? `<strong>${escapeHtml(detail.current.icon.name)}</strong><br><span class="adminMuted">★${detail.current.icon.rarity} / ${escapeHtml(detail.current.icon.id)}</span>` : `<span class="adminMuted">未設定</span>`}
          </div>
        </div>
        <div>
          <span class="adminMuted">設定更新日時</span><br>
          <strong>${escapeHtml(formatDateTime(detail.user.settingsUpdatedAt))}</strong>
        </div>
      </div>
    </section>
  `;
}

function renderPlayerUserCollectionSummary(detail: PlayerUserDetail) {
  return `
    <section class="adminSubCard">
      <h3>コレクション概要</h3>
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("所持称号", `${detail.collectionSummary.titleCount}`)}
        ${renderDefinitionItem("所持アイコン", `${detail.collectionSummary.iconCount}`)}
        ${renderDefinitionItem("ロードイラスト所持", `${detail.collectionSummary.illustrationCount}`)}
        ${renderDefinitionItem("ロードイラスト閲覧済み", `${detail.collectionSummary.viewedIllustrationCount}`)}
        ${renderDefinitionItem("未読通知", `${detail.collectionSummary.unreadNotificationCount}`)}
        ${renderDefinitionItem("有効ログインセッション", `${detail.collectionSummary.activeSessionCount}`)}
      </dl>
    </section>
  `;
}

function renderPlayerUserStatsSummary(detail: PlayerUserDetail) {
  return `
    <section class="adminSubCard">
      <h3>戦績サマリー</h3>
      <div class="adminStatsGrid">
        ${renderStatsBox("総合", detail.stats.total)}
        ${renderStatsBox("ソロ", detail.stats.solo)}
        ${renderStatsBox("マルチ", detail.stats.multi)}
      </div>
      <dl class="adminDefinitionList adminStreakList">
        ${renderDefinitionItem("現在連勝", `${detail.stats.currentWinStreak}`)}
        ${renderDefinitionItem("最大連勝", `${detail.stats.maxWinStreak}`)}
        ${renderDefinitionItem("現在連敗", `${detail.stats.currentLoseStreak}`)}
        ${renderDefinitionItem("最大連敗", `${detail.stats.maxLoseStreak}`)}
      </dl>
    </section>
  `;
}

function renderStatsBox(label: string, stats: PlayerStatsSummary) {
  return `
    <div class="adminStatsBox">
      <strong>${escapeHtml(label)}</strong><br>
      <span class="adminMuted">試合: ${stats.matchCount}</span><br>
      <span class="adminMuted">勝利: ${stats.winCount} / 敗北: ${stats.loseCount}</span><br>
      <span class="adminMuted">勝率: ${stats.winRate.toFixed(1)}%</span>
    </div>
  `;
}

function renderPlayerUserTitles(detail: PlayerUserDetail) {
  return `
    <section class="adminSubCard adminFullWidthCard">
      <h3>所持称号一覧</h3>
      <div class="adminTableWrap">
        <table class="adminTable">
          <thead><tr><th>称号</th><th>レアリティ</th><th>取得日時</th></tr></thead>
          <tbody>${detail.titles.map(renderPlayerUserTitleRow).join("") || `<tr><td colspan="3">所持称号がありません。</td></tr>`}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderPlayerUserTitleRow(title: PlayerUserDetail["titles"][number]) {
  return `
    <tr>
      <td><strong>${escapeHtml(title.name)}</strong><br><span class="adminMuted">${escapeHtml(title.description)}</span><br><span class="adminMuted">${escapeHtml(title.id)}</span></td>
      <td><span class="adminBadge">★${title.rarity}</span></td>
      <td><span class="adminMuted">${escapeHtml(formatDateTime(title.acquiredAt))}</span></td>
    </tr>
  `;
}

function renderPlayerUserIcons(detail: PlayerUserDetail) {
  return `
    <section class="adminSubCard adminFullWidthCard">
      <h3>所持アイコン一覧</h3>
      <div class="adminTableWrap">
        <table class="adminTable">
          <thead><tr><th>画像</th><th>アイコン</th><th>レアリティ</th><th>取得日時</th></tr></thead>
          <tbody>${detail.icons.map(renderPlayerUserIconRow).join("") || `<tr><td colspan="4">所持アイコンがありません。</td></tr>`}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderPlayerUserIconRow(icon: PlayerUserDetail["icons"][number]) {
  return `
    <tr>
      <td><img class="adminOwnedIconImage" src="${escapeAttribute(icon.imagePath)}" alt="${escapeAttribute(icon.name)}"></td>
      <td><strong>${escapeHtml(icon.name)}</strong><br><span class="adminMuted">${escapeHtml(icon.description)}</span><br><span class="adminMuted">${escapeHtml(icon.id)}</span></td>
      <td><span class="adminBadge">★${icon.rarity}</span></td>
      <td><span class="adminMuted">${escapeHtml(formatDateTime(icon.acquiredAt))}</span></td>
    </tr>
  `;
}

function renderPlayerUserHistoryModal(detail: PlayerUserDetail) {
  return `
    <div class="adminModalBackdrop" data-player-user-history-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="playerUserHistoryModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="playerUserHistoryModalTitle">直近の試合履歴</h2>
            <p class="adminMuted">${escapeHtml(detail.user.displayName || "未設定")} / 最大10件</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="直近の試合履歴を閉じる" data-close-player-user-history>×</button>
        </div>
        <div class="adminTableWrap">
          <table class="adminTable">
            <thead><tr><th>日時</th><th>モード</th><th>難易度</th><th>タイプ</th><th>勝敗</th></tr></thead>
            <tbody>${detail.matchHistory.map(renderPlayerUserHistoryRow).join("") || `<tr><td colspan="5">試合履歴がありません。</td></tr>`}</tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderPlayerUserStatusModal(detail: PlayerUserDetail, action: PlayerUserStatusAction) {
  const isSuspend = action === "suspend";
  return `
    <div class="adminModalBackdrop" data-player-user-status-modal-backdrop>
      <section class="adminModal adminSmallModal" role="dialog" aria-modal="true" aria-labelledby="playerUserStatusModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="playerUserStatusModalTitle">${isSuspend ? "ユーザー停止" : "停止解除"}</h2>
            <p class="adminMuted">${escapeHtml(detail.user.displayName || "未設定")} / ${escapeHtml(detail.user.email)}</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="状態変更を閉じる" data-close-player-user-status-modal>×</button>
        </div>
        <p class="adminMuted">だれが、なぜ、いつ実行したかを残すため、理由は必須です。</p>
        ${isSuspend ? `<p class="adminMessage is-error">停止すると対象ユーザーの既存セッションも失効します。</p>` : ""}
        <form id="playerUserStatusForm" class="adminForm">
          <input type="hidden" name="playerUserStatusAction" value="${action}">
          <div class="adminField adminFull">
            <label for="playerUserStatusReason">理由</label>
            <textarea id="playerUserStatusReason" name="playerUserStatusReason" maxlength="500" required></textarea>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn${isSuspend ? " danger" : " primary"}" ${isLoading ? "disabled" : ""}>${isSuspend ? "停止する" : "停止解除する"}</button>
            <button type="button" class="adminBtn" data-close-player-user-status-modal>キャンセル</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderPlayerUserHistoryRow(match: PlayerUserDetail["matchHistory"][number]) {
  return `
    <tr>
      <td><span class="adminMuted">${escapeHtml(formatDateTime(match.endedAt))}</span></td>
      <td>${escapeHtml(formatMatchMode(match.mode))}</td>
      <td>${escapeHtml(match.difficulty)}</td>
      <td>${escapeHtml(match.gameType)}</td>
      <td><span class="adminBadge${match.result === "win" ? " is-on" : ""}">${escapeHtml(formatMatchResult(match.result))}</span></td>
    </tr>
  `;
}

function formatStatusActionLabel(action: PlayerUserStatusAction) {
  return action === "suspend" ? "停止" : "停止解除";
}

function formatStatusLogAdmin(log: PlayerUserDetail["statusLogs"][number]) {
  const displayName = log.admin.displayName.trim();
  const email = log.admin.email.trim();
  if (displayName && email) return `${displayName} / ${email}`;
  if (displayName) return displayName;
  if (email) return email;
  return log.admin.id;
}

function renderDefinitionItem(label: string, value: string) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function renderUserTab() {
  const canManageAdmins = currentUser?.role === "owner";
  const visibleUsers = getPagedAdminItems("users", users);
  return `
    <section class="adminGrid is-list-only">
      <div class="adminCard">
        <div class="adminCardHeader">
          <div>
            <h2>管理者管理</h2>
            <p class="adminMuted">管理画面にログインできる管理者の一覧です。管理者名・権限・状態・パスワードを管理します。</p>
          </div>
          ${canManageAdmins ? `<button type="button" class="adminBtn primary" data-open-admin-create>管理者追加</button>` : ""}
        </div>
        <div class="adminTableWrap">
          <table class="adminTable adminManagerTable">
            <thead><tr><th>管理者</th><th>状態</th><th>権限</th><th>初期PW</th><th>最終ログイン</th><th class="adminActionColumn">操作</th></tr></thead>
            <tbody>${visibleUsers.map(renderUserRow).join("") || `<tr><td colspan="6">管理者がありません。</td></tr>`}</tbody>
          </table>
        </div>
        ${renderAdminPagination("users", users.length)}
      </div>
    </section>
    ${isAdminCreateModalOpen ? renderAdminCreateModal() : ""}
    ${renderAdminNameModal()}
    ${renderAdminRoleModal()}
    ${renderAdminPasswordModal()}
  `;
}

function renderUserRow(user: AdminUser) {
  const isSelf = Boolean(user.isSelf || currentUser?.userId === user.userId);
  const isOwner = user.role === "owner";
  const currentIsOwner = currentUser?.role === "owner";
  const canEditName = currentIsOwner || isSelf;
  const canChangePassword = currentIsOwner || isSelf;
  const canManageRow = Boolean(currentIsOwner && !isSelf);
  const nextStatus = user.status === "active" ? "disabled" : "active";
  const nextStatusLabel = user.status === "active" ? "無効化" : "有効化";
  const actionButtons = [
    canEditName ? `<button type="button" class="adminBtn" data-edit-admin-name="${escapeAttribute(user.userId)}">名前変更</button>` : "",
    canChangePassword ? `<button type="button" class="adminBtn" data-change-admin-password="${escapeAttribute(user.userId)}">パスワード変更</button>` : "",
    canManageRow ? `<button type="button" class="adminBtn" data-edit-admin-role="${escapeAttribute(user.userId)}">権限変更</button>` : "",
    canManageRow ? `<button type="button" class="adminBtn${user.status === "active" ? " danger" : ""}" data-toggle-admin-status="${escapeAttribute(user.userId)}" data-next-admin-status="${nextStatus}">${nextStatusLabel}</button>` : "",
    canManageRow ? `<button type="button" class="adminBtn danger" data-delete-admin="${escapeAttribute(user.userId)}">削除</button>` : "",
  ].filter(Boolean);
  const displayName = getAdminDisplayName(user);
  return `
    <tr>
      <td>
        <strong>${escapeHtml(displayName || user.email)}</strong>${isSelf ? ` <span class="adminBadge">自分</span>` : ""}
        ${displayName ? `<br><span class="adminMuted">${escapeHtml(user.email)}</span>` : ""}
      </td>
      <td><span class="adminBadge${user.status === "active" ? " is-on" : ""}">${user.status === "active" ? "active" : "disabled"}</span></td>
      <td><span class="adminBadge${isOwner ? " is-owner" : " is-on"}">${escapeHtml(user.roleLabel)}</span></td>
      <td><span class="adminBadge${user.mustChangePassword ? "" : " is-on"}">${user.mustChangePassword ? "未変更" : "変更済"}</span></td>
      <td><span class="adminMuted">${escapeHtml(formatDateTime(user.lastLoginAt))}</span></td>
      <td class="adminActionCell">
        ${actionButtons.length > 0 ? `<div class="adminActionStack">${actionButtons.join("")}</div>` : `<span class="adminActionPlaceholder" aria-hidden="true"></span>`}
      </td>
    </tr>
  `;
}

function renderAdminCreateModal() {
  return `
    <div class="adminModalBackdrop" data-admin-create-modal-backdrop>
      <section class="adminModal adminSmallModal" role="dialog" aria-modal="true" aria-labelledby="adminCreateModalTitle">
        <div class="adminCardHeader">
          <h2 id="adminCreateModalTitle">管理者追加</h2>
          <button type="button" class="adminIconBtn" aria-label="管理者追加を閉じる" data-close-admin-create-modal>×</button>
        </div>
        <p class="adminMuted">初期パスワードはメールアドレスと同じ値になります。</p>
        <form id="adminCreateForm" class="adminForm">
          ${renderTextField("adminCreateDisplayName", "管理者名", "")}
          ${renderTextField("adminCreateEmail", "メールアドレス", "")}
          <div class="adminField">
            <label for="adminCreateRole">権限</label>
            <select id="adminCreateRole" name="adminCreateRole">
              <option value="admin">管理者</option>
              <option value="owner">管理責任者</option>
            </select>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>追加する</button>
            <button type="button" class="adminBtn" data-close-admin-create-modal>キャンセル</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderAdminNameModal() {
  if (!adminNameTargetAdminId) return "";
  const target = users.find((user) => user.userId === adminNameTargetAdminId);
  if (!target) return "";
  return `
    <div class="adminModalBackdrop" data-admin-name-modal-backdrop>
      <section class="adminModal adminSmallModal" role="dialog" aria-modal="true" aria-labelledby="adminNameModalTitle">
        <div class="adminCardHeader">
          <h2 id="adminNameModalTitle">管理者名変更</h2>
          <button type="button" class="adminIconBtn" aria-label="管理者名変更を閉じる" data-close-admin-name-modal>×</button>
        </div>
        <p class="adminMuted">対象：${renderAdminIdentity(target)}</p>
        <form id="adminNameForm" class="adminForm">
          <input type="hidden" name="adminId" value="${escapeAttribute(target.userId)}">
          ${renderTextField("adminDisplayName", "管理者名", target.displayName || "")}
          <div class="adminActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>変更する</button>
            <button type="button" class="adminBtn" data-close-admin-name-modal>キャンセル</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderAdminRoleModal() {
  if (!adminRoleTargetAdminId) return "";
  const target = users.find((user) => user.userId === adminRoleTargetAdminId);
  if (!target) return "";
  return `
    <div class="adminModalBackdrop" data-admin-role-modal-backdrop>
      <section class="adminModal adminSmallModal" role="dialog" aria-modal="true" aria-labelledby="adminRoleModalTitle">
        <div class="adminCardHeader">
          <h2 id="adminRoleModalTitle">権限変更</h2>
          <button type="button" class="adminIconBtn" aria-label="権限変更を閉じる" data-close-admin-role-modal>×</button>
        </div>
        <p class="adminMuted">対象：${renderAdminIdentity(target)}</p>
        <form id="adminRoleForm" class="adminForm">
          <input type="hidden" name="adminId" value="${escapeAttribute(target.userId)}">
          <div class="adminField">
            <label for="adminRole">権限</label>
            <select id="adminRole" name="adminRole">
              <option value="admin" ${target.role === "admin" ? "selected" : ""}>管理者</option>
              <option value="owner" ${target.role === "owner" ? "selected" : ""}>管理責任者</option>
            </select>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>変更する</button>
            <button type="button" class="adminBtn" data-close-admin-role-modal>キャンセル</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderAdminPasswordModal() {
  if (!passwordTargetAdminId) return "";
  const target = users.find((user) => user.userId === passwordTargetAdminId);
  if (!target) return "";
  const isSelf = Boolean(target.isSelf || currentUser?.userId === target.userId);
  return `
    <div class="adminModalBackdrop" data-admin-password-modal-backdrop>
      <section class="adminModal adminPasswordModal" role="dialog" aria-modal="true" aria-labelledby="adminPasswordModalTitle">
        <div class="adminCardHeader">
          <h2 id="adminPasswordModalTitle">パスワード変更</h2>
          <button type="button" class="adminIconBtn" aria-label="パスワード変更を閉じる" data-close-admin-password-modal>×</button>
        </div>
        <p class="adminMuted">対象：${renderAdminIdentity(target)}</p>
        <p class="adminMuted">新しいパスワードは英字・数字・記号を含む7文字以上です。</p>
        <form id="adminPasswordForm" class="adminForm">
          <input type="hidden" name="targetAdminId" value="${escapeAttribute(target.userId)}">
          ${isSelf ? `
          <div class="adminField">
            <label for="currentPassword">現在のパスワード</label>
            <input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password">
          </div>` : ""}
          <div class="adminField">
            <label for="newPassword">新しいパスワード</label>
            <input id="newPassword" name="newPassword" type="password" autocomplete="new-password">
          </div>
          <div class="adminField">
            <label for="confirmPassword">新しいパスワード確認</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password">
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>変更する</button>
            <button type="button" class="adminBtn" data-close-admin-password-modal>キャンセル</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderTextField(name: string, label: string, value: string) {
  return `
    <div class="adminField">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="text" value="${escapeAttribute(value)}">
    </div>
  `;
}

function renderNumberField(name: string, label: string, value: number, min: number, max: number) {
  return `
    <div class="adminField">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="number" min="${min}" max="${max}" value="${value}">
    </div>
  `;
}

function renderTextareaField(name: string, label: string, value: string) {
  return `
    <div class="adminField adminFull">
      <label for="${name}">${label}</label>
      <textarea id="${name}" name="${name}">${escapeHtml(value)}</textarea>
    </div>
  `;
}

function renderCheckField(name: string, label: string, checked: boolean) {
  return `
    <div class="adminCheck">
      <input id="${name}" name="${name}" type="checkbox" ${checked ? "checked" : ""}>
      <label for="${name}">${label}</label>
    </div>
  `;
}

function renderTitleIconRewardField(title: TitleMaster | null) {
  const selectedIds = title?.iconRewardIds ?? [];
  const pendingBatch = title ? findPendingTitleIconRewardsBatch(title.id) : null;
  if (pendingBatch) {
    return `
      <div class="adminRewardBox adminFull">
        <div>
          <span class="adminBadge is-owner">状態：変更あり</span>
        </div>
        <p class="adminMuted">この称号には未反映のアイコン報酬変更があります。具体的な変更内容は「反映設定」タブの詳細で確認してください。</p>
        <p class="adminMuted">アイコン報酬を変更するには、先に反映設定タブで反映またはキャンセルしてください。</p>
        ${selectedIds.map((iconId) => `<input type="hidden" name="iconRewardIds" value="${escapeAttribute(iconId)}">`).join("")}
      </div>
    `;
  }
  return `
    <div class="adminRewardBox adminFull">
      <div class="adminCheck">
        <input id="enableIconRewards" name="enableIconRewards" type="checkbox" data-enable-icon-rewards ${selectedIds.length > 0 ? "checked" : ""}>
        <label for="enableIconRewards">アイコンも開放する</label>
      </div>
      <div class="adminRewardBody${selectedIds.length > 0 ? "" : " is-disabled"}" data-icon-reward-body>
        <div class="adminRewardPicker">
          <select data-icon-reward-select aria-label="紐づけるアイコンを選択">
            <option value="">アイコンを選択</option>
            ${icons.filter((icon) => !hasPendingIconDelete(icon.id)).map((icon) => renderIconRewardOption(icon, selectedIds)).join("")}
          </select>
          <button type="button" class="adminBtn" data-add-icon-reward ${selectedIds.length >= 3 ? "disabled" : ""}>紐づけるアイコンを追加</button>
        </div>
        <p class="adminMuted">1称号につき最大3つまで。同じアイコンは重複して紐づけできません。</p>
        <ol class="adminRewardList" data-icon-reward-list>
          ${selectedIds.map(renderTitleIconRewardItem).join("")}
        </ol>
      </div>
    </div>
    ${renderTextareaField("titleIconRewardChangeReason", "アイコン報酬変更理由（報酬を変更する場合は必須）", "")}
  `;
}



function getDefaultTitleId() {
  const initialTitles = titles.filter((title) => title.isInitial);
  const candidates = initialTitles.length > 0 ? initialTitles : titles;
  const sorted = [...candidates].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.id.localeCompare(right.id);
  });
  return sorted[0]?.id ?? "";
}

function hasPendingTitleDelete(titleId: string) {
  return changeBatches.some((batch) => {
    if (batch.status !== "draft" && batch.status !== "scheduled") return false;
    return batch.items.some((item) => isActiveChangeBatchItem(item) && item.changeType === "title_delete" && item.targetType === "title" && item.targetId === titleId);
  });
}

function findPendingTitleIconRewardsBatch(titleId: string) {
  return changeBatches.find((batch) => {
    if (batch.status !== "draft" && batch.status !== "scheduled") return false;
    return batch.items.some((item) => isActiveChangeBatchItem(item) && item.changeType === "title_icon_rewards_update" && item.targetType === "title" && item.targetId === titleId);
  }) ?? null;
}

function hasPendingIconDelete(iconId: string) {
  return changeBatches.some((batch) => {
    if (batch.status !== "draft" && batch.status !== "scheduled") return false;
    return batch.items.some((item) => isActiveChangeBatchItem(item) && item.changeType === "icon_delete" && item.targetType === "icon" && item.targetId === iconId);
  });
}

function hasPendingIconReplace(iconId: string) {
  return changeBatches.some((batch) => {
    if (batch.status !== "draft" && batch.status !== "scheduled") return false;
    return batch.items.some((item) => isActiveChangeBatchItem(item) && item.changeType === "icon_replace" && item.targetType === "icon" && item.targetId === iconId);
  });
}


function hasPendingLoadingIllustrationDelete(illustrationId: string) {
  return changeBatches.some((batch) => {
    if (batch.status !== "draft" && batch.status !== "scheduled") return false;
    return batch.items.some((item) => isActiveChangeBatchItem(item) && item.changeType === "loading_illustration_delete" && item.targetType === "loading_illustration" && item.targetId === illustrationId);
  });
}

function hasPendingLoadingIllustrationReplace(illustrationId: string) {
  return changeBatches.some((batch) => {
    if (batch.status !== "draft" && batch.status !== "scheduled") return false;
    return batch.items.some((item) => isActiveChangeBatchItem(item) && item.changeType === "loading_illustration_replace" && item.targetType === "loading_illustration" && item.targetId === illustrationId);
  });
}

function renderIconRewardOption(icon: IconMaster, selectedIds: string[]) {
  const label = `${icon.name} / ${icon.code}${hasPendingIconReplace(icon.id) ? "（差し替え予定）" : ""}`;
  return `<option value="${escapeAttribute(icon.id)}" ${selectedIds.includes(icon.id) ? "disabled" : ""}>${escapeHtml(label)}</option>`;
}

function renderTitleIconRewardItem(iconId: string) {
  const icon = icons.find((item) => item.id === iconId);
  const label = icon ? `${icon.name} / ${icon.code}` : iconId;
  return `
    <li class="adminRewardItem" data-icon-reward-item="${escapeAttribute(iconId)}">
      <input type="hidden" name="iconRewardIds" value="${escapeAttribute(iconId)}">
      <span>${escapeHtml(label)}</span>
      <button type="button" class="adminBtn" data-remove-icon-reward="${escapeAttribute(iconId)}">削除</button>
    </li>
  `;
}

function bindCommonEvents() {
  app.querySelector<HTMLButtonElement>("[data-admin-logout]")?.addEventListener("click", () => {
    void logoutAdmin();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      if (tab === "titles" || tab === "icons" || tab === "assets" || tab === "loadingIllustrations" || tab === "announcements" || tab === "changeBatches" || tab === "playerUsers" || tab === "users") {
        const nextTab = tab;
        if (nextTab !== activeTab) resetAdminListPageForTab(nextTab);
        activeTab = nextTab;
        editingTitle = null;
        editingIcon = null;
        editingLoadingIllustration = null;
        editingAnnouncement = null;
        isTitleCreateModalOpen = false;
        titleWizardState = null;
        isIconCreateModalOpen = false;
        isAnnouncementCreateModalOpen = false;
        passwordTargetAdminId = null;
        selectedPlayerUserDetail = null;
        isPlayerUserHistoryModalOpen = false;
        playerUserStatusAction = null;
        messageText = "";
        errorText = "";
        if (nextTab === "playerUsers") {
          playerUserPagination = { ...playerUserPagination, page: 1, pageSize: ADMIN_LIST_PAGE_SIZE };
          void refreshPlayerUsers();
          return;
        }
        render();
      }
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-admin-page-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.adminPageKey as AdminListPageKey | undefined;
      const direction = button.dataset.adminPageDirection;
      if (!key) return;
      const currentPage = adminListPages[key] ?? 1;
      adminListPages[key] = direction === "previous" ? currentPage - 1 : currentPage + 1;
      render();
    });
  });
}

function bindTitleEvents() {
  app.querySelector<HTMLButtonElement>("[data-open-title-create]")?.addEventListener("click", () => {
    editingTitle = null;
    titleWizardState = createTitleWizardState(null);
    isTitleCreateModalOpen = true;
    messageText = "";
    errorText = "";
    render();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-edit-title]").forEach((button) => {
    button.addEventListener("click", () => {
      editingTitle = titles.find((title) => title.id === button.dataset.editTitle) ?? null;
      if (!editingTitle) return;
      titleWizardState = createTitleWizardState(editingTitle);
      isTitleCreateModalOpen = true;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-close-title-wizard]").forEach((button) => {
    button.addEventListener("click", requestCloseTitleWizard);
  });

  if (titleWizardState?.step === "graph") bindTitleGraphEvents();
  if (titleWizardState?.step === "basic") bindTitleBasicEvents();
  if (titleWizardState?.editingConditionNodeId) bindTitleConditionEditorEvents();
  bindTitleWizardConfirmEvents();
  bindTitleDeleteEvents();
}

function requestCloseTitleWizard() {
  if (!titleWizardState) return;
  if (!titleWizardState.dirty) {
    closeTitleWizard();
    return;
  }
  titleWizardState.discardConfirmOpen = true;
  render();
}

function closeTitleWizard() {
  titleWizardState = null;
  editingTitle = null;
  isTitleCreateModalOpen = false;
  titleSaveConfirmState = null;
  removeTitleSaveConfirmModal();
  render();
}

function markTitleWizardDirty() {
  if (titleWizardState) titleWizardState.dirty = true;
}

function bindTitleGraphEvents() {
  if (!titleWizardState) return;

  app.querySelector<HTMLButtonElement>("[data-add-title-condition]")?.addEventListener("click", () => {
    if (!titleWizardState) return;
    const count = titleWizardState.graph.nodes.filter((node) => node.type === "condition").length;
    if (count >= TITLE_CONDITION_GRAPH_MAX_CONDITIONS) return;
    titleWizardState.editingConditionNodeId = "new";
    titleWizardState.selectedNodeId = null;
    titleWizardState.selectedEdgeId = null;
    render();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-add-title-operator]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!titleWizardState) return;
      const operator = button.dataset.addTitleOperator;
      if (operator !== "and" && operator !== "or") return;
      const operatorCount = titleWizardState.graph.nodes.filter((node) => node.type === "operator").length;
      if (operatorCount >= TITLE_CONDITION_GRAPH_MAX_OPERATORS) return;
      const nodeId = nextTitleGraphNodeId(titleWizardState.graph, "operator");
      const node: TitleConditionGraphNode = {
        id: nodeId,
        type: "operator",
        operator,
        x: 520 + Math.min(operatorCount, 2) * 190,
        y: 90 + operatorCount * 120,
      };
      titleWizardState.graph = { ...titleWizardState.graph, nodes: [...titleWizardState.graph.nodes, node] };
      titleWizardState.selectedNodeId = nodeId;
      titleWizardState.graphErrors = [];
      titleWizardState.graphErrorNodeIds = [];
      markTitleWizardDirty();
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-toggle-title-graph-json]")?.addEventListener("click", () => {
    if (!titleWizardState) return;
    if (titleWizardState.graphMode === "visual") {
      const built = buildConditionTreeFromGraph(titleWizardState.graph);
      if (!built.ok) {
        const validation = validateTitleConditionGraph(titleWizardState.graph);
        titleWizardState.graphErrors = validation.errors;
        titleWizardState.graphErrorNodeIds = validation.errorNodeIds;
        render();
        return;
      }
      titleWizardState.graphJsonText = JSON.stringify(built.tree, null, 2);
      titleWizardState.graphMode = "json";
      titleWizardState.graphErrors = [];
      titleWizardState.graphErrorNodeIds = [];
      render();
      return;
    }
    applyTitleGraphJsonToVisual();
  });

  app.querySelector<HTMLTextAreaElement>("[data-title-graph-json-input]")?.addEventListener("input", (event) => {
    if (!titleWizardState || !(event.currentTarget instanceof HTMLTextAreaElement)) return;
    titleWizardState.graphJsonText = event.currentTarget.value;
    markTitleWizardDirty();
  });

  app.querySelector<HTMLButtonElement>("[data-auto-layout-title-graph]")?.addEventListener("click", () => {
    if (!titleWizardState) return;
    titleWizardState.graph = autoLayoutTitleConditionGraph(titleWizardState.graph);
    titleWizardState.selectedNodeId = null;
    titleWizardState.selectedEdgeId = null;
    markTitleWizardDirty();
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-reset-title-graph]")?.addEventListener("click", () => {
    if (!titleWizardState) return;
    titleWizardState.graph = resetTitleConditionGraphPositions(titleWizardState.graph);
    titleWizardState.selectedNodeId = null;
    titleWizardState.selectedEdgeId = null;
    markTitleWizardDirty();
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-title-graph-next]")?.addEventListener("click", () => {
    if (!titleWizardState) return;
    if (titleWizardState.graphMode === "json" && !applyTitleGraphJsonToVisual(false)) return;
    const validation = validateTitleConditionGraph(titleWizardState.graph);
    titleWizardState.graphErrors = validation.errors;
    titleWizardState.graphErrorNodeIds = validation.errorNodeIds;
    if (!validation.ok) {
      render();
      return;
    }
    const expression = buildTitleConditionExpression(titleWizardState.graph);
    if (!titleWizardState.basic.unlockConditionTextEdited) titleWizardState.basic.unlockConditionText = expression;
    titleWizardState.basic.isInitial = titleWizardState.graph.nodes.some((node) => node.type === "condition" && node.conditionType === "initial_grant");
    titleWizardState.step = "basic";
    titleWizardState.selectedNodeId = null;
    titleWizardState.selectedEdgeId = null;
    render();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-title-graph-select-node]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!titleWizardState) return;
      const nodeId = button.dataset.titleGraphSelectNode ?? null;
      titleWizardState.selectedNodeId = titleWizardState.selectedNodeId === nodeId ? null : nodeId;
      titleWizardState.selectedEdgeId = null;
      render();
    });
  });

  app.querySelectorAll<SVGPathElement>("[data-title-graph-edge]").forEach((path) => {
    path.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!titleWizardState) return;
      titleWizardState.selectedEdgeId = path.dataset.titleGraphEdge ?? null;
      titleWizardState.selectedNodeId = null;
      render();
    });
  });

  app.querySelector<HTMLElement>("[data-title-graph-canvas]")?.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("[data-title-graph-node], [data-title-graph-edge]")) return;
    if (!titleWizardState) return;
    titleWizardState.selectedNodeId = null;
    titleWizardState.selectedEdgeId = null;
    render();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-edit-title-condition-node]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!titleWizardState) return;
      titleWizardState.editingConditionNodeId = button.dataset.editTitleConditionNode ?? null;
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-change-title-operator]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!titleWizardState) return;
      const nodeId = button.dataset.changeTitleOperator;
      titleWizardState.graph = {
        ...titleWizardState.graph,
        nodes: titleWizardState.graph.nodes.map((node) => node.id === nodeId && node.type === "operator"
          ? { ...node, operator: node.operator === "and" ? "or" : "and" }
          : node),
      };
      markTitleWizardDirty();
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-delete-title-graph-node]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!titleWizardState) return;
      const id = button.dataset.deleteTitleGraphNode;
      if (!id) return;
      titleWizardState.deleteTarget = { kind: "node", id };
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-disconnect-title-graph-edge]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!titleWizardState) return;
      const id = button.dataset.disconnectTitleGraphEdge;
      if (!id) return;
      disconnectTitleGraphEdge(id);
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-disconnect-all-title-graph-node]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!titleWizardState) return;
      const id = button.dataset.disconnectAllTitleGraphNode;
      if (!id) return;
      titleWizardState.deleteTarget = { kind: "all_edges", id };
      render();
    });
  });

  if (titleWizardState.selectedEdgeId) {
    const edgeId = titleWizardState.selectedEdgeId;
    const canvas = app.querySelector<HTMLElement>("[data-title-graph-canvas]");
    canvas?.insertAdjacentHTML("beforeend", `<button type="button" class="adminBtn danger adminTitleGraphEdgeAction" data-disconnect-selected-title-edge>接続を解除</button>`);
    app.querySelector<HTMLButtonElement>("[data-disconnect-selected-title-edge]")?.addEventListener("click", () => disconnectTitleGraphEdge(edgeId));
  }

  bindTitleGraphMoveEvents();
  bindTitleGraphConnectEvents();
}

function applyTitleGraphJsonToVisual(shouldRender = true) {
  if (!titleWizardState) return false;
  const textarea = app.querySelector<HTMLTextAreaElement>("[data-title-graph-json-input]");
  const text = textarea?.value ?? titleWizardState.graphJsonText;
  titleWizardState.graphJsonText = text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    titleWizardState.graphErrors = ["JSON構文を確認してください。"];
    if (shouldRender) render();
    return false;
  }
  const tree = normalizeConditionTree(parsed);
  if (!tree) {
    titleWizardState.graphErrors = ["condition_type と condition_params_json を含むJSONを入力してください。"];
    if (shouldRender) render();
    return false;
  }
  const treeError = validateTitleConditionTreeForGraph(tree);
  if (treeError) {
    titleWizardState.graphErrors = [treeError];
    if (shouldRender) render();
    return false;
  }
  const graph = createGraphFromConditionTree(tree, (conditionType, params) => summarizeTitleCondition(conditionType, params, { version: 1, mode: "raw_json" }));
  if (!graph) {
    titleWizardState.graphErrors = ["JSONを相関図へ変換できません。条件数・AND／OR数・ネスト・条件形式を確認してください。"];
    if (shouldRender) render();
    return false;
  }
  titleWizardState.graph = graph;
  titleWizardState.graphMode = "visual";
  titleWizardState.graphErrors = [];
  titleWizardState.graphErrorNodeIds = [];
  titleWizardState.selectedNodeId = null;
  titleWizardState.selectedEdgeId = null;
  markTitleWizardDirty();
  if (shouldRender) render();
  return true;
}

function validateTitleConditionTreeForGraph(tree: TitleConditionTree, depth = 0): string {
  if (!isAllowedTitleConditionType(tree.condition_type)) return "未対応の condition_type は保存できません。";
  const validation = validateConditionParamsForAdmin(tree.condition_type, tree.condition_params_json);
  if (!validation.ok) return validation.message;
  if (tree.condition_type !== "all_conditions" && tree.condition_type !== "any_condition") return "";
  if (depth >= 4) return "AND／ORのネストは最大4階層です。";
  const rawConditions = tree.condition_params_json.conditions;
  if (!Array.isArray(rawConditions) || rawConditions.length < 2) return "複合条件には2件以上のconditionsが必要です。";
  for (const raw of rawConditions) {
    const child = normalizeConditionTree(raw);
    if (!child) return "複合条件の形式を確認してください。";
    const error = validateTitleConditionTreeForGraph(child, depth + 1);
    if (error) return error;
  }
  return "";
}

function bindTitleGraphMoveEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-title-graph-move]").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      if (!titleWizardState) return;
      event.preventDefault();
      event.stopPropagation();
      const nodeId = handle.dataset.titleGraphMove;
      const node = titleWizardState.graph.nodes.find((item) => item.id === nodeId);
      const element = nodeId ? app.querySelector<HTMLElement>(`[data-title-graph-node="${cssEscape(nodeId)}"]`) : null;
      const canvas = app.querySelector<HTMLElement>("[data-title-graph-canvas]");
      if (!node || !element || !canvas) return;
      const startPointerX = event.clientX;
      const startPointerY = event.clientY;
      const startX = node.x;
      const startY = node.y;
      const width = node.type === "condition" ? TITLE_CONDITION_GRAPH_CONDITION_WIDTH : TITLE_CONDITION_GRAPH_OPERATOR_WIDTH;
      const height = node.type === "condition" ? TITLE_CONDITION_GRAPH_CONDITION_HEIGHT : TITLE_CONDITION_GRAPH_OPERATOR_HEIGHT;
      let nextX = startX;
      let nextY = startY;

      const move = (pointerEvent: PointerEvent) => {
        nextX = Math.max(0, Math.min(TITLE_CONDITION_GRAPH_CANVAS_WIDTH - width, startX + pointerEvent.clientX - startPointerX));
        nextY = Math.max(0, Math.min(TITLE_CONDITION_GRAPH_CANVAS_HEIGHT - height, startY + pointerEvent.clientY - startPointerY));
        element.style.left = `${nextX}px`;
        element.style.top = `${nextY}px`;
      };
      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        if (!titleWizardState) return;
        titleWizardState.graph = {
          ...titleWizardState.graph,
          nodes: titleWizardState.graph.nodes.map((item) => item.id === nodeId ? { ...item, x: Math.round(nextX), y: Math.round(nextY) } : item),
        };
        markTitleWizardDirty();
        render();
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up, { once: true });
    });
  });
}

function bindTitleGraphConnectEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-title-graph-connect]").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      if (!titleWizardState) return;
      event.preventDefault();
      event.stopPropagation();
      const sourceId = handle.dataset.titleGraphConnect;
      const source = titleWizardState.graph.nodes.find((node) => node.id === sourceId);
      const canvas = app.querySelector<HTMLElement>("[data-title-graph-canvas]");
      const preview = app.querySelector<SVGPathElement>("[data-title-graph-preview-edge]");
      if (!sourceId || !source || !canvas || !preview) return;
      if (titleWizardState.graph.edges.some((edge) => edge.source === sourceId)) {
        titleWizardState.graphErrors = ["このブロックはすでに接続されています。先に現在の接続を解除してください。"];
        render();
        return;
      }
      const canvasRect = canvas.getBoundingClientRect();
      const startX = source.x + (source.type === "condition" ? TITLE_CONDITION_GRAPH_CONDITION_WIDTH : TITLE_CONDITION_GRAPH_OPERATOR_WIDTH);
      const startY = source.y + (source.type === "condition" ? TITLE_CONDITION_GRAPH_CONDITION_HEIGHT / 2 : TITLE_CONDITION_GRAPH_OPERATOR_HEIGHT / 2);
      preview.removeAttribute("hidden");

      const move = (pointerEvent: PointerEvent) => {
        const endX = pointerEvent.clientX - canvasRect.left + canvas.scrollLeft;
        const endY = pointerEvent.clientY - canvasRect.top + canvas.scrollTop;
        const controlOffset = Math.max(54, Math.abs(endX - startX) * 0.45);
        preview.setAttribute("d", `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`);
        app.querySelectorAll<HTMLElement>("[data-title-graph-target-node]").forEach((element) => element.classList.remove("is-connect-target"));
        const hovered = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)?.closest<HTMLElement>("[data-title-graph-target-node]");
        const targetNode = hovered ? titleWizardState?.graph.nodes.find((node) => node.id === hovered.dataset.titleGraphTargetNode) : null;
        if (targetNode?.type === "operator" && targetNode.id !== sourceId) hovered?.classList.add("is-connect-target");
      };
      const up = (pointerEvent: PointerEvent) => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        app.querySelectorAll<HTMLElement>("[data-title-graph-target-node]").forEach((element) => element.classList.remove("is-connect-target"));
        const hovered = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)?.closest<HTMLElement>("[data-title-graph-target-node]");
        const targetId = hovered?.dataset.titleGraphTargetNode;
        connectTitleGraphNodes(sourceId, targetId ?? "");
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up, { once: true });
    });
  });
}

function connectTitleGraphNodes(sourceId: string, targetId: string) {
  if (!titleWizardState) return;
  const source = titleWizardState.graph.nodes.find((node) => node.id === sourceId);
  const target = titleWizardState.graph.nodes.find((node) => node.id === targetId);
  if (!targetId) {
    render();
    return;
  }
  if (!source || !target || target.type !== "operator") {
    titleWizardState.graphErrors = ["接続先にはAND／ORブロックを指定してください。"];
    render();
    return;
  }
  if (sourceId === targetId) {
    titleWizardState.graphErrors = ["同じブロック自身へは接続できません。"];
    render();
    return;
  }
  if (titleWizardState.graph.edges.some((edge) => edge.source === sourceId)) {
    titleWizardState.graphErrors = ["このブロックはすでに別のAND／ORブロックへ接続されています。先に現在の接続を解除してください。"];
    render();
    return;
  }
  if (titleWizardState.graph.edges.some((edge) => edge.source === sourceId && edge.target === targetId)) {
    titleWizardState.graphErrors = ["同じブロック間は重複して接続できません。"];
    render();
    return;
  }
  if (wouldCreateTitleGraphCycle(titleWizardState.graph, sourceId, targetId)) {
    titleWizardState.graphErrors = ["循環する接続は作成できません。"];
    render();
    return;
  }
  const edge: TitleConditionGraphEdge = { id: nextTitleGraphEdgeId(titleWizardState.graph), source: sourceId, target: targetId };
  titleWizardState.graph = { ...titleWizardState.graph, edges: [...titleWizardState.graph.edges, edge] };
  titleWizardState.graphErrors = [];
  titleWizardState.graphErrorNodeIds = [];
  titleWizardState.selectedNodeId = null;
  titleWizardState.selectedEdgeId = null;
  markTitleWizardDirty();
  render();
}

function wouldCreateTitleGraphCycle(graph: TitleConditionGraph, sourceId: string, targetId: string) {
  const outgoing = new Map<string, string[]>();
  for (const edge of graph.edges) outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
  const stack = [targetId];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    if (current === sourceId) return true;
    visited.add(current);
    for (const next of outgoing.get(current) ?? []) stack.push(next);
  }
  return false;
}

function disconnectTitleGraphEdge(edgeId: string) {
  if (!titleWizardState) return;
  titleWizardState.graph = { ...titleWizardState.graph, edges: titleWizardState.graph.edges.filter((edge) => edge.id !== edgeId) };
  titleWizardState.selectedEdgeId = null;
  titleWizardState.selectedNodeId = null;
  titleWizardState.graphErrors = [];
  titleWizardState.graphErrorNodeIds = [];
  markTitleWizardDirty();
  render();
}

function bindTitleConditionEditorEvents() {
  const form = app.querySelector<HTMLFormElement>("#titleConditionEditorForm");
  if (!form || !titleWizardState) return;
  bindTitleConditionBuilderEvents(form);
  app.querySelectorAll<HTMLButtonElement>("[data-close-title-condition-editor]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!titleWizardState) return;
      titleWizardState.editingConditionNodeId = null;
      render();
    });
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveTitleConditionNode(form);
  });
}

function saveTitleConditionNode(form: HTMLFormElement) {
  if (!titleWizardState?.editingConditionNodeId) return;
  const error = validateTitleConditionForm(form);
  if (error) {
    titleWizardState.graphErrors = [error];
    render();
    return;
  }
  const conditionType = getFormControlValue(form, "conditionType");
  const conditionParams = parseJson<Record<string, unknown>>(getFormControlValue(form, "conditionParamsJson")) ?? {};
  const conditionBuilder = parseJson<Record<string, unknown>>(getFormControlValue(form, "conditionBuilderJson")) ?? { version: 1, mode: "raw_json" };
  const editingId = titleWizardState.editingConditionNodeId;
  const current = editingId === "new" ? null : titleWizardState.graph.nodes.find((node): node is TitleConditionGraphConditionNode => node.id === editingId && node.type === "condition") ?? null;
  const builderMode = typeof conditionBuilder.mode === "string" ? conditionBuilder.mode : "";
  const isBuilderGeneratedCompound = isCompoundConditionType(conditionType) && builderMode === "builder";
  if (isCompoundConditionType(conditionType) && !isBuilderGeneratedCompound && !current?.legacyCompound) {
    titleWizardState.graphErrors = ["複合条件は相関図のAND／ORブロックで作成してください。JSON入力から条件ブロック内へall_conditions／any_conditionを追加することはできません。"];
    render();
    return;
  }
  const otherConditions = titleWizardState.graph.nodes.filter((node): node is TitleConditionGraphConditionNode => node.type === "condition" && node.id !== current?.id);
  if (conditionType === "initial_grant" && (otherConditions.length > 0 || titleWizardState.graph.nodes.some((node) => node.type === "operator"))) {
    titleWizardState.graphErrors = ["初期所持称号には複数条件を設定できません。"];
    render();
    return;
  }
  if (conditionType !== "initial_grant" && otherConditions.some((node) => node.conditionType === "initial_grant")) {
    titleWizardState.graphErrors = ["初期所持称号には別の条件を追加できません。"];
    render();
    return;
  }
  const summary = summarizeTitleCondition(conditionType, conditionParams, conditionBuilder);
  if (current) {
    titleWizardState.graph = {
      ...titleWizardState.graph,
      nodes: titleWizardState.graph.nodes.map((node) => node.id === current.id
        ? { ...current, conditionType, conditionParams, conditionBuilder, summary, legacyCompound: current.legacyCompound && isCompoundConditionType(conditionType) }
        : node),
    };
  } else {
    const count = titleWizardState.graph.nodes.filter((node) => node.type === "condition").length;
    if (count >= TITLE_CONDITION_GRAPH_MAX_CONDITIONS) return;
    const id = nextTitleGraphNodeId(titleWizardState.graph, "condition");
    const node: TitleConditionGraphConditionNode = {
      id,
      type: "condition",
      x: 70,
      y: 70 + count * 132,
      conditionType,
      conditionParams,
      conditionBuilder,
      summary,
    };
    titleWizardState.graph = { ...titleWizardState.graph, nodes: [...titleWizardState.graph.nodes, node] };
  }
  titleWizardState.editingConditionNodeId = null;
  titleWizardState.graphErrors = [];
  titleWizardState.graphErrorNodeIds = [];
  markTitleWizardDirty();
  render();
}

function bindTitleBasicEvents() {
  const form = app.querySelector<HTMLFormElement>("#titleBasicForm");
  if (!form || !titleWizardState) return;
  bindTitleIconRewardEvents();
  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select").forEach((element) => {
    const markDirty = () => markTitleWizardDirty();
    element.addEventListener("input", markDirty);
    element.addEventListener("change", markDirty);
  });
  form.querySelectorAll<HTMLButtonElement>("[data-add-icon-reward], [data-remove-icon-reward]").forEach((button) => {
    button.addEventListener("click", () => markTitleWizardDirty());
  });

  app.querySelector<HTMLButtonElement>("[data-title-basic-back]")?.addEventListener("click", () => {
    if (!titleWizardState) return;
    captureTitleBasicDraft(form);
    titleWizardState.step = "graph";
    render();
  });

  form.querySelector<HTMLTextAreaElement>("[data-title-unlock-condition-text]")?.addEventListener("input", (event) => {
    if (!titleWizardState || !(event.currentTarget instanceof HTMLTextAreaElement)) return;
    titleWizardState.basic.unlockConditionText = event.currentTarget.value;
    titleWizardState.basic.unlockConditionTextEdited = true;
    markTitleWizardDirty();
  });

  app.querySelector<HTMLButtonElement>("[data-regenerate-title-condition-text]")?.addEventListener("click", () => {
    if (!titleWizardState) return;
    if (titleWizardState.basic.unlockConditionText && !window.confirm("現在の取得条件テキストを条件式から生成した文言で上書きしますか？")) return;
    const expression = buildTitleConditionExpression(titleWizardState.graph);
    titleWizardState.basic.unlockConditionText = expression;
    titleWizardState.basic.unlockConditionTextEdited = false;
    markTitleWizardDirty();
    render();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    captureTitleBasicDraft(form);
    void previewTitleWizard();
  });
}

function captureTitleBasicDraft(form: HTMLFormElement) {
  if (!titleWizardState) return;
  const data = new FormData(form);
  const pendingRewardChange = Boolean(editingTitle && findPendingTitleIconRewardsBatch(editingTitle.id));
  const iconRewardIds = pendingRewardChange
    ? [...titleWizardState.basic.iconRewardIds]
    : data.has("enableIconRewards")
      ? data.getAll("iconRewardIds").map((value) => typeof value === "string" ? value.trim() : "").filter(Boolean).slice(0, 3)
      : [];
  titleWizardState.basic = {
    ...titleWizardState.basic,
    titleCode: readFormString(data, "titleCode"),
    titleName: readFormString(data, "titleName"),
    description: readFormString(data, "description"),
    unlockConditionText: readFormString(data, "unlockConditionText"),
    rarity: readFormNumber(data, "rarity", 1),
    sortOrder: readFormNumber(data, "sortOrder", 0),
    isInitial: titleWizardState.graph.nodes.some((node) => node.type === "condition" && node.conditionType === "initial_grant"),
    isActive: data.has("isActive"),
    iconRewardIds,
    titleIconRewardChangeReason: readFormString(data, "titleIconRewardChangeReason"),
  };
  markTitleWizardDirty();
}

async function previewTitleWizard() {
  if (!titleWizardState) return;
  const built = buildConditionTreeFromGraph(titleWizardState.graph);
  if (!built.ok) {
    titleWizardState.step = "graph";
    titleWizardState.graphErrors = built.errors;
    render();
    return;
  }
  const basic = titleWizardState.basic;
  if (!basic.titleCode.trim()) return setTitleWizardBasicError("称号コードを入力してください。");
  if (!basic.titleName.trim()) return setTitleWizardBasicError("称号名を入力してください。");
  if (!basic.description.trim()) return setTitleWizardBasicError("説明を入力してください。");
  if (!basic.unlockConditionText.trim()) return setTitleWizardBasicError("取得条件テキストを入力してください。");
  if (basic.rarity < 1 || basic.rarity > 5) return setTitleWizardBasicError("レア度は1〜5で入力してください。");

  const payload: SavePayload = {
    titleId: basic.titleId || null,
    titleCode: basic.titleCode,
    titleName: basic.titleName,
    description: basic.description,
    unlockConditionText: basic.unlockConditionText,
    rarity: basic.rarity,
    conditionType: built.tree.condition_type,
    conditionParamsJson: JSON.stringify(built.tree.condition_params_json),
    conditionBuilderJson: serializeTitleConditionGraph(titleWizardState.graph),
    isInitial: basic.isInitial,
    isActive: basic.isActive,
    sortOrder: basic.sortOrder,
    iconRewardIds: basic.iconRewardIds,
    titleIconRewardChangeReason: basic.titleIconRewardChangeReason,
  };
  isLoading = true;
  messageText = "";
  errorText = "";
  const result = await fetchAdminJson("/api/admin/title-preview", { method: "POST", body: JSON.stringify(payload) });
  isLoading = false;
  if (!result.ok || !result.effect) {
    render();
    return;
  }
  titleSaveConfirmState = {
    isEdit: Boolean(basic.titleId),
    payload,
    effect: result.effect,
    conditionExpression: buildTitleConditionExpression(titleWizardState.graph),
  };
  showTitleSaveConfirmModal(titleSaveConfirmState);
}

function setTitleWizardBasicError(message: string) {
  errorText = message;
  render();
}

function bindTitleWizardConfirmEvents() {
  if (!titleWizardState) return;
  app.querySelector<HTMLButtonElement>("[data-cancel-title-graph-delete]")?.addEventListener("click", () => {
    if (!titleWizardState) return;
    titleWizardState.deleteTarget = null;
    render();
  });
  app.querySelector<HTMLButtonElement>("[data-confirm-title-graph-delete]")?.addEventListener("click", () => {
    if (!titleWizardState?.deleteTarget) return;
    const target = titleWizardState.deleteTarget;
    if (target.kind === "node") {
      titleWizardState.graph = {
        ...titleWizardState.graph,
        nodes: titleWizardState.graph.nodes.filter((node) => node.id !== target.id),
        edges: titleWizardState.graph.edges.filter((edge) => edge.source !== target.id && edge.target !== target.id),
      };
    } else if (target.kind === "all_edges") {
      titleWizardState.graph = {
        ...titleWizardState.graph,
        edges: titleWizardState.graph.edges.filter((edge) => edge.source !== target.id && edge.target !== target.id),
      };
    } else {
      titleWizardState.graph = { ...titleWizardState.graph, edges: titleWizardState.graph.edges.filter((edge) => edge.id !== target.id) };
    }
    titleWizardState.deleteTarget = null;
    titleWizardState.selectedNodeId = null;
    titleWizardState.selectedEdgeId = null;
    markTitleWizardDirty();
    render();
  });
  app.querySelector<HTMLButtonElement>("[data-cancel-title-wizard-discard]")?.addEventListener("click", () => {
    if (!titleWizardState) return;
    titleWizardState.discardConfirmOpen = false;
    render();
  });
  app.querySelector<HTMLButtonElement>("[data-confirm-title-wizard-discard]")?.addEventListener("click", closeTitleWizard);
}

function cssEscape(value: string) {
  return value.replace(/(["\\])/g, "\\$1");
}


function bindTitleConditionBuilderEvents(form: HTMLFormElement | null) {
  if (!form) return;

  form.querySelectorAll<HTMLSelectElement | HTMLInputElement>("#titleConditionTemplate, #titleConditionPlayStyle, #titleConditionGameMode, #titleConditionDifficulty, #titleConditionGameType, #titleConditionCardPlayGroup, #titleConditionCardPlaySource, #titleConditionCardPlayActor, #titleConditionOperator, #titleConditionValue, #titleConditionAssetType, #titleConditionIllustrationTargetId, #titleConditionIconTargetId, #titleConditionNgName, #titleConditionLoseCertainRole, #titleConditionLoseCertainAction, #titleConditionExperienceDetail, #titleConditionExperienceUnit, #titleConditionExperienceActor, #titleConditionJokerEventDetail, #titleConditionJokerEventUnit, #titleConditionJokerEventActor, #titleConditionMatchCountCompareActor, #titleConditionMatchCountCompareLeftMetric, #titleConditionMatchCountCompareOperator, #titleConditionMatchCountCompareRight, #titleConditionMatchCountCompareValue, #titleConditionRematchRecord, #titleConditionRematchMode, #titleConditionHostOtherLeaveStartCount, #titleConditionHostOtherLeavePattern").forEach((element) => {
    const update = () => {
      syncTitleConditionPlayCountFields(form, element.id);
      if (element.id === "titleConditionAssetType") {
        const illustrationTarget = form.querySelector<HTMLSelectElement>("#titleConditionIllustrationTargetId");
        const iconTarget = form.querySelector<HTMLSelectElement>("#titleConditionIconTargetId");
        if (illustrationTarget) illustrationTarget.value = "any";
        if (iconTarget) iconTarget.value = "any";
      }
      updateTitleConditionPreview(form);
    };
    element.addEventListener("input", update);
    element.addEventListener("change", update);
  });
  bindTitleConditionParticipantControlEvents(form);
  bindTitleConditionCardControlEvents(form, form);

  form.querySelector<HTMLButtonElement>("[data-open-title-condition-json]")?.addEventListener("click", () => {
    openTitleConditionJsonModal(form);
  });

  updateTitleConditionPreview(form, false);
}


function syncTitleConditionPlayCountFields(form: HTMLFormElement, changedFieldId = "") {
  const template = getTitleConditionTemplate(getFormControlValue(form, "titleConditionTemplate"));
  const difficulty = form.querySelector<HTMLSelectElement>("#titleConditionDifficulty");
  const gameType = form.querySelector<HTMLSelectElement>("#titleConditionGameType");
  if (!difficulty || !gameType) return;
  if (template.kind !== "play_count") {
    difficulty.disabled = false;
    gameType.disabled = false;
    return;
  }

  if (changedFieldId === "titleConditionDifficulty" && difficulty.value !== "any") gameType.value = "any";
  if (changedFieldId === "titleConditionGameType" && gameType.value !== "any") difficulty.value = "any";
  if (difficulty.value !== "any" && gameType.value !== "any") gameType.value = "any";

  difficulty.disabled = gameType.value !== "any";
  gameType.disabled = difficulty.value !== "any";
}

function syncTitleConditionMatchCountCompareInputs(form: HTMLFormElement, template: TitleConditionTemplate) {
  const leftSelect = form.querySelector<HTMLSelectElement>("#titleConditionMatchCountCompareLeftMetric");
  const rightSelect = form.querySelector<HTMLSelectElement>("#titleConditionMatchCountCompareRight");
  const valueInput = form.querySelector<HTMLInputElement>("#titleConditionMatchCountCompareValue");
  if (!leftSelect || !rightSelect || !valueInput) return;
  if (template.kind !== "match_count_compare") return;

  const leftMetric = readTitleConditionMatchCountCompareMetric(leftSelect.value);
  let right = readTitleConditionMatchCountCompareRight(rightSelect.value);
  if (right !== "fixed_value" && right === leftMetric) right = "fixed_value";
  const options = [
    { value: "fixed_value", label: "固定値" },
    ...TITLE_CONDITION_MATCH_COUNT_COMPARE_METRICS.filter((item) => item.value !== leftMetric),
  ];
  rightSelect.innerHTML = options.map((item) => `<option value="${escapeAttribute(item.value)}" ${item.value === right ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("");
  valueInput.closest<HTMLElement>(".adminField")?.toggleAttribute("hidden", right !== "fixed_value");
}


function bindTitleConditionParticipantControlEvents(form: HTMLFormElement) {
  form.querySelectorAll<HTMLSelectElement>("[name^='titleConditionParticipantRelation']").forEach((element) => {
    element.addEventListener("change", () => {
      syncTitleConditionParticipantSelfSelection(form, element);
      syncTitleConditionParticipantIconRows(form);
      updateTitleConditionPreview(form);
    });
    element.addEventListener("input", () => {
      syncTitleConditionParticipantIconRows(form);
      updateTitleConditionPreview(form);
    });
  });
  form.querySelectorAll<HTMLSelectElement>("#titleConditionParticipantSpecMode, #titleConditionParticipantOrder").forEach((element) => {
    element.addEventListener("input", () => updateTitleConditionPreview(form));
    element.addEventListener("change", () => updateTitleConditionPreview(form));
  });
  form.querySelectorAll<HTMLSelectElement>("[name^='titleConditionParticipantIcon'], [name^='titleConditionParticipantIconType']").forEach((element) => {
    element.addEventListener("input", () => {
      syncTitleConditionParticipantIconRows(form);
      updateTitleConditionPreview(form);
    });
    element.addEventListener("change", () => {
      syncTitleConditionParticipantIconRows(form);
      updateTitleConditionPreview(form);
    });
  });
}

function bindTitleConditionCardControlEvents(form: HTMLFormElement, root: ParentNode) {
  root.querySelectorAll<HTMLSelectElement | HTMLInputElement>("#titleConditionCardTargetRange, #titleConditionHandTarget, #titleConditionHandTiming, #titleConditionCardRule, #titleConditionAllSuitRule, [name^='titleConditionCardActor'], [name^='titleConditionCardRank'], [name^='titleConditionCardSuit'], [name='titleConditionAllSuit'], [name='titleConditionSameSuit']").forEach((element) => {
    const update = () => {
      if (element instanceof HTMLSelectElement && element.name.startsWith("titleConditionCardRank")) {
        const index = Number(element.name.slice("titleConditionCardRank".length));
        if (Number.isInteger(index)) {
          const template = getTitleConditionTemplate(getFormControlValue(form, "titleConditionTemplate"));
          const rule = readTitleConditionCardRule(getFormControlValue(form, "titleConditionCardRule"));
          if (template.id === "initial_hand_sequence" && rule === "same_rank") {
            form.querySelectorAll<HTMLSelectElement>("[name^='titleConditionCardRank']").forEach((select, cardIndex) => {
              if (cardIndex < 4) select.value = element.value;
            });
          }
          for (let cardIndex = 0; cardIndex < 4; cardIndex += 1) syncTitleConditionCardSuitControlForRank(form, cardIndex);
        }
      }
      updateTitleConditionPreview(form);
    };
    element.addEventListener("input", update);
    element.addEventListener("change", update);
  });
  root.querySelectorAll<HTMLButtonElement>("[data-open-title-condition-suit-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.openTitleConditionSuitModal);
      if (Number.isInteger(index)) openTitleConditionSuitModal(form, index);
    });
  });
}

function syncTitleConditionCardSuitControlForRank(form: HTMLFormElement, index: number) {
  const rank = form.querySelector<HTMLSelectElement>(`[name='titleConditionCardRank${index}']`);
  const suitInput = form.querySelector<HTMLInputElement>(`[name='titleConditionCardSuits${index}']`);
  const suitButton = form.querySelector<HTMLButtonElement>(`[data-open-title-condition-suit-modal='${index}']`);
  if (!rank || !suitInput || !suitButton) return;

  if (rank.value === "JOKER") suitInput.value = "";
  suitButton.disabled = rank.disabled || rank.value === "JOKER";
  suitButton.textContent = titleConditionSuitSelectionLabel(readTitleConditionSuitSelectionValue(suitInput.value));
}

function openTitleConditionSuitModal(form: HTMLFormElement, index: number) {
  const rank = form.querySelector<HTMLSelectElement>(`[name='titleConditionCardRank${index}']`);
  const suitInput = form.querySelector<HTMLInputElement>(`[name='titleConditionCardSuits${index}']`);
  const suitButton = form.querySelector<HTMLButtonElement>(`[data-open-title-condition-suit-modal='${index}']`);
  if (!rank || !suitInput || !suitButton || rank.value === "JOKER" || suitButton.disabled) return;

  const selectedSuits = new Set(readTitleConditionSuitSelectionValue(suitInput.value));
  const backdrop = document.createElement("div");
  backdrop.className = "adminModalBackdrop adminTitleConditionSuitBackdrop";
  backdrop.innerHTML = `
    <section class="adminModal adminSmallModal" role="dialog" aria-modal="true" aria-labelledby="titleConditionSuitModalTitle">
      <div class="adminCardHeader">
        <h2 id="titleConditionSuitModalTitle">カード${index + 1}のスート指定</h2>
        <button type="button" class="adminIconBtn" aria-label="スート指定を閉じる" data-close-title-condition-suit-modal>×</button>
      </div>
      <div class="adminForm">
        <div class="adminSuitPresetActions" role="group" aria-label="スート一括選択">
          <button type="button" class="adminBtn" data-title-condition-suit-preset="red">赤</button>
          <button type="button" class="adminBtn" data-title-condition-suit-preset="black">黒</button>
          <button type="button" class="adminBtn" data-title-condition-suit-preset="all">全スート</button>
          <button type="button" class="adminBtn" data-title-condition-suit-preset="clear">クリア</button>
        </div>
        <div class="adminSuitChoiceGrid" role="group" aria-label="個別スート選択">
          ${TITLE_CONDITION_CARD_SUITS.filter((suit) => suit !== "any").map((suit) => `
            <label class="adminSuitChoice">
              <input type="checkbox" value="${escapeAttribute(suit)}" data-title-condition-suit-option ${selectedSuits.has(suit) ? "checked" : ""}>
              <span>${escapeHtml(titleConditionSuitLabel(suit))}</span>
            </label>`).join("")}
        </div>
        <p class="adminMuted">一括選択後も、各スートのチェックを個別に変更できます。何も選ばない場合は指定なしとして扱います。</p>
        <div class="adminActions">
          <button type="button" class="adminBtn primary" data-apply-title-condition-suit-modal>決定</button>
          <button type="button" class="adminBtn" data-close-title-condition-suit-modal>キャンセル</button>
        </div>
      </div>
    </section>`;

  const close = () => backdrop.remove();
  const getInputs = () => Array.from(backdrop.querySelectorAll<HTMLInputElement>("[data-title-condition-suit-option]"));
  const applyPreset = (preset: string) => {
    const values = preset === "red"
      ? new Set(["H", "D"])
      : preset === "black"
        ? new Set(["S", "C"])
        : preset === "all"
          ? new Set(["S", "H", "D", "C"])
          : new Set<string>();
    getInputs().forEach((input) => {
      input.checked = values.has(input.value);
    });
  };

  backdrop.querySelectorAll<HTMLButtonElement>("[data-close-title-condition-suit-modal]").forEach((button) => button.addEventListener("click", close));
  backdrop.querySelectorAll<HTMLButtonElement>("[data-title-condition-suit-preset]").forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.titleConditionSuitPreset ?? "clear"));
  });
  backdrop.querySelector<HTMLButtonElement>("[data-apply-title-condition-suit-modal]")?.addEventListener("click", () => {
    const suits = normalizeTitleConditionSuitList(getInputs().filter((input) => input.checked).map((input) => input.value));
    const template = getTitleConditionTemplate(getFormControlValue(form, "titleConditionTemplate"));
    const rule = readTitleConditionCardRule(getFormControlValue(form, "titleConditionCardRule"));
    if (template.id === "initial_hand_sequence" && rule === "same_suit") {
      for (let cardIndex = 0; cardIndex < 4; cardIndex += 1) {
        const targetInput = form.querySelector<HTMLInputElement>(`[name='titleConditionCardSuits${cardIndex}']`);
        const targetButton = form.querySelector<HTMLButtonElement>(`[data-open-title-condition-suit-modal='${cardIndex}']`);
        if (targetInput) targetInput.value = suits.join(",");
        if (targetButton) targetButton.textContent = titleConditionSuitSelectionLabel(suits);
      }
    } else {
      suitInput.value = suits.join(",");
      suitButton.textContent = titleConditionSuitSelectionLabel(suits);
    }
    close();
    updateTitleConditionPreview(form);
  });

  document.body.append(backdrop);
}

function updateTitleConditionPreview(form: HTMLFormElement, forceBuilderMode = true) {
  const templateId = getFormControlValue(form, "titleConditionTemplate") || "play_count";
  const template = getTitleConditionTemplate(templateId);
  syncTitleConditionPlayCountFields(form);
  syncTitleConditionMatchCountCompareInputs(form, template);
  if (template.kind === "participant_icon_composition") syncTitleConditionParticipantIconRows(form);
  const preview = createTitleConditionPreview({
    mode: "builder",
    templateId,
    playStyle: readTitleConditionPlayStyle(getFormControlValue(form, "titleConditionPlayStyle")),
    gameMode: readTitleConditionGameMode(getFormControlValue(form, "titleConditionGameMode")),
    difficulty: readTitleConditionDifficulty(getFormControlValue(form, "titleConditionDifficulty")),
    gameType: readTitleConditionGameType(getFormControlValue(form, "titleConditionGameType")),
    operator: readTitleConditionOperator(getFormControlValue(form, "titleConditionOperator")),
    value: readTitleConditionNumber(getFormControlValue(form, "titleConditionValue"), template.defaultValue ?? 1),
    cardRule: readTitleConditionCardRule(getFormControlValue(form, "titleConditionCardRule")),
    allSuitRule: readTitleConditionAllSuitRule(getFormControlValue(form, "titleConditionAllSuitRule")),
    assetType: readTitleConditionAssetType(getFormControlValue(form, "titleConditionAssetType")),
    assetTargetId: readTitleConditionAssetTargetIdFromForm(form, template),
    participantSpecMode: readTitleConditionParticipantSpecMode(getFormControlValue(form, "titleConditionParticipantSpecMode")),
    participantOrder: readTitleConditionParticipantOrder(getFormControlValue(form, "titleConditionParticipantOrder")),
    participantSlots: readTitleConditionParticipantSlotsFromForm(form),
    ngName: readTitleConditionNgName(getFormControlValue(form, "titleConditionNgName")),
    loseCertainRole: readTitleConditionLoseCertainRole(getFormControlValue(form, "titleConditionLoseCertainRole")),
    loseCertainAction: readTitleConditionLoseCertainAction(getFormControlValue(form, "titleConditionLoseCertainAction"), readTitleConditionLoseCertainRole(getFormControlValue(form, "titleConditionLoseCertainRole"))),
    experienceDetail: readTitleConditionExperienceDetail(getFormControlValue(form, "titleConditionExperienceDetail")),
    experienceUnit: readTitleConditionExperienceUnit(getFormControlValue(form, "titleConditionExperienceUnit")),
    experienceActor: readTitleConditionExperienceActor(getFormControlValue(form, "titleConditionExperienceActor")),
    jokerEventDetail: readTitleConditionJokerEventDetail(getFormControlValue(form, "titleConditionJokerEventDetail")),
    jokerEventUnit: readTitleConditionJokerEventUnit(getFormControlValue(form, "titleConditionJokerEventUnit")),
    jokerEventActor: readTitleConditionJokerEventActor(getFormControlValue(form, "titleConditionJokerEventActor")),
    matchCountCompareActor: readTitleConditionMatchCountCompareActor(getFormControlValue(form, "titleConditionMatchCountCompareActor")),
    matchCountCompareLeftMetric: readTitleConditionMatchCountCompareMetric(getFormControlValue(form, "titleConditionMatchCountCompareLeftMetric")),
    matchCountCompareOperator: readTitleConditionMatchCountCompareOperator(getFormControlValue(form, "titleConditionMatchCountCompareOperator")),
    matchCountCompareRight: readTitleConditionMatchCountCompareRight(getFormControlValue(form, "titleConditionMatchCountCompareRight")),
    matchCountCompareValue: readTitleConditionNumber(getFormControlValue(form, "titleConditionMatchCountCompareValue"), 0),
    rematchRecord: readTitleConditionRematchRecord(getFormControlValue(form, "titleConditionRematchRecord")),
    rematchMode: readTitleConditionRematchMode(getFormControlValue(form, "titleConditionRematchMode"), readTitleConditionRematchRecord(getFormControlValue(form, "titleConditionRematchRecord"))),
    hostOtherLeaveStartCount: readTitleConditionHostOtherLeaveStartCount(getFormControlValue(form, "titleConditionHostOtherLeaveStartCount")),
    hostOtherLeavePattern: readTitleConditionHostOtherLeavePattern(getFormControlValue(form, "titleConditionHostOtherLeavePattern")),
    cardPlaySource: readTitleConditionCardPlaySource(getFormControlValue(form, "titleConditionCardPlaySource")),
    cardPlayActor: readTitleConditionCardPlayActor(getFormControlValue(form, "titleConditionCardPlayActor")),
    cardPlayGroup: readTitleConditionCardPlayGroup(getFormControlValue(form, "titleConditionCardPlayGroup"), template),
    cardTargetRange: readTitleConditionCardTargetRange(getFormControlValue(form, "titleConditionCardTargetRange")),
    handTarget: readTitleConditionHandTarget(getFormControlValue(form, "titleConditionHandTarget")),
    handTiming: readTitleConditionHandTiming(getFormControlValue(form, "titleConditionHandTiming")),
    sameSuit: form.querySelector<HTMLInputElement>("[name='titleConditionSameSuit']")?.checked ?? false,
    cards: readTitleConditionCardsFromForm(form),
  });

  syncTitleConditionCardControls(form, preview as TitleConditionPreviewInput & TitleConditionPreview);

  const modeInput = form.querySelector<HTMLInputElement>("#conditionInputMode");
  if (modeInput && forceBuilderMode) modeInput.value = "builder";

  const playStyle = form.querySelector<HTMLSelectElement>("#titleConditionPlayStyle");
  const gameMode = form.querySelector<HTMLSelectElement>("#titleConditionGameMode");
  const operator = form.querySelector<HTMLSelectElement>("#titleConditionOperator");
  const value = form.querySelector<HTMLInputElement>("#titleConditionValue");
  const playStyleLabel = form.querySelector<HTMLLabelElement>("label[for='titleConditionPlayStyle']");
  const valueLabel = form.querySelector<HTMLLabelElement>("label[for='titleConditionValue']");
  const disabled = isTitleConditionValueDisabled(template);
  const operatorHidden = isTitleConditionOperatorHidden(template, preview.experienceDetail, preview.experienceUnit, preview.jokerEventDetail, preview.jokerEventUnit);
  const valueHidden = isTitleConditionValueHidden(template, preview.jokerEventDetail, preview.jokerEventUnit);
  if (playStyleLabel) playStyleLabel.textContent = getTitleConditionPlayStyleLabel(template);
  if (playStyle) {
    playStyle.closest<HTMLElement>(".adminField")?.toggleAttribute("hidden", isTitleConditionPlayStyleHidden(template));
    if (template.id === "asset_usage_count" || template.kind === "ng_name_streak" || template.kind === "lose_certain_event") playStyle.value = "any";
    if (template.kind === "host_other_leave") playStyle.value = "multi";
  }
  if (gameMode) {
    gameMode.closest<HTMLElement>(".adminField")?.toggleAttribute("hidden", isTitleConditionGameModeHidden(template));
    if (template.id === "asset_usage_count" || template.kind === "ng_name_streak" || template.kind === "lose_certain_event" || template.kind === "host_other_leave") gameMode.value = "any";
  }
  if (operator) {
    operator.disabled = disabled;
    operator.closest<HTMLElement>(".adminField")?.toggleAttribute("hidden", operatorHidden);
    if (template.id === "asset_usage_count" || template.kind === "play_count" || template.kind === "card_play_count" || template.kind === "ng_name_streak" || template.kind === "lose_certain_event" || template.kind === "rematch_session" || template.kind === "host_other_leave" || (template.kind === "experience" && !isTitleConditionExperienceMatchCountDetail(readTitleConditionExperienceDetail(preview.experienceDetail), readTitleConditionExperienceUnit(preview.experienceUnit))) || (template.kind === "joker_event" && !isTitleConditionJokerEventMatchCountDetail(readTitleConditionJokerEventDetail(preview.jokerEventDetail), readTitleConditionJokerEventUnit(preview.jokerEventUnit)))) operator.value = ">=";
  }
  if (value) {
    value.disabled = disabled;
    value.min = String(getTitleConditionValueMin(template));
    if ((template.id === "asset_usage_count" || template.kind === "play_count" || template.kind === "card_play_count" || template.kind === "ng_name_streak" || template.kind === "lose_certain_event" || template.kind === "experience" || template.kind === "joker_event" || template.kind === "rematch_session" || template.kind === "host_other_leave") && Number(value.value) < 1) value.value = "1";
    value.closest<HTMLElement>(".adminField")?.toggleAttribute("hidden", valueHidden);
  }
  if (valueLabel) valueLabel.textContent = getTitleConditionValueLabel(template);
  const ngNameArea = form.querySelector<HTMLElement>("[data-title-condition-ng-name-area]");
  if (ngNameArea) ngNameArea.hidden = template.kind !== "ng_name_streak";
  const loseCertainArea = form.querySelector<HTMLElement>("[data-title-condition-lose-certain-area]");
  if (loseCertainArea) loseCertainArea.hidden = template.kind !== "lose_certain_event";
  const difficultyArea = form.querySelector<HTMLElement>("[data-title-condition-difficulty-area]");
  if (difficultyArea) difficultyArea.hidden = template.kind !== "play_count";
  const gameTypeArea = form.querySelector<HTMLElement>("[data-title-condition-game-type-area]");
  if (gameTypeArea) gameTypeArea.hidden = template.kind !== "play_count";
  const cardPlayCountArea = form.querySelector<HTMLElement>("[data-title-condition-card-play-count-area]");
  if (cardPlayCountArea) cardPlayCountArea.hidden = template.kind !== "card_play_count";
  const cardPlayGroup = form.querySelector<HTMLSelectElement>("#titleConditionCardPlayGroup");
  cardPlayGroup?.closest<HTMLElement>(".adminField")?.toggleAttribute("hidden", template.id !== "specific_card_play_count");
  const experienceArea = form.querySelector<HTMLElement>("[data-title-condition-experience-area]");
  if (experienceArea) experienceArea.hidden = template.kind !== "experience";
  syncTitleConditionExperienceFields(form, preview as TitleConditionPreviewInput & TitleConditionPreview);
  const jokerEventArea = form.querySelector<HTMLElement>("[data-title-condition-joker-event-area]");
  if (jokerEventArea) jokerEventArea.hidden = template.kind !== "joker_event";
  syncTitleConditionJokerEventFields(form, preview as TitleConditionPreviewInput & TitleConditionPreview);
  const matchCountCompareArea = form.querySelector<HTMLElement>("[data-title-condition-match-count-compare-area]");
  if (matchCountCompareArea) matchCountCompareArea.hidden = template.kind !== "match_count_compare";
  syncTitleConditionMatchCountCompareInputs(form, template);
  const rematchArea = form.querySelector<HTMLElement>("[data-title-condition-rematch-area]");
  if (rematchArea) rematchArea.hidden = template.kind !== "rematch_session";
  const hostOtherLeaveArea = form.querySelector<HTMLElement>("[data-title-condition-host-other-leave-area]");
  if (hostOtherLeaveArea) hostOtherLeaveArea.hidden = template.kind !== "host_other_leave";
  syncTitleConditionRematchModeField(form, preview as TitleConditionPreviewInput & TitleConditionPreview);
  syncTitleConditionLoseCertainActionField(form, preview as TitleConditionPreviewInput & TitleConditionPreview);
  const cardArea = form.querySelector<HTMLElement>("[data-title-condition-card-area]");
  if (cardArea) cardArea.hidden = !isTitleConditionCardTemplate(template);
  const sameSuitRow = form.querySelector<HTMLElement>("[data-title-condition-same-suit-row]");
  if (sameSuitRow) sameSuitRow.hidden = template.kind !== "card_sequence" || template.id === "consecutive_played_cards";
  syncTitleConditionCardRuleField(form, template);
  syncTitleConditionAllSuitRuleField(form, preview as TitleConditionPreviewInput & TitleConditionPreview);
  syncTitleConditionAssetControls(form, template, preview as TitleConditionPreviewInput & TitleConditionPreview);
  syncTitleConditionParticipantControls(form, template);
  updateTitleConditionHandCardSlotAvailability(form, template, readTitleConditionCardRule((preview as TitleConditionPreviewInput).cardRule));

  applyTitleConditionPreview(form, preview);
}

function syncTitleConditionCardControls(form: HTMLFormElement, preview: TitleConditionPreviewInput & TitleConditionPreview) {
  const template = getTitleConditionTemplate(preview.templateId);
  const cardArea = form.querySelector<HTMLElement>("[data-title-condition-card-area]");
  const cardTargetRange = readTitleConditionCardTargetRange(preview.cardTargetRange);
  const expectedMode = template.kind === "table_suit_all"
    ? "table_suit_all"
    : template.id === "field_play_sequence"
      ? "field_card_grid"
      : template.id === "consecutive_played_cards"
        ? `consecutive_card_grid_${cardTargetRange}`
        : template.id === "played_card_set"
          ? "unified_card_set"
          : template.id === "initial_hand_sequence"
            ? `initial_hand_card_grid_${readTitleConditionCardRule(preview.cardRule)}`
            : "card_grid";
  if (!cardArea || cardArea.dataset.titleConditionCardMode === expectedMode) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderTitleConditionCardControls(preview).trim();
  const nextCardArea = wrapper.firstElementChild;
  if (!(nextCardArea instanceof HTMLElement)) return;
  cardArea.replaceWith(nextCardArea);
  bindTitleConditionCardControlEvents(form, nextCardArea);
}

function updateTitleConditionHandCardSlotAvailability(form: HTMLFormElement, template: TitleConditionTemplate, cardRule?: TitleConditionCardRule) {
  const isHandSequence = template.kind === "hand_sequence";
  const normalizedRule = normalizeTitleConditionCardRuleForTemplate(template, cardRule);
  const isSameRank = isHandSequence && normalizedRule === "same_rank";
  const isSameSuit = isHandSequence && normalizedRule === "same_suit";
  const grid = form.querySelector<HTMLElement>("[data-title-condition-card-grid]");
  const gridNote = form.querySelector<HTMLElement>("[data-title-condition-card-grid-note]");
  const sameRankNote = form.querySelector<HTMLElement>("[data-title-condition-same-rank-note]");
  const sameSuitNote = form.querySelector<HTMLElement>("[data-title-condition-same-suit-note]");
  if (grid) grid.hidden = false;
  if (gridNote) gridNote.hidden = isSameRank || isSameSuit;
  if (sameRankNote) sameRankNote.hidden = !isSameRank;
  if (sameSuitNote) sameSuitNote.hidden = !isSameSuit;

  for (let index = 0; index < TITLE_CONDITION_CARD_SLOT_COUNT; index += 1) {
    const actor = form.querySelector<HTMLSelectElement>(`[name='titleConditionCardActor${index}']`);
    const rank = form.querySelector<HTMLSelectElement>(`[name='titleConditionCardRank${index}']`);
    const suit = form.querySelector<HTMLSelectElement>(`[name='titleConditionCardSuit${index}']`);
    const suitButton = form.querySelector<HTMLButtonElement>(`[data-open-title-condition-suit-modal='${index}']`);
    const slot = actor?.closest<HTMLElement>(".adminConditionCardSlot") ?? rank?.closest<HTMLElement>(".adminConditionCardSlot") ?? suit?.closest<HTMLElement>(".adminConditionCardSlot") ?? suitButton?.closest<HTMLElement>(".adminConditionCardSlot");
    const disabled = isHandSequence && index >= 4;
    if (actor) actor.disabled = disabled;
    if (rank) rank.disabled = disabled;
    if (suit) suit.disabled = disabled;
    if (suitButton) suitButton.disabled = disabled || rank?.value === "JOKER";
    slot?.classList.toggle("is-disabled", disabled);
  }
}

function applyTitleConditionPreview(form: HTMLFormElement, preview: TitleConditionPreview) {
  setFormControlValue(form, "conditionType", preview.conditionType);
  setFormControlValue(form, "conditionParamsJson", preview.conditionParamsJson);
  setFormControlValue(form, "conditionBuilderJson", preview.conditionBuilderJson);

  const typePreview = form.querySelector<HTMLElement>("[data-title-condition-type-preview]");
  const paramsPreview = form.querySelector<HTMLElement>("[data-title-condition-params-preview]");
  const builderPreview = form.querySelector<HTMLElement>("[data-title-condition-builder-preview]");
  const status = form.querySelector<HTMLElement>("[data-title-condition-status]");
  if (typePreview) typePreview.textContent = preview.conditionType || "-";
  if (paramsPreview) paramsPreview.textContent = preview.conditionParamsJson || "-";
  if (builderPreview) builderPreview.textContent = preview.conditionBuilderJson || "-";
  if (status) {
    status.textContent = preview.message;
    status.classList.toggle("is-error", !preview.implemented);
  }
}

function openTitleConditionJsonModal(form: HTMLFormElement) {
  const currentType = getFormControlValue(form, "conditionType") || "stat_count_at_least";
  const editingNodeId = titleWizardState?.editingConditionNodeId;
  const editingNode = editingNodeId && editingNodeId !== "new"
    ? titleWizardState?.graph.nodes.find((node): node is TitleConditionGraphConditionNode => node.id === editingNodeId && node.type === "condition") ?? null
    : null;
  const allowCompound = editingNode?.legacyCompound === true;
  const currentParams = getFormControlValue(form, "conditionParamsJson") || "{}";
  const wrapper = document.createElement("div");
  wrapper.className = "adminModalBackdrop adminTitleConditionJsonBackdrop";
  wrapper.setAttribute("data-title-condition-json-backdrop", "");
  wrapper.innerHTML = `
    <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="titleConditionJsonModalTitle">
      <div class="adminCardHeader">
        <h2 id="titleConditionJsonModalTitle">条件JSON入力</h2>
        <button type="button" class="adminIconBtn" aria-label="条件JSON入力を閉じる" data-close-title-condition-json>×</button>
      </div>
      <div class="adminForm">
        <p class="adminMuted">condition_type と condition_params_json をまとめたJSONを入力してください。未対応の condition_type や未実装metricは保存できません。</p>
        <div class="adminField adminFull">
          <label for="titleConditionRawJson">条件JSON</label>
          <textarea id="titleConditionRawJson" data-title-condition-raw-json>${escapeHtml(JSON.stringify({ condition_type: currentType, condition_params_json: parseJson(currentParams) ?? {} }, null, 2))}</textarea>
        </div>
        <p class="adminConditionStatus is-error" data-title-condition-json-error hidden></p>
        <div class="adminActions">
          <button type="button" class="adminBtn primary" data-apply-title-condition-json>反映</button>
          <button type="button" class="adminBtn" data-close-title-condition-json>キャンセル</button>
        </div>
      </div>
    </section>
  `;

  const close = () => wrapper.remove();
  wrapper.querySelectorAll<HTMLButtonElement>("[data-close-title-condition-json]").forEach((button) => button.addEventListener("click", close));
  wrapper.querySelector<HTMLButtonElement>("[data-apply-title-condition-json]")?.addEventListener("click", () => {
    const textarea = wrapper.querySelector<HTMLTextAreaElement>("[data-title-condition-raw-json]");
    const error = wrapper.querySelector<HTMLElement>("[data-title-condition-json-error]");
    const parsed = parseTitleConditionRawJson(textarea?.value ?? "", allowCompound);
    if (!parsed.ok) {
      if (error) {
        error.hidden = false;
        error.textContent = parsed.message;
      }
      return;
    }

    const modeInput = form.querySelector<HTMLInputElement>("#conditionInputMode");
    if (modeInput) modeInput.value = "raw_json";
    applyTitleConditionPreview(form, {
      mode: "raw_json",
      conditionType: parsed.conditionType,
      conditionParamsJson: parsed.conditionParamsJson,
      conditionBuilderJson: JSON.stringify({ version: 1, mode: "raw_json" }),
      implemented: true,
      message: "JSON入力条件です。",
    });
    close();
  });
  document.body.append(wrapper);
}

function parseTitleConditionRawJson(text: string, allowCompound = false): { ok: true; conditionType: string; conditionParamsJson: string } | { ok: false; message: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "JSON構文を確認してください。" };
  }
  if (!isRecord(parsed)) return { ok: false, message: "JSONオブジェクトを入力してください。" };
  const conditionType = typeof parsed.condition_type === "string" ? parsed.condition_type.trim() : "";
  if (!conditionType) return { ok: false, message: "condition_type を入力してください。" };
  if (!isAllowedTitleConditionType(conditionType)) return { ok: false, message: "未対応の condition_type は保存できません。" };
  if (!allowCompound && isCompoundConditionType(conditionType)) {
    return { ok: false, message: "複合条件は相関図のAND／ORブロックで作成してください。" };
  }
  const params = parsed.condition_params_json ?? {};
  const validation = validateConditionParamsForAdmin(conditionType, params);
  if (!validation.ok) return validation;
  return { ok: true, conditionType, conditionParamsJson: JSON.stringify(params) };
}

function getFormControlValue(form: HTMLFormElement, name: string) {
  const element = form.elements.namedItem(name);
  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) return element.value;
  if (element && "value" in element && typeof element.value === "string") return element.value;
  return "";
}

function setFormControlValue(form: HTMLFormElement, name: string, value: string) {
  const element = form.elements.namedItem(name);
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) element.value = value;
}

function bindTitleDeleteEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-open-title-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      titleDeleteTargetId = button.dataset.openTitleDelete ?? null;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-title-delete]")?.addEventListener("click", () => {
    titleDeleteTargetId = null;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-title-delete-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      titleDeleteTargetId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#titleDeleteForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createTitleDeleteChangeBatch(event.currentTarget as HTMLFormElement);
  });
}

function bindTitleIconRewardEvents() {
  const checkbox = app.querySelector<HTMLInputElement>("[data-enable-icon-rewards]");
  const select = app.querySelector<HTMLSelectElement>("[data-icon-reward-select]");
  const addButton = app.querySelector<HTMLButtonElement>("[data-add-icon-reward]");
  const list = app.querySelector<HTMLOListElement>("[data-icon-reward-list]");

  checkbox?.addEventListener("change", syncTitleIconRewardControls);
  select?.addEventListener("change", syncTitleIconRewardControls);

  addButton?.addEventListener("click", () => {
    if (!checkbox?.checked || !select?.value) return;
    const selectedIds = getSelectedIconRewardIds();
    if (selectedIds.length >= 3 || selectedIds.includes(select.value)) return;

    list?.insertAdjacentHTML("beforeend", renderTitleIconRewardItem(select.value));
    select.value = "";
    syncTitleIconRewardControls();
  });

  list?.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const button = target?.closest<HTMLButtonElement>("[data-remove-icon-reward]");
    if (!button) return;
    button.closest("[data-icon-reward-item]")?.remove();
    syncTitleIconRewardControls();
  });

  syncTitleIconRewardControls();
}

function syncTitleIconRewardControls() {
  const checkbox = app.querySelector<HTMLInputElement>("[data-enable-icon-rewards]");
  const body = app.querySelector<HTMLElement>("[data-icon-reward-body]");
  const select = app.querySelector<HTMLSelectElement>("[data-icon-reward-select]");
  const addButton = app.querySelector<HTMLButtonElement>("[data-add-icon-reward]");
  const selectedIds = getSelectedIconRewardIds();
  const enabled = Boolean(checkbox?.checked);

  body?.classList.toggle("is-disabled", !enabled);
  if (select) {
    select.disabled = !enabled || selectedIds.length >= 3;
    Array.from(select.options).forEach((option) => {
      if (!option.value) return;
      option.disabled = selectedIds.includes(option.value);
    });
  }
  if (addButton) addButton.disabled = !enabled || !select?.value || selectedIds.length >= 3 || selectedIds.includes(select?.value ?? "");

  app.querySelectorAll<HTMLButtonElement>("[data-remove-icon-reward]").forEach((button) => {
    button.disabled = !enabled;
  });
}

function getSelectedIconRewardIds() {
  return Array.from(app.querySelectorAll<HTMLInputElement>('input[name="iconRewardIds"]'))
    .map((input) => input.value)
    .filter(Boolean);
}

function bindIconEvents() {
  app.querySelector<HTMLButtonElement>("[data-open-icon-create]")?.addEventListener("click", () => {
    editingIcon = null;
    isIconCreateModalOpen = true;
    messageText = "";
    errorText = "";
    render();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-edit-icon]").forEach((button) => {
    button.addEventListener("click", () => {
      editingIcon = icons.find((icon) => icon.id === button.dataset.editIcon) ?? null;
      isIconCreateModalOpen = false;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-icon-detail]")?.addEventListener("click", () => {
    editingIcon = null;
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-cancel-icon]")?.addEventListener("click", () => {
    editingIcon = null;
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-close-icon-create]")?.addEventListener("click", () => {
    isIconCreateModalOpen = false;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-icon-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      isIconCreateModalOpen = false;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#iconForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveIcon(event.currentTarget as HTMLFormElement);
  });

  bindIconTypeSelectEvents();
  bindIconDeleteEvents();
}

function bindIconTypeSelectEvents() {
  app.querySelectorAll<HTMLSelectElement>("[data-icon-type-select]").forEach((select) => {
    select.addEventListener("focus", () => {
      if (select.value !== "__new_icon_type__") select.dataset.previousValue = select.value;
    });
    select.addEventListener("change", () => {
      if (select.value !== "__new_icon_type__") {
        select.dataset.previousValue = select.value;
        return;
      }
      void openIconTypeCreateModal(select);
    });
  });
}

async function openIconTypeCreateModal(targetSelect: HTMLSelectElement) {
  const previousValue = targetSelect.dataset.previousValue ?? "";
  const backdrop = document.createElement("div");
  backdrop.className = "adminModalBackdrop";
  backdrop.innerHTML = `
    <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="iconTypeCreateModalTitle">
      <div class="adminCardHeader">
        <h2 id="iconTypeCreateModalTitle">アイコン種別追加</h2>
        <button type="button" class="adminIconBtn" aria-label="アイコン種別追加を閉じる" data-close-icon-type-create>×</button>
      </div>
      <form class="adminForm" data-icon-type-create-form>
        <div class="adminField adminFull">
          <label for="iconTypeNameInput">種別名</label>
          <input id="iconTypeNameInput" name="iconTypeName" type="text" maxlength="20" required>
        </div>
        <p class="adminConditionStatus is-error" data-icon-type-create-error hidden></p>
        <div class="adminActions">
          <button type="submit" class="adminBtn primary">追加</button>
          <button type="button" class="adminBtn" data-close-icon-type-create>キャンセル</button>
        </div>
      </form>
    </section>`;

  const close = () => {
    targetSelect.value = previousValue;
    backdrop.remove();
  };

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.querySelectorAll<HTMLButtonElement>("[data-close-icon-type-create]").forEach((button) => button.addEventListener("click", close));
  backdrop.querySelector<HTMLFormElement>("[data-icon-type-create-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const name = readFormString(new FormData(form), "iconTypeName");
    const error = backdrop.querySelector<HTMLElement>("[data-icon-type-create-error]");
    if (!name) {
      if (error) {
        error.hidden = false;
        error.textContent = "種別名を入力してください。";
      }
      return;
    }
    const result = await saveMaster("iconType", false, { iconTypeName: name });
    if (!result.ok || !result.id) {
      if (error) {
        error.hidden = false;
        error.textContent = result.message ?? "アイコン種別を追加できませんでした。";
      }
      return;
    }
    await loadMasters();
    refreshIconTypeSelectOptions(result.id);
    backdrop.remove();
  });

  document.body.append(backdrop);
  backdrop.querySelector<HTMLInputElement>("#iconTypeNameInput")?.focus();
}

function refreshIconTypeSelectOptions(selectedId: string) {
  app.querySelectorAll<HTMLSelectElement>("[data-icon-type-select]").forEach((select) => {
    const current = select.value === "__new_icon_type__" ? selectedId : select.value;
    select.innerHTML = `<option value="">未選択</option>${iconTypes.map((item) => `<option value="${escapeAttribute(item.id)}">${escapeHtml(item.name)}</option>`).join("")}<option value="__new_icon_type__">新規追加</option>`;
    select.value = iconTypes.some((item) => item.id === current) ? current : "";
    select.dataset.previousValue = select.value;
  });
}

function bindAssetEvents() {
  app.querySelector<HTMLFormElement>("#assetIconForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void uploadAsset(event.currentTarget as HTMLFormElement);
  });

  app.querySelector<HTMLFormElement>("#assetLoadingIllustrationForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void uploadAsset(event.currentTarget as HTMLFormElement);
  });

  bindIconTypeSelectEvents();
  bindIconDeleteEvents();
  bindIconReplaceEvents();
  bindLoadingIllustrationDeleteEvents();
  bindLoadingIllustrationReplaceEvents();
}

function bindIconDeleteEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-open-icon-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      iconDeleteTargetId = button.dataset.openIconDelete ?? null;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-icon-delete]")?.addEventListener("click", () => {
    iconDeleteTargetId = null;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-icon-delete-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      iconDeleteTargetId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#iconDeleteForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createIconDeleteChangeBatch(event.currentTarget as HTMLFormElement);
  });
}


function bindIconReplaceEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-open-icon-replace]").forEach((button) => {
    button.addEventListener("click", () => {
      iconReplaceTargetId = button.dataset.openIconReplace ?? null;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-icon-replace]")?.addEventListener("click", () => {
    iconReplaceTargetId = null;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-icon-replace-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      iconReplaceTargetId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#iconReplaceForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createIconReplaceChangeBatch(event.currentTarget as HTMLFormElement);
  });
}


function bindLoadingIllustrationDeleteEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-open-loading-illustration-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      loadingIllustrationDeleteTargetId = button.dataset.openLoadingIllustrationDelete ?? null;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-loading-illustration-delete]")?.addEventListener("click", () => {
    loadingIllustrationDeleteTargetId = null;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-loading-illustration-delete-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      loadingIllustrationDeleteTargetId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#loadingIllustrationDeleteForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createLoadingIllustrationDeleteChangeBatch(event.currentTarget as HTMLFormElement);
  });
}

function bindLoadingIllustrationReplaceEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-open-loading-illustration-replace]").forEach((button) => {
    button.addEventListener("click", () => {
      loadingIllustrationReplaceTargetId = button.dataset.openLoadingIllustrationReplace ?? null;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-loading-illustration-replace]")?.addEventListener("click", () => {
    loadingIllustrationReplaceTargetId = null;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-loading-illustration-replace-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      loadingIllustrationReplaceTargetId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#loadingIllustrationReplaceForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createLoadingIllustrationReplaceChangeBatch(event.currentTarget as HTMLFormElement);
  });
}

function bindLoadingIllustrationEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-edit-loading-illustration]").forEach((button) => {
    button.addEventListener("click", () => {
      editingLoadingIllustration = assetLoadingIllustrations.find((item) => item.id === button.dataset.editLoadingIllustration) ?? null;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-loading-illustration-detail]")?.addEventListener("click", () => {
    editingLoadingIllustration = null;
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-cancel-loading-illustration]")?.addEventListener("click", () => {
    editingLoadingIllustration = null;
    render();
  });

  app.querySelector<HTMLSelectElement>("[data-appearance-mode]")?.addEventListener("change", syncAppearanceModeControls);

  app.querySelector<HTMLFormElement>("#loadingIllustrationForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveLoadingIllustrationSettings(event.currentTarget as HTMLFormElement);
  });

  syncAppearanceModeControls();
}

function syncAppearanceModeControls() {
  const mode = app.querySelector<HTMLSelectElement>("[data-appearance-mode]")?.value;
  const isManual = mode === "manual";
  app.querySelectorAll<HTMLInputElement>("[data-rate-field] input").forEach((input) => {
    input.disabled = !isManual;
  });
}


function bindAnnouncementEvents() {
  app.querySelector<HTMLButtonElement>("[data-open-announcement-create]")?.addEventListener("click", () => {
    editingAnnouncement = null;
    isAnnouncementCreateModalOpen = true;
    messageText = "";
    errorText = "";
    render();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-edit-announcement]").forEach((button) => {
    button.addEventListener("click", () => {
      editingAnnouncement = announcements.find((announcement) => announcement.id === button.dataset.editAnnouncement) ?? null;
      isAnnouncementCreateModalOpen = false;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-delete-announcement]").forEach((button) => {
    button.addEventListener("click", () => {
      const announcementId = button.dataset.deleteAnnouncement ?? "";
      const announcement = announcements.find((item) => item.id === announcementId);
      const confirmed = window.confirm(`${announcement?.title ?? "このお知らせ"} を削除しますか？`);
      if (confirmed) void deleteAnnouncement(announcementId);
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-announcement-detail]")?.addEventListener("click", () => {
    editingAnnouncement = null;
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-cancel-announcement]")?.addEventListener("click", () => {
    editingAnnouncement = null;
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-close-announcement-create]")?.addEventListener("click", () => {
    isAnnouncementCreateModalOpen = false;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-announcement-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      isAnnouncementCreateModalOpen = false;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#announcementForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveAnnouncement(event.currentTarget as HTMLFormElement);
  });
}


function bindChangeBatchEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-open-change-batch-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      messageText = "";
      errorText = "";
      void openChangeBatchDetail(button.dataset.openChangeBatchDetail ?? "");
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-open-change-batch-apply]").forEach((button) => {
    button.addEventListener("click", () => {
      changeBatchActionTarget = { batchId: button.dataset.openChangeBatchApply ?? "", mode: "apply" };
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-open-change-batch-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      changeBatchActionTarget = { batchId: button.dataset.openChangeBatchCancel ?? "", mode: "cancel" };
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-open-change-item-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!changeBatchActionTarget?.batchId) return;
      changeBatchActionTarget = { batchId: changeBatchActionTarget.batchId, mode: "itemCancel", itemId: button.dataset.openChangeItemCancel ?? "" };
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-change-batch-modal]")?.addEventListener("click", () => {
    changeBatchActionTarget = null;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-change-batch-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      changeBatchActionTarget = null;
      render();
    }
  });

  app.querySelectorAll<HTMLInputElement>("#changeBatchApplyForm input[type='checkbox']").forEach((checkbox) => {
    checkbox.addEventListener("change", syncChangeBatchApplyButton);
  });

  app.querySelector<HTMLFormElement>("#changeBatchApplyForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void applyChangeBatch(event.currentTarget as HTMLFormElement);
  });

  app.querySelector<HTMLFormElement>("#changeBatchCancelForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void cancelChangeBatch(event.currentTarget as HTMLFormElement);
  });

  app.querySelector<HTMLFormElement>("#changeItemCancelForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void cancelChangeItem(event.currentTarget as HTMLFormElement);
  });

  syncChangeBatchApplyButton();
}

async function openChangeBatchDetail(batchId: string) {
  if (!batchId) return;
  await loadChangeBatches();
  changeBatchActionTarget = { batchId, mode: "detail" };
  render();
}

function syncChangeBatchApplyButton() {
  const form = app.querySelector<HTMLFormElement>("#changeBatchApplyForm");
  const button = app.querySelector<HTMLButtonElement>("[data-apply-change-batch-submit]");
  if (!form || !button) return;
  const checks = Array.from(form.querySelectorAll<HTMLInputElement>("input[type='checkbox']"));
  button.disabled = isLoading || checks.length === 0 || checks.some((checkbox) => !checkbox.checked);
}

function bindPlayerUserEvents() {
  app.querySelector<HTMLFormElement>("#playerUserSearchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    playerUserQuery = readFormString(data, "playerUserSearch");
    playerUserSearchInput = playerUserQuery;
    playerUserPagination = { ...playerUserPagination, page: 1, pageSize: ADMIN_LIST_PAGE_SIZE };
    void refreshPlayerUsers();
  });

  app.querySelector<HTMLButtonElement>("[data-clear-player-user-search]")?.addEventListener("click", () => {
    playerUserQuery = "";
    playerUserSearchInput = "";
    playerUserPagination = { ...playerUserPagination, page: 1, pageSize: ADMIN_LIST_PAGE_SIZE };
    void refreshPlayerUsers();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-player-users-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.playerUsersPage;
      const nextPage = direction === "previous" ? playerUserPagination.page - 1 : playerUserPagination.page + 1;
      playerUserPagination = { ...playerUserPagination, page: nextPage };
      void refreshPlayerUsers();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-open-player-user-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      const userId = button.dataset.openPlayerUserDetail ?? "";
      void openPlayerUserDetail(userId);
    });
  });

  app.querySelector<HTMLButtonElement>("[data-back-player-users]")?.addEventListener("click", () => {
    selectedPlayerUserDetail = null;
    isPlayerUserHistoryModalOpen = false;
    playerUserStatusAction = null;
    messageText = "";
    errorText = "";
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-open-player-user-history]")?.addEventListener("click", () => {
    isPlayerUserHistoryModalOpen = true;
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-close-player-user-history]")?.addEventListener("click", () => {
    isPlayerUserHistoryModalOpen = false;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-player-user-history-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      isPlayerUserHistoryModalOpen = false;
      render();
    }
  });

  app.querySelectorAll<HTMLButtonElement>("[data-open-player-user-status-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.openPlayerUserStatusAction;
      if (action === "suspend" || action === "unsuspend") {
        playerUserStatusAction = action;
        messageText = "";
        errorText = "";
        render();
      }
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-close-player-user-status-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      playerUserStatusAction = null;
      render();
    });
  });

  app.querySelector<HTMLDivElement>("[data-player-user-status-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      playerUserStatusAction = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#playerUserStatusForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void updatePlayerUserStatus(event.currentTarget as HTMLFormElement);
  });
}

function bindAdminLoginEvents() {
  app.querySelector<HTMLFormElement>("#adminLoginForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void loginAdmin(event.currentTarget as HTMLFormElement);
  });
}

function bindUserEvents() {
  app.querySelector<HTMLButtonElement>('[data-open-admin-create]')?.addEventListener('click', () => {
    isAdminCreateModalOpen = true;
    messageText = '';
    errorText = '';
    render();
  });

  app.querySelectorAll<HTMLButtonElement>('[data-close-admin-create-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      isAdminCreateModalOpen = false;
      render();
    });
  });

  app.querySelector<HTMLDivElement>('[data-admin-create-modal-backdrop]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      isAdminCreateModalOpen = false;
      render();
    }
  });

  app.querySelector<HTMLFormElement>('#adminCreateForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void createAdminUser(event.currentTarget as HTMLFormElement);
  });

  app.querySelectorAll<HTMLButtonElement>('[data-edit-admin-name]').forEach((button) => {
    button.addEventListener('click', () => {
      adminNameTargetAdminId = button.dataset.editAdminName ?? null;
      messageText = '';
      errorText = '';
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>('[data-close-admin-name-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      adminNameTargetAdminId = null;
      render();
    });
  });

  app.querySelector<HTMLDivElement>('[data-admin-name-modal-backdrop]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      adminNameTargetAdminId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>('#adminNameForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void updateAdminName(event.currentTarget as HTMLFormElement);
  });

  app.querySelectorAll<HTMLButtonElement>('[data-edit-admin-role]').forEach((button) => {
    button.addEventListener('click', () => {
      adminRoleTargetAdminId = button.dataset.editAdminRole ?? null;
      messageText = '';
      errorText = '';
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>('[data-close-admin-role-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      adminRoleTargetAdminId = null;
      render();
    });
  });

  app.querySelector<HTMLDivElement>('[data-admin-role-modal-backdrop]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      adminRoleTargetAdminId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>('#adminRoleForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void updateAdminRole(event.currentTarget as HTMLFormElement);
  });

  app.querySelectorAll<HTMLButtonElement>('[data-toggle-admin-status]').forEach((button) => {
    button.addEventListener('click', () => {
      const adminId = button.dataset.toggleAdminStatus ?? '';
      const status = button.dataset.nextAdminStatus ?? '';
      void updateAdminStatus(adminId, status);
    });
  });

  app.querySelectorAll<HTMLButtonElement>('[data-delete-admin]').forEach((button) => {
    button.addEventListener('click', () => {
      const adminId = button.dataset.deleteAdmin ?? '';
      void deleteAdminUser(adminId);
    });
  });

  app.querySelectorAll<HTMLButtonElement>('[data-change-admin-password]').forEach((button) => {
    button.addEventListener('click', () => {
      passwordTargetAdminId = button.dataset.changeAdminPassword ?? null;
      messageText = '';
      errorText = '';
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>('[data-close-admin-password-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      passwordTargetAdminId = null;
      render();
    });
  });

  app.querySelector<HTMLDivElement>('[data-admin-password-modal-backdrop]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      passwordTargetAdminId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>('#adminPasswordForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void changeAdminPassword(event.currentTarget as HTMLFormElement);
  });
}

function showTitleSaveConfirmModal(confirm: TitleSaveConfirmState) {
  removeTitleSaveConfirmModal();
  app.insertAdjacentHTML("beforeend", renderTitleSaveConfirmModal(confirm));
  bindTitleSaveConfirmModalEvents();
}

function removeTitleSaveConfirmModal() {
  app.querySelector("[data-title-save-confirm-backdrop]")?.remove();
}

function closeTitleSaveConfirmModal() {
  titleSaveConfirmState = null;
  removeTitleSaveConfirmModal();
}

function bindTitleSaveConfirmModalEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-close-title-save-confirm]").forEach((button) => {
    button.addEventListener("click", () => closeTitleSaveConfirmModal());
  });
  app.querySelector<HTMLButtonElement>("[data-confirm-title-save]")?.addEventListener("click", () => {
    if (titleSaveConfirmState) void createTitleSaveChangeBatch(titleSaveConfirmState);
  });
}

async function createTitleSaveChangeBatch(confirm: TitleSaveConfirmState) {
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/change-batches", {
    method: "POST",
    body: JSON.stringify({
      changeType: confirm.isEdit ? "title_update" : "title_create",
      ...confirm.payload,
    }),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  titleSaveConfirmState = null;
  removeTitleSaveConfirmModal();
  editingTitle = null;
  titleWizardState = null;
  isTitleCreateModalOpen = false;
  await Promise.all([loadMasters(), loadChangeBatches()]);
  activeTab = "changeBatches";
  changeBatchActionTarget = result.batchId ? { batchId: result.batchId, mode: "detail" } : null;
  render();
}

async function saveIcon(form: HTMLFormElement) {
  const data = new FormData(form);
  const payload = readIconPayload(data);
  const isEdit = Boolean(payload.iconId);
  const saved = await saveMaster("icon", isEdit, payload);
  if (!saved.ok) {
    render();
    return;
  }

  editingIcon = null;
  isIconCreateModalOpen = false;
  await loadMasters();
  render();
}

async function saveMaster(targetType: MasterTargetType, isEdit: boolean, payload: SavePayload) {
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/masters", {
    method: isEdit ? "PATCH" : "POST",
    body: JSON.stringify({ targetType, ...payload }),
  });

  isLoading = false;
  return result;
}

async function uploadAsset(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminFormJson("/api/admin/assets", data);

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  form.reset();
  await Promise.all([loadAssets(), loadMasters()]);
  render();
}



async function createTitleDeleteChangeBatch(form: HTMLFormElement) {
  const payload = readTitleDeletePayload(new FormData(form));
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/change-batches", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  titleDeleteTargetId = null;
  editingTitle = null;
  await Promise.all([loadChangeBatches(), loadMasters()]);
  activeTab = "changeBatches";
  changeBatchActionTarget = result.batchId ? { batchId: result.batchId, mode: "detail" } : null;
  render();
}

async function createIconDeleteChangeBatch(form: HTMLFormElement) {
  const payload = readIconDeletePayload(new FormData(form));
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/change-batches", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  iconDeleteTargetId = null;
  await Promise.all([loadChangeBatches(), loadAssets(), loadMasters()]);
  activeTab = "changeBatches";
  changeBatchActionTarget = result.batchId ? { batchId: result.batchId, mode: "detail" } : null;
  render();
}


async function createIconReplaceChangeBatch(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminFormJson("/api/admin/assets", data);

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  iconReplaceTargetId = null;
  await Promise.all([loadChangeBatches(), loadAssets(), loadMasters()]);
  activeTab = "changeBatches";
  changeBatchActionTarget = result.batchId ? { batchId: result.batchId, mode: "detail" } : null;
  render();
}


async function createLoadingIllustrationDeleteChangeBatch(form: HTMLFormElement) {
  const payload = readLoadingIllustrationDeletePayload(new FormData(form));
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/change-batches", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  loadingIllustrationDeleteTargetId = null;
  await loadChangeBatches();
  activeTab = "changeBatches";
  changeBatchActionTarget = result.batchId ? { batchId: result.batchId, mode: "detail" } : null;
  render();
}

async function createLoadingIllustrationReplaceChangeBatch(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminFormJson("/api/admin/assets", data);

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  loadingIllustrationReplaceTargetId = null;
  await Promise.all([loadChangeBatches(), loadAssets(), loadMasters()]);
  activeTab = "changeBatches";
  changeBatchActionTarget = result.batchId ? { batchId: result.batchId, mode: "detail" } : null;
  render();
}

async function applyChangeBatch(form: HTMLFormElement) {
  const data = new FormData(form);
  const batchId = readFormString(data, "batchId");
  if (!batchId) return;
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/change-batches", {
    method: "PATCH",
    body: JSON.stringify({ action: "apply", batchId }),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  changeBatchActionTarget = null;
  messageText = "反映しました。画面を更新します。";
  render();
  window.setTimeout(() => window.location.reload(), 900);
}


async function cancelChangeItem(form: HTMLFormElement) {
  const data = new FormData(form);
  const batchId = readFormString(data, "batchId");
  const itemId = readFormString(data, "itemId");
  const cancelReason = readFormString(data, "changeItemCancelReason");
  if (!batchId || !itemId) return;
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/change-batches", {
    method: "PATCH",
    body: JSON.stringify({ action: "cancelItem", batchId, itemId, cancelReason }),
  });

  isLoading = false;
  await Promise.all([loadChangeBatches(), loadAssets(), loadMasters()]);
  if (!result.ok) {
    render();
    return;
  }

  const refreshedBatch = changeBatches.find((batch) => batch.id === batchId);
  changeBatchActionTarget = refreshedBatch ? { batchId, mode: "detail" } : null;
  render();
}

async function cancelChangeBatch(form: HTMLFormElement) {
  const data = new FormData(form);
  const batchId = readFormString(data, "batchId");
  const cancelReason = readFormString(data, "changeBatchCancelReason");
  if (!batchId) return;
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/change-batches", {
    method: "PATCH",
    body: JSON.stringify({ action: "cancel", batchId, cancelReason }),
  });

  isLoading = false;
  await Promise.all([loadChangeBatches(), loadAssets(), loadMasters()]);
  if (!result.ok) {
    render();
    return;
  }

  changeBatchActionTarget = null;
  render();
}

async function saveLoadingIllustrationSettings(form: HTMLFormElement) {
  const payload = readLoadingIllustrationPayload(new FormData(form));
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/loading-illustrations", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  await loadAssets();
  editingLoadingIllustration = assetLoadingIllustrations.find((item) => item.id === payload.illustrationId) ?? null;
  render();
}


async function saveAnnouncement(form: HTMLFormElement) {
  const payload = readAnnouncementPayload(new FormData(form));
  const isEdit = Boolean(payload.announcementId);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/announcements", {
    method: isEdit ? "PATCH" : "POST",
    body: JSON.stringify(payload),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  isAnnouncementCreateModalOpen = false;
  await loadAnnouncements();
  editingAnnouncement = isEdit ? announcements.find((item) => item.id === payload.announcementId) ?? null : null;
  render();
}

async function deleteAnnouncement(announcementId: string) {
  if (!announcementId) return;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/announcements", {
    method: "DELETE",
    body: JSON.stringify({ announcementId }),
  });
  if (!result.ok) {
    render();
    return;
  }

  if (editingAnnouncement?.id === announcementId) editingAnnouncement = null;
  await loadAnnouncements();
  render();
}

async function refreshPlayerUsers() {
  messageText = "";
  errorText = "";
  selectedPlayerUserDetail = null;
  isPlayerUserHistoryModalOpen = false;
  playerUserStatusAction = null;
  await loadPlayerUsers();
  render();
}

async function openPlayerUserDetail(userId: string) {
  if (!userId) return;
  isLoading = true;
  messageText = "";
  errorText = "";
  render();

  const result = await fetchAdminJson(`/api/admin/player-users/${encodeURIComponent(userId)}`);

  isLoading = false;
  if (!result.ok || !result.playerUserDetail) {
    render();
    return;
  }

  currentUser = result.currentUser ?? currentUser;
  selectedPlayerUserDetail = result.playerUserDetail;
  isPlayerUserHistoryModalOpen = false;
  playerUserStatusAction = null;
  render();
}

async function updatePlayerUserStatus(form: HTMLFormElement) {
  if (!selectedPlayerUserDetail) return;
  const data = new FormData(form);
  const action = readFormString(data, "playerUserStatusAction");
  const reason = readFormString(data, "playerUserStatusReason");
  if (action !== "suspend" && action !== "unsuspend") return;

  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson(`/api/admin/player-users/${encodeURIComponent(selectedPlayerUserDetail.user.userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ action, reason }),
  });

  isLoading = false;
  if (!result.ok || !result.playerUserDetail) {
    render();
    return;
  }

  currentUser = result.currentUser ?? currentUser;
  selectedPlayerUserDetail = result.playerUserDetail;
  playerUserStatusAction = null;
  await loadPlayerUsers();
  render();
}

async function loginAdmin(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: readFormString(data, "adminLoginEmail"),
      password: readFormString(data, "adminLoginPassword"),
    }),
  });

  isLoading = false;
  if (!result.ok || !result.currentUser) {
    render();
    return;
  }

  currentUser = result.currentUser;
  await loadAdminData();
  render();
}

async function logoutAdmin() {
  messageText = "";
  errorText = "";
  await fetchAdminJson("/api/admin/auth/logout", { method: "POST" }, { suppressError: true });
  currentUser = null;
  titles = [];
  icons = [];
  users = [];
  isAdminCreateModalOpen = false;
  adminNameTargetAdminId = null;
  adminRoleTargetAdminId = null;
  passwordTargetAdminId = null;
  playerUsers = [];
  playerUserPagination = { page: 1, pageSize: ADMIN_LIST_PAGE_SIZE, total: 0, totalPages: 1, hasPrevious: false, hasNext: false };
  playerUserQuery = "";
  playerUserSearchInput = "";
  selectedPlayerUserDetail = null;
  isPlayerUserHistoryModalOpen = false;
  playerUserStatusAction = null;
  announcements = [];
  assetIcons = [];
  assetLoadingIllustrations = [];
  changeBatches = [];
  iconDeleteTargetId = null;
  changeBatchActionTarget = null;
  render();
}

async function createAdminUser(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/users", {
    method: "POST",
    body: JSON.stringify({
      displayName: readFormString(data, "adminCreateDisplayName"),
      email: readFormString(data, "adminCreateEmail"),
      role: readFormString(data, "adminCreateRole"),
    }),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  form.reset();
  isAdminCreateModalOpen = false;
  await loadUsers();
  render();
}

async function updateAdminName(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/users", {
    method: "PATCH",
    body: JSON.stringify({
      action: "update_display_name",
      adminId: readFormString(data, "adminId"),
      displayName: readFormString(data, "adminDisplayName"),
    }),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  adminNameTargetAdminId = null;
  await Promise.all([loadAdminMe(), loadUsers()]);
  render();
}

async function updateAdminRole(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/users", {
    method: "PATCH",
    body: JSON.stringify({
      action: "update_role",
      adminId: readFormString(data, "adminId"),
      role: readFormString(data, "adminRole"),
    }),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  adminRoleTargetAdminId = null;
  await loadUsers();
  render();
}

async function updateAdminStatus(adminId: string, status: string) {
  if (!adminId || (status !== "active" && status !== "disabled")) return;
  const label = status === "active" ? "有効化" : "無効化";
  if (!window.confirm(`この管理者を${label}しますか？`)) return;

  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/users", {
    method: "PATCH",
    body: JSON.stringify({
      action: "update_status",
      adminId,
      status,
    }),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  await loadUsers();
  render();
}

async function deleteAdminUser(adminId: string) {
  if (!adminId) return;
  const target = users.find((user) => user.userId === adminId);
  const targetName = target ? formatAdminIdentity(target) : "この管理者";
  if (!window.confirm(`${targetName}を削除します。削除後は一覧に表示されず、ログインできなくなります。よろしいですか？`)) return;

  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/users", {
    method: "PATCH",
    body: JSON.stringify({
      action: "delete_admin",
      adminId,
    }),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  await loadUsers();
  render();
}

async function changeAdminPassword(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/auth/password", {
    method: "PATCH",
    body: JSON.stringify({
      targetAdminId: readFormString(data, "targetAdminId"),
      currentPassword: readFormString(data, "currentPassword"),
      newPassword: readFormString(data, "newPassword"),
      confirmPassword: readFormString(data, "confirmPassword"),
    }),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  form.reset();
  passwordTargetAdminId = null;
  await Promise.all([loadAdminMe(), loadUsers()]);
  render();
}


function validateTitleConditionForm(form: HTMLFormElement) {
  const mode = getFormControlValue(form, "conditionInputMode");
  const conditionType = getFormControlValue(form, "conditionType");
  const conditionParamsJsonText = getFormControlValue(form, "conditionParamsJson");
  const conditionBuilderJsonText = getFormControlValue(form, "conditionBuilderJson");
  if (!conditionType) return "未実装または未対応の条件は保存できません。";
  if (!isAllowedTitleConditionType(conditionType)) return "未対応の condition_type は保存できません。";
  const conditionParams = parseJson(conditionParamsJsonText) ?? {};
  const validation = validateConditionParamsForAdmin(conditionType, conditionParams);
  if (!validation.ok) return validation.message;
  const builder = parseJson(conditionBuilderJsonText);
  if (!builder || !isRecord(builder)) return "condition_builder_json を生成できませんでした。";
  if (mode === "builder") {
    const template = getTitleConditionTemplate(getFormControlValue(form, "titleConditionTemplate"));
    if (!template.implemented) return "未実装の条件は保存できません。";
    if (getFormControlValue(form, "titleConditionGameMode") === "hidden") return "HIDDENモード条件は未実装のため保存できません。";
  }
  return "";
}

function isAllowedTitleConditionType(value: string) {
  return value === "initial_grant"
    || value === "stat_count_at_least"
    || value === "stat_value_at_least"
    || value === "stat_value_at_most"
    || value === "stat_flag_true"
    || value === "stat_json_contains_all"
    || value === "stat_json_contains_key"
    || value === "stat_json_value_at_least"
    || value === "stat_json_value_at_most"
    || value === "card_sequence_match"
    || value === "hand_sequence_match"
    || value === "table_all_suit_match"
    || value === "participant_icon_composition_match"
    || value === "match_count_compare"
    || value === "match_achievement_key"
    || value === "all_conditions"
    || value === "any_condition";
}

function validateConditionParamsForAdmin(conditionType: string, params: unknown): { ok: true } | { ok: false; message: string } {
  if (conditionType === "initial_grant") return { ok: true };
  if (conditionType === "all_conditions" || conditionType === "any_condition") {
    if (!isRecord(params) || !Array.isArray(params.conditions) || params.conditions.length === 0) return { ok: false, message: "複合条件には conditions が必要です。" };
    for (const condition of params.conditions) {
      if (!isRecord(condition)) return { ok: false, message: "conditions の形式を確認してください。" };
      const nestedType = typeof condition.condition_type === "string" ? condition.condition_type : "";
      if (nestedType === "initial_grant") return { ok: false, message: "初期所持称号は複合条件に含められません。" };
      const nestedParams = condition.condition_params_json ?? {};
      const nestedValidation = validateConditionParamsForAdmin(nestedType, nestedParams);
      if (!nestedValidation.ok) return nestedValidation;
    }
    return { ok: true };
  }
  if (conditionType === "match_count_compare") {
    if (!isRecord(params)) return { ok: false, message: "condition_params_json の形式を確認してください。" };
    const scope = typeof params.scope === "string" ? params.scope : "";
    const actor = readTitleConditionMatchCountCompareActor(params.actor);
    const leftMetric = readTitleConditionMatchCountCompareMetric(params.leftMetric);
    const compareOperator = readTitleConditionMatchCountCompareOperator(params.operator);
    const rightType = params.rightType === "metric" ? "metric" : params.rightType === "value" ? "value" : "";
    if (scope !== "match") return { ok: false, message: "1試合内の回数比較はmatch scopeのみ保存できます。" };
    if (params.actor !== actor) return { ok: false, message: "カウント対象を確認してください。" };
    if (params.leftMetric !== leftMetric) return { ok: false, message: "比較元を確認してください。" };
    if (params.operator !== compareOperator) return { ok: false, message: "比較条件を確認してください。" };
    if (!rightType) return { ok: false, message: "比較先を確認してください。" };
    if (rightType === "metric") {
      const rightMetric = readTitleConditionMatchCountCompareMetric(params.rightMetric);
      if (params.rightMetric !== rightMetric) return { ok: false, message: "比較先を確認してください。" };
      if (rightMetric === leftMetric) return { ok: false, message: "比較元と比較先には異なる回数項目を指定してください。" };
    } else {
      const value = Number(params.value);
      if (!Number.isInteger(value) || value < 0) return { ok: false, message: "値は0以上の整数で入力してください。" };
    }
    return { ok: true };
  }
  if (conditionType === "stat_count_at_least" || conditionType === "stat_value_at_least" || conditionType === "stat_value_at_most" || conditionType === "stat_flag_true" || conditionType === "stat_json_contains_all" || conditionType === "stat_json_contains_key" || conditionType === "stat_json_value_at_least" || conditionType === "stat_json_value_at_most") {
    if (!isRecord(params)) return { ok: false, message: "condition_params_json の形式を確認してください。" };
    const scope = typeof params.scope === "string" ? params.scope : "";
    const statKey = typeof params.statKey === "string" ? params.statKey : "";
    if (!isAllowedTitleConditionScope(scope)) return { ok: false, message: "未対応のscopeは保存できません。" };
    if (!isAllowedTitleConditionStatKeyForScope(scope, statKey)) return { ok: false, message: "未実装metricは保存できません。" };
    if (conditionType === "stat_json_value_at_least" || conditionType === "stat_json_value_at_most") {
      const key = typeof params.key === "string" ? params.key.trim() : "";
      if (!key) return { ok: false, message: "対象IDを指定してください。" };
      const value = Number(params.value);
      if (!Number.isFinite(value) || value < 0) return { ok: false, message: "値は0以上の数値で入力してください。" };
    } else if (conditionType !== "stat_flag_true" && conditionType !== "stat_json_contains_key" && conditionType !== "stat_json_contains_all") {
      const value = Number(params.value);
      if (!Number.isFinite(value) || value < 0) return { ok: false, message: "値は0以上の数値で入力してください。" };
    }
    return { ok: true };
  }
  if (conditionType === "card_sequence_match") {
    if (!isRecord(params)) return { ok: false, message: "condition_params_json の形式を確認してください。" };
    const scope = typeof params.scope === "string" ? params.scope : "";
    const statKey = typeof params.statKey === "string" ? params.statKey : "";
    const rule = typeof params.rule === "string" ? params.rule : "";
    if (scope !== "match") return { ok: false, message: "カード順条件はmatch scopeのみ保存できます。" };
    if (!isCardSequenceStatKey(statKey)) return { ok: false, message: "未実装metricは保存できません。" };
    if (rule !== "ordered_contains" && rule !== "contiguous_contains" && rule !== "contiguous_unordered" && rule !== "exact") return { ok: false, message: "カード順ルールを確認してください。" };
    if (!Array.isArray(params.values) && !Array.isArray(params.cards)) return { ok: false, message: "カード条件を1件以上指定してください。" };
    if (Array.isArray(params.cards)) {
      const validation = validateTitleConditionSequenceCards(params.cards);
      if (!validation.ok) return validation;
    }
    return { ok: true };
  }
  if (conditionType === "hand_sequence_match") {
    if (!isRecord(params)) return { ok: false, message: "condition_params_json の形式を確認してください。" };
    const scope = typeof params.scope === "string" ? params.scope : "";
    const statKey = typeof params.statKey === "string" ? params.statKey : "";
    const rule = typeof params.rule === "string" ? params.rule : "exact";
    if (scope !== "match") return { ok: false, message: "手札条件はmatch scopeのみ保存できます。" };
    if (!isHandSequenceStatKey(statKey)) return { ok: false, message: "未実装metricは保存できません。" };
    if (rule === "same_rank" || rule === "same_suit") {
      if (rule === "same_suit" && (!Array.isArray(params.suits) || params.suits.length === 0)) return { ok: false, message: "4枚全てのスートを指定してください。" };
      return { ok: true };
    }
    if (rule !== "exact" && rule !== "unordered") return { ok: false, message: "手札の判定方法を確認してください。" };
    const cards = Array.isArray(params.cards) ? params.cards : [];
    if (rule === "exact" && cards.length !== 4) return { ok: false, message: "順番まで一致ではカード1〜4を指定してください。" };
    if (rule === "unordered" && (cards.length === 0 || cards.length > 4)) return { ok: false, message: "順番は問わないではカード条件を1〜4件指定してください。" };
    return { ok: true };
  }
  if (conditionType === "participant_icon_composition_match") {
    if (!isRecord(params)) return { ok: false, message: "condition_params_json の形式を確認してください。" };
    const scope = typeof params.scope === "string" ? params.scope : "";
    const specMode = typeof params.specMode === "string" ? params.specMode : "";
    const order = typeof params.order === "string" ? params.order : "";
    if (scope !== "match") return { ok: false, message: "参加者アイコン構成条件はmatch scopeのみ保存できます。" };
    if (specMode !== "icon" && specMode !== "icon_type") return { ok: false, message: "指定条件を確認してください。" };
    if (order !== "unordered" && order !== "turn_order") return { ok: false, message: "各手番の並び順を確認してください。" };
    const slots = Array.isArray(params.slots) ? params.slots : [];
    if (slots.length !== TITLE_CONDITION_PARTICIPANT_SLOT_COUNT) return { ok: false, message: "手番1〜4の条件を指定してください。" };
    let selfCount = 0;
    for (const slot of slots) {
      if (!isRecord(slot)) return { ok: false, message: "手番条件の形式を確認してください。" };
      const relation = readTitleConditionParticipantRelation(slot.relation);
      const iconId = normalizeTitleConditionParticipantIconId(slot.iconId);
      const iconTypeId = normalizeTitleConditionParticipantIconTypeId(slot.iconTypeId);
      if (relation === "self") selfCount += 1;
      if (relation === "npc" && iconId !== TITLE_CONDITION_NPC_ICON_ID) return { ok: false, message: "NPCのアイコン条件を確認してください。" };
      if (relation === "npc" && iconTypeId !== "any") return { ok: false, message: "NPCにはアイコン種別を指定できません。" };
      if (relation !== "npc" && iconId !== "any" && iconId === TITLE_CONDITION_NPC_ICON_ID) return { ok: false, message: "NPC固定アイコンはNPC行でのみ指定できます。" };
    }
    if (selfCount !== 1) return { ok: false, message: "「自分」は手番1〜4のうち必ず1つだけ選択してください。" };
    return { ok: true };
  }
  if (conditionType === "match_achievement_key") return { ok: false, message: "match_achievement_key はPhase16Bでは保存できません。" };
  return { ok: false, message: "未対応の condition_type は保存できません。" };
}

function isAllowedTitleConditionScope(value: string) {
  return value === "solo" || value === "multi" || value === "total" || value === "global" || value === "match";
}

function validateTitleConditionSequenceCards(cards: unknown[]): { ok: true } | { ok: false; message: string } {
  if (cards.length === 0 || cards.length > TITLE_CONDITION_CARD_SLOT_COUNT) return { ok: false, message: "カード条件は1〜14件で指定してください。" };
  for (const item of cards) {
    if (!isRecord(item)) return { ok: false, message: "カード条件の形式を確認してください。" };
    const rank = typeof item.rank === "string" ? item.rank.trim().toUpperCase() : "";
    if (!TITLE_CONDITION_CARD_SEQUENCE_RANKS.includes(rank)) return { ok: false, message: "カード条件のランクを確認してください。" };
    const rawSuits = Array.isArray(item.suits) ? item.suits : [item.suit];
    if (rawSuits.some((value) => typeof value === "string" && value.trim() && value.trim().toLowerCase() !== "any" && !TITLE_CONDITION_CARD_SUITS.includes(value.trim().toUpperCase()))) {
      return { ok: false, message: "カード条件のスートを確認してください。" };
    }
    const suits = normalizeTitleConditionSuitList(rawSuits);
    if (suits.length > 4) return { ok: false, message: "カード条件のスートを確認してください。" };
    if (rank === "JOKER" && suits.length > 0) return { ok: false, message: "JOKERにはスートを指定できません。" };
    if (rank === "ANY" && suits.length === 0) return { ok: false, message: "ランクまたはスートを指定してください。" };
  }
  return { ok: true };
}

function isCardSequenceStatKey(value: string) {
  return value === "self_play_rank_sequence_json"
    || value === "self_play_card_sequence_json"
    || value === "table_play_rank_sequence_json"
    || value === "table_play_card_sequence_json"
    || value === "table_play_actor_card_sequence_json";
}

function isHandSequenceStatKey(value: string) {
  return isInitialHandSequenceStatKey(value)
    || value === "hand_sequence_signatures_json"
    || value === "hand_next_1_sequence_signatures_json"
    || value === "hand_next_2_sequence_signatures_json"
    || value === "hand_next_3_sequence_signatures_json";
}

function isInitialHandSequenceStatKey(value: string) {
  return value === "initial_hand_card_sequence_json" || value === "initial_hand_next_1_sequence_json" || value === "initial_hand_next_2_sequence_json" || value === "initial_hand_next_3_sequence_json";
}

function readUnknownStringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readTitleConditionPlayStyle(value: unknown): TitleConditionPlayStyle {
  if (value === "solo" || value === "multi") return value;
  return "any";
}

function readTitleConditionGameMode(value: unknown): TitleConditionGameMode {
  if (value === "normal" || value === "hidden") return value;
  return "any";
}

function readTitleConditionDifficulty(value: unknown): TitleConditionDifficulty {
  if (value === "casual" || value === "smart") return value;
  return "any";
}

function getTitleConditionDifficultyOption(value: TitleConditionDifficulty) {
  return TITLE_CONDITION_DIFFICULTIES.find((item) => item.value === value) ?? TITLE_CONDITION_DIFFICULTIES[0];
}

function readTitleConditionGameType(value: unknown): TitleConditionGameType {
  if (value === "100" || value === "200" || value === "300" || value === "400" || value === "500" || value === "extra") return value;
  return "any";
}

function getTitleConditionGameTypeOption(value: TitleConditionGameType) {
  return TITLE_CONDITION_GAME_TYPES.find((item) => item.value === value) ?? TITLE_CONDITION_GAME_TYPES[0];
}

function readTitleConditionCardPlaySource(value: unknown): TitleConditionCardPlaySource {
  if (value === "deck" || value === "hand") return value;
  return "all";
}

function readTitleConditionCardPlayActor(value: unknown): TitleConditionCardPlayActor {
  if (value === "previous" || value === "all") return value;
  return "self";
}

function readTitleConditionCardPlayGroup(value: unknown, template: TitleConditionTemplate): TitleConditionCardPlayGroup {
  if (template.id !== "specific_card_play_count") return "all";
  if (value === "number" || value === "jack" || value === "queen" || value === "king" || value === "joker") return value;
  return "ace";
}

function readTitleConditionCardRule(value: unknown): TitleConditionCardRule {
  if (value === "contains_any" || value === "ordered_contains" || value === "contiguous_contains" || value === "contiguous_unordered" || value === "exact" || value === "unordered" || value === "same_rank" || value === "same_suit") return value;
  return "contains_all";
}

function readTitleConditionAllSuitRule(value: unknown): TitleConditionAllSuitRule {
  if (value === "exact_count_minus_1" || value === "exact_count_minus_2" || value === "exact_count_minus_3") return value;
  return "exact";
}


function syncTitleConditionParticipantControls(form: HTMLFormElement, template: TitleConditionTemplate) {
  const area = form.querySelector<HTMLElement>("[data-title-condition-participant-area]");
  if (area) area.hidden = template.kind !== "participant_icon_composition";
  syncTitleConditionParticipantIconRows(form);
}

function syncTitleConditionParticipantSelfSelection(form: HTMLFormElement, changed: HTMLSelectElement) {
  if (changed.value !== "self") return;
  form.querySelectorAll<HTMLSelectElement>("[name^='titleConditionParticipantRelation']").forEach((element) => {
    if (element === changed || element.value !== "self") return;
    element.value = "any";
    const index = readParticipantSlotIndexFromName(element.name, "titleConditionParticipantRelation");
    const icon = index == null ? null : form.querySelector<HTMLSelectElement>(`[name='titleConditionParticipantIcon${index}']`);
    const iconType = index == null ? null : form.querySelector<HTMLSelectElement>(`[name='titleConditionParticipantIconType${index}']`);
    if (icon) icon.value = "any";
    if (iconType) iconType.value = "any";
  });
}

function syncTitleConditionParticipantIconRows(form: HTMLFormElement) {
  const specMode = readTitleConditionParticipantSpecMode(getFormControlValue(form, "titleConditionParticipantSpecMode"));
  for (let index = 0; index < TITLE_CONDITION_PARTICIPANT_SLOT_COUNT; index += 1) {
    const relation = form.querySelector<HTMLSelectElement>(`[name='titleConditionParticipantRelation${index}']`);
    const icon = form.querySelector<HTMLSelectElement>(`[name='titleConditionParticipantIcon${index}']`);
    const iconType = form.querySelector<HTMLSelectElement>(`[name='titleConditionParticipantIconType${index}']`);
    const slot = relation?.closest<HTMLElement>(".adminConditionParticipantSlot") ?? icon?.closest<HTMLElement>(".adminConditionParticipantSlot") ?? iconType?.closest<HTMLElement>(".adminConditionParticipantSlot");
    const isNpc = relation?.value === "npc";
    if (icon) {
      if (isNpc) icon.value = TITLE_CONDITION_NPC_ICON_ID;
      else if (icon.value === TITLE_CONDITION_NPC_ICON_ID) icon.value = "any";
      if (relation && relation.value !== "self" && icon.value !== "any" && icon.value !== TITLE_CONDITION_NPC_ICON_ID) {
        relation.value = "other";
      }
      icon.disabled = isNpc || specMode === "icon_type";
      icon.hidden = specMode === "icon_type";
    }
    if (iconType) {
      if (isNpc) iconType.value = "any";
      if (relation && relation.value !== "self" && iconType.value !== "any") {
        relation.value = "other";
      }
      iconType.disabled = isNpc || specMode === "icon";
      iconType.hidden = specMode === "icon";
    }
    slot?.classList.toggle("is-npc", Boolean(isNpc));
  }
}

function readParticipantSlotIndexFromName(name: string, prefix: string) {
  const value = Number(name.slice(prefix.length));
  return Number.isSafeInteger(value) && value >= 0 && value < TITLE_CONDITION_PARTICIPANT_SLOT_COUNT ? value : null;
}

function readTitleConditionParticipantSlotsFromForm(form: HTMLFormElement): TitleConditionParticipantSlotInput[] {
  const slots: TitleConditionParticipantSlotInput[] = [];
  for (let index = 0; index < TITLE_CONDITION_PARTICIPANT_SLOT_COUNT; index += 1) {
    const relation = readTitleConditionParticipantRelation(getFormControlValue(form, `titleConditionParticipantRelation${index}`));
    const iconId = relation === "npc" ? TITLE_CONDITION_NPC_ICON_ID : normalizeTitleConditionParticipantIconId(getFormControlValue(form, `titleConditionParticipantIcon${index}`));
    const iconTypeId = relation === "npc" ? "any" : normalizeTitleConditionParticipantIconTypeId(getFormControlValue(form, `titleConditionParticipantIconType${index}`));
    slots.push({ relation, iconId, iconTypeId });
  }
  return normalizeTitleConditionParticipantSlots(slots);
}

function readTitleConditionBuilderParticipantSlots(value: unknown): TitleConditionParticipantSlotInput[] {
  if (!Array.isArray(value)) return createDefaultTitleConditionParticipantSlots();
  return normalizeTitleConditionParticipantSlots(value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return { relation: "any", iconId: "any", iconTypeId: "any" };
    const record = item as Record<string, unknown>;
    return {
      relation: readTitleConditionParticipantRelation(record.relation),
      iconId: normalizeTitleConditionParticipantIconId(record.iconId),
      iconTypeId: normalizeTitleConditionParticipantIconTypeId(record.iconTypeId),
    };
  }));
}

function normalizeTitleConditionParticipantSlots(value: unknown): TitleConditionParticipantSlotInput[] {
  const source = Array.isArray(value) ? value : [];
  const slots: TitleConditionParticipantSlotInput[] = [];
  for (let index = 0; index < TITLE_CONDITION_PARTICIPANT_SLOT_COUNT; index += 1) {
    const item = source[index];
    const record = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
    const relation = readTitleConditionParticipantRelation(record.relation);
    const iconId = relation === "npc" ? TITLE_CONDITION_NPC_ICON_ID : normalizeTitleConditionParticipantIconId(record.iconId);
    const iconTypeId = relation === "npc" ? "any" : normalizeTitleConditionParticipantIconTypeId(record.iconTypeId);
    slots.push({ relation, iconId, iconTypeId });
  }
  const selfCount = slots.filter((slot) => slot.relation === "self").length;
  return selfCount === 0 && source.length === 0 ? createDefaultTitleConditionParticipantSlots() : slots;
}

function createDefaultTitleConditionParticipantSlots(): TitleConditionParticipantSlotInput[] {
  return Array.from({ length: TITLE_CONDITION_PARTICIPANT_SLOT_COUNT }, (_, index) => ({ relation: index === 0 ? "self" : "any", iconId: "any", iconTypeId: "any" }));
}

function isValidTitleConditionParticipantSlot(slot: TitleConditionParticipantSlotInput, specMode: TitleConditionParticipantSpecMode) {
  if (slot.relation === "npc") return slot.iconId === TITLE_CONDITION_NPC_ICON_ID && normalizeTitleConditionParticipantIconTypeId(slot.iconTypeId) === "any";
  if (specMode === "icon_type") {
    const iconTypeId = normalizeTitleConditionParticipantIconTypeId(slot.iconTypeId);
    if (iconTypeId === "any") return true;
    return iconTypes.some((item) => item.id === iconTypeId && item.isActive);
  }
  if (slot.iconId === "any") return true;
  return icons.some((icon) => icon.id === slot.iconId && !hasPendingIconDelete(icon.id));
}

function readTitleConditionParticipantSpecMode(value: unknown): TitleConditionParticipantSpecMode {
  return value === "icon_type" ? "icon_type" : "icon";
}

function readTitleConditionParticipantOrder(value: unknown): TitleConditionParticipantOrder {
  return value === "turn_order" ? "turn_order" : "unordered";
}

function readTitleConditionParticipantRelation(value: unknown): TitleConditionParticipantRelation {
  if (value === "self" || value === "other" || value === "npc") return value;
  return "any";
}

function normalizeTitleConditionParticipantIconId(value: unknown) {
  if (typeof value !== "string") return "any";
  const normalized = value.trim();
  return normalized || "any";
}

function normalizeTitleConditionParticipantIconTypeId(value: unknown) {
  if (typeof value !== "string") return "any";
  const normalized = value.trim();
  return normalized || "any";
}

function syncTitleConditionAssetControls(form: HTMLFormElement, template: TitleConditionTemplate, preview: TitleConditionPreviewInput & TitleConditionPreview) {
  const area = form.querySelector<HTMLElement>("[data-title-condition-asset-area]");
  if (area) area.hidden = template.kind !== "asset_count";

  const assetType = resolveTitleConditionAssetType(template, preview.assetType);
  const assetTypeSelect = form.querySelector<HTMLSelectElement>("#titleConditionAssetType");
  if (assetTypeSelect) assetTypeSelect.value = assetType;
  form.querySelector<HTMLElement>("[data-title-condition-asset-kind-field]")?.toggleAttribute("hidden", template.id !== "asset_usage_count");

  form.querySelectorAll<HTMLElement>("[data-title-condition-asset-type]").forEach((element) => {
    element.hidden = template.kind !== "asset_count" || element.dataset.titleConditionAssetType !== assetType;
  });

  const note = form.querySelector<HTMLElement>("[data-title-condition-asset-note]");
  if (note) note.textContent = assetType === "loading_illustration"
    ? "指定なしの場合は、ロード画面に何らかのロードイラストが表示された総回数を条件にします。"
    : "指定なしの場合は、何らかのアイコンを設定した状態でゲームを開始した総回数を条件にします。";
}

function readTitleConditionAssetTargetIdFromForm(form: HTMLFormElement, template: TitleConditionTemplate) {
  const assetType = resolveTitleConditionAssetType(template, getFormControlValue(form, "titleConditionAssetType"));
  if (assetType === "loading_illustration") return normalizeTitleConditionAssetTargetId(getFormControlValue(form, "titleConditionIllustrationTargetId"));
  return normalizeTitleConditionAssetTargetId(getFormControlValue(form, "titleConditionIconTargetId"));
}

function normalizeTitleConditionAssetTargetId(value: unknown) {
  if (typeof value !== "string") return "any";
  const normalized = value.trim();
  return normalized || "any";
}

function readTitleConditionAssetType(value: unknown): TitleConditionAssetType {
  return value === "icon" ? "icon" : "loading_illustration";
}

function resolveTitleConditionAssetType(template: TitleConditionTemplate, value: unknown): TitleConditionAssetType {
  return template.assetType ?? readTitleConditionAssetType(value);
}

function getTitleConditionAssetMetricKeys(template: TitleConditionTemplate, assetType: TitleConditionAssetType) {
  if (template.statKey && template.jsonStatKey) return { statKey: template.statKey, jsonStatKey: template.jsonStatKey };
  if (assetType === "icon") return { statKey: "icon_use_count", jsonStatKey: "icon_use_counts_json" };
  return { statKey: "loading_illustration_display_count", jsonStatKey: "loading_illustration_display_counts_json" };
}

function readTitleConditionBuilderAssetType(builder: Record<string, unknown>, template: TitleConditionTemplate): TitleConditionAssetType {
  return resolveTitleConditionAssetType(template, builder.assetType);
}

function readTitleConditionBuilderAssetTargetId(builder: Record<string, unknown>) {
  return normalizeTitleConditionAssetTargetId(builder.assetTargetId ?? builder.illustrationId ?? builder.iconId);
}

function readTitleConditionCardsFromForm(form: HTMLFormElement): TitleConditionCardInput[] {
  const allSuitInputs = Array.from(form.querySelectorAll<HTMLInputElement>("[name='titleConditionAllSuit']:checked"));
  if (allSuitInputs.length > 0) return normalizeTitleConditionSuitList(allSuitInputs.map((input) => input.value)).map((suit) => ({ rank: "any", suit }));

  const cards: TitleConditionCardInput[] = [];
  for (let index = 0; index < TITLE_CONDITION_CARD_SLOT_COUNT; index += 1) {
    const suitListInput = form.querySelector<HTMLInputElement>(`[name='titleConditionCardSuits${index}']`);
    const suits = suitListInput ? readTitleConditionSuitSelectionValue(suitListInput.value) : [];
    const suit = suits.length === 1 ? suits[0] ?? "any" : normalizeTitleConditionSuit(getFormControlValue(form, `titleConditionCardSuit${index}`));
    cards.push({
      rank: normalizeTitleConditionRank(getFormControlValue(form, `titleConditionCardRank${index}`)),
      suit,
      ...(suitListInput ? { suits } : {}),
      actor: readTitleConditionCardActor(getFormControlValue(form, `titleConditionCardActor${index}`)),
    });
  }
  return cards;
}

function readTitleConditionBuilderCards(value: unknown, suitValue?: unknown, suitsValue?: unknown): TitleConditionCardInput[] {
  if (!Array.isArray(value)) {
    const suits = Array.isArray(suitsValue) ? normalizeTitleConditionSuitList(suitsValue) : normalizeTitleConditionSuitList([suitValue]);
    return suits.map((suit) => ({ rank: "any", suit }));
  }
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return { rank: "any", suit: "any" };
    const record = item as Record<string, unknown>;
    const suits = normalizeTitleConditionSuitList(Array.isArray(record.suits) ? record.suits : [record.suit]);
    return {
      rank: normalizeTitleConditionRank(record.rank),
      suit: suits.length === 1 ? suits[0] ?? "any" : "any",
      ...(Array.isArray(record.suits) ? { suits } : {}),
      actor: readTitleConditionCardActor(record.actor),
    };
  }).slice(0, TITLE_CONDITION_CARD_SLOT_COUNT);
}

function readTitleConditionSuitSelectionValue(value: unknown) {
  if (typeof value !== "string") return [];
  return normalizeTitleConditionSuitList(value.split(","));
}

function normalizeTitleConditionRank(value: unknown) {
  if (typeof value !== "string") return "any";
  const rank = value.trim().toUpperCase();
  return TITLE_CONDITION_CARD_SEQUENCE_RANKS.includes(rank) ? rank : "any";
}

function readTitleConditionCardActor(value: unknown): TitleConditionCardActor {
  if (value === "self" || value === "not_self" || value === "other" || value === "npc") return value;
  return "any";
}

function normalizeTitleConditionSuit(value: unknown) {
  if (typeof value !== "string") return "any";
  const suit = value.trim().toUpperCase();
  return TITLE_CONDITION_CARD_SUITS.includes(suit) ? suit : "any";
}

function normalizeTitleConditionSuitList(values: readonly unknown[]) {
  const suits: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const suit = normalizeTitleConditionSuit(value);
    if (suit === "any" || seen.has(suit)) continue;

    seen.add(suit);
    suits.push(suit);
  }
  return suits;
}


function readTitleConditionLoseCertainRole(value: unknown): TitleConditionLoseCertainRole {
  if (value === "target" || value === "witness") return value;
  return "creator";
}

function readTitleConditionLoseCertainAction(value: unknown, role: TitleConditionLoseCertainRole): TitleConditionLoseCertainAction {
  const options = getTitleConditionLoseCertainActionOptions(role).map((option) => option.value);
  return options.includes(value as TitleConditionLoseCertainAction) ? value as TitleConditionLoseCertainAction : "any";
}

function getTitleConditionLoseCertainActionOptions(role: TitleConditionLoseCertainRole): Array<{ value: TitleConditionLoseCertainAction; label: string }> {
  if (role === "creator") {
    return [
      { value: "any", label: "指定なし" },
      { value: "self_exit", label: "自分が退出" },
      { value: "target_exit", label: "対象者が退出" },
      { value: "target_spade3", label: "対象者が♠3返し" },
      { value: "target_dead", label: "対象者がDEAD" },
    ];
  }
  if (role === "target") {
    return [
      { value: "any", label: "指定なし" },
      { value: "self_exit", label: "自分が退出" },
      { value: "creator_exit", label: "作成者が退出" },
      { value: "target_spade3", label: "自分が♠3返し" },
      { value: "target_dead", label: "自分がDEAD" },
    ];
  }
  return [
    { value: "any", label: "指定なし" },
    { value: "creator_exit", label: "負け確を作った参加者が退出" },
    { value: "target_exit", label: "負け確にされた参加者が退出" },
    { value: "target_spade3", label: "対象者が♠3返し" },
    { value: "target_dead", label: "対象者がDEAD" },
  ];
}

function toTitleConditionLoseCertainEventKey(role: TitleConditionLoseCertainRole, action: TitleConditionLoseCertainAction) {
  if (role === "target" && action === "target_spade3") return "target:self_spade3";
  if (role === "target" && action === "target_dead") return "target:self_dead";
  return `${role}:${action}`;
}

function titleConditionRankLabel(rank: string) {
  if (rank === "any") return "指定なし";
  if (rank === "JQK") return "J/Q/K（11/12/13）";
  return rank;
}

function titleConditionSuitLabel(suit: string) {
  if (suit === "S") return "♠";
  if (suit === "H") return "♥";
  if (suit === "D") return "♦";
  if (suit === "C") return "♣";
  return "指定なし";
}

function readTitleConditionNgName(value: unknown) {
  const normalized = String(value ?? "").trim();
  if (normalized && TITLE_CONDITION_NG_NAME_OPTIONS.includes(normalized)) return normalized;
  return TITLE_CONDITION_DEFAULT_NG_NAME;
}


function readTitleConditionExperienceDetail(value: unknown): TitleConditionExperienceDetail {
  if (value === "alive" || value === "alive_total") return "alive";
  if (value === "dead" || value === "dead_total") return "dead";
  if (value === "normal_finish" || value === "normal_finish_total") return "normal_finish";
  if (value === "void_match" || value === "void_match_total") return "void_match";
  if (value === "redeal" || value === "redeal_total" || value === "redeal_in_match") return "redeal";
  if (value === "timeout_deck_play" || value === "timeout_deck_play_total" || value === "timeout_deck_play_in_match") return "timeout_deck_play";
  if (value === "timeout_only_finish") return "timeout_only_finish";
  return TITLE_CONDITION_DEFAULT_EXPERIENCE_DETAIL;
}

function readTitleConditionExperienceUnit(value: unknown, legacyDetail?: unknown): TitleConditionExperienceUnit {
  if (legacyDetail === "redeal_in_match" || legacyDetail === "timeout_deck_play_in_match") return "match";
  return value === "match" ? "match" : "total";
}

function readTitleConditionExperienceActor(value: unknown): TitleConditionExperienceActor {
  if (value === "any" || value === "next_1" || value === "next_2" || value === "next_3") return value;
  return "self";
}

function isTitleConditionExperienceUnitSelectable(detail: TitleConditionExperienceDetail) {
  return detail === "redeal" || detail === "timeout_deck_play";
}

function isTitleConditionExperienceActorVisible(detail: TitleConditionExperienceDetail, unit: TitleConditionExperienceUnit) {
  return detail === "timeout_only_finish" || (detail === "timeout_deck_play" && unit === "match");
}

function isTitleConditionExperienceMatchCountDetail(detail: TitleConditionExperienceDetail, unit: TitleConditionExperienceUnit) {
  return (detail === "redeal" || detail === "timeout_deck_play") && unit === "match";
}

function getTitleConditionExperienceDetailOption(value: TitleConditionExperienceDetail) {
  return TITLE_CONDITION_EXPERIENCE_DETAILS.find((item) => item.value === value) ?? TITLE_CONDITION_EXPERIENCE_DETAILS[0];
}

function getTitleConditionExperienceTimeoutMatchStatKey(actor: Exclude<TitleConditionExperienceActor, "any">) {
  if (actor === "next_1") return "timeout_next_1_deck_play_count";
  if (actor === "next_2") return "timeout_next_2_deck_play_count";
  if (actor === "next_3") return "timeout_next_3_deck_play_count";
  return "timeout_deck_play_count";
}


function readTitleConditionJokerEventDetail(value: unknown): TitleConditionJokerEventDetail {
  if (value === "my_joker_countered" || value === "joker_after_previous_joker" || value === "joker_used_match_dead" || value === "joker_bust" || value === "dead_with_joker_in_hand") return value;
  return "spade3_counter";
}

function readTitleConditionJokerEventUnit(value: unknown): TitleConditionJokerEventUnit {
  return value === "match" ? "match" : "total";
}

function normalizeTitleConditionJokerEventUnit(detail: TitleConditionJokerEventDetail, value: unknown): TitleConditionJokerEventUnit {
  return isTitleConditionJokerEventUnitSelectable(detail) ? readTitleConditionJokerEventUnit(value) : "total";
}

function readTitleConditionJokerEventActor(value: unknown): TitleConditionJokerEventActor {
  if (value === "any" || value === "next_1" || value === "next_2" || value === "next_3") return value;
  return "self";
}

function getTitleConditionJokerEventDetailOption(value: TitleConditionJokerEventDetail) {
  return TITLE_CONDITION_JOKER_EVENT_DETAILS.find((item) => item.value === value) ?? TITLE_CONDITION_JOKER_EVENT_DETAILS[0];
}

function isTitleConditionJokerEventCountDetail(detail: TitleConditionJokerEventDetail) {
  return getTitleConditionJokerEventDetailOption(detail).matchCount;
}

function isTitleConditionJokerEventUnitSelectable(detail: TitleConditionJokerEventDetail) {
  return isTitleConditionJokerEventCountDetail(detail);
}

function isTitleConditionJokerEventMatchCountDetail(detail: TitleConditionJokerEventDetail, unit: TitleConditionJokerEventUnit) {
  return unit === "match" && isTitleConditionJokerEventCountDetail(detail);
}

function toTitleConditionJokerEventMatchKey(actor: Exclude<TitleConditionJokerEventActor, "any">, detail: TitleConditionJokerEventDetail) {
  return `actor_${actor}:event_${detail}`;
}

function readTitleConditionMatchCountCompareActor(value: unknown): TitleConditionMatchCountCompareActor {
  if (value === "any" || value === "next_1" || value === "next_2" || value === "next_3") return value;
  return "self";
}

function readTitleConditionMatchCountCompareMetric(value: unknown): TitleConditionMatchCountCompareMetric {
  const normalized = typeof value === "string" ? value : "";
  return TITLE_CONDITION_MATCH_COUNT_COMPARE_METRICS.some((item) => item.value === normalized)
    ? normalized as TitleConditionMatchCountCompareMetric
    : TITLE_CONDITION_DEFAULT_MATCH_COUNT_COMPARE_LEFT_METRIC;
}

function readTitleConditionMatchCountCompareOperator(value: unknown): TitleConditionMatchCountCompareOperator {
  if (value === "gte" || value === "eq" || value === "lte" || value === "lt") return value;
  return "gt";
}

function readTitleConditionMatchCountCompareRight(value: unknown): TitleConditionMatchCountCompareRight {
  if (value === "fixed_value") return value;
  const normalized = typeof value === "string" ? value : "";
  return TITLE_CONDITION_MATCH_COUNT_COMPARE_METRICS.some((item) => item.value === normalized)
    ? normalized as TitleConditionMatchCountCompareMetric
    : TITLE_CONDITION_DEFAULT_MATCH_COUNT_COMPARE_RIGHT;
}


function readTitleConditionRematchRecord(value: unknown): TitleConditionRematchRecord {
  if (value === "alive" || value === "dead") return value;
  return "any";
}

function readTitleConditionRematchMode(value: unknown, record: TitleConditionRematchRecord): TitleConditionRematchMode {
  if (record === "any") return "total";
  if (value === "total") return "total";
  return "streak";
}

function getTitleConditionRematchStatKey(record: TitleConditionRematchRecord, mode: TitleConditionRematchMode) {
  if (record === "alive") return mode === "total" ? "rematch_session_alive_total" : "rematch_session_alive_streak";
  if (record === "dead") return mode === "total" ? "rematch_session_dead_total" : "rematch_session_dead_streak";
  return "rematch_session_total_count";
}

function readTitleConditionHostOtherLeaveStartCount(value: unknown): TitleConditionHostOtherLeaveStartCount {
  if (value === "any" || value === "2" || value === "3" || value === "4") return value;
  return TITLE_CONDITION_DEFAULT_HOST_OTHER_LEAVE_START_COUNT;
}

function readTitleConditionHostOtherLeavePattern(value: unknown): TitleConditionHostOtherLeavePattern {
  if (value === "any" || value === "same_turn_all" || value === "one_per_turn" || value === "one_per_consecutive_turn") return value;
  return TITLE_CONDITION_DEFAULT_HOST_OTHER_LEAVE_PATTERN;
}

function toTitleConditionHostOtherLeavePatternKey(startCount: TitleConditionHostOtherLeaveStartCount, pattern: TitleConditionHostOtherLeavePattern) {
  return `start_${startCount}:pattern_${pattern}`;
}

function readTitleConditionOperator(value: unknown): TitleConditionOperator {
  if (value === "<=" || value === "=") return value;
  return ">=";
}

function readTitleConditionNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, Math.floor(numberValue));
}

function readIconTypeIdsFromFormData(data: FormData) {
  return [...new Set(data.getAll("iconTypeIds")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean))].slice(0, 3);
}

function readIconPayload(data: FormData): SavePayload {
  return {
    iconId: readFormString(data, "iconId") || null,
    iconCode: readFormString(data, "iconCode"),
    iconName: readFormString(data, "iconName"),
    description: readFormString(data, "description"),
    unlockConditionText: readFormString(data, "unlockConditionText"),
    imagePath: readFormString(data, "imagePath"),
    rarity: readFormNumber(data, "rarity", 1),
    conditionType: readFormString(data, "conditionType"),
    conditionParamsJson: readFormString(data, "conditionParamsJson") || null,
    isInitial: data.has("isInitial"),
    isGuestAvailable: data.has("isGuestAvailable"),
    isDefault: data.has("isDefault"),
    isActive: data.has("isActive"),
    sortOrder: readFormNumber(data, "sortOrder", 0),
    iconTypeIds: readIconTypeIdsFromFormData(data),
  };
}

function readLoadingIllustrationPayload(data: FormData): SavePayload {
  return {
    illustrationId: readFormString(data, "illustrationId"),
    requiredTitleId: readFormString(data, "requiredTitleId"),
    appearanceMode: readFormString(data, "appearanceMode") === "manual" ? "manual" : "auto",
    manualUnviewedRate: readFormRate(data, "manualUnviewedRate", 70),
    manualViewedRate: readFormRate(data, "manualViewedRate", 30),
    isActive: data.has("isActive"),
  };
}




function readTitleDeletePayload(data: FormData): SavePayload {
  const createAnnouncement = data.has("titleDeleteCreateAnnouncement");
  return {
    changeType: "title_delete",
    titleId: readFormString(data, "titleId"),
    reason: readFormString(data, "titleDeleteReason"),
    announcement: createAnnouncement ? {
      enabled: true,
      title: readFormString(data, "titleDeleteAnnouncementTitle"),
      summary: readFormString(data, "titleDeleteAnnouncementSummary"),
      body: readFormString(data, "titleDeleteAnnouncementBody"),
      category: readAnnouncementCategory(readFormString(data, "titleDeleteAnnouncementCategory")),
      priority: readFormNumber(data, "titleDeleteAnnouncementPriority", 0),
      isActive: data.has("titleDeleteAnnouncementIsActive"),
      startsAt: readFormDateTimeIso(data, "titleDeleteAnnouncementStartsAt"),
      endsAt: readFormDateTimeIso(data, "titleDeleteAnnouncementEndsAt"),
    } : null,
  };
}

function readIconDeletePayload(data: FormData): SavePayload {
  const createAnnouncement = data.has("iconDeleteCreateAnnouncement");
  return {
    changeType: "icon_delete",
    iconId: readFormString(data, "iconId"),
    reason: readFormString(data, "iconDeleteReason"),
    announcement: createAnnouncement ? {
      enabled: true,
      title: readFormString(data, "iconDeleteAnnouncementTitle"),
      summary: readFormString(data, "iconDeleteAnnouncementSummary"),
      body: readFormString(data, "iconDeleteAnnouncementBody"),
      category: readAnnouncementCategory(readFormString(data, "iconDeleteAnnouncementCategory")),
      priority: readFormNumber(data, "iconDeleteAnnouncementPriority", 0),
      isActive: data.has("iconDeleteAnnouncementIsActive"),
      startsAt: readFormDateTimeIso(data, "iconDeleteAnnouncementStartsAt"),
      endsAt: readFormDateTimeIso(data, "iconDeleteAnnouncementEndsAt"),
    } : null,
  };
}


function readLoadingIllustrationDeletePayload(data: FormData): SavePayload {
  const createAnnouncement = data.has("loadingIllustrationDeleteCreateAnnouncement");
  return {
    changeType: "loading_illustration_delete",
    illustrationId: readFormString(data, "illustrationId"),
    reason: readFormString(data, "loadingIllustrationDeleteReason"),
    announcement: createAnnouncement ? {
      enabled: true,
      title: readFormString(data, "loadingIllustrationDeleteAnnouncementTitle"),
      summary: readFormString(data, "loadingIllustrationDeleteAnnouncementSummary"),
      body: readFormString(data, "loadingIllustrationDeleteAnnouncementBody"),
      category: readAnnouncementCategory(readFormString(data, "loadingIllustrationDeleteAnnouncementCategory")),
      priority: readFormNumber(data, "loadingIllustrationDeleteAnnouncementPriority", 0),
      isActive: data.has("loadingIllustrationDeleteAnnouncementIsActive"),
      startsAt: readFormDateTimeIso(data, "loadingIllustrationDeleteAnnouncementStartsAt"),
      endsAt: readFormDateTimeIso(data, "loadingIllustrationDeleteAnnouncementEndsAt"),
    } : null,
  };
}

function readAnnouncementPayload(data: FormData): SavePayload {
  return {
    announcementId: readFormString(data, "announcementId") || null,
    title: readFormString(data, "announcementTitle"),
    summary: readFormString(data, "announcementSummary"),
    body: readFormString(data, "announcementBody"),
    category: readAnnouncementCategory(readFormString(data, "announcementCategory")),
    priority: readFormNumber(data, "announcementPriority", 0),
    isActive: data.has("announcementIsActive"),
    startsAt: readFormDateTimeIso(data, "announcementStartsAt"),
    endsAt: readFormDateTimeIso(data, "announcementEndsAt"),
  };
}

function readAnnouncementCategory(value: string): AnnouncementCategory {
  if (value === "maintenance" || value === "bug" || value === "update" || value === "important") return value;
  return "normal";
}

function readFormDateTimeIso(data: FormData, key: string) {
  const value = readFormString(data, key);
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function readFormString(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readFormNumber(data: FormData, key: string, fallback: number) {
  const value = Number(readFormString(data, key));
  return Number.isFinite(value) ? value : fallback;
}

function readFormRate(data: FormData, key: string, fallback: number) {
  const value = Number(readFormString(data, key));
  if (!Number.isFinite(value)) return fallback;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 10000) / 10000;
}

function nextSortOrder(items: Array<{ sortOrder: number }>) {
  return items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
}


function changeBatchStatusLabel(status: ChangeBatchStatus) {
  if (status === "draft") return "未反映";
  if (status === "scheduled") return "反映予約済み";
  if (status === "applied") return "反映済み";
  if (status === "cancelled") return "キャンセル済み";
  if (status === "failed") return "反映失敗";
  return status;
}

function changeBatchStatusClass(status: ChangeBatchStatus) {
  if (status === "applied") return "is-on";
  if (status === "scheduled" || status === "draft") return "is-owner";
  if (status === "failed" || status === "cancelled") return "is-danger";
  return "";
}

function changeTypeLabel(value: string) {
  if (value === "icon_delete") return "アイコン削除";
  if (value === "icon_replace") return "アイコン差し替え";
  if (value === "loading_illustration_delete") return "ロードイラスト削除";
  if (value === "loading_illustration_replace") return "ロードイラスト差し替え";
  if (value === "title_create") return "称号追加";
  if (value === "title_update") return "称号編集";
  if (value === "title_icon_rewards_update") return "称号アイコン報酬変更";
  if (value === "title_delete") return "称号削除";
  if (value === "announcement_create") return "お知らせ作成";
  return value;
}

function announcementCategoryLabel(value: string) {
  if (value === "maintenance") return "メンテナンス";
  if (value === "bug") return "不具合";
  if (value === "update") return "アップデート";
  if (value === "important") return "重要";
  return "通常";
}

function renderIconRewardSummary(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return "なし";
  return value.map((item) => {
    if (!isRecord(item)) return "-";
    const name = readUnknownString(item.icon_name);
    const code = readUnknownString(item.icon_code);
    const id = readUnknownString(item.icon_id);
    return `${name} / ${code} / ${id}`;
  }).join("、");
}

function renderIdList(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return "なし";
  return value.map((item) => typeof item === "string" ? item : "-").join("、");
}

function readUnknownString(value: unknown) {
  return typeof value === "string" ? value : "-";
}

function readUnknownNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readUnknownNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readUnknownBoolean(value: unknown) {
  return value === true;
}

function roleLabel(role: AdminRole) {
  if (role === "owner") return "管理責任者";
  if (role === "admin") return "管理者";
  return "通常ユーザー";
}

function formatMatchMode(value: string) {
  if (value === "solo") return "ソロ";
  if (value === "multi") return "マルチ";
  return value;
}

function formatMatchResult(value: string) {
  if (value === "win") return "勝利";
  if (value === "lose") return "敗北";
  return "-";
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP");
}

function formatBytes(value: number | null) {
  if (!value) return "-";
  if (value < 1024) return `${value}B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)}KB`;
  return `${(value / 1024 / 1024).toFixed(2)}MB`;
}

function formatRate(value: number) {
  return `${formatRateValue(value)}`;
}

function formatRateValue(value: number) {
  return (Number.isFinite(value) ? value : 0).toFixed(4);
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value: string | number) {
  return escapeHtml(value);
}
