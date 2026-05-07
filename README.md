# desearch.js

Official JavaScript and TypeScript SDK for the Desearch public API.

This repo publishes the npm package `desearch-js`. In the current source tree, the package version is `1.3.0`.

Related docs:
- [docs/features.md](./docs/features.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/known-issues.md](./docs/known-issues.md)
- [docs/decisions/0001-thin-node-sdk-transport.md](./docs/decisions/0001-thin-node-sdk-transport.md)

## Package purpose

`desearch.js` is a thin, Node-oriented SDK for the Desearch API. It wraps the public read-side endpoints implemented in `src/index.ts` behind one `Desearch` client class and ships a typed surface from `src/types.ts`.

What it covers today:
- AI multi-source search
- AI web-links search
- AI X-links search
- X search and lookup endpoints
- web search
- web crawl

What it does not try to be:
- a browser-first SDK
- a configurable transport layer
- a write or mutation client
- a framework with retries, pagination helpers, or runtime validation

## Quick Start

### Install

```bash
npm install desearch-js
```

### ESM usage

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

### CommonJS usage

```js
const Desearch = require('desearch-js').default;

const client = new Desearch(process.env.DESEARCH_API_KEY);
```

## Authentication

The constructor accepts a single argument, your API key:

```ts
const client = new Desearch('your-api-key');
```

The SDK sends that value as the `Authorization` header on every request.

## API overview

### AI search methods

- `aiSearch(payload)` → `POST /desearch/ai/search`
- `aiWebLinksSearch(payload)` → `POST /desearch/ai/search/links/web`
- `aiXLinksSearch(payload)` → `POST /desearch/ai/search/links/twitter`

### X methods

- `xSearch(params)` → `GET /twitter`
- `xPostsByUrls(params)` → `GET /twitter/urls`
- `xPostById(params)` → `GET /twitter/post`
- `xPostsByUser(params)` → `GET /twitter/post/user`
- `xPostRetweeters(params)` → `GET /twitter/post/retweeters`
- `xUserPosts(params)` → `GET /twitter/user/posts`
- `xUserReplies(params)` → `GET /twitter/replies`
- `xPostReplies(params)` → `GET /twitter/replies/post`
- `xTrends(params)` → `GET /twitter/trends`

### Web methods

- `webSearch(params)` → `GET /web`
- `webCrawl(params)` → `GET /web/crawl`

## Usage examples

### AI search

```ts
const result = await client.aiSearch({
  prompt: 'recent AI chip announcements',
  tools: ['web', 'hackernews', 'reddit', 'twitter'],
  result_type: 'LINKS_WITH_FINAL_SUMMARY',
  count: 20,
});
```

Notes:
- `tools` accepts the source names defined in `src/types.ts`: `web`, `hackernews`, `reddit`, `wikipedia`, `youtube`, `twitter`, `arxiv`
- `aiSearch` always sends `streaming: false`, even if a caller tries to add a `streaming` field manually

### AI web links search

```ts
const links = await client.aiWebLinksSearch({
  prompt: 'open source browser automation tools',
  tools: ['web', 'hackernews', 'reddit', 'youtube'],
  count: 20,
});
```

### AI X links search

```ts
const xLinks = await client.aiXLinksSearch({
  prompt: 'Bittensor subnet updates',
  count: 20,
});
```

### X search

```ts
const tweets = await client.xSearch({
  query: 'bittensor',
  sort: 'Top',
  lang: 'en',
  min_likes: 50,
  count: 20,
});
```

### X posts by URL

```ts
const tweets = await client.xPostsByUrls({
  urls: ['https://x.com/DesearchAI/status/1234567890123456789'],
});
```

### Web search

```ts
const results = await client.webSearch({
  query: 'site:desearch.ai sdk docs',
  start: 0,
});
```

### Web crawl

```ts
const page = await client.webCrawl({
  url: 'https://desearch.ai',
  format: 'text',
});
```

### Optional response cost metadata

SDK methods return the same raw payload shape by default:

```ts
const results = await client.webSearch({ query: 'desearch sdk' });
console.log(results.data);
```

If you want per-request cost visibility, pass `{ includeMetadata: true }` as the second argument. The SDK reads metadata from the same API response headers; it does not make an extra billing or pricing request.

```ts
const response = await client.webSearch(
  { query: 'desearch sdk' },
  { includeMetadata: true },
);

console.log(response.data);
console.log(response.metadata.costCents);
console.log(response.metadata.usageCount);
console.log(response.metadata.service);
console.log(response.metadata.currency);
```

The metadata wrapper works for JSON object, JSON array, and text endpoints such as `webCrawl()`. Missing or malformed metadata headers are ignored, so successful API calls still resolve normally.

## Tech stack

- TypeScript `^5.9.3`
- `undici` `>=5` for HTTP transport
- `dotenv` `^17.3.1` as a runtime dependency in `package.json`
- `tsup` `^8.5.1` for bundling
- `vitest` `^4.0.18` for tests
- `typedoc` `^0.28.17`
- `typedoc-plugin-markdown` `^4.10.0`
- output targets: CommonJS, ESM, and bundled declaration files

## Commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Build `dist/` with tsup using the config in `tsup.config.ts` |
| `npm run build-fast` | Build `src/index.ts` directly into CJS and ESM without the full default tsup command |
| `npm test` | Run the Vitest test suite |
| `npm run generate-docs` | Generate markdown API docs from `src/index.ts` using TypeDoc |
| `npm run build:beta` | Build for beta publishing |
| `npm run version:beta` | Bump a beta prerelease version |
| `npm run version:stable` | Bump a stable patch version |
| `npm run publish:beta` | Version, build, and publish with the `beta` npm tag |
| `npm run publish:stable` | Version, build, and publish as the default release |
| `npm run prepublishOnly` | Automatic npm hook that runs `npm run build` before publish |

## Architecture overview

Source layout:
- `src/index.ts`, the `Desearch` client plus the shared `handleRequest<T>()` transport helper
- `src/types.ts`, request/response contracts and X entity models
- `tsup.config.ts`, build output configuration
- `package.json`, scripts, exports, dependency versions, and package metadata

Key design decisions in the current source:
- one shared request helper powers every public method
- GET payloads are serialized through `URLSearchParams`
- POST payloads are serialized as JSON
- response parsing switches between JSON and text based on `content-type`
- default calls return the parsed payload directly, preserving the existing SDK response shape
- callers can opt into `{ data, metadata }` wrappers with `{ includeMetadata: true }`
- `webCrawl()` returns text while most other methods return JSON-shaped data
- the base URL is fixed to `https://api.desearch.ai`
- `aiSearch()` forcibly disables streaming

See [docs/architecture.md](./docs/architecture.md) for the detailed flow and [ADR 0001](./docs/decisions/0001-thin-node-sdk-transport.md) for the reasoning behind the current transport design.

## Error handling

HTTP failures are thrown as plain `Error` instances in this format:

```txt
HTTP <status>: <response body>
```

Non-HTTP failures are wrapped as:

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

## Package outputs

`package.json` exports:
- `./dist/index.js` for CommonJS
- `./dist/index.mjs` for ESM
- `./dist/index.d.ts` for TypeScript declarations

## Known limitations

Current limitations include:
- no configurable base URL
- no timeout, retry, or abort controls in the public API
- `aiSearch` always disables streaming
- runtime failures surface as plain `Error` strings rather than typed SDK errors

Full details: [docs/known-issues.md](./docs/known-issues.md)
