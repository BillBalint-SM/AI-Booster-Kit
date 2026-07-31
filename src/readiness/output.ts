import { dirname, join, resolve } from "node:path";
import { mkdtemp, mkdir, rename, rm, writeFile } from "node:fs/promises";

import type { ReadinessCertificate } from "./evaluate.js";
import { renderCertificateJson, renderCertificateMarkdown } from "./render.js";

const certificateJsonName = "g2as-sandbox-readiness-certificate.json";
const certificateMarkdownName = "g2as-sandbox-readiness-certificate.md";

export interface ReadinessCertificateOutputPaths {
  readonly json: string;
  readonly markdown: string;
}

export async function writeReadinessCertificate(
  outputDirectory: string,
  certificate: ReadinessCertificate,
): Promise<ReadinessCertificateOutputPaths> {
  const outputPath = resolve(outputDirectory);
  const outputPaths = {
    json: join(outputPath, certificateJsonName),
    markdown: join(outputPath, certificateMarkdownName),
  };
  const json = renderCertificateJson(certificate);
  const markdown = renderCertificateMarkdown(certificate);
  await mkdir(dirname(outputPath), { recursive: true });

  const stagingPath = await mkdtemp(join(dirname(outputPath), ".g2as-readiness-"));
  let published = false;
  try {
    await writeFile(join(stagingPath, certificateJsonName), json, "utf8");
    await writeFile(join(stagingPath, certificateMarkdownName), markdown, "utf8");
    await rename(stagingPath, outputPath);
    published = true;
    return Object.freeze(outputPaths);
  } finally {
    if (!published) await rm(stagingPath, { recursive: true, force: true });
  }
}
