const { run } = require("../lib/publication-cli");
try {
  run("weekly");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
