# desearch.js

Official JavaScript and TypeScript SDK for the Desearch public API.

This repo publishes the npm package `desearch-js`. In the current source tree, the package version is `1.11.0`.

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
- page extraction
- People Search: X, YouTube, LinkedIn and TikTok searches that run as background tasks
- Company Search and Company Enrich: companies with their public emails, phones, social profiles and leaders, also as background tasks

What it does not try to be:
- a browser-first SDK
- a configurable transport layer
- a general write or mutation client (People Search and company tasks are the only things it creates or changes)
- a framework with retries or runtime validation (People Search and Company Search add small polling helpers and result iterators)

## Quick Start

### Install

```bash
npm install desearch-js
```

Requires Node.js ≥ 20.18.1

### ESM usage

`Desearch` is both the default export and a named export.

```ts
import Desearch from 'desearch-js';
// or: import { Desearch } from 'desearch-js';

const client = new Desearch(process.env.DESEARCH_API_KEY!);

const result = await client.aiSearch({
  prompt: 'latest Bittensor developments',
  tools: ['web'],
  start_date: '2025-05-01T00:00:00Z',
  end_date: '2025-05-08T00:00:00Z',
  include_domains: ['bbc.com', 'reuters.com'],
  result_type: 'LINKS_WITH_FINAL_SUMMARY',
  count: 10,
});

console.log(result);
```

### CommonJS usage

```js
const { Desearch } = require('desearch-js');
// or: const Desearch = require('desearch-js').default;

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
- `extract(params)` → `GET /web/extract`
- `webCrawl(params)` → `GET /web/crawl` (deprecated compatibility method)

### People Search methods

- `xProfileSearch(payload, options?)` → `POST /desearch/people/search/x` (billed)
- `youtubeCreatorSearch(payload, options?)` → `POST /desearch/people/search/youtube` (billed)
- `linkedinProfileSearch(payload, options?)` → `POST /desearch/people/search/linkedin` (billed)
- `tiktokCreatorSearch(payload, options?)` → `POST /desearch/people/search/tiktok` (billed)
- `listPeopleTasks(params?)` → `GET /desearch/people/tasks`
- `getPeopleTask(params)` → `GET /desearch/people/tasks/{task_id}`
- `getPeopleResults(params)` → `GET /desearch/people/tasks/{task_id}/results`
- `pausePeopleTask(params)` → `POST /desearch/people/tasks/{task_id}/pause`
- `resumePeopleTask(params)` → `POST /desearch/people/tasks/{task_id}/resume`
- `cancelPeopleTask(params)` → `POST /desearch/people/tasks/{task_id}/cancel`
- `exportPeopleResults(params)` → `GET /desearch/people/tasks/{task_id}/export`
- `listPeopleProfiles(params)` → `GET /desearch/people/profiles`
- `exportPeopleProfiles(params)` → `GET /desearch/people/profiles/export`
- `waitForPeopleTask(params, options?)` polls `getPeopleTask` until the task ends
- `iterPeopleResultPages(params)` is an async iterator over `getPeopleResults` pages

See [People Search](#people-search) for the full flow.

### Company Search methods

- `companySearch(payload, options?)` → `POST /desearch/companies/search` (billed)
- `companyEnrich(payload, options?)` → `POST /desearch/companies/enrich` (billed)
- `listCompanyTasks(params?)` → `GET /desearch/companies/tasks`
- `getCompanyTask(params)` → `GET /desearch/companies/tasks/{task_id}`
- `getCompanyResults(params)` → `GET /desearch/companies/tasks/{task_id}/results`
- `pauseCompanyTask(params)` → `POST /desearch/companies/tasks/{task_id}/pause`
- `resumeCompanyTask(params)` → `POST /desearch/companies/tasks/{task_id}/resume`
- `cancelCompanyTask(params)` → `POST /desearch/companies/tasks/{task_id}/cancel`
- `exportCompanyResults(params)` → `GET /desearch/companies/tasks/{task_id}/export`
- `waitForCompanyTask(params, options?)` polls `getCompanyTask` until the task ends
- `iterCompanyResults(params)` is an async iterator over the companies of `getCompanyResults` pages

See [Company Search and Company Enrich](#company-search-and-company-enrich) for the full flow.

## Usage examples

### AI search

```ts
const result = await client.aiSearch({
  prompt: 'recent AI chip announcements',
  tools: ['web'],
  exclude_domains: ['pinterest.com'],
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

### Extract

```ts
const page = await client.extract({
  url: 'https://desearch.ai',
  format: 'text',
});
```

`format` is `'text'` (default), `'markdown'` or `'html'`. `'markdown'` keeps headings, lists, tables and code: the main content of articles and docs, and the whole page without its navigation otherwise.

```ts
const markdown = await client.extract({
  url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
  format: 'markdown',
});
```

`format: 'text'` returns the page's main content, which can leave out tables, notices and other sections. Pass `full_page: true` (text only) for all visible text of the page, one block per line.

```ts
const everything = await client.extract({
  url: 'https://peles.ro/en/program-si-taxe/',
  format: 'text',
  full_page: true,
});
```

Pages that cannot be served throw an `HTTP <status>: <body>` error whose JSON body has an `error_code`, and they are not charged: `page_not_found` (404), `js_required` (422, retry with `js: true`), `blocked` (503, the site refused the request or answered with a bot check), `upstream_timeout` and `upstream_failed` (503).

Existing `webCrawl()` integrations continue to use the deprecated `GET /web/crawl` compatibility route. Use `extract()` for new integrations.

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
console.log(response.metadata.costUsd);
console.log(response.metadata.usageCount);
console.log(response.metadata.service);
console.log(response.metadata.currency);
```

The metadata wrapper works for JSON object, JSON array, and text endpoints such as `extract()` and `webCrawl()`. Missing or malformed metadata headers are ignored, so successful API calls still resolve normally.

## People Search

People Search finds people by what they post and how they describe themselves: X profiles, YouTube creators, LinkedIn members and TikTok creators. Each search runs as a background task. The search call returns a queued task at once. You poll the task until it ends, read the results page by page and export them as CSV or JSON Lines.

### End-to-end example

```ts
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import Desearch from 'desearch-js';

const client = new Desearch(process.env.DESEARCH_API_KEY!);

// 1. Start the search. This is the only billed call.
const task = await client.tiktokCreatorSearch(
  {
    query: 'Skincare creators who review sunscreen',
    count: 25,
    filters: { min_followers: 10000, require_contact: true },
  },
  { idempotencyKey: randomUUID() },
);
console.log(task.task_id, task.status, task.reserved_cost_usd);

// 2. Wait until it ends. Polling is free.
const done = await client.waitForPeopleTask(task, {
  intervalMs: 5000,
  timeoutMs: 10 * 60 * 1000,
  onProgress: (t) => console.log(t.status, `${t.result_count}/${t.count}`),
});
console.log(done.status, done.final_cost_usd);

// 3. Read every result page.
for await (const page of client.iterPeopleResultPages({
  task_id: task.task_id,
  limit: 100,
})) {
  for (const person of page.results) {
    console.log(person.handle, person.score?.value, person.metrics.followers);
  }
}

// 4. Export only the creators with a public email, as CSV.
const csv = await client.exportPeopleResults({
  task_id: task.task_id,
  format: 'csv',
  has: ['email'],
});
writeFileSync(`people-${task.task_id}.csv`, csv);
```

`xProfileSearch`, `youtubeCreatorSearch` and `linkedinProfileSearch` work the same way. Each request takes `query`, `count` (5-200, default 25), `min_score`, `exclude`, `metadata`, and that platform's `filters`. The types `XProfileSearchFilters`, `YouTubeCreatorSearchFilters`, `LinkedInProfileSearchFilters` and `TikTokCreatorSearchFilters` list the filters for each platform.

### Pricing

People Search is billed per profile delivered. Each search call reserves `count` times the route's unit price. When the task ends, it settles to the qualified profiles it delivered, and the rest of the reservation is returned:

- A minimum per search applies when it finds anyone.
- A search that finds nobody costs $0.
- `reserved_cost_usd` and `final_cost_usd` on the task show the reserved and final amounts.
- All task, results, export and profiles calls are free.

Current prices are at <https://console.desearch.ai/pricing>.

### Idempotency

Pass `{ idempotencyKey }` as the second argument of a search method. The SDK sends it as the `Idempotency-Key` header. If you retry a create call with the same key, the API returns the original task and does not charge again. Search methods also accept `{ includeMetadata: true }`, which returns the reservation's cost headers as `metadata`.

### Tagging searches with metadata

Pass `metadata` to label a search with your own keys, for example the campaign or workspace it belongs to. The task returns it as `metadata` (`{}` when none was sent), and `listPeopleTasks` can filter by it. The search itself never uses it.

```ts
await client.linkedinProfileSearch({
  query: 'Heads of sales at fintech startups who post about outbound',
  count: 25,
  metadata: { campaign: 'q4-outbound', workspace_id: 'ws_42' },
});

// Later: every search of that campaign, newest first.
const { tasks } = await client.listPeopleTasks({
  metadata: { campaign: 'q4-outbound' },
});
console.log(tasks.map((t) => [t.task_id, t.status, t.metadata.workspace_id]));
```

- A search takes at most 10 keys. Keys are 1-40 characters of `a-z`, `0-9`, `_`, `.` or `-`; values are strings of at most 200 characters. The API answers 422 otherwise.
- `listPeopleTasks` takes up to 3 pairs. The SDK sends each as a `metadata.<key>=<value>` query parameter, and a task must match all of them exactly. Keep the same filter when you page with `cursor`.

### Reading a finished search

A finished task says why it ended and how complete it is. Each result says what was confirmed (1.8.0 and later):

```ts
import { unverifiedCriteria } from 'desearch-js';

const done = await client.waitForPeopleTask(task);

// count_reached, rounds_exhausted, no_candidates, zero_qualified,
// candidate_budget, cost_limit, time_limit, cancelled or failed.
console.log(done.completion_reason);
if (done.coverage_limited) {
  // A budget stopped it before `count`: there may be more matching people.
}
for (const warning of done.warnings ?? []) {
  // partial_enrichment: some profiles could not be read after search.
  console.log(warning.code, warning.platform, `${warning.failed}/${warning.attempted}`, warning.by_reason);
}

for await (const page of client.iterPeopleResultPages({ task_id: task.task_id })) {
  for (const person of page.results) {
    // Criteria not confirmed, and disqualifiers that apply (verdict `met`).
    const unverified = unverifiedCriteria(person.score).map(
      (check) => `${check.criterion} (${check.verdict})`,
    );
    console.log(person.handle, person.score?.fully_verified, unverified);
    if (person.attributes?.enrichment === 'failed') {
      // Scored on the search hit only; enrichment_error says why (not_found, rate_limited, ...).
      console.log('profile not read:', person.attributes.enrichment_error);
    }
  }
}
```

- `completion_reason` is `null` while the task is queued, running or paused. A search that a budget stopped is still `completed`, so check `coverage_limited`.
- `score.criteria_checks` has one check per criterion, with `verdict` `met`, `not_met` or `unknown`, and the `quote` and `source_url` behind a `met`. It is information only: a qualified person can still have `unknown` criteria. For a disqualifier (`is_disqualifier`, 1.8.1 and later), `met` means it applies.
- `score.fully_verified` is true when every criterion is `met` and no disqualifier is. Results scored before 2026-10-20 have no `criteria_checks` or `fully_verified`.
- `unverifiedCriteria(score)` returns the checks that are not confirmed: every criterion that is not `met`, and every disqualifier that is `met`. It reads `is_disqualifier`, and the API's keyword rule for older checks without it. Their `criterion` texts are what the CSV export lists in its new `unverified_criteria` column, next to `fully_verified`.

### Waiting and paging

- `waitForPeopleTask(params, options?)` polls until the status is `completed`, `partial`, `failed`, `cancelled` or `expired`. It then returns the task. If the task has not ended within `timeoutMs`, it throws an `Error`. A `paused` task has not ended. `params` only needs `task_id`, so you can pass the task object itself.
- `iterPeopleResultPages(params)` follows `next_cursor` until `has_more` is false. Results arrive while a search is still running. To read only new results later, keep the last page's `next_cursor` and pass it back as `cursor`.

### Result filters

`exportPeopleResults`, `listPeopleProfiles` and `exportPeopleProfiles` accept the same filters. The SDK sends them as query parameters and joins `has` with commas:

| Filter | Meaning |
| --- | --- |
| `has` | Channels every person must have: `email`, `website`, `x`, `linkedin`, `instagram`, `youtube`, `tiktok` |
| `min_audience` / `max_audience` | Followers (subscribers on YouTube) |
| `min_score` | Minimum fit score, 0-100 |
| `location` | Case-insensitive text in the location |
| `verified` | Only verified accounts (X, TikTok) |

### Pause, resume and cancel

```ts
import { PeopleTaskConflictError } from 'desearch-js';

await client.pausePeopleTask({ task_id: task.task_id });
await client.resumePeopleTask({ task_id: task.task_id });

try {
  await client.cancelPeopleTask({ task_id: task.task_id });
} catch (error) {
  if (error instanceof PeopleTaskConflictError) {
    // HTTP 409: the task's status does not allow this action.
    console.log(error.detail, error.task.status);
  } else {
    throw error;
  }
}
```

Cancelling bills only the profiles delivered so far. A search cancelled before it starts costs nothing.

### Tasks and the profiles library

```ts
const { tasks, next_cursor } = await client.listPeopleTasks({
  platform: 'tiktok',
  status: ['running', 'paused'],
  limit: 20,
});

const library = await client.listPeopleProfiles({
  platform: 'tiktok',
  q: 'sunscreen',
  sort: 'audience',
  has: ['email'],
  min_audience: 10000,
});
console.log(library.total, library.profiles[0]?.found_by.query);

const allCreators = await client.exportPeopleProfiles({
  platform: 'tiktok',
  format: 'jsonl',
  has: ['email'],
});
```

The profiles library lists everyone your searches on one platform found, one entry per person, together with the search that found them (`found_by`). Results and profiles stay available for 30 days after a search ends.

## Company Search and Company Enrich

Company Search finds companies on the web from a description and scores how well each one fits. Company Enrich starts from domains you already have. Both collect each company's public contact data: emails, phones, social profiles, and its leaders (CEO, founders, CTO, CFO by default) with their LinkedIn profiles and emails. Every contact keeps the page it came from (`source_url`).

Both run as background tasks on the People Search engine, so the flow is the same: the create call returns a queued task at once, you poll it, read the companies and export them as CSV or JSON Lines. They have their own routes under `/desearch/companies`. A People Search task ID is a 404 there, and the other way round.

| | Company Search | Company Enrich |
| --- | --- | --- |
| Method | `companySearch` | `companyEnrich` |
| Input | a description (`query`) | 1-200 domains or URLs (`domains`) |
| `search_type` / `platform` on the task | `company_search` / `company` | `company_enrich` / `company_enrich` |
| Fit score | yes (`score`) | no (`score` is null) |

### End-to-end example

```ts
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import Desearch from 'desearch-js';

const client = new Desearch(process.env.DESEARCH_API_KEY!);

// 1. Start the search. This is the only billed call.
const task = await client.companySearch(
  {
    query: 'Series A fintech startups in Berlin building payment infrastructure',
    count: 25,
    min_score: 60,
    exclude: ['stripe.com'],
    roles: ['ceo', 'founder', 'cto', 'cfo'],
    filters: { countries: ['DE'], require: ['email'] },
    metadata: { campaign: 'q4' },
  },
  { idempotencyKey: randomUUID() },
);
console.log(task.task_id, task.status, task.reserved_cost_usd);

// 2. Wait until it ends. Polling is free. `stage` is `enriching` once every
//    company is published and only the later stages of some are left.
const done = await client.waitForCompanyTask(task, {
  intervalMs: 5000,
  timeoutMs: 15 * 60 * 1000,
  onProgress: (t) => console.log(t.status, t.stage, `${t.result_count}/${t.count}`),
});
console.log(done.status, done.completion_reason, done.final_cost_usd);

// 3. Read every company.
for await (const company of client.iterCompanyResults({ task_id: task.task_id })) {
  console.log(
    company.domain,
    company.score?.value,
    company.primary_email?.value,
    company.people.map((person) => `${person.name} (${person.roles.join('/')})`),
  );
}

// 4. Export as CSV: one row per company, with its CEO, founder, CTO and CFO.
const csv = await client.exportCompanyResults({ task_id: task.task_id, format: 'csv' });
writeFileSync(`companies-${task.task_id}.csv`, csv);
```

Company Search takes `query` (3-1000 characters), `count` (5-200, default 25), `min_score` (0-100), `exclude` (domains or URLs, up to 1000), `roles`, `infer_emails`, `verify_emails`, `filters` and `metadata`:

- `roles`: any of `ceo`, `founder`, `cto`, `cfo`, `coo`, `cmo`, `president`, `owner`, `managing_director`. The default is `['ceo', 'founder', 'cto', 'cfo']`. A managing director (Geschäftsführer) counts as `ceo` when `ceo` is asked for.
- `infer_emails` (default true) guesses leaders' emails from the company's address pattern, such as `first.last`. `verify_emails` (default true) checks every email.
- `filters.countries` takes ISO 3166-1 alpha-2 codes or names (up to 20). `filters.require` takes `email`, `phone`, `linkedin`, `leader` and `leader_email`: a company that does not have them is not delivered and not billed.

### Company Enrich

```ts
const task = await client.companyEnrich({
  domains: ['acme.com', 'https://www.beta.io/about'],
  roles: ['ceo', 'cto'],
});
console.log(task.query, task.count); // 'acme.com, beta.io', 2

await client.waitForCompanyTask(task);
for await (const company of client.iterCompanyResults({ task_id: task.task_id })) {
  console.log(company.domain, company.score); // score is null for Company Enrich
}
```

The API reduces each domain or URL to its host without `www.`, lowercases it and removes duplicates. `task.count` is the number left. `task.query` is a short label of the domains, such as `acme.com, beta.io and 3 more`. `task.request` keeps the normalized request of both products.

### How results fill in

Each company goes through five stages: `profile` (its homepage, and the fit score for Company Search), `contacts` (its contact, about, team and imprint pages), `people` (its leaders), `email_patterns` (inferred emails) and `email_check`. A company is published as soon as the stages its request needs have run:

| `filters.require` contains | Published after |
| --- | --- |
| nothing | `profile` |
| `email`, `phone`, `linkedin` | `contacts` |
| `leader` | `people` |
| `leader_email` | `email_check` |

While any stage is `pending`, the company has `enrichment.status` `partial`; `enrichment.stages` shows `pending`, `done`, `failed` or `skipped` for each stage (a stage cut by the time limit is `skipped`). The later stages fill the company in place while you read. Keep `next_cursor` from `getCompanyResults` to get only new companies, and call it again without `cursor` to get the latest version of the ones you have:

```ts
let lastCursor: string | undefined;

// While the task runs: new companies since the last read...
const page = await client.getCompanyResults({ task_id: task.task_id, cursor: lastCursor });
lastCursor = page.next_cursor;

// ...and every company in its latest version.
const latest = await client.getCompanyResults({ task_id: task.task_id, limit: 500 });
const pending = latest.results.filter((c) => c.enrichment?.status === 'partial');
```

`iterCompanyResults` yields each company once, as it was when its page was read. Call it after `waitForCompanyTask` to get every company complete.

### Reading a company

```ts
import { unverifiedCriteria } from 'desearch-js';

for await (const company of client.iterCompanyResults({ task_id: task.task_id })) {
  console.log(company.name, company.location?.country, company.industry);

  // The company's best address: never a support, press, legal, careers or other one,
  // and an inferred one only once it was checked valid.
  console.log(company.primary_email?.value, company.primary_email?.type);
  console.log(company.primary_contact?.name, company.primary_contact?.reason);

  for (const person of company.people) {
    for (const email of person.emails) {
      // source 'inferred' with confidence 'high' (pattern learned from the company's own addresses) or 'low'.
      console.log(person.name, email.value, email.source, email.confidence, email.verification?.status);
    }
  }

  // Search only: the fit score and what the company's own pages confirm.
  if (company.score) {
    console.log(company.score.value, company.score.fully_verified);
    console.log(unverifiedCriteria(company.score).map((check) => check.criterion));
  }
}
```

- `emails[].type` is `personal`, `leadership`, `sales`, `general`, `press`, `support`, `careers`, `legal` or `other`. `source` is `website`, `search`, `linkedin` or `inferred`.
- `verification` is null until the `email_check` stage ran (and when `verify_emails` is false). `verification.status` is `valid`, `invalid`, `risky` (catch-all domain, or no MX but an A record) or `unknown`. `verification.checks` has `syntax`, `mx`, `smtp` and `web`.
- `phones[].value` is E.164 when the number parses. `socials[].type` is `linkedin`, `x`, `facebook`, `instagram`, `github`, `youtube`, `tiktok`, `crunchbase`, `discord`, `telegram` or `medium`. `pages` lists the pages that were read.
- `people[].roles` is the subset of the request's `roles` the person holds. `verified` is true when a quote on the company's own site or the person's current LinkedIn position shows the role, and `evidence` has that quote.
- `contact_coverage` says what was found, with the names of `filters.require`.
- `score` (Company Search) has `value`, `qualified`, `relevance`, `summary`, `matched_signals`, `reasons`, `concerns`, `criteria_checks` and `fully_verified`. `unverifiedCriteria` works on it as on a People Search score.
- Result types accept fields a newer API adds, so a newer worker does not break your types.

A finished task has `completion_reason`: People Search's reasons, plus `all_domains_processed` for Company Enrich. `coverage_limited` is true when a budget stopped it before `count`, and `warnings` lists what made part of it less reliable, such as `enrichment_time_limit`.

### Pricing

Company Search and Company Enrich are billed per company delivered. The create call reserves `count` companies (Company Enrich: one per domain you send) at the route price, and the rest of the reservation is returned when the task ends:

- Company Search: $90 per 1000 companies ($0.09 each), with a minimum of 2 when it delivers any.
- Company Enrich: $50 per 1000 companies ($0.05 each), with a minimum of 1.
- A task that delivers no companies costs $0. A company left out by `min_score` or `filters.require` is not billed.
- `reserved_cost_usd` and `final_cost_usd` on the task show the reserved and final amounts. All task, results and export calls are free.

Current prices are at <https://desearch.ai/pricing>. Results stay available for 30 days after a task ends. After that, `getCompanyResults` and `exportCompanyResults` fail with HTTP 410.

### Idempotency and metadata

Both create methods take `{ idempotencyKey }` and `{ includeMetadata: true }` as the second argument, like the People Search methods. Both requests take `metadata`, with the same rules as People Search. The task returns it, and `listCompanyTasks` can filter by it:

```ts
const { tasks, next_cursor } = await client.listCompanyTasks({
  type: 'enrich', // or 'search'; leave out for both
  status: ['running', 'paused'],
  metadata: { campaign: 'q4' },
  limit: 20,
});
```

### Pause, resume and cancel

```ts
import { CompanyTaskConflictError } from 'desearch-js';

await client.pauseCompanyTask({ task_id: task.task_id });
await client.resumeCompanyTask({ task_id: task.task_id });

try {
  await client.cancelCompanyTask({ task_id: task.task_id });
} catch (error) {
  if (error instanceof CompanyTaskConflictError) {
    // HTTP 409: the task's status does not allow this action.
    console.log(error.detail, error.task.status);
  } else {
    throw error;
  }
}
```

Cancelling bills only the companies delivered so far. A task cancelled before it starts costs nothing. A task paused for more than 7 days is cancelled.

### Export

`exportCompanyResults({ task_id, format })` returns text. `format` is `csv` (the default) or `jsonl`. CSV has one row per company: its domain, name, fit score, location, primary email, emails, phones and social profiles, then the CEO (or managing director), founder, CTO and CFO with their title, email, email status and LinkedIn profile, and `fully_verified`, `unverified_criteria` and `enrichment_status`. JSON Lines has one company per line with every field. Fields the later stages have not filled in yet are empty.

## Tech stack

- TypeScript `^5.9.3`
- `undici` `^6.28.1 || ^7.29.1` for HTTP transport
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
- `extract()` and the legacy `webCrawl()` method return text while most other methods return JSON-shaped data
- the base URL is fixed to `https://api.desearch.ai`
- `aiSearch()` forcibly disables streaming
- People Search and company methods put `task_id` in the path, join array query parameters (`has`, `status`) with commas, and send `Idempotency-Key` only when you pass `idempotencyKey`

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

The exceptions are `PeopleTaskConflictError` and `CompanyTaskConflictError`, which People Search and company pause, resume and cancel throw on HTTP 409. Their message keeps the `HTTP 409: <response body>` format, and they add `status`, `detail` and the current `task`.

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
- no timeout, retry, or abort controls for individual requests (`waitForPeopleTask` and `waitForCompanyTask` have a polling timeout but cannot be aborted)
- `aiSearch` always disables streaming
- runtime failures surface as plain `Error` strings rather than typed SDK errors

Full details: [docs/known-issues.md](./docs/known-issues.md)
