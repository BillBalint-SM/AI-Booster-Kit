# Experiment Brief — AI Booster Proof Pack on GitHub

Status: `MINIMAL_REFERENCE_SUMMARY_DOGFOOD_COMPLETE`

Experiment ID: `ABK-EXP-PROOF-PACK-01`

AI Booster Kit source revision: `2a08361066c4baad8d75b42e123044f043335fe3`

Observed feature revision: `d1649e459b6067b721270ea86218d590501c0f44`

Outcome owner: User

Minimal PP-01–PP-03 implementation and GitHub observation: `AUTHORIZED_AND_COMPLETED_2026-08-21`

Broader Proof Pack implementation, required-check configuration, fork test,
artifact upload, public Action publication and external pilot recruitment:
`NOT_AUTHORIZED`

## 2026-08-21-i legkisebb referenciapróba eredménye

Az elfogadott [PP-01–PP-03 queue](TASKS.md) a briefnél szűkebb kérdést
tesztelt: értelmezhető-e a meglévő `FlowAssuranceReport` determinisztikus
Markdown-vetülete egy natív GitHub Job Summaryban új séma, dependency,
permission vagy artifact nélkül?

- A [draft PR #58](https://github.com/BillBalint-SM/AI-Booster-Kit/pull/58)
  pull-request runja `success` lett mind a hat checken.
- A
  [summary-producing job](https://github.com/BillBalint-SM/AI-Booster-Kit/actions/runs/32520815426/job/96892380286)
  az exact feature revisionön sikeresen renderelte a complete, waiting és
  foreign-receipt referenciaesetet.
- Két független sub-agent reviewer mindhárom esetben helyesen nevezte meg az
  állapotot, a hiányzó döntést vagy evidence-et és a következő safe actiont;
  egyik sem értelmezte a summaryt change approvalként vagy execution
  authorityként.
- Mindkét reviewer ugyanazt az opcionális wording-jelet adta: a complete
  esetben legyen még világosabb a korábbi plan acceptance és a végső Handoff
  acceptance közötti különbség.

Ez same-repository UI- és érthetőségi evidence H4 egy szűk részéhez. Nem
bizonyít keresletet, review-idő javulást, fork-paritást, public Actiont,
repository readbacket, downloadable artifactot, stale/scope-drift detektálást
vagy a brief egészére vonatkozó `GO` döntést.

## Döntés, amelyet a kísérletnek elő kell készítenie

Érdemes-e az AI Booster Kit első GitHub-native termékszeleteként egy
hostfüggetlen Proof Packet építeni, amely az AI-val készített változtatás
scope-ját, acceptance criteria-jait, friss evidence-ét, explicit unknownjait és
emberi checkpointjait egy lokálisan és pull requestben is ellenőrizhető
csomagként mutatja?

A brief nem fogadja el ezt a termékirányt. Olyan legkisebb kísérletet definiál,
amely képes azt támogatni, módosítani vagy elvetni.

## Forrás és termékhatár

- A kutatási alap a
  [GitHub feature-opportunity report](../../../../research/2026-08-21-ai-booster-kit-github-feature-opportunities.md).
- A [Vision Contract](../../../../VISION.md) megköveteli az emberi kontrollt,
  inspectálható evidence-et és explicit bizonytalanságot; kizár új runtime-ot,
  automatikus agent-loopot és rejtett külső írást.
- A [Domain](../../../../DOMAIN.md) szerint a receipt megfigyelési rekord:
  önmagában nem ad authorityt és nem bizonyítja a hivatkozott bájtokat.
- A jelenlegi [Flow Assurance](../../../handbook/flow-assurance.md) tiszta,
  állapotmentes assessorral ellenőrzi a package-, Stage receipt- és Checkpoint
  kötéseket. Inputváltozás új package identityt hoz létre és érvényteleníti a
  régi receipteket.
- A jelenlegi assessor nem olvassa vissza az artifact bájtokat, nem futtat
  tesztet, nem hitelesít személyt és nem bizonyít GitHub enforcementet. Ezeket
  az experiment nem állíthatja kész capabilityként.

## Validálandó hipotézisek

| ID | Hipotézis | Falszifikáló jel |
| --- | --- | --- |
| H1 — probléma | Az AI-heavy maintainer vagy reviewer számára a criterion-linked evidence és a látható hiány gyorsabb, helyesebb döntést ad, mint a diff + szabad szöveges PR-leírás. | A kontrollált review-feladatokban nincs javulás a helyes döntésben, vagy a Proof Pack csak új ellenőrzési terhet ad. |
| H2 — használhatóság | Egy új felhasználó helyben 10, az engedélyezett GitHub próbában 15 percen belül elő tud állítani és értelmezni egy Proof Packet. | A medián idő túllépi a megfelelő küszöböt, vagy a résztvevők több mint 10%-a approvalként értelmezi a csomag technikai állapotát. |
| H3 — integritás | A verifier minden kontrollált foreign receiptet, scope-driftet és stale evidence-et láthatóvá tesz. | Bármely kontrollált mutáció friss vagy elfogadott evidence-ként jelenik meg. |
| H4 — GitHub-illeszkedés | Egy read-only, információs Action a PR döntési felületén használható anélkül, hogy write tokent, secretet vagy default merge gate-et kérne. | A szükséges élmény write permissiont, `pull_request_target` eseményt, rejtett külső tárolást vagy félreérthető zöld approvalt igényel. |
| H5 — hordozhatóság | Ugyanaz a canonical input és verifier-eredmény legalább két agent host után megőrizhető. | A Proof Pack csak host-specifikus transcriptből vagy nem portábilis runtime-state-ből állítható elő. |

Az első persona csak hipotézis. A problémafázis legalább három jelöltet vet
össze: AI-heavy OSS maintainer, reviewer/tech lead és platform engineer.

## Legkisebb kísérleti termék

Az MVP egy referencia-folyamat, nem publikus termékkiadás:

1. **Kísérleti Proof Pack input** — meglévő Flow request/assessment, current
   commit, declared scope és acceptance-criterion mapping. Nincs publikus
   compatibility promise.
2. **Helyi verifier/renderer** — a jelenlegi pure assessor eredményét és a
   kísérlethez engedélyezett repository-readbacket egy canonical JSON és egy
   emberi Markdown summary formába vetíti.
3. **Integritási fixture-ök** — valid, decision-needed, stopped/unknown,
   foreign-receipt, stale-commit és forbidden-path eset.
4. **Információs GitHub wrapper** — ugyanazt a helyi parancsot futtatja,
   Job Summaryt és letölthető artifactot készít. Nem kommentel, nem merge-el,
   nem módosít repositoryt.
5. **Handoff Capsule** — objective, scope, evidence state, unknowns, stop
   reason és egyetlen következő bounded action; nincs transcript-archiválás.

Implementációs függőség:

```text
fixture contract
  → existing assessFlow projection
    → bounded repository readback
      → local canonical Proof Pack
        → GitHub rendering wrapper
          → handoff export
```

## Nem része az experimentnek

- új Agent, Model, runtime, orchestrátor vagy automatikus Skill-láncolás;
- publikus séma-stabilitás vagy általános interoperability standard;
- GitHub App, SaaS, adatbázis, telemetry vagy külön harmadik félhez tartozó
  artifact store;
- PR-komment, issue-írás, auto-merge, deployment vagy required check;
- approval identity kriptográfiai vagy szervezeti hitelesítése;
- Marketplace, release, attestation, SARIF, Scorecard vagy security badge;
- tetszőleges parancs futtatása a receipt tartalmából;
- valódi ügyfélkód vagy secret használata az első fixture/pilot körben.

## Event- és permission-mátrix

Ez tesztelendő szerződés, nem kész GitHub capability-állítás.

| Felület / esemény | Tervezett permission | Secret | Kísérleti státusz |
| --- | --- | --- | --- |
| Helyi fixture | nincs GitHub token | nincs | Első bizonyítási felület |
| `pull_request`, azonos repository | `contents: read` | nincs | Draft PR #58-on megfigyelt `PASS` a három szintetikus summary-esetre |
| `pull_request`, fork | `contents: read`; fork checkout külön threat case | nincs | Kötelező negatív/biztonsági próba |
| `push`, referenciaág | `contents: read` | nincs | Opcionális paritási próba |
| `pull_request_target` | nem engedélyezett | nem alkalmazható | Kizárt |
| `issue_comment`, `workflow_run`, schedule | nem engedélyezett | nem alkalmazható | Kizárt az első kísérletből |
| Required status check | repository-owner döntést igényelne | nem alkalmazható | Kizárt; az Action információs |

A GitHub támogat Job Summaryt és workflow annotationt, de ez nem bizonyít
azonos UI-viselkedést minden fork- és permission-esetben. A későbbi, külön
engedélyezett reference-repository próbának ezt ténylegesen meg kell figyelnie.
[GitHub workflow commands](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands),
[secure use reference](https://docs.github.com/en/actions/reference/security/secure-use).

## Biztonsági és adatkezelési guardrail

- `permissions: contents: read`; minden más permission explicit `none`;
- nincs `pull_request_target`, write token, secret vagy harmadik félhez
  irányuló hálózati küldés; egy később engedélyezett reference run kizárólag
  GitHub workflow artifactot tölthet fel;
- a bemeneti fájlméret, séma, repository-relative út és symlink-kezelés
  fail-closed validációt kap;
- a receipt nem adhat át futtatandó shell parancsot;
- a kimenetből secret, prompt, transcript, abszolút helyi út és személyes adat
  kimarad vagy redaktálódik;
- third-party Action csak teljes commit SHA-ra pinelve használható;
- a job neve és summaryje mindig tartalmazza: `INFORMATIONAL — HUMAN DECISION
  REQUIRED`;
- a GitHub job technikai conclusionje nem jelent change approvalt;
- `PARTIAL`, `UNPROVEN`, `STALE` és `UNKNOWN` nem jelenhet meg implicit
  zöld üzleti állapotként.

## Kísérleti elrendezés

### A. Problémainterjú

- 8 résztvevő a három persona-jelöltből;
- 20–30 perces, repository- és tooling-semleges interjú;
- kérdések: utolsó AI-PR review, hiányzó evidence, átadás, hostváltás, téves
  bizalom és jelenlegi workaround;
- stop, ha nincs ismétlődő probléma vagy a megoldást már a meglévő CI/PR
  sablon teljesen lefedi.

### B. Lokális technikai falszifikáció

- ugyanaz a fixture kétszer ugyanazt a canonical outputot adja;
- az öt negatív fixture mind látható, nem elfogadott állapotot ad;
- a jelenlegi `assess-flow` jelentése és exit-code contractja nem változik
  rejtetten;
- egy fresh clone dokumentáltan 10 percen belül előállítja az első packet.

### C. Párosított reviewer-próba

- 5–8 fejlesztő;
- két hasonló, szintetikus PR, ellenkiegyensúlyozott sorrendben: egyik baseline
  diff + PR-leírás, másik Proof Pack;
- esetek: teljes evidence, egy unproven criterion, stale commit és scope drift;
- mérés: helyes döntés, evidence-gap felismerés, döntési idő, indoklás és
  félreértett check-state.

### D. GitHub referencia-próba

Csak külön, pontos külső publikálási engedély után:

- azonos-repository és fork PR;
- read-only permission és secret nélküli futás;
- local/CI canonical parity;
- UI-screenshot és event/permission evidence;
- semmilyen required-check vagy Marketplace-beállítás.

## Előre rögzített sikerkritériumok

| Metrika | GO küszöb |
| --- | --- |
| Problémainterjú | legalább 5/8 résztvevő ugyanazt az evidence/review/handoff problémát saját példával igazolja |
| Helyes reviewer-döntés | legalább 20 százalékpontos javulás a baseline-hoz képest |
| Reviewer döntési idő | legalább 25% medián javulás, a helyesség romlása nélkül |
| Time to First Proof | fresh clone helyben ≤10 perc; engedélyezett GitHub próbában ≤15 perc |
| Determinizmus és local/CI parity | 100% a rögzített fixture corpuson |
| Foreign/stale/drift felismerés | 100% a kontrollált negatív fixture-ökön |
| Unsafe merge-ajánlás | 0 a stale, drift és unproven esetekben |
| Információs check approvalként értelmezése | <10%; bármely eset kvalitatív elemzést igényel |
| Külső write, secret exposure | 0 |
| Fresh-session handoff | legalább 80% helyes folytatás vagy indokolt stop tisztázó kör nélkül |

A küszöbök termékhipotézisek, nem meglévő eredmények. A kis minta irányt ad,
nem statisztikai piaci bizonyíték.

## Döntési szabály

- **GO:** H1–H4 eléri a küszöböt, nincs unsafe pass vagy authority-scope
  törés. Következő döntés lehet a publikus interchange contract és release
  előkészítése.
- **ITERATE:** a probléma igazolt, de a UI, státusznyelv, first-run vagy
  GitHub event modell félreértést okoz. Csak a hibás réteg módosítható.
- **STOP:** nincs visszatérő probléma, nincs mérhető reviewer-előny, a
  megoldás runtime/SaaS/write authority nélkül nem működik, vagy a zöld
  GitHub-check tartósan approval-illúziót hoz létre.

Bármely unsafe pass, secret exposure, nem engedélyezett write vagy
`pull_request_target`-függőség azonnali stop.

## Elvárt evidence és handoff

Az experiment végén egy review-ready csomag szükséges:

- interjújegyzetek anonimizált problémamintái;
- verziózott fixture corpus és expected output;
- local/CI parity eredmény;
- event/permission tesztmátrix;
- reviewer-próba nyers, anonimizált mérési táblája;
- eltérések, incidensek, unknownok és limits;
- `GO / ITERATE / STOP / UNKNOWN` döntési handoff.

GitHub star, install és Marketplace-view nem elsődleges sikermetrika.

## Unknowns

- melyik persona mutatja a legerősebb, ismétlődő problémát;
- a legkisebb acceptance-to-evidence mapping, amely nem duplikálja a Flow
  contractot;
- a bounded repository-readback pontos adapterhatára;
- a GitHub job conclusion félreérthetősége fork és partial/unknown esetben;
- a receipt redaction és artifact-retention minimuma;
- a második host kiválasztása H5 teszteléséhez;
- szükséges-e később identity-provenance, és ha igen, mely host marad a source
  of truth.

## Következő bounded action

A User a PP-03 bizonyíték és az egyetlen közös wording-jel alapján dönthet
`STOP`, `ITERATE` vagy `PROMOTE` között. Az `ITERATE` legkisebb jelöltje kizárólag
a plan acceptance és a final Handoff acceptance megkülönböztetése. Egyik döntés
sem engedélyez fork-próbát, artifact uploadot, public Actiont, required checket,
Marketplace-műveletet, pilot-meghívást, merge-et vagy release-t.
