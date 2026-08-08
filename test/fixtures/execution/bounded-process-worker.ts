import { appendFileSync } from "node:fs";

const [mode, amountText, markerPath] = process.argv.slice(2);
const amount = Number(amountText);

if (!mode || !Number.isSafeInteger(amount) || amount < 0) process.exit(64);

if (mode === "stdout") process.stdout.write(Buffer.alloc(amount, 0x61));
else if (mode === "stderr") process.stderr.write(Buffer.alloc(amount, 0x62));
else if (mode === "nul") process.stdout.write(Buffer.from([0x61, 0x00, 0x62]));
else if (mode === "exit") process.exit(amount);
else if (mode === "delayed-marker" && markerPath) {
  setTimeout(() => appendFileSync(markerPath, "survived", "utf8"), amount);
} else process.exit(65);
