#!/usr/bin/env node
// Live smoke test for the YouTube, Reddit and Threads methods. Calls each of the 16 routes once,
// reads page 2 of every paginated one through `metadata.nextCursor`, and checks that a tampered
// cursor is refused with HTTP 422. Billed at $0.00207 per request: about $0.05 a run.
//
//   npm run build
//   DESEARCH_API_KEY=... node scripts/e2e-youtube-reddit-threads.mjs
//   node scripts/e2e-youtube-reddit-threads.mjs --base-url https://api-dev.desearch.ai --key-env DESEARCH_DEV_API_KEY
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

const meta = { includeMetadata: true };
let failures = 0;
let billedUsd = 0;
let calls = 0;

function message(error) {
  const text = error instanceof Error ? error.message : String(error);
  return text.split(apiKey).join('***');
}

/** Runs `run` once more after an HTTP 5xx, the known transient ScrapeCreators failure. */
async function withRetry(run) {
  try {
    return { result: await run(), retried: false };
  } catch (error) {
    if (!/^HTTP 5\d\d/.test(message(error))) throw error;
    return { result: await run(), retried: true };
  }
}

async function check(name, run, describe = () => '') {
  try {
    const { result, retried } = await withRetry(run);
    calls += 1;
    billedUsd += result?.metadata?.costUsd ?? 0;
    const detail = [describe(result), retried ? 'retried after HTTP 5xx' : '']
      .filter(Boolean)
      .join(', ');
    console.log(`PASS ${name}${detail ? ` (${detail})` : ''}`);
    return result;
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${name}: ${message(error)}`);
    return undefined;
  }
}

function need(value, what) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`no ${what}`);
  }
  return value;
}

function object(response, key) {
  const value = response.data;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`expected an object, got ${JSON.stringify(value)}`);
  }
  if (key && (value[key] === undefined || value[key] === null)) {
    throw new Error(`response has no ${key}: ${JSON.stringify(value).slice(0, 300)}`);
  }
  if (response.metadata.usageCount !== 1) {
    throw new Error(`expected 1 billed unit, got ${response.metadata.usageCount}`);
  }
  return response;
}

function list(response, { allowEmpty = false, paginated = true } = {}) {
  if (!Array.isArray(response.data)) {
    throw new Error(`expected an array, got ${JSON.stringify(response.data).slice(0, 300)}`);
  }
  if (!allowEmpty && response.data.length === 0) {
    throw new Error('empty list');
  }
  if (!paginated && response.metadata.nextCursor !== undefined) {
    throw new Error('this route does not paginate but sent a next cursor');
  }
  return response;
}

const describeList = (response) =>
  `${response.data.length} items, next cursor: ${
    response.metadata.nextCursor ? 'yes' : 'no'
  }`;

/**
 * A paginated list route: reads page 1, then page 2 with page 1's cursor. `call(cursor)` must pass
 * { includeMetadata: true }. With `cursorRequired`, page 1 must send a cursor.
 */
async function pages(name, call, { cursorRequired = true } = {}) {
  const first = await check(name, async () => list(await call(undefined)), describeList);
  if (!first) return undefined;
  const cursor = first.metadata.nextCursor;
  if (!cursor) {
    if (cursorRequired) {
      failures += 1;
      console.log(`FAIL ${name} (page 2): page 1 sent no x-desearch-next-cursor`);
    } else {
      console.log(`SKIP ${name} (page 2): page 1 was the last page`);
    }
    return first.data;
  }
  await check(
    `${name} (page 2)`,
    async () => list(await call(cursor), { allowEmpty: true }),
    describeList
  );
  return first.data;
}

console.log(`Base URL: ${baseUrl}`);

// YouTube
const VIDEO_ID = 'dQw4w9WgXcQ';
const ytResults = await pages('youtubeSearch', (cursor) =>
  client.youtubeSearch({ query: 'bittensor', type: 'videos', cursor }, meta)
);
if (ytResults && !ytResults.every((item) => item.type)) {
  failures += 1;
  console.log('FAIL youtubeSearch: a result has no type');
}
await check(
  'youtubeVideo',
  async () => object(await client.youtubeVideo({ id: VIDEO_ID }, meta), 'title'),
  (r) => r.data.title
);
await check(
  'youtubeVideo (by URL)',
  async () =>
    object(
      await client.youtubeVideo({ id: `https://youtu.be/${VIDEO_ID}` }, meta),
      'id'
    ),
  (r) => `id ${r.data.id}`
);
await check(
  'youtubeTranscript',
  async () => {
    const response = object(
      await client.youtubeTranscript({ video_id: VIDEO_ID, language: 'en' }, meta),
      'text'
    );
    need(response.data.segments?.length, 'segments');
    return response;
  },
  (r) => `${r.data.segments.length} segments`
);
await pages('youtubeComments', (cursor) =>
  client.youtubeComments({ video_id: VIDEO_ID, order: 'top', cursor }, meta)
);
await check(
  'youtubeChannel',
  async () => object(await client.youtubeChannel({ handle: '@MrBeast' }, meta), 'id'),
  (r) => `${r.data.name ?? r.data.handle}, ${r.data.subscribers} subscribers`
);
await pages('youtubeChannelVideos', (cursor) =>
  client.youtubeChannelVideos({ handle: '@MrBeast', sort: 'latest', cursor }, meta)
);

// Reddit
await pages('redditSearch', (cursor) =>
  client.redditSearch({ query: 'bittensor', sort: 'new', cursor }, meta)
);
await check(
  'redditSubreddit',
  async () => object(await client.redditSubreddit({ name: 'AskReddit' }, meta), 'name'),
  (r) => `${r.data.weeklyActiveUsers} weekly active users`
);
const subredditPosts = await pages('redditSubredditPosts', (cursor) =>
  client.redditSubredditPosts(
    { name: 'AskReddit', sort: 'top', timeframe: 'week', cursor },
    meta
  )
);
// A busy post, so its comments have a second page. Falls back to a known post.
const topPost = subredditPosts?.find((post) => post.id && post.url);
const postUrl = topPost?.url ?? 'https://www.reddit.com/r/webscraping/comments/1q6pxwn/';
const postId = topPost?.id ?? '1q6pxwn';
// By URL, so the `/` in the ID goes through the encoded path segment.
await check(
  'redditPostById (by URL)',
  async () => object(await client.redditPostById({ id: postUrl }, meta), 'id'),
  (r) => `${r.data.id}, ${r.data.commentCount} comments`
);
await pages(
  'redditComments',
  (cursor) => client.redditComments({ post_id: postId, cursor }, meta),
  { cursorRequired: Boolean(topPost) }
);
await check(
  'redditSearch (tampered cursor is a 422)',
  async () => {
    try {
      await client.redditSearch({ query: 'bittensor', cursor: 'tampered' }, meta);
    } catch (error) {
      if (message(error).startsWith('HTTP 422')) return { metadata: {} };
      throw error;
    }
    throw new Error('expected HTTP 422');
  }
);

// Threads (no route paginates)
await check(
  'threadsSearch',
  async () =>
    list(await client.threadsSearch({ query: 'bittensor' }, meta), {
      paginated: false,
    }),
  describeList
);
await check(
  'threadsSearchUsers',
  async () =>
    list(await client.threadsSearchUsers({ query: 'zuck' }, meta), {
      paginated: false,
    }),
  describeList
);
await check(
  'threadsProfile',
  async () => object(await client.threadsProfile({ username: 'zuck' }, meta), 'username'),
  (r) => `${r.data.followers} followers`
);
await check(
  'threadsProfilePosts',
  async () =>
    list(await client.threadsProfilePosts({ username: 'zuck' }, meta), {
      paginated: false,
    }),
  describeList
);
await check(
  'threadsPostById (by URL)',
  async () => {
    const response = object(
      await client.threadsPostById(
        { id: 'https://www.threads.com/@zuck/post/DK-BydcJHkF' },
        meta
      ),
      'code'
    );
    if (!Array.isArray(response.data.comments)) {
      throw new Error('no comments array');
    }
    return response;
  },
  (r) => `${r.data.comments.length} replies`
);

console.log(
  `${calls} calls, $${billedUsd.toFixed(5)} billed (X-Desearch-Cost-Usd total)`
);
console.log(failures === 0 ? 'OK: all calls passed' : `${failures} failed`);
process.exitCode = failures === 0 ? 0 : 1;
