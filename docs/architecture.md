# desearch.js architecture

## Overview

`desearch.js` is a thin TypeScript SDK with a deliberately small implementation footprint.

The current architecture is built from four main pieces:
- `src/index.ts` for the client implementation
- `src/types.ts` for the exported type contracts
- `tsup.config.ts` for package builds
- `package.json` for scripts, exports, and npm metadata

The core design choice is simplicity. Most SDK behavior is a direct translation from typed method input to HTTP request, then from HTTP response back to the caller.

## Source layout

### `src/index.ts`

This file contains:
- the fixed `BASE_URL`
- the `Desearch` class
- the shared private `handleRequest<T>()` helper
- response metadata parsing helpers for optional cost/usage visibility
- all 13 public SDK methods

Those public methods fall into three groups:
- AI search methods
- X or Twitter methods
- web methods

### `src/types.ts`

This file contains the exported type surface, including:
- request interfaces
- response interfaces
- opt-in response metadata wrapper types
- literal union types for API options
- nested X tweet and user models
- API error payload types

The repo is more type-heavy than implementation-heavy. Most of its complexity exists to make the HTTP API easier to consume from TypeScript.

### Packaging files

- `tsup.config.ts` compiles `src/index.ts` into CJS and ESM output, with declaration files, sourcemaps, and a clean build directory
- `package.json` exposes those build artifacts through `main`, `module`, `types`, and conditional `exports`

## Client design

The SDK exposes one public class:

```ts
class Desearch {
  private baseURL: string;
  private apiKey: string;
}
```

### Constructor behavior

```ts
constructor(apiKey: string) {
  this.baseURL = BASE_URL;
  this.apiKey = apiKey;
}
```

Key consequences of that design:
- the constructor only accepts an API key
- the base URL is not configurable per instance
- authentication is implemented as a raw `Authorization` header value

That keeps construction simple, but it makes staging, local, or self-hosted targets non-configurable from the public API.

## Request flow

Every public method delegates to:

```ts
private async handleRequest<T>(method: string, path: string, payload?: unknown): Promise<T>
```

That helper owns the full transport flow.

### 1. URL construction

The final request URL is built from:
- `this.baseURL`
- the endpoint path passed by the public method

### 2. Header construction

All requests include:

```ts
{ Authorization: this.apiKey }
```

For POST requests only, the helper also adds:

```ts
{ 'Content-Type': 'application/json' }
```

### 3. GET serialization

For GET requests, payload objects are converted to `URLSearchParams`.

Behavior in the current code:
- `undefined` and `null` values are skipped
- scalar values are stringified and appended once
- array values are serialized by repeating the same key

That repeated-key encoding is especially important for `xPostsByUrls`, which sends multiple `urls` values on a GET route.

### 4. POST serialization

For POST requests, payloads are sent with:
- `JSON.stringify(payload)`
- `Content-Type: application/json`

### 5. Response parsing

The helper checks `response.headers.get('content-type')`.

Behavior:
- if the content type contains `application/json`, the SDK parses `response.json()`
- otherwise it parses `response.text()`
- by default, the parsed payload is returned directly
- when a public method is called with `{ includeMetadata: true }`, the parsed payload is returned as `{ data, metadata }`

This is why `webCrawl()` returns `Promise<string>` while most other methods return JSON-shaped data by default. The opt-in metadata wrapper also works for `webCrawl()` and JSON array endpoints because metadata is read from response headers instead of being merged into the response body.

### 6. Response cost metadata

The SDK can expose per-request cost metadata without changing the default return shape. Each public method has overloads:
- default call: `Promise<T>`
- opt-in call with `{ includeMetadata: true }`: `Promise<DesearchResponse<T>>`

The wrapper is:

```ts
{
  data: T,
  metadata: {
    costUsd?: number,
    usageCount?: number,
    service?: string,
    currency?: string,
  },
}
```

Metadata comes from these response headers on the same API response:
- `X-Desearch-Cost-Usd`
- `X-Desearch-Usage-Count`
- `X-Desearch-Service`
- `X-Desearch-Currency`

Numeric headers are parsed defensively. Missing, empty, or malformed values are omitted from `metadata` instead of throwing or failing an otherwise successful SDK call.

### 7. Error normalization

The helper uses two error paths:
- HTTP failures become `Error('HTTP <status>: <body>')`
- everything else becomes `Error('Unexpected Error: <message>')`

Why this matters:
- callers get a consistent thrown message shape
- callers do not get typed SDK error classes or structured error instances

## Method groups

### AI search methods

These use POST requests with JSON bodies:
- `aiSearch`
- `aiWebLinksSearch`
- `aiXLinksSearch`

#### `aiSearch` special behavior

`aiSearch` is the only method that changes caller input before sending it.

It does this:

```ts
const { streaming, ...rest } = payload as AiSearchRequest & { streaming?: boolean };
const body = { ...rest, streaming: false };
```

So even if a caller tries to send `streaming: true`, the SDK forces non-streaming behavior.

### X or Twitter methods

These use GET requests with query-string serialization:
- `xSearch`
- `xPostsByUrls`
- `xPostById`
- `xPostsByUser`
- `xPostRetweeters`
- `xUserPosts`
- `xUserReplies`
- `xPostReplies`
- `xTrends`

The X section also drives most of the type complexity in `src/types.ts`, because tweet and user payloads have many nested fields.

### Web methods

These use GET requests:
- `webSearch`
- `webCrawl`

The main difference is the response shape:
- `webSearch` expects JSON
- `webCrawl` can return text or HTML, and the SDK treats non-JSON responses as text

## Type-system design

The type layer follows a few clear patterns.

### Literal unions instead of runtime enums

Examples:
- `ToolEnum`
- `WebToolEnum`
- `DateFilterEnum`
- `ResultTypeEnum`

Why:
- they provide compile-time constraints without adding runtime bundle code

### One request type per method family

Examples:
- `AiSearchRequest`
- `XSearchParams`
- `WebCrawlParams`

Why:
- the SDK is mostly a typed transport wrapper, so request contracts are a big part of the package value

### Detailed X models

The largest type investment is in X payload modeling:
- tweets
- users
- entities
- media metadata
- professional info
- pagination cursors

Why:
- these endpoints return the richest nested structures in the repo

### Deliberately broad AI response typing

```ts
export type AiSearchResponse = ResponseData | Record<string, unknown> | string;
```

Why:
- the upstream AI response shape is not modeled as a strict discriminated union in this SDK
- the package reflects the API surface instead of imposing a narrower runtime contract

## Packaging architecture

The package is configured for npm distribution with:
- `name: desearch-js`
- `main: ./dist/index.js`
- `module: ./dist/index.mjs`
- `types: ./dist/index.d.ts`
- conditional `exports` for both `require` and `import`

This gives consumers:
- CommonJS support
- ESM support
- bundled TypeScript declarations

## Key design decisions

### Thin wrapper instead of a framework-style SDK

Why:
- the repo exposes a modest set of public endpoints
- keeping transport logic centralized makes the package easy to audit
- most behavior stays close to the HTTP API instead of inventing SDK-only abstractions

Tradeoff:
- fewer convenience features for callers
- fewer extension points for advanced consumers

### Fixed production base URL instead of per-instance configuration

Why:
- the constructor stays minimal
- package behavior is predictable across integrations
- the repo is currently positioned as a direct client for the public hosted API

Tradeoff:
- staging, local, and self-hosted targets are not first-class
- advanced consumers must wrap or patch the SDK if they need alternate environments

### Node transport via `undici`

Why:
- the SDK is explicitly described as Node.js-focused in package metadata
- `undici` gives a predictable fetch implementation in Node
- the current source avoids introducing a broader transport abstraction layer

Tradeoff:
- browser-first use cases are not the primary target
- changing transport later would require a public API decision

For the formal record of these decisions, see [ADR 0001](./decisions/0001-thin-node-sdk-transport.md).
