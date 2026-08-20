# ADR-0002: Dual-host Delivery Kit and pure Delivery Compass

Status: Accepted locally for review

Date: 2026-08-20

## Context

The product must support individual and team software delivery inside an
existing Codex or Claude Code Agent/Model. Users need an installable package
that can start before delivery, attach to work in progress, guide optional
stage transitions, and preserve evidence and human control. `VISION.md`
forbids a new runtime capability, automatic Agent loop, hidden external action,
or global setup performed by the product.

Codex and Claude Code also have different explicit-invocation metadata and copy
installed plugin content into host-controlled locations. A plugin runtime that
references repository files outside its own directory would not be portable.

## Decision

1. Ship AI Booster Kit as one repository marketplace containing one
   self-contained dual-host plugin.
2. Represent delivery procedures as explicit, independently invocable Skills;
   do not create a custom Agent or select a Model.
3. Connect Skills through a canonical declarative Registry of inputs, gates,
   outputs, stops, and suggestions.
4. Expose one pure `projectDeliveryCompass(input, registry)` interface that
   derives a narrated recommendation without execution or persistence.
5. Require state- and binding-aware human/repository gates before recommending
   implementation.
6. Generate a standalone ESM Compass runtime, packaged Registry, Planning-Show
   copy, and Claude-specific Skill view from canonical sources; reject drift in
   tests.
7. Keep the existing Flow Composer and Flow Assurance as the stricter
   receipt-backed kernel, not as an automatic runtime invoked by the Compass.

## Alternatives considered

- One autonomous orchestration Agent: rejected because it changes the product
  boundary, hides user-invoked transitions, and creates runtime ownership.
- Documentation-only Skills with no deterministic projection: rejected because
  stage/gate behavior would drift across hosts and could not be tested through
  one public seam.
- One identical Skill tree for both hosts: rejected because native validators
  disagree on explicit-only frontmatter. Generated host views preserve one
  procedure body with host-correct metadata.
- Depend on Spec Kit, GSD, LangGraph, or another workflow runtime: rejected for
  v1 because it adds a competing lifecycle/runtime and supply-chain surface.
  Their useful methodology patterns are adapted through original local code and
  documented provenance.

## Consequences

- Users can install once and explicitly activate before or during delivery.
- Individual and team flows share one contract while each Skill remains usable
  independently.
- Package generation and dual validation become release requirements.
- Artifact references remain caller-owned observations; stage Skills must
  reopen material evidence, and the Compass cannot authenticate a signer.
- Automatic chaining, persistence, external writes, plugin installation,
  release, and publication remain outside the interface.

## Verification

- `test/booster-compass.test.ts`
- `test/booster-cli.test.ts`
- `test/booster-examples.test.ts`
- `test/booster-plugin-package.test.ts`
- Codex plugin/Skill validators
- `claude plugin validate .`
- `npm run check:booster-package`
