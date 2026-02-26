import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  AiSearchRequest,
  AiSearchResponse,
  AiWebLinksSearchRequest,
  WebSearchResponse,
  AiXLinksSearchRequest,
  XLinksSearchResponse,
  XSearchParams,
  TwitterScraperTweet,
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
} from './types';

const BASE_URL = 'https://api.desearch.ai';

class Desearch {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  private async handleRequest<T>(request: Promise<AxiosResponse<T>>): Promise<T> {
    try {
      const response = await request;
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          throw new Error(
            `API Error: ${status} - ${typeof data === 'string' ? data : JSON.stringify(data)}`
          );
        } else if (error.request) {
          throw new Error('Network Error: No response received from the server.');
        } else {
          throw new Error(`Request Setup Error: ${error.message}`);
        }
      }
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Unexpected Error: ${err.message}`);
    }
  }

  /**
   * Perform an AI-powered contextual search across multiple sources.
   *
   * @param payload - The search request parameters including prompt, tools, date filters, and result options.
   * @returns Search results from selected sources with optional AI-generated summaries.
   */
  async aiSearch(payload: AiSearchRequest & { streaming: true }): Promise<NodeJS.ReadableStream>;
  async aiSearch(payload: AiSearchRequest & { streaming?: false }): Promise<AiSearchResponse>;
  async aiSearch(payload: AiSearchRequest): Promise<AiSearchResponse | NodeJS.ReadableStream> {
    if (payload.streaming === true) {
      const response = await this.client.post('/desearch/ai/search', payload, {
        responseType: 'stream',
      });
      return response.data as NodeJS.ReadableStream;
    }
    return this.handleRequest<AiSearchResponse>(
      this.client.post('/desearch/ai/search', payload)
    );
  }

  /**
   * Search for raw links across web sources excluding X (Twitter).
   *
   * @param payload - The search request including prompt, tools, and optional count.
   * @returns Structured link results from selected web platforms.
   */
  async aiWebLinksSearch(payload: AiWebLinksSearchRequest): Promise<WebSearchResponse> {
    return this.handleRequest<WebSearchResponse>(
      this.client.post('/desearch/ai/search/links/web', payload)
    );
  }

  /**
   * Search for X (Twitter) post links matching a prompt using AI-powered models.
   *
   * @param payload - The search request including prompt and optional count.
   * @returns Tweet objects matching the search prompt.
   */
  async aiXLinksSearch(payload: AiXLinksSearchRequest): Promise<XLinksSearchResponse> {
    return this.handleRequest<XLinksSearchResponse>(
      this.client.post('/desearch/ai/search/links/twitter', payload)
    );
  }

  /**
   * Search X (Twitter) with extensive filtering options.
   *
   * @param params - Search parameters including query, sort, user, date range, language, verification, media filters, and engagement thresholds.
   * @returns An array of tweets matching the search criteria.
   */
  async xSearch(params: XSearchParams): Promise<TwitterScraperTweet[] | Record<string, unknown>> {
    return this.handleRequest<TwitterScraperTweet[] | Record<string, unknown>>(
      this.client.get('/twitter', { params })
    );
  }

  /**
   * Fetch full post data for a list of X (Twitter) post URLs.
   *
   * @param params - An object containing an array of post URLs.
   * @returns An array of tweet objects with metadata, content, and engagement metrics.
   */
  async xPostsByUrls(params: XPostsByUrlsParams): Promise<TwitterScraperTweet[]> {
    return this.handleRequest<TwitterScraperTweet[]>(
      this.client.get('/twitter/urls', { params })
    );
  }

  /**
   * Fetch a single X (Twitter) post by its unique ID.
   *
   * @param params - An object containing the post ID.
   * @returns The tweet object with metadata, content, and engagement metrics.
   */
  async xPostById(params: XPostByIdParams): Promise<TwitterScraperTweet> {
    return this.handleRequest<TwitterScraperTweet>(
      this.client.get('/twitter/post', { params })
    );
  }

  /**
   * Search X (Twitter) posts by a specific user with optional keyword filtering.
   *
   * @param params - Search parameters including user, optional query, and count.
   * @returns An array of tweets from the specified user.
   */
  async xPostsByUser(params: XPostsByUserParams): Promise<TwitterScraperTweet[] | Record<string, unknown>> {
    return this.handleRequest<TwitterScraperTweet[] | Record<string, unknown>>(
      this.client.get('/twitter/post/user', { params })
    );
  }

  /**
   * Retrieve the list of users who retweeted a specific post.
   *
   * @param params - An object containing the post ID and optional pagination cursor.
   * @returns A list of users who retweeted the post with optional next cursor.
   */
  async xPostRetweeters(params: XPostRetweetersParams): Promise<XRetweetersResponse> {
    return this.handleRequest<XRetweetersResponse>(
      this.client.get('/twitter/post/retweeters', { params })
    );
  }

  /**
   * Retrieve a user's timeline posts by their username.
   *
   * @param params - An object containing the username and optional pagination cursor.
   * @returns The user object and their timeline tweets with optional next cursor.
   */
  async xUserPosts(params: XUserPostsParams): Promise<XUserPostsResponse> {
    return this.handleRequest<XUserPostsResponse>(
      this.client.get('/twitter/user/posts', { params })
    );
  }

  /**
   * Fetch tweets and replies posted by a specific user.
   *
   * @param params - Parameters including user, optional count, and optional query.
   * @returns An array of tweets and replies from the specified user.
   */
  async xUserReplies(params: XUserRepliesParams): Promise<TwitterScraperTweet[] | Record<string, unknown>> {
    return this.handleRequest<TwitterScraperTweet[] | Record<string, unknown>>(
      this.client.get('/twitter/replies', { params })
    );
  }

  /**
   * Fetch replies to a specific X (Twitter) post by its post ID.
   *
   * @param params - Parameters including post_id, optional count, and optional query.
   * @returns An array of reply tweets for the specified post.
   */
  async xPostReplies(params: XPostRepliesParams): Promise<TwitterScraperTweet[] | Record<string, unknown>> {
    return this.handleRequest<TwitterScraperTweet[] | Record<string, unknown>>(
      this.client.get('/twitter/replies/post', { params })
    );
  }

  /**
   * Perform a SERP web search with pagination support.
   *
   * @param params - Search parameters including query and optional start offset.
   * @returns Paginated web search results.
   */
  async webSearch(params: WebSearchParams): Promise<WebSearchResultsResponse> {
    return this.handleRequest<WebSearchResultsResponse>(
      this.client.get('/web', { params })
    );
  }

  /**
   * Crawl a URL and return its content as plain text or HTML.
   *
   * @param params - Parameters including the URL to crawl and optional format.
   * @returns The content of the web page as a string.
   */
  async webCrawl(params: WebCrawlParams): Promise<string> {
    return this.handleRequest<string>(
      this.client.get('/web/crawl', { params })
    );
  }
}

export default Desearch;
