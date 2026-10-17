# Changelog

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
