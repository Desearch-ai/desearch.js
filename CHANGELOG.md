# Changelog

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
