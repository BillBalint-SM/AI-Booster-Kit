const identifierPattern = /^[a-z0-9][a-z0-9-]{2,79}$/;
const revisionPattern = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;

const values = parseArguments(process.argv.slice(2));
if (values === null) process.exit(1);

const envelope = createEnvelope(values);
const graph = values.mode === "SINGLE_AGENT" ? createSingleGraph(values.runId) : createMultiGraph(values.runId);

process.stdout.write(`${JSON.stringify({ envelope, graph })}\n`);

function parseArguments(argv) {
  if (argv.length !== 8) return null;
  const expected = ["--mode", "--run-id", "--source-revision", "--repository-locator"];
  const values = {};
  for (let index = 0; index < expected.length; index += 1) {
    const flagIndex = index * 2;
    const flag = argv[flagIndex];
    const value = argv[flagIndex + 1];
    if (flag !== expected[index] || typeof value !== "string" || value.length === 0 || Object.hasOwn(values, flag)) return null;
    values[flag] = value;
  }
  if (values["--mode"] !== "SINGLE_AGENT" && values["--mode"] !== "MULTI_AGENT") return null;
  if (!identifierPattern.test(values["--run-id"])) return null;
  if (!revisionPattern.test(values["--source-revision"])) return null;
  return {
    mode: values["--mode"],
    runId: values["--run-id"],
    sourceRevision: values["--source-revision"],
    repositoryLocator: values["--repository-locator"],
  };
}

function createEnvelope(values) {
  const multiAgent = values.mode === "MULTI_AGENT";
  return {
    contractVersion: "1.0",
    runId: values.runId,
    goal: "Audit current execution-readiness contracts from repository evidence.",
    scope: ["src/controller", "src/context", "contract/agent-library"],
    nonGoals: ["repository writes", "external sources", "model API access"],
    acceptanceCriteria: [
      { criterionId: "criterion-controller", statement: "Controller assets are traced to exact repository evidence." },
      { criterionId: "criterion-context", statement: "Context and resume assets are traced to exact repository evidence." },
      { criterionId: "criterion-gaps", statement: "Missing capabilities and unknowns remain visible." },
    ],
    sourceRevision: values.sourceRevision,
    retention: "PERSONAL",
    allowedNodeTypes: multiAgent ? ["AGENT_TASK", "SYNTHESIS"] : ["SYNTHESIS"],
    authority: { repositoryWrite: "NONE", externalWrite: "NONE", agentExecution: "CODEX_NATIVE_ONLY" },
    toolScope: ["FILESYSTEM_READ", "LOCAL_SHELL_READ"],
    sources: [{ sourceId: "repo", kind: "REPOSITORY", locator: values.repositoryLocator, sourceRevision: values.sourceRevision }],
    graphLimits: multiAgent
      ? { maxNodes: 5, maxParallel: 2, maxDepth: 4, maxRepairNodes: 1, maxCheckerRepairCycles: 1 }
      : { maxNodes: 1, maxParallel: 1, maxDepth: 1, maxRepairNodes: 0, maxCheckerRepairCycles: 0 },
    budget: multiAgent
      ? { maxDispatches: 4, maxResultBytes: 131072, maxWallClockMs: 1800000 }
      : { maxDispatches: 0, maxResultBytes: 131072, maxWallClockMs: 1800000 },
    stopConditions: ["source revision mismatch", "scope violation", "malformed result"],
    requiredEvidenceKinds: ["REPOSITORY_FILE", "ARTIFACT"],
    allowedFinalStates: ["COMPLETE", "COMPLETE_WITH_LIMIT", "STOPPED", "UNKNOWN"],
  };
}

function createSingleGraph(runId) {
  return {
    graphId: "graph-codex-audit-single",
    runId,
    nodes: [
      node(
        "synthesis",
        "SYNTHESIS",
        "Create the final readiness and gap handoff from repository evidence.",
        "orchestrator-synthesis",
        ["src/controller", "src/context", "contract/agent-library"],
        ["repository writes", "external sources", "agent spawning"],
        ["FILESYSTEM_READ"],
        ["criterion-controller", "criterion-context", "criterion-gaps"],
      ),
    ],
    edges: [],
  };
}

function createMultiGraph(runId) {
  return {
    graphId: "graph-codex-audit-multi",
    runId,
    nodes: [
      node(
        "audit-controller",
        "AGENT_TASK",
        "Inspect Controller, formation, activation, and bounded execution contracts.",
        "controller-auditor",
        ["src/controller", "contract/agent-library"],
        ["repository writes", "external sources", "agent spawning"],
        ["FILESYSTEM_READ", "LOCAL_SHELL_READ"],
        ["criterion-controller", "criterion-gaps"],
      ),
      node(
        "audit-context",
        "AGENT_TASK",
        "Inspect context, persistence, fan-in, checkpoint, and resume contracts.",
        "context-auditor",
        ["src/context"],
        ["repository writes", "external sources", "agent spawning"],
        ["FILESYSTEM_READ", "LOCAL_SHELL_READ"],
        ["criterion-context", "criterion-gaps"],
      ),
      node(
        "checker",
        "AGENT_TASK",
        "Check accepted audit results for completeness, provenance, contradictions, and visible unknowns.",
        "evidence-checker",
        ["src/controller", "src/context", "contract/agent-library"],
        ["repository writes", "external sources", "agent spawning", "unvalidated worker output"],
        ["FILESYSTEM_READ", "LOCAL_SHELL_READ"],
        ["criterion-controller", "criterion-context", "criterion-gaps"],
      ),
      node(
        "synthesis",
        "SYNTHESIS",
        "Create the final readiness and gap handoff from accepted worker and checker artifacts.",
        "orchestrator-synthesis",
        ["src/controller", "src/context", "contract/agent-library"],
        ["repository writes", "external sources", "agent spawning", "unvalidated worker output"],
        ["FILESYSTEM_READ"],
        ["criterion-controller", "criterion-context", "criterion-gaps"],
      ),
    ],
    edges: [
      { fromNodeId: "audit-controller", toNodeId: "checker" },
      { fromNodeId: "audit-context", toNodeId: "checker" },
      { fromNodeId: "checker", toNodeId: "synthesis" },
    ],
  };
}

function node(nodeId, type, objective, role, scope, prohibitedActions, toolScope, acceptanceCriterionIds) {
  return {
    nodeId,
    type,
    required: true,
    state: "PENDING",
    objective,
    role,
    repairOf: null,
    scope,
    prohibitedActions,
    contextRefs: [],
    sourceIds: ["repo"],
    toolScope,
    acceptanceCriterionIds,
  };
}
