import { runCli } from "./src/cli.js";

const main = async (): Promise<void> => {
  process.exitCode = await runCli(process.argv.slice(2));
};

main().catch(() => {
  process.stderr.write(`${JSON.stringify({ error: "UNEXPECTED_ERROR" })}\n`);
  process.exitCode = 1;
});
