export type TitleConditionGraphOperator = "and" | "or";

export type TitleConditionGraphConditionNode = {
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

export type TitleConditionGraphOperatorNode = {
  id: string;
  type: "operator";
  x: number;
  y: number;
  operator: TitleConditionGraphOperator;
};

export type TitleConditionGraphNode = TitleConditionGraphConditionNode | TitleConditionGraphOperatorNode;

export type TitleConditionGraphEdge = {
  id: string;
  source: string;
  target: string;
};

export type TitleConditionGraph = {
  version: 2;
  mode: "condition_graph";
  nodes: TitleConditionGraphNode[];
  edges: TitleConditionGraphEdge[];
  rootNodeId?: string;
};

export type TitleConditionTree = {
  condition_type: string;
  condition_params_json: Record<string, unknown>;
};

export type TitleConditionGraphValidation = {
  ok: boolean;
  errors: string[];
  errorNodeIds: string[];
  rootNodeId: string | null;
};

export const TITLE_CONDITION_GRAPH_MAX_CONDITIONS = 5;
export const TITLE_CONDITION_GRAPH_MAX_OPERATORS = 4;
export const TITLE_CONDITION_GRAPH_MAX_DEPTH = 4;
export const TITLE_CONDITION_GRAPH_MAX_EDGES = 8;
export const TITLE_CONDITION_GRAPH_CANVAS_WIDTH = 1240;
export const TITLE_CONDITION_GRAPH_CANVAS_HEIGHT = 720;
export const TITLE_CONDITION_GRAPH_CONDITION_WIDTH = 250;
export const TITLE_CONDITION_GRAPH_CONDITION_HEIGHT = 112;
export const TITLE_CONDITION_GRAPH_OPERATOR_WIDTH = 96;
export const TITLE_CONDITION_GRAPH_OPERATOR_HEIGHT = 72;

export function createEmptyTitleConditionGraph(): TitleConditionGraph {
  return { version: 2, mode: "condition_graph", nodes: [], edges: [] };
}

export function createSingleConditionGraph(node: Omit<TitleConditionGraphConditionNode, "id" | "x" | "y" | "type">): TitleConditionGraph {
  return {
    version: 2,
    mode: "condition_graph",
    nodes: [{ ...node, id: "condition-1", type: "condition", x: 90, y: 120 }],
    edges: [],
  };
}

export function parseTitleConditionGraph(value: unknown): TitleConditionGraph | null {
  if (!isRecord(value) || value.mode !== "condition_graph" || value.version !== 2) return null;
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) return null;

  const nodes: TitleConditionGraphNode[] = [];
  for (const item of value.nodes) {
    if (!isRecord(item)) return null;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const x = Number(item.x);
    const y = Number(item.y);
    if (!id || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (item.type === "condition") {
      const conditionType = typeof item.conditionType === "string" ? item.conditionType.trim() : "";
      const conditionParams = parseRecord(item.conditionParams);
      const conditionBuilder = parseRecord(item.conditionBuilder);
      if (!conditionType || !conditionParams || !conditionBuilder) return null;
      nodes.push({
        id,
        type: "condition",
        x,
        y,
        conditionType,
        conditionParams,
        conditionBuilder,
        summary: typeof item.summary === "string" && item.summary.trim() ? item.summary.trim() : conditionType,
        legacyCompound: item.legacyCompound === true,
      });
      continue;
    }
    if (item.type === "operator" && (item.operator === "and" || item.operator === "or")) {
      nodes.push({ id, type: "operator", x, y, operator: item.operator });
      continue;
    }
    return null;
  }

  const edges: TitleConditionGraphEdge[] = [];
  for (const item of value.edges) {
    if (!isRecord(item)) return null;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const source = typeof item.source === "string" ? item.source.trim() : "";
    const target = typeof item.target === "string" ? item.target.trim() : "";
    if (!id || !source || !target) return null;
    edges.push({ id, source, target });
  }

  const rootNodeId = typeof value.rootNodeId === "string" && value.rootNodeId.trim() ? value.rootNodeId.trim() : undefined;
  return { version: 2, mode: "condition_graph", nodes, edges, ...(rootNodeId ? { rootNodeId } : {}) };
}

export function validateTitleConditionGraph(graph: TitleConditionGraph): TitleConditionGraphValidation {
  const errors: string[] = [];
  const errorNodeIds = new Set<string>();
  const conditionNodes = graph.nodes.filter((node): node is TitleConditionGraphConditionNode => node.type === "condition");
  const operatorNodes = graph.nodes.filter((node): node is TitleConditionGraphOperatorNode => node.type === "operator");
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));

  if (conditionNodes.length === 0) errors.push("条件ブロックを1件以上追加してください。");
  if (conditionNodes.length > TITLE_CONDITION_GRAPH_MAX_CONDITIONS) errors.push(`条件ブロックは最大${TITLE_CONDITION_GRAPH_MAX_CONDITIONS}件です。`);
  if (operatorNodes.length > TITLE_CONDITION_GRAPH_MAX_OPERATORS) errors.push(`AND／ORブロックは最大${TITLE_CONDITION_GRAPH_MAX_OPERATORS}件です。`);
  if (graph.edges.length > TITLE_CONDITION_GRAPH_MAX_EDGES) errors.push(`接続線は最大${TITLE_CONDITION_GRAPH_MAX_EDGES}本です。`);

  const ids = new Set<string>();
  for (const node of graph.nodes) {
    if (ids.has(node.id)) {
      errors.push("同じIDのブロックが重複しています。");
      errorNodeIds.add(node.id);
    }
    ids.add(node.id);
    if (node.type === "condition" && !node.conditionType) {
      errors.push("条件ブロックのcondition_typeがありません。");
      errorNodeIds.add(node.id);
    }
  }

  const edgePairs = new Set<string>();
  const outgoing = new Map<string, TitleConditionGraphEdge[]>();
  const incoming = new Map<string, TitleConditionGraphEdge[]>();
  for (const edge of graph.edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) {
      errors.push("存在しないブロックへの接続があります。");
      if (sourceNode) errorNodeIds.add(sourceNode.id);
      if (targetNode) errorNodeIds.add(targetNode.id);
      continue;
    }
    if (edge.source === edge.target) {
      errors.push("同じブロック自身へは接続できません。");
      errorNodeIds.add(edge.source);
    }
    if (targetNode.type !== "operator") {
      errors.push("接続先にはAND／ORブロックを指定してください。");
      errorNodeIds.add(targetNode.id);
    }
    const pair = `${edge.source}->${edge.target}`;
    if (edgePairs.has(pair)) {
      errors.push("同じブロック間の接続が重複しています。");
      errorNodeIds.add(edge.source);
      errorNodeIds.add(edge.target);
    }
    edgePairs.add(pair);
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);
  }

  for (const node of graph.nodes) {
    const outputs = outgoing.get(node.id) ?? [];
    if (outputs.length > 1) {
      errors.push(`${nodeLabel(node)}は複数の接続先を持てません。`);
      errorNodeIds.add(node.id);
    }
    if (node.type === "condition" && (incoming.get(node.id)?.length ?? 0) > 0) {
      errors.push("条件ブロックを接続先にはできません。");
      errorNodeIds.add(node.id);
    }
  }

  for (const node of operatorNodes) {
    const inputs = incoming.get(node.id) ?? [];
    if (inputs.length < 2) {
      errors.push(`${node.operator.toUpperCase()}ブロックには2件以上を接続してください。`);
      errorNodeIds.add(node.id);
    }
  }

  const rootCandidates = graph.nodes.filter((node) => (outgoing.get(node.id)?.length ?? 0) === 0);
  let rootNodeId: string | null = rootCandidates.length === 1 ? rootCandidates[0]?.id ?? null : null;
  if (graph.nodes.length > 0 && rootCandidates.length !== 1) {
    errors.push("出力先を持たない最終ブロックを1件だけにしてください。");
    for (const node of rootCandidates) errorNodeIds.add(node.id);
  }
  if (conditionNodes.length > 1 && rootNodeId) {
    const root = nodeMap.get(rootNodeId);
    if (!root || root.type !== "operator") {
      errors.push("複数条件の最終ブロックはAND／ORにしてください。");
      if (root) errorNodeIds.add(root.id);
    }
  }

  const cycleNodes = findCycleNodes(graph.nodes, graph.edges);
  if (cycleNodes.size > 0) {
    errors.push("循環する接続は作成できません。");
    for (const id of cycleNodes) errorNodeIds.add(id);
    rootNodeId = null;
  }

  if (rootNodeId) {
    const reachable = collectAncestors(rootNodeId, incoming);
    reachable.add(rootNodeId);
    for (const node of graph.nodes) {
      if (!reachable.has(node.id)) {
        errors.push(`${nodeLabel(node)}が最終条件へ接続されていません。`);
        errorNodeIds.add(node.id);
      }
    }
    const depth = readGraphDepth(rootNodeId, incoming, new Set());
    if (depth > TITLE_CONDITION_GRAPH_MAX_DEPTH) {
      errors.push(`AND／ORのネストは最大${TITLE_CONDITION_GRAPH_MAX_DEPTH}階層です。`);
      errorNodeIds.add(rootNodeId);
    }
  }

  const initialGrantNodes = conditionNodes.filter((node) => node.conditionType === "initial_grant");
  if (initialGrantNodes.length > 0 && (conditionNodes.length !== 1 || operatorNodes.length > 0 || graph.edges.length > 0)) {
    errors.push("初期所持称号には複数条件を設定できません。");
    for (const node of initialGrantNodes) errorNodeIds.add(node.id);
  }

  return { ok: errors.length === 0, errors: Array.from(new Set(errors)), errorNodeIds: [...errorNodeIds], rootNodeId };
}

export function buildConditionTreeFromGraph(graph: TitleConditionGraph): { ok: true; tree: TitleConditionTree; rootNodeId: string } | { ok: false; errors: string[] } {
  const validation = validateTitleConditionGraph(graph);
  if (!validation.ok || !validation.rootNodeId) return { ok: false, errors: validation.errors };
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, TitleConditionGraphEdge[]>();
  for (const edge of graph.edges) incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);

  const build = (nodeId: string): TitleConditionTree | null => {
    const node = nodeMap.get(nodeId);
    if (!node) return null;
    if (node.type === "condition") return { condition_type: node.conditionType, condition_params_json: cloneRecord(node.conditionParams) };
    const childEdges = sortIncomingEdges(incoming.get(node.id) ?? [], nodeMap);
    const children = childEdges.map((edge) => build(edge.source)).filter((item): item is TitleConditionTree => Boolean(item));
    if (children.length < 2) return null;
    return {
      condition_type: node.operator === "and" ? "all_conditions" : "any_condition",
      condition_params_json: { conditions: children },
    };
  };

  const tree = build(validation.rootNodeId);
  return tree ? { ok: true, tree, rootNodeId: validation.rootNodeId } : { ok: false, errors: ["条件式を生成できませんでした。"] };
}

export function buildTitleConditionExpression(graph: TitleConditionGraph): string {
  const validation = validateTitleConditionGraph(graph);
  if (!validation.rootNodeId) return "";
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, TitleConditionGraphEdge[]>();
  for (const edge of graph.edges) incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);

  const renderNode = (nodeId: string, parentOperator: TitleConditionGraphOperator | null): string => {
    const node = nodeMap.get(nodeId);
    if (!node) return "";
    if (node.type === "condition") return node.summary || node.conditionType;
    const children = sortIncomingEdges(incoming.get(node.id) ?? [], nodeMap)
      .map((edge) => renderNode(edge.source, node.operator))
      .filter(Boolean);
    const connector = node.operator === "and" ? " かつ " : " または ";
    const expression = children.join(connector);
    return parentOperator && parentOperator !== node.operator ? `（${expression}）` : expression;
  };

  return renderNode(validation.rootNodeId, null);
}

export function createGraphFromConditionTree(tree: TitleConditionTree, summarize: (conditionType: string, params: Record<string, unknown>) => string): TitleConditionGraph | null {
  let conditionIndex = 0;
  let operatorIndex = 0;
  const nodes: TitleConditionGraphNode[] = [];
  const edges: TitleConditionGraphEdge[] = [];

  const visit = (condition: TitleConditionTree): string | null => {
    if (!condition.condition_type || !isRecord(condition.condition_params_json)) return null;
    if (condition.condition_type === "all_conditions" || condition.condition_type === "any_condition") {
      const rawConditions = condition.condition_params_json.conditions;
      if (!Array.isArray(rawConditions) || rawConditions.length < 2) return null;
      operatorIndex += 1;
      const id = `operator-${operatorIndex}`;
      nodes.push({ id, type: "operator", x: 0, y: 0, operator: condition.condition_type === "all_conditions" ? "and" : "or" });
      for (const raw of rawConditions) {
        const child = normalizeConditionTree(raw);
        if (!child) return null;
        const childId = visit(child);
        if (!childId) return null;
        edges.push({ id: `edge-${edges.length + 1}`, source: childId, target: id });
      }
      return id;
    }

    conditionIndex += 1;
    const id = `condition-${conditionIndex}`;
    nodes.push({
      id,
      type: "condition",
      x: 0,
      y: 0,
      conditionType: condition.condition_type,
      conditionParams: cloneRecord(condition.condition_params_json),
      conditionBuilder: { version: 1, mode: "raw_json" },
      summary: summarize(condition.condition_type, condition.condition_params_json),
    });
    return id;
  };

  const root = visit(tree);
  if (!root) return null;
  const graph: TitleConditionGraph = { version: 2, mode: "condition_graph", nodes, edges };
  const laidOut = autoLayoutTitleConditionGraph(graph);
  return validateTitleConditionGraph(laidOut).ok ? laidOut : null;
}

export function autoLayoutTitleConditionGraph(graph: TitleConditionGraph): TitleConditionGraph {
  if (graph.nodes.length === 0) return graph;
  const outgoing = new Map<string, TitleConditionGraphEdge[]>();
  const incoming = new Map<string, TitleConditionGraphEdge[]>();
  for (const edge of graph.edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);
  }
  const roots = graph.nodes.filter((node) => (outgoing.get(node.id)?.length ?? 0) === 0);
  const levels = new Map<string, number>();
  const assign = (nodeId: string, level: number) => {
    const current = levels.get(nodeId);
    if (current != null && current >= level) return;
    levels.set(nodeId, level);
    for (const edge of incoming.get(nodeId) ?? []) assign(edge.source, level + 1);
  };
  for (const root of roots) assign(root.id, 0);
  for (const node of graph.nodes) if (!levels.has(node.id)) levels.set(node.id, node.type === "condition" ? 2 : 1);

  const maxLevel = Math.max(...levels.values());
  const grouped = new Map<number, TitleConditionGraphNode[]>();
  for (const node of graph.nodes) {
    const level = levels.get(node.id) ?? 0;
    grouped.set(level, [...(grouped.get(level) ?? []), node]);
  }

  const nextNodes = graph.nodes.map((node) => ({ ...node } as TitleConditionGraphNode));
  const nextMap = new Map(nextNodes.map((node) => [node.id, node]));
  for (const [level, nodes] of grouped) {
    const sorted = [...nodes].sort((left, right) => left.y - right.y || left.x - right.x || left.id.localeCompare(right.id));
    const totalHeight = sorted.reduce((sum, node) => sum + nodeHeight(node), 0) + Math.max(0, sorted.length - 1) * 38;
    let y = Math.max(46, (TITLE_CONDITION_GRAPH_CANVAS_HEIGHT - totalHeight) / 2);
    for (const node of sorted) {
      const target = nextMap.get(node.id);
      if (!target) continue;
      target.x = 70 + (maxLevel - level) * 300;
      target.y = y;
      y += nodeHeight(node) + 38;
    }
  }
  return { ...graph, nodes: nextNodes };
}

export function resetTitleConditionGraphPositions(graph: TitleConditionGraph): TitleConditionGraph {
  const nodes = graph.nodes.map((node, index) => ({
    ...node,
    x: node.type === "condition" ? 70 : 520,
    y: 60 + index * 118,
  } as TitleConditionGraphNode));
  return { ...graph, nodes };
}

export function serializeTitleConditionGraph(graph: TitleConditionGraph): string {
  const validation = validateTitleConditionGraph(graph);
  const normalized = validation.rootNodeId ? { ...graph, rootNodeId: validation.rootNodeId } : graph;
  return JSON.stringify(normalized);
}

export function normalizeConditionTree(value: unknown): TitleConditionTree | null {
  if (!isRecord(value)) return null;
  const conditionType = typeof value.condition_type === "string"
    ? value.condition_type.trim()
    : typeof value.conditionType === "string"
      ? value.conditionType.trim()
      : "";
  if (!conditionType) return null;
  const rawParams = value.condition_params_json ?? value.conditionParamsJson ?? {};
  const params = parseRecord(rawParams);
  if (!params) return null;
  return { condition_type: conditionType, condition_params_json: params };
}

export function isCompoundConditionType(value: string) {
  return value === "all_conditions" || value === "any_condition";
}

function sortIncomingEdges(edges: TitleConditionGraphEdge[], nodeMap: Map<string, TitleConditionGraphNode>) {
  return [...edges].sort((left, right) => {
    const leftNode = nodeMap.get(left.source);
    const rightNode = nodeMap.get(right.source);
    if (!leftNode || !rightNode) return left.id.localeCompare(right.id);
    return leftNode.y - rightNode.y || leftNode.x - rightNode.x || leftNode.id.localeCompare(rightNode.id);
  });
}

function collectAncestors(rootNodeId: string, incoming: Map<string, TitleConditionGraphEdge[]>) {
  const visited = new Set<string>();
  const stack = [rootNodeId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    for (const edge of incoming.get(current) ?? []) stack.push(edge.source);
  }
  visited.delete(rootNodeId);
  return visited;
}

function readGraphDepth(nodeId: string, incoming: Map<string, TitleConditionGraphEdge[]>, visiting: Set<string>): number {
  if (visiting.has(nodeId)) return Number.POSITIVE_INFINITY;
  visiting.add(nodeId);
  const childEdges = incoming.get(nodeId) ?? [];
  if (childEdges.length === 0) {
    visiting.delete(nodeId);
    return 0;
  }
  const depth = 1 + Math.max(...childEdges.map((edge) => readGraphDepth(edge.source, incoming, visiting)));
  visiting.delete(nodeId);
  return depth;
}

function findCycleNodes(nodes: TitleConditionGraphNode[], edges: TitleConditionGraphEdge[]) {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycleNodes = new Set<string>();

  const visit = (id: string) => {
    if (visiting.has(id)) {
      cycleNodes.add(id);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const target of outgoing.get(id) ?? []) {
      if (visiting.has(target)) {
        cycleNodes.add(id);
        cycleNodes.add(target);
      } else {
        visit(target);
        if (cycleNodes.has(target)) cycleNodes.add(id);
      }
    }
    visiting.delete(id);
    visited.add(id);
  };

  for (const node of nodes) visit(node.id);
  return cycleNodes;
}

function nodeLabel(node: TitleConditionGraphNode) {
  return node.type === "condition" ? node.summary || node.id : `${node.operator.toUpperCase()}ブロック`;
}

function nodeHeight(node: TitleConditionGraphNode) {
  return node.type === "condition" ? TITLE_CONDITION_GRAPH_CONDITION_HEIGHT : TITLE_CONDITION_GRAPH_OPERATOR_HEIGHT;
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isRecord(value) ? cloneRecord(value) : null;
}

function cloneRecord(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
