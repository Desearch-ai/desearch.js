#!/usr/bin/env node
// Live smoke test for the methods added in 1.9.0: Search API, TikTok, Facebook, Instagram and
// network stats. It calls the production API with your key, so it is billed (a few cents).
//
//   npm run build
//   DESEARCH_API_KEY=... node scripts/e2e-full-coverage.mjs [--with-people]
//
// Prints one line per call (PASS name / FAIL name: error) and exits 1 when any call fails.
// It never starts a People Search task (a billed job) unless you pass --with-people; then it starts
// the smallest one (count 5) and cancels it at once.

import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';

const dist = new URL('../dist/index.mjs', import.meta.url);
if (!existsSync(dist)) {
  console.error('dist/index.mjs not found: run `npm run build` first.');
  process.exit(2);
}
const { Desearch } = await import(dist.href);

const apiKey = process.env.DESEARCH_API_KEY;
if (!apiKey) {
  console.error('Set DESEARCH_API_KEY to run the smoke test.');
  process.exit(2);
}
const withPeople = process.argv.includes('--with-people');

const client = new Desearch(apiKey);
const COUNT = 2;
let failures = 0;
/** List routes that returned a next cursor: { name, follow(cursor) }. */
const cursors = [];

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

async function check(name, run) {
  try {
    const result = await run();
    console.log(`PASS ${name}`);
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

function object(value, key) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`expected an object, got ${JSON.stringify(value)}`);
  }
  if (key && value[key] === undefined) {
    throw new Error(`response has no ${key}: ${JSON.stringify(value)}`);
  }
  return value;
}

function list(value, { allowEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    throw new Error(`expected an array, got ${JSON.stringify(value)}`);
  }
  if (!allowEmpty && value.length === 0) {
    throw new Error('empty list');
  }
  return value;
}

/** A paginated list call: `call(cursor)` must pass { includeMetadata: true }. */
function page(name, call, options) {
  return check(name, async () => {
    const { data, metadata } = await call(undefined);
    list(data, options);
    if (metadata.nextCursor) {
      cursors.push({ name, follow: () => call(metadata.nextCursor) });
    }
    return data;
  });
}

const meta = { includeMetadata: true };

// Search API
await check('searchApi', async () => {
  const response = object(
    await client.searchApi({ query: 'bittensor', count: 10 }),
    'results'
  );
  list(response.results);
});

// TikTok
const tiktokPosts = await page('tiktokProfilePosts', (cursor) =>
  client.tiktokProfilePosts({ username: 'tiktok', count: COUNT, cursor }, meta)
);
const videoId = tiktokPosts?.find((post) => post.id)?.id;
await page('tiktokSearch', (cursor) =>
  client.tiktokSearch({ query: 'ai', count: COUNT, cursor }, meta)
);
await check('tiktokProfile', async () =>
  object(await client.tiktokProfile({ username: 'tiktok' }), 'username')
);
await check('tiktokPostById', async () =>
  object(
    await client.tiktokPostById({
      id: need(videoId, 'video id from tiktokProfilePosts'),
    }),
    'id'
  )
);
await page(
  'tiktokComments',
  (cursor) =>
    client.tiktokComments(
      {
        video_id: need(videoId, 'video id from tiktokProfilePosts'),
        count: COUNT,
        cursor,
      },
      meta
    ),
  { allowEmpty: true }
);
await page('tiktokHashtag', (cursor) =>
  client.tiktokHashtag({ tag: 'ai', count: COUNT, cursor }, meta)
);
await check('tiktokTrending', async () =>
  list(await client.tiktokTrending({ region: 'US', count: COUNT }))
);

// Facebook
await page('facebookSearch', (cursor) =>
  client.facebookSearch({ query: 'ai', count: COUNT, cursor }, meta)
);
await check('facebookProfile', async () =>
  object(await client.facebookProfile({ profile_id: 'facebook' }))
);
const facebookPosts = await page('facebookProfilePosts', (cursor) =>
  client.facebookProfilePosts(
    { profile_id: 'facebook', count: COUNT, cursor },
    meta
  )
);
const facebookPostId = facebookPosts?.find((post) => post.id)?.id;
await check('facebookPostById', async () =>
  object(
    await client.facebookPostById({
      id: need(facebookPostId, 'post id from facebookProfilePosts'),
    })
  )
);
await page(
  'facebookComments',
  (cursor) =>
    client.facebookComments(
      {
        post_id: need(facebookPostId, 'post id from facebookProfilePosts'),
        count: COUNT,
        cursor,
      },
      meta
    ),
  { allowEmpty: true }
);
await page('facebookHashtag', (cursor) =>
  client.facebookHashtag({ tag: 'ai', count: COUNT, cursor }, meta)
);

// Instagram
await check('instagramSearch', async () =>
  list(await client.instagramSearch({ query: 'instagram', count: COUNT }))
);
await check('instagramProfile', async () =>
  object(await client.instagramProfile({ username: 'instagram' }), 'username')
);
const instagramMedia = await page('instagramProfilePosts', (cursor) =>
  client.instagramProfilePosts(
    { username: 'instagram', count: COUNT, cursor },
    meta
  )
);
const media = instagramMedia?.find((item) => item.shortcode);
// By URL, so the `/` in the ID goes through the encoded {id:path} route.
await check('instagramMedia (by URL)', async () =>
  object(
    await client.instagramMedia({
      id: need(media?.url, 'media URL from instagramProfilePosts'),
    })
  )
);
await page(
  'instagramComments',
  (cursor) =>
    client.instagramComments(
      {
        shortcode: need(
          media?.shortcode,
          'shortcode from instagramProfilePosts'
        ),
        count: COUNT,
        cursor,
      },
      meta
    ),
  { allowEmpty: true }
);
await page('instagramHashtag', (cursor) =>
  client.instagramHashtag({ tag: 'ai', count: COUNT, cursor }, meta)
);

// One social cursor page: the first list route that returned x-desearch-next-cursor.
if (cursors.length > 0) {
  const { name, follow } = cursors[0];
  await check(`${name} (next page via cursor)`, async () =>
    list((await follow()).data, { allowEmpty: true })
  );
} else {
  failures += 1;
  console.log(
    'FAIL social cursor: no list route returned an x-desearch-next-cursor header'
  );
}

// Network stats (no API key needed)
await check('networkStats', async () =>
  object(await client.networkStats(), 'total_searchable_pages')
);
await check('networkStatsHistory', async () =>
  list(object(await client.networkStatsHistory(), 'points').points)
);
await check('streamNetworkStats', async () => {
  for await (const event of client.streamNetworkStats({
    signal: AbortSignal.timeout(15000),
  })) {
    object(event.data, 'updated_at');
    return;
  }
  throw new Error('no stats event within 15 seconds');
});

// People Search: a billed job, only with --with-people.
if (withPeople) {
  await check(
    'tiktokCreatorSearch + cancelPeopleTask (--with-people)',
    async () => {
      const task = await client.tiktokCreatorSearch(
        { query: 'Skincare creators who review sunscreen', count: 5 },
        { idempotencyKey: randomUUID() }
      );
      const cancelled = await client.cancelPeopleTask(task).catch((error) => {
        if (error?.name === 'PeopleTaskConflictError') return error.task;
        throw error;
      });
      object(cancelled, 'status');
    }
  );
} else {
  console.log(
    'SKIP People Search: pass --with-people to start (and cancel) a billed task'
  );
}

console.log(failures === 0 ? 'OK: all calls passed' : `${failures} failed`);
process.exitCode = failures === 0 ? 0 : 1;
