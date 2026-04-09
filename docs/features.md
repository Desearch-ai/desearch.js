# desearch.js features

Source basis for this inventory:
- `src/index.ts`
- `src/types.ts`
- `package.json`

Status legend:
- ✅ working
- ⚠️ degraded or has caveats
- ❌ broken or missing
- 🚧 in progress

## Package-level capabilities

- ✅ Published npm package: `desearch-js`
- ✅ Current repo version: `1.3.0`
- ✅ Dual output build: CommonJS + ESM
- ✅ Bundled TypeScript declarations
- ✅ Generated API docs support via TypeDoc
- ⚠️ No endpoint-specific runtime validation in the client
- ⚠️ No retry, timeout, or backoff controls exposed by the SDK
- ⚠️ No streaming support even though `aiSearch` explicitly handles a `streaming` field

## Public SDK method inventory

| Method | Endpoint | Status | Notes |
| --- | --- | --- | --- |
| `aiSearch` | `POST /desearch/ai/search` | ⚠️ | Core AI search works through a JSON POST, but the SDK forcibly sends `streaming: false` and does not expose streaming responses. |
| `aiWebLinksSearch` | `POST /desearch/ai/search/links/web` | ✅ | Straight wrapper around the web links endpoint. |
| `aiXLinksSearch` | `POST /desearch/ai/search/links/twitter` | ✅ | Straight wrapper around the X links endpoint. |
| `xSearch` | `GET /twitter` | ✅ | Supports broad query-string filters, including arrays and booleans via `URLSearchParams`. |
| `xPostsByUrls` | `GET /twitter/urls` | ⚠️ | Accepts repeated `urls` query params; behavior depends on server support for repeated keys in GET requests. |
| `xPostById` | `GET /twitter/post` | ✅ | Single-post fetch wrapper. |
| `xPostsByUser` | `GET /twitter/post/user` | ✅ | User-scoped post search with optional keyword filter. |
| `xPostRetweeters` | `GET /twitter/post/retweeters` | ✅ | Supports pagination with `cursor`. |
| `xUserPosts` | `GET /twitter/user/posts` | ✅ | Returns user profile plus timeline tweets and optional cursor. |
| `xUserReplies` | `GET /twitter/replies` | ✅ | Fetches a user's tweets and replies. |
| `xPostReplies` | `GET /twitter/replies/post` | ✅ | Fetches replies for a target post. |
| `xTrends` | `GET /twitter/trends` | ✅ | WOEID-based trends lookup. |
| `webSearch` | `GET /web` | ✅ | Simple SERP-style wrapper with pagination offset. |
| `webCrawl` | `GET /web/crawl` | ✅ | Returns raw text or HTML as a string instead of JSON. |

## Type coverage

### Search request types

- ✅ `AiSearchRequest`
- ✅ `AiWebLinksSearchRequest`
- ✅ `AiXLinksSearchRequest`
- ✅ `WebSearchParams`
- ✅ `WebCrawlParams`

### Search response types

- ⚠️ `AiSearchResponse` is intentionally broad: `ResponseData | Record<string, unknown> | string`
- ✅ `WebSearchResponse`
- ✅ `XLinksSearchResponse`
- ✅ `WebSearchResultsResponse`

### X request and response types

- ✅ `XSearchParams`
- ✅ `XPostsByUrlsParams`
- ✅ `XPostByIdParams`
- ✅ `XPostsByUserParams`
- ✅ `XPostRetweetersParams`
- ✅ `XUserPostsParams`
- ✅ `XUserRepliesParams`
- ✅ `XPostRepliesParams`
- ✅ `XTrendsParams`
- ✅ `XRetweetersResponse`
- ✅ `XUserPostsResponse`
- ✅ `XTrendsResponse`

### Detailed X models

- ✅ `TwitterScraperTweet`
- ✅ `TwitterScraperUser`
- ✅ media, entity, professional, and nested response sub-types

### Error models

- ✅ `UnauthorizedResponse`
- ✅ `TooManyRequestsResponse`
- ✅ `InternalServerErrorResponse`
- ✅ `MovedPermanentlyResponse`
- ✅ `HTTPValidationError`
- ✅ `ValidationError`

## Practical gaps to know before using the SDK

- ⚠️ The constructor only accepts an API key and does not allow overriding `baseURL`.
- ⚠️ The client returns plain thrown `Error` objects rather than typed SDK error classes.
- ⚠️ There are no helper abstractions for pagination, rate limiting, or auto-retry.
- ⚠️ The package is Node-oriented and uses `undici` directly.
- ❌ No upload, mutation, or write endpoints are exposed in this repo.
