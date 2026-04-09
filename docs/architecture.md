# desearch.js architecture

## Overview

`desearch.js` is a small API wrapper centered around a single `Desearch` class in `src/index.ts`.

The architecture is intentionally thin:
- one client class
- one internal request helper
- one shared type module
- generated dist output for CommonJS, ESM, and declarations

This keeps the package small and easy to audit, but it also means most behavior is delegated directly to the upstream API.

## Module layout

- `src/index.ts`: client implementation and exported default class
- `src/types.ts`: request, response, entity, and error interfaces
- `package.json`: package exports, scripts, and publish configuration
- `tsup.config.ts`: build pipeline configuration for `dist/`

## Client design

The public entry point is:

```ts
class Desearch {
  private baseURL: string;
  private apiKey: string;
}
```

### Construction

The constructor takes one value:
- `apiKey: string`

At construction time the class stores:
- `baseURL = 'https://api.desearch.ai'`
- `apiKey`

The base URL is fixed inside the SDK rather than configured per instance.

## Request pipeline

All public methods delegate to a single private helper:

```ts
private async handleRequest<T>(method: string, path: string, payload?: unknown): Promise<T>
```

That helper is responsible for:
- building the final request URL from `baseURL + path`
- attaching the `Authorization` header with the raw API key
- serializing GET payloads into `URLSearchParams`
- serializing POST payloads with `JSON.stringify`
- selecting JSON parsing vs text parsing from the response `content-type`
- normalizing thrown errors

### GET requests

For GET methods, the helper:
- ignores `undefined` and `null` values
- appends scalar values as query params
- appends arrays by repeating the same key multiple times

That repeated-key behavior matters for calls like `xPostsByUrls`, where `urls` is sent as a GET query array.

### POST requests

For POST methods, the helper:
- sets `Content-Type: application/json`
- sends the payload as a JSON string body

### Response parsing

If the response content type contains `application/json`, the SDK returns `await response.json()`.

Otherwise it falls back to `await response.text()`.

This is why `webCrawl` returns `Promise<string>` even though most other methods return JSON-shaped data.

### Error model

The helper distinguishes between HTTP failures and other exceptions:
- HTTP failures become `Error('HTTP <status>: <body>')`
- all other failures become `Error('Unexpected Error: <message>')`

There are type definitions for common API error payloads in `src/types.ts`, but they are not instantiated as typed runtime error classes.

## Async design

Every SDK method is asynchronous and returns a `Promise`.

There is no internal queue, retry layer, or cancellation abstraction. The async model is just direct request-response execution on top of `undici`'s `fetch`.

Implications:
- callers own concurrency control
- callers own retry strategy
- callers own timeout strategy
- callers can use `await` or standard promise chaining

### `aiSearch` special case

`aiSearch` is the only method with extra request shaping.

It removes any incoming `streaming` field from the caller payload and always sends:

```json
{ "streaming": false }
```

That means the current client intentionally forces non-streaming behavior even if upstream API support expands.

## Public API structure

The class groups naturally into three areas.

### AI search methods

- `aiSearch`
- `aiWebLinksSearch`
- `aiXLinksSearch`

These use POST requests and structured JSON bodies.

### X data methods

- `xSearch`
- `xPostsByUrls`
- `xPostById`
- `xPostsByUser`
- `xPostRetweeters`
- `xUserPosts`
- `xUserReplies`
- `xPostReplies`
- `xTrends`

These use GET requests with query-string serialization.

### Web methods

- `webSearch`
- `webCrawl`

These are also GET requests.

## TypeScript type system

`src/types.ts` is the schema backbone of the SDK.

It provides four main type layers.

### 1. Literal types and enums

These constrain common API fields:
- `ToolEnum`
- `WebToolEnum`
- `DateFilterEnum`
- `ResultTypeEnum`

These are string literal unions, not runtime enums, so they disappear at build time and keep bundle overhead low.

### 2. Request contracts

Each public method takes a matching request interface. Examples:
- `AiSearchRequest`
- `XSearchParams`
- `WebCrawlParams`

This keeps the call sites strongly typed for TypeScript consumers.

### 3. Response contracts

The SDK models both high-level and endpoint-specific responses, including:
- aggregated search response shapes
- web result collections
- X timeline and retweeter collections
- trends responses

One deliberate weak spot is `AiSearchResponse`, which remains permissive because the upstream response can vary.

### 4. Rich X entity models

The largest share of the type file documents nested tweet and user data:
- tweet metadata
- media payloads
- entities and mentions
- profile metadata
- professional categories
- pagination cursors

This is the most structurally detailed part of the SDK.

## Packaging and distribution

`package.json` configures the package for npm distribution.

Key packaging details:
- package name: `desearch-js`
- current version: `1.3.0`
- public npm publish config
- `main`: `./dist/index.js`
- `module`: `./dist/index.mjs`
- `types`: `./dist/index.d.ts`
- conditional `exports` for `require` and `import`

This gives consumers:
- CommonJS compatibility
- ESM compatibility
- bundled type declarations

## Build system

The repo uses `tsup` to compile `src/index.ts` into distributable artifacts.

Relevant scripts:
- `build-fast`: cjs + esm
- `build`: default tsup build
- `generate-docs`: TypeDoc markdown output
- `test`: Vitest run

The package is small enough that there is no multi-package workspace, code generation layer, or custom runtime transport abstraction.

## Architectural tradeoffs

### Strengths

- very small surface area
- easy to read and maintain
- good TypeScript coverage for payloads and X entities
- dual-module packaging is already in place

### Limitations

- hard-coded production base URL
- no transport customization hooks
- no middleware or interceptors
- no streaming implementation
- no typed runtime error classes
- no retries, backoff, timeout configuration, or abort support surfaced by the class

## Recommended mental model

Treat `desearch.js` as a typed convenience wrapper around the HTTP API, not as a heavy SDK framework.

It is best for:
- server-side Node usage
- scripts and backend services
- apps that want typed request payloads and response shapes with minimal abstraction

If you need advanced transport control, you currently have to add it outside the SDK or change the client implementation itself.
