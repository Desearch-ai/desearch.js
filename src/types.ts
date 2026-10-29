// ============================================================================
// Enums and Literal Types
// ============================================================================

export type ToolEnum =
  | 'web'
  | 'hackernews'
  | 'reddit'
  | 'wikipedia'
  | 'youtube'
  | 'twitter'
  | 'arxiv';

export type WebToolEnum =
  | 'web'
  | 'hackernews'
  | 'reddit'
  | 'wikipedia'
  | 'youtube'
  | 'arxiv';

export type DateFilterEnum =
  | 'PAST_24_HOURS'
  | 'PAST_2_DAYS'
  | 'PAST_WEEK'
  | 'PAST_2_WEEKS'
  | 'PAST_MONTH'
  | 'PAST_2_MONTHS'
  | 'PAST_YEAR'
  | 'PAST_2_YEARS';

export type ResultTypeEnum = 'ONLY_LINKS' | 'LINKS_WITH_FINAL_SUMMARY';

// ============================================================================
// Request Types
// ============================================================================

export interface AiSearchRequest {
  /** Search query prompt */
  prompt: string;
  /** A list of tools to be used for the search */
  tools: (ToolEnum | string)[];
  /** The start date for the search query. Format: YYYY-MM-DDTHH:MM:SSZ (UTC) */
  start_date?: string | null;
  /** The end date for the search query. Format: YYYY-MM-DDTHH:MM:SSZ (UTC) */
  end_date?: string | null;
  /** Predefined date filters for the search results */
  date_filter?: DateFilterEnum | null;
  /** The result type to be used for the search */
  result_type?: ResultTypeEnum | null;
  /** Restrict Web Search results to these domains. */
  include_domains?: string[] | null;
  /** Drop Web Search results from these domains. */
  exclude_domains?: string[] | null;
  /** The system message to be used for the search */
  system_message?: string | null;
  /** System message for scoring the response */
  scoring_system_message?: string | null;
  /** The number of results to return per source. Min 10. Max 200. */
  count?: number | null;
}

export interface AiWebLinksSearchRequest {
  /** Search query prompt */
  prompt: string;
  /** List of tools to search with */
  tools: (WebToolEnum | string)[];
  /** The number of results to return per source. Min 10. Max 200. */
  count?: number | null;
}

export interface AiXLinksSearchRequest {
  /** Search query prompt */
  prompt: string;
  /** The number of results to return per source. Min 10. Max 200. */
  count?: number | null;
}

export interface XSearchParams {
  /** Advanced search query */
  query: string;
  /** Sort by Top or Latest */
  sort?: string | null;
  /** User to search for */
  user?: string | null;
  /** Start date in UTC (YYYY-MM-DD format) */
  start_date?: string | null;
  /** End date in UTC (YYYY-MM-DD format) */
  end_date?: string | null;
  /** Language code (e.g., en, es, fr) */
  lang?: string | null;
  /** Filter for verified users */
  verified?: boolean | null;
  /** Filter for blue checkmark verified users */
  blue_verified?: boolean | null;
  /** Include only tweets with quotes */
  is_quote?: boolean | null;
  /** Include only tweets with videos */
  is_video?: boolean | null;
  /** Include only tweets with images */
  is_image?: boolean | null;
  /** Minimum number of retweets */
  min_retweets?: number | string | null;
  /** Minimum number of replies */
  min_replies?: number | string | null;
  /** Minimum number of likes */
  min_likes?: number | string | null;
  /** Number of tweets to retrieve (1-100) */
  count?: number | null;
}

export interface XPostsByUrlsParams {
  /** List of urls that is to be retrieved */
  urls: string[];
}

export interface XPostByIdParams {
  /** The unique ID of the post */
  id: string;
}

export interface XPostsByUserParams {
  /** User to search for */
  user: string;
  /** Advanced search query */
  query?: string;
  /** Number of tweets to retrieve (1-100) */
  count?: number;
}

export interface XPostRetweetersParams {
  /** The ID of the post to get retweeters for */
  id: string;
  /** Cursor for pagination */
  cursor?: string | null;
}

export interface XUserPostsParams {
  /** Username to fetch posts for */
  username: string;
  /** Cursor for pagination */
  cursor?: string | null;
}

export interface XUserRepliesParams {
  /** The username of the user to search for */
  user: string;
  /** The number of tweets to fetch (1-100) */
  count?: number;
  /** Advanced search query */
  query?: string;
}

export interface XPostRepliesParams {
  /** The ID of the post to search for */
  post_id: string;
  /** The number of tweets to fetch (1-100) */
  count?: number;
  /** Advanced search query */
  query?: string;
}

export interface XTrendsParams {
  /** The WOEID of the location (e.g. 23424977 for United States) */
  woeid: number;
  /** The number of trends to return (30-100) */
  count?: number | null;
}

export interface WebSearchParams {
  /** The search query string */
  query: string;
  /** How many results to skip for pagination (0, 10, 20, etc.) */
  start?: number;
}

export interface ExtractParams {
  /** Public URL to extract content from */
  url: string;
  /** Format of the content to be returned: 'text', 'markdown' or 'html' */
  format?: 'html' | 'text' | 'markdown';
  /** Render JavaScript before extraction */
  js?: boolean;
  /** Optional post-load wait in milliseconds when JavaScript rendering is enabled */
  wait?: number;
  /** Only with format 'text': return all visible text of the page instead of its main content */
  full_page?: boolean;
}

/** @deprecated Use ExtractParams for new integrations. */
export interface WebCrawlParams extends ExtractParams {}

// ============================================================================
// Response Metadata Types
// ============================================================================

/** Cost and usage metadata parsed from Desearch response headers. */
export interface DesearchCostMetadata {
  /** Cost for the request in USD, parsed from X-Desearch-Cost-Usd when present and numeric. */
  costUsd?: number;
  /** @deprecated Use costUsd from X-Desearch-Cost-Usd instead. */
  costCents?: number;
  /** Usage count for the request, parsed from X-Desearch-Usage-Count when present and numeric. */
  usageCount?: number;
  /** Service name for the charged request, parsed from X-Desearch-Service when present. */
  service?: string;
  /** Billing currency for the request, parsed from X-Desearch-Currency when present. */
  currency?: string;
}

/** Wrapper returned when an SDK method is called with { includeMetadata: true }. */
export interface DesearchResponse<T> {
  /** The original response payload that default SDK calls return directly. */
  data: T;
  /** Optional per-request cost and usage metadata parsed from response headers. */
  metadata: DesearchCostMetadata;
}

/** Request options that keep the default raw response payload shape. */
export interface DesearchDefaultRequestOptions {
  /** Leave unset or false to receive the raw response payload. */
  includeMetadata?: false;
}

/** Request options overload that opts in to the metadata response wrapper. */
export interface DesearchMetadataRequestOptions {
  /** Return { data, metadata } instead of the raw response payload. */
  includeMetadata: true;
}

/** SDK request options shared by all public methods. */
export type DesearchRequestOptions =
  | DesearchDefaultRequestOptions
  | DesearchMetadataRequestOptions;

/** Optional cost metadata fields that can appear in compatible JSON object bodies. */
export interface DesearchCostMetadataBodyFields {
  /** Request cost in USD when included by the API body. */
  cost_usd?: number | null;
  /** @deprecated Use cost_usd instead. */
  cost_cents?: number | null;
  /** Request usage count when included by the API body. */
  usage_count?: number | null;
  /** Service name when included by the API body. */
  service?: string | null;
  /** Billing currency when included by the API body. */
  currency?: string | null;
}

// ============================================================================
// Response Types
// ============================================================================

export interface ResponseData extends DesearchCostMetadataBodyFields {
  /** Search results from Hacker News */
  hacker_news_search?: Record<string, string | number>[] | null;
  /** Search results from Reddit */
  reddit_search?: Record<string, string | number>[] | null;
  /** General search results */
  search?: Record<string, string | number>[] | null;
  /** Search results from YouTube */
  youtube_search?: Record<string, string | number>[] | null;
  /** Tweets related to the search query */
  tweets?: Record<string, string | number>[] | null;
  /** Additional text related to the search query */
  text?: string | null;
  /** A map of miner link scores */
  miner_link_scores?: Record<string, string> | null;
  /** Generated completion text or response */
  completion?: string | null;
}

/** Response type for aiSearch — can be structured data, a generic object, or a string */
export type AiSearchResponse = ResponseData | Record<string, unknown> | string;

export interface WebSearchResultItem {
  /** Title of the search result */
  title: string;
  /** Snippet or description of the search result */
  snippet: string;
  /** URL link to the search result */
  link: string;
}

export interface WebSearchResponse extends DesearchCostMetadataBodyFields {
  /** Youtube search results */
  youtube_search_results: WebSearchResultItem[] | null;
  /** Hacker News search results */
  hacker_news_search_results: WebSearchResultItem[] | null;
  /** Reddit search results */
  reddit_search_results: WebSearchResultItem[] | null;
  /** Arxiv search results */
  arxiv_search_results: WebSearchResultItem[] | null;
  /** Wikipedia search results */
  wikipedia_search_results: WebSearchResultItem[] | null;
  /** General search results */
  search_results: WebSearchResultItem[] | null;
}

export interface XLinksSearchResponse extends DesearchCostMetadataBodyFields {
  /** Miner tweets */
  miner_tweets: TwitterScraperTweet[];
}

export interface XRetweetersResponse extends DesearchCostMetadataBodyFields {
  /** List of users who retweeted */
  users: TwitterScraperUser[];
  /** Cursor for pagination */
  next_cursor?: string | null;
}

export interface XUserPostsResponse extends DesearchCostMetadataBodyFields {
  /** User profile information */
  user: TwitterScraperUser;
  /** User's tweets */
  tweets: TwitterScraperTweet[];
  /** Cursor for pagination */
  next_cursor?: string | null;
}

export interface XTrendsResponse extends DesearchCostMetadataBodyFields {
  /** List of trending topics */
  trends: XTrendItem[];
  /** The location for which trends were retrieved */
  woeid?: XTrendsWoeid | null;
}

export interface XTrendItem {
  /** The name of the trending topic */
  name: string;
  /** The search query associated with the trend */
  query?: string | null;
  /** The rank of the trend */
  rank?: number | null;
}

export interface XTrendsWoeid {
  /** The name of the location */
  name: string;
  /** The WOEID (Where On Earth ID) of the location */
  id: number;
}

export interface WebSearchResultsResponse
  extends DesearchCostMetadataBodyFields {
  /** Array of web search result items */
  data: WebSearchResultItem[];
}

// ============================================================================
// Twitter / X Data Types
// ============================================================================

export interface TwitterScraperTweet {
  /** User who posted the tweet */
  user?: TwitterScraperUser | null;
  /** Tweet ID */
  id: string;
  /** Tweet text content */
  text: string;
  /** Number of replies */
  reply_count: number;
  /** Number of views */
  view_count?: number | null;
  /** Number of retweets */
  retweet_count: number;
  /** Number of likes */
  like_count: number;
  /** Number of quotes */
  quote_count: number;
  /** Number of bookmarks */
  bookmark_count: number;
  /** URL of the tweet */
  url?: string | null;
  /** Creation timestamp */
  created_at: string;
  /** Media attachments */
  media?: TwitterScraperMedia[] | null;
  /** Whether this is a quote tweet */
  is_quote_tweet?: boolean | null;
  /** Whether this is a retweet */
  is_retweet?: boolean | null;
  /** Tweet language code */
  lang?: string | null;
  /** Conversation thread ID */
  conversation_id?: string | null;
  /** Username being replied to */
  in_reply_to_screen_name?: string | null;
  /** Tweet ID being replied to */
  in_reply_to_status_id?: string | null;
  /** User ID being replied to */
  in_reply_to_user_id?: string | null;
  /** Quoted tweet ID */
  quoted_status_id?: string | null;
  /** Quoted tweet object */
  quote?: TwitterScraperTweet | null;
  /** Reply tweets */
  replies?: TwitterScraperTweet[] | null;
  /** Text display range indices */
  display_text_range?: number[] | null;
  /** Tweet entities (hashtags, URLs, mentions) */
  entities?: TwitterScraperEntities | null;
  /** Extended entities for media */
  extended_entities?: TwitterScraperExtendedEntities | null;
  /** Retweeted tweet object. Available for user posts endpoint only. */
  retweet?: TwitterScraperTweet | null;
}

export interface TwitterScraperUser {
  /** User ID */
  id: string;
  /** Profile URL */
  url?: string | null;
  /** Display name */
  name?: string | null;
  /** Username / handle */
  username: string;
  /** Account creation date */
  created_at?: string | null;
  /** Profile description / bio */
  description?: string | null;
  /** Number of favourites */
  favourites_count?: number | null;
  /** Number of followers */
  followers_count?: number | null;
  /** Number of accounts followed */
  followings_count?: number | null;
  /** Number of lists the user is on */
  listed_count?: number | null;
  /** Number of media uploads */
  media_count?: number | null;
  /** Profile image URL */
  profile_image_url?: string | null;
  /** Profile banner URL */
  profile_banner_url?: string | null;
  /** Number of statuses/tweets */
  statuses_count?: number | null;
  /** Whether the user is verified */
  verified?: boolean | null;
  /** Whether the user is Blue Tick verified */
  is_blue_verified?: boolean | null;
  /** User profile entities */
  entities?: TwitterScraperUserEntities | null;
  /** Whether the user has DMs enabled */
  can_dm?: boolean | null;
  /** Whether the user can be tagged in media */
  can_media_tag?: boolean | null;
  /** User location */
  location?: string | null;
  /** Pinned tweet IDs */
  pinned_tweet_ids?: string[] | null;
  /** Professional information */
  professional?: TwitterScraperUserProfessional | null;
}

export interface TwitterScraperMedia {
  /** Media URL */
  media_url?: string;
  /** Media type (photo, video, animated_gif) */
  type?: string;
}

export interface TwitterScraperEntities {
  /** Hashtags in the tweet */
  hashtags?: TwitterScraperEntitiesSymbol[] | null;
  /** Media attachments */
  media?: TwitterScraperEntitiesMedia[] | null;
  /** Cashtags/symbols */
  symbols?: TwitterScraperEntitiesSymbol[] | null;
  /** Timestamp entities */
  timestamps?: unknown[] | null;
  /** URLs in the tweet */
  urls?: TwitterScraperEntityUrl[] | null;
  /** Mentioned users */
  user_mentions?: TwitterScraperEntitiesUserMention[] | null;
}

export interface TwitterScraperExtendedEntities {
  /** Extended media information for multiple attachments */
  media?: TwitterScraperEntitiesMedia[] | null;
}

export interface TwitterScraperEntitiesSymbol {
  /** Index positions in the tweet text */
  indices: number[];
  /** Symbol or hashtag text */
  text: string;
}

export interface TwitterScraperEntityUrl {
  /** Shortened display URL */
  display_url: string;
  /** Full expanded URL */
  expanded_url?: string | null;
  /** Shortened t.co URL */
  url: string;
  /** Index positions in the tweet text */
  indices: number[];
}

export interface TwitterScraperEntitiesUserMention {
  /** User ID string */
  id_str: string;
  /** Display name */
  name: string;
  /** Screen name / handle */
  screen_name: string;
  /** Index positions in the tweet text */
  indices: number[];
}

export interface TwitterScraperEntitiesMedia {
  /** Display URL */
  display_url?: string | null;
  /** Expanded URL */
  expanded_url?: string | null;
  /** Media ID string */
  id_str?: string | null;
  /** Index positions in the tweet text */
  indices?: number[] | null;
  /** Media key */
  media_key?: string | null;
  /** HTTPS media URL */
  media_url_https?: string | null;
  /** Media type: photo, video, or animated_gif */
  type?: string | null;
  /** Shortened URL */
  url?: string | null;
  /** Additional media information */
  additional_media_info?: TwitterScraperEntitiesMediaAdditionalInfo | null;
  /** External media availability status */
  ext_media_availability?: TwitterScraperEntitiesMediaExtAvailability | null;
  /** Media features like face detection */
  features?: TwitterScraperEntitiesMediaFeatures | null;
  /** Available media sizes */
  sizes?: TwitterScraperEntitiesMediaSizes | null;
  /** Original media information */
  original_info?: TwitterScraperEntitiesMediaOriginalInfo | null;
  /** Download permission status */
  allow_download_status?: TwitterScraperEntitiesMediaAllowDownloadStatus | null;
  /** Video-specific information */
  video_info?: TwitterScraperEntitiesMediaVideoInfo | null;
  /** Media result details */
  media_results?: TwitterScraperEntitiesMediaResults | null;
}

export interface TwitterScraperEntitiesMediaAdditionalInfo {
  /** Whether the media is monetizable */
  monetizable?: boolean | null;
  /** Source user information */
  source_user?: Record<string, unknown> | null;
}

export interface TwitterScraperEntitiesMediaExtAvailability {
  /** Availability status */
  status?: string | null;
}

export interface TwitterScraperEntitiesMediaFeatures {
  /** Features for large size */
  large?: TwitterScraperEntitiesMediaFeature | null;
  /** Features for medium size */
  medium?: TwitterScraperEntitiesMediaFeature | null;
  /** Features for small size */
  small?: TwitterScraperEntitiesMediaFeature | null;
  /** Features for original size */
  orig?: TwitterScraperEntitiesMediaFeature | null;
}

export interface TwitterScraperEntitiesMediaFeature {
  /** Detected faces in media */
  faces?: Rect[] | null;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TwitterScraperEntitiesMediaSizes {
  /** Large size dimensions */
  large?: MediaSize | null;
  /** Medium size dimensions */
  medium?: MediaSize | null;
  /** Small size dimensions */
  small?: MediaSize | null;
  /** Thumbnail size dimensions */
  thumb?: MediaSize | null;
}

export interface MediaSize {
  w: number;
  h: number;
  resize?: string | null;
}

export interface TwitterScraperEntitiesMediaOriginalInfo {
  /** Original height */
  height: number;
  /** Original width */
  width: number;
  /** Focus rectangles */
  focus_rects?: Rect[] | null;
}

export interface TwitterScraperEntitiesMediaAllowDownloadStatus {
  /** Whether download is allowed */
  allow_download?: boolean | null;
}

export interface TwitterScraperEntitiesMediaVideoInfo {
  /** Video duration in milliseconds */
  duration_millis?: number | null;
  /** Aspect ratio */
  aspect_ratio?: number[] | null;
  /** Available video quality variants */
  variants?: TwitterScraperEntitiesMediaVideoInfoVariant[] | null;
}

export interface TwitterScraperEntitiesMediaVideoInfoVariant {
  /** Content type (e.g., video/mp4) */
  content_type: string;
  /** Video URL */
  url: string;
  /** Bitrate */
  bitrate?: number | null;
}

export interface TwitterScraperEntitiesMediaResult {
  /** Media key */
  media_key: string;
}

export interface TwitterScraperEntitiesMediaResults {
  /** Media result details */
  result?: TwitterScraperEntitiesMediaResult | null;
}

export interface TwitterScraperUserEntities {
  /** Entities in user description */
  description?: TwitterScraperUserEntitiesDescription | null;
  /** Entities in user profile URL */
  url?: TwitterScraperUserEntitiesDescription | null;
}

export interface TwitterScraperUserEntitiesDescription {
  /** URLs in user description or profile */
  urls?: TwitterScraperEntityUrl[] | null;
}

export interface TwitterScraperUserProfessional {
  /** Professional type */
  professional_type: string;
  /** Professional categories */
  category: TwitterScraperUserProfessionalCategory[];
}

export interface TwitterScraperUserProfessionalCategory {
  /** Category ID */
  id: number;
  /** Category name */
  name: string;
}

// ============================================================================
// People Search Types
// ============================================================================

/** Platform a People Search runs on. */
export type PeoplePlatform = 'x' | 'youtube' | 'linkedin' | 'tiktok';

/** Search type stored on a People Search task. */
export type PeopleSearchType =
  | 'x_profile_search'
  | 'youtube_creator_search'
  | 'linkedin_profile_search'
  | 'tiktok_creator_search';

/** Lifecycle status of a People Search task. */
export type PeopleTaskStatus =
  | 'queued'
  | 'running'
  | 'pausing'
  | 'paused'
  | 'cancelling'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'cancelled'
  | 'expired';

/** Statuses after which a People Search task no longer changes. */
export type PeopleTaskEndStatus =
  | 'completed'
  | 'partial'
  | 'failed'
  | 'cancelled'
  | 'expired';

/** What a running People Search task is doing. */
export type PeopleTaskStage =
  | 'planning'
  | 'searching'
  | 'processing'
  | 'finalizing';

/** Channels the `has` result filter accepts. */
export type PeopleFilterChannel =
  | 'email'
  | 'website'
  | 'x'
  | 'linkedin'
  | 'instagram'
  | 'youtube'
  | 'tiktok';

/** Sort order for the profiles library. */
export type PeopleProfileSort = 'score' | 'recent' | 'audience';

/** File format of a People Search export. */
export type PeopleExportFormat = 'csv' | 'jsonl';

/** Fields shared by every People Search request body. */
export interface PeopleSearchRequestBase {
  /** Who you are looking for, in plain language (3-1000 characters). */
  query: string;
  /** How many qualified profiles to find (5-200, default 25). This many are reserved at the route price; only delivered profiles are billed. */
  count?: number;
  /** Only return profiles with at least this fit score (0-100). */
  min_score?: number | null;
  /** Handles to leave out, for example people you already contacted (up to 1000). */
  exclude?: string[] | null;
  /**
   * Your own labels for this search, e.g. the workspace or campaign it belongs to.
   * At most 10 keys; keys are 1-40 characters of a-z, 0-9, '_', '.' or '-'; values are strings of at most 200 characters.
   * Returned as `metadata` on the task and usable as a `listPeopleTasks` filter. Never used by the search itself.
   */
  metadata?: Record<string, string> | null;
}

export interface XProfileSearchFilters {
  /** Minimum follower count. */
  min_followers?: number | null;
  /** Maximum follower count. */
  max_followers?: number | null;
  /** Only verified or X Premium accounts. */
  verified_only?: boolean;
  /** Countries to prefer, e.g. ['US', 'GB']. */
  countries?: string[] | null;
  /** Words that should appear in posts or bios. */
  keywords?: string[] | null;
  /** Leave out profiles that mention these words. */
  exclude_keywords?: string[] | null;
}

export interface YouTubeCreatorSearchFilters {
  /** Minimum subscriber count. */
  min_subscribers?: number | null;
  /** Maximum subscriber count. */
  max_subscribers?: number | null;
  /** Channel countries to prefer, e.g. ['US']. */
  countries?: string[] | null;
  /** Only creators with a public email or contact link. */
  require_contact?: boolean;
  /** Words that should appear in videos or channel descriptions. */
  keywords?: string[] | null;
  /** Leave out creators that mention these words. */
  exclude_keywords?: string[] | null;
}

export interface LinkedInProfileSearchFilters {
  /** Minimum LinkedIn follower count. */
  min_followers?: number | null;
  /** Maximum LinkedIn follower count. */
  max_followers?: number | null;
  /** Countries to prefer, e.g. ['US', 'United Kingdom']. */
  countries?: string[] | null;
  /** Words that should appear in posts, headlines or about sections. */
  keywords?: string[] | null;
  /** Leave out profiles that mention these words. */
  exclude_keywords?: string[] | null;
}

export interface TikTokCreatorSearchFilters {
  /** Minimum TikTok follower count. */
  min_followers?: number | null;
  /** Maximum TikTok follower count. */
  max_followers?: number | null;
  /** Only creators with a public email in their bio. */
  require_contact?: boolean;
  /** Words that should appear in videos or bios. */
  keywords?: string[] | null;
  /** Leave out creators that mention these words. */
  exclude_keywords?: string[] | null;
}

export interface XProfileSearchRequest extends PeopleSearchRequestBase {
  /** X-specific search filters */
  filters?: XProfileSearchFilters | null;
}

export interface YouTubeCreatorSearchRequest extends PeopleSearchRequestBase {
  /** YouTube-specific search filters */
  filters?: YouTubeCreatorSearchFilters | null;
}

export interface LinkedInProfileSearchRequest extends PeopleSearchRequestBase {
  /** LinkedIn-specific search filters */
  filters?: LinkedInProfileSearchFilters | null;
}

export interface TikTokCreatorSearchRequest extends PeopleSearchRequestBase {
  /** TikTok-specific search filters */
  filters?: TikTokCreatorSearchFilters | null;
}

/** Options for the billed People Search create calls. */
export interface PeopleSearchOptions {
  /** Sent as the `Idempotency-Key` header. Retrying with the same key returns the original task and is not charged again. */
  idempotencyKey?: string;
}

/**
 * Result filters shared by `exportPeopleResults`, `listPeopleProfiles` and `exportPeopleProfiles`.
 * They are sent as query parameters; `has` is joined with commas.
 */
export interface PeopleResultFilters {
  /** Channels every person must have, e.g. ['email', 'instagram']. */
  has?: PeopleFilterChannel[] | null;
  /** Minimum followers (subscribers on YouTube). */
  min_audience?: number | null;
  /** Maximum followers (subscribers on YouTube). */
  max_audience?: number | null;
  /** Minimum fit score (0-100). */
  min_score?: number | null;
  /** Case-insensitive text in the location, e.g. 'united states'. */
  location?: string | null;
  /** Only verified accounts (X, TikTok). */
  verified?: boolean | null;
}

/** Identifies one People Search task. */
export interface PeopleTaskParams {
  /** The task ID returned when the search was created */
  task_id: string;
}

export interface ListPeopleTasksParams {
  /** Only tasks on this platform */
  platform?: PeoplePlatform | null;
  /** Only tasks in these statuses; an array is sent comma-separated */
  status?: PeopleTaskStatus | PeopleTaskStatus[] | null;
  /** Page size (1-100, default 20) */
  limit?: number | null;
  /** `next_cursor` from the previous page */
  cursor?: string | null;
  /**
   * Only tasks whose `metadata` has all of these key/value pairs (exact match, at most 3).
   * Each pair is sent as a `metadata.<key>=<value>` query parameter. Keep the same filter when you page with `cursor`.
   */
  metadata?: Record<string, string> | null;
}

export interface GetPeopleResultsParams extends PeopleTaskParams {
  /** `next_cursor` from the previous page */
  cursor?: string | null;
  /** Page size (1-500, default 100) */
  limit?: number | null;
}

export interface ExportPeopleResultsParams
  extends PeopleTaskParams,
    PeopleResultFilters {
  /** File format (default csv) */
  format?: PeopleExportFormat;
}

export interface ListPeopleProfilesParams extends PeopleResultFilters {
  /** Platform whose people to list */
  platform: PeoplePlatform;
  /** Text in the name, handle, bio or location */
  q?: string | null;
  /** Sort order (default score) */
  sort?: PeopleProfileSort | null;
  /** Page size (1-200, default 50) */
  limit?: number | null;
  /** `next_cursor` from the previous page */
  cursor?: string | null;
}

export interface ExportPeopleProfilesParams extends PeopleResultFilters {
  /** Platform whose people to export */
  platform: PeoplePlatform;
  /** File format (default csv) */
  format?: PeopleExportFormat;
  /** Text in the name, handle, bio or location */
  q?: string | null;
  /** Sort order (default score) */
  sort?: PeopleProfileSort | null;
}

/** Options for `waitForPeopleTask`. */
export interface WaitForPeopleTaskOptions {
  /** Milliseconds between polls. Default 5000. */
  intervalMs?: number;
  /** Milliseconds to wait before giving up with an error. Default 600000 (10 minutes). */
  timeoutMs?: number;
  /** Called with the task after every poll, including the last one. */
  onProgress?: (task: PeopleTask) => void;
}

/**
 * Why a People Search ended. `null` on the task while it is queued, running or paused.
 *
 * - `count_reached`: it found `count` profiles.
 * - `rounds_exhausted`: it ran every search it planned and found fewer than `count`.
 * - `no_candidates`: its searches found nobody to check.
 * - `zero_qualified`: it checked the people its searches found and none fit.
 * - `candidate_budget`: it checked as many candidates as a search of this `count` may.
 * - `cost_limit`: what searching cost reached what its results would bill, so it stopped.
 * - `time_limit`: it ran for its maximum time.
 * - `cancelled`: it was cancelled.
 * - `failed`: an error ended it.
 */
export type PeopleCompletionReason =
  | 'count_reached'
  | 'rounds_exhausted'
  | 'no_candidates'
  | 'zero_qualified'
  | 'candidate_budget'
  | 'cost_limit'
  | 'time_limit'
  | 'cancelled'
  | 'failed';

/** Something that made part of a search less reliable without failing it. */
export interface PeopleTaskWarning {
  /**
   * Warning code. `partial_enrichment`: some candidates' profiles could not be read after search,
   * so they were scored on what the search returned (their results have `attributes.enrichment` = `failed`).
   */
  code: 'partial_enrichment' | (string & {});
  /** Platform the warning is about */
  platform?: PeoplePlatform | null;
  /** Profile lookups tried (YouTube: channels) */
  attempted?: number | null;
  /** Lookups that read the profile */
  enriched?: number | null;
  /** Lookups that could not read the profile */
  failed?: number | null;
  /**
   * LinkedIn and TikTok: failed lookups by reason (`not_found`, `rate_limited`, `timeout`,
   * `upstream_error`, `request_error`). YouTube: failed lookups by source (`about_page_failed`,
   * `innertube_failed`).
   */
  by_reason?: Record<string, number>;
  /** Human-readable summary */
  message?: string | null;
}

export interface PeopleTaskLinks {
  /** API path of the task */
  self: string;
  /** API path of the task's results */
  results: string;
  /** API path of the task's export */
  export: string;
}

export interface PeopleTaskCreatedBy {
  /** User who created the task */
  user_id?: string | null;
  /** API key that created the task */
  api_key_id?: string | null;
  /** How the task was created, e.g. api_key or console */
  via?: string | null;
}

/** A People Search task. Poll it until `status` is completed, partial, failed or cancelled. */
export interface PeopleTask {
  /** Task ID (UUID) */
  task_id: string;
  /** Search type */
  search_type: PeopleSearchType;
  /** Platform searched */
  platform: PeoplePlatform;
  /** Current status */
  status: PeopleTaskStatus;
  /** Current stage while the task runs */
  stage?: PeopleTaskStage | null;
  /** The search query */
  query: string;
  /** How many profiles were requested */
  count: number;
  /** How many qualified profiles were found so far */
  result_count: number;
  /** The `metadata` sent when the search was created (`{}` when none) */
  metadata: Record<string, string>;
  /** How the search was understood: criteria and the queries it ran */
  interpreted?: Record<string, unknown> | null;
  /** Progress counters */
  progress: Record<string, unknown>;
  /** Errors the task ran into */
  errors: unknown[];
  /** Why the search ended; `null` while it is queued, running or paused */
  completion_reason?: PeopleCompletionReason | null;
  /**
   * True when a budget (`completion_reason` `cost_limit`, `candidate_budget` or `time_limit`) stopped
   * the search before it reached `count`: there may be more matching people than it returned.
   * `status` is still `completed` in that case.
   */
  coverage_limited?: boolean;
  /** What made part of the search less reliable without failing it (`[]` when nothing did) */
  warnings?: PeopleTaskWarning[];
  /** Amount reserved when the task was created, in USD */
  reserved_cost_usd: number;
  /** Final cost once the task has ended, in USD. The rest of the reservation is returned. */
  final_cost_usd?: number | null;
  /** Amount returned from the reservation, in USD */
  refunded_usd?: number | null;
  /** Who created the task */
  created_by?: PeopleTaskCreatedBy | null;
  /** Creation timestamp (ISO 8601) */
  created_at: string;
  /** Start timestamp (ISO 8601) */
  started_at?: string | null;
  /** Pause timestamp (ISO 8601) */
  paused_at?: string | null;
  /** End timestamp (ISO 8601) */
  finished_at?: string | null;
  /** When the results expire (ISO 8601), 30 days after the task ends */
  results_expire_at?: string | null;
  /** API paths for this task */
  links?: PeopleTaskLinks | null;
}

/** The task returned by a People Search create call, with what the call reserved. */
export interface PeopleSearchTask
  extends PeopleTask,
    DesearchCostMetadataBodyFields {}

export interface PeopleTaskList {
  /** Tasks, newest first */
  tasks: PeopleTask[];
  /** Pass as `cursor` for the next page; null on the last page */
  next_cursor?: string | null;
}

/** 409 body of pause, resume and cancel: why the action was refused, and the task as it is now. */
export interface PeopleTaskConflictResponse {
  /** Why the action is not allowed */
  detail: string;
  /** The task in its current state */
  task: PeopleTask;
}

export interface PeopleEvidence {
  /** Evidence type, e.g. post or video */
  type: string;
  /** URL of the post or video */
  url?: string | null;
  /** Text of the post or video description */
  text?: string | null;
  /** Video title */
  title?: string | null;
  /** Publish timestamp */
  published_at?: string | null;
  /** Engagement metrics such as views, likes, replies */
  metrics?: Record<string, unknown> | null;
}

/** Verdict of one criterion check. */
export type PeopleCriterionVerdict = 'met' | 'not_met' | 'unknown';

/** One of the search's criteria, checked against the person's own profile and posts. */
export interface PeopleCriterionCheck {
  /** The criterion, word for word */
  criterion: string;
  /**
   * `met`: a quote from the profile or a source shows it. `not_met`: the evidence contradicts it.
   * `unknown`: nothing found shows it either way. For a disqualifier (`is_disqualifier`), `met` means it applies.
   */
  verdict: PeopleCriterionVerdict;
  /** The verbatim text behind a `met` verdict */
  quote?: string | null;
  /** Where the quote is: the post, video or profile URL */
  source_url?: string | null;
  /** A short explanation of the verdict */
  reason?: string;
  /**
   * True when this criterion is a disqualifier, so `met` means it applies. Missing on checks scored
   * before the field existed (2026-10-20).
   */
  is_disqualifier?: boolean | null;
}

export interface PeopleScore {
  /** Fit score (0-100) */
  value?: number | null;
  /** Whether the person qualified */
  qualified?: boolean | null;
  /** One line on why this person matched */
  summary?: string | null;
  /** Signals from the request that matched */
  matched_signals: string[];
  /** Why who they are fits the request */
  profile_fit: string[];
  /** What they post or do that matches the request */
  buying_triggers: string[];
  /** The posts, videos or profile text behind the match */
  evidence: string[];
  /** profile_fit, buying_triggers and evidence combined */
  reasons: string[];
  /** Reasons the match may be weaker */
  concerns: string[];
  /**
   * One check per criterion. Information only: a qualified result can still have `unknown` criteria.
   * Empty or missing on results scored before 2026-10-20.
   */
  criteria_checks?: PeopleCriterionCheck[];
  /**
   * True when every criterion is `met` and no disqualifier (`is_disqualifier`) is.
   * Missing on results scored before 2026-10-20.
   */
  fully_verified?: boolean | null;
}

export interface PersonMetrics {
  /** Followers (X, LinkedIn, TikTok) */
  followers?: number | null;
  /** Accounts followed (X) */
  following?: number | null;
  /** Subscribers (YouTube) */
  subscribers?: number | null;
  /** Videos (YouTube, TikTok) */
  videos?: number | null;
  /** Total views (YouTube) */
  views?: number | null;
  /** Total likes (TikTok) */
  likes?: number | null;
  /** Connections (LinkedIn) */
  connections?: number | null;
  [key: string]: unknown;
}

export interface PersonLink {
  /** Link type: website, x, linkedin, instagram, youtube, tiktok, ... */
  type: string;
  /** Link URL */
  url: string;
  /** Link title */
  title?: string | null;
  /** Where the link was found */
  source?: string | null;
}

export interface PersonContact {
  /** Contact type, e.g. email */
  type: string;
  /** Contact value, e.g. the email address */
  value: string;
  /** Where the contact was found */
  source_url?: string | null;
}

/** Why a profile could not be read after search. */
export type PeopleEnrichmentError =
  | 'not_found'
  | 'rate_limited'
  | 'timeout'
  | 'upstream_error'
  | 'request_error';

/** Platform-specific details of a person. */
export interface PersonAttributes {
  /**
   * LinkedIn, TikTok and YouTube: `ok` when the profile was read after search, `failed` when it
   * could not be. Then fields such as location, followers, experience or channel links come from
   * the search hit only or are missing.
   */
  enrichment?: 'ok' | 'failed';
  /** Why the profile could not be read, when `enrichment` is `failed` */
  enrichment_error?: PeopleEnrichmentError | (string & {}) | null;
  [key: string]: unknown;
}

/** One qualified profile (X, LinkedIn) or creator (YouTube, TikTok). */
export interface Person {
  /** Stable person ID, e.g. x:handle */
  id: string;
  /** Platform of the profile */
  platform: PeoplePlatform;
  /** Handle on the platform */
  handle: string;
  /** Profile URL */
  url?: string | null;
  /** Display name */
  name?: string | null;
  /** Avatar URL */
  avatar_url?: string | null;
  /** Bio or about text */
  bio?: string | null;
  /** Location */
  location?: string | null;
  /** Audience and activity numbers */
  metrics: PersonMetrics;
  /** Platform-specific details such as verified, headline, company, region, enrichment */
  attributes?: PersonAttributes | null;
  /** Links found on the profile */
  links: PersonLink[];
  /** Public contacts such as emails */
  contacts: PersonContact[];
  /** The posts or videos behind the match */
  evidence: PeopleEvidence[];
  /** Fit score and reasons */
  score?: PeopleScore | null;
}

export interface PeopleResultsPage {
  /** Task ID */
  task_id: string;
  /** Task status when the page was read */
  status: PeopleTaskStatus;
  /** Profiles on this page, in the order they were found */
  results: Person[];
  /** Pass as `cursor` on the next call. When `has_more` is false, keep it and call again later to get only new results. */
  next_cursor: string;
  /** True when more results are already available after this page */
  has_more: boolean;
}

export interface PersonFoundBy {
  /** Task that found the person (its best-scoring result) */
  task_id: string;
  /** Query of that task */
  query: string;
  /** When the person was found */
  found_at: string;
  /** How many of your searches found this person */
  times_found: number;
}

/** A person from your searches, with the search that found them. */
export interface PeopleProfile extends Person {
  /** The search behind this entry */
  found_by: PersonFoundBy;
}

export interface PeopleProfilesPage {
  /** People on this page */
  profiles: PeopleProfile[];
  /** People matching the filter across all your searches */
  total: number;
  /** Pass as `cursor` for the next page; null on the last page */
  next_cursor?: string | null;
}

// ============================================================================
// Error Response Types
// ============================================================================

export interface UnauthorizedResponse {
  detail: Record<string, string | number>;
}

export interface TooManyRequestsResponse {
  detail: Record<string, string | number>;
}

export interface InternalServerErrorResponse {
  detail: Record<string, string | number>;
}

export interface MovedPermanentlyResponse {
  detail: Record<string, string | number>;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}
