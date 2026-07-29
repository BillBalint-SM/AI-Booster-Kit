import { ConfigurationError } from "./src/errors.js";
import { runCli } from "./src/cli.js";

const main = async (): Promise<void> => {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
};

main().catch((error: unknown) => {
  if (error instanceof ConfigurationError) {
    process.stderr.write(`${error.code}: ${error.message}\n`);
    process.exitCode = 1;
    return;
  }

  throw error;
});
