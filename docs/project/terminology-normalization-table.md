# AI Booster Kit – Terminology Normalization Table

**Status:** DRAFT – editable working table.

This is one editable A/B/C table for normalising the project language. Delete
rows, rewrite cells, or add rows directly. A change here is a proposed domain
decision until it is explicitly accepted and migrated into the applicable
canonical contract, workflow, or runtime model.

| # A – Theme or term | B – Current meaning or discrepancy | C – Simple target / canonical meaning |
|---|---|---|
| Hierarchy | | One delivery hierarchy: `Vision → Roadmap → Milestone → Epic → Work Item`; a Work Item is a `Story`, `Task`, or `Bug`. |
| Feature | | A `Feature` is an Epic's realizable functional value and working result; it is not a hierarchy level. |
| Work Artifact |  | Széles, különböző részegységeket összefoglaló csoportfogalom. A hierarchy-elemekhez, Plan-ekhez vagy a Platformhoz tartozó dokumentációs leírások, megállapítások, valamint a Platform által generált vagy kezelt elemek gyűjtőneve. A Plan/specification és a Handoff Work Artifact-fajta. |
| `DONE` |  | Jira board status is `DONE`; session result is `DONE`. |
| Plans / specifications |  | Work Artifact egy fajtája, Only active design stays active. Executed or superseded material moves to history. |
| Vision |  | `Vision` is the durable product goal and why. |
| Roadmap |  | `Roadmap` is the strategic sequence of Milestones. |
| Milestone |  | `Milestone` is a verifiable business/delivery result composed of Epics. |
| Epic | | `Epic` is one bounded, independently deliverable part of a Milestone. |
| Work Item |  | `Work Item` is the common name for an Epic child: `Story`, `Task`, or `Bug`. |
| Scenario |  | `Scenario` is a reusable user job with a declared trigger, input, flow, output, and stop condition. |
| Session |  | `Session` is one concrete, time-bounded run of one Scenario. |
| Workflow |  | `Workflow` is a durable organisational operating process, such as the Team Delivery Loop. |
| Handoff | |Work Artifact egy fajtája, `Handoff` is a revisioned transfer record attached to a Milestone or Epic; it is not a hierarchy level. |
| Evidence |  | `Evidence` is a verifiable fact or reference supporting a claim or acceptance criterion. |
| `jira_board_status` | | Use only for the external/board lifecycle. Work arctifact-okon megjelenhet mint aktuális státusz/állapot ha "Platform" <---> "Jira Board" sync rendelkezésre áll. |
| `platform_session_status` |  | A Scenario Session életciklusa: `NEW` (új session), `RESUMABLE` (elkezdett, megszakított, de biztonságosan folytatható session), `DONE` (befejezett session) vagy `STOPPED` (végleg megszakított vagy elvetett session; csak historikus adat). |
| `session_resolution` |  | A kiértékelt session-eredmény külön tengelye: `UNKNOWN`, `CONFLICT` vagy `SCOPE_CHANGED`. A `SCOPE_CHANGED` azt jelzi, hogy az explicit scope-change döntés már megtörtént; nem függőben lévő változtatási kérés. A korábbi rekord megmarad, az új scope-ot és acceptance boundary-t újra kell értékelni. |
| `readiness_status` |  | Use `PROPOSED`, `CONFIRMED`, `READY_WITH_LIMIT`, and `READY_FOR_FAN_IN` only for decision/readiness state. |
| `execution_status` |  | Use only for the fact and limit of actual execution. |
| `observed_behavior` |  | Use `PASS`, `FAIL`, or `UNKNOWN` only for the observed behaviour under verification. |
| `revision_status` |  | Use only for the validity of a versioned record. |
