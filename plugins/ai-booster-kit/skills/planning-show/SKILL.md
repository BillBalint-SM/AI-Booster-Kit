---
name: planning-show
description: Systematically examine plans, designs, and refinements through focused questioning, decision resolution, and a scoped Markdown handoff.
---

# Planning-Show

Run an explicit planning/refinement session that turns a plan, design, or idea
into shared understanding. The session explores a dependency-aware design tree,
keeps decisions with the User, and ends with a reviewable handoff rather than
implementation.

## Operating contract

- Start only from an explicit `/planning-show` or `$planning-show` request.
- After every explicit invocation, run Round 0 intake before building the
  design tree or asking frontier questions.
- Keep the User as outcome owner and decision maker. Recommend answers, but do
  not decide material product, scope, authority, compatibility, or trade-off
  questions for them.
- Look up facts from the filesystem, tools, and available read-only sources.
  Never ask the User for a fact that can be safely discovered.
- Do not implement, publish, invoke connectors, commit, merge, or perform an
  external write during the session.
- Preserve the original brief, rejected interpretations, unknowns, conflicts,
  and scope changes. Never turn absence of evidence into a decision.
- Do not claim shared understanding or `COMPLETE` until the design frontier is
  empty and the User confirms the synthesis. A User saying “enough” ends the
  session as `PARTIAL` if unresolved branches remain.

## Session state

Create a compact in-memory session record with:

- session identity and start time;
- intake mode, current wizard step, supplied context, selected continuation
  artifact, and missing intake fields;
- objective, scope, topic, outcome owner, candidate Milestone/Epic parent, and
  candidate Roadmap item;
- constraints, non-goals, acceptance questions, and initial unknowns;
- design-tree nodes and dependencies;
- settled decisions, rejected alternatives, evidence references, and scope
  deltas;
- current status, unresolved branches, and next bounded action.

Keep facts, hypotheses, recommendations, User decisions, and approvals visibly
separate. Do not copy the full conversation into the state or final artifact.

## Round zero: intake and continuation

Run this round immediately after every explicit invocation. Do not build the
design tree, ask frontier questions, or write a handoff before Round 0 is
complete.

Render the Round 0 message in the User's language. Keep field names and status
tokens stable so the intake remains easy to reuse and parse.

1. Inspect the invocation and current conversation for a usable goal, topic,
   scope, constraints, or continuation request. Preserve supplied wording.
2. Search the active workspace's canonical planning root, when it exists, for
   relevant `PARTIAL`, `STOPPED`, or `UNKNOWN` Planning-Show handoffs. Show each
   relevant candidate with its path, status, topic, scope, owner, and session
   revision. When no topic or scope is supplied, treat all incomplete handoffs
   under that root as candidates. Do not invent a continuation when none is
   found.
3. Determine the intake mode:
   - `NEW` when the User supplies a new goal or explicitly chooses a new
     session;
   - `RESUME` when the User identifies an incomplete handoff or explicitly asks
     to continue an existing Planning-Show session.
4. If usable context is present, use the detected-input variant of the preset
   described below and ask only for missing information needed to establish one
   bounded outcome and its owner. Do not make the User repeat information
   already present in the context.
5. If the skill is invoked without usable context, show this wizard preset in
   chat:

```text
PLANNING-SHOW / ROUND 0

I'll help you turn your plan, design, or refinement into a clear,
decision-ready direction and a scoped handoff.

Workspace status:
<State whether a canonical planning root was found and show any resumable
PARTIAL, STOPPED, or UNKNOWN handoffs with status, topic, scope, owner, session,
and path. If none exist, say so plainly.>

Mode:
[NEW] Start a new Planning-Show session.
[RESUME] Continue an incomplete session listed above.

Next question:
<ask exactly one question here>
```

Do not show a copyable Markdown intake form in Round 0 unless the User asks for
one. The wizard is the default intake experience.

6. If no usable context and no incomplete handoff exists, use `NEW` as the
   default mode and ask the first wizard question:

   `What outcome should this Planning-Show session produce?`

7. If one or more incomplete handoffs exist and the User has not chosen a mode,
   ask one question to choose `NEW` or `RESUME`. If multiple resume candidates
   exist, show them as numbered options with status, topic, scope, owner, session,
   and path, then ask which one to continue. Do not silently select a handoff.

8. For `NEW`, collect only missing intake inputs, one question at a time, in this
   order: bounded outcome, topic, scope, owner, constraints and non-goals,
   acceptance and evidence, then unknowns, risks, and dependencies. Inspect
   discoverable environment facts before asking the User for them.

9. For `RESUME`, read the selected handoff, verify its status and source or
   session revision, restore its open frontier, and show the next bounded
   continuation point before asking the next question.

10. When usable context is present, show a compact `Detected input` summary and
    a single `Next question` containing only the next missing input. Do not make
    the User repeat information already present in the context.

Do not ask the User to supply the final handoff `Status` or `Session` values. The
skill generates them. `NEW` and `RESUME` are intake modes and are recorded as
`Session mode` in the final handoff.

Round 0 is an intake aid, not a decision-tree round. Its purpose is to improve
the first frontier and the eventual handoff, not to claim shared understanding.

## Start the session

1. Confirm the request is a plan/design/refinement problem rather than an
   implementation or research-only request.
2. Normalize the supplied brief into one bounded outcome. Preserve the User's
   wording in the “before” record; do not silently improve its scope.
3. Inspect the active workspace and relevant canonical artifacts for facts such
   as current scope, parent links, existing constraints, repository state, and
   available tools. Label the evidence transport and freshness.
4. Build the first design tree. Each node must be one decision, fact
   prerequisite, or explicitly out-of-scope branch. Give every node a stable
   local ID and list its parent dependencies.
5. Ask the first independent frontier questions. Do not write a handoff or act
   on the plan yet.

If a required decision is missing, ask it. If a required fact is missing, start
read-only discovery instead of asking the User for it.

## Discover environment facts

For each material, non-trivial environment fact group, dispatch one bounded
read-only explorer when the host provides sub-agent capability. Resolve simple
local facts directly when safe. Give each explorer:

- the exact fact to establish;
- the allowlisted files, tools, or sources to inspect;
- the required normalized output;
- the forbidden actions (writes, credentials, connector mutations, broad scans);
- its stop condition and evidence format.

Do not block independent User decisions on a running explorer. When the result
arrives, treat its report as a lead and reopen the authoritative source for any
material claim. If sub-agent capability is unavailable, perform the same
read-only lookup locally; never ask the User for the fact merely because
delegation was unavailable. Preserve `UNKNOWN` when safe verification fails.

## Build and recompute the design tree

Maintain each node in one of these states:

`OPEN`, `FACT_PENDING`, `SETTLED`, `OUT_OF_SCOPE`, `UNKNOWN`, `CONFLICT`, or
`STOPPED`.

After every User answer or material fact read-back:

1. Classify the input as fact, decision, constraint, recommendation, unknown,
   rejection, or scope change.
2. Attach the source or evidence reference.
3. Update the affected node and all dependent nodes.
4. Preserve rejected interpretations and the prior scope.
5. Recompute the frontier from the updated tree.

The frontier is the set of `OPEN` decision nodes whose prerequisites are
settled or explicitly accepted as unknown. A node whose answer depends on
another node still open in the same round belongs to a later round. Never ask a
downstream question early merely to make the session appear faster.

Ask only the current frontier. Ask one question at a time by default and wait
for the User's answer before continuing. Batch multiple questions only when
they are genuinely independent, low-risk, and answering them together clearly
reduces friction.

Format every question exactly like this:

```text
**Q1** - **<question title>**: <question body, including choices when useful>

Recommended answer: <the proposed answer, why it fits the current evidence,
and the consequence of accepting it>
```

Number questions from `Q1` in each round. Do not bundle dependent questions into
one round. Do not ask a question whose answer is already settled. If the User
answers only some questions, record the rest as still open and recompute the
frontier from the answers received.

Before asking the next question or round, briefly state what was recorded,
classify it as a fact, decision, constraint, recommendation, unknown, rejection,
or scope change, note its consequence, and identify the next frontier node or
nodes.

## Scope and conflict gates

Treat a change to the objective, value, scope, owner, constraints, acceptance,
external commitment, authority, or rollback boundary as a scope-change
candidate. State the delta and ask the User to accept or reject it. Until it is
accepted, keep the original scope active.

Stop and surface a visible decision when:

- two decisions or sources conflict;
- a target, owner, parent, authority, or capability is ambiguous;
- a required fact remains `UNKNOWN` after safe lookup;
- the proposed direction widens scope without acceptance;
- a request would require implementation, external access, or a consequential
  write.

A stop preserves the observed evidence and unchanged prior direction. Do not
silently choose an interpretation, retry an ambiguous operation, or downgrade a
conflict to a recommendation.

## Close the session

The design frontier is empty only when every branch is settled, explicitly
out-of-scope, or recorded as an accepted `UNKNOWN` with an owner and next
action. Before closing, present a compact synthesis containing:

- the refined outcome and scope delta;
- settled decisions and their consequences;
- rejected alternatives and why they were rejected;
- acceptance criteria and evidence requirements;
- remaining unknowns, risks, dependencies, and stop conditions;
- the next bounded action.

Then ask for the final confirmation:

```text
Shared-understanding checkpoint: The design tree has no unvisited decision
frontier. Confirm that this synthesis represents the intended direction.
```

On explicit confirmation, mark the session `COMPLETE` and write the handoff.
If the User says “enough” before confirmation, mark it `PARTIAL`, preserve the
open frontier, and write a handoff that does not claim consensus. If a conflict
or unverifiable prerequisite prevents continuation, mark the appropriate
`STOPPED` or `UNKNOWN` state and write the evidence needed to resume.

Writing the scoped handoff at explicit session end is allowed; implementation,
publication, and external mutation remain outside this skill.

## Write the scoped Markdown handoff

Use the active workspace's canonical planning root when one exists:

```text
docs/planning/<scope>/<topic>/<milestone-or-epic>/
  <YYYY-MM-DD>-planning-show-handoff.md
```

Normalize path components to safe lowercase slugs. Resolve an existing
Milestone/Epic parent from source artifacts when possible. If no parent or
retention target exists, ask the User to choose the target; that is a decision,
not a fact to invent. Do not create a generic `context.md`.

For multiple accepted parents, write one shared session index and one scoped
handoff per parent. Otherwise write one handoff. Each artifact must identify
its owner, parent relation, lifecycle/status, and source or session revision.
Replace every placeholder with generated session content; never save the
template with unresolved angle-bracket placeholders.

Create or update the handoff as a real workspace Markdown file using the host's
file-editing tool when available (for example, `apply_patch`). Do not simulate
the artifact with a code block, write it only through a shell transcript, or
return only a link. A real file mutation lets the host render its native
file-edit artifact, such as an `Edited <file> +N -M` card with Review and Undo.

Use this structure:

```markdown
# Planning-Show Handoff: <topic>

Status: COMPLETE | PARTIAL | STOPPED | UNKNOWN
Session mode: NEW | RESUME
Session: <stable session ID>
Scope: <scope>
Topic: <topic>
Parent: <Milestone/Epic ID or explicit none>
Roadmap item: <Roadmap item ID or explicit none>
Outcome owner: <owner>

## Shared understanding
<accepted outcome and current scope>

## Original brief
<the pre-interview goal, scope, constraints, and non-goals>

## Decision tree result
<settled decisions in dependency order, with consequences>

## Rejected interpretations
<preserved alternatives and reasons>

## Acceptance and evidence
<observable acceptance criteria and source-labelled evidence>

## Unknowns, risks, and dependencies
<each item with owner, impact, and next action>

## Open decision frontier
<each unresolved node with its ID, dependencies, blocker, owner, and next question>

## Scope delta
<accepted changes, rejected changes, or None>

## Final confirmation
Confirmed: YES | NO
Confirmed by: <User>
Confirmation basis: <short confirmation or checkpoint reference>

## Next bounded action
<one concrete next step and its acceptance boundary>

## Suggested continuation
<optional skills or artifacts; recommendations only>
```

Include all material decisions and directions, but exclude the raw transcript,
secrets, credentials, cookies, unredacted connector payloads, and arbitrary
URLs. A handoff is a compact continuation packet, not proof that implementation
or publication happened.

## Present the session result

After the handoff is written, independently read it back and confirm that the
artifact exists, has the expected status, and contains the generated session
content. Do not present a successful result before this read-back passes.

After the file-edit tool returns, give the host room to render its native file
artifact. Do not fabricate an `Edited`, `Review`, `Undo`, or line-count card in
Markdown; the host owns that presentation. If the host does not render a file
artifact, provide a normal clickable Markdown link as the fallback.

Then return a short, human-readable wizard-style session evaluation in the
User's language, followed by the generated Markdown file link. Use normal chat
text and a normal clickable link only. Do not render a second Markdown card,
blockquote, fenced code block, plaintext box, or simulated Review/Undo component;
the native file-edit artifact is the only visual file component:

```markdown
<localized sentence: The detailed handoff is complete and verified.>

[<filename>.md](<absolute path>)

<localized wizard-style session evaluation in one or two short paragraphs>
<localized next question or bounded continuation action, when needed>
```

For `PARTIAL`, `STOPPED`, or `UNKNOWN`, make the blocker and resume point
explicit in `Still open` or `Next step`. If file creation or read-back fails,
do not render a success card or claim that the handoff exists; report the exact
failure and the safe next action instead.

## Red flags

Stop and correct course if any of these occurs:

- asking the User for a repository or tool fact that could be inspected;
- asking a dependent question in the current round;
- silently accepting a scope change;
- presenting a recommendation as a User decision;
- claiming `COMPLETE` with an open frontier;
- writing implementation or external changes before final confirmation;
- presenting a simulated file card instead of creating the real Markdown artifact;
- rendering a second summary card when the host's native file artifact is available;
- replacing a conflict or `UNKNOWN` with a plausible default;
- saving a generic catch-all context file instead of a scoped handoff.
