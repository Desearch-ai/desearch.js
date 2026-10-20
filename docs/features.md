# desearch.js features

This inventory is based on the current repository source:
- `src/index.ts`
- `src/types.ts`
- `package.json`
- `tsup.config.ts`

Status legend:
- ✅ working
- ⚠️ degraded
- ❌ broken
- 🚧 in progress

## Package-level features

| Feature | Status | Evidence | Notes |
| --- | --- | --- | --- |
| npm package publishing as `desearch-js` | ✅ | `package.json` `name` | Package metadata is set for public publishing. |
| Dual-module output (`cjs` + `esm`) | ✅ | `tsup.config.ts` `format`, `package.json` exports | Ships `dist/index.js` and `dist/index.mjs`. |
| Bundled TypeScript declarations | ✅ | `tsup.config.ts` `dts: true`, `package.json` `types` | Ships `dist/index.d.ts`. |
| Source maps and clean builds | ✅ | `tsup.config.ts` `sourcemap: true`, `clean: true` | Build artifacts are regenerated from a clean output directory. |
| Generated markdown API docs | ✅ | `package.json` `generate-docs` | TypeDoc markdown output can be regenerated from `src/index.ts`. |
| Single shared HTTP request path | ✅ | `src/index.ts` `handleRequest` | Every public method uses the same transport helper. |
| Runtime request validation | ❌ | no validation layer in `src/index.ts` | Type safety exists at compile time only. |
| Configurable base URL | ❌ | fixed `BASE_URL` constant in `src/index.ts` | Always targets the production API. |
| Retry / timeout / abort controls | ❌ | `fetch` call only uses `{ method, headers, body }` | No resilience or cancellation knobs are exposed for individual requests. |
| People Search polling and pagination helpers | ✅ | `src/index.ts` `waitForPeopleTask`, `iterPeopleResultPages` | Polls a task with an interval and timeout; iterates results pages by `next_cursor`. No AbortSignal. |
| People Search idempotent creates | ✅ | `src/index.ts` `peopleSearch` | `idempotencyKey` is sent as the `Idempotency-Key` header. |
| Streaming AI responses | ❌ | `aiSearch` forces `streaming: false` | The SDK does not surface streamed results. |
| Browser-first transport abstraction | ❌ | `import { fetch } from 'undici'` | Current transport choice is explicitly Node-oriented. |

## Public method inventory

| Method | Endpoint | Status | Why |
| --- | --- | --- | --- |
| `aiSearch` | `POST /desearch/ai/search` | ⚠️ | Works as a JSON wrapper, but it overrides caller intent and always sends `streaming: false`. |
| `aiWebLinksSearch` | `POST /desearch/ai/search/links/web` | ✅ | Direct typed wrapper for web-source link retrieval. |
| `aiXLinksSearch` | `POST /desearch/ai/search/links/twitter` | ✅ | Direct typed wrapper for X link retrieval. |
| `xSearch` | `GET /twitter` | ✅ | Broad filter support through shared query-string serialization. |
| `xPostsByUrls` | `GET /twitter/urls` | ⚠️ | Works as long as the upstream API continues to accept repeated `urls` query keys. |
| `xPostById` | `GET /twitter/post` | ✅ | Simple single-post lookup. |
| `xPostsByUser` | `GET /twitter/post/user` | ✅ | User-scoped post search with optional keyword filtering. |
| `xPostRetweeters` | `GET /twitter/post/retweeters` | ✅ | Supports cursor pagination. |
| `xUserPosts` | `GET /twitter/user/posts` | ✅ | Returns profile data plus tweets and optional cursor. |
| `xUserReplies` | `GET /twitter/replies` | ✅ | User reply lookup works through GET params. |
| `xPostReplies` | `GET /twitter/replies/post` | ✅ | Post reply lookup works through GET params. |
| `xTrends` | `GET /twitter/trends` | ✅ | WOEID-based trends lookup. |
| `webSearch` | `GET /web` | ✅ | SERP-style web search wrapper. |
| `extract` | `GET /web/extract` | ✅ | Canonical Extract API method; returns non-JSON text or HTML content. |
| `webCrawl` | `GET /web/crawl` | ⚠️ legacy | Deprecated compatibility method for existing clients. |
| `xProfileSearch` | `POST /desearch/people/search/x` | ✅ | Billed. Starts an X Profile Search task (HTTP 202). |
| `youtubeCreatorSearch` | `POST /desearch/people/search/youtube` | ✅ | Billed. Starts a YouTube Creator Search task. |
| `linkedinProfileSearch` | `POST /desearch/people/search/linkedin` | ✅ | Billed. Starts a LinkedIn Profile Search task. |
| `tiktokCreatorSearch` | `POST /desearch/people/search/tiktok` | ✅ | Billed. Starts a TikTok Creator Search task. |
| `listPeopleTasks` | `GET /desearch/people/tasks` | ✅ | Free. `status` arrays are sent comma-separated; `metadata` pairs are sent as `metadata.<key>=<value>`; cursor pagination. |
| `getPeopleTask` | `GET /desearch/people/tasks/{task_id}` | ✅ | Free. Status, progress and cost of one task. |
| `getPeopleResults` | `GET /desearch/people/tasks/{task_id}/results` | ✅ | Free. One results page with `next_cursor` and `has_more`. |
| `pausePeopleTask` | `POST /desearch/people/tasks/{task_id}/pause` | ✅ | Free. Throws `PeopleTaskConflictError` on 409. |
| `resumePeopleTask` | `POST /desearch/people/tasks/{task_id}/resume` | ✅ | Free. Throws `PeopleTaskConflictError` on 409. |
| `cancelPeopleTask` | `POST /desearch/people/tasks/{task_id}/cancel` | ✅ | Free. Throws `PeopleTaskConflictError` on 409. |
| `exportPeopleResults` | `GET /desearch/people/tasks/{task_id}/export` | ✅ | Free. CSV or JSON Lines text; accepts result filters. |
| `listPeopleProfiles` | `GET /desearch/people/profiles` | ✅ | Free. Profiles library with search, sort, paging and result filters. |
| `exportPeopleProfiles` | `GET /desearch/people/profiles/export` | ✅ | Free. CSV or JSON Lines text; accepts result filters. |
| `waitForPeopleTask` | polls `GET /desearch/people/tasks/{task_id}` | ✅ | SDK helper. Resolves when the task ends; throws on timeout. |
| `iterPeopleResultPages` | pages `GET /desearch/people/tasks/{task_id}/results` | ✅ | SDK helper. Async iterator over results pages. |

## Request and response type coverage

### Search and extraction request types

- ✅ `AiSearchRequest`
- ✅ `AiWebLinksSearchRequest`
- ✅ `AiXLinksSearchRequest`
- ✅ `WebSearchParams`
- ✅ `ExtractParams`
- ⚠️ `WebCrawlParams` is retained as a deprecated alias of `ExtractParams`

### X request types

- ✅ `XSearchParams`
- ✅ `XPostsByUrlsParams`
- ✅ `XPostByIdParams`
- ✅ `XPostsByUserParams`
- ✅ `XPostRetweetersParams`
- ✅ `XUserPostsParams`
- ✅ `XUserRepliesParams`
- ✅ `XPostRepliesParams`
- ✅ `XTrendsParams`

### People Search request types

- ✅ `XProfileSearchRequest`, `YouTubeCreatorSearchRequest`, `LinkedInProfileSearchRequest`, `TikTokCreatorSearchRequest`
- ✅ `XProfileSearchFilters`, `YouTubeCreatorSearchFilters`, `LinkedInProfileSearchFilters`, `TikTokCreatorSearchFilters`
- ✅ `PeopleSearchRequestBase` (`query`, `count`, `min_score`, `exclude`, `metadata`)
- ✅ `PeopleSearchOptions` (`idempotencyKey`)
- ✅ `PeopleResultFilters` (`has`, `min_audience`, `max_audience`, `min_score`, `location`, `verified`)
- ✅ `PeopleTaskParams`, `ListPeopleTasksParams`, `GetPeopleResultsParams`, `ExportPeopleResultsParams`, `ListPeopleProfilesParams`, `ExportPeopleProfilesParams`, `WaitForPeopleTaskOptions`

### Response types

- ⚠️ `AiSearchResponse` is intentionally broad: `ResponseData | Record<string, unknown> | string`
- ✅ `WebSearchResponse`
- ✅ `XLinksSearchResponse`
- ✅ `WebSearchResultsResponse`
- ✅ `XRetweetersResponse`
- ✅ `XUserPostsResponse`
- ✅ `XTrendsResponse`
- ✅ `PeopleTask`, `PeopleSearchTask` (task plus reservation cost fields), `PeopleTaskList`, `PeopleTaskConflictResponse`
- ✅ `Person`, `PeopleScore`, `PeopleEvidence`, `PersonMetrics`, `PersonLink`, `PersonContact`
- ✅ `PeopleCompletionReason`, `PeopleTaskWarning` (task `completion_reason`, `coverage_limited`, `warnings`)
- ✅ `PeopleCriterionCheck`, `PeopleCriterionVerdict` (score `criteria_checks`, `fully_verified`)
- ✅ `PersonAttributes`, `PeopleEnrichmentError` (`attributes.enrichment`, `attributes.enrichment_error`)
- ✅ `PeopleResultsPage`, `PeopleProfile`, `PersonFoundBy`, `PeopleProfilesPage`

### Detailed X entity models

- ✅ `TwitterScraperTweet`
- ✅ `TwitterScraperUser`
- ✅ nested media, entity, professional-info, and pagination-related sub-types in `src/types.ts`

### Error payload types

- ✅ `UnauthorizedResponse`
- ✅ `TooManyRequestsResponse`
- ✅ `InternalServerErrorResponse`
- ✅ `MovedPermanentlyResponse`
- ✅ `HTTPValidationError`
- ✅ `ValidationError`
- ✅ `PeopleTaskConflictError` (runtime class thrown by pause, resume and cancel on HTTP 409)

## Practical feature summary

### What is solid today

- typed wrappers for the current public read, search, and extraction endpoints
- People Search across X, YouTube, LinkedIn and TikTok, with task control, polling and pagination helpers
- one predictable request path across all public methods
- Node-oriented HTTP transport through `undici`
- CommonJS, ESM, and declaration output for package consumers

### What is degraded today

- `aiSearch` cannot stream through the SDK
- `AiSearchResponse` stays intentionally loose
- `xPostsByUrls` depends on repeated GET query keys for array input
- runtime failures surface as plain `Error` strings

### What is missing today

- configurable transport options
- runtime schema validation
- write or mutation endpoints beyond People Search tasks
- a browser-first transport abstraction
