# AI Booster Kit — GitHub terméklehetőségek fejlesztőknek és AI-felhasználóknak

Státusz: kutatási ajánlás, nem elfogadott roadmap és nem implementációs felhatalmazás

Ellenőrizve: 2026-08-21

Kutatási fókusz: fejlesztői igény, agent-ökoszisztéma, GitHub-adoptáció és a jelenlegi termékhatár

## Szűk referencia-evidence frissítés

A kutatás után engedélyezett legkisebb technikai próba nem a teljes ajánlott
Proof Pack-et építette meg. A meglévő Flow Assessment determinisztikus Markdown
vetületét tette láthatóvá ugyanennek a repositorynak egy read-only, secret
nélküli [draft PR-jában](https://github.com/BillBalint-SM/AI-Booster-Kit/pull/58).
A CI mind a hat checkje sikeres lett, és két független reviewer helyesen olvasta
a complete, waiting és foreign-receipt eset állapotát, hiányát és következő safe
actionjét. Egyik sem látott change approvalt vagy execution authorityt.

Ez közvetlen evidence arra, hogy a natív GitHub Job Summary a három szintetikus
esethez új permission és külön infrastruktúra nélkül használható. Nem validálja
a piaci keresletet, baseline-hoz mért reviewer-előnyt, fork-viselkedést,
downloadable artifactot, nyilvános Actiont vagy a BUILD NOW teljes szeletét.
Mindkét reviewer ugyanazt a wording-kérdést jelezte: a plan acceptance és a
final Handoff acceptance legyen még egyértelműbben elkülönítve. A részletes
evidence a [PP-03 queue-ban](../docs/planning/ai-booster-kit/proof-pack-github-experiment/TASKS.md)
található.

## Vezetői ajánlás

Az AI Booster Kit ne egy újabb agent-runtime, promptcsomag vagy több-agent
orchestrátor legyen. Ezeket a képességeket a fő hostok már natívan kínálják.
A legerősebb pozíció:

> **hostfüggetlen delivery-assurance réteg, amely az AI-val készített
> változtatást bizonyítékot hordozó, ember által ellenőrizhető és GitHubon
> döntési inputként review-zható csomaggá alakítja.**

A termék rövid ígérete:

> **„Ne csak azt mutasd meg, mit írt az AI. Mutasd meg, mi volt jóváhagyva,
> mely elfogadási feltételt milyen friss bizonyíték támaszt alá, mi maradt
> ismeretlen, és folytatható-e biztonságosan egy másik emberrel vagy agenttel.”**

**Első validálandó persona-hipotézis** az AI-t intenzíven használó fejlesztő
vagy open-source maintainer, aki több host között mozog, de a pull request
minőségéért továbbra is ő felel. A második jelölt persona a reviewer vagy tech
lead; a platform/security csapat csak a következő lépcső. A források a
bizalom- és evidence-problémát alátámasztják, ezt a konkrét persona-sorrendet
nem.

A javasolt első nyilvános vertikális szelet:

1. Portable Delivery Receipt és Acceptance-to-Evidence Map;
2. helyi `booster verify` plusz csak olvasó, alapból információs GitHub
   Action, Job Summary és letölthető Proof Pack;
3. scope-, jóváhagyás- és evidence-frissesség ellenőrzése;
4. portábilis Handoff Capsule.

Ez egyetlen termékélmény, nem négy párhuzamos projekt.

## Kutatási kérdés és döntési szabály

### Scope

Olyan funkciók azonosítása, amelyek 2025–2026-ban:

- valódi fejlesztői vagy AI-munkafolyamatbeli fájdalmat oldanak;
- illeszkednek a jelenlegi [VISION](../VISION.md), [DOMAIN](../DOMAIN.md) és
  [current state](../docs/project/current-state.md) határához;
- GitHubon kipróbálhatók és inspectálhatók;
- hostfüggetlenek maradnak;
- nem igényelnek autonóm futtatókörnyezetet vagy rejtett külső műveletet.

### Elfogadási kritérium

Egy ajánlott funkcióhoz meg kell nevezni:

- a célpersonát és problémát;
- a külső vagy belső bizonyítékot;
- a legkisebb értékes MVP-t;
- a megkülönböztetést;
- egy mérhető sikerjelet;
- a fő biztonsági vagy termékhatár-kockázatot.

### Evidence boundary

**Tények:** elsődleges, hivatalos dokumentációból, felmérésből, specifikációból
vagy a repository jelenlegi állapotából származnak.

**Következtetések:** a forrásokból levont, külön jelölt termékértelmezések.

**Ajánlások:** tesztelendő hipotézisek; nem bizonyított kereslet, nem
megvalósítási döntés és nem külső publikálási engedély.

**Stop condition:** a kutatás akkor tekinthető késznek, ha van rangsorolt
`BUILD NOW / NEXT / LATER / REJECT` portfólió, első vertikális szelet,
mérési terv és látható ismeretlenlista.

## Mit mondanak az adatok?

| Ellenőrzött jel | Mit bizonyít | Termékkövetkeztetés |
| --- | --- | --- |
| A 2025-ös Stack Overflow felmérésben 84% használ vagy tervez használni AI-eszközt, ugyanakkor 46% inkább nem bízik az eredmény pontosságában, míg 33% bízik benne. A leggyakoribb frusztráció az „majdnem jó” eredmény (66%), és 45% szerint az AI-kód hibakeresése időigényesebb. [Forrás](https://survey.stackoverflow.co/2025/ai) | Az AI-használat és az AI-eredménybe vetett bizalom eltérő probléma. | Az érték nem több generálás, hanem gyorsabb és átláthatóbb bizonyítás. |
| Ugyanebben a felmérésben 76% nem tervezi az AI-t deployment/monitoring feladatra, 69% projekttervezésre; 75% továbbra is embert kérne, ha nem bízik a válaszban. Az agent-használók között csak 17% látott jobb csapat-együttműködést. [Forrás](https://survey.stackoverflow.co/2025/ai) | A felelősségteljes döntés és a csapatszintű átadás nincs megoldva pusztán agenttel. | Emberi gate, handoff és explicit unknown fontosabb, mint az automatikus láncolás. |
| A technológiai eszközök kiválasztásánál a könnyű API, a teljesség és a minőségi reputáció előrébb végzett; az AI-integráció csak 9. lett. [Forrás](https://survey.stackoverflow.co/2025/work) | A fejlesztők a használhatóságot és megbízhatóságot többre értékelik, mint az „AI” címkét. | Stabil CLI/API, séma és világos diagnosztika legyen a termék, ne AI-marketing. |
| A DORA 2025 szerint az AI erősítő: a meglévő szervezeti erősségeket és gyengeségeket nagyítja fel. A platformminőség és a feladat kimeneteléről adott egyértelmű visszajelzés meghatározó. [Kutatás](https://dora.dev/research/2025/dora-report/), [platform capability](https://dora.dev/capabilities/platform-engineering/) | A gyorsabb kódolás értéke elveszhet tesztelési, security- és delivery-szűkületekben. | A Boosternek a review/delivery útvonalat kell tisztábbá tennie, nem a kódgenerálást gyorsítani. |
| GitHubon 2025-ben 518,7 millió PR-t merge-eltek (+29%), és az open-source aktivitás rekordot ért el. [Octoverse](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/) | A PR és a CI nagy elérésű, már megszokott döntési felület. | A Proof Pack első elosztási felülete a GitHub check/job summary legyen. |
| GitHub Copilot már custom instructiont, promptot, custom agentet, subagentet, skillt, hookot és MCP-t különböztet meg. [GitHub cheat sheet](https://docs.github.com/en/copilot/reference/customization-cheat-sheet) | Az agent testreszabás natív hostképesség. | Ezt lemásolni gyenge megkülönböztetés. |
| Claude Code natívan rétegez `CLAUDE.md`-t, skillt, subagentet, agent teamet, hookot, MCP-t és plugint. [Claude Code](https://code.claude.com/docs/en/features-overview) A Codex projektutasításokat és skilleket támogat. [AGENTS.md](https://developers.openai.com/codex/guides/agents-md/), [Skills](https://developers.openai.com/codex/skills/) | A nagy hostok ugyanazon alapépítőelemek felé konvergálnak. | A Booster értéke a hostok feletti bizonyítási szerződés lehet. |
| Az Agent Skills specifikáció `SKILL.md`-szerkezetet, metadata- és compatibility mezőt, valamint kísérleti `allowed-tools` mezőt definiál. [Specifikáció](https://agentskills.io/specification) A GitHub CLI ettől külön skill telepítést, pinelést és source/ref/tree-SHA provenance metadatát támogat, miközben figyelmeztet a rosszindulatú skillekre. [GitHub Docs](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills) Ezek inputjelek, nem teljes provenance- vagy security-rendszer. | A skill-formátum és disztribúció önmagában egyre kevésbé egyedi; a provenance és capability-kockázat viszont valós rés. | A Booster ne új skill-szabványt alkosson; később készítsen inspectálható Agent Component Bill of Materials-t. |
| A GitHub Spec Kit 30-nál több AI coding agent integrációját, specifikációt, tervet, taskot és implementációs folyamatot kínál. [Spec Kit](https://github.com/github/spec-kit) | A spec-driven planning is telített terület. | Adapterrel importálni kell a már elfogadott specifikációt, nem újrateremteni. |

### Összegző következtetés

Az **agent**, **skill**, **prompt**, **hook**, **MCP**, **subagent**, **plugin**
és **spec-driven planning** réteg nagy része kommoditizálódik. Ez következtetés
a fenti hivatalos hostképességekből, nem piaci részesedési mérés.

A kevésbé lefedett, a Booster jelenlegi szerződéséhez jól illő feladat:

```text
elfogadott szándék
        ↓
korlátozott végrehajtási scope
        ↓
AI-val létrehozott változtatás
        ↓
kritériumhoz kötött, friss bizonyíték
        ↓
emberi döntés / explicit ismeretlen
        ↓
portábilis handoff és GitHub review
```

## Jelenlegi termékalap és rés

### Meglévő erős alap

A repository már rendelkezik azokkal a primitívekkel, amelyekből a fenti
pozíció felépíthető:

- explicit emberi kontroll és evidence-first elv a [VISION](../VISION.md)
  szerint;
- Compass/Booster döntési réteg és Flow/receipt modell a
  [DOMAIN](../DOMAIN.md) szerint;
- tiszta, lokális assessor és host-adapter elválasztás az
  [architecture](../docs/handbook/architecture.md) szerint;
- review-ready v1 alap és handoff-folyamat a
  [current state](../docs/project/current-state.md) szerint.

### Jelenlegi adoptációs rés

2026-08-21-i repository-megfigyelés:

- a Codex- és Claude-plugin telepítési út a README-ben dokumentált, tehát a Kit
  nem általában „telepíthetetlen”;
- a root package privát, és nincs külön, stabil `bin` belépési pont a
  javasolt Proof Pack verifierhez;
- a [publikus GitHub repositoryban](https://github.com/BillBalint-SM/AI-Booster-Kit)
  az ellenőrzés időpontjában nem látható release vagy package;
- vannak CI workflow-k és PR template, de a tipikus community-health felület
  nem teljes;
- a website narratívája részben a korábbi „Controller / formation” terméket
  mutatja, nem a jelenlegi evidence/receipt fókuszt;
- a technikai demo inkább nyers artifactot mutat, mint egy reviewer számára
  azonnal érthető GitHub Proof Pack-et.

Ezek nem kereslethiányt bizonyítanak, és nem vonják kétségbe a meglévő
plugin-disztribúciót. Azt mutatják, hogy az **end-to-end Proof Pack + verifier
+ GitHub review surface** élmény még nincs demonstrált, release-elt
termékszeletként csomagolva.

## Ajánlott funkcióportfólió

### BUILD NOW — egyetlen „proof-carrying change” vertikális szelet

| # | Funkció | Persona és probléma | Legkisebb értékes MVP | Sikerjel | Fő kockázat |
| --- | --- | --- | --- | --- | --- |
| 1 | **Portable Delivery Receipt + Acceptance-to-Evidence Map** | AI-t használó fejlesztő és reviewer: nem látszik, mely követelmény ténylegesen bizonyított. | Kísérleti, minimális receipt-séma: elfogadott scope, acceptance criteria, érintett commit, kritériumonként `PROVEN / PARTIAL / UNPROVEN / STALE`, evidence hivatkozás, döntés és unknown. Emberi Markdown-nézet ugyanabból az adatból. A publikus kompatibilitási ígéret még nem része ennek a lépésnek. | A reviewer minden kritériumhoz bizonyítékot vagy explicit hiányt lát; nincs egyetlen homályos „pass”. | A receipt ne tartalmazzon secretet, promptot, abszolút lokális utat vagy nem igazolható identitásállítást. |
| 2 | **`booster verify` + információs GitHub Action** | Maintainer: a lokális AI-session eredménye nem jelenik meg a PR döntési felületén. | Ugyanaz a tiszta assessor lokálisan és CI-ben; `GITHUB_STEP_SUMMARY`, determinisztikus annotation és letölthető canonical JSON artifact. Alapértelmezésben read-only és nem blokkol merge-et. | Fixture-paritás 100%; egy új felhasználó 15 percen belül kap értelmezhető PR summaryt. | Minimális token-permission, nincs secret, nincs `pull_request_target`, nincs automatikus PR-komment vagy külső write. A required check kizárólag repo-owner döntés. |
| 3 | **Scope Lock, Approval Binding és Stale Evidence Detector** | Felelős fejlesztő/lead: a jóváhagyás vagy teszt már nem biztos, hogy a jelenlegi változatra vonatkozik. | Allowed/forbidden path és action scope; evidence kötése commit SHA-hoz és input-hashhez; bármely releváns módosítás `STALE` állapotot okoz; a jóváhagyás artifact-hashhez kötött. | Minden mutációs fixture felismeri a scope-driftet és az elavult bizonyítékot. | A v1 approval rekord nem kriptográfiai személyazonosság-bizonyítás. Ezt világosan el kell választani a GitHub által enforce-olt review-tól. |
| 4 | **Handoff Capsule + fresh-session verifier** | Több agentet/embert használó fejlesztő: kontextusváltáskor elveszik a döntés, a bizonyíték és a következő biztonságos lépés. | Rövid, gépi és emberi handoff: cél, elvégzett scope, állapot, evidence, unknown, stop reason és egyetlen következő bounded action; új sessionben `booster resume --verify`. | Pilotban egy friss session a handoffok legalább 80%-át tisztázó kör nélkül helyesen folytatja vagy megállítja. | Ne másolja be a teljes beszélgetést vagy érzékeny kontextust; a tömörítés ne váljon hamis teljességi állítássá. |

Implementációs függőség: **#1 → #3 → #2 helyi verifier → #2 GitHub
review-surface → #4**. A rangsor tehát egy összefüggő termékszeletet ír le.

### NEXT — a működő vertikális szelet után

| Prioritás | Funkció | Miért következő, nem most |
| --- | --- | --- |
| N1 | **Nyilvános evidence interchange contract** | A kísérleti receipt bizonyítása után: JSON Schema, `schemaVersion`, kompatibilitási policy, fixture corpus, stabil `--format json` és adapter truth-label. Ez önálló, hosszú távú compatibility promise, ezért ne terhelje az első MVP-t. |
| N2 | **Context & Authority Doctor** | Read-only scanner AGENTS/CLAUDE/Copilot instrukciókhoz, skillekhez, hookokhoz és MCP-konfigurációkhoz; precedencia-, konfliktus- és `enforced / observed / advisory` jelzés. Magas értékű lehet, de külön host-adapter és karbantartási program. |
| N3 | **Agent Component BOM / provenance manifest** | Inventoryzza a skill, hook, MCP és plugin forrását, verzióját/SHA-ját, licencét, scriptjeit, engedélyeit, hálózati és write-képességét. Valós supply-chain résre válaszol, de nem lehet security certificationként kommunikálni. |
| N4 | **Spec Kit és más spec-import adapter** | Elfogadott spec/task importálása a Booster acceptance contractba. Integrál ahelyett, hogy versenyezne a planning réteggel. |
| N5 | **CI evidence freshness adapter** | Workflow run, commit, artifact hash és környezet kötése a receipthez. GitHub artifact attestation csak tényleges release-artifact provenance-re használható, nem minőségi tanúsítványként. |
| N6 | **Risk profile recipe-k** | Ember által választott `Quick Change / Assured Change / Critical Change` profil különböző evidence- és approval-elvárásokkal. A profil ajánlás, a host által enforce-olt gate külön réteg. |
| N7 | **Reference repository + one-command evaluation sandbox** | Dev Container/Codespaces demo három szándékos kimenettel: `READY`, `WAITING_FOR_DECISION`, `STOPPED`. A gyors kipróbálás és reprodukálhatóság table stake, nem core differentiator. |
| N8 | **Release-grade disztribúció és community health** | Stabil CLI/install, GitHub Release, changelog, checksum, támogatott host-mátrix, `SECURITY.md`, `CONTRIBUTING.md`, issue formok. Ezek nélkül ne legyen Marketplace-listing. |

### LATER — csak validált használat után

- **Policy-to-hook compiler:** Booster policyből host-specifikus hook-konfiguráció,
  de csak ott „enforced”, ahol ezt a host ténylegesen garantálja.
- **Cross-host conformance suite:** ugyanaz a fixture Codex, Claude és Copilot
  adapteren, a hostkülönbségek láthatóvá tételével.
- **Cost metadata:** opcionális idő/token/CI-költség mezők, kizárólag
  összehasonlítható definíció és privacy-szabály után.
- **Szűk SARIF adapter:** csak stabil rule ID-val és repository-relative
  fájl/sor hellyel rendelkező statikus findingokra. A workflow-state maradjon
  JSON/job summary.
- **GitHub Marketplace Action:** csak stabil Action, release- és
  kompatibilitási policy után.

### REJECT — ne legyen termékirány

- új általános agent-runtime, swarm vagy automatikus agent-láncolás;
- saját MCP-, skill- vagy spec-formátum a létező szabványok helyett;
- általános prompt/persona katalógus mint fő értékajánlat;
- autonóm merge, issue-triage, deployment vagy credentials-alapú külső write;
- GitHub App vagy kötelező SaaS az első termékverzióban;
- PR-komment mint elsődleges evidence record;
- required check alapértelmezésben vagy `UNKNOWN = pass`;
- egyetlen, homályos „AI quality score” vagy fejlesztői produktivitás-dashboard;
- attestation, SARIF, Scorecard-badge vagy Marketplace-jelvény kommunikálása
  minőség-, biztonság- vagy auditbizonyítékként;
- a website újrafestése működő, mérhető vertikális szelet előtt.

## GitHub-native termékélmény

### Pull request

A reviewer ezt lássa a Job Summary tetején:

```text
AI Booster Proof Pack
Change:       EVIDENCE_PACKAGE_READY_FOR_HUMAN_DECISION
Scope:        12 allowed files; 0 drift
Criteria:     7 proven · 1 partial · 1 unproven
Evidence:     9 fresh · 0 stale
Approvals:    1 recorded · identity not independently verified
Unknowns:     2 explicit
Receipt:      schema 1.0 · commit abc123
```

Alatta kritériumonként:

- mi volt elvárva;
- mi a bizonyíték és melyik commiton futott;
- mi nem bizonyított;
- mi változtatná elavulttá;
- mi a következő emberi döntés.

### GitHub Actions biztonsági alapértelmezés

- `permissions: contents: read`;
- nincs secret és nincs write token;
- nincs `pull_request_target`;
- nincs automatikus PR-komment;
- third-party Action teljes SHA-ra pinelve;
- fork PR threat model dokumentálva;
- érzékeny receipt mezők redaktálva;
- az Action információs; branch protectiont a repository tulajdonosa állít.

GitHub támogat job summaryt és annotationt, valamint a repository tulajdonosa
required checket konfigurálhat. [Workflow commands](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands),
[protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
Ez a mechanizmus elérhetőségét bizonyítja, nem azonos megjelenést és
viselkedést minden PR-, fork- és permission-esetben. Az experiment briefnek
konkrét event/permission-mátrixot kell tesztelnie. `PARTIAL`, `UNPROVEN`,
`STALE` vagy `UNKNOWN` soha nem jelenhet meg implicit zöld állapotként.

## Javasolt validációs sorrend

### 1. fázis — Contract és lokális bizonyítás

- 6–8 rövid problémainterjúval összevetni legalább az AI-heavy OSS maintainer,
  reviewer/tech lead és platform engineer persona-hipotézist;
- a legerősebb pilotpersonát kiválasztani; az OSS maintainer csak kiinduló
  hipotézis;
- receipt schema, acceptance map, fixture és Markdown renderer;
- `booster verify`, scope drift és stale evidence;
- három end-to-end fixture: ready, decision-needed, stopped.

Kilépési feltétel: azonos input lokálisan mindig azonos canonical outputot ad,
és minden acceptance criterion bizonyított vagy explicit nem bizonyított.

### 2. fázis — GitHub review surface

- read-only Action és sample repository;
- Job Summary, artifact és determinisztikus annotation;
- PR template és security/event model;
- friss fork PR-n végzett biztonsági próba.

Kilépési feltétel: lokális/CI fixture-paritás 100%, nincs külső write, és egy
új felhasználó dokumentáltan 15 percen belül eljut az első Proof Packig.

### 3. fázis — Korlátozott pilot és disztribúció

- 5–8 fejlesztő, legalább két nyilvános pilot repository;
- Codex, Claude és Copilot közül legalább két host;
- reviewer-idő, félreértett state, stale-evidence találat és handoff-siker mérése;
- csak ezután release, checksum/attestation és esetleges Marketplace-csomag.

Kilépési feltétel: a pilot bizonyítja, hogy a Proof Pack csökkenti a review
bizonytalanságát anélkül, hogy új blokkolást vagy hamis biztonságérzetet hozna.

## Mérési terv — javasolt célok, még nem eredmények

| Metrika | Pilotcél | Miért számít |
| --- | --- | --- |
| Time to First Proof | helyben ≤10 perc, GitHubon ≤15 perc | Kipróbálhatóság |
| Local/CI output parity | 100% a publikus fixture-ökön | Bizalom és reprodukálhatóság |
| Acceptance coverage | ≥90% `PROVEN`, a többi explicit `PARTIAL/UNPROVEN` | Nem rejti el a hiányt |
| Stale-evidence recall | 100% a kontrollált mutációs teszteken | Hamis frissesség elkerülése |
| Scope-drift recall | 100% a kontrollált tiltott-path teszteken | Bounded execution |
| Fresh-session handoff success | ≥80% tisztázó kör nélkül | Agent- és emberközi folytonosság |
| Reviewer decision time | legalább 25% javulás a saját baseline-hoz képest | Valós workflow-érték |
| State misunderstanding | <10% a pilotfeladatokban | Diagnosztika minősége |
| False block / unsafe pass | 0 a fixture-ökön; minden pilot-incidens elemzendő | Emberi kontroll |

GitHub star, install és Marketplace-view legyen másodlagos adoption-jel, ne
minőségbizonyíték. A platformhatást task success és fejlesztői elégedettség
együtt mérje, összhangban a [DORA platformajánlásával](https://dora.dev/capabilities/platform-engineering/).

## Legfontosabb ismeretlenek

1. Az első fizető vagy aktív persona valóban az OSS maintainer-e, vagy inkább
   belső platformcsapat? Ehhez interjú és pilot kell.
2. A jelenlegi receipt tartalmaz-e olyan projektadatot, amely GitHub artifactba
   nem tölthető fel redaction nélkül?
3. Mi a legkisebb séma, amely még értékes, de nem válik túl korán merev
   kompatibilitási teherré?
4. Mely state-ek legyenek csak információsak, és melyeket akar egy csapat saját
   döntéssel required checkhez kötni?
5. Hogyan igazolható approval identity a hostonkénti governance megkettőzése
   nélkül? V1-ben az őszinte válasz: nem igazolható teljesen.
6. A Context Doctor hostprecedencia-modellje mennyi false positivet termel?
7. Van-e elegendő forráshelyhez kötött finding a SARIF fenntartásához?
8. Mekkora a Proof Pack reviewer-időre és hibafelismerésre gyakorolt tényleges
   hatása? Ezt starból vagy surveyből nem lehet kikövetkeztetni.

## Döntési összefoglaló

### Amit most érdemes építeni

**Egy Proof Pack vertikális szeletet**, amely:

- importálja az elfogadott intentet;
- scope-hoz köti a változtatást;
- acceptance criterionhoz köti a friss evidence-et;
- explicit unknownnal és emberi döntéssel dolgozik;
- ugyanúgy ellenőrizhető lokálisan és GitHub CI-ben;
- portábilis handoffot ad a következő embernek vagy agentnek.

### Amitől GitHubon értékes lesz

Nem attól, hogy több AI-funkciót ígér, hanem attól, hogy:

- **10–15 perc alatt kipróbálható;**
- **nem kér fölösleges jogosultságot;**
- **minden állítása inspectálható;**
- **nem keveri össze az evidence-et az approvallal;**
- **hostot lehet cserélni a delivery contract elvesztése nélkül;**
- **a reviewer ugyanott kap tiszta visszajelzést, ahol merge-ről dönt.**

## Elsődleges források

- [Stack Overflow Developer Survey 2025 — AI](https://survey.stackoverflow.co/2025/ai)
- [Stack Overflow Developer Survey 2025 — Work](https://survey.stackoverflow.co/2025/work)
- [DORA 2025 — State of AI-assisted Software Development](https://dora.dev/research/2025/dora-report/)
- [DORA — Platform engineering capability](https://dora.dev/capabilities/platform-engineering/)
- [GitHub Octoverse 2025](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/)
- [GitHub Copilot customization cheat sheet](https://docs.github.com/en/copilot/reference/customization-cheat-sheet)
- [GitHub Copilot agent skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)
- [OpenAI Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md/)
- [OpenAI Codex Skills](https://developers.openai.com/codex/skills/)
- [Claude Code extension model](https://code.claude.com/docs/en/features-overview)
- [Agent Skills specification](https://agentskills.io/specification)
- [GitHub Spec Kit](https://github.com/github/spec-kit)
- [GitHub workflow commands and job summaries](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands)
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations)
- [GitHub SARIF](https://docs.github.com/en/code-security/concepts/code-scanning/sarif-files)
- [GitHub Community Profile](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories)

## Handoff

Ez a dokumentum kutatási ajánlás. Nem módosítja a [VISION](../VISION.md)
scope-ját, nem publikál önálló GitHub Actiont, nem állít be required checket és
nem engedélyez további külső műveletet. A külön engedélyezett draft-PR
referenciapróba evidence, nem általános publikálási authority.

Következő bounded döntés: a User a szűk PP-03 eredményre `STOP`, `ITERATE` vagy
`PROMOTE` választ adhat. Ez még nem fogadja el a teljes „AI-heavy OSS
maintainer + Portable Proof Pack + információs GitHub Action” kombinációt. Az
[experiment brief](../docs/planning/ai-booster-kit/proof-pack-github-experiment/2026-08-21-proof-pack-github-experiment-brief.md)
őrzi a tágabb validációs határt és a továbbra is ismeretlen állításokat.
