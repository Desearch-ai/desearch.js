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

class Desearch {
  private baseURL: string;
  private apiKey: string;

  constructor(apiKey: string) {
    this.baseURL = BASE_URL;
    this.apiKey = apiKey;
  }

  private parseResponseMetadata(headers: {
    get(name: string): string | null;
  }): DesearchCostMetadata {
    const costCents = this.parseNumberHeader(
      headers.get('x-desearch-cost-cents')
    );
    const usageCount = this.parseNumberHeader(
      headers.get('x-desearch-usage-count')
    );
    const service = this.parseStringHeader(headers.get('x-desearch-service'));
    const currency = this.parseStringHeader(headers.get('x-desearch-currency'));

    return {
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
    options?: DesearchRequestOptions
  ): Promise<T | DesearchResponse<T>> {
    try {
      let url = `${this.baseURL}${path}`;
      const headers: Record<string, string> = {
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
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
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
   * Crawl a URL and return its content as plain text or HTML.
   *
   * @param params - Object containing the URL to crawl and optional format (html or text).
   * @param options - Optional SDK response options. Set `includeMetadata: true` to receive response cost metadata.
   * @returns The crawled content as a string, or a metadata wrapper when opted in.
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
}

export type * from './types';
export default Desearch;
