import { fetch } from 'undici';
import type {
  AiSearchRequest,
  AiSearchResponse,
  AiWebLinksSearchRequest,
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
  WebSearchParams,
  WebSearchResultsResponse,
  WebCrawlParams,
  TwitterScraperTweet,
  ResponseData,
} from './types';

const BASE_URL = 'https://api.desearch.ai';

class Desearch {
  private baseURL: string;
  private apiKey: string;

  constructor(apiKey: string) {
    this.baseURL = BASE_URL;
    this.apiKey = apiKey;
  }

  private async handleRequest<T>(method: string, path: string, payload?: unknown): Promise<T> {
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
      if (contentType.includes('application/json')) {
        return (await response.json()) as T;
      }

      return (await response.text()) as unknown as T;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('HTTP ')) {
        throw error;
      }
      throw new Error(`Unexpected Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Perform an AI-powered multi-source contextual search across web, X, Reddit, YouTube, HackerNews, Wikipedia, and arXiv.
   *
   * @param payload - The search request parameters including prompt, tools, date filters, and result type.
   * @returns Search results with optional AI-generated summaries.
   */
  async aiSearch(payload: AiSearchRequest): Promise<AiSearchResponse> {
    const { streaming, ...rest } = payload as AiSearchRequest & { streaming?: boolean };
    const body = { ...rest, streaming: false };
    return this.handleRequest<AiSearchResponse>('POST', '/desearch/ai/search', body);
  }

  /**
   * Search for raw links across web sources including web, HackerNews, Reddit, Wikipedia, YouTube, and arXiv.
   *
   * @param payload - The web links search request parameters including prompt, tools, and count.
   * @returns Structured link results grouped by source.
   */
  async aiWebLinksSearch(payload: AiWebLinksSearchRequest): Promise<WebSearchResponse> {
    return this.handleRequest<WebSearchResponse>('POST', '/desearch/ai/search/links/web', payload);
  }

  /**
   * Search for X (Twitter) post links matching a prompt using AI-powered models.
   *
   * @param payload - The X links search request parameters including prompt and count.
   * @returns Tweet objects matching the search prompt.
   */
  async aiXLinksSearch(payload: AiXLinksSearchRequest): Promise<XLinksSearchResponse> {
    return this.handleRequest<XLinksSearchResponse>('POST', '/desearch/ai/search/links/twitter', payload);
  }

  /**
   * Search X (Twitter) with extensive filtering options including date range, user, language, verification, media type, and engagement thresholds.
   *
   * @param params - The search parameters including query, sort, user, date range, language, verification filters, media filters, engagement thresholds, and count.
   * @returns An array of tweets matching the search criteria.
   */
  async xSearch(params: XSearchParams): Promise<TwitterScraperTweet[] | Record<string, unknown>> {
    return this.handleRequest<TwitterScraperTweet[] | Record<string, unknown>>('GET', '/twitter', params);
  }

  /**
   * Fetch full post data for a list of X (Twitter) post URLs.
   *
   * @param params - Object containing an array of post URLs to fetch.
   * @returns An array of tweet objects with metadata, content, and engagement metrics.
   */
  async xPostsByUrls(params: XPostsByUrlsParams): Promise<TwitterScraperTweet[]> {
    return this.handleRequest<TwitterScraperTweet[]>('GET', '/twitter/urls', params);
  }

  /**
   * Fetch a single X (Twitter) post by its unique ID.
   *
   * @param params - Object containing the post ID.
   * @returns A tweet object with metadata, content, and engagement metrics.
   */
  async xPostById(params: XPostByIdParams): Promise<TwitterScraperTweet> {
    return this.handleRequest<TwitterScraperTweet>('GET', '/twitter/post', params);
  }

  /**
   * Search X (Twitter) posts by a specific user with optional keyword filtering.
   *
   * @param params - Object containing user, optional query, and count.
   * @returns An array of tweets posted by the specified user.
   */
  async xPostsByUser(params: XPostsByUserParams): Promise<TwitterScraperTweet[] | Record<string, unknown>> {
    return this.handleRequest<TwitterScraperTweet[] | Record<string, unknown>>('GET', '/twitter/post/user', params);
  }

  /**
   * Retrieve the list of users who retweeted a specific post by its ID.
   *
   * @param params - Object containing the post ID and optional cursor for pagination.
   * @returns A list of users who retweeted the post with optional pagination cursor.
   */
  async xPostRetweeters(params: XPostRetweetersParams): Promise<XRetweetersResponse> {
    return this.handleRequest<XRetweetersResponse>('GET', '/twitter/post/retweeters', params);
  }

  /**
   * Retrieve a user's timeline posts by their username.
   *
   * @param params - Object containing the username and optional cursor for pagination.
   * @returns The user's profile and their latest tweets with optional pagination cursor.
   */
  async xUserPosts(params: XUserPostsParams): Promise<XUserPostsResponse> {
    return this.handleRequest<XUserPostsResponse>('GET', '/twitter/user/posts', params);
  }

  /**
   * Fetch tweets and replies posted by a specific user with optional keyword filtering.
   *
   * @param params - Object containing user, optional count, and optional query.
   * @returns An array of tweets and replies by the specified user.
   */
  async xUserReplies(params: XUserRepliesParams): Promise<TwitterScraperTweet[] | Record<string, unknown>> {
    return this.handleRequest<TwitterScraperTweet[] | Record<string, unknown>>('GET', '/twitter/replies', params);
  }

  /**
   * Fetch replies to a specific X (Twitter) post by its post ID.
   *
   * @param params - Object containing the post ID, optional count, and optional query.
   * @returns An array of reply tweets for the specified post.
   */
  async xPostReplies(params: XPostRepliesParams): Promise<TwitterScraperTweet[] | Record<string, unknown>> {
    return this.handleRequest<TwitterScraperTweet[] | Record<string, unknown>>('GET', '/twitter/replies/post', params);
  }

  /**
   * Perform a SERP web search returning paginated web search results.
   *
   * @param params - Object containing the search query and optional pagination start offset.
   * @returns Paginated web search results.
   */
  async webSearch(params: WebSearchParams): Promise<WebSearchResultsResponse> {
    return this.handleRequest<WebSearchResultsResponse>('GET', '/web', params);
  }

  /**
   * Crawl a URL and return its content as plain text or HTML.
   *
   * @param params - Object containing the URL to crawl and optional format (html or text).
   * @returns The crawled content as a string.
   */
  async webCrawl(params: WebCrawlParams): Promise<string> {
    return this.handleRequest<string>('GET', '/web/crawl', params);
  }
}

export default Desearch;
