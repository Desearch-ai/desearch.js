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
| Company Search polling and iteration helpers | ✅ | `src/index.ts` `waitForCompanyTask`, `iterCompanyResults` | Polls a task with an interval and timeout; iterates companies by `next_cursor`. No AbortSignal. |
| Company Search idempotent creates | ✅ | `src/index.ts` `companySearch`, `companyEnrich` | `idempotencyKey` is sent as the `Idempotency-Key` header. |
| Monitors item iteration | ✅ | `src/index.ts` `iterMonitorItems` | Iterates a monitor's items, newest first, by `next_cursor`. |
| Monitors webhook signature check | ✅ | `src/webhooks.ts` `verifyWebhookSignature` | HMAC-SHA256 of `<t>.<raw body>`, 5-minute tolerance, constant-time compare. |
| Streaming AI responses | ❌ | `aiSearch` forces `streaming: false` | The SDK does not surface streamed results. |
| Streaming network stats (Server-Sent Events) | ✅ | `src/index.ts` `streamNetworkStats`, `SseParser` | Async iterator over `stats` events; `lastEventId` replays missed snapshots, `signal` stops it. No automatic reconnect. |
| Social cursor pagination | ✅ | `src/index.ts` `parseResponseMetadata` | `x-desearch-next-cursor` is returned as `metadata.nextCursor` with `{ includeMetadata: true }`; social, YouTube and Reddit list methods take `cursor`. |
| URL-encoded path parameters | ✅ | `src/index.ts` `socialPath`, `peopleTaskPath` | IDs and post URLs that contain `/` reach the `{id:path}` routes as one value. |
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
| `searchApi` | `POST /search` | ✅ | Ranked pages with the best-matching passage; cost fields in the body. |
| `tiktokSearch` | `POST /desearch/tiktok/search` | ✅ | Paginated; `cursor` in the body. |
| `tiktokPostById` | `GET /desearch/tiktok/post/{id}` | ✅ | `id` URL-encoded into the path. |
| `tiktokProfile` | `GET /desearch/tiktok/profile/{username}` | ✅ | Single profile. |
| `tiktokProfilePosts` | `GET /desearch/tiktok/profile/{username}/posts` | ✅ | Paginated. |
| `tiktokComments` | `GET /desearch/tiktok/comments/{video_id}` | ✅ | Paginated. |
| `tiktokHashtag` | `GET /desearch/tiktok/hashtag/{tag}` | ✅ | Paginated. |
| `tiktokTrending` | `GET /desearch/tiktok/trending` | ✅ | One page per region; no cursor. |
| `facebookSearch` | `POST /desearch/facebook/search` | ✅ | Meta Ad Library; paginated, `cursor` in the body. |
| `facebookPostById` | `GET /desearch/facebook/post/{id}` | ✅ | IDs containing `/` work. |
| `facebookProfile` | `GET /desearch/facebook/profile/{profile_id}` | ✅ | Profile or page. |
| `facebookProfilePosts` | `GET /desearch/facebook/profile/{profile_id}/posts` | ✅ | Paginated. |
| `facebookComments` | `GET /desearch/facebook/comments/{post_id}` | ✅ | Paginated; about 10 comments per provider page. |
| `facebookHashtag` | `GET /desearch/facebook/hashtag/{tag}` | ✅ | Meta Ad Library; paginated. |
| `instagramSearch` | `POST /desearch/instagram/search` | ✅ | One page; takes no cursor. |
| `instagramMedia` | `GET /desearch/instagram/media/{id}` | ✅ | Shortcode, ID or post URL. |
| `instagramProfile` | `GET /desearch/instagram/profile/{username}` | ✅ | Single profile. |
| `instagramProfilePosts` | `GET /desearch/instagram/profile/{username}/posts` | ✅ | Paginated. |
| `instagramComments` | `GET /desearch/instagram/comments/{shortcode}` | ✅ | Paginated; numeric media IDs return 404. |
| `instagramHashtag` | `GET /desearch/instagram/hashtag/{tag}` | ✅ | Paginated. |
| `networkStats` | `GET /network/stats` | ✅ | Public; no `Authorization` header is sent. |
| `networkStatsHistory` | `GET /network/stats/history` | ✅ | Public; last 20 minutes, one point per second. |
| `streamNetworkStats` | `GET /network/stats/stream` | ✅ | Public; async iterator over Server-Sent Events. |
| `youtubeSearch` | `POST /desearch/youtube/search` | ✅ | Videos, Shorts, live, channels and playlists; paginated, `cursor` in the body. |
| `youtubeVideo` | `GET /desearch/youtube/video/{id}` | ✅ | ID or URL. |
| `youtubeTranscript` | `GET /desearch/youtube/transcript/{video_id}` | ✅ | Optional `language`; no captions is a free 404. |
| `youtubeComments` | `GET /desearch/youtube/comments/{video_id}` | ✅ | Paginated; `order` top or newest. |
| `youtubeChannel` | `GET /desearch/youtube/channel/{handle}` | ✅ | Handle (with or without @) or channel ID. |
| `youtubeChannelVideos` | `GET /desearch/youtube/channel/{handle}/videos` | ✅ | Paginated; `sort` latest or popular. |
| `redditSearch` | `POST /desearch/reddit/search` | ✅ | Paginated, `cursor` in the body. |
| `redditSubreddit` | `GET /desearch/reddit/subreddit/{name}` | ✅ | Case-sensitive name. |
| `redditSubredditPosts` | `GET /desearch/reddit/subreddit/{name}/posts` | ✅ | Paginated; `sort`, `timeframe`. |
| `redditPostById` | `GET /desearch/reddit/post/{id}` | ✅ | ID or URL; no comments. |
| `redditComments` | `GET /desearch/reddit/comments/{post_id}` | ✅ | Comment tree; paginated. |
| `threadsSearch` | `POST /desearch/threads/search` | ✅ | One page; no cursor. |
| `threadsSearchUsers` | `POST /desearch/threads/search/users` | ✅ | Accounts by username or name. |
| `threadsProfile` | `GET /desearch/threads/profile/{username}` | ✅ | Single profile. |
| `threadsProfilePosts` | `GET /desearch/threads/profile/{username}/posts` | ✅ | Latest 20-30 posts; no cursor. |
| `threadsPostById` | `GET /desearch/threads/post/{id}` | ✅ | URL or shortcode; with replies and thread items. |
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
| `companySearch` | `POST /desearch/companies/search` | ✅ | Billed. Starts a Company Search task (HTTP 202). |
| `companyEnrich` | `POST /desearch/companies/enrich` | ✅ | Billed. Starts a Company Enrich task for up to 200 domains. |
| `listCompanyTasks` | `GET /desearch/companies/tasks` | ✅ | Free. `type` (`search`, `enrich`); `status` arrays are sent comma-separated; `metadata` pairs are sent as `metadata.<key>=<value>`; cursor pagination. |
| `getCompanyTask` | `GET /desearch/companies/tasks/{task_id}` | ✅ | Free. Status, stage (including `enriching`), progress and cost of one task. |
| `getCompanyResults` | `GET /desearch/companies/tasks/{task_id}/results` | ✅ | Free. One page of companies with `next_cursor` and `has_more`; companies already read are filled in place by later stages. |
| `pauseCompanyTask` | `POST /desearch/companies/tasks/{task_id}/pause` | ✅ | Free. Throws `CompanyTaskConflictError` on 409. |
| `resumeCompanyTask` | `POST /desearch/companies/tasks/{task_id}/resume` | ✅ | Free. Throws `CompanyTaskConflictError` on 409. |
| `cancelCompanyTask` | `POST /desearch/companies/tasks/{task_id}/cancel` | ✅ | Free. Throws `CompanyTaskConflictError` on 409. |
| `exportCompanyResults` | `GET /desearch/companies/tasks/{task_id}/export` | ✅ | Free. CSV (default) or JSON Lines text. |
| `waitForCompanyTask` | polls `GET /desearch/companies/tasks/{task_id}` | ✅ | SDK helper. Resolves when the task ends; throws on timeout. |
| `iterCompanyResults` | pages `GET /desearch/companies/tasks/{task_id}/results` | ✅ | SDK helper. Async iterator over the companies, page by page. |
| `createMonitor` | `POST /desearch/monitors` | ✅ | Free; each run is billed. Returns `webhook_secret` once when a webhook is set (HTTP 201). |
| `estimateMonitor` | `POST /desearch/monitors/estimate` | ✅ | Free. Most one run and 30 days of runs can cost. |
| `listMonitors` | `GET /desearch/monitors` | ✅ | Free. `status` arrays are sent comma-separated; cursor pagination. |
| `getMonitor` | `GET /desearch/monitors/{monitor_id}` | ✅ | Free. |
| `updateMonitor` | `PATCH /desearch/monitors/{monitor_id}` | ✅ | Free. Sends only the given fields; `webhook: null` removes the webhook. |
| `deleteMonitor` | `DELETE /desearch/monitors/{monitor_id}` | ✅ | Free. |
| `triggerMonitor` | `POST /desearch/monitors/{monitor_id}/trigger` | ✅ | Queues a billed run (HTTP 202); 409 while one is queued or running. |
| `listMonitorRuns` | `GET /desearch/monitors/{monitor_id}/runs` | ✅ | Free. Cursor pagination. |
| `getMonitorRun` | `GET /desearch/monitors/{monitor_id}/runs/{run_id}` | ✅ | Free. The run with the items it kept. |
| `listMonitorItems` | `GET /desearch/monitors/{monitor_id}/items` | ✅ | Free. `source` filter; cursor pagination. |
| `testMonitorWebhook` | `POST /desearch/monitors/{monitor_id}/webhook/test` | ✅ | Free. Sends a signed `monitor.test` event. |
| `rotateMonitorWebhookSecret` | `POST /desearch/monitors/{monitor_id}/webhook/rotate-secret` | ✅ | Free. Returns the new secret once. |
| `iterMonitorItems` | pages `GET /desearch/monitors/{monitor_id}/items` | ✅ | SDK helper. Async iterator over the items, page by page. |
| `verifyWebhookSignature` | none (local) | ✅ | Checks a delivery's `Desearch-Signature` header against the raw body. |

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

### Social, Search API and network stats request types

- ✅ `SocialPageParams` (`count`, `cursor`)
- ✅ `TikTokSearchRequest`, `TikTokPostByIdParams`, `TikTokProfileParams`, `TikTokProfilePostsParams`, `TikTokCommentsParams`, `TikTokHashtagParams`, `TikTokTrendingParams`
- ✅ `FacebookSearchRequest`, `FacebookPostByIdParams`, `FacebookProfileParams`, `FacebookProfilePostsParams`, `FacebookCommentsParams`, `FacebookHashtagParams`
- ✅ `InstagramSearchRequest` (no `cursor`), `InstagramMediaParams`, `InstagramProfileParams`, `InstagramProfilePostsParams`, `InstagramCommentsParams`, `InstagramHashtagParams`
- ✅ `SocialCursorParams` (`cursor` only, for the YouTube and Reddit list routes)
- ✅ `YouTubeSearchRequest`, `YouTubeVideoParams`, `YouTubeTranscriptParams`, `YouTubeCommentsParams`, `YouTubeChannelParams`, `YouTubeChannelVideosParams` and the unions `YouTubeSearchType`, `YouTubeUploadDate`, `YouTubeSearchSort`, `YouTubeDuration`, `YouTubeCommentOrder`, `YouTubeChannelVideosSort`
- ✅ `RedditSearchRequest`, `RedditSubredditParams`, `RedditSubredditPostsParams`, `RedditPostByIdParams`, `RedditCommentsParams` and the unions `RedditSearchSort`, `RedditSubredditSort`, `RedditTimeframe`
- ✅ `ThreadsSearchRequest` (no `cursor`), `ThreadsSearchUsersRequest`, `ThreadsProfileParams`, `ThreadsProfilePostsParams` (no `cursor`), `ThreadsPostByIdParams`
- ✅ `SearchApiRequest`, `SearchApiMode`
- ✅ `StreamNetworkStatsOptions` (`lastEventId`, `signal`)

### People Search request types

- ✅ `XProfileSearchRequest`, `YouTubeCreatorSearchRequest`, `LinkedInProfileSearchRequest`, `TikTokCreatorSearchRequest`
- ✅ `XProfileSearchFilters`, `YouTubeCreatorSearchFilters`, `LinkedInProfileSearchFilters`, `TikTokCreatorSearchFilters`
- ✅ `PeopleSearchRequestBase` (`query`, `count`, `min_score`, `exclude`, `metadata`)
- ✅ `PeopleSearchOptions` (`idempotencyKey`)
- ✅ `PeopleResultFilters` (`has`, `min_audience`, `max_audience`, `min_score`, `location`, `verified`)
- ✅ `PeopleTaskParams`, `ListPeopleTasksParams`, `GetPeopleResultsParams`, `ExportPeopleResultsParams`, `ListPeopleProfilesParams`, `ExportPeopleProfilesParams`, `WaitForPeopleTaskOptions`

### Company Search request types

- ✅ `CompanySearchRequest` (`query`, `count`, `min_score`, `exclude`, `roles`, `infer_emails`, `verify_emails`, `filters`, `metadata`), `CompanySearchFilters` (`countries`, `require`)
- ✅ `CompanyEnrichRequest` (`domains`, `roles`, `infer_emails`, `verify_emails`, `metadata`)
- ✅ `CompanyRole`, `CompanyRequirement`, `CompanyTaskType`
- ✅ `CompanyTaskParams`, `ListCompanyTasksParams`, `GetCompanyResultsParams`, `ExportCompanyResultsParams`, `WaitForCompanyTaskOptions`
- ✅ `PeopleSearchOptions` (`idempotencyKey`) is shared by the company create calls

### Monitors request types

- ✅ `MonitorCreateRequest` (`query`, `name`, `criteria`, `sources`, `interval`, `options`, `min_score`, `summary`, `webhook`, `metadata`, `run_now`), `MonitorUpdateRequest` (the same fields plus `status`), `MonitorEstimateRequest`
- ✅ `MonitorOptions`, `MonitorWebOptions`, `MonitorXOptions` (with `accounts`), `MonitorRedditOptions` (`subreddits`), `MonitorYouTubeOptions` (`channels`), `MonitorTikTokOptions` (`count`, `accounts`), `MonitorWebhookConfig`
- ✅ `MonitorSource`, `MonitorInterval`, `MonitorEvent`, `MonitorStatus`
- ✅ `MonitorParams`, `MonitorRunParams`, `ListMonitorsParams`, `ListMonitorRunsParams`, `ListMonitorItemsParams`, `VerifyWebhookSignatureOptions`

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
- ✅ `TikTokPost`, `TikTokProfile`, `TikTokComment`, `TikTokAuthor`, `TikTokStats`, `TikTokMusic`
- ✅ `FacebookPost`, `FacebookProfile`, `FacebookComment`, `FacebookMedia`, `FacebookPostStats`
- ✅ `InstagramMedia`, `InstagramProfile`, `InstagramComment`, `InstagramStats`, `InstagramSearchResult`, `InstagramSearchResultType`
- ✅ `YouTubeItem`, `YouTubeItemType`, `YouTubeChannelRef`, `YouTubeVideo`, `YouTubeChapter`, `YouTubeCaptionLanguage`, `YouTubeTranscript`, `YouTubeTranscriptSegment`, `YouTubeComment`, `YouTubeCommentAuthor`, `YouTubeChannel`
- ✅ `RedditPost`, `RedditSubreddit`, `RedditComment` (recursive `replies`)
- ✅ `ThreadsPost`, `ThreadsPostDetail`, `ThreadsProfile`, `ThreadsUser`
- ✅ `SearchApiResponse`, `SearchApiResult`
- ✅ `NetworkStatsResponse`, `NetworkStatsRates`, `NetworkStatsHistoryResponse`, `NetworkStatsHistoryPoint`, `NetworkStatsStreamEvent`
- ✅ `DesearchCostMetadata.nextCursor` (from `x-desearch-next-cursor`)
- ✅ `CompanyTask`, `CompanySearchTask` (task plus reservation cost fields), `CompanyTaskList`, `CompanyTaskConflictResponse`, `CompanyTaskWarning`, `CompanyCompletionReason`, `CompanyTaskStage`, `CompanySearchType`, `CompanyPlatform`; statuses, links and `created_by` reuse the People Search types
- ✅ `Monitor`, `MonitorCreated` (with `webhook_secret`), `MonitorList`, `MonitorWebhook`, `MonitorLastRun`, `MonitorStats`, `MonitorRun`, `MonitorRunWithItems`, `MonitorRunList`, `MonitorRunStats`, `MonitorRunSourceStats`, `MonitorItem`, `MonitorItemAuthor`, `MonitorItemSignals`, `MonitorItemData` (`account` for watched accounts), `MonitorItemList`, `MonitorEstimate`, `MonitorDeleted`, `MonitorWebhookTestResult`, `MonitorWebhookSecret`, `MonitorWebhookEvent`, plus `MonitorPausedReason`, `MonitorRunStatus`, `MonitorRunFailReason`, `MonitorRunTrigger` and `MonitorWebhookEventType`
- ✅ `Company`, `CompanyEmail`, `CompanyEmailVerification`, `CompanyEmailChecks`, `CompanyPhone`, `CompanySocial`, `CompanyPage`, `CompanyLocation`, `CompanyPerson`, `CompanyPersonEvidence`, `CompanyPrimaryContact`, `CompanyContactCoverage`, `CompanyEnrichment`, `CompanyEnrichmentStages`, `CompanyEnrichmentError`, `CompanyScore` (its `criteria_checks` are `PeopleCriterionCheck`), `CompanyFoundBy`, `CompanyResultsPage`, plus the value unions (`CompanyEmailType`, `CompanyEmailVerificationStatus`, `CompanyContactSource`, `CompanyStageState`, ...). Result objects accept fields a newer API adds.

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
- ✅ `PeopleTaskConflictError` (runtime class thrown by People Search pause, resume and cancel on HTTP 409)
- ✅ `CompanyTaskConflictError` (runtime class thrown by company pause, resume and cancel on HTTP 409)

## Practical feature summary

### What is solid today

- typed wrappers for the current public read, search, and extraction endpoints
- TikTok, Facebook and Instagram routes with cursor pagination through `metadata.nextCursor`
- YouTube, Reddit and Threads routes, with the same cursor pagination on the YouTube and Reddit lists
- the Search API and the public network stats, including a live Server-Sent Events stream
- People Search across X, YouTube, LinkedIn and TikTok, with task control, polling and pagination helpers
- Company Search and Company Enrich, with task control, a polling helper and a company iterator
- Monitors: create, change, trigger and delete scheduled searches or watched accounts (including TikTok), read their runs and items, and verify signed webhook deliveries
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
- write or mutation endpoints beyond People Search, company tasks and monitors
- a browser-first transport abstraction
