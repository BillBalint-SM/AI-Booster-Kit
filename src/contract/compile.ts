import type {
  AgentHost,
  CapabilityDeclaration,
  CapabilityReport,
  CapabilityState,
  ContractDocument,
  NativeAdapterProjection,
} from "./markdown.js";
import {
  canonicalVocabulary,
  validateContractDocument,
  type ContractSemantics,
} from "./markdown.js";

export function compileNativeAdapter(
  contract: ContractDocument,
  host: AgentHost,
): NativeAdapterProjection {
  const semantics = validateContractDocument(contract, `contract:${contract.contractId}`);
  const capabilities = contract.capabilities.map((capability) =>
    compileCapability(capability, host),
  );
  const generatedAt = new Date().toISOString();

  return {
    sourceContractRevision: contract.sourceRevision,
    targetHost: host,
    generatedAt,
    content: renderProjection(contract, host, generatedAt, capabilities, semantics),
    capabilities,
  };
}

function compileCapability(
  capability: CapabilityDeclaration,
  host: AgentHost,
): CapabilityReport {
  const hostPolicy = capabilityPolicy(capability.name, host);

  return {
    ...capability,
    state: hostPolicy.state,
    limitation: `${capability.limitation} ${hostPolicy.limitation}`.trim(),
    targetHost: host,
  };
}

function capabilityPolicy(
  name: string,
  host: AgentHost,
): { state: CapabilityState; limitation: string } {
  const stateByHost: Record<string, Record<AgentHost, CapabilityState>> = {
    "Canonical contract reading": {
      codex: "supported",
      "claude-code": "unknown",
      cursor: "unknown",
    },
    "Native adapter projection": {
      codex: "supported_with_limits",
      "claude-code": "supported_with_limits",
      cursor: "supported_with_limits",
    },
    "Local conformance checks": {
      codex: "supported_with_limits",
      "claude-code": "supported_with_limits",
      cursor: "supported_with_limits",
    },
    "Jira/Confluence/GitHub synchronization": {
      codex: "unsupported",
      "claude-code": "unsupported",
      cursor: "unsupported",
    },
    "External write allowlist enforcement": {
      codex: "unsupported",
      "claude-code": "unsupported",
      cursor: "unsupported",
    },
  };
  const state = stateByHost[name]?.[host];

  if (state === undefined) {
    return {
      state: "requires_approval",
      limitation: "No host compatibility declaration exists; approval is required.",
    };
  }

  return {
    state,
    limitation: "This generated projection does not enable external execution.",
  };
}

function renderProjection(
  contract: ContractDocument,
  host: AgentHost,
  generatedAt: string,
  capabilities: CapabilityReport[],
  semantics: ContractSemantics,
): string {
  return `---
sourceContractRevision: ${contract.sourceRevision}
targetHost: ${host}
generatedAt: ${generatedAt}
---

# ${host} Native Adapter Projection

This file is a generated projection of the canonical contract, not an independent authority.

## Canonical vocabulary

Milestone, Epic, Story, Task, Bug remain the canonical work hierarchy. The canonical terms are: ${canonicalVocabulary(contract, `contract:${contract.contractId}`).join(", ")}.

## Lifecycle and stop protocol

Board statuses: ${semantics.lifecycle.join(" → ")}.

${semantics.stopProtocol}

## Capability table

| Capability | State | Limitation |
| --- | --- | --- |
${capabilities.map((capability) => `| ${capability.name} | ${capability.state} | ${capability.limitation} |`).join("\n")}
`;
}
