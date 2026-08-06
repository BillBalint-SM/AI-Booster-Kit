import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";

const CONTRACT_ROOT = resolve("docs/planning/ai-booster-kit/scenario-contracts/v1");
const CONTRACT_INDEX = resolve(CONTRACT_ROOT, "index.md");
const CONTRACT_FILES = [
  resolve(CONTRACT_ROOT, "01-parallel-feature-planning-fan-in.md"),
  resolve(CONTRACT_ROOT, "02-business-decision-technical-handoff.md"),
  resolve(CONTRACT_ROOT, "03-read-only-verification-fix-proposal.md"),
];

test("planning-show scenario contracts: catalog and contracts expose the approved boundaries without prohibited data", async () => {
  const [indexText, contract01Text, contract02Text, contract03Text] = (await Promise.all([
    readNormalizedText(CONTRACT_INDEX),
    ...CONTRACT_FILES.map((path) => readNormalizedText(path)),
  ])) as [string, string, string, string];
  const contractTexts = [contract01Text, contract02Text, contract03Text];

  assert.match(indexText, /Contract status:\s*`READY_WITH_LIMIT`/);
  assert.match(indexText, /Runtime basis:\s*`PARTIAL`/);
  assert.match(indexText, /End-to-end runtime:\s*`NOT_EXECUTED`/);
  assert.match(indexText, /Owner identity:\s*`NOT_EXECUTED`/);
  assert.match(indexText, /This package is a design and User-test artifact\./);
  assert.match(indexText, /It does not change runtime code, create external issues, attach files to GitHub\/Jira, create Bugs, or apply fixes\./);

  for (const relativeLink of [
    "./01-parallel-feature-planning-fan-in.md",
    "./02-business-decision-technical-handoff.md",
    "./03-read-only-verification-fix-proposal.md",
  ]) {
    assert.match(indexText, new RegExp(escapeRegExp(relativeLink)));
  }

  for (const contractText of contractTexts) {
    assert.match(contractText, /User-facing contract:\s*`READY_WITH_LIMIT`/);
    assert.match(contractText, /Runtime basis:\s*`PARTIAL`/);
    assert.match(contractText, /End-to-end (?:Controller\/runtime )?execution:\s*`NOT_EXECUTED`/);
    assert.match(contractText, /Unsupported capabilities:\s*`DESIGN_ONLY`\s*\/\s*`NOT_EXECUTED`/);
    assert.match(contractText, /Primary audience:/);
    assert.match(contractText, /Secondary audience:/);
    assert.match(contractText, /Trigger examples:/);
    assert.match(contractText, /Copy-paste starter prompt:/);
    assert.match(contractText, /^## Trigger$/m);
    assert.match(contractText, /^## Goal$/m);
    assert.match(contractText, /^## Process$/m);
    assert.match(contractText, /^## Question tree$/m);
    assert.match(contractText, /^## Output contract$/m);
    assert.match(contractText, /^## Acceptance criteria$/m);
    assert.match(contractText, /^## Stop conditions$/m);
    assert.match(contractText, /\bDONE\b/);
    assert.match(contractText, /\bUNKNOWN\b/);
    assert.match(contractText, /\bSTOPPED\b/);
    assert.match(contractText, /\bCONFLICT\b/);
    assert.match(contractText, /\bSCOPE_CHANGE\b/);
    assert.match(contractText, /Milestone\/Epic handoff|Milestone and Epic handoff|Milestone\/Epic-ready package/);
    assert.match(contractText, /no automatic Story\/Task expansion|does not decompose automatically to Story\/Task level|Do not create Story\/Task scope automatically/i);
    assert.match(contractText, /does not create or update GitHub\/Jira issues|No Bug creation or external issue update by this contract|does not create or update external Epic\/Milestone records/i);
    assert.match(contractText, /No external write|External writes: not authorized|External writes: prohibited/i);
    assert.match(contractText, /does not .*implement|No automatic fix implementation|No file, repository, configuration, database, Jira, GitHub, or production modification/i);
    assertNoProhibitedData(contractText);
  }

  assertNoProhibitedData(indexText);

  assert.match(
    contract03Text,
    /session_status:\s*DONE \| STOPPED \| UNKNOWN \| CONFLICT \| SCOPE_CHANGE/,
  );
  assert.match(contract03Text, /`CONFLICT` never becomes fan-in\/`DONE`/);
  assert.match(
    contract03Text,
    /`SCOPE_CHANGE` preserves the prior decision and requires explicit PO\/PM re-confirmation/,
  );
  assert.match(contract03Text, /^## Delegation visibility rule$/m);
  assert.match(
    contract03Text,
    /Reviewer and PO\/PM responsibilities may be explicitly delegated by the User, but only for the named decision or current verification session\./,
  );
  assert.match(
    contract03Text,
    /requested_by_alias\s+delegated_role\s+scope\s+decision\s+timestamp/s,
  );
  assert.match(contract03Text, /`timestamp` must be ISO 8601 with timezone\./);
  assert.match(
    contract03Text,
    /Do not record credential, token, account, or other secret-bearing data in the delegation snapshot\./i,
  );
});

async function readNormalizedText(path: string): Promise<string> {
  return (await readFile(path, "utf8")).replace(/\r\n/g, "\n");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertNoProhibitedData(text: string): void {
  const forbiddenPatterns = [
    /ghp_[A-Za-z0-9]{20,}/,
    /github_pat_[A-Za-z0-9_]{20,}/,
    /sk-[A-Za-z0-9]{20,}/,
    /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
    /client_secret/i,
    /api[_-]?key/i,
    /password/i,
    /https?:\/\/(?:github\.com|gitlab\.com|bitbucket\.org|openai\.com|jira\.[^\s/]+|confluence\.[^\s/]+)/i,
    /git@[\w.-]+:[\w./-]+/,
    /@[\w.-]+\.[A-Za-z]{2,}/,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(text), false, `Unexpected prohibited data matched by ${pattern}`);
  }
}
