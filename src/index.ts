import { fetch } from 'undici';
import type {
  AiSearchRequest,
  AiSearchResponse,
  AiWebLinksSearchRequest,
  Company,
  CompanyEnrichRequest,
  CompanyResultsPage,
  CompanyScore,
  CompanySearchRequest,
  CompanySearchTask,
  CompanyTask,
  CompanyTaskConflictResponse,
  CompanyTaskList,
  CompanyTaskParams,
  DesearchCostMetadata,
  DesearchDefaultRequestOptions,
  DesearchMetadataRequestOptions,
  DesearchRequestOptions,
  DesearchResponse,
  ExportCompanyResultsParams,
  ExportPeopleProfilesParams,
  ExportPeopleResultsParams,
  PeopleCriterionCheck,
  PeopleScore,
  ExtractParams,
  GetCompanyResultsParams,
  GetPeopleResultsParams,
  LinkedInProfileSearchRequest,
  ListCompanyTasksParams,
  ListPeopleProfilesParams,
  ListPeopleTasksParams,
  PeoplePlatform,
  PeopleProfilesPage,
  PeopleResultsPage,
  PeopleSearchOptions,
  PeopleSearchTask,
  PeopleTask,
  PeopleTaskConflictResponse,
  PeopleTaskList,
  PeopleTaskParams,
  PeopleTaskStatus,
  TikTokCreatorSearchRequest,
  WaitForCompanyTaskOptions,
  WaitForPeopleTaskOptions,
  XProfileSearchRequest,
  YouTubeCreatorSearchRequest,
  WebSearchResponse,
  AiXLinksSearchRequest,
  XLinksSearchResponse,
  XSearchParams,
  XPostsByUrlsParams,
  XPostByIdParams,
  XPostsByUserParams,
  XPostRetweetersParams,
  XRetweetersResponse,
  XUserPostsParams,
  XUserPostsResponse,
  XUserRepliesParams,
  XPostRepliesParams,
  XTrendsParams,
  XTrendsResponse,
  WebSearchParams,
  WebSearchResultsResponse,
  WebCrawlParams,
  TwitterScraperTweet,
  SearchApiRequest,
  SearchApiResponse,
  TikTokSearchRequest,
  TikTokPostByIdParams,
  TikTokProfileParams,
  TikTokProfilePostsParams,
  TikTokCommentsParams,
  TikTokHashtagParams,
  TikTokTrendingParams,
  TikTokPost,
  TikTokProfile,
  TikTokComment,
  FacebookSearchRequest,
  FacebookPostByIdParams,
  FacebookProfileParams,
  FacebookProfilePostsParams,
  FacebookCommentsParams,
  FacebookHashtagParams,
  FacebookPost,
  FacebookProfile,
  FacebookComment,
  InstagramSearchRequest,
  InstagramMediaParams,
  InstagramProfileParams,
  InstagramProfilePostsParams,
  InstagramCommentsParams,
  InstagramHashtagParams,
  InstagramSearchResult,
  InstagramMedia,
  InstagramProfile,
  InstagramComment,
  YouTubeSearchRequest,
  YouTubeVideoParams,
  YouTubeTranscriptParams,
  YouTubeCommentsParams,
  YouTubeChannelParams,
  YouTubeChannelVideosParams,
  YouTubeItem,
  YouTubeVideo,
  YouTubeTranscript,
  YouTubeComment,
  YouTubeChannel,
  RedditSearchRequest,
  RedditSubredditParams,
  RedditSubredditPostsParams,
  RedditPostByIdParams,
  RedditCommentsParams,
  RedditPost,
  RedditSubreddit,
  RedditComment,
  ThreadsSearchRequest,
  ThreadsSearchUsersRequest,
  ThreadsProfileParams,
  ThreadsProfilePostsParams,
  ThreadsPostByIdParams,
  ThreadsPost,
  ThreadsPostDetail,
  ThreadsProfile,
  ThreadsUser,
  NetworkStatsResponse,
  NetworkStatsHistoryResponse,
  NetworkStatsStreamEvent,
  StreamNetworkStatsOptions,
  ListMonitorItemsParams,
  ListMonitorRunsParams,
  ListMonitorsParams,
  Monitor,
  MonitorCreated,
  MonitorCreateRequest,
  MonitorDeleted,
  MonitorEstimate,
  MonitorEstimateRequest,
  MonitorItem,
  MonitorItemList,
  MonitorList,
  MonitorParams,
  MonitorRun,
  MonitorRunList,
  MonitorRunParams,
  MonitorRunWithItems,
  MonitorUpdateRequest,
  MonitorWebhookSecret,
  MonitorWebhookTestResult,
} from './types';

const BASE_URL = 'https://api.desearch.ai';

/** Statuses after which a People Search or company task no longer changes. */
const TASK_END_STATUSES: readonly PeopleTaskStatus[] = [
  'completed',
  'partial',
  'failed',
  'cancelled',
  'expired',
];

/** Per-request transport settings used by individual SDK methods. */
interface RequestConfig {
  /** Extra request headers, e.g. Idempotency-Key. */
  headers?: Record<string, string>;
  /** Builds a specific error for a non-2xx response; return undefined for the default error. */
  onErrorResponse?: (status: number, body: string) => Error | undefined;
  /** Send no Authorization header, for the routes that need no API key (network stats). */
  omitApiKey?: boolean;
}

/** One dispatched Server-Sent Event. */
interface SseEvent {
  id: string | null;
  event: string;
  data: string;
}

/**
 * Incremental `text/event-stream` parser that follows the WHATWG event stream rules: lines end with
 * CRLF, LF or CR; a blank line dispatches the event; `:` lines are comments; `data` lines are joined
 * with LF; the last event ID carries over to later events; an event without data is not dispatched.
 */
class SseParser {
  private buffer = '';
  private data: string[] = [];
  private eventType = '';
  private lastEventId: string | null = null;

  /** Adds decoded text and returns the events it completes. */
  push(text: string): SseEvent[] {
    this.buffer += text;
    const events: SseEvent[] = [];
    for (;;) {
      const match = /\r\n|\r|\n/.exec(this.buffer);
      // A trailing CR may be the first half of a CRLF split across chunks: wait for more text.
      if (
        !match ||
        (match[0] === '\r' && match.index === this.buffer.length - 1)
      ) {
        return events;
      }
      const line = this.buffer.slice(0, match.index);
      this.buffer = this.buffer.slice(match.index + match[0].length);
      const event = this.processLine(line);
      if (event) {
        events.push(event);
      }
    }
  }

  /** Ends the stream. A trailing CR still ends its line; an event not ended by a blank line is dropped. */
  end(): SseEvent[] {
    if (!this.buffer.endsWith('\r')) {
      return [];
    }
    const events = this.push('\n');
    this.buffer = '';
    return events;
  }

  private processLine(line: string): SseEvent | undefined {
    if (line === '') {
      return this.dispatch();
    }
    if (line.startsWith(':')) {
      return undefined;
    }
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }
    if (field === 'event') {
      this.eventType = value;
    } else if (field === 'data') {
      this.data.push(value);
    } else if (field === 'id' && !value.includes('\0')) {
      this.lastEventId = value;
    }
    // `retry` and unknown fields are ignored.
    return undefined;
  }

  private dispatch(): SseEvent | undefined {
    const data = this.data;
    const event = this.eventType || 'message';
    this.data = [];
    this.eventType = '';
    if (data.length === 0) {
      return undefined;
    }
    return { id: this.lastEventId, event, data: data.join('\n') };
  }
}

/** The SDK's `Unexpected Error: <message>` wrapper for failures that are not HTTP errors. */
function unexpectedError(error: unknown): Error {
  return new Error(
    `Unexpected Error: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
}

/**
 * Thrown by `pausePeopleTask`, `resumePeopleTask` and `cancelPeopleTask` when the task's
 * status does not allow the action (HTTP 409). The message keeps the SDK's `HTTP <status>: <body>`
 * format; `task` is the task as it is now.
 */
export class PeopleTaskConflictError extends Error {
  /** HTTP status of the response */
  readonly status = 409;
  /** Why the action is not allowed */
  readonly detail: string;
  /** The task in its current state */
  readonly task: PeopleTask;

  constructor(body: string, response: PeopleTaskConflictResponse) {
    super(`HTTP 409: ${body}`);
    this.name = 'PeopleTaskConflictError';
    this.detail = response.detail;
    this.task = response.task;
  }
}

/**
 * Thrown by `pauseCompanyTask`, `resumeCompanyTask` and `cancelCompanyTask` when the task's
 * status does not allow the action (HTTP 409). The message keeps the SDK's `HTTP <status>: <body>`
 * format; `task` is the task as it is now.
 */
export class CompanyTaskConflictError extends Error {
  /** HTTP status of the response */
  readonly status = 409;
  /** Why the action is not allowed */
  readonly detail: string;
  /** The task in its current state */
  readonly task: CompanyTask;

  constructor(body: string, response: CompanyTaskConflictResponse) {
    super(`HTTP 409: ${body}`);
    this.name = 'CompanyTaskConflictError';
    this.detail = response.detail;
    this.task = response.task;
  }
}

// Fallback for checks without `is_disqualifier`: the worker's keyword rule, which also sets the
// flag. Same rule as the API's CSV `unverified_criteria` column.
const DISQUALIFIER_CRITERION =
  /\b(disqualif(?:y|ier|iers)|exclude|excluding|not a fit|not qualified)\b/i;

function isDisqualifier(check: PeopleCriterionCheck): boolean {
  return typeof check.is_disqualifier === 'boolean'
    ? check.is_disqualifier
    : DISQUALIFIER_CRITERION.test(check.criterion);
}

/**
 * The criteria a result's own profile and posts (for a company, its own pages) do not confirm:
 * every criterion whose verdict is not `met`, plus every disqualifier (`is_disqualifier`) that is
 * `met` (it applies). Their `criterion` texts are what the CSV export lists in
 * `unverified_criteria`. A returned check with verdict `met` is a disqualifier that applies. Checks
 * scored before `is_disqualifier` existed use the same keyword rule the API uses. Empty for results
 * scored before criteria checks existed, and for Company Enrich results (`score` is null).
 * Information only: the result still qualified.
 */
export function unverifiedCriteria(
  score: PeopleScore | CompanyScore | null | undefined
): PeopleCriterionCheck[] {
  return (score?.criteria_checks ?? []).filter(
    (check) =>
      Boolean(check?.criterion) &&
      (check.verdict === 'met') === isDisqualifier(check)
  );
}

export class Desearch {
  private baseURL: string;
  private apiKey: string;

  constructor(apiKey: string) {
    this.baseURL = BASE_URL;
    this.apiKey = apiKey;
  }

  private parseResponseMetadata(headers: {
    get(name: string): string | null;
  }): DesearchCostMetadata {
    const costUsd = this.parseNumberHeader(headers.get('x-desearch-cost-usd'));
    const costCents = this.parseNumberHeader(
      headers.get('x-desearch-cost-cents')
    );
    const usageCount = this.parseNumberHeader(
      headers.get('x-desearch-usage-count')
    );
    const service = this.parseStringHeader(headers.get('x-desearch-service'));
    const currency = this.parseStringHeader(headers.get('x-desearch-currency'));
    const nextCursor = this.parseStringHeader(
      headers.get('x-desearch-next-cursor')
    );

    return {
      ...(costUsd !== undefined ? { costUsd } : {}),
      ...(costCents !== undefined ? { costCents } : {}),
      ...(usageCount !== undefined ? { usageCount } : {}),
      ...(service !== undefined ? { service } : {}),
      ...(currency !== undefined ? { currency } : {}),
      ...(nextCursor !== undefined ? { nextCursor } : {}),
    };
  }

  private parseNumberHeader(value: string | null): number | undefined {
    if (value === null || value.trim() === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseStringHeader(value: string | null): string | undefined {
    if (value === null) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private async handleRequest<T>(
    method: string,
    path: string,
    payload?: unknown,
    options?: DesearchRequestOptions,
    config?: RequestConfig
  ): Promise<T | DesearchResponse<T>> {
    try {
      let url = `${this.baseURL}${path}`;
      const headers: Record<string, string> = {
        ...config?.headers,
        ...(config?.omitApiKey ? {} : { Authorization: this.apiKey }),
      };
      let body: string | undefined;

      if (method === 'GET' && payload) {
        const params = new URLSearchParams();
        const obj = payload as Record<string, unknown>;
        for (const [key, value] of Object.entries(obj)) {
          if (value === undefined || value === null) continue;
          if (Array.isArray(value)) {
            for (const item of value) {
              params.append(key, String(item));
            }
          } else {
            params.append(key, String(value));
          }
        }
        const qs = params.toString();
        if (qs) {
          url += `?${qs}`;
        }
      }

      if ((method === 'POST' || method === 'PATCH') && payload) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(payload);
      }

      const response = await fetch(url, {
        method,
        headers,
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw (
          config?.onErrorResponse?.(response.status, errorBody) ??
          new Error(`HTTP ${response.status}: ${errorBody}`)
        );
      }

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? ((await response.json()) as T)
        : ((await response.text()) as unknown as T);

      if (options?.includeMetadata) {
        return {
          data,
          metadata: this.parseResponseMetadata(response.headers),
        };
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('HTTP ')) {
        throw error;
      }
      throw new Error(
        `Unexpected Error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private peopleTaskPath(params: PeopleTaskParams, suffix = ''): string {
    return `/desearch/people/tasks/${encodeURIComponent(
      params.task_id
    )}${suffix}`;
  }

  private companyTaskPath(params: CompanyTaskParams, suffix = ''): string {
    return `/desearch/companies/tasks/${encodeURIComponent(
      params.task_id
    )}${suffix}`;
  }

  private monitorPath(params: MonitorParams, suffix = ''): string {
    return `/desearch/monitors/${encodeURIComponent(
      params.monitor_id
    )}${suffix}`;
  }

  /**
   * `<prefix>/<value><suffix>` with the path parameter URL-encoded. A value that contains `/`
   * (a post URL, or an ID such as `Meta/posts/123`) is sent as `%2F` and still reaches the API's
   * `{id:path}` routes as one value.
   */
  private socialPath(prefix: string, value: string, suffix = ''): string {
    return `${prefix}/${encodeURIComponent(value)}${suffix}`;
  }

  /** Task route query params: drops `task_id` (it goes in the path) and joins arrays with commas. */
  private taskQuery(params: object): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (key === 'task_id') continue;
      if (Array.isArray(value)) {
        if (value.length > 0) {
          query[key] = value.join(',');
        }
      } else {
        query[key] = value;
      }
    }
    return query;
  }

  /** `listPeopleTasks` and `listCompanyTasks` query params: the `metadata` filter becomes one `metadata.<key>=<value>` param per pair. */
  private taskListQuery(
    params: ListPeopleTasksParams | ListCompanyTasksParams
  ): Record<string, unknown> {
    const { metadata, ...rest } = params;
    const query = this.taskQuery(rest);
    for (const [key, value] of Object.entries(metadata ?? {})) {
      query[`metadata.${key}`] = value;
    }
    return query;
  }

  /** Builds the conflict error from the `{ detail, task }` 409 body of pause, resume and cancel. */
  private parseTaskConflict<T>(
    status: number,
    body: string,
    createError: (body: string, response: { detail: string; task: T }) => Error
  ): Error | undefined {
    if (status !== 409) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(body) as { detail?: unknown; task?: unknown };
      if (parsed && typeof parsed.task === 'object' && parsed.task !== null) {
        return createError(body, {
          detail: typeof parsed.detail === 'string' ? parsed.detail : '',
          task: parsed.task as T,
        });
      }
    } catch {
      // Not the task 409 body: fall back to the default error.
    }
    return undefined;
  }

  /** POSTs a billed task create call, with `Idempotency-Key` when the caller passes `idempotencyKey`. */
  private createTask<T>(
    path: string,
    payload: unknown,
    options?: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<T | DesearchResponse<T>> {
    const idempotencyKey = options?.idempotencyKey;
    return this.handleRequest<T>(
      'POST',
      path,
      payload,
      options,
      idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}
    );
  }

  private peopleSearch(
    platform: PeoplePlatform,
    payload: unknown,
    options?: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<PeopleSearchTask | DesearchResponse<PeopleSearchTask>> {
    return this.createTask<PeopleSearchTask>(
      `/desearch/people/search/${platform}`,
      payload,
      options
    );
  }

  private peopleTaskControl(
    action: 'pause' | 'resume' | 'cancel',
    params: PeopleTaskParams,
    options?: DesearchRequestOptions
  ): Promise<PeopleTask | DesearchResponse<PeopleTask>> {
    return this.handleRequest<PeopleTask>(
      'POST',
      this.peopleTaskPath(params, `/${action}`),
      undefined,
      options,
      {
        onErrorResponse: (status, body) =>
          this.parseTaskConflict<PeopleTask>(
            status,
            body,
            (text, response) => new PeopleTaskConflictError(text, response)
          ),
      }
    );
  }

  private companyTaskControl(
    action: 'pause' | 'resume' | 'cancel',
    params: CompanyTaskParams,
    options?: DesearchRequestOptions
  ): Promise<CompanyTask | DesearchResponse<CompanyTask>> {
    return this.handleRequest<CompanyTask>(
      'POST',
      this.companyTaskPath(params, `/${action}`),
      undefined,
      options,
      {
        onErrorResponse: (status, body) =>
          this.parseTaskConflict<CompanyTask>(
            status,
            body,
            (text, response) => new CompanyTaskConflictError(text, response)
          ),
      }
    );
  }

  /** Polls `getTask` until the task's status is an end status; shared by the wait helpers. */
  private async pollTask<T extends { status: PeopleTaskStatus }>(
    product: string,
    taskId: string,
    getTask: () => Promise<T>,
    options: {
      intervalMs?: number;
      timeoutMs?: number;
      onProgress?: (task: T) => void;
    }
  ): Promise<T> {
    const intervalMs = Math.max(0, options.intervalMs ?? 5000);
    const timeoutMs = Math.max(0, options.timeoutMs ?? 600000);
    const deadline = Date.now() + timeoutMs;

    for (;;) {
      const task = await getTask();
      options.onProgress?.(task);
      if (TASK_END_STATUSES.includes(task.status)) {
        return task;
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new Error(
          `Timed out after ${timeoutMs}ms waiting for ${product} task ${taskId} (status: ${task.status})`
        );
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(intervalMs, remaining))
      );
    }
  }

  /**
   * Perform an AI-powered multi-source contextual search across web, X, Reddit, YouTube, HackerNews, Wikipedia, and arXiv.
   *
   * @param payload - The search request parameters including prompt, tools, date filters, and result type.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns Search results with optional AI-generated summaries, or a metadata wrapper when opted in.
   */
  async aiSearch(
    payload: AiSearchRequest,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<AiSearchResponse>>;
  async aiSearch(
    payload: AiSearchRequest,
    options?: DesearchDefaultRequestOptions
  ): Promise<AiSearchResponse>;
  async aiSearch(
    payload: AiSearchRequest,
    options: DesearchRequestOptions
  ): Promise<AiSearchResponse | DesearchResponse<AiSearchResponse>>;
  async aiSearch(
    payload: AiSearchRequest,
    options?: DesearchRequestOptions
  ): Promise<AiSearchResponse | DesearchResponse<AiSearchResponse>> {
    const { streaming, ...rest } = payload as AiSearchRequest & {
      streaming?: boolean;
    };
    const body = { ...rest, streaming: false };
    return this.handleRequest<AiSearchResponse>(
      'POST',
      '/desearch/ai/search',
      body,
      options
    );
  }

  /**
   * Search for raw links across web sources including web, HackerNews, Reddit, Wikipedia, YouTube, and arXiv.
   *
   * @param payload - The web links search request parameters including prompt, tools, and count.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns Structured link results grouped by source, or a metadata wrapper when opted in.
   */
  async aiWebLinksSearch(
    payload: AiWebLinksSearchRequest,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<WebSearchResponse>>;
  async aiWebLinksSearch(
    payload: AiWebLinksSearchRequest,
    options?: DesearchDefaultRequestOptions
  ): Promise<WebSearchResponse>;
  async aiWebLinksSearch(
    payload: AiWebLinksSearchRequest,
    options: DesearchRequestOptions
  ): Promise<WebSearchResponse | DesearchResponse<WebSearchResponse>>;
  async aiWebLinksSearch(
    payload: AiWebLinksSearchRequest,
    options?: DesearchRequestOptions
  ): Promise<WebSearchResponse | DesearchResponse<WebSearchResponse>> {
    return this.handleRequest<WebSearchResponse>(
      'POST',
      '/desearch/ai/search/links/web',
      payload,
      options
    );
  }

  /**
   * Search for X (Twitter) post links matching a prompt using AI-powered models.
   *
   * @param payload - The X links search request parameters including prompt and count.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns Tweet objects matching the search prompt, or a metadata wrapper when opted in.
   */
  async aiXLinksSearch(
    payload: AiXLinksSearchRequest,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<XLinksSearchResponse>>;
  async aiXLinksSearch(
    payload: AiXLinksSearchRequest,
    options?: DesearchDefaultRequestOptions
  ): Promise<XLinksSearchResponse>;
  async aiXLinksSearch(
    payload: AiXLinksSearchRequest,
    options: DesearchRequestOptions
  ): Promise<XLinksSearchResponse | DesearchResponse<XLinksSearchResponse>>;
  async aiXLinksSearch(
    payload: AiXLinksSearchRequest,
    options?: DesearchRequestOptions
  ): Promise<XLinksSearchResponse | DesearchResponse<XLinksSearchResponse>> {
    return this.handleRequest<XLinksSearchResponse>(
      'POST',
      '/desearch/ai/search/links/twitter',
      payload,
      options
    );
  }

  /**
   * Search X (Twitter) with extensive filtering options including date range, user, language, verification, media type, and engagement thresholds.
   *
   * @param params - The search parameters including query, sort, user, date range, language, verification filters, media filters, engagement thresholds, and count.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns An array of tweets matching the search criteria, or a metadata wrapper when opted in.
   */
  async xSearch(
    params: XSearchParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<TwitterScraperTweet[] | Record<string, unknown>>>;
  async xSearch(
    params: XSearchParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<TwitterScraperTweet[] | Record<string, unknown>>;
  async xSearch(
    params: XSearchParams,
    options: DesearchRequestOptions
  ): Promise<
    | TwitterScraperTweet[]
    | Record<string, unknown>
    | DesearchResponse<TwitterScraperTweet[] | Record<string, unknown>>
  >;
  async xSearch(
    params: XSearchParams,
    options?: DesearchRequestOptions
  ): Promise<
    | TwitterScraperTweet[]
    | Record<string, unknown>
    | DesearchResponse<TwitterScraperTweet[] | Record<string, unknown>>
  > {
    return this.handleRequest<TwitterScraperTweet[] | Record<string, unknown>>(
      'GET',
      '/twitter',
      params,
      options
    );
  }

  /**
   * Fetch full post data for a list of X (Twitter) post URLs.
   *
   * @param params - Object containing an array of post URLs to fetch.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns An array of tweet objects with metadata, content, and engagement metrics, or a metadata wrapper when opted in.
   */
  async xPostsByUrls(
    params: XPostsByUrlsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<TwitterScraperTweet[]>>;
  async xPostsByUrls(
    params: XPostsByUrlsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<TwitterScraperTweet[]>;
  async xPostsByUrls(
    params: XPostsByUrlsParams,
    options: DesearchRequestOptions
  ): Promise<TwitterScraperTweet[] | DesearchResponse<TwitterScraperTweet[]>>;
  async xPostsByUrls(
    params: XPostsByUrlsParams,
    options?: DesearchRequestOptions
  ): Promise<TwitterScraperTweet[] | DesearchResponse<TwitterScraperTweet[]>> {
    return this.handleRequest<TwitterScraperTweet[]>(
      'GET',
      '/twitter/urls',
      params,
      options
    );
  }

  /**
   * Fetch a single X (Twitter) post by its unique ID.
   *
   * @param params - Object containing the post ID.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns A tweet object with metadata, content, and engagement metrics, or a metadata wrapper when opted in.
   */
  async xPostById(
    params: XPostByIdParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<TwitterScraperTweet>>;
  async xPostById(
    params: XPostByIdParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<TwitterScraperTweet>;
  async xPostById(
    params: XPostByIdParams,
    options: DesearchRequestOptions
  ): Promise<TwitterScraperTweet | DesearchResponse<TwitterScraperTweet>>;
  async xPostById(
    params: XPostByIdParams,
    options?: DesearchRequestOptions
  ): Promise<TwitterScraperTweet | DesearchResponse<TwitterScraperTweet>> {
    return this.handleRequest<TwitterScraperTweet>(
      'GET',
      '/twitter/post',
      params,
      options
    );
  }

  /**
   * Search X (Twitter) posts by a specific user with optional keyword filtering.
   *
   * @param params - Object containing user, optional query, and count.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns An array of tweets posted by the specified user, or a metadata wrapper when opted in.
   */
  async xPostsByUser(
    params: XPostsByUserParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<TwitterScraperTweet[] | Record<string, unknown>>>;
  async xPostsByUser(
    params: XPostsByUserParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<TwitterScraperTweet[] | Record<string, unknown>>;
  async xPostsByUser(
    params: XPostsByUserParams,
    options: DesearchRequestOptions
  ): Promise<
    | TwitterScraperTweet[]
    | Record<string, unknown>
    | DesearchResponse<TwitterScraperTweet[] | Record<string, unknown>>
  >;
  async xPostsByUser(
    params: XPostsByUserParams,
    options?: DesearchRequestOptions
  ): Promise<
    | TwitterScraperTweet[]
    | Record<string, unknown>
    | DesearchResponse<TwitterScraperTweet[] | Record<string, unknown>>
  > {
    return this.handleRequest<TwitterScraperTweet[] | Record<string, unknown>>(
      'GET',
      '/twitter/post/user',
      params,
      options
    );
  }

  /**
   * Retrieve the list of users who retweeted a specific post by its ID.
   *
   * @param params - Object containing the post ID and optional cursor for pagination.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns A list of users who retweeted the post with optional pagination cursor, or a metadata wrapper when opted in.
   */
  async xPostRetweeters(
    params: XPostRetweetersParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<XRetweetersResponse>>;
  async xPostRetweeters(
    params: XPostRetweetersParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<XRetweetersResponse>;
  async xPostRetweeters(
    params: XPostRetweetersParams,
    options: DesearchRequestOptions
  ): Promise<XRetweetersResponse | DesearchResponse<XRetweetersResponse>>;
  async xPostRetweeters(
    params: XPostRetweetersParams,
    options?: DesearchRequestOptions
  ): Promise<XRetweetersResponse | DesearchResponse<XRetweetersResponse>> {
    return this.handleRequest<XRetweetersResponse>(
      'GET',
      '/twitter/post/retweeters',
      params,
      options
    );
  }

  /**
   * Retrieve a user's timeline posts by their username.
   *
   * @param params - Object containing the username and optional cursor for pagination.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The user's profile and their latest tweets with optional pagination cursor, or a metadata wrapper when opted in.
   */
  async xUserPosts(
    params: XUserPostsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<XUserPostsResponse>>;
  async xUserPosts(
    params: XUserPostsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<XUserPostsResponse>;
  async xUserPosts(
    params: XUserPostsParams,
    options: DesearchRequestOptions
  ): Promise<XUserPostsResponse | DesearchResponse<XUserPostsResponse>>;
  async xUserPosts(
    params: XUserPostsParams,
    options?: DesearchRequestOptions
  ): Promise<XUserPostsResponse | DesearchResponse<XUserPostsResponse>> {
    return this.handleRequest<XUserPostsResponse>(
      'GET',
      '/twitter/user/posts',
      params,
      options
    );
  }

  /**
   * Fetch tweets and replies posted by a specific user with optional keyword filtering.
   *
   * @param params - Object containing user, optional count, and optional query.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns An array of tweets and replies by the specified user, or a metadata wrapper when opted in.
   */
  async xUserReplies(
    params: XUserRepliesParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<TwitterScraperTweet[] | Record<string, unknown>>>;
  async xUserReplies(
    params: XUserRepliesParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<TwitterScraperTweet[] | Record<string, unknown>>;
  async xUserReplies(
    params: XUserRepliesParams,
    options: DesearchRequestOptions
  ): Promise<
    | TwitterScraperTweet[]
    | Record<string, unknown>
    | DesearchResponse<TwitterScraperTweet[] | Record<string, unknown>>
  >;
  async xUserReplies(
    params: XUserRepliesParams,
    options?: DesearchRequestOptions
  ): Promise<
    | TwitterScraperTweet[]
    | Record<string, unknown>
    | DesearchResponse<TwitterScraperTweet[] | Record<string, unknown>>
  > {
    return this.handleRequest<TwitterScraperTweet[] | Record<string, unknown>>(
      'GET',
      '/twitter/replies',
      params,
      options
    );
  }

  /**
   * Fetch replies to a specific X (Twitter) post by its post ID.
   *
   * @param params - Object containing the post ID, optional count, and optional query.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns An array of reply tweets for the specified post, or a metadata wrapper when opted in.
   */
  async xPostReplies(
    params: XPostRepliesParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<TwitterScraperTweet[] | Record<string, unknown>>>;
  async xPostReplies(
    params: XPostRepliesParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<TwitterScraperTweet[] | Record<string, unknown>>;
  async xPostReplies(
    params: XPostRepliesParams,
    options: DesearchRequestOptions
  ): Promise<
    | TwitterScraperTweet[]
    | Record<string, unknown>
    | DesearchResponse<TwitterScraperTweet[] | Record<string, unknown>>
  >;
  async xPostReplies(
    params: XPostRepliesParams,
    options?: DesearchRequestOptions
  ): Promise<
    | TwitterScraperTweet[]
    | Record<string, unknown>
    | DesearchResponse<TwitterScraperTweet[] | Record<string, unknown>>
  > {
    return this.handleRequest<TwitterScraperTweet[] | Record<string, unknown>>(
      'GET',
      '/twitter/replies/post',
      params,
      options
    );
  }

  /**
   * Retrieve trending topics on X for a given location using its WOEID (Where On Earth ID).
   *
   * @param params - Object containing the WOEID and optional count.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns Trending topics with optional location metadata, or a metadata wrapper when opted in.
   */
  async xTrends(
    params: XTrendsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<XTrendsResponse>>;
  async xTrends(
    params: XTrendsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<XTrendsResponse>;
  async xTrends(
    params: XTrendsParams,
    options: DesearchRequestOptions
  ): Promise<XTrendsResponse | DesearchResponse<XTrendsResponse>>;
  async xTrends(
    params: XTrendsParams,
    options?: DesearchRequestOptions
  ): Promise<XTrendsResponse | DesearchResponse<XTrendsResponse>> {
    return this.handleRequest<XTrendsResponse>(
      'GET',
      '/twitter/trends',
      params,
      options
    );
  }

  /**
   * Perform a SERP web search returning paginated web search results.
   *
   * @param params - Object containing the search query and optional pagination start offset.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns Paginated web search results, or a metadata wrapper when opted in.
   */
  async webSearch(
    params: WebSearchParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<WebSearchResultsResponse>>;
  async webSearch(
    params: WebSearchParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<WebSearchResultsResponse>;
  async webSearch(
    params: WebSearchParams,
    options: DesearchRequestOptions
  ): Promise<
    WebSearchResultsResponse | DesearchResponse<WebSearchResultsResponse>
  >;
  async webSearch(
    params: WebSearchParams,
    options?: DesearchRequestOptions
  ): Promise<
    WebSearchResultsResponse | DesearchResponse<WebSearchResultsResponse>
  > {
    return this.handleRequest<WebSearchResultsResponse>(
      'GET',
      '/web',
      params,
      options
    );
  }

  /**
   * Extract a URL and return its content as plain text or HTML.
   *
   * @param params - Object containing the URL and optional extraction controls.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The extracted content as a string, or a metadata wrapper when opted in.
   */
  async extract(
    params: ExtractParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<string>>;
  async extract(
    params: ExtractParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<string>;
  async extract(
    params: ExtractParams,
    options: DesearchRequestOptions
  ): Promise<string | DesearchResponse<string>>;
  async extract(
    params: ExtractParams,
    options?: DesearchRequestOptions
  ): Promise<string | DesearchResponse<string>> {
    return this.handleRequest<string>('GET', '/web/extract', params, options);
  }

  /**
   * Crawl a URL and return its content as plain text or HTML.
   *
   * @param params - Object containing the URL to crawl and optional format (html or text).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The crawled content as a string, or a metadata wrapper when opted in.
   * @deprecated Use `extract()` for new integrations. This method keeps calling the legacy `/web/crawl` route for compatibility.
   */
  async webCrawl(
    params: WebCrawlParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<string>>;
  async webCrawl(
    params: WebCrawlParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<string>;
  async webCrawl(
    params: WebCrawlParams,
    options: DesearchRequestOptions
  ): Promise<string | DesearchResponse<string>>;
  async webCrawl(
    params: WebCrawlParams,
    options?: DesearchRequestOptions
  ): Promise<string | DesearchResponse<string>> {
    return this.handleRequest<string>('GET', '/web/crawl', params, options);
  }

  /**
   * Search the web and return ranked pages, each with the passage that best matches the query (Search API).
   *
   * The JSON body includes `cost_usd`, `usage_count`, `service` and `currency`.
   *
   * @param payload - The search request including query, mode (fast or balanced), count (10, 15 or 20), date range, highlights and page_text.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns Ranked results and the cost of the request, or a metadata wrapper when opted in.
   */
  async searchApi(
    payload: SearchApiRequest,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<SearchApiResponse>>;
  async searchApi(
    payload: SearchApiRequest,
    options?: DesearchDefaultRequestOptions
  ): Promise<SearchApiResponse>;
  async searchApi(
    payload: SearchApiRequest,
    options: DesearchRequestOptions
  ): Promise<SearchApiResponse | DesearchResponse<SearchApiResponse>>;
  async searchApi(
    payload: SearchApiRequest,
    options?: DesearchRequestOptions
  ): Promise<SearchApiResponse | DesearchResponse<SearchApiResponse>> {
    return this.handleRequest<SearchApiResponse>(
      'POST',
      '/search',
      payload,
      options
    );
  }

  /**
   * Search public TikTok posts by keyword.
   *
   * Each post `id` is the canonical TikTok video ID and works with `tiktokComments` and `tiktokPostById`.
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param payload - The search request including query, count (1-100), optional sort, and the cursor of the previous page.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of TikTok posts, or a metadata wrapper when opted in.
   */
  async tiktokSearch(
    payload: TikTokSearchRequest,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<TikTokPost[]>>;
  async tiktokSearch(
    payload: TikTokSearchRequest,
    options?: DesearchDefaultRequestOptions
  ): Promise<TikTokPost[]>;
  async tiktokSearch(
    payload: TikTokSearchRequest,
    options: DesearchRequestOptions
  ): Promise<TikTokPost[] | DesearchResponse<TikTokPost[]>>;
  async tiktokSearch(
    payload: TikTokSearchRequest,
    options?: DesearchRequestOptions
  ): Promise<TikTokPost[] | DesearchResponse<TikTokPost[]>> {
    return this.handleRequest<TikTokPost[]>(
      'POST',
      '/desearch/tiktok/search',
      payload,
      options
    );
  }

  /**
   * Retrieve a public TikTok post by its ID.
   *
   * @param params - Object containing the TikTok video/post ID (URL-encoded into the path).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The TikTok post, or a metadata wrapper when opted in.
   */
  async tiktokPostById(
    params: TikTokPostByIdParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<TikTokPost>>;
  async tiktokPostById(
    params: TikTokPostByIdParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<TikTokPost>;
  async tiktokPostById(
    params: TikTokPostByIdParams,
    options: DesearchRequestOptions
  ): Promise<TikTokPost | DesearchResponse<TikTokPost>>;
  async tiktokPostById(
    params: TikTokPostByIdParams,
    options?: DesearchRequestOptions
  ): Promise<TikTokPost | DesearchResponse<TikTokPost>> {
    return this.handleRequest<TikTokPost>(
      'GET',
      this.socialPath('/desearch/tiktok/post', params.id),
      undefined,
      options
    );
  }

  /**
   * Retrieve a public TikTok profile by username.
   *
   * @param params - Object containing the TikTok username without @.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The TikTok profile, or a metadata wrapper when opted in.
   */
  async tiktokProfile(
    params: TikTokProfileParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<TikTokProfile>>;
  async tiktokProfile(
    params: TikTokProfileParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<TikTokProfile>;
  async tiktokProfile(
    params: TikTokProfileParams,
    options: DesearchRequestOptions
  ): Promise<TikTokProfile | DesearchResponse<TikTokProfile>>;
  async tiktokProfile(
    params: TikTokProfileParams,
    options?: DesearchRequestOptions
  ): Promise<TikTokProfile | DesearchResponse<TikTokProfile>> {
    return this.handleRequest<TikTokProfile>(
      'GET',
      this.socialPath('/desearch/tiktok/profile', params.username),
      undefined,
      options
    );
  }

  /**
   * Retrieve the public posts of a TikTok user.
   *
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param params - Object containing the TikTok username without @, and optional count (1-100) and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of TikTok posts, or a metadata wrapper when opted in.
   */
  async tiktokProfilePosts(
    params: TikTokProfilePostsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<TikTokPost[]>>;
  async tiktokProfilePosts(
    params: TikTokProfilePostsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<TikTokPost[]>;
  async tiktokProfilePosts(
    params: TikTokProfilePostsParams,
    options: DesearchRequestOptions
  ): Promise<TikTokPost[] | DesearchResponse<TikTokPost[]>>;
  async tiktokProfilePosts(
    params: TikTokProfilePostsParams,
    options?: DesearchRequestOptions
  ): Promise<TikTokPost[] | DesearchResponse<TikTokPost[]>> {
    return this.handleRequest<TikTokPost[]>(
      'GET',
      this.socialPath('/desearch/tiktok/profile', params.username, '/posts'),
      { count: params.count, cursor: params.cursor },
      options
    );
  }

  /**
   * Retrieve the public comments of a TikTok video.
   *
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param params - Object containing the TikTok video ID, and optional count (1-100) and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of TikTok comments, or a metadata wrapper when opted in.
   */
  async tiktokComments(
    params: TikTokCommentsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<TikTokComment[]>>;
  async tiktokComments(
    params: TikTokCommentsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<TikTokComment[]>;
  async tiktokComments(
    params: TikTokCommentsParams,
    options: DesearchRequestOptions
  ): Promise<TikTokComment[] | DesearchResponse<TikTokComment[]>>;
  async tiktokComments(
    params: TikTokCommentsParams,
    options?: DesearchRequestOptions
  ): Promise<TikTokComment[] | DesearchResponse<TikTokComment[]>> {
    return this.handleRequest<TikTokComment[]>(
      'GET',
      this.socialPath('/desearch/tiktok/comments', params.video_id),
      { count: params.count, cursor: params.cursor },
      options
    );
  }

  /**
   * Retrieve public TikTok posts for a hashtag.
   *
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param params - Object containing the hashtag without #, and optional count (1-100) and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of TikTok posts, or a metadata wrapper when opted in.
   */
  async tiktokHashtag(
    params: TikTokHashtagParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<TikTokPost[]>>;
  async tiktokHashtag(
    params: TikTokHashtagParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<TikTokPost[]>;
  async tiktokHashtag(
    params: TikTokHashtagParams,
    options: DesearchRequestOptions
  ): Promise<TikTokPost[] | DesearchResponse<TikTokPost[]>>;
  async tiktokHashtag(
    params: TikTokHashtagParams,
    options?: DesearchRequestOptions
  ): Promise<TikTokPost[] | DesearchResponse<TikTokPost[]>> {
    return this.handleRequest<TikTokPost[]>(
      'GET',
      this.socialPath('/desearch/tiktok/hashtag', params.tag),
      { count: params.count, cursor: params.cursor },
      options
    );
  }

  /**
   * Retrieve trending TikTok posts for a region. Not paginated.
   *
   * @param params - Optional two-letter region code (default US) and count (1-100).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns An array of TikTok posts, or a metadata wrapper when opted in.
   */
  async tiktokTrending(
    params: TikTokTrendingParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<TikTokPost[]>>;
  async tiktokTrending(
    params?: TikTokTrendingParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<TikTokPost[]>;
  async tiktokTrending(
    params: TikTokTrendingParams,
    options: DesearchRequestOptions
  ): Promise<TikTokPost[] | DesearchResponse<TikTokPost[]>>;
  async tiktokTrending(
    params: TikTokTrendingParams = {},
    options?: DesearchRequestOptions
  ): Promise<TikTokPost[] | DesearchResponse<TikTokPost[]>> {
    return this.handleRequest<TikTokPost[]>(
      'GET',
      '/desearch/tiktok/trending',
      { region: params.region, count: params.count },
      options
    );
  }

  /**
   * Search public Meta Ad Library records by keyword.
   *
   * Organic Facebook post search is not available.
   * `sort` is `impressions` (the default: most seen first) or `recent` (Meta's monthly relevance grouping, which puts recently started ads first).
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param payload - The search request including query, count (1-100), sort, and the cursor of the previous page.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of Facebook posts (Ad Library records), or a metadata wrapper when opted in.
   */
  async facebookSearch(
    payload: FacebookSearchRequest,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<FacebookPost[]>>;
  async facebookSearch(
    payload: FacebookSearchRequest,
    options?: DesearchDefaultRequestOptions
  ): Promise<FacebookPost[]>;
  async facebookSearch(
    payload: FacebookSearchRequest,
    options: DesearchRequestOptions
  ): Promise<FacebookPost[] | DesearchResponse<FacebookPost[]>>;
  async facebookSearch(
    payload: FacebookSearchRequest,
    options?: DesearchRequestOptions
  ): Promise<FacebookPost[] | DesearchResponse<FacebookPost[]>> {
    return this.handleRequest<FacebookPost[]>(
      'POST',
      '/desearch/facebook/search',
      payload,
      options
    );
  }

  /**
   * Retrieve a public Facebook post or media item by its ID.
   *
   * @param params - Object containing the Facebook post/media ID (URL-encoded into the path; IDs and URLs that contain `/` work).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The Facebook post, or a metadata wrapper when opted in.
   */
  async facebookPostById(
    params: FacebookPostByIdParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<FacebookPost>>;
  async facebookPostById(
    params: FacebookPostByIdParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<FacebookPost>;
  async facebookPostById(
    params: FacebookPostByIdParams,
    options: DesearchRequestOptions
  ): Promise<FacebookPost | DesearchResponse<FacebookPost>>;
  async facebookPostById(
    params: FacebookPostByIdParams,
    options?: DesearchRequestOptions
  ): Promise<FacebookPost | DesearchResponse<FacebookPost>> {
    return this.handleRequest<FacebookPost>(
      'GET',
      this.socialPath('/desearch/facebook/post', params.id),
      undefined,
      options
    );
  }

  /**
   * Retrieve a public Facebook profile or page by username, vanity handle, or public ID.
   *
   * @param params - Object containing the Facebook profile/page ID or public handle.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The Facebook profile or page, or a metadata wrapper when opted in.
   */
  async facebookProfile(
    params: FacebookProfileParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<FacebookProfile>>;
  async facebookProfile(
    params: FacebookProfileParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<FacebookProfile>;
  async facebookProfile(
    params: FacebookProfileParams,
    options: DesearchRequestOptions
  ): Promise<FacebookProfile | DesearchResponse<FacebookProfile>>;
  async facebookProfile(
    params: FacebookProfileParams,
    options?: DesearchRequestOptions
  ): Promise<FacebookProfile | DesearchResponse<FacebookProfile>> {
    return this.handleRequest<FacebookProfile>(
      'GET',
      this.socialPath('/desearch/facebook/profile', params.profile_id),
      undefined,
      options
    );
  }

  /**
   * Retrieve the public posts of a Facebook profile or page.
   *
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param params - Object containing the Facebook profile/page ID or public handle, and optional count (1-100) and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of Facebook posts, or a metadata wrapper when opted in.
   */
  async facebookProfilePosts(
    params: FacebookProfilePostsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<FacebookPost[]>>;
  async facebookProfilePosts(
    params: FacebookProfilePostsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<FacebookPost[]>;
  async facebookProfilePosts(
    params: FacebookProfilePostsParams,
    options: DesearchRequestOptions
  ): Promise<FacebookPost[] | DesearchResponse<FacebookPost[]>>;
  async facebookProfilePosts(
    params: FacebookProfilePostsParams,
    options?: DesearchRequestOptions
  ): Promise<FacebookPost[] | DesearchResponse<FacebookPost[]>> {
    return this.handleRequest<FacebookPost[]>(
      'GET',
      this.socialPath(
        '/desearch/facebook/profile',
        params.profile_id,
        '/posts'
      ),
      { count: params.count, cursor: params.cursor },
      options
    );
  }

  /**
   * Retrieve the public comments of a Facebook post or media item.
   *
   * The provider returns about 10 comments per page whatever `count` is.
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param params - Object containing the Facebook post/media ID, and optional count (1-100) and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of Facebook comments, or a metadata wrapper when opted in.
   */
  async facebookComments(
    params: FacebookCommentsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<FacebookComment[]>>;
  async facebookComments(
    params: FacebookCommentsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<FacebookComment[]>;
  async facebookComments(
    params: FacebookCommentsParams,
    options: DesearchRequestOptions
  ): Promise<FacebookComment[] | DesearchResponse<FacebookComment[]>>;
  async facebookComments(
    params: FacebookCommentsParams,
    options?: DesearchRequestOptions
  ): Promise<FacebookComment[] | DesearchResponse<FacebookComment[]>> {
    return this.handleRequest<FacebookComment[]>(
      'GET',
      this.socialPath('/desearch/facebook/comments', params.post_id),
      { count: params.count, cursor: params.cursor },
      options
    );
  }

  /**
   * Retrieve public Meta Ad Library records for a keyword or hashtag.
   *
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param params - Object containing the hashtag without #, and optional count (1-100) and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of Facebook posts (Ad Library records), or a metadata wrapper when opted in.
   */
  async facebookHashtag(
    params: FacebookHashtagParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<FacebookPost[]>>;
  async facebookHashtag(
    params: FacebookHashtagParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<FacebookPost[]>;
  async facebookHashtag(
    params: FacebookHashtagParams,
    options: DesearchRequestOptions
  ): Promise<FacebookPost[] | DesearchResponse<FacebookPost[]>>;
  async facebookHashtag(
    params: FacebookHashtagParams,
    options?: DesearchRequestOptions
  ): Promise<FacebookPost[] | DesearchResponse<FacebookPost[]>> {
    return this.handleRequest<FacebookPost[]>(
      'GET',
      this.socialPath('/desearch/facebook/hashtag', params.tag),
      { count: params.count, cursor: params.cursor },
      options
    );
  }

  /**
   * Search public Instagram profiles by keyword.
   *
   * Returns one page and does not paginate. Use `instagramHashtag` for media discovery.
   *
   * @param payload - The search request including query and count (1-100).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns An array of Instagram search results, or a metadata wrapper when opted in.
   */
  async instagramSearch(
    payload: InstagramSearchRequest,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<InstagramSearchResult[]>>;
  async instagramSearch(
    payload: InstagramSearchRequest,
    options?: DesearchDefaultRequestOptions
  ): Promise<InstagramSearchResult[]>;
  async instagramSearch(
    payload: InstagramSearchRequest,
    options: DesearchRequestOptions
  ): Promise<
    InstagramSearchResult[] | DesearchResponse<InstagramSearchResult[]>
  >;
  async instagramSearch(
    payload: InstagramSearchRequest,
    options?: DesearchRequestOptions
  ): Promise<
    InstagramSearchResult[] | DesearchResponse<InstagramSearchResult[]>
  > {
    return this.handleRequest<InstagramSearchResult[]>(
      'POST',
      '/desearch/instagram/search',
      payload,
      options
    );
  }

  /**
   * Retrieve a public Instagram post or reel by shortcode, ID, or URL.
   *
   * @param params - Object containing the media shortcode, ID, or public URL (URL-encoded into the path).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The Instagram media, or a metadata wrapper when opted in.
   */
  async instagramMedia(
    params: InstagramMediaParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<InstagramMedia>>;
  async instagramMedia(
    params: InstagramMediaParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<InstagramMedia>;
  async instagramMedia(
    params: InstagramMediaParams,
    options: DesearchRequestOptions
  ): Promise<InstagramMedia | DesearchResponse<InstagramMedia>>;
  async instagramMedia(
    params: InstagramMediaParams,
    options?: DesearchRequestOptions
  ): Promise<InstagramMedia | DesearchResponse<InstagramMedia>> {
    return this.handleRequest<InstagramMedia>(
      'GET',
      this.socialPath('/desearch/instagram/media', params.id),
      undefined,
      options
    );
  }

  /**
   * Retrieve a public Instagram profile by username.
   *
   * @param params - Object containing the Instagram username without @.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The Instagram profile, or a metadata wrapper when opted in.
   */
  async instagramProfile(
    params: InstagramProfileParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<InstagramProfile>>;
  async instagramProfile(
    params: InstagramProfileParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<InstagramProfile>;
  async instagramProfile(
    params: InstagramProfileParams,
    options: DesearchRequestOptions
  ): Promise<InstagramProfile | DesearchResponse<InstagramProfile>>;
  async instagramProfile(
    params: InstagramProfileParams,
    options?: DesearchRequestOptions
  ): Promise<InstagramProfile | DesearchResponse<InstagramProfile>> {
    return this.handleRequest<InstagramProfile>(
      'GET',
      this.socialPath('/desearch/instagram/profile', params.username),
      undefined,
      options
    );
  }

  /**
   * Retrieve the public posts of an Instagram user.
   *
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param params - Object containing the Instagram username without @, and optional count (1-100) and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of Instagram media, or a metadata wrapper when opted in.
   */
  async instagramProfilePosts(
    params: InstagramProfilePostsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<InstagramMedia[]>>;
  async instagramProfilePosts(
    params: InstagramProfilePostsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<InstagramMedia[]>;
  async instagramProfilePosts(
    params: InstagramProfilePostsParams,
    options: DesearchRequestOptions
  ): Promise<InstagramMedia[] | DesearchResponse<InstagramMedia[]>>;
  async instagramProfilePosts(
    params: InstagramProfilePostsParams,
    options?: DesearchRequestOptions
  ): Promise<InstagramMedia[] | DesearchResponse<InstagramMedia[]>> {
    return this.handleRequest<InstagramMedia[]>(
      'GET',
      this.socialPath('/desearch/instagram/profile', params.username, '/posts'),
      { count: params.count, cursor: params.cursor },
      options
    );
  }

  /**
   * Retrieve the public comments of an Instagram post, identified by its shortcode.
   *
   * Numeric media IDs and composite post IDs are not accepted: the API answers 404.
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param params - Object containing the post shortcode (e.g. `DeuOR-CjKE9`), and optional count (1-100) and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of Instagram comments, or a metadata wrapper when opted in.
   */
  async instagramComments(
    params: InstagramCommentsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<InstagramComment[]>>;
  async instagramComments(
    params: InstagramCommentsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<InstagramComment[]>;
  async instagramComments(
    params: InstagramCommentsParams,
    options: DesearchRequestOptions
  ): Promise<InstagramComment[] | DesearchResponse<InstagramComment[]>>;
  async instagramComments(
    params: InstagramCommentsParams,
    options?: DesearchRequestOptions
  ): Promise<InstagramComment[] | DesearchResponse<InstagramComment[]>> {
    return this.handleRequest<InstagramComment[]>(
      'GET',
      this.socialPath('/desearch/instagram/comments', params.shortcode),
      { count: params.count, cursor: params.cursor },
      options
    );
  }

  /**
   * Retrieve public Instagram media for a hashtag.
   *
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param params - Object containing the hashtag without #, and optional count (1-100) and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of Instagram media, or a metadata wrapper when opted in.
   */
  async instagramHashtag(
    params: InstagramHashtagParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<InstagramMedia[]>>;
  async instagramHashtag(
    params: InstagramHashtagParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<InstagramMedia[]>;
  async instagramHashtag(
    params: InstagramHashtagParams,
    options: DesearchRequestOptions
  ): Promise<InstagramMedia[] | DesearchResponse<InstagramMedia[]>>;
  async instagramHashtag(
    params: InstagramHashtagParams,
    options?: DesearchRequestOptions
  ): Promise<InstagramMedia[] | DesearchResponse<InstagramMedia[]>> {
    return this.handleRequest<InstagramMedia[]>(
      'GET',
      this.socialPath('/desearch/instagram/hashtag', params.tag),
      { count: params.count, cursor: params.cursor },
      options
    );
  }

  /**
   * Search public YouTube videos, Shorts, live streams, channels and playlists by keyword.
   *
   * Each result has a `type`. A video `id` works with `youtubeVideo`, `youtubeTranscript` and `youtubeComments`.
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param payload - The search request including query, and optional type, upload_date, sort_by, duration and the cursor of the previous page.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of YouTube results, or a metadata wrapper when opted in.
   */
  async youtubeSearch(
    payload: YouTubeSearchRequest,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<YouTubeItem[]>>;
  async youtubeSearch(
    payload: YouTubeSearchRequest,
    options?: DesearchDefaultRequestOptions
  ): Promise<YouTubeItem[]>;
  async youtubeSearch(
    payload: YouTubeSearchRequest,
    options: DesearchRequestOptions
  ): Promise<YouTubeItem[] | DesearchResponse<YouTubeItem[]>>;
  async youtubeSearch(
    payload: YouTubeSearchRequest,
    options?: DesearchRequestOptions
  ): Promise<YouTubeItem[] | DesearchResponse<YouTubeItem[]>> {
    return this.handleRequest<YouTubeItem[]>(
      'POST',
      '/desearch/youtube/search',
      payload,
      options
    );
  }

  /**
   * Retrieve a public YouTube video or Short: title, description, channel, views, likes, comments, chapters and caption languages.
   *
   * @param params - Object containing the video or Short ID, or its full URL (URL-encoded into the path).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The YouTube video, or a metadata wrapper when opted in.
   */
  async youtubeVideo(
    params: YouTubeVideoParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<YouTubeVideo>>;
  async youtubeVideo(
    params: YouTubeVideoParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<YouTubeVideo>;
  async youtubeVideo(
    params: YouTubeVideoParams,
    options: DesearchRequestOptions
  ): Promise<YouTubeVideo | DesearchResponse<YouTubeVideo>>;
  async youtubeVideo(
    params: YouTubeVideoParams,
    options?: DesearchRequestOptions
  ): Promise<YouTubeVideo | DesearchResponse<YouTubeVideo>> {
    return this.handleRequest<YouTubeVideo>(
      'GET',
      this.socialPath('/desearch/youtube/video', params.id),
      undefined,
      options
    );
  }

  /**
   * Retrieve the public captions of a YouTube video or Short as plain text and timestamped segments.
   *
   * A video without captions is a 404 and is not charged.
   *
   * @param params - Object containing the video or Short ID, or its full URL, and an optional caption language code (YouTube's default track when omitted).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The transcript, or a metadata wrapper when opted in.
   */
  async youtubeTranscript(
    params: YouTubeTranscriptParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<YouTubeTranscript>>;
  async youtubeTranscript(
    params: YouTubeTranscriptParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<YouTubeTranscript>;
  async youtubeTranscript(
    params: YouTubeTranscriptParams,
    options: DesearchRequestOptions
  ): Promise<YouTubeTranscript | DesearchResponse<YouTubeTranscript>>;
  async youtubeTranscript(
    params: YouTubeTranscriptParams,
    options?: DesearchRequestOptions
  ): Promise<YouTubeTranscript | DesearchResponse<YouTubeTranscript>> {
    return this.handleRequest<YouTubeTranscript>(
      'GET',
      this.socialPath('/desearch/youtube/transcript', params.video_id),
      { language: params.language },
      options
    );
  }

  /**
   * Retrieve the public top-level comments of a YouTube video.
   *
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param params - Object containing the video ID or URL, and optional order (`top` or `newest`) and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of YouTube comments, or a metadata wrapper when opted in.
   */
  async youtubeComments(
    params: YouTubeCommentsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<YouTubeComment[]>>;
  async youtubeComments(
    params: YouTubeCommentsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<YouTubeComment[]>;
  async youtubeComments(
    params: YouTubeCommentsParams,
    options: DesearchRequestOptions
  ): Promise<YouTubeComment[] | DesearchResponse<YouTubeComment[]>>;
  async youtubeComments(
    params: YouTubeCommentsParams,
    options?: DesearchRequestOptions
  ): Promise<YouTubeComment[] | DesearchResponse<YouTubeComment[]>> {
    return this.handleRequest<YouTubeComment[]>(
      'GET',
      this.socialPath('/desearch/youtube/comments', params.video_id),
      { order: params.order, cursor: params.cursor },
      options
    );
  }

  /**
   * Retrieve public YouTube channel metadata: subscribers, description, country and links.
   *
   * @param params - Object containing the channel handle (with or without @) or channel ID (`UC…`).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The YouTube channel, or a metadata wrapper when opted in.
   */
  async youtubeChannel(
    params: YouTubeChannelParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<YouTubeChannel>>;
  async youtubeChannel(
    params: YouTubeChannelParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<YouTubeChannel>;
  async youtubeChannel(
    params: YouTubeChannelParams,
    options: DesearchRequestOptions
  ): Promise<YouTubeChannel | DesearchResponse<YouTubeChannel>>;
  async youtubeChannel(
    params: YouTubeChannelParams,
    options?: DesearchRequestOptions
  ): Promise<YouTubeChannel | DesearchResponse<YouTubeChannel>> {
    return this.handleRequest<YouTubeChannel>(
      'GET',
      this.socialPath('/desearch/youtube/channel', params.handle),
      undefined,
      options
    );
  }

  /**
   * Retrieve the public videos a YouTube channel uploaded, latest or most popular first.
   *
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param params - Object containing the channel handle or ID, and optional sort (`latest` or `popular`) and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of YouTube videos, or a metadata wrapper when opted in.
   */
  async youtubeChannelVideos(
    params: YouTubeChannelVideosParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<YouTubeItem[]>>;
  async youtubeChannelVideos(
    params: YouTubeChannelVideosParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<YouTubeItem[]>;
  async youtubeChannelVideos(
    params: YouTubeChannelVideosParams,
    options: DesearchRequestOptions
  ): Promise<YouTubeItem[] | DesearchResponse<YouTubeItem[]>>;
  async youtubeChannelVideos(
    params: YouTubeChannelVideosParams,
    options?: DesearchRequestOptions
  ): Promise<YouTubeItem[] | DesearchResponse<YouTubeItem[]>> {
    return this.handleRequest<YouTubeItem[]>(
      'GET',
      this.socialPath('/desearch/youtube/channel', params.handle, '/videos'),
      { sort: params.sort, cursor: params.cursor },
      options
    );
  }

  /**
   * Search public Reddit posts across all subreddits by keyword.
   *
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param payload - The search request including query, and optional sort, timeframe and the cursor of the previous page.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of Reddit posts, or a metadata wrapper when opted in.
   */
  async redditSearch(
    payload: RedditSearchRequest,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<RedditPost[]>>;
  async redditSearch(
    payload: RedditSearchRequest,
    options?: DesearchDefaultRequestOptions
  ): Promise<RedditPost[]>;
  async redditSearch(
    payload: RedditSearchRequest,
    options: DesearchRequestOptions
  ): Promise<RedditPost[] | DesearchResponse<RedditPost[]>>;
  async redditSearch(
    payload: RedditSearchRequest,
    options?: DesearchRequestOptions
  ): Promise<RedditPost[] | DesearchResponse<RedditPost[]>> {
    return this.handleRequest<RedditPost[]>(
      'POST',
      '/desearch/reddit/search',
      payload,
      options
    );
  }

  /**
   * Retrieve public subreddit metadata: description, rules, weekly active users and contributions.
   *
   * The name is case-sensitive (`AskReddit`, not `askreddit`).
   *
   * @param params - Object containing the subreddit name without r/.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The subreddit, or a metadata wrapper when opted in.
   */
  async redditSubreddit(
    params: RedditSubredditParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<RedditSubreddit>>;
  async redditSubreddit(
    params: RedditSubredditParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<RedditSubreddit>;
  async redditSubreddit(
    params: RedditSubredditParams,
    options: DesearchRequestOptions
  ): Promise<RedditSubreddit | DesearchResponse<RedditSubreddit>>;
  async redditSubreddit(
    params: RedditSubredditParams,
    options?: DesearchRequestOptions
  ): Promise<RedditSubreddit | DesearchResponse<RedditSubreddit>> {
    return this.handleRequest<RedditSubreddit>(
      'GET',
      this.socialPath('/desearch/reddit/subreddit', params.name),
      undefined,
      options
    );
  }

  /**
   * Retrieve the public posts of a subreddit with Reddit's sort and time filters.
   *
   * `timeframe` applies to `top`; without a `sort` it means `top`.
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param params - Object containing the subreddit name, and optional sort, timeframe and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of Reddit posts, or a metadata wrapper when opted in.
   */
  async redditSubredditPosts(
    params: RedditSubredditPostsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<RedditPost[]>>;
  async redditSubredditPosts(
    params: RedditSubredditPostsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<RedditPost[]>;
  async redditSubredditPosts(
    params: RedditSubredditPostsParams,
    options: DesearchRequestOptions
  ): Promise<RedditPost[] | DesearchResponse<RedditPost[]>>;
  async redditSubredditPosts(
    params: RedditSubredditPostsParams,
    options?: DesearchRequestOptions
  ): Promise<RedditPost[] | DesearchResponse<RedditPost[]>> {
    return this.handleRequest<RedditPost[]>(
      'GET',
      this.socialPath('/desearch/reddit/subreddit', params.name, '/posts'),
      {
        sort: params.sort,
        timeframe: params.timeframe,
        cursor: params.cursor,
      },
      options
    );
  }

  /**
   * Retrieve a public Reddit post by ID or URL, without its comments.
   *
   * @param params - Object containing the post ID (with or without `t3_`) or its full URL (URL-encoded into the path).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The Reddit post, or a metadata wrapper when opted in.
   */
  async redditPostById(
    params: RedditPostByIdParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<RedditPost>>;
  async redditPostById(
    params: RedditPostByIdParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<RedditPost>;
  async redditPostById(
    params: RedditPostByIdParams,
    options: DesearchRequestOptions
  ): Promise<RedditPost | DesearchResponse<RedditPost>>;
  async redditPostById(
    params: RedditPostByIdParams,
    options?: DesearchRequestOptions
  ): Promise<RedditPost | DesearchResponse<RedditPost>> {
    return this.handleRequest<RedditPost>(
      'GET',
      this.socialPath('/desearch/reddit/post', params.id),
      undefined,
      options
    );
  }

  /**
   * Retrieve the public comments of a Reddit post as a tree: top-level comments with the replies Reddit loaded alongside them.
   *
   * Paginated: pass `{ includeMetadata: true }` and send `metadata.nextCursor` back as `cursor` with the same target to read the next page. A cursor is opaque and valid for 24 hours.
   *
   * @param params - Object containing the post ID or URL, and an optional cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata and `metadata.nextCursor`, the cursor for the next page (absent on the last page).
   * @returns An array of Reddit comments, or a metadata wrapper when opted in.
   */
  async redditComments(
    params: RedditCommentsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<RedditComment[]>>;
  async redditComments(
    params: RedditCommentsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<RedditComment[]>;
  async redditComments(
    params: RedditCommentsParams,
    options: DesearchRequestOptions
  ): Promise<RedditComment[] | DesearchResponse<RedditComment[]>>;
  async redditComments(
    params: RedditCommentsParams,
    options?: DesearchRequestOptions
  ): Promise<RedditComment[] | DesearchResponse<RedditComment[]>> {
    return this.handleRequest<RedditComment[]>(
      'GET',
      this.socialPath('/desearch/reddit/comments', params.post_id),
      { cursor: params.cursor },
      options
    );
  }

  /**
   * Search public Threads posts by keyword.
   *
   * Threads returns one page of posts per search and no further pages, so this method takes no cursor.
   *
   * @param payload - The search request including query and optional start_date and end_date (YYYY-MM-DD).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns An array of Threads posts, or a metadata wrapper when opted in.
   */
  async threadsSearch(
    payload: ThreadsSearchRequest,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<ThreadsPost[]>>;
  async threadsSearch(
    payload: ThreadsSearchRequest,
    options?: DesearchDefaultRequestOptions
  ): Promise<ThreadsPost[]>;
  async threadsSearch(
    payload: ThreadsSearchRequest,
    options: DesearchRequestOptions
  ): Promise<ThreadsPost[] | DesearchResponse<ThreadsPost[]>>;
  async threadsSearch(
    payload: ThreadsSearchRequest,
    options?: DesearchRequestOptions
  ): Promise<ThreadsPost[] | DesearchResponse<ThreadsPost[]>> {
    return this.handleRequest<ThreadsPost[]>(
      'POST',
      '/desearch/threads/search',
      payload,
      options
    );
  }

  /**
   * Search public Threads accounts by username or name. Not paginated.
   *
   * @param payload - The search request containing the username or name to search for.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns An array of Threads users, or a metadata wrapper when opted in.
   */
  async threadsSearchUsers(
    payload: ThreadsSearchUsersRequest,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<ThreadsUser[]>>;
  async threadsSearchUsers(
    payload: ThreadsSearchUsersRequest,
    options?: DesearchDefaultRequestOptions
  ): Promise<ThreadsUser[]>;
  async threadsSearchUsers(
    payload: ThreadsSearchUsersRequest,
    options: DesearchRequestOptions
  ): Promise<ThreadsUser[] | DesearchResponse<ThreadsUser[]>>;
  async threadsSearchUsers(
    payload: ThreadsSearchUsersRequest,
    options?: DesearchRequestOptions
  ): Promise<ThreadsUser[] | DesearchResponse<ThreadsUser[]>> {
    return this.handleRequest<ThreadsUser[]>(
      'POST',
      '/desearch/threads/search/users',
      payload,
      options
    );
  }

  /**
   * Retrieve a public Threads profile: bio, followers, verification and links.
   *
   * @param params - Object containing the Threads username without @.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The Threads profile, or a metadata wrapper when opted in.
   */
  async threadsProfile(
    params: ThreadsProfileParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<ThreadsProfile>>;
  async threadsProfile(
    params: ThreadsProfileParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<ThreadsProfile>;
  async threadsProfile(
    params: ThreadsProfileParams,
    options: DesearchRequestOptions
  ): Promise<ThreadsProfile | DesearchResponse<ThreadsProfile>>;
  async threadsProfile(
    params: ThreadsProfileParams,
    options?: DesearchRequestOptions
  ): Promise<ThreadsProfile | DesearchResponse<ThreadsProfile>> {
    return this.handleRequest<ThreadsProfile>(
      'GET',
      this.socialPath('/desearch/threads/profile', params.username),
      undefined,
      options
    );
  }

  /**
   * Retrieve a Threads account's latest public posts.
   *
   * Threads shows only the latest 20-30 posts publicly, so there are no further pages and no cursor.
   *
   * @param params - Object containing the Threads username without @.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns An array of Threads posts, or a metadata wrapper when opted in.
   */
  async threadsProfilePosts(
    params: ThreadsProfilePostsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<ThreadsPost[]>>;
  async threadsProfilePosts(
    params: ThreadsProfilePostsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<ThreadsPost[]>;
  async threadsProfilePosts(
    params: ThreadsProfilePostsParams,
    options: DesearchRequestOptions
  ): Promise<ThreadsPost[] | DesearchResponse<ThreadsPost[]>>;
  async threadsProfilePosts(
    params: ThreadsProfilePostsParams,
    options?: DesearchRequestOptions
  ): Promise<ThreadsPost[] | DesearchResponse<ThreadsPost[]>> {
    return this.handleRequest<ThreadsPost[]>(
      'GET',
      this.socialPath('/desearch/threads/profile', params.username, '/posts'),
      undefined,
      options
    );
  }

  /**
   * Retrieve a public Threads post by URL or shortcode, with the replies and thread continuation posts returned alongside it.
   *
   * @param params - Object containing the post URL or shortcode (URL-encoded into the path).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The Threads post with `comments` and `threadItems`, or a metadata wrapper when opted in.
   */
  async threadsPostById(
    params: ThreadsPostByIdParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<ThreadsPostDetail>>;
  async threadsPostById(
    params: ThreadsPostByIdParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<ThreadsPostDetail>;
  async threadsPostById(
    params: ThreadsPostByIdParams,
    options: DesearchRequestOptions
  ): Promise<ThreadsPostDetail | DesearchResponse<ThreadsPostDetail>>;
  async threadsPostById(
    params: ThreadsPostByIdParams,
    options?: DesearchRequestOptions
  ): Promise<ThreadsPostDetail | DesearchResponse<ThreadsPostDetail>> {
    return this.handleRequest<ThreadsPostDetail>(
      'GET',
      this.socialPath('/desearch/threads/post', params.id),
      undefined,
      options
    );
  }

  /**
   * Find X accounts by what they post and how they describe themselves (X Profile Search).
   *
   * Starts a background People Search task and returns it at once (HTTP 202). This is the only billed People Search call:
   * `count` profiles are reserved at the route price and the task settles to the profiles it delivers
   * (a minimum applies when it finds anyone; a search that finds no one is free).
   *
   * @param payload - The search request including query, count, min_score, exclude, metadata, and X-specific filters.
   * @param options - Optional SDK options. Set `idempotencyKey` to send an `Idempotency-Key` header, and `includeMetadata: true` to receive response cost metadata.
   * @returns The created task with the reserved cost, or a metadata wrapper when opted in.
   */
  async xProfileSearch(
    payload: XProfileSearchRequest,
    options: DesearchMetadataRequestOptions & PeopleSearchOptions
  ): Promise<DesearchResponse<PeopleSearchTask>>;
  async xProfileSearch(
    payload: XProfileSearchRequest,
    options?: DesearchDefaultRequestOptions & PeopleSearchOptions
  ): Promise<PeopleSearchTask>;
  async xProfileSearch(
    payload: XProfileSearchRequest,
    options: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<PeopleSearchTask | DesearchResponse<PeopleSearchTask>>;
  async xProfileSearch(
    payload: XProfileSearchRequest,
    options?: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<PeopleSearchTask | DesearchResponse<PeopleSearchTask>> {
    return this.peopleSearch('x', payload, options);
  }

  /**
   * Find YouTube creators by what their videos are about (YouTube Creator Search).
   *
   * Starts a background People Search task and returns it at once (HTTP 202). This is the only billed People Search call:
   * `count` profiles are reserved at the route price and the task settles to the profiles it delivers
   * (a minimum applies when it finds anyone; a search that finds no one is free).
   *
   * @param payload - The search request including query, count, min_score, exclude, metadata, and YouTube-specific filters.
   * @param options - Optional SDK options. Set `idempotencyKey` to send an `Idempotency-Key` header, and `includeMetadata: true` to receive response cost metadata.
   * @returns The created task with the reserved cost, or a metadata wrapper when opted in.
   */
  async youtubeCreatorSearch(
    payload: YouTubeCreatorSearchRequest,
    options: DesearchMetadataRequestOptions & PeopleSearchOptions
  ): Promise<DesearchResponse<PeopleSearchTask>>;
  async youtubeCreatorSearch(
    payload: YouTubeCreatorSearchRequest,
    options?: DesearchDefaultRequestOptions & PeopleSearchOptions
  ): Promise<PeopleSearchTask>;
  async youtubeCreatorSearch(
    payload: YouTubeCreatorSearchRequest,
    options: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<PeopleSearchTask | DesearchResponse<PeopleSearchTask>>;
  async youtubeCreatorSearch(
    payload: YouTubeCreatorSearchRequest,
    options?: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<PeopleSearchTask | DesearchResponse<PeopleSearchTask>> {
    return this.peopleSearch('youtube', payload, options);
  }

  /**
   * Find LinkedIn members by what they post and by their role (LinkedIn Profile Search).
   *
   * Starts a background People Search task and returns it at once (HTTP 202). This is the only billed People Search call:
   * `count` profiles are reserved at the route price and the task settles to the profiles it delivers
   * (a minimum applies when it finds anyone; a search that finds no one is free).
   *
   * @param payload - The search request including query, count, min_score, exclude, metadata, and LinkedIn-specific filters.
   * @param options - Optional SDK options. Set `idempotencyKey` to send an `Idempotency-Key` header, and `includeMetadata: true` to receive response cost metadata.
   * @returns The created task with the reserved cost, or a metadata wrapper when opted in.
   */
  async linkedinProfileSearch(
    payload: LinkedInProfileSearchRequest,
    options: DesearchMetadataRequestOptions & PeopleSearchOptions
  ): Promise<DesearchResponse<PeopleSearchTask>>;
  async linkedinProfileSearch(
    payload: LinkedInProfileSearchRequest,
    options?: DesearchDefaultRequestOptions & PeopleSearchOptions
  ): Promise<PeopleSearchTask>;
  async linkedinProfileSearch(
    payload: LinkedInProfileSearchRequest,
    options: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<PeopleSearchTask | DesearchResponse<PeopleSearchTask>>;
  async linkedinProfileSearch(
    payload: LinkedInProfileSearchRequest,
    options?: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<PeopleSearchTask | DesearchResponse<PeopleSearchTask>> {
    return this.peopleSearch('linkedin', payload, options);
  }

  /**
   * Find TikTok creators by what their videos are about (TikTok Creator Search).
   *
   * Starts a background People Search task and returns it at once (HTTP 202). This is the only billed People Search call:
   * `count` profiles are reserved at the route price and the task settles to the profiles it delivers
   * (a minimum applies when it finds anyone; a search that finds no one is free).
   *
   * @param payload - The search request including query, count, min_score, exclude, metadata, and TikTok-specific filters.
   * @param options - Optional SDK options. Set `idempotencyKey` to send an `Idempotency-Key` header, and `includeMetadata: true` to receive response cost metadata.
   * @returns The created task with the reserved cost, or a metadata wrapper when opted in.
   */
  async tiktokCreatorSearch(
    payload: TikTokCreatorSearchRequest,
    options: DesearchMetadataRequestOptions & PeopleSearchOptions
  ): Promise<DesearchResponse<PeopleSearchTask>>;
  async tiktokCreatorSearch(
    payload: TikTokCreatorSearchRequest,
    options?: DesearchDefaultRequestOptions & PeopleSearchOptions
  ): Promise<PeopleSearchTask>;
  async tiktokCreatorSearch(
    payload: TikTokCreatorSearchRequest,
    options: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<PeopleSearchTask | DesearchResponse<PeopleSearchTask>>;
  async tiktokCreatorSearch(
    payload: TikTokCreatorSearchRequest,
    options?: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<PeopleSearchTask | DesearchResponse<PeopleSearchTask>> {
    return this.peopleSearch('tiktok', payload, options);
  }

  /**
   * List your company's People Search tasks, newest first. Free.
   *
   * @param params - Optional platform, status (one status or an array, sent comma-separated), limit, cursor, and a `metadata` filter (sent as `metadata.<key>=<value>` query params; up to 3 exact-match pairs).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns A page of tasks with `next_cursor` for the next page, or a metadata wrapper when opted in.
   */
  async listPeopleTasks(
    params: ListPeopleTasksParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<PeopleTaskList>>;
  async listPeopleTasks(
    params?: ListPeopleTasksParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<PeopleTaskList>;
  async listPeopleTasks(
    params: ListPeopleTasksParams,
    options: DesearchRequestOptions
  ): Promise<PeopleTaskList | DesearchResponse<PeopleTaskList>>;
  async listPeopleTasks(
    params: ListPeopleTasksParams = {},
    options?: DesearchRequestOptions
  ): Promise<PeopleTaskList | DesearchResponse<PeopleTaskList>> {
    return this.handleRequest<PeopleTaskList>(
      'GET',
      '/desearch/people/tasks',
      this.taskListQuery(params),
      options
    );
  }

  /**
   * Get the status, progress, and cost of one People Search task. Free.
   *
   * @param params - Object containing the task ID. A task object returned by a search method works as is.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The task, or a metadata wrapper when opted in.
   */
  async getPeopleTask(
    params: PeopleTaskParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<PeopleTask>>;
  async getPeopleTask(
    params: PeopleTaskParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<PeopleTask>;
  async getPeopleTask(
    params: PeopleTaskParams,
    options: DesearchRequestOptions
  ): Promise<PeopleTask | DesearchResponse<PeopleTask>>;
  async getPeopleTask(
    params: PeopleTaskParams,
    options?: DesearchRequestOptions
  ): Promise<PeopleTask | DesearchResponse<PeopleTask>> {
    return this.handleRequest<PeopleTask>(
      'GET',
      this.peopleTaskPath(params),
      undefined,
      options
    );
  }

  /**
   * Read one page of a People Search task's qualified profiles, in the order they were found. Free.
   * Results arrive while the search is still running: keep `next_cursor` and call again to get only new profiles.
   *
   * @param params - Object containing the task ID and optional cursor and limit (1-500).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns A results page with `next_cursor` and `has_more`, or a metadata wrapper when opted in.
   */
  async getPeopleResults(
    params: GetPeopleResultsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<PeopleResultsPage>>;
  async getPeopleResults(
    params: GetPeopleResultsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<PeopleResultsPage>;
  async getPeopleResults(
    params: GetPeopleResultsParams,
    options: DesearchRequestOptions
  ): Promise<PeopleResultsPage | DesearchResponse<PeopleResultsPage>>;
  async getPeopleResults(
    params: GetPeopleResultsParams,
    options?: DesearchRequestOptions
  ): Promise<PeopleResultsPage | DesearchResponse<PeopleResultsPage>> {
    return this.handleRequest<PeopleResultsPage>(
      'GET',
      this.peopleTaskPath(params, '/results'),
      { cursor: params.cursor, limit: params.limit },
      options
    );
  }

  /**
   * Pause a People Search task. A queued search pauses at once; a running one finishes its current batch first
   * (status `pausing`, then `paused`). Free.
   *
   * @param params - Object containing the task ID.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The task, or a metadata wrapper when opted in.
   * @throws {PeopleTaskConflictError} When the task cannot be paused (HTTP 409); `error.task` is the current task.
   */
  async pausePeopleTask(
    params: PeopleTaskParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<PeopleTask>>;
  async pausePeopleTask(
    params: PeopleTaskParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<PeopleTask>;
  async pausePeopleTask(
    params: PeopleTaskParams,
    options: DesearchRequestOptions
  ): Promise<PeopleTask | DesearchResponse<PeopleTask>>;
  async pausePeopleTask(
    params: PeopleTaskParams,
    options?: DesearchRequestOptions
  ): Promise<PeopleTask | DesearchResponse<PeopleTask>> {
    return this.peopleTaskControl('pause', params, options);
  }

  /**
   * Resume a paused People Search task from where it stopped. It is not charged again. Free.
   *
   * @param params - Object containing the task ID.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The task, or a metadata wrapper when opted in.
   * @throws {PeopleTaskConflictError} When the task is not paused (HTTP 409); `error.task` is the current task.
   */
  async resumePeopleTask(
    params: PeopleTaskParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<PeopleTask>>;
  async resumePeopleTask(
    params: PeopleTaskParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<PeopleTask>;
  async resumePeopleTask(
    params: PeopleTaskParams,
    options: DesearchRequestOptions
  ): Promise<PeopleTask | DesearchResponse<PeopleTask>>;
  async resumePeopleTask(
    params: PeopleTaskParams,
    options?: DesearchRequestOptions
  ): Promise<PeopleTask | DesearchResponse<PeopleTask>> {
    return this.peopleTaskControl('resume', params, options);
  }

  /**
   * Cancel a People Search task. You pay only for the profiles it delivered; the rest of the reservation is returned. Free.
   *
   * @param params - Object containing the task ID.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The task, or a metadata wrapper when opted in.
   * @throws {PeopleTaskConflictError} When the task has already ended (HTTP 409); `error.task` is the current task.
   */
  async cancelPeopleTask(
    params: PeopleTaskParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<PeopleTask>>;
  async cancelPeopleTask(
    params: PeopleTaskParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<PeopleTask>;
  async cancelPeopleTask(
    params: PeopleTaskParams,
    options: DesearchRequestOptions
  ): Promise<PeopleTask | DesearchResponse<PeopleTask>>;
  async cancelPeopleTask(
    params: PeopleTaskParams,
    options?: DesearchRequestOptions
  ): Promise<PeopleTask | DesearchResponse<PeopleTask>> {
    return this.peopleTaskControl('cancel', params, options);
  }

  /**
   * Download every profile a People Search task found so far as CSV or JSON Lines. Free.
   *
   * @param params - Object containing the task ID, optional format (csv or jsonl), and optional result filters (`has`, `min_audience`, `max_audience`, `min_score`, `location`, `verified`).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The file content as a string, or a metadata wrapper when opted in.
   */
  async exportPeopleResults(
    params: ExportPeopleResultsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<string>>;
  async exportPeopleResults(
    params: ExportPeopleResultsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<string>;
  async exportPeopleResults(
    params: ExportPeopleResultsParams,
    options: DesearchRequestOptions
  ): Promise<string | DesearchResponse<string>>;
  async exportPeopleResults(
    params: ExportPeopleResultsParams,
    options?: DesearchRequestOptions
  ): Promise<string | DesearchResponse<string>> {
    return this.handleRequest<string>(
      'GET',
      this.peopleTaskPath(params, '/export'),
      this.taskQuery(params),
      options
    );
  }

  /**
   * List everyone your searches on one platform found, one entry per person with the search behind it. Free.
   *
   * @param params - Object containing the platform and optional q, sort (score, recent, audience), limit, cursor, and result filters.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns A page of profiles with `total` and `next_cursor`, or a metadata wrapper when opted in.
   */
  async listPeopleProfiles(
    params: ListPeopleProfilesParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<PeopleProfilesPage>>;
  async listPeopleProfiles(
    params: ListPeopleProfilesParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<PeopleProfilesPage>;
  async listPeopleProfiles(
    params: ListPeopleProfilesParams,
    options: DesearchRequestOptions
  ): Promise<PeopleProfilesPage | DesearchResponse<PeopleProfilesPage>>;
  async listPeopleProfiles(
    params: ListPeopleProfilesParams,
    options?: DesearchRequestOptions
  ): Promise<PeopleProfilesPage | DesearchResponse<PeopleProfilesPage>> {
    return this.handleRequest<PeopleProfilesPage>(
      'GET',
      '/desearch/people/profiles',
      this.taskQuery(params),
      options
    );
  }

  /**
   * Download everyone `listPeopleProfiles` lists for the same platform, search, and filters as CSV or JSON Lines. Free.
   *
   * @param params - Object containing the platform and optional format (csv or jsonl), q, sort, and result filters.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The file content as a string, or a metadata wrapper when opted in.
   */
  async exportPeopleProfiles(
    params: ExportPeopleProfilesParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<string>>;
  async exportPeopleProfiles(
    params: ExportPeopleProfilesParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<string>;
  async exportPeopleProfiles(
    params: ExportPeopleProfilesParams,
    options: DesearchRequestOptions
  ): Promise<string | DesearchResponse<string>>;
  async exportPeopleProfiles(
    params: ExportPeopleProfilesParams,
    options?: DesearchRequestOptions
  ): Promise<string | DesearchResponse<string>> {
    return this.handleRequest<string>(
      'GET',
      '/desearch/people/profiles/export',
      this.taskQuery(params),
      options
    );
  }

  /**
   * Poll a People Search task until it ends (completed, partial, failed, cancelled, or expired).
   * A paused task is not ended, so waiting on one runs until the timeout. Polling is free.
   *
   * @param params - Object containing the task ID. A task object returned by a search method works as is.
   * @param options - Optional poll interval (default 5000 ms), timeout (default 600000 ms), and `onProgress` callback.
   * @returns The ended task.
   * @throws Error when the task has not ended before the timeout, or when a poll request fails.
   */
  async waitForPeopleTask(
    params: PeopleTaskParams,
    options: WaitForPeopleTaskOptions = {}
  ): Promise<PeopleTask> {
    return this.pollTask(
      'People Search',
      params.task_id,
      () => this.getPeopleTask({ task_id: params.task_id }),
      options
    );
  }

  /**
   * Iterate over every People Search results page available now, following `next_cursor` until `has_more` is false.
   * Use it after `waitForPeopleTask` to read all results; keep the last page's `next_cursor` to read only new results later.
   *
   * @param params - Object containing the task ID and optional starting cursor and page size (1-500).
   * @returns An async iterator of results pages.
   */
  async *iterPeopleResultPages(
    params: GetPeopleResultsParams
  ): AsyncGenerator<PeopleResultsPage, void, undefined> {
    let cursor = params.cursor ?? undefined;

    for (;;) {
      const page = await this.getPeopleResults({
        task_id: params.task_id,
        cursor,
        limit: params.limit,
      });
      yield page;
      if (!page.has_more || page.next_cursor === cursor) {
        return;
      }
      cursor = page.next_cursor;
    }
  }

  /**
   * Get the latest public Desearch network counters and their per-second growth rates. Free; no API key is needed, and the SDK sends none.
   *
   * The current source is an estimate (`telemetry_kind`).
   *
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The network stats snapshot, or a metadata wrapper when opted in.
   */
  async networkStats(
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<NetworkStatsResponse>>;
  async networkStats(
    options?: DesearchDefaultRequestOptions
  ): Promise<NetworkStatsResponse>;
  async networkStats(
    options: DesearchRequestOptions
  ): Promise<NetworkStatsResponse | DesearchResponse<NetworkStatsResponse>>;
  async networkStats(
    options?: DesearchRequestOptions
  ): Promise<NetworkStatsResponse | DesearchResponse<NetworkStatsResponse>> {
    return this.handleRequest<NetworkStatsResponse>(
      'GET',
      '/network/stats',
      undefined,
      options,
      { omitApiKey: true }
    );
  }

  /**
   * Get the latest 20 minutes of network stats, one point per second. Free; no API key is needed, and the SDK sends none.
   *
   * Use it to fill a recent activity buffer before following `streamNetworkStats`.
   *
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The network stats timeline, or a metadata wrapper when opted in.
   */
  async networkStatsHistory(
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<NetworkStatsHistoryResponse>>;
  async networkStatsHistory(
    options?: DesearchDefaultRequestOptions
  ): Promise<NetworkStatsHistoryResponse>;
  async networkStatsHistory(
    options: DesearchRequestOptions
  ): Promise<
    NetworkStatsHistoryResponse | DesearchResponse<NetworkStatsHistoryResponse>
  >;
  async networkStatsHistory(
    options?: DesearchRequestOptions
  ): Promise<
    NetworkStatsHistoryResponse | DesearchResponse<NetworkStatsHistoryResponse>
  > {
    return this.handleRequest<NetworkStatsHistoryResponse>(
      'GET',
      '/network/stats/history',
      undefined,
      options,
      { omitApiKey: true }
    );
  }

  /**
   * Follow the live network stats: one snapshot per second over Server-Sent Events. Free; no API key is needed, and the SDK sends none.
   *
   * Returns an async iterator. Each item is a `stats` event: its `data` has the same shape as `networkStats()`.
   * The stream runs until you `break` out of the loop (which closes the connection), `options.signal` aborts
   * (the loop then ends without an error), or the server closes it. It does not reconnect by itself: call it
   * again with `lastEventId` set to the last event's `id` to replay what you missed (up to 20 minutes) and continue.
   *
   * @param options - Optional `lastEventId` (sent as the `Last-Event-ID` header) and an AbortSignal.
   * @returns An async iterator of network stats events.
   * @throws Error `HTTP <status>: <body>` when the API refuses the stream, or `Unexpected Error: <message>` when the connection or an event's JSON fails.
   */
  async *streamNetworkStats(
    options: StreamNetworkStatsOptions = {}
  ): AsyncGenerator<NetworkStatsStreamEvent, void, undefined> {
    const { lastEventId, signal } = options;
    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    if (
      lastEventId !== undefined &&
      lastEventId !== null &&
      `${lastEventId}` !== ''
    ) {
      headers['Last-Event-ID'] = String(lastEventId);
    }

    let response;
    try {
      response = await fetch(`${this.baseURL}/network/stats/stream`, {
        method: 'GET',
        headers,
        signal,
      });
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      throw unexpectedError(error);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch((error: unknown) => {
        throw unexpectedError(error);
      });
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }
    if (!response.body) {
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = new SseParser();
    try {
      for (;;) {
        let chunk;
        try {
          chunk = await reader.read();
        } catch (error) {
          if (signal?.aborted) {
            return;
          }
          throw unexpectedError(error);
        }

        const events: SseEvent[] = chunk.done
          ? [...parser.push(decoder.decode()), ...parser.end()]
          : parser.push(decoder.decode(chunk.value, { stream: true }));
        for (const event of events) {
          if (event.event !== 'stats') {
            continue;
          }
          let data: NetworkStatsResponse;
          try {
            data = JSON.parse(event.data) as NetworkStatsResponse;
          } catch (error) {
            throw unexpectedError(error);
          }
          yield { id: event.id, data };
        }
        if (chunk.done) {
          return;
        }
      }
    } finally {
      // Closes the connection when the caller stops early; a no-op once the stream has ended.
      await reader.cancel().catch(() => undefined);
    }
  }

  /**
   * Find companies from a description and collect each one's public contact data (Company Search).
   *
   * Starts a background task and returns it at once (HTTP 202). The search looks for the companies' websites, reads each
   * homepage and scores how well the company fits, then reads its contact, about, team and imprint pages for emails, phones
   * and social profiles, finds its leaders (`roles`: CEO, founders, CTO and CFO by default) with their LinkedIn profiles,
   * infers their emails from the company's address pattern and checks every email. Every contact keeps the page it came
   * from (`source_url`).
   *
   * Billed: `count` companies are reserved at the route price and the task settles to the companies it delivers
   * (a minimum of 1 when it delivers any; a task that delivers none is free). Such a search stops once it costs more
   * than the companies it found pay for (`completion_reason` `cost_limit`). With `max_cost_usd`, the whole budget is
   * reserved, the search goes on until it delivers `count` or spends the budget, and its search effort is billed where
   * the companies delivered do not cover it, up to the budget, even when it finds few or none.
   *
   * `continue_from` takes the `task_id` of an ended Company Search of yours: the new search leaves out every company
   * that one excluded, delivered or held for review. While that task is running or paused the API answers 409, a plain
   * `HTTP 409` error (not `CompanyTaskConflictError`).
   *
   * @param payload - The search request including query, count, min_score, exclude, roles, infer_emails, verify_emails, filters (countries, require), max_cost_usd, continue_from and metadata.
   * @param options - Optional SDK options. Set `idempotencyKey` to send an `Idempotency-Key` header, and `includeMetadata: true` to receive response cost metadata.
   * @returns The created task with the reserved cost, or a metadata wrapper when opted in.
   */
  async companySearch(
    payload: CompanySearchRequest,
    options: DesearchMetadataRequestOptions & PeopleSearchOptions
  ): Promise<DesearchResponse<CompanySearchTask>>;
  async companySearch(
    payload: CompanySearchRequest,
    options?: DesearchDefaultRequestOptions & PeopleSearchOptions
  ): Promise<CompanySearchTask>;
  async companySearch(
    payload: CompanySearchRequest,
    options: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<CompanySearchTask | DesearchResponse<CompanySearchTask>>;
  async companySearch(
    payload: CompanySearchRequest,
    options?: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<CompanySearchTask | DesearchResponse<CompanySearchTask>> {
    return this.createTask<CompanySearchTask>(
      '/desearch/companies/search',
      payload,
      options
    );
  }

  /**
   * Collect public contact data for companies you already know, by domain (Company Enrich).
   *
   * Starts a background task and returns it at once (HTTP 202). Send up to 200 domains or URLs; each is reduced to its host
   * without `www.`, lowercased and deduplicated, and the task's `count` is the number left. You get one company per domain,
   * with the same fields as Company Search but no fit score (`score` is null).
   *
   * Billed: one company is reserved per domain you send, at the route price, and the task settles to the companies it
   * delivers (a minimum of 1); the rest of the reservation, including duplicate domains, is returned.
   *
   * @param payload - The enrich request including domains, roles, infer_emails, verify_emails and metadata.
   * @param options - Optional SDK options. Set `idempotencyKey` to send an `Idempotency-Key` header, and `includeMetadata: true` to receive response cost metadata.
   * @returns The created task with the reserved cost, or a metadata wrapper when opted in.
   */
  async companyEnrich(
    payload: CompanyEnrichRequest,
    options: DesearchMetadataRequestOptions & PeopleSearchOptions
  ): Promise<DesearchResponse<CompanySearchTask>>;
  async companyEnrich(
    payload: CompanyEnrichRequest,
    options?: DesearchDefaultRequestOptions & PeopleSearchOptions
  ): Promise<CompanySearchTask>;
  async companyEnrich(
    payload: CompanyEnrichRequest,
    options: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<CompanySearchTask | DesearchResponse<CompanySearchTask>>;
  async companyEnrich(
    payload: CompanyEnrichRequest,
    options?: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<CompanySearchTask | DesearchResponse<CompanySearchTask>> {
    return this.createTask<CompanySearchTask>(
      '/desearch/companies/enrich',
      payload,
      options
    );
  }

  /**
   * List your company's Company Search and Company Enrich tasks, newest first. People Search tasks are not listed. Free.
   *
   * @param params - Optional type (`search` or `enrich`), status (one status or an array, sent comma-separated), limit, cursor, and a `metadata` filter (sent as `metadata.<key>=<value>` query params; up to 3 exact-match pairs).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns A page of tasks with `next_cursor` for the next page, or a metadata wrapper when opted in.
   */
  async listCompanyTasks(
    params: ListCompanyTasksParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<CompanyTaskList>>;
  async listCompanyTasks(
    params?: ListCompanyTasksParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<CompanyTaskList>;
  async listCompanyTasks(
    params: ListCompanyTasksParams,
    options: DesearchRequestOptions
  ): Promise<CompanyTaskList | DesearchResponse<CompanyTaskList>>;
  async listCompanyTasks(
    params: ListCompanyTasksParams = {},
    options?: DesearchRequestOptions
  ): Promise<CompanyTaskList | DesearchResponse<CompanyTaskList>> {
    return this.handleRequest<CompanyTaskList>(
      'GET',
      '/desearch/companies/tasks',
      this.taskListQuery(params),
      options
    );
  }

  /**
   * Get the status, progress, and cost of one Company Search or Company Enrich task. Free.
   * `stage` is `enriching` once every company is published and only later stages of some of them are left.
   *
   * @param params - Object containing the task ID. A task object returned by `companySearch` or `companyEnrich` works as is.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The task, or a metadata wrapper when opted in.
   */
  async getCompanyTask(
    params: CompanyTaskParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<CompanyTask>>;
  async getCompanyTask(
    params: CompanyTaskParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<CompanyTask>;
  async getCompanyTask(
    params: CompanyTaskParams,
    options: DesearchRequestOptions
  ): Promise<CompanyTask | DesearchResponse<CompanyTask>>;
  async getCompanyTask(
    params: CompanyTaskParams,
    options?: DesearchRequestOptions
  ): Promise<CompanyTask | DesearchResponse<CompanyTask>> {
    return this.handleRequest<CompanyTask>(
      'GET',
      this.companyTaskPath(params),
      undefined,
      options
    );
  }

  /**
   * Read one page of the companies a task delivered so far, in the order they were found. Free.
   * They arrive while the task is still running and are filled in place by the later stages (`enrichment.status` `partial`,
   * then `complete`): keep `next_cursor` and call again to get only new companies, or call without `cursor` to read every
   * company in its latest version. The API answers 410 once the results have expired (30 days after the task ended).
   *
   * @param params - Object containing the task ID and optional cursor and limit (1-500).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns A results page with `next_cursor` and `has_more`, or a metadata wrapper when opted in.
   */
  async getCompanyResults(
    params: GetCompanyResultsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<CompanyResultsPage>>;
  async getCompanyResults(
    params: GetCompanyResultsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<CompanyResultsPage>;
  async getCompanyResults(
    params: GetCompanyResultsParams,
    options: DesearchRequestOptions
  ): Promise<CompanyResultsPage | DesearchResponse<CompanyResultsPage>>;
  async getCompanyResults(
    params: GetCompanyResultsParams,
    options?: DesearchRequestOptions
  ): Promise<CompanyResultsPage | DesearchResponse<CompanyResultsPage>> {
    return this.handleRequest<CompanyResultsPage>(
      'GET',
      this.companyTaskPath(params, '/results'),
      { cursor: params.cursor, limit: params.limit },
      options
    );
  }

  /**
   * Pause a Company Search or Company Enrich task. A queued task pauses at once; a running one finishes its current batch
   * first (status `pausing`, then `paused`). Companies delivered so far stay available. A task paused for more than 7 days
   * is cancelled. Free.
   *
   * @param params - Object containing the task ID.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The task, or a metadata wrapper when opted in.
   * @throws {CompanyTaskConflictError} When the task cannot be paused (HTTP 409); `error.task` is the current task.
   */
  async pauseCompanyTask(
    params: CompanyTaskParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<CompanyTask>>;
  async pauseCompanyTask(
    params: CompanyTaskParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<CompanyTask>;
  async pauseCompanyTask(
    params: CompanyTaskParams,
    options: DesearchRequestOptions
  ): Promise<CompanyTask | DesearchResponse<CompanyTask>>;
  async pauseCompanyTask(
    params: CompanyTaskParams,
    options?: DesearchRequestOptions
  ): Promise<CompanyTask | DesearchResponse<CompanyTask>> {
    return this.companyTaskControl('pause', params, options);
  }

  /**
   * Resume a paused Company Search or Company Enrich task from where it stopped. It is not charged again. Free.
   *
   * @param params - Object containing the task ID.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The task, or a metadata wrapper when opted in.
   * @throws {CompanyTaskConflictError} When the task is not paused (HTTP 409); `error.task` is the current task.
   */
  async resumeCompanyTask(
    params: CompanyTaskParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<CompanyTask>>;
  async resumeCompanyTask(
    params: CompanyTaskParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<CompanyTask>;
  async resumeCompanyTask(
    params: CompanyTaskParams,
    options: DesearchRequestOptions
  ): Promise<CompanyTask | DesearchResponse<CompanyTask>>;
  async resumeCompanyTask(
    params: CompanyTaskParams,
    options?: DesearchRequestOptions
  ): Promise<CompanyTask | DesearchResponse<CompanyTask>> {
    return this.companyTaskControl('resume', params, options);
  }

  /**
   * Cancel a Company Search or Company Enrich task. You pay only for the companies it delivered (a task cancelled before it
   * starts costs nothing); the rest of the reservation is returned. Companies delivered so far stay available for 30 days. Free.
   *
   * @param params - Object containing the task ID.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The task, or a metadata wrapper when opted in.
   * @throws {CompanyTaskConflictError} When the task has already ended (HTTP 409); `error.task` is the current task.
   */
  async cancelCompanyTask(
    params: CompanyTaskParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<CompanyTask>>;
  async cancelCompanyTask(
    params: CompanyTaskParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<CompanyTask>;
  async cancelCompanyTask(
    params: CompanyTaskParams,
    options: DesearchRequestOptions
  ): Promise<CompanyTask | DesearchResponse<CompanyTask>>;
  async cancelCompanyTask(
    params: CompanyTaskParams,
    options?: DesearchRequestOptions
  ): Promise<CompanyTask | DesearchResponse<CompanyTask>> {
    return this.companyTaskControl('cancel', params, options);
  }

  /**
   * Download every company a task delivered so far as CSV or JSON Lines. Free.
   * CSV has one row per company: its domain, name, fit score, location, primary email, emails, phones and social profiles,
   * then the CEO (or managing director), founder, CTO and CFO with their title, email, email status and LinkedIn profile,
   * and `fully_verified`, `unverified_criteria` and `enrichment_status`. JSON Lines has one company per line with every field.
   * Fields the later stages have not filled in yet are empty.
   *
   * @param params - Object containing the task ID and optional format (csv or jsonl, default csv).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The file content as a string, or a metadata wrapper when opted in.
   */
  async exportCompanyResults(
    params: ExportCompanyResultsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<string>>;
  async exportCompanyResults(
    params: ExportCompanyResultsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<string>;
  async exportCompanyResults(
    params: ExportCompanyResultsParams,
    options: DesearchRequestOptions
  ): Promise<string | DesearchResponse<string>>;
  async exportCompanyResults(
    params: ExportCompanyResultsParams,
    options?: DesearchRequestOptions
  ): Promise<string | DesearchResponse<string>> {
    return this.handleRequest<string>(
      'GET',
      this.companyTaskPath(params, '/export'),
      { format: params.format },
      options
    );
  }

  /**
   * Poll a Company Search or Company Enrich task until it ends (completed, partial, failed, cancelled, or expired).
   * A paused task is not ended, so waiting on one runs until the timeout. Polling is free.
   *
   * @param params - Object containing the task ID. A task object returned by `companySearch` or `companyEnrich` works as is.
   * @param options - Optional poll interval (default 5000 ms), timeout (default 600000 ms), and `onProgress` callback.
   * @returns The ended task.
   * @throws Error when the task has not ended before the timeout, or when a poll request fails.
   */
  async waitForCompanyTask(
    params: CompanyTaskParams,
    options: WaitForCompanyTaskOptions = {}
  ): Promise<CompanyTask> {
    return this.pollTask(
      'Company Search',
      params.task_id,
      () => this.getCompanyTask({ task_id: params.task_id }),
      options
    );
  }

  /**
   * Iterate over every company a task delivered so far, following `next_cursor` page by page until `has_more` is false.
   * Use it after `waitForCompanyTask` to read every company in its final version. On a running task, companies can still be
   * `partial` (later stages fill them in); call `getCompanyResults` without `cursor` to read their latest version.
   *
   * @param params - Object containing the task ID and optional starting cursor and page size (1-500).
   * @returns An async iterator of companies, in the order they were found.
   */
  async *iterCompanyResults(
    params: GetCompanyResultsParams
  ): AsyncGenerator<Company, void, undefined> {
    let cursor = params.cursor ?? undefined;

    for (;;) {
      const page = await this.getCompanyResults({
        task_id: params.task_id,
        cursor,
        limit: params.limit,
      });
      yield* page.results;
      if (
        !page.has_more ||
        page.results.length === 0 ||
        page.next_cursor === cursor
      ) {
        return;
      }
      cursor = page.next_cursor;
    }
  }

  /**
   * Create a monitor: a search that runs on a schedule (`interval`, 1h to 7d) and keeps only what is new since its last run.
   *
   * Each run searches its `sources` from where the previous run ended, drops everything the monitor has already seen,
   * screens the rest with an AI classifier (relevant, new information, and one question per criterion; `score` is the lowest of
   * these, kept at `min_score`) and sends what it keeps to the `webhook`. With `run_now` (the default) the first run is
   * queued at once.
   *
   * Creating a monitor is free. Each run is billed: its searches at their list price (TikTok, Instagram, Facebook and
   * Meta ads per read: one per watched account, hashtag, page, keyword search or Ad Library page, whatever the number of
   * posts), screening per item, and the summary's LLM usage + 50% with `summary: true`. A run holds `max_run_cost_usd` on the balance while it runs.
   *
   * @param payload - The monitor: query (required), name, criteria, sources, interval, options, min_score, summary, webhook, metadata and run_now.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The monitor (HTTP 201). With a webhook it carries `webhook_secret`, returned only here and by `rotateMonitorWebhookSecret`.
   * @throws Error `HTTP 402` when the balance cannot hold one run, `HTTP 409` when the account already has 25 monitors,
   * `HTTP 422` for an invalid field, including an `instagram` source without `options.instagram.accounts` or
   * `options.instagram.hashtags`, or a `facebook` source without `options.facebook.pages`.
   */
  async createMonitor(
    payload: MonitorCreateRequest,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<MonitorCreated>>;
  async createMonitor(
    payload: MonitorCreateRequest,
    options?: DesearchDefaultRequestOptions
  ): Promise<MonitorCreated>;
  async createMonitor(
    payload: MonitorCreateRequest,
    options: DesearchRequestOptions
  ): Promise<MonitorCreated | DesearchResponse<MonitorCreated>>;
  async createMonitor(
    payload: MonitorCreateRequest,
    options?: DesearchRequestOptions
  ): Promise<MonitorCreated | DesearchResponse<MonitorCreated>> {
    return this.handleRequest<MonitorCreated>(
      'POST',
      '/desearch/monitors',
      payload,
      options
    );
  }

  /**
   * The most one run of a monitor with these settings can cost, and the most it can cost in 30 days at its interval. Free.
   *
   * @param payload - Optional sources, options, summary and interval, with the same defaults as `createMonitor`.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns `max_run_cost_usd`, `runs_per_month`, `max_monthly_cost_usd` and a per-part `breakdown`, or a metadata wrapper when opted in.
   */
  async estimateMonitor(
    payload: MonitorEstimateRequest,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<MonitorEstimate>>;
  async estimateMonitor(
    payload?: MonitorEstimateRequest,
    options?: DesearchDefaultRequestOptions
  ): Promise<MonitorEstimate>;
  async estimateMonitor(
    payload: MonitorEstimateRequest,
    options: DesearchRequestOptions
  ): Promise<MonitorEstimate | DesearchResponse<MonitorEstimate>>;
  async estimateMonitor(
    payload: MonitorEstimateRequest = {},
    options?: DesearchRequestOptions
  ): Promise<MonitorEstimate | DesearchResponse<MonitorEstimate>> {
    return this.handleRequest<MonitorEstimate>(
      'POST',
      '/desearch/monitors/estimate',
      payload,
      options
    );
  }

  /**
   * List your monitors, newest first. Free.
   *
   * @param params - Optional status (`active` or `paused`, or both as an array, sent comma-separated), limit (1-100) and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns A page of monitors with `next_cursor` for the next page, or a metadata wrapper when opted in.
   */
  async listMonitors(
    params: ListMonitorsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<MonitorList>>;
  async listMonitors(
    params?: ListMonitorsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<MonitorList>;
  async listMonitors(
    params: ListMonitorsParams,
    options: DesearchRequestOptions
  ): Promise<MonitorList | DesearchResponse<MonitorList>>;
  async listMonitors(
    params: ListMonitorsParams = {},
    options?: DesearchRequestOptions
  ): Promise<MonitorList | DesearchResponse<MonitorList>> {
    return this.handleRequest<MonitorList>(
      'GET',
      '/desearch/monitors',
      this.taskQuery({
        status: params.status,
        limit: params.limit,
        cursor: params.cursor,
      }),
      options
    );
  }

  /**
   * Get a monitor's settings, status, last run and totals. Free.
   *
   * @param params - Object containing the monitor ID. A monitor object works as is.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The monitor, or a metadata wrapper when opted in.
   */
  async getMonitor(
    params: MonitorParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<Monitor>>;
  async getMonitor(
    params: MonitorParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<Monitor>;
  async getMonitor(
    params: MonitorParams,
    options: DesearchRequestOptions
  ): Promise<Monitor | DesearchResponse<Monitor>>;
  async getMonitor(
    params: MonitorParams,
    options?: DesearchRequestOptions
  ): Promise<Monitor | DesearchResponse<Monitor>> {
    return this.handleRequest<Monitor>(
      'GET',
      this.monitorPath(params),
      undefined,
      options
    );
  }

  /**
   * Change a monitor's settings. Send only the fields that change. `status: 'paused'` stops scheduled runs (a manual
   * trigger still works); `status: 'active'` resumes them, also after a pause for credits or a failing webhook.
   * `webhook: null` removes the webhook. Free.
   *
   * @param params - Object containing the monitor ID. A monitor object works as is; only `monitor_id` is read from it.
   * @param fields - The fields to change: query, name, criteria, sources, interval, options, min_score, summary, status, webhook and metadata.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The monitor after the change, or a metadata wrapper when opted in.
   * @throws Error `HTTP 422` for an invalid field, or when the monitor as changed has an `instagram` source without accounts or
   * hashtags, or a `facebook` source without pages.
   */
  async updateMonitor(
    params: MonitorParams,
    fields: MonitorUpdateRequest,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<Monitor>>;
  async updateMonitor(
    params: MonitorParams,
    fields: MonitorUpdateRequest,
    options?: DesearchDefaultRequestOptions
  ): Promise<Monitor>;
  async updateMonitor(
    params: MonitorParams,
    fields: MonitorUpdateRequest,
    options: DesearchRequestOptions
  ): Promise<Monitor | DesearchResponse<Monitor>>;
  async updateMonitor(
    params: MonitorParams,
    fields: MonitorUpdateRequest,
    options?: DesearchRequestOptions
  ): Promise<Monitor | DesearchResponse<Monitor>> {
    return this.handleRequest<Monitor>(
      'PATCH',
      this.monitorPath(params),
      fields,
      options
    );
  }

  /**
   * Delete a monitor for good. A queued run is cancelled and its hold released. Free.
   *
   * @param params - Object containing the monitor ID. A monitor object works as is.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns `{ monitor_id, deleted: true }`, or a metadata wrapper when opted in.
   */
  async deleteMonitor(
    params: MonitorParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<MonitorDeleted>>;
  async deleteMonitor(
    params: MonitorParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<MonitorDeleted>;
  async deleteMonitor(
    params: MonitorParams,
    options: DesearchRequestOptions
  ): Promise<MonitorDeleted | DesearchResponse<MonitorDeleted>>;
  async deleteMonitor(
    params: MonitorParams,
    options?: DesearchRequestOptions
  ): Promise<MonitorDeleted | DesearchResponse<MonitorDeleted>> {
    return this.handleRequest<MonitorDeleted>(
      'DELETE',
      this.monitorPath(params),
      undefined,
      options
    );
  }

  /**
   * Queue a run now, whatever the schedule and also when the monitor is paused. It searches from where the last completed
   * run ended and is billed like a scheduled run.
   *
   * @param params - Object containing the monitor ID. A monitor object works as is.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The queued run (HTTP 202); read it later with `getMonitorRun`.
   * @throws Error `HTTP 409` when a run is already queued or running, `HTTP 402` when the balance cannot hold one run.
   */
  async triggerMonitor(
    params: MonitorParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<MonitorRun>>;
  async triggerMonitor(
    params: MonitorParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<MonitorRun>;
  async triggerMonitor(
    params: MonitorParams,
    options: DesearchRequestOptions
  ): Promise<MonitorRun | DesearchResponse<MonitorRun>>;
  async triggerMonitor(
    params: MonitorParams,
    options?: DesearchRequestOptions
  ): Promise<MonitorRun | DesearchResponse<MonitorRun>> {
    return this.handleRequest<MonitorRun>(
      'POST',
      this.monitorPath(params, '/trigger'),
      undefined,
      options
    );
  }

  /**
   * List a monitor's runs, newest first, with what each source returned, how many items were new and kept, and the cost. Free.
   *
   * @param params - Object containing the monitor ID and optional limit (1-100) and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns A page of runs with `next_cursor` for the next page, or a metadata wrapper when opted in.
   */
  async listMonitorRuns(
    params: ListMonitorRunsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<MonitorRunList>>;
  async listMonitorRuns(
    params: ListMonitorRunsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<MonitorRunList>;
  async listMonitorRuns(
    params: ListMonitorRunsParams,
    options: DesearchRequestOptions
  ): Promise<MonitorRunList | DesearchResponse<MonitorRunList>>;
  async listMonitorRuns(
    params: ListMonitorRunsParams,
    options?: DesearchRequestOptions
  ): Promise<MonitorRunList | DesearchResponse<MonitorRunList>> {
    return this.handleRequest<MonitorRunList>(
      'GET',
      this.monitorPath(params, '/runs'),
      { limit: params.limit, cursor: params.cursor },
      options
    );
  }

  /**
   * Get one run with the items it kept, most relevant first. Free.
   *
   * @param params - Object containing the monitor ID and run ID. A run object works as is.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns The run with its `items`, or a metadata wrapper when opted in.
   */
  async getMonitorRun(
    params: MonitorRunParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<MonitorRunWithItems>>;
  async getMonitorRun(
    params: MonitorRunParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<MonitorRunWithItems>;
  async getMonitorRun(
    params: MonitorRunParams,
    options: DesearchRequestOptions
  ): Promise<MonitorRunWithItems | DesearchResponse<MonitorRunWithItems>>;
  async getMonitorRun(
    params: MonitorRunParams,
    options?: DesearchRequestOptions
  ): Promise<MonitorRunWithItems | DesearchResponse<MonitorRunWithItems>> {
    return this.handleRequest<MonitorRunWithItems>(
      'GET',
      this.monitorPath(params, `/runs/${encodeURIComponent(params.run_id)}`),
      undefined,
      options
    );
  }

  /**
   * List everything a monitor kept, newest first, across all its runs. Free.
   *
   * @param params - Object containing the monitor ID and optional source, limit (1-200) and cursor.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns A page of items with `next_cursor` for the next page, or a metadata wrapper when opted in.
   */
  async listMonitorItems(
    params: ListMonitorItemsParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<MonitorItemList>>;
  async listMonitorItems(
    params: ListMonitorItemsParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<MonitorItemList>;
  async listMonitorItems(
    params: ListMonitorItemsParams,
    options: DesearchRequestOptions
  ): Promise<MonitorItemList | DesearchResponse<MonitorItemList>>;
  async listMonitorItems(
    params: ListMonitorItemsParams,
    options?: DesearchRequestOptions
  ): Promise<MonitorItemList | DesearchResponse<MonitorItemList>> {
    return this.handleRequest<MonitorItemList>(
      'GET',
      this.monitorPath(params, '/items'),
      { source: params.source, limit: params.limit, cursor: params.cursor },
      options
    );
  }

  /**
   * Send a signed `monitor.test` event with one sample item to the monitor's webhook and report what your endpoint answered. Free.
   *
   * @param params - Object containing the monitor ID. A monitor object works as is.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns `{ delivered, status_code, error, duration_ms }`; `delivered` means a 2xx. Or a metadata wrapper when opted in.
   * @throws Error `HTTP 400` when the monitor has no webhook.
   */
  async testMonitorWebhook(
    params: MonitorParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<MonitorWebhookTestResult>>;
  async testMonitorWebhook(
    params: MonitorParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<MonitorWebhookTestResult>;
  async testMonitorWebhook(
    params: MonitorParams,
    options: DesearchRequestOptions
  ): Promise<
    MonitorWebhookTestResult | DesearchResponse<MonitorWebhookTestResult>
  >;
  async testMonitorWebhook(
    params: MonitorParams,
    options?: DesearchRequestOptions
  ): Promise<
    MonitorWebhookTestResult | DesearchResponse<MonitorWebhookTestResult>
  > {
    return this.handleRequest<MonitorWebhookTestResult>(
      'POST',
      this.monitorPath(params, '/webhook/test'),
      undefined,
      options
    );
  }

  /**
   * Replace the monitor's webhook signing secret. The new secret is returned once; deliveries from now on are signed with it. Free.
   *
   * @param params - Object containing the monitor ID. A monitor object works as is.
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response metadata.
   * @returns `{ webhook_secret }`, or a metadata wrapper when opted in.
   * @throws Error `HTTP 400` when the monitor has no webhook.
   */
  async rotateMonitorWebhookSecret(
    params: MonitorParams,
    options: DesearchMetadataRequestOptions
  ): Promise<DesearchResponse<MonitorWebhookSecret>>;
  async rotateMonitorWebhookSecret(
    params: MonitorParams,
    options?: DesearchDefaultRequestOptions
  ): Promise<MonitorWebhookSecret>;
  async rotateMonitorWebhookSecret(
    params: MonitorParams,
    options: DesearchRequestOptions
  ): Promise<MonitorWebhookSecret | DesearchResponse<MonitorWebhookSecret>>;
  async rotateMonitorWebhookSecret(
    params: MonitorParams,
    options?: DesearchRequestOptions
  ): Promise<MonitorWebhookSecret | DesearchResponse<MonitorWebhookSecret>> {
    return this.handleRequest<MonitorWebhookSecret>(
      'POST',
      this.monitorPath(params, '/webhook/rotate-secret'),
      undefined,
      options
    );
  }

  /**
   * Iterate over everything a monitor kept, newest first, following `next_cursor` page by page until it is null. Free.
   *
   * @param params - Object containing the monitor ID and optional source, starting cursor and page size (1-200).
   * @returns An async iterator of items.
   */
  async *iterMonitorItems(
    params: ListMonitorItemsParams
  ): AsyncGenerator<MonitorItem, void, undefined> {
    let cursor = params.cursor ?? undefined;

    for (;;) {
      const page = await this.listMonitorItems({
        monitor_id: params.monitor_id,
        source: params.source,
        limit: params.limit,
        cursor,
      });
      yield* page.items;
      if (
        !page.next_cursor ||
        page.items.length === 0 ||
        page.next_cursor === cursor
      ) {
        return;
      }
      cursor = page.next_cursor;
    }
  }
}

export {
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TOLERANCE_SECONDS,
} from './webhooks';
export type * from './types';
export default Desearch;
