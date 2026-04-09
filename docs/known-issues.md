# desearch.js known issues and limitations

This document only lists issues that are visible from the current repository state.

## 1. `aiSearch` does not support streaming

Status: ⚠️ degraded

The implementation explicitly removes any incoming `streaming` field and always sends `streaming: false`.

Impact:
- callers cannot opt into streamed partial results through the SDK
- the method only supports full-response behavior

## 2. Base URL is hard-coded

Status: ⚠️ limitation

The client always targets:

```txt
https://api.desearch.ai
```

Impact:
- no built-in support for staging, local development, or self-hosted API targets
- testing alternate environments requires editing the SDK or mocking at a lower layer

## 3. Error handling is string-based

Status: ⚠️ degraded ergonomics

HTTP failures throw plain `Error` instances with embedded status and response body text.

Impact:
- no typed SDK error hierarchy
- downstream code must parse strings or inspect the original request context separately

## 4. No timeout, retry, or abort controls

Status: ⚠️ limitation

The SDK calls `undici` fetch directly and does not expose:
- timeout settings
- retries
- exponential backoff
- abort signals

Impact:
- callers must implement reliability controls outside the SDK
- long-running or rate-limited integrations need their own wrappers

## 5. `xPostsByUrls` depends on repeated GET query parameters

Status: ⚠️ compatibility caveat

`xPostsByUrls` serializes `urls: string[]` into repeated query keys using `URLSearchParams`.

Impact:
- works only if the upstream API consistently accepts repeated `urls` parameters on a GET route
- integrators debugging mismatches should inspect the final encoded URL first

## 6. `AiSearchResponse` is intentionally loose

Status: ⚠️ typing caveat

The response type is:
- `ResponseData`
- `Record<string, unknown>`
- `string`

Impact:
- TypeScript consumers do not get one stable response contract for `aiSearch`
- callers may need runtime narrowing before reading fields safely

## 7. Node-first transport choice

Status: ⚠️ limitation

The SDK imports `fetch` from `undici` directly.

Impact:
- the package is clearly optimized for Node runtimes
- browser usage may need bundler shims or a different transport strategy depending on the app setup

## 8. No write-side API coverage in this repo

Status: ❌ missing feature

The current public client only wraps read/search/crawl style endpoints.

Impact:
- if the wider Desearch platform grows mutation endpoints, this SDK does not expose them yet
- consumers needing unsupported endpoints must call the HTTP API directly
