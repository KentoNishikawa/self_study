import { validateConditionParams } from "./_title-condition-validation";

const MAX_CONDITION_NODES = 5;
const MAX_OPERATOR_NODES = 4;
const MAX_EDGES = 8;
const MAX_DEPTH = 4;
const MAX_INTERNAL_CONDITION_DEPTH = 8;
const MAX_INTERNAL_LEAF_CONDITIONS = 32;
const MAX_COMBINED_CONDITION_DEPTH = MAX_DEPTH + MAX_INTERNAL_CONDITION_DEPTH;
const MAX_COMBINED_LEAF_CONDITIONS = MAX_CONDITION_NODES * MAX_INTERNAL_LEAF_CONDITIONS;

const ALLOWED_CONDITION_TYPES = new Set([
  "initial_grant",
  "stat_count_at_least",
  "stat_value_at_least",
  "stat_value_at_most",
  "stat_flag_true",
  "stat_json_contains_all",
  "stat_json_contains_key",
  "stat_json_value_at_least",
  "stat_json_value_at_most",
  "card_sequence_match",
  "hand_sequence_match",
  "table_all_suit_match",
  "participant_icon_composition_match",
  "match_count_compare",
  "match_achievement_key",
  "all_conditions",
  "any_condition",
]);

type GraphConditionNode = {
  id: string;
  type: "condition";
  x: number;
  y: number;
  conditionType: string;
  conditionParams: Record<string, unknown>;
  conditionBuilder: Record<string, unknown>;
  summary: string;
  legacyCompound?: boolean;
};

type GraphOperatorNode = {
  id: string;
  type: "operator";
  x: number;
  y: number;
  operator: "and" | "or";
};

type GraphNode = GraphConditionNode | GraphOperatorNode;

type GraphEdge = {
  id: string;
  source: string;
  target: string;
};

type ConditionGraph = {
  version: 2;
  mode: "condition_graph";
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootNodeId?: string;
};

type ConditionTree = {
  condition_type: string;
  condition_params_json: Record<string, unknown>;
};

export type NormalizedTitleConditionDefinition = {
  conditionType: string;
  conditionParamsJson: string;
  conditionBuilderJson: string;
};

export type NormalizeTitleConditionResult =
  | { ok: true; value: NormalizedTitleConditionDefinition }
  | { ok: false; message: string };

export function normalizeTitleConditionDefinition(
  conditionTypeValue: unknown,
  conditionParamsJsonValue: unknown,
  conditionBuilderJsonValue: unknown,
): NormalizeTitleConditionResult {
  const fallbackConditionType = typeof conditionTypeValue === "string" ? conditionTypeValue.trim() : "";
  const paramsText = normalizeJsonText(conditionParamsJsonValue, "{}");
  if (paramsText.ok === false) return { ok: false, message: paramsText.message };
  const builderText = normalizeJsonText(conditionBuilderJsonValue, "{}");
  if (builderText.ok === false) return { ok: false, message: builderText.message };
  const builder = parseRecord(builderText.value);
  if (!builder) return { ok: false, message: "condition_builder_json を確認してください。" };

  if (builder.mode !== "condition_graph") {
    if (!fallbackConditionType || !ALLOWED_CONDITION_TYPES.has(fallbackConditionType)) {
      return { ok: false, message: "未対応の condition_type は保存できません。" };
    }
    if ((fallbackConditionType === "all_conditions" || fallbackConditionType === "any_condition") && builder.mode !== "builder") {
      return { ok: false, message: "複合条件は相関図のAND／ORブロックで設定してください。" };
    }
    const params = parseRecord(paramsText.value);
    if (!params) return { ok: false, message: "condition_params_json を確認してください。" };
    const conditionValidation = validateConditionTree(
      { condition_type: fallbackConditionType, condition_params_json: params },
      0,
      { maxDepth: MAX_INTERNAL_CONDITION_DEPTH, maxLeafConditions: MAX_INTERNAL_LEAF_CONDITIONS },
    );
    if (conditionValidation) return { ok: false, message: conditionValidation };
    const detailedValidation = validateConditionParams(fallbackConditionType, params);
    if (detailedValidation.ok === false) return { ok: false, message: detailedValidation.message };
    return {
      ok: true,
      value: {
        conditionType: fallbackConditionType,
        conditionParamsJson: JSON.stringify(params),
        conditionBuilderJson: JSON.stringify(builder),
      },
    };
  }

  const graphResult = parseAndValidateGraph(builder);
  if (graphResult.ok === false) return { ok: false, message: graphResult.message };
  const tree = buildTree(graphResult.graph, graphResult.rootNodeId);
  if (!tree) return { ok: false, message: "相関図から条件式を生成できませんでした。" };
  const conditionValidation = validateConditionTree(
    tree,
    0,
    { maxDepth: MAX_COMBINED_CONDITION_DEPTH, maxLeafConditions: MAX_COMBINED_LEAF_CONDITIONS },
  );
  if (conditionValidation) return { ok: false, message: conditionValidation };
  const detailedValidation = validateConditionParams(tree.condition_type, tree.condition_params_json);
  if (detailedValidation.ok === false) return { ok: false, message: detailedValidation.message };
  return {
    ok: true,
    value: {
      conditionType: tree.condition_type,
      conditionParamsJson: JSON.stringify(tree.condition_params_json),
      conditionBuilderJson: JSON.stringify(graphResult.graph),
    },
  };
}

function parseAndValidateGraph(value: Record<string, unknown>): { ok: true; graph: ConditionGraph; rootNodeId: string } | { ok: false; message: string } {
  if (value.version !== 2 || value.mode !== "condition_graph") return { ok: false, message: "相関図JSONのversionまたはmodeを確認してください。" };
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) return { ok: false, message: "相関図JSONのnodesとedgesを確認してください。" };

  const nodes: GraphNode[] = [];
  const ids = new Set<string>();
  let conditionCount = 0;
  let operatorCount = 0;
  for (const raw of value.nodes) {
    if (!isRecord(raw)) return { ok: false, message: "相関図のブロック形式を確認してください。" };
    const id = readString(raw.id);
    const x = Number(raw.x);
    const y = Number(raw.y);
    if (!id || ids.has(id) || !Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, message: "相関図のブロックIDまたは座標を確認してください。" };
    ids.add(id);
    if (raw.type === "condition") {
      conditionCount += 1;
      const conditionType = readString(raw.conditionType);
      const conditionParams = readRecord(raw.conditionParams);
      const conditionBuilder = readRecord(raw.conditionBuilder);
      if (!conditionType || !ALLOWED_CONDITION_TYPES.has(conditionType) || !conditionParams || !conditionBuilder) {
        return { ok: false, message: "条件ブロックの内容を確認してください。" };
      }
      if ((conditionType === "all_conditions" || conditionType === "any_condition")
        && conditionBuilder.mode !== "builder"
        && raw.legacyCompound !== true) {
        return { ok: false, message: "条件ブロック内の複合条件はコードレスビルダーが生成したものだけ保存できます。" };
      }
      const nodeConditionValidation = validateConditionTree(
        { condition_type: conditionType, condition_params_json: conditionParams },
        0,
        { maxDepth: MAX_INTERNAL_CONDITION_DEPTH, maxLeafConditions: MAX_INTERNAL_LEAF_CONDITIONS },
      );
      if (nodeConditionValidation) return { ok: false, message: nodeConditionValidation };
      nodes.push({
        id,
        type: "condition",
        x,
        y,
        conditionType,
        conditionParams,
        conditionBuilder,
        summary: readString(raw.summary) || conditionType,
        legacyCompound: raw.legacyCompound === true,
      });
      continue;
    }
    if (raw.type === "operator" && (raw.operator === "and" || raw.operator === "or")) {
      operatorCount += 1;
      nodes.push({ id, type: "operator", x, y, operator: raw.operator });
      continue;
    }
    return { ok: false, message: "相関図のブロック種別を確認してください。" };
  }

  if (conditionCount < 1) return { ok: false, message: "条件ブロックを1件以上追加してください。" };
  if (conditionCount > MAX_CONDITION_NODES) return { ok: false, message: `条件ブロックは最大${MAX_CONDITION_NODES}件です。` };
  if (operatorCount > MAX_OPERATOR_NODES) return { ok: false, message: `AND／ORブロックは最大${MAX_OPERATOR_NODES}件です。` };

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edges: GraphEdge[] = [];
  const pairs = new Set<string>();
  const outgoing = new Map<string, GraphEdge[]>();
  const incoming = new Map<string, GraphEdge[]>();
  for (const raw of value.edges) {
    if (!isRecord(raw)) return { ok: false, message: "相関図の接続形式を確認してください。" };
    const id = readString(raw.id);
    const source = readString(raw.source);
    const target = readString(raw.target);
    if (!id || !source || !target || !nodeMap.has(source) || !nodeMap.has(target) || source === target) {
      return { ok: false, message: "相関図の接続先を確認してください。" };
    }
    const targetNode = nodeMap.get(target);
    if (targetNode?.type !== "operator") return { ok: false, message: "接続先にはAND／ORブロックを指定してください。" };
    const pair = `${source}->${target}`;
    if (pairs.has(pair)) return { ok: false, message: "同じブロック間の接続が重複しています。" };
    pairs.add(pair);
    const edge = { id, source, target };
    edges.push(edge);
    outgoing.set(source, [...(outgoing.get(source) ?? []), edge]);
    incoming.set(target, [...(incoming.get(target) ?? []), edge]);
  }

  if (edges.length > MAX_EDGES) return { ok: false, message: `接続線は最大${MAX_EDGES}本です。` };
  for (const node of nodes) {
    if ((outgoing.get(node.id)?.length ?? 0) > 1) return { ok: false, message: "1つのブロックを複数の上位ブロックへ接続できません。" };
    if (node.type === "condition" && (incoming.get(node.id)?.length ?? 0) > 0) return { ok: false, message: "条件ブロックを接続先にはできません。" };
    if (node.type === "operator" && (incoming.get(node.id)?.length ?? 0) < 2) return { ok: false, message: `${node.operator.toUpperCase()}ブロックには2件以上を接続してください。` };
  }

  if (hasCycle(nodes, edges)) return { ok: false, message: "循環する接続は作成できません。" };
  const roots = nodes.filter((node) => (outgoing.get(node.id)?.length ?? 0) === 0);
  if (roots.length !== 1) return { ok: false, message: "出力先を持たない最終ブロックを1件だけにしてください。" };
  const root = roots[0];
  if (!root) return { ok: false, message: "最終ブロックを確認してください。" };
  if (conditionCount > 1 && root.type !== "operator") return { ok: false, message: "複数条件の最終ブロックはAND／ORにしてください。" };

  const reachable = collectIncoming(root.id, incoming);
  reachable.add(root.id);
  if (reachable.size !== nodes.length) return { ok: false, message: "最終条件へ接続されていないブロックがあります。" };
  if (readDepth(root.id, incoming, new Set()) > MAX_DEPTH) return { ok: false, message: `AND／ORのネストは最大${MAX_DEPTH}階層です。` };

  const initialNodes = nodes.filter((node): node is GraphConditionNode => node.type === "condition" && node.conditionType === "initial_grant");
  if (initialNodes.length > 0 && (conditionCount !== 1 || operatorCount > 0 || edges.length > 0)) {
    return { ok: false, message: "初期所持称号には複数条件を設定できません。" };
  }

  return { ok: true, graph: { version: 2, mode: "condition_graph", nodes, edges, rootNodeId: root.id }, rootNodeId: root.id };
}

function buildTree(graph: ConditionGraph, rootNodeId: string): ConditionTree | null {
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, GraphEdge[]>();
  for (const edge of graph.edges) incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);

  const build = (nodeId: string): ConditionTree | null => {
    const node = nodeMap.get(nodeId);
    if (!node) return null;
    if (node.type === "condition") return { condition_type: node.conditionType, condition_params_json: cloneRecord(node.conditionParams) };
    const children = [...(incoming.get(node.id) ?? [])]
      .sort((left, right) => {
        const a = nodeMap.get(left.source);
        const b = nodeMap.get(right.source);
        if (!a || !b) return left.id.localeCompare(right.id);
        return a.y - b.y || a.x - b.x || a.id.localeCompare(b.id);
      })
      .map((edge) => build(edge.source));
    if (children.some((child) => !child)) return null;
    return {
      condition_type: node.operator === "and" ? "all_conditions" : "any_condition",
      condition_params_json: { conditions: children as ConditionTree[] },
    };
  };

  return build(rootNodeId);
}

function validateConditionTree(
  tree: ConditionTree,
  depth: number,
  limits: { maxDepth: number; maxLeafConditions: number },
  state: { leafCount: number } = { leafCount: 0 },
): string {
  if (!ALLOWED_CONDITION_TYPES.has(tree.condition_type)) return "未対応の condition_type は保存できません。";
  if (!isRecord(tree.condition_params_json)) return "condition_params_json の形式を確認してください。";
  if (tree.condition_type !== "all_conditions" && tree.condition_type !== "any_condition") {
    state.leafCount += 1;
    return state.leafCount > limits.maxLeafConditions
      ? `条件ブロック内部の末端条件は最大${limits.maxLeafConditions}件です。`
      : "";
  }
  if (depth >= limits.maxDepth) return `条件ブロック内部のAND／ORは最大${limits.maxDepth}階層です。`;
  const children = tree.condition_params_json.conditions;
  if (!Array.isArray(children) || children.length < 2) return "複合条件には2件以上のconditionsが必要です。";
  for (const child of children) {
    const normalized = normalizeTree(child);
    if (!normalized) return "複合条件の形式を確認してください。";
    const error = validateConditionTree(normalized, depth + 1, limits, state);
    if (error) return error;
  }
  return "";
}

function normalizeTree(value: unknown): ConditionTree | null {
  if (!isRecord(value)) return null;
  const conditionType = readString(value.condition_type) || readString(value.conditionType);
  const params = readRecord(value.condition_params_json ?? value.conditionParamsJson ?? {});
  return conditionType && params ? { condition_type: conditionType, condition_params_json: params } : null;
}

function hasCycle(nodes: GraphNode[], edges: GraphEdge[]) {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const target of outgoing.get(id) ?? []) if (visit(target)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return nodes.some((node) => visit(node.id));
}

function collectIncoming(rootId: string, incoming: Map<string, GraphEdge[]>) {
  const result = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || result.has(id)) continue;
    result.add(id);
    for (const edge of incoming.get(id) ?? []) stack.push(edge.source);
  }
  result.delete(rootId);
  return result;
}

function readDepth(id: string, incoming: Map<string, GraphEdge[]>, visiting: Set<string>): number {
  if (visiting.has(id)) return Number.POSITIVE_INFINITY;
  visiting.add(id);
  const children = incoming.get(id) ?? [];
  if (children.length === 0) {
    visiting.delete(id);
    return 0;
  }
  const depth = 1 + Math.max(...children.map((edge) => readDepth(edge.source, incoming, visiting)));
  visiting.delete(id);
  return depth;
}

function normalizeJsonText(value: unknown, fallback: string): { ok: true; value: string } | { ok: false; message: string } {
  const text = typeof value === "string" ? value.trim() : "";
  const normalized = text || fallback;
  try {
    const parsed: unknown = JSON.parse(normalized);
    if (!isRecord(parsed)) return { ok: false, message: "JSONオブジェクトを入力してください。" };
    return { ok: true, value: JSON.stringify(parsed) };
  } catch {
    return { ok: false, message: "JSON構文を確認してください。" };
  }
}

function parseRecord(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") return parseRecord(value);
  return isRecord(value) ? cloneRecord(value) : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cloneRecord(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
