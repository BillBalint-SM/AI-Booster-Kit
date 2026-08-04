# Capability Matrix

Capability support is declared explicitly by each native host adapter. A
capability may be `supported`, `supported_with_limits`, `unsupported`,
`unknown`, or `requires_approval`.

The compiler must not silently enable or rewrite undeclared capabilities.

| Capability | Codex | Claude Code | Cursor | Initial limitation |
| --- | --- | --- | --- | --- |
| Canonical contract reading | supported_with_limits | unknown | unknown | The local parser/compiler path is bounded; native host loading and validation remain unverified. |
| Native adapter projection | supported_with_limits | supported_with_limits | supported_with_limits | These are deterministic local projections only; native host behavior remains unverified. |
| Local conformance checks | supported_with_limits | supported_with_limits | supported_with_limits | These checks cover local structural/canonical-event equivalence, not native execution or security. |
| Jira/Confluence/GitHub synchronization | unsupported | unsupported | unsupported | No connector implementation or external authorization exists in the bootstrap. |
| External write allowlist enforcement | unsupported | unsupported | unsupported | Must fail closed until the sync layer implements the mapping contract. |

An `unknown` host capability is not treated as supported. Any request that
depends on an unsupported or unknown capability must produce the User-facing
stop behavior defined by the later synchronization tasks.
