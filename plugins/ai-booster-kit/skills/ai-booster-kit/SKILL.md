---
name: ai-booster-kit
description: Activate or refresh narrated Booster Mode for an individual or team software-delivery session, including work already in progress.
---

# AI Booster Kit

Activate the Delivery Kit around the existing Agent and Model. Project a
Delivery Compass, recommend one bounded Skill, then stop for the User's choice.
Do not implement the recommendation from this procedure.

## Invocation boundary

- Start only from an explicit `$ai-booster-kit` request in Codex or the
  namespaced `/ai-booster-kit:ai-booster-kit` Skill in Claude Code.
- Installation is not activation. Activation grants no tool, connector,
  external-write, model-selection, or publication authority.
- Never start another explicit Skill automatically. A suggested continuation
  is a recommendation the User may accept, reject, or replace.

## Project the Delivery Compass

1. Read the active workspace's binding Agent instructions and only the
   authoritative product, architecture, delivery-state, or workflow artifacts
   needed for the current request.
2. Classify the session:
   - `NEW`: delivery has not produced declared artifacts yet;
   - `ATTACH`: work is already in progress and must be brought under contract;
   - `RESUME`: a prior handoff or Booster request is explicitly continued.
3. Separate the objective, facts, User decisions, evidence, unknowns,
   constraints, stop reasons, and available artifact references. Do not turn a
   guess into a fact or an implicit preference into acceptance.
4. Determine `INDIVIDUAL` or `TEAM`. Use `TEAM` only when shared ownership,
   role boundaries, parallel work, or independent review gates materially
   affect delivery.
5. Normalize the fields using `../../assets/booster-mode-contract.md`. When a
   specific independent Skill was requested, set `preferredSkill`; otherwise
   leave it `null`.
6. When the bundled Node helper can be resolved safely from this installed
   plugin, pass the exact request JSON over standard input to:

   `node <plugin-root>/scripts/booster.mjs --stdin`

   Never interpolate request content into a shell command. If Node or the
   helper is unavailable, read `../../registry/skill-registry.json`, apply the
   same declared contracts manually, and label the projection
   `HELPER_NOT_VERIFIED`; do not fabricate a successful helper run.
7. Narrate the returned projection in the User's language. Keep status tokens,
   artifact types, Skill IDs, and invocation strings unchanged.

## Response contract

Return one compact Compass with:

- session mode, collaboration mode, objective, and observed stage;
- current status: `READY`, `WAITING_FOR_DECISION`, `NEEDS_INPUT`, `COMPLETE`,
  `STOPPED`, or `UNKNOWN`;
- relevant facts, User decisions, evidence, constraints, and unknowns;
- blockers and the exact human decision frontier;
- one recommended Skill with reason and host-native invocation;
- runnable alternatives from `availableSkills`;
- the next bounded action;
- `RECOMMENDATION_ONLY`, `executionPerformed: false`, and
  `persistencePerformed: false`.

Ask only the next material question when input or a decision gate is missing.
For `READY`, ask whether the User wants to invoke the recommended Skill, choose
an alternative, continue without the Kit, or stop. Do not invoke it yourself.

## Stop conditions

Return `STOPPED` when authority, scope, target, or safety is unresolved. Return
`UNKNOWN` when evidence is missing or contradictory and no declared Skill can
proceed safely. Preserve the exact reason and next safe action.
