const { run } = require("../lib/publication-cli");
try {
  run("daily");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
