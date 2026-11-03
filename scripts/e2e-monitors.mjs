#!/usr/bin/env node
// Live smoke test for the Monitors methods. Free: it creates one monitor with run_now false, never
// triggers a run, calls every free route once and deletes the monitor at the end, also after a
// failure. The webhook test POSTs one signed sample event to https://example.com.
//
//   npm run build
//   DESEARCH_API_KEY=... node scripts/e2e-monitors.mjs
//   node scripts/e2e-monitors.mjs --base-url https://api-dev.desearch.ai --key-env DESEARCH_DEV_API_KEY
//
// The key is read from the environment variable named by --key-env (default DESEARCH_API_KEY), or
// from ~/.config/desearch/e2e.env when the environment does not set it. It is never printed.
// Prints one line per call (PASS name / FAIL name: error) and exits 1 when any call fails.

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const dist = new URL('../dist/index.mjs', import.meta.url);
if (!existsSync(dist)) {
  console.error('dist/index.mjs not found: run `npm run build` first.');
  process.exit(2);
}
const { Desearch } = await import(dist.href);

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const baseUrl = option('--base-url', 'https://api.desearch.ai').replace(/\/+$/, '');
const keyEnv = option('--key-env', 'DESEARCH_API_KEY');

function loadEnvFile() {
  const path = join(homedir(), '.config', 'desearch', 'e2e.env');
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [key, ...rest] = line.split('=');
    const value = rest.join('=');
    if (value && !process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();
const apiKey = process.env[keyEnv];
if (!apiKey) {
  console.error(`Set ${keyEnv} (or add it to ~/.config/desearch/e2e.env).`);
  process.exit(2);
}

const client = new Desearch(apiKey);
// The SDK has no public base URL option (see Known limitations); point it at another deployment
// for this test only.
client.baseURL = baseUrl;

let failures = 0;
let calls = 0;

function message(error) {
  const text = error instanceof Error ? error.message : String(error);
  return text.split(apiKey).join('***');
}

async function check(name, run, describe = () => '') {
  try {
    const result = await run();
    calls += 1;
    const detail = describe(result);
    console.log(`PASS ${name}${detail ? ` (${detail})` : ''}`);
    return result;
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${name}: ${message(error)}`);
    return undefined;
  }
}

function expect(condition, what) {
  if (!condition) throw new Error(what);
}

function isMonitor(value) {
  expect(value && typeof value.monitor_id === 'string', 'no monitor_id');
  expect(Array.isArray(value.sources), 'no sources');
  expect(typeof value.max_run_cost_usd === 'number', 'no max_run_cost_usd');
  expect(value.stats && typeof value.stats.runs === 'number', 'no stats');
  return value;
}

console.log(`Base URL: ${baseUrl}`);

const name = `e2e desearch.js ${new Date().toISOString()}`;
const created = await check(
  'createMonitor',
  async () => {
    const monitor = isMonitor(
      await client.createMonitor({
        query: 'Bittensor subnet launches and updates',
        name,
        criteria: ['Announces a new subnet, release or partnership'],
        sources: ['x'],
        interval: '1d',
        options: { x: { count: 10, lang: 'en' } },
        min_score: 70,
        webhook: { url: 'https://example.com/desearch-e2e' },
        metadata: { e2e: 'desearch.js' },
        run_now: false,
      })
    );
    expect(monitor.status === 'active', `status ${monitor.status}`);
    expect(monitor.last_run == null, 'run_now false still queued a run');
    expect(/^whsec_/.test(monitor.webhook_secret ?? ''), 'no whsec_ webhook_secret');
    expect(
      JSON.stringify(monitor.webhook?.events) ===
        JSON.stringify(['monitor.items.found', 'monitor.run.failed']),
      `default events ${JSON.stringify(monitor.webhook?.events)}`
    );
    return monitor;
  },
  (m) => `${m.monitor_id}, max run $${m.max_run_cost_usd}`
);

if (created) {
  try {
    await check(
      'getMonitor',
      async () => {
        const monitor = isMonitor(await client.getMonitor(created));
        expect(monitor.name === name, 'wrong name');
        expect(monitor.webhook_secret === undefined, 'get returned the secret');
        return monitor;
      },
      (m) => `${m.status}, next run ${m.next_run_at}`
    );
    await check(
      'listMonitors',
      async () => {
        const page = await client.listMonitors({ status: ['active'], limit: 100 });
        expect(Array.isArray(page.monitors), 'no monitors array');
        expect(
          page.monitors.some((m) => m.monitor_id === created.monitor_id),
          'new monitor not listed'
        );
        expect(page.monitors.every((m) => m.status === 'active'), 'status filter ignored');
        return page;
      },
      (p) => `${p.monitors.length} active, next cursor: ${p.next_cursor ? 'yes' : 'no'}`
    );
    await check(
      'listMonitors (limit 1, page 2 by cursor)',
      async () => {
        const first = await client.listMonitors({ limit: 1 });
        expect(first.monitors.length === 1, 'page 1 is not one monitor');
        if (!first.next_cursor) return { first, second: null };
        const second = await client.listMonitors({ limit: 1, cursor: first.next_cursor });
        expect(
          second.monitors[0]?.monitor_id !== first.monitors[0].monitor_id,
          'page 2 repeats page 1'
        );
        return { first, second };
      },
      (r) => (r.second ? 'page 2 differs' : 'one monitor only')
    );
    await check(
      'updateMonitor (rename + pause)',
      async () => {
        const monitor = isMonitor(
          await client.updateMonitor(created, { name: `${name} (renamed)`, status: 'paused' })
        );
        expect(monitor.status === 'paused', `status ${monitor.status}`);
        expect(monitor.paused_reason === 'user', `paused_reason ${monitor.paused_reason}`);
        expect(monitor.name === `${name} (renamed)`, 'not renamed');
        return monitor;
      },
      (m) => `${m.status} (${m.paused_reason})`
    );
    await check(
      'estimateMonitor',
      async () => {
        const estimate = await client.estimateMonitor({
          sources: ['web', 'x'],
          options: { web: { count: 10 } },
          interval: '1d',
        });
        expect(typeof estimate.max_run_cost_usd === 'number', 'no max_run_cost_usd');
        expect(estimate.runs_per_month === 30, `runs_per_month ${estimate.runs_per_month}`);
        expect(typeof estimate.breakdown === 'object', 'no breakdown');
        return estimate;
      },
      (e) => `$${e.max_run_cost_usd}/run, $${e.max_monthly_cost_usd}/month`
    );
    await check(
      'listMonitorRuns',
      async () => {
        const page = await client.listMonitorRuns({ ...created, limit: 5 });
        expect(Array.isArray(page.runs) && page.runs.length === 0, 'expected no runs');
        expect(page.next_cursor == null, 'cursor on an empty list');
        return page;
      },
      () => 'empty'
    );
    await check(
      'listMonitorItems',
      async () => {
        const page = await client.listMonitorItems({ ...created, source: 'x', limit: 5 });
        expect(Array.isArray(page.items) && page.items.length === 0, 'expected no items');
        return page;
      },
      () => 'empty'
    );
    await check(
      'getMonitorRun (unknown run is a 404)',
      async () => {
        try {
          await client.getMonitorRun({
            monitor_id: created.monitor_id,
            run_id: '00000000-0000-4000-8000-000000000000',
          });
        } catch (error) {
          if (message(error).startsWith('HTTP 404')) return true;
          throw error;
        }
        throw new Error('expected HTTP 404');
      }
    );
    await check(
      'testMonitorWebhook',
      async () => {
        const result = await client.testMonitorWebhook(created);
        expect(typeof result.delivered === 'boolean', 'no delivered');
        expect(typeof result.duration_ms === 'number', 'no duration_ms');
        return result;
      },
      (r) => `delivered ${r.delivered}, status ${r.status_code}, ${r.duration_ms} ms`
    );
    await check(
      'rotateMonitorWebhookSecret',
      async () => {
        const result = await client.rotateMonitorWebhookSecret(created);
        expect(/^whsec_/.test(result.webhook_secret), 'no whsec_ secret');
        expect(result.webhook_secret !== created.webhook_secret, 'secret did not change');
        return result;
      },
      () => 'new secret'
    );
    await check(
      'updateMonitor (webhook: null removes it)',
      async () => {
        const monitor = isMonitor(await client.updateMonitor(created, { webhook: null }));
        expect(monitor.webhook == null, 'webhook still set');
        return monitor;
      },
      () => 'webhook removed'
    );
  } finally {
    await check(
      'deleteMonitor',
      async () => {
        const result = await client.deleteMonitor(created);
        expect(result.deleted === true, 'deleted is not true');
        return result;
      },
      (r) => r.monitor_id
    );
    await check(
      'getMonitor (deleted is a 404)',
      async () => {
        try {
          await client.getMonitor(created);
        } catch (error) {
          if (message(error).startsWith('HTTP 404')) return true;
          throw error;
        }
        throw new Error('expected HTTP 404');
      }
    );
  }
}

console.log(`${calls} calls passed, no runs triggered (free)`);
console.log(failures === 0 ? 'OK: all calls passed' : `${failures} failed`);
process.exitCode = failures === 0 ? 0 : 1;
