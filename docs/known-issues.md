# desearch.js known issues

This file only lists limitations that are visible in the current source tree.

Source checked:
- `src/index.ts`
- `src/types.ts`
- `package.json`
- `tsup.config.ts`

## 1. `aiSearch` forces non-streaming behavior

Status: ⚠️ degraded

Evidence:

```ts
const { streaming, ...rest } = payload as AiSearchRequest & { streaming?: boolean };
const body = { ...rest, streaming: false };
```

Impact:
- callers cannot opt into streamed partial responses through this SDK
- the request flow only supports fully buffered responses

Why unresolved:
The transport helper is built around one complete response body and one parse step. Real streaming support would require a different public return model and different response handling.

## 2. The base URL is hard-coded to production

Status: ⚠️ degraded

Evidence:

```ts
const BASE_URL = 'https://api.desearch.ai';
```

Impact:
- there is no first-class staging or local API target
- environment switching requires source patching, mocking, or wrapping the SDK externally

Why unresolved:
The constructor only accepts `apiKey: string`. Supporting alternate targets would require either a config object or additional constructor parameters.

## 3. Runtime errors are plain strings inside `Error`

Status: ⚠️ degraded

Evidence:

```ts
throw new Error(`HTTP ${response.status}: ${errorBody}`);
```

and:

```ts
throw new Error(`Unexpected Error: ${error instanceof Error ? error.message : String(error)}`);
```

Impact:
- there is no typed SDK error hierarchy
- downstream consumers must inspect error strings if they want to branch by failure type
- the exceptions are `PeopleTaskConflictError` and `CompanyTaskConflictError`, which People Search and company pause, resume and cancel throw on HTTP 409 with the current task attached
- other company task failures, such as 410 when results have expired, are plain `HTTP <status>: <body>` errors

Why unresolved:
`src/types.ts` includes API error payload interfaces, but the runtime layer does not map HTTP failures into typed error classes or structured error objects.

## 4. No timeout, retry, or abort controls are exposed

Status: ⚠️ degraded

Evidence:

```ts
const response = await fetch(url, {
  method,
  headers,
  body,
});
```

Impact:
- consumers must implement resilience policy outside the SDK
- long-running requests cannot be cancelled through the public client API
- `waitForPeopleTask` and `waitForCompanyTask` have a polling timeout (`timeoutMs`) but no AbortSignal, so a wait in progress cannot be stopped early, and a failed poll request ends the wait with that error

Why unresolved:
The SDK keeps constructor and method signatures minimal. Exposing transport controls would expand the public API and require explicit policy choices this repo has not made yet.

## 5. `xPostsByUrls` depends on repeated GET query keys for arrays

Status: ⚠️ degraded

Evidence:

```ts
for (const item of value) {
  params.append(key, String(item));
}
```

Impact:
- multiple URLs are encoded as `?urls=a&urls=b&urls=c`
- compatibility depends on the upstream API continuing to accept repeated keys for array inputs

Why unresolved:
This behavior falls directly out of the shared GET serialization helper, and there is no alternate array encoding path in the SDK.

## 6. `AiSearchResponse` is intentionally loose

Status: ⚠️ degraded

Evidence:

```ts
export type AiSearchResponse = ResponseData | Record<string, unknown> | string;
```

Impact:
- TypeScript consumers may need runtime narrowing before safely reading response fields
- the SDK does not guarantee a single stable response shape for `aiSearch`

Why unresolved:
The package mirrors the API's current variability instead of enforcing a stricter SDK-specific response contract.

## 7. The transport is Node-oriented

Status: ⚠️ degraded

Evidence:

```ts
import { fetch } from 'undici';
```

Impact:
- the package is optimized for Node usage
- browser or alternative runtime consumers may need extra bundler or polyfill handling depending on their environment

Why unresolved:
The explicit `undici` import gives a predictable Node transport path, which matches the current package positioning and dependency graph.

## 8. No tests are present in the current repo tree

Status: ⚠️ degraded

Evidence:
- `package.json` defines `npm test` as `vitest run`
- there are no files under the `test/` directory in the current checkout

Impact:
- documentation and type changes are harder to regression-test automatically
- consumers rely more on manual validation and upstream API behavior

Why unresolved:
The package has test tooling wired into `package.json`, but the current repository tree does not include test files.

## 9. Write operations are limited to People Search and company tasks

Status: ⚠️ degraded for that use case

Evidence:
Most public methods in `src/index.ts` are read, search, or extraction wrappers. The only write operations are the task ones: they create tasks (`xProfileSearch`, `youtubeCreatorSearch`, `linkedinProfileSearch`, `tiktokCreatorSearch`, `companySearch`, `companyEnrich`) and pause, resume or cancel them. There are no account, ingestion, or other write operations exported from the SDK.

Impact:
- unsupported operations must be called directly over HTTP outside this package
- apart from People Search and company tasks, the SDK only covers the current read-side surface implemented in source today

Why unresolved:
The repo only implements the public endpoints that are present in `src/index.ts`. Expanding beyond that would require new upstream API coverage and new SDK method design.

## 10. `iterCompanyResults` yields each company once, as it was when its page was read

Status: ⚠️ degraded

Evidence:
`iterCompanyResults` follows `next_cursor`, and the API's cursor only moves past companies already delivered. The stages after the one a request needs (`contacts`, `people`, `email_patterns`, `email_check`) update a company in place after it was delivered.

Impact:
- on a task that is still running, a yielded company can be `partial` (`enrichment.status`), with leaders, inferred emails or email checks still missing
- iterating again from a saved cursor yields only new companies, not the updated versions of earlier ones
- to read every company in its latest version, call `getCompanyResults` without `cursor` (or iterate again from the start), or wait for the task to end with `waitForCompanyTask` first

Why unresolved:
This is how the API pages results. An SDK helper that re-reads earlier companies would cost extra requests on every page, so the SDK leaves that choice to the caller.
