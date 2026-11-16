// Run the same dependency-free checks locally and in GitHub Actions.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const checks = [
  ['--test', 'tests/engine.test.cjs', 'tests/budget.test.cjs', 'tests/tutorial.test.cjs'],
  ['build-standalone.cjs', '--check'],
  ['scripts/check-links.cjs']
];
for (const args of checks) {
  const result = spawnSync(process.execPath, args, {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit'
  });
  if (result.error) console.error(result.error.message);
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
