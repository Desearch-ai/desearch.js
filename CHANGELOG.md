# Changelog

## 1.13.0

Two optional Company Search request fields. No method changed; requests without them are sent as before.

- Added `max_cost_usd` to `CompanySearchRequest`: a search budget in USD (more than 0, at most 100), at least what `count` reserves at the route price (below it the API answers 422). Without it, a search stops once it costs more than the companies it found pay for (`completion_reason` `cost_limit`, `coverage_limited: true`). With it, the whole budget is reserved and the search goes on until it delivers `count` or spends the budget. Its search effort is billed where the companies delivered do not cover it, up to the budget, even when it finds few companies or none. The unused part is returned.
- Added `continue_from` to `CompanySearchRequest`: the `task_id` of an ended Company Search of yours. The new search leaves out every company that one excluded, delivered or held for review, so it only finds new ones. Send the same `query` and filters with the `count` still wanted. The API answers 409 while that task is running or paused and 404 when it is not your Company Search; both are plain `HTTP <status>` errors.
- `CompanyTaskWarning.code` lists `scope_not_applied`: the query names the only companies wanted without their websites, so the search was not restricted. A query that names them with their websites ("Restrict this search to Acme (acme.com.au) and Beta (beta.co.uk). Return only those.") checks only those domains and ends `all_domains_processed`.
- Documented `progress.effort_units` (budgeted searches only) and `progress.review` on `CompanyTask`.

## 1.12.0

Covers the rest of the public API. New methods only; no existing method changed.

- Added YouTube: `youtubeSearch`, `youtubeVideo`, `youtubeTranscript`, `youtubeComments`, `youtubeChannel` and `youtubeChannelVideos`.
- Added Reddit: `redditSearch`, `redditSubreddit`, `redditSubredditPosts`, `redditPostById` and `redditComments` (a comment tree with the replies Reddit loaded).
- Added Threads: `threadsSearch`, `threadsSearchUsers`, `threadsProfile`, `threadsProfilePosts` and `threadsPostById` (with replies and thread continuation posts).
- The paginated YouTube and Reddit methods take `cursor` and return the next one as `metadata.nextCursor`, like the TikTok, Facebook and Instagram methods. They take no `count`. Threads methods do not paginate.
- Added the request and response types for these routes (`YouTubeItem`, `YouTubeVideo`, `YouTubeTranscript`, `YouTubeComment`, `YouTubeChannel`, `RedditPost`, `RedditSubreddit`, `RedditComment`, `ThreadsPost`, `ThreadsPostDetail`, `ThreadsProfile`, `ThreadsUser`, `SocialCursorParams` and the filter unions).
- Added `scripts/e2e-youtube-reddit-threads.mjs`, a live smoke test of these methods that takes `--base-url` and `--key-env`.
- Added TikTok: `tiktokSearch`, `tiktokPostById`, `tiktokProfile`, `tiktokProfilePosts`, `tiktokComments`, `tiktokHashtag` and `tiktokTrending`.
- Added Facebook: `facebookSearch`, `facebookPostById`, `facebookProfile`, `facebookProfilePosts`, `facebookComments` and `facebookHashtag`. Search and hashtag read the Meta Ad Library.
- Added Instagram: `instagramSearch`, `instagramMedia`, `instagramProfile`, `instagramProfilePosts`, `instagramComments` and `instagramHashtag`.
- Added `searchApi` (`POST /search`): ranked pages, each with the passage that best matches the query.
- Added `networkStats`, `networkStatsHistory` and `streamNetworkStats`, an async iterator over the live Server-Sent Events stream (`lastEventId` to replay missed snapshots, `signal` to stop). These routes need no API key, and the SDK sends none.
- Added `nextCursor` to the response metadata, read from the `x-desearch-next-cursor` header. Social list methods take `cursor`: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back unchanged for the next page. It is absent on the last page.
- Path parameters are URL-encoded. IDs and post URLs that contain `/` (for example `Meta/posts/123`) work on the post, media and comments routes.
- Added the request and response types for these routes (`TikTokPost`, `FacebookPost`, `InstagramMedia`, `SearchApiResponse`, `NetworkStatsResponse` and others).
- Added `scripts/e2e-full-coverage.mjs`, a live smoke test of the new methods.

## 1.11.0

- Added Company Search and Company Enrich. Two billed methods start a background task: `companySearch` (companies found on the web from a description, with an AI fit score) and `companyEnrich` (the same data for up to 200 domains you send; `score` is null). Pass `idempotencyKey` to send an `Idempotency-Key` header.
- Added the free company task methods: `listCompanyTasks` (`type` `search` or `enrich`, `status`, `limit`, `cursor`, `metadata`), `getCompanyTask`, `getCompanyResults`, `pauseCompanyTask`, `resumeCompanyTask`, `cancelCompanyTask` and `exportCompanyResults` (CSV or JSON Lines).
- Added `waitForCompanyTask`, which polls a task until it ends (interval, timeout, `onProgress`), and `iterCompanyResults`, an async iterator over the companies themselves, page by page.
- Added `CompanyTaskConflictError`. Company pause, resume and cancel throw it when the API refuses the action (HTTP 409), and it carries the current task.
- Added the request, task and result types: `CompanySearchRequest`, `CompanySearchFilters`, `CompanyEnrichRequest`, `CompanyTask`, `CompanySearchTask`, `CompanyTaskList`, `CompanyResultsPage`, `Company` and its nested types (`CompanyEmail` with `CompanyEmailVerification` and `CompanyEmailChecks`, `CompanyPhone`, `CompanySocial`, `CompanyPage`, `CompanyLocation`, `CompanyPerson`, `CompanyPersonEvidence`, `CompanyPrimaryContact`, `CompanyContactCoverage`, `CompanyEnrichment`, `CompanyEnrichmentStages`, `CompanyEnrichmentError`, `CompanyScore`, `CompanyFoundBy`), `CompanyTaskWarning` and the literal unions the API documents. Result fields the later stages fill in are optional, and result objects keep fields a newer API adds.
- `unverifiedCriteria(score)` also accepts a `CompanyScore`.

## 1.10.0

- `ExtractParams.format` accepts `'markdown'`: `extract({ url, format: 'markdown' })` returns the page as markdown (headings, lists, tables and code).
- `full_page` is documented as applying to `format: 'text'` only.

## 1.9.0

- Added `full_page` to `ExtractParams`. With `format: 'text'`, `extract({ url, full_page: true })` returns all visible text of the page instead of its main content.

## 1.8.1

- Added `is_disqualifier` to `PeopleCriterionCheck`: true when the criterion is a disqualifier, so `met` means it applies. The API returns it since 2026-10-20; older checks do not have it.
- `unverifiedCriteria(score)` reads `is_disqualifier` when a check has it, and falls back to the API's keyword rule when it does not, like the CSV `unverified_criteria` column.

## 1.8.0

Types for the People Search response fields the API returns since 2026-10-20. New fields are optional and additive; no existing method changed.

- `PeopleTask`: `completion_reason` (`PeopleCompletionReason`: `count_reached`, `rounds_exhausted`, `no_candidates`, `zero_qualified`, `candidate_budget`, `cost_limit`, `time_limit`, `cancelled`, `failed`; `null` while the task runs), `coverage_limited`, and `warnings` (`PeopleTaskWarning[]`, e.g. `partial_enrichment` with `attempted`, `enriched`, `failed` and `by_reason`).
- `PeopleScore`: `criteria_checks` (`PeopleCriterionCheck[]`: `criterion`, `verdict` `met` / `not_met` / `unknown`, `quote`, `source_url`, `reason`) and `fully_verified`.
- Added `unverifiedCriteria(score)`, which returns the criteria checks a result does not confirm (not `met`, or a `Disqualifier:` that is `met`), the same rule as the CSV export's new `unverified_criteria` column.
- `Person.attributes` is now `PersonAttributes`: `enrichment` (`ok` or `failed`) and `enrichment_error` (`PeopleEnrichmentError`), plus any platform field as before.

## 1.7.0

- Added `metadata` to the People Search requests (`xProfileSearch`, `youtubeCreatorSearch`, `linkedinProfileSearch`, `tiktokCreatorSearch`): your own string labels for a search, stored on the task and never used by the search.
- Added `metadata` to `PeopleTask` (`{}` when the search had none).
- Added a `metadata` filter to `listPeopleTasks`. The SDK sends each pair as a `metadata.<key>=<value>` query parameter (up to 3, exact match).

## 1.6.0

- Added People Search. Four billed search methods start a background task: `xProfileSearch`, `youtubeCreatorSearch`, `linkedinProfileSearch` and `tiktokCreatorSearch`. Pass `idempotencyKey` to send an `Idempotency-Key` header.
- Added the free People Search task and profile methods: `listPeopleTasks`, `getPeopleTask`, `getPeopleResults`, `pausePeopleTask`, `resumePeopleTask`, `cancelPeopleTask`, `exportPeopleResults`, `listPeopleProfiles` and `exportPeopleProfiles`.
- Added `waitForPeopleTask`, which polls a task until it ends and takes an interval, a timeout and an `onProgress` callback, and `iterPeopleResultPages`, an async iterator over results pages.
- Added typed result filters (`has`, `min_audience`, `max_audience`, `min_score`, `location`, `verified`). The SDK sends them as query parameters and joins `has` with commas.
- Added `PeopleTaskConflictError`. Pause, resume and cancel throw it when the API refuses the action (HTTP 409), and it carries the current task.
- Added the People Search request, task, person and page types.

## 1.5.1

- Bounded `undici` to `^6.28.1 || ^7.29.1` (fixes import crash on Node 20 from undici 8).
- Added a named `Desearch` export alongside the existing default export.
- Node 18 is no longer supported (`engines` >=20.18.1).
