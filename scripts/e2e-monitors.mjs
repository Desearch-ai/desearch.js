#!/usr/bin/env node
// Live smoke test for the Monitors methods. Free: it creates one monitor with run_now false, never
// triggers a run, calls every free route once and deletes the monitor at the end, also after a
// failure. The webhook test POSTs one signed sample event to https://example.com.
//
// --with-accounts also creates (and deletes) a second monitor with the TikTok source and watched
// accounts on every source that has them, and checks the API returns the names cleaned. It needs
// an API with TikTok monitors and watched accounts (desearch-public-api#635); also free.
//
// --with-meta also creates (and deletes) a monitor with the Instagram, Facebook, Meta ads and Threads
// sources and a webhook, and checks the cleaned names, the 422s for Instagram or Facebook without
// accounts (create and update), the estimate breakdown, webhook.last_delivery (null on a fresh
// monitor, and after a test event) and the items source filter. It needs an API with
// desearch-public-api#644. No runs; the one billed call is facebookSearch with sort 'recent' and
// count 2 (two Meta Ad Library records, about $0.004).
//
// X usernames are at most 15 characters: the API answers 422 for a longer one.
//
//   npm run build
//   DESEARCH_API_KEY=... node scripts/e2e-monitors.mjs
//   node scripts/e2e-monitors.mjs --base-url https://api-dev.desearch.ai --key-env DESEARCH_DEV_API_KEY [--with-accounts] [--with-meta]
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
const withAccounts = process.argv.includes('--with-accounts');
const withMeta = process.argv.includes('--with-meta');

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

// A call the API should refuse with this status and a detail matching the pattern.
async function refused(status, call, pattern) {
  try {
    await call();
  } catch (error) {
    const text = message(error);
    if (text.startsWith(`HTTP ${status}`) && pattern.test(text)) return text;
    throw error;
  }
  throw new Error(`expected HTTP ${status}`);
}

// A create the API should refuse with a 422. Deletes the monitor if the API created it anyway.
async function createRefused(body, pattern) {
  let monitor;
  try {
    monitor = await client.createMonitor(body);
  } catch (error) {
    const text = message(error);
    if (text.startsWith('HTTP 422') && pattern.test(text)) return text;
    throw error;
  }
  await client.deleteMonitor(monitor);
  throw new Error(`expected HTTP 422; it created ${monitor.monitor_id} (deleted)`);
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const detail = (text) => text.replace(/^HTTP 422: /, '').slice(0, 140);

function isMonitor(value) {
  expect(value && typeof value.monitor_id === 'string', 'no monitor_id');
  expect(Array.isArray(value.sources), 'no sources');
  expect(typeof value.max_run_cost_usd === 'number', 'no max_run_cost_usd');
  expect(value.stats && typeof value.stats.runs === 'number', 'no stats');
  return value;
}

console.log(`Base URL: ${baseUrl}`);

const name = `e2e desearch.js ${new Date().toISOString()}`;
// Each monitor is kept as soon as the API returns it, before any check on it, so the finally blocks
// delete it even when a check fails.
let created;
await check(
  'createMonitor',
  async () => {
    created = await client.createMonitor({
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
    });
    const monitor = isMonitor(created);
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

if (created?.monitor_id) {
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

if (withAccounts) {
  const options = {
    x: { lang: 'en', accounts: ['@OpenAI', 'https://x.com/AnthropicAI'] },
    reddit: { subreddits: ['r/LocalLLaMA'] },
    youtube: { channels: ['OpenAI'] },
    tiktok: { count: 20, accounts: ['@openai'] },
  };
  const sources = ['x', 'reddit', 'youtube', 'tiktok'];
  await check(
    'estimateMonitor (tiktok + watched accounts)',
    async () => {
      const estimate = await client.estimateMonitor({ sources, options, interval: '1d' });
      expect(typeof estimate.max_run_cost_usd === 'number', 'no max_run_cost_usd');
      expect(typeof estimate.breakdown === 'object', 'no breakdown');
      return estimate;
    },
    (e) => `$${e.max_run_cost_usd}/run, breakdown ${JSON.stringify(e.breakdown)}`
  );
  let watched;
  await check(
    'createMonitor (tiktok + watched accounts)',
    async () => {
      watched = await client.createMonitor({
        query: 'Product launches and model releases',
        name: `${name} (accounts)`,
        sources,
        options,
        min_score: 0,
        run_now: false,
      });
      return isMonitor(watched);
    },
    (m) => `${m.monitor_id}, max run $${m.max_run_cost_usd}`
  );
  if (watched?.monitor_id) {
    try {
      await check(
        'watched accounts come back cleaned',
        async () => {
          const { options: saved } = await client.getMonitor(watched);
          expect(same(saved.x?.accounts, ['OpenAI', 'AnthropicAI']), `x ${JSON.stringify(saved.x)}`);
          expect(same(saved.reddit?.subreddits, ['LocalLLaMA']), `reddit ${JSON.stringify(saved.reddit)}`);
          expect(same(saved.youtube?.channels, ['@OpenAI']), `youtube ${JSON.stringify(saved.youtube)}`);
          expect(same(saved.tiktok?.accounts, ['openai']), `tiktok ${JSON.stringify(saved.tiktok)}`);
          expect(saved.tiktok?.count === 20, `tiktok.count ${saved.tiktok?.count}`);
          return saved;
        },
        () => 'OpenAI, AnthropicAI, LocalLLaMA, @OpenAI, openai'
      );
    } finally {
      await check(
        'deleteMonitor (accounts)',
        async () => {
          const result = await client.deleteMonitor(watched);
          expect(result.deleted === true, 'deleted is not true');
          return result;
        },
        (r) => r.monitor_id
      );
    }
  }
}

if (withMeta) {
  const sources = ['instagram', 'facebook', 'threads', 'meta_ads'];
  const options = {
    instagram: { accounts: ['@openai', 'https://www.instagram.com/nasa/?hl=en'] },
    facebook: {
      pages: [
        'https://www.facebook.com/NASA/',
        'https://www.facebook.com/profile.php?id=100064869009429',
      ],
    },
    threads: { accounts: ['https://www.threads.com/@zuck', '@mosseri'] },
    meta_ads: { count: 20 },
  };
  await check(
    'estimateMonitor (instagram, facebook, threads, meta_ads)',
    async () => {
      const estimate = await client.estimateMonitor({ sources, options, interval: '1d' });
      const { breakdown } = estimate;
      // docs/monitors.md prices: an Instagram account, a Facebook page and the Ad Library search
      // (whatever meta_ads.count) are one read each at $3.00 per 1,000 reads; a Threads account is one
      // $0.00207 request.
      const expected = { instagram: 2 * 0.003, facebook: 2 * 0.003, threads: 2 * 0.00207, meta_ads: 0.003 };
      for (const [source, usd] of Object.entries(expected)) {
        expect(
          typeof breakdown?.[source] === 'number' && Math.abs(breakdown[source] - usd) < 1e-5,
          `breakdown.${source} ${breakdown?.[source]}, expected ${usd}`
        );
      }
      expect(typeof breakdown.screening === 'number', 'no breakdown.screening');
      return estimate;
    },
    (e) => `$${e.max_run_cost_usd}/run, breakdown ${JSON.stringify(e.breakdown)}`
  );
  await check(
    'estimateMonitor (an X username over 15 characters is a 422)',
    () =>
      refused(
        422,
        () => client.estimateMonitor({ sources: ['x'], options: { x: { accounts: ['a'.repeat(16)] } } }),
        /X username/
      ),
    detail
  );
  await check(
    'createMonitor (instagram without accounts is a 422)',
    () =>
      createRefused(
        { query: 'Product launches', name: `${name} (refused)`, sources: ['instagram'], run_now: false },
        /options\.instagram\.accounts/
      ),
    detail
  );
  await check(
    'createMonitor (facebook without pages is a 422)',
    () =>
      createRefused(
        {
          query: 'Product launches',
          name: `${name} (refused)`,
          sources: ['facebook', 'meta_ads'],
          options: { meta_ads: { count: 10 } },
          run_now: false,
        },
        /options\.facebook\.pages/
      ),
    detail
  );
  let social;
  await check(
    'createMonitor (instagram, facebook, threads, meta_ads + webhook)',
    async () => {
      social = await client.createMonitor({
        query: 'ChatGPT',
        name: `${name} (meta)`,
        sources,
        options,
        min_score: 0,
        webhook: { url: 'https://example.com/desearch-e2e' },
        run_now: false,
      });
      const monitor = isMonitor(social);
      expect(monitor.last_run == null, 'run_now false still queued a run');
      expect(monitor.webhook && 'last_delivery' in monitor.webhook, 'no webhook.last_delivery');
      expect(monitor.webhook.last_delivery === null, `last_delivery ${JSON.stringify(monitor.webhook.last_delivery)}`);
      return monitor;
    },
    (m) => `${m.monitor_id}, max run $${m.max_run_cost_usd}, last_delivery null`
  );
  if (social?.monitor_id) {
    try {
      await check(
        'updateMonitor (options without instagram accounts is a 422)',
        () =>
          refused(
            422,
            () =>
              client.updateMonitor(social, {
                options: { facebook: options.facebook, threads: options.threads, meta_ads: { count: 10 } },
              }),
            /options\.instagram\.accounts/
          ),
        detail
      );
      await check(
        'updateMonitor (sources with facebook, options without pages is a 422)',
        () =>
          refused(
            422,
            () =>
              client.updateMonitor(social, {
                sources: ['instagram', 'facebook'],
                options: { instagram: options.instagram },
              }),
            /options\.facebook\.pages/
          ),
        detail
      );
      await check(
        'new sources come back cleaned (and the refused updates changed nothing)',
        async () => {
          const saved = await client.getMonitor(social);
          expect(same(saved.sources, sources), `sources ${JSON.stringify(saved.sources)}`);
          const o = saved.options;
          expect(same(o.instagram?.accounts, ['openai', 'nasa']), `instagram ${JSON.stringify(o.instagram)}`);
          expect(same(o.facebook?.pages, ['NASA', '100064869009429']), `facebook ${JSON.stringify(o.facebook)}`);
          expect(same(o.threads?.accounts, ['zuck', 'mosseri']), `threads ${JSON.stringify(o.threads)}`);
          expect(o.meta_ads?.count === 20, `meta_ads ${JSON.stringify(o.meta_ads)}`);
          expect(saved.webhook?.last_delivery === null, `last_delivery ${JSON.stringify(saved.webhook?.last_delivery)}`);
          return saved;
        },
        () => 'openai, nasa, NASA, 100064869009429, zuck, mosseri; meta_ads.count 20'
      );
      await check(
        'testMonitorWebhook leaves last_delivery null',
        async () => {
          const result = await client.testMonitorWebhook(social);
          const after = await client.getMonitor(social);
          expect(after.webhook?.last_delivery === null, `last_delivery ${JSON.stringify(after.webhook?.last_delivery)}`);
          return result;
        },
        (r) => `delivered ${r.delivered}, status ${r.status_code}`
      );
      await check(
        'listMonitorItems (source instagram, facebook, meta_ads)',
        async () => {
          for (const source of ['instagram', 'facebook', 'meta_ads']) {
            const page = await client.listMonitorItems({ ...social, source, limit: 5 });
            expect(Array.isArray(page.items) && page.items.length === 0, `expected no ${source} items`);
          }
          return true;
        },
        () => 'accepted, empty'
      );
    } finally {
      await check(
        'deleteMonitor (meta)',
        async () => {
          const result = await client.deleteMonitor(social);
          expect(result.deleted === true, 'deleted is not true');
          return result;
        },
        (r) => r.monitor_id
      );
    }
  }
  await check(
    'facebookSearch (sort recent, count 2; billed)',
    async () => {
      const ads = await client.facebookSearch({ query: 'ChatGPT', count: 2, sort: 'recent' });
      expect(Array.isArray(ads), 'not an array');
      expect(ads.length <= 2, `${ads.length} ads for count 2`);
      return ads;
    },
    (ads) => `${ads.length} ads`
  );
}

console.log(
  `${calls} calls passed, no runs triggered (free${withMeta ? ' but for one facebookSearch, about $0.004' : ''})`
);
console.log(failures === 0 ? 'OK: all calls passed' : `${failures} failed`);
process.exitCode = failures === 0 ? 0 : 1;
