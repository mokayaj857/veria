const { spawn } = require("child_process");

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/next-runner.cjs <next-args>");
  process.exit(1);
}

const env = { ...process.env };

// Some environments inject a standalone config blob that causes Next to ignore
// the repo's next.config.js. Clear it so local dev/build uses project config.
delete env.__NEXT_PRIVATE_STANDALONE_CONFIG;

const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), ...args], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
