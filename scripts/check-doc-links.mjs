import { assertDocumentationLinks } from "../src/docs/links.ts";

try {
  await assertDocumentationLinks(process.cwd());
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
