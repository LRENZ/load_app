// Renders evidence/*/summary.json into a markdown table (pasted into docs/EMULATOR_TEST_REPORT.md).
import { readFileSync, existsSync } from 'node:fs';

for (const dir of process.argv.slice(2)) {
  const f = `${dir}/summary.json`;
  if (!existsSync(f)) continue;
  const s = JSON.parse(readFileSync(f, 'utf8'));
  const pass = s.results.filter((r) => r.status === 'pass').length;
  console.log(`\n### ${dir} — ${pass}/${s.results.length} passed (started ${s.startedAt}, ${(s.ms / 1000).toFixed(0)} s)\n`);
  console.log('| ID | Scenario | Result | Time | Notes |');
  console.log('|---|---|---|---|---|');
  for (const r of s.results) {
    console.log(`| ${r.id} | ${r.title.replace(/\|/g, '/')} | ${r.status === 'pass' ? 'pass' : '**FAIL**'} | ${(r.ms / 1000).toFixed(1)} s | ${r.error ? r.error.replace(/\|/g, '/').slice(0, 140) : ''} |`);
  }
}
