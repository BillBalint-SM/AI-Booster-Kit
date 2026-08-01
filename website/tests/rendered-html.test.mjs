import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the AI Booster Kit product page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>AI Booster Kit — Build better with Agents<\/title>/i);
  assert.match(html, /Build better with Agents/);
  assert.match(html, /Stay in control/);
  assert.match(html, /CONTROLLER \/ LIVE VIEW/);
  assert.match(html, /Planning Studio/);
  assert.match(html, /Late human checkpoint/);
  assert.match(html, /Human-led/);
  assert.match(html, /Co-creation/);
  assert.match(html, /Solo-assisted/);
  assert.match(html, /Quick Task Clarifier/);
  assert.match(html, /Framework Library v1/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview|react-loading-skeleton/);
});

test("keeps the starter preview removed and the platform metadata specific", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /id=\"operating-model\"/);
  assert.match(page, /id=\"frameworks\"/);
  assert.match(page, /id=\"roadmap\"/);
  assert.doesNotMatch(page, /SkeletonPreview|_sites-preview|starter loading skeleton/i);
  assert.match(layout, /AI Booster Kit — Build better with Agents/);
  assert.match(layout, /human-centered capability platform/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview|Starter Project/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
  await assert.rejects(access(new URL("../app/_sites-preview/preview.css", import.meta.url)));
});
