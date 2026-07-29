import type {
  CanonicalWorkArtifact,
  ChildWorkItem,
  Epic,
  Milestone,
} from "../domain/model.js";
import { validateCanonicalRecord } from "../domain/validate.js";
import { assertHierarchyTraceability } from "./traceability.js";

export interface FinalizeInput {
  milestone: Milestone;
  canonicalWorkArtifact: CanonicalWorkArtifact;
  epics: Epic[];
  workItems: ChildWorkItem[];
  acceptanceDecision: "accepted";
  sourceContractRevision: string;
}

export interface ProjectionRecord {
  canonicalId: string;
  parentCanonicalId: string | null;
  sourceContractRevision: string;
}

export interface ConfluenceProjectionIntent extends ProjectionRecord {
  title: string;
  content: string;
}

export interface AttachmentIntent extends ProjectionRecord {
  filename: string;
  content: string;
}

export interface EventInput extends ProjectionRecord {
  eventType: "milestone_finalized" | "decomposition_accepted";
  description: string;
}

export interface FinalizationResult {
  milestone: Milestone;
  canonicalWorkArtifact: CanonicalWorkArtifact;
  epics: Epic[];
  workItems: ChildWorkItem[];
  confluenceProjection: ConfluenceProjectionIntent;
  attachments: AttachmentIntent[];
  events: EventInput[];
}

export function finalizeMilestone(input: FinalizeInput): FinalizationResult {
  const finalizedMilestone: Milestone = {
    ...input.milestone,
    description: input.canonicalWorkArtifact,
  };

  validateCanonicalRecord(input.canonicalWorkArtifact, "canonicalWorkArtifact");
  validateCanonicalRecord(finalizedMilestone, "milestone");
  assertFinalizationBoundary(input);
  assertHierarchyTraceability({
    milestone: finalizedMilestone,
    epics: input.epics,
    workItems: input.workItems,
    executionSets: [],
  });

  const milestoneDescription = renderArtifact(input.canonicalWorkArtifact);
  const childDescriptions = new Map<string, string>([
    ...input.epics.map(
      (epic): [string, string] => [
        epic.canonicalId,
        renderEpicScope(epic, input.workItems),
      ],
    ),
    ...input.workItems.map(
      (workItem): [string, string] => [
        workItem.canonicalId,
        renderWorkItemScope(workItem),
      ],
    ),
  ]);

  return {
    milestone: finalizedMilestone,
    canonicalWorkArtifact: input.canonicalWorkArtifact,
    epics: input.epics,
    workItems: input.workItems,
    confluenceProjection: {
      canonicalId: `confluence:${finalizedMilestone.canonicalId}`,
      parentCanonicalId: finalizedMilestone.canonicalId,
      sourceContractRevision: input.sourceContractRevision,
      title: `${finalizedMilestone.summary} roadmap`,
      content: renderRoadmap(finalizedMilestone, input.canonicalWorkArtifact, input.epics, input.workItems),
    },
    attachments: [
      {
        canonicalId: `attachment:${input.canonicalWorkArtifact.artifactId}`,
        parentCanonicalId: finalizedMilestone.canonicalId,
        sourceContractRevision: input.sourceContractRevision,
        filename: `${input.canonicalWorkArtifact.artifactId}.md`,
        content: milestoneDescription,
      },
    ],
    events: [
      {
        canonicalId: finalizedMilestone.canonicalId,
        parentCanonicalId: null,
        sourceContractRevision: input.sourceContractRevision,
        eventType: "milestone_finalized",
        description: milestoneDescription,
      },
      ...input.epics.map((epic) => ({
        canonicalId: epic.canonicalId,
        parentCanonicalId: finalizedMilestone.canonicalId,
        sourceContractRevision: input.sourceContractRevision,
        eventType: "decomposition_accepted" as const,
        description: childDescriptions.get(epic.canonicalId) as string,
      })),
      ...input.workItems.map((workItem) => ({
        canonicalId: workItem.canonicalId,
        parentCanonicalId: workItem.parentEpicId,
        sourceContractRevision: input.sourceContractRevision,
        eventType: "decomposition_accepted" as const,
        description: childDescriptions.get(workItem.canonicalId) as string,
      })),
    ],
  };
}

function assertFinalizationBoundary(input: FinalizeInput): void {
  if (input.acceptanceDecision !== "accepted") {
    throw new Error("Finalization requires an accepted acceptance decision.");
  }
  if (input.sourceContractRevision.trim() === "") {
    throw new Error("Finalization requires a source contract revision.");
  }
  if (input.canonicalWorkArtifact.currentState.trim().toLocaleLowerCase() === "draft") {
    throw new Error("Finalization cannot project an artifact still marked draft.");
  }
  if (input.canonicalWorkArtifact.vision.trim() === "") {
    throw new Error("Finalization requires a Milestone vision.");
  }
  if (input.canonicalWorkArtifact.acceptanceCriteria.length === 0) {
    throw new Error("Finalization requires Milestone acceptance criteria.");
  }
  if (input.canonicalWorkArtifact.milestoneId !== input.milestone.canonicalId) {
    throw new Error("Canonical Work Artifact must belong to the finalized Milestone.");
  }
}

function renderArtifact(artifact: CanonicalWorkArtifact): string {
  return [
    `# ${artifact.artifactId}`,
    section("Vision", [artifact.vision]),
    section("Scope", artifact.scope),
    section("Non-goals", artifact.nonGoals),
    section("Requirements", artifact.requirements),
    section("Implementation plan", artifact.implementationPlan),
    section("Test plan", artifact.testPlan),
    section("Acceptance criteria", artifact.acceptanceCriteria),
    section("Review points", artifact.reviewPoints),
    section("Decisions", artifact.decisions),
    section("Evidence references", artifact.evidenceRefs),
    section("Unknowns", artifact.unknowns),
    section("Dependencies", artifact.dependencies),
    section("Project context", [artifact.projectContext]),
    section("Current state", [artifact.currentState]),
  ].join("\n\n");
}

function renderEpicScope(epic: Epic, workItems: ChildWorkItem[]): string {
  const children = workItems.filter((workItem) => workItem.parentEpicId === epic.canonicalId);
  return [
    `# ${epic.summary}`,
    `Parent Milestone: ${epic.parentMilestoneId}`,
    section("Committed child scope", children.map((child) => `${child.type}: ${child.summary}`)),
  ].join("\n\n");
}

function renderWorkItemScope(workItem: ChildWorkItem): string {
  return [
    `# ${workItem.summary}`,
    `Parent Epic: ${workItem.parentEpicId}`,
    section("Acceptance criteria", workItem.acceptanceCriteria),
  ].join("\n\n");
}

function renderRoadmap(
  milestone: Milestone,
  artifact: CanonicalWorkArtifact,
  epics: Epic[],
  workItems: ChildWorkItem[],
): string {
  return [
    `# ${milestone.summary} roadmap`,
    section("Vision", [artifact.vision]),
    section("Milestone acceptance criteria", artifact.acceptanceCriteria),
    section("Non-goals", artifact.nonGoals),
    section("Dependencies", artifact.dependencies),
    section("Unknowns", artifact.unknowns),
    section("Review points", artifact.reviewPoints),
    section("Roadmap", epics.map((epic) => `${epic.summary}: ${workItems.filter((workItem) => workItem.parentEpicId === epic.canonicalId).map((workItem) => workItem.summary).join(", ")}`)),
  ].join("\n\n");
}

function section(heading: string, values: string[]): string {
  return `## ${heading}\n${values.length === 0 ? "- None" : values.map((value) => `- ${value}`).join("\n")}`;
}
