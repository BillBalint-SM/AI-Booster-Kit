# Marketing asset governance

**Status:** Prototype specification. No production logo, wordmark, social
account, platform export, or public campaign asset exists in this directory.

The master name is unresolved, so the reusable system is defined before the
wordmark. Production files may be added only after the name and publication
gates in [naming-screening.md](../naming-screening.md) are satisfied.

## Name-agnostic mark concept

The mark uses two offset, open paths around a visible checkpoint gap:

- open paths express controlled evolution rather than endless automation;
- the gap is the Human Checkpoint where the system stops before consequence;
- asymmetric offset suggests change while preserving a recognizable prior
  system;
- lime is reserved for the deliberate human-owned checkpoint;
- the geometry must not close into an infinity symbol, resemble a generic
  refresh icon, or imply autonomous looping.

The canonical palette, type, spacing, and motion values live in
[tokens.json](../design/tokens.json) and [tokens.css](../design/tokens.css).

## Required logo family after name approval

| Variant | Intended use | Minimum prototype rule |
| --- | --- | --- |
| Horizontal mark and wordmark | Website header, documents, GitHub | 120 px digital width |
| Stacked mark and wordmark | Square and narrow compositions | Preserve full clear space |
| Mark only | Avatar, app icon, favicon | 24 px digital minimum |
| Wordmark only | Contexts where the mark is already present | Use approved typography only |
| Reversed | Ink or dark photography | Signal-white wordmark |
| Dark monochrome | Light, single-color context | No effects or transparency |
| Light monochrome | Dark, single-color context | No effects or transparency |

Clear space equals one mark height on every side. SVG is the production source;
PNG is an export for platform compatibility. Do not stretch, rotate, crop,
recolor, outline, shadow, or rearrange the mark.

## Planned directory structure

```text
marketing/assets/
├── README.md
├── logos/
│   ├── full-horizontal/
│   ├── stacked/
│   ├── mark-only/
│   └── monochrome/
├── social/
│   ├── linkedin/
│   ├── youtube/
│   ├── product-hunt/
│   └── community/
├── web/
├── documents/
├── source/
└── generated/
```

Empty production directories are not created before an approved asset exists.

## Asset families

| Family | Composition | Core message |
| --- | --- | --- |
| Product hero | Open-loop mark, operational grid, one visible checkpoint | See clearly. Choose the right system. Keep control. |
| Formation card | Situation, recommended formation, fit evidence, unknowns | Explain the recommendation before action. |
| Human Checkpoint | Three explicit routes and consequences | Accept, choose another path, or continue without an Agent. |
| Evidence card | State label, icon, reason, and missing proof | Make uncertainty visible and useful. |
| Controlled change | Before state, one changed element, after evidence | Evolve one part while preserving recovery. |
| Release card | READY result beside explicit limits | Publish capability without roadmap theatre. |
| Pricing card | Free trust foundation and future Advanced value | Never paywall control, evidence, or the current result. |

Use 1:1 and 4:5 compositions for reusable social cards, 16:9 for video and
hero surfaces, and responsive document layouts for carousels. Verify each
platform's current export requirements immediately before production; this
prototype does not freeze mutable platform limits.

## Visual prompt seed

For AI-assisted concept exploration, start with:

> Dark operational canvas in `#090D18`, confident `#326BFF` system paths,
> selective `#C8FF3D` Human Checkpoint, signal-white evidence labels, clean
> modular grid, real product and engineering work artifacts, precise high
> contrast, controlled energy, visible limits, no decorative autonomy.

Avoid robot portraits, humanoid assistants, glowing brains, magic particles,
decorative neural networks, cyberpunk noise, fake dashboards, or imagery that
suggests replacement of the User or team.

## File naming

Use:

```text
{type}_{campaign}_{description}_{yyyymmdd}_{variant}.{ext}
```

Examples after approval:

```text
logo_evergreen_horizontal_20260802_full-color.svg
social_formation-field-notes_research_20260802_4-5.png
video_product-demo_human-checkpoint_20260802_16-9.png
```

Every asset record must include purpose, owner, status, source, rights or
license, creation date, dimensions, format, version, accessibility text, and
approval evidence. AI-generated assets must also retain the model, prompt, and
material manual edits.

## Approval gate

Before an asset becomes `approved`, verify:

- the master name and exact logo version are approved for the context;
- message claims match current product evidence and label roadmap intent;
- palette, typography, spacing, mark clear space, and minimum sizes comply;
- normal text meets 4.5:1 contrast and large text/UI meets 3:1;
- state meaning is carried by text or icon as well as color;
- motion respects `prefers-reduced-motion` and carries no exclusive meaning;
- copy follows the decisive, precise, transparent, energetic, human-centered
  voice without autonomy or replacement claims;
- imagery and fonts have documented rights;
- export format and live platform requirements were verified;
- the reviewer, date, status, and approved exception are recorded.

Non-standard use remains `review` until explicitly approved.
