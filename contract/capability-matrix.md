# Capability Matrix

Capability support is declared explicitly by each native host adapter. A
capability may be `supported`, `supported_with_limits`, `unsupported`,
`unknown`, or `requires_approval`.

The compiler must not silently enable or rewrite undeclared capabilities.

| Capability | Codex | Claude Code | Cursor | Initial limitation |
| --- | --- | --- | --- | --- |
| Canonical contract reading | supported | unknown | unknown | Host-specific loading and validation are not yet conformance-tested. |
| Native adapter projection | supported_with_limits | unsupported | unsupported | Only the Codex projection is bootstrapped; other hosts require verified adapters. |
| Local conformance checks | supported_with_limits | unsupported | unsupported | Cross-host equivalence is not established until later conformance tasks. |
| Jira/Confluence/GitHub synchronization | unsupported | unsupported | unsupported | No connector implementation or external authorization exists in the bootstrap. |
| External write allowlist enforcement | unsupported | unsupported | unsupported | Must fail closed until the sync layer implements the mapping contract. |

An `unknown` host capability is not treated as supported. Any request that
depends on an unsupported or unknown capability must produce the User-facing
stop behavior defined by the later synchronization tasks.
