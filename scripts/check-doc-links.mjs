import { assertDocumentationLinks } from "../dist/src/docs/links.js";

try {
  await assertDocumentationLinks(process.cwd());
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
