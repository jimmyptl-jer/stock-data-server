// ── Rate Budget Calculator ───────────────────────────────────────────────────
// Run: npm run budget
// Validates that the configured jobs won't exceed the API tier limit.

import { config } from '../src/config';

function calculateBudget() {
  console.log('📊 Rate Budget Calculator\n');

  const { callsPerDay, callsPerMinute } = config.api.budget;
  console.log(`API Tier: ${callsPerDay} calls/day, ${callsPerMinute} calls/minute\n`);

  let totalCallsPerDay = 0;

  console.log('--- Job Breakdown ---');
  for (const job of config.jobs) {
    const runsPerDay = Math.ceil(24 / job.intervalHours);
    const callsPerRun = job.symbols.length;
    const dailyCalls = runsPerDay * callsPerRun;

    console.log(`${job.endpoint}`);
    console.log(`  Symbols:   ${job.symbols.length}`);
    console.log(`  Frequency: Every ${job.intervalHours}h → ${runsPerDay} runs/day`);
    console.log(`  Cost:      ${dailyCalls} calls/day\n`);

    totalCallsPerDay += dailyCalls;
  }

  console.log('--- Summary ---');
  console.log(`Projected: ${totalCallsPerDay} calls/day`);
  console.log(`Budget:    ${callsPerDay} calls/day`);

  if (totalCallsPerDay > callsPerDay) {
    console.error(`\n❌ OVER BUDGET by ${totalCallsPerDay - callsPerDay} calls!`);
    process.exit(1);
  } else {
    console.log(`\n✅ Within budget. ${callsPerDay - totalCallsPerDay} calls remaining for retries.`);
  }
}

calculateBudget();
