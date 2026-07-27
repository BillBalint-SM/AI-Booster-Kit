# Gate 2 — eddigi eredmények és következő lépések

**Dátum:** 2026-07-27
**Aktív worktree:** `codex/gate-1-research`
**Jira projekt:** [G2AS](https://pte-politechnika.atlassian.net/jira/software/c/projects/G2AS/boards/133)
**Bizonyítékminőség:** `user-attested, connector-unverified` az Atlassian connector útvonalon

## Vezetői összefoglaló

A Gate 2 sandbox alapjai létrejöttek, a szintetikus Jira–GitHub–Confluence nyomkövetési lánc működik, és egy külön jóváhagyott Jira web-link írás sikeresen végigment forrásnatív böngészőből. A Jira maradt a lifecycle igazságforrása; a GitHub és Confluence kiegészítő bizonyíték/projekció.

A read-only és manuális útvonalak használhatók, de két fontos korlát megmaradt:

1. Az Atlassian connector nem bizonyította a PTE/G2AS célizolációt.
2. A Rovo host-összehasonlítás nem promotálható, mert a Codex-oldali keresési felület más Atlassian cloudból adott vissza eredményt; a futást azonnal leállítottuk.

## Létrejött sandbox-elemek

| Rendszer | Eredmény |
| --- | --- |
| Jira Cloud | Company-managed `G2AS` projekt; egy szintetikus Story: [G2AS-1](https://pte-politechnika.atlassian.net/browse/G2AS-1), státusz: `To Do` |
| Jira Story | `[G2AS pilot] Show a synthetic health-status badge`; négy elfogadási kritérium: három állapot renderelése, determinisztikus mapping tesztekkel, akadálymentes címke, valamint artifact/test linkelése Review előtt |
| GitHub | Privát [BillBalint-SM/ultimate-longshot-gate2-sandbox](https://github.com/BillBalint-SM/ultimate-longshot-gate2-sandbox), `main` ág |
| Git fixture | Commit [`d0971f7`](https://github.com/BillBalint-SM/ultimate-longshot-gate2-sandbox/commit/d0971f75c526250f9ee65b8b3b044a4788b31a46), benne pontosan két szintetikus fixture: `docs/fixtures/G2AS-1.md` és `docs/fixtures/G2AS-1.json` |
| Confluence | Privát `Gate 2 AI Sandbox` / `G2AS` space és a [G2AS-1 projection oldal](https://pte-politechnika.atlassian.net/wiki/spaces/G2AS/pages/31752193/G2AS-1+Synthetic+health-status+badge+projection) |

## Taskonkénti eredmények

### Task 1–2 — lokális terv és GitHub sandbox

- A Gate 2 design és végrehajtási terv elkészült.
- A jóváhagyott GitHub tulajdonos alatt létrejött és source-native módon vissza lett olvasva a privát sandbox repository.
- A repository `main` alapágát, leírását, jogosultsági állapotát és üres issue-listáját ellenőriztük.
- A korábbi, nem jóváhagyott repository-tulajdonos incidense dokumentálva és szanitizálva maradt; abból nem származik további művelet.

### Task 3 — Jira/Confluence sandbox és target inventory

- A tényleges kulcs `G2AS`; az eredeti `G2AI` csak történeti hivatkozásként maradt meg.
- Jira és Confluence sandbox-határok, owner-szerepek, audit- és visszavonási utak rögzítve vannak.
- A connector a PTE erőforráskérést query előtt elutasította, ezért connector-általi validáció nincs.

### Task 4 — identity, OAuth és Rovo policy

- Nincs és nem lesz külön pilot user.
- A named-user OAuth csak diagnosztikai, nem izoláló útvonalként lett definiálva.
- Az engedélyezett REST allowlist kizárólag a `GET /ex/jira/{PTE-cloud-id}/rest/api/3/project/G2AS` útvonal lett volna.
- Az OAuth-app kézi beállítása böngésző-runtime `EPERM` miatt blokkolt; app, token vagy szélesebb scope nem jött létre.
- Rovo Write tiltott határként maradt definiálva.

### Task 5 — szintetikus fixture-lánc

- A Jira Story, a két immutable Git fixture és a Confluence projection elkészült és source-native módon vissza lett olvasva.
- A Jira issue maradt a lifecycle truth.
- Concern: a Confluence access read-back `Anyone in the space can edit` állapotot jelzett; ez örökölt space-szintű szerkesztési hozzáférés, nem publikus megosztás.

### Task 6 — manuális read-only baseline és negatív fixture-ek

- A Jira kulcs, summary, mind a négy acceptance criterion, Git SHA és Confluence projection reprodukálhatóan visszakereshető.
- A lokális hibás JSON `MALFORMED_CONTEXT`, a szándékosan régi SHA `STALE_CONTEXT` besorolást kapott; egyik sem indított source-műveletet.
- A közvetlen REST valid, unauthorized, unknown-key és rate/error esetek `BLOCKED/NOT EXECUTED` állapotban maradtak az OAuth-runtime korlát miatt.
- A read-only szakaszban nem történt Jira transition/edit/comment/link, Confluence publish, Git write vagy Rovo Write.

### Task 7 — Rovo összehasonlítás

- Codex-oldali Rovo probe: `SCOPE_VIOLATION_STOP`; a keresési felület nem tartotta be a PTE/G2AS target boundary-t, ezért az eredményt nem használtuk fel.
- Cursor és Claude Code ebben a végrehajtási környezetben nem volt csatlakoztatva; query nem történt.
- Nem történt retry, identity-bővítés, permission-bővítés vagy Rovo Write.
- A Rovo candidate promóciója elutasítva; újrafuttatás csak target-isolation remediation után jöhet szóba.

### Task 8 — egyetlen jóváhagyott Jira web-link írás

- Exact-URL pre-read: `0` meglévő találat.
- A Jira `Add web link` űrlapon egyszer, a pontos immutable Git commit URL-re történt írás.
- Post-read: a Jira Web links listában megjelent az egyetlen linkrekord; a UI ezt két anchor-megjelenítéssel (cím + URL) rendereli.
- History read-back: pontosan egy Git `RemoteWorkItemLink` esemény:

  `This work item links to "<commit URL> (Web Link)"`

- A státusz változatlanul `To Do`.
- Nem történt státusz-, mező-, AC-, komment-, attachment-, Automation- vagy Rovo Write-művelet.
- Retry vagy recovery write nem kellett; a link eltávolítása külön owner-jóváhagyást igényelne, és nem történt meg.

## Jelenlegi állapot és korlátok

**Állapot:** Task 9 `COMPLETE_WITH_LIMIT`; az összesített döntés `remediate and repeat`.

**Megmaradt korlátok:**

- Atlassian connector: `user-attested, connector-unverified`.
- Közvetlen REST: nem futott le, mert az OAuth-app setup `EPERM` miatt blokkolt.
- Rovo: target-isolation probléma miatt nem promotálható.
- Confluence: space-szintű edit hozzáférést külön érdemes felülvizsgálni.
- A Gate 2 lokális dokumentációja az aktív worktree-ben uncommitted/untracked állapotban maradt.

## Következő lépések

### Task 9 — scorecard és döntés — elkészült

Az evidence-alapú scorecard elkészült. A kontrollcsoport és a mérési eseményhatárok hiánya miatt nincs százalékos javulási állítás, és a hiányzó futások `unknown`/`not comparable` állapotban maradtak.

Az útvonal-döntések:

- **retain:** manuális source-native Jira/Git/Confluence útvonal;
- **narrow/remediate:** csak szűk, explicit allowlisttel működő direct REST/OAuth diagnosztikai útvonal;
- **remediate:** Atlassian target isolation és Confluence jogosultsági modell;
- **reject/remediate:** jelenlegi Rovo keresési útvonal promóciója és minden újrafuttatás a target-isolation javítás előtt;
- **retain as bounded one-off:** a Task 8-ban végrehajtott, egyetlen Jira web-link írási szerződés, általános agent write-promóció nélkül.

Az összesített döntés: **`remediate and repeat`**. A Rovo scope-violation stop miatt a jelenlegi Rovo útvonal nem promotálható; direct REST-en nem készült OAuth app/token és nem futott query; a manuális útvonal bizonyítottan használható.

A scorecard kötelező dimenziói: minőség, biztonság, traceability, autonómia, Jira-frissesség, sebesség, költség és auditálhatóság. Ismeretlen adatot `unknown`-ként kell hagyni, nem szabad becsülni.

### 1. Atlassian connector target-isolation remediation

Külön, friss jóváhagyással vizsgáljuk meg, hogyan kényszeríthető ki a PTE cloud- és `G2AS`-scope. Addig nincs új Rovo próba, nincs retry és nincs szélesebb permission.

### 2. OAuth diagnosztikai útvonal — opcionális

Ha szükséges, a named-user OAuth setupot a chat-en kívül, kézzel kell helyreállítani. A scope maradjon read-only és az egyetlen engedélyezett PTE/G2AS endpointre korlátozott; külön pilot user vagy admin scope nem indokolt.

### 3. Confluence jogosultság-review

Ellenőrizzük, hogy a private space örökölt `Anyone in the space can edit` jogosultsága megfelel-e a pilotnak. Módosítás csak külön owner-jóváhagyással és auditált, visszaállítható művelettel történjen.

### 4. Lokális dokumentáció gitbe emelése

A design, plan, evidence, Task 8 report és ez az összefoglaló jelenleg uncommitted/untracked. Commit és push csak külön jóváhagyással; addig ez a felülvizsgálati állapot.

## Hivatkozott lokális artefaktumok

- [Gate 2 evidence](./g2ai-pilot-evidence.md)
- [Gate 2 plan](../superpowers/plans/2026-07-27-gate-2-jira-sandbox-pilot.md)
- [Gate 2 design](../superpowers/specs/2026-07-27-gate-2-jira-sandbox-pilot-design.md)
- [Agent operating model](../operations/agent-operating-model.md)
- [Jira–Git–Confluence domain adapter](../operations/jira-git-confluence-adapter.md)
- [G2AS research and validation runbook](../operations/g2as-research-validation-runbook.md)
- [Task 8 report](../../.superpowers/sdd/2026-07-27-gate-2-jira-sandbox-pilot/task-8-report.md)
- [Task 8 brief](../../.superpowers/sdd/2026-07-27-gate-2-jira-sandbox-pilot/task-8-brief.md)
- [Gate 2 progress ledger](../../.superpowers/sdd/2026-07-27-gate-2-jira-sandbox-pilot/progress.md)
- [Agent operating model baseline plan](../superpowers/plans/2026-07-27-agent-operating-model-baseline.md)
- [Common-core/domain-adapter separation plan](../superpowers/plans/2026-07-27-layer-separation-common-core.md)

## Context-switch handoff

- Gate 1 research and audit are complete and already present in the branch history.
- Gate 2 Tasks 1–9 are documented in the evidence, task reports, progress ledger, and this summary; the overall decision is `remediate and repeat`.
- The local implementation plan at `docs/superpowers/plans/2026-07-27-agent-operating-model-baseline.md` was explicitly approved and executed in this worktree.
- A focused correction then separated the domain-independent common core from the Jira/Git/Confluence adapter; the current slice is recorded in `docs/superpowers/plans/2026-07-27-layer-separation-common-core.md`.
- The current worktree contains no application build/test manifest; this slice implemented documentation plus synthetic local validation, not a live Jira/Rovo/OAuth change.
- No permission change, OAuth identity, Rovo retry, or additional external write occurred in this implementation slice.

## Host activation milestone

The host-native adapter and team activation slice is now documented:

- [Host-native adapters and team activation plan](../superpowers/plans/2026-07-27-host-native-adapters-team-activation.md)
- [Codex host adapter](../operations/host-adapters/codex.md)
- [Cursor host adapter](../operations/host-adapters/cursor.md)
- [Claude Code host adapter](../operations/host-adapters/claude-code.md)
- [Team activation guide](../operations/team-activation-guide.md)

These documents define how to express the common core in each host and how to activate it on a bounded task. They intentionally do not create host configuration, install or enable tools, grant permissions, or authorize external writes. Host runtime conformance remains unvalidated until each host is executed against the same bounded read-only cohort.

## Next bounded validation slice

The approved next step is the [three-host read-only conformance pilot plan](../superpowers/plans/2026-07-27-host-conformance-pilot.md), using the [frozen pilot protocol](../operations/host-conformance-pilot.md) and one [evidence template per host](../operations/host-conformance-evidence-template.md). The pilot starts with strong single-agent execution and stops before any domain adapter or external write operation.

The first Codex run is recorded in [Codex conformance evidence](../operations/host-conformance-runs/codex-2026-07-27.md). It is `FAIL` with bounded evidence: the local read completed, but native instruction loading was `UNKNOWN`, the first read-only sandbox spawn failed before an elevated local retry, and the response omitted the complete layer mapping. No domain or external write pilot is promoted from this result.

## Implemented local operating contract

- The domain-independent core now documents the `observe → validate → plan → coordinate → execute → verify → hand off` lifecycle and the eight control-flow patterns plus governance overlays.
- Jira/Git/Confluence source truth, artifact, approval, write, read-back, audit, and recovery rules are isolated in the domain adapter. Strong single-agent execution remains the first model to validate; the other patterns require separate comparable pilots.
- The G2AS research/validation runbook defines the accepted `G2AS-1` input contract, `MALFORMED_CONTEXT`, `STALE_CONTEXT`, `SCOPE_VIOLATION_STOP`, `BLOCKED / NOT EXECUTED`, `PASS`, and `UNKNOWN` classifications, and the no-write baseline.
- These local implementation contracts do not prove Atlassian connector target isolation, OAuth behavior, tenant permissions, latency, cost, or Codex/Cursor/Claude Code runtime behavior.
- The host-native adapter and team activation slice is complete as documentation; no host configuration file was created by this implementation.
