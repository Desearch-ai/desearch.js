import { fetch } from 'undici';
import type {
  AiSearchRequest,
  AiSearchResponse,
  AiWebLinksSearchRequest,
  DesearchCostMetadata,
  DesearchDefaultRequestOptions,
  DesearchMetadataRequestOptions,
  DesearchRequestOptions,
  DesearchResponse,
  ExportPeopleProfilesParams,
  ExportPeopleResultsParams,
  PeopleCriterionCheck,
  PeopleScore,
  ExtractParams,
  GetPeopleResultsParams,
  LinkedInProfileSearchRequest,
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
} from './types';

const BASE_URL = 'https://api.desearch.ai';

const PEOPLE_TASK_END_STATUSES: readonly PeopleTaskStatus[] = [
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

// Same rule as the API's CSV `unverified_criteria` column and the console.
const DISQUALIFIER_CRITERION =
  /\b(disqualif(?:y|ier|iers)|exclude|excluding|not a fit|not qualified)\b/i;

/**
 * The criteria a result's own profile and posts do not confirm: every criterion whose verdict is
 * not `met`, plus every `Disqualifier:` criterion that is `met` (it applies). Their `criterion`
 * texts are what the CSV export lists in `unverified_criteria`. A returned check with verdict `met`
 * is a disqualifier that applies. Empty for results scored before criteria checks existed.
 * Information only: the result still qualified.
 */
export function unverifiedCriteria(
  score: PeopleScore | null | undefined
): PeopleCriterionCheck[] {
  return (score?.criteria_checks ?? []).filter(
    (check) =>
      Boolean(check?.criterion) &&
      (check.verdict === 'met') === DISQUALIFIER_CRITERION.test(check.criterion)
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

    return {
      ...(costUsd !== undefined ? { costUsd } : {}),
      ...(costCents !== undefined ? { costCents } : {}),
      ...(usageCount !== undefined ? { usageCount } : {}),
      ...(service !== undefined ? { service } : {}),
      ...(currency !== undefined ? { currency } : {}),
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
        Authorization: this.apiKey,
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

      if (method === 'POST' && payload) {
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

  /** People Search query params: drops `task_id` (it goes in the path) and joins arrays with commas. */
  private peopleQuery(params: object): Record<string, unknown> {
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

  /** `listPeopleTasks` query params: the `metadata` filter becomes one `metadata.<key>=<value>` param per pair. */
  private peopleTaskListQuery(
    params: ListPeopleTasksParams
  ): Record<string, unknown> {
    const { metadata, ...rest } = params;
    const query = this.peopleQuery(rest);
    for (const [key, value] of Object.entries(metadata ?? {})) {
      query[`metadata.${key}`] = value;
    }
    return query;
  }

  private parsePeopleTaskConflict(
    status: number,
    body: string
  ): Error | undefined {
    if (status !== 409) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(body) as Partial<PeopleTaskConflictResponse>;
      if (parsed && typeof parsed.task === 'object' && parsed.task !== null) {
        return new PeopleTaskConflictError(body, {
          detail: typeof parsed.detail === 'string' ? parsed.detail : '',
          task: parsed.task,
        });
      }
    } catch {
      // Not the People Search 409 body: fall back to the default error.
    }
    return undefined;
  }

  private peopleSearch(
    platform: PeoplePlatform,
    payload: unknown,
    options?: DesearchRequestOptions & PeopleSearchOptions
  ): Promise<PeopleSearchTask | DesearchResponse<PeopleSearchTask>> {
    const idempotencyKey = options?.idempotencyKey;
    return this.handleRequest<PeopleSearchTask>(
      'POST',
      `/desearch/people/search/${platform}`,
      payload,
      options,
      idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}
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
          this.parsePeopleTaskConflict(status, body),
      }
    );
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
      this.peopleTaskListQuery(params),
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
      this.peopleQuery(params),
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
      this.peopleQuery(params),
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
      this.peopleQuery(params),
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
    const intervalMs = Math.max(0, options.intervalMs ?? 5000);
    const timeoutMs = Math.max(0, options.timeoutMs ?? 600000);
    const deadline = Date.now() + timeoutMs;

    for (;;) {
      const task = await this.getPeopleTask({ task_id: params.task_id });
      options.onProgress?.(task);
      if (PEOPLE_TASK_END_STATUSES.includes(task.status)) {
        return task;
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new Error(
          `Timed out after ${timeoutMs}ms waiting for People Search task ${params.task_id} (status: ${task.status})`
        );
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(intervalMs, remaining))
      );
    }
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
}

export type * from './types';
export default Desearch;
