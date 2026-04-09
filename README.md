# desearch.js

Official JavaScript and TypeScript SDK for the Desearch API.

It publishes to npm as `desearch-js` and the current package version in this repo is `1.3.0`.

## Install

```bash
npm install desearch-js
```

## What this SDK covers

The SDK wraps the public Desearch API for:
- AI multi-source search
- AI link retrieval for web sources and X posts
- X data search and retrieval
- Web SERP search
- Web crawling

See also:
- [docs/features.md](./docs/features.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/known-issues.md](./docs/known-issues.md)

## Documentation map

- `README.md`: install, imports, auth, method usage, packaging, and error behavior
- `docs/features.md`: SDK capability and method-by-method status inventory
- `docs/architecture.md`: request flow, async model, type layout, and packaging structure
- `docs/known-issues.md`: current limitations and integration caveats visible from source

## Import styles

### ESM

```ts
import Desearch from 'desearch-js';

const client = new Desearch(process.env.DESEARCH_API_KEY!);
```

### CommonJS

```js
const Desearch = require('desearch-js');

const client = new Desearch(process.env.DESEARCH_API_KEY);
```

The package exports both module formats from `dist/`:
- CommonJS entry: `./dist/index.js`
- ESM entry: `./dist/index.mjs`
- Type declarations: `./dist/index.d.ts`

## Quick start

```ts
import Desearch from 'desearch-js';

const client = new Desearch(process.env.DESEARCH_API_KEY!);

const result = await client.aiSearch({
  prompt: 'latest Bittensor developments',
  tools: ['web', 'twitter', 'reddit'],
  date_filter: 'PAST_24_HOURS',
  result_type: 'LINKS_WITH_FINAL_SUMMARY',
  count: 10,
});

console.log(result);
```

## Authentication

Construct the client with your Desearch API key:

```ts
const client = new Desearch('your-api-key');
```

Requests send the key in the `Authorization` header.

## API surface

Method index:
- AI search: `aiSearch`, `aiWebLinksSearch`, `aiXLinksSearch`
- X data: `xSearch`, `xPostsByUrls`, `xPostById`, `xPostsByUser`, `xPostRetweeters`, `xUserPosts`, `xUserReplies`, `xPostReplies`, `xTrends`
- Web: `webSearch`, `webCrawl`

### AI search

#### `aiSearch(payload)`

Runs the multi-source AI search endpoint at `POST /desearch/ai/search`.

Supported request fields:
- `prompt` (required)
- `tools` (required): `web`, `hackernews`, `reddit`, `wikipedia`, `youtube`, `twitter`, `arxiv`
- `start_date`
- `end_date`
- `date_filter`: `PAST_24_HOURS`, `PAST_2_DAYS`, `PAST_WEEK`, `PAST_2_WEEKS`, `PAST_MONTH`, `PAST_2_MONTHS`, `PAST_YEAR`, `PAST_2_YEARS`
- `result_type`: `ONLY_LINKS`, `LINKS_WITH_FINAL_SUMMARY`
- `system_message`
- `scoring_system_message`
- `count`

Notes:
- The SDK strips any incoming `streaming` flag and always sends `streaming: false`.
- Response type is broad and may be structured JSON or a string depending on the API response.

```ts
const result = await client.aiSearch({
  prompt: 'recent AI chip announcements',
  tools: ['web', 'hackernews', 'reddit', 'twitter'],
  result_type: 'LINKS_WITH_FINAL_SUMMARY',
  count: 20,
});
```

#### `aiWebLinksSearch(payload)`

Runs `POST /desearch/ai/search/links/web` for web-only link retrieval.

```ts
const result = await client.aiWebLinksSearch({
  prompt: 'open source browser automation tools',
  tools: ['web', 'hackernews', 'reddit', 'youtube'],
  count: 20,
});
```

#### `aiXLinksSearch(payload)`

Runs `POST /desearch/ai/search/links/twitter` for AI-assisted X link retrieval.

```ts
const result = await client.aiXLinksSearch({
  prompt: 'Bittensor subnet updates',
  count: 20,
});
```

### X endpoints

#### `xSearch(params)`

Runs `GET /twitter`.

Useful filters include:
- `query`
- `sort`
- `user`
- `start_date`, `end_date`
- `lang`
- `verified`, `blue_verified`
- `is_quote`, `is_video`, `is_image`
- `min_retweets`, `min_replies`, `min_likes`
- `count`

```ts
const tweets = await client.xSearch({
  query: 'bittensor',
  sort: 'Top',
  lang: 'en',
  min_likes: 50,
  count: 20,
});
```

#### `xPostsByUrls(params)`

Runs `GET /twitter/urls`.

```ts
const tweets = await client.xPostsByUrls({
  urls: ['https://x.com/DesearchAI/status/1234567890123456789'],
});
```

#### `xPostById(params)`

Runs `GET /twitter/post`.

```ts
const tweet = await client.xPostById({
  id: '1234567890123456789',
});
```

#### `xPostsByUser(params)`

Runs `GET /twitter/post/user`.

```ts
const tweets = await client.xPostsByUser({
  user: 'DesearchAI',
  query: 'launch',
  count: 10,
});
```

#### `xPostRetweeters(params)`

Runs `GET /twitter/post/retweeters`.

```ts
const retweeters = await client.xPostRetweeters({
  id: '1234567890123456789',
});
```

#### `xUserPosts(params)`

Runs `GET /twitter/user/posts`.

```ts
const timeline = await client.xUserPosts({
  username: 'DesearchAI',
});
```

#### `xUserReplies(params)`

Runs `GET /twitter/replies`.

```ts
const replies = await client.xUserReplies({
  user: 'DesearchAI',
  count: 20,
});
```

#### `xPostReplies(params)`

Runs `GET /twitter/replies/post`.

```ts
const replies = await client.xPostReplies({
  post_id: '1234567890123456789',
  count: 20,
});
```

#### `xTrends(params)`

Runs `GET /twitter/trends`.

```ts
const trends = await client.xTrends({
  woeid: 23424977,
  count: 30,
});
```

### Web endpoints

#### `webSearch(params)`

Runs `GET /web`.

```ts
const results = await client.webSearch({
  query: 'site:desearch.ai sdk docs',
  start: 0,
});
```

#### `webCrawl(params)`

Runs `GET /web/crawl` and returns text or HTML as a string.

```ts
const page = await client.webCrawl({
  url: 'https://desearch.ai',
  format: 'text',
});
```

## TypeScript

The package ships its own declaration file and exports request and response shapes from `src/types.ts` into the generated `dist/index.d.ts` bundle.

Important exported type families include:
- search request types
- X request and response types
- web search and crawl types
- detailed `TwitterScraperTweet` and `TwitterScraperUser` models
- error payload types such as `HTTPValidationError`

## Error handling

Non-2xx responses throw `Error` with the format:

```txt
HTTP <status>: <response body>
```

Other failures are wrapped as:

```txt
Unexpected Error: <message>
```

Example:

```ts
try {
  await client.webSearch({ query: 'desearch' });
} catch (error) {
  console.error(error);
}
```

## Development

Available scripts from `package.json`:
- `npm run build`
- `npm run build-fast`
- `npm test`
- `npm run generate-docs`
- `npm run publish:beta`
- `npm run publish:stable`

## Links

- <https://github.com/Desearch-ai/desearch.js>
- <https://desearch.ai>
- <https://console.desearch.ai>
