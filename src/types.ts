// ============================================================================
// Enums and Literal Types
// ============================================================================

export type ToolEnum = 'web' | 'hackernews' | 'reddit' | 'wikipedia' | 'youtube' | 'twitter' | 'arxiv';

export type WebToolEnum = 'web' | 'hackernews' | 'reddit' | 'wikipedia' | 'youtube' | 'arxiv';

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
  /** Whether to stream results (always overridden to false in the SDK) */
  streaming?: boolean;
  /** The result type to be used for the search */
  result_type?: ResultTypeEnum | null;
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

export interface WebSearchParams {
  /** The search query string */
  query: string;
  /** How many results to skip for pagination (0, 10, 20, etc.) */
  start?: number;
}

export interface WebCrawlParams {
  /** Url to crawl */
  url: string;
  /** Format of the content to be returned: 'html' or 'text' */
  format?: 'html' | 'text';
}

// ============================================================================
// Response Types
// ============================================================================

export interface ResponseData {
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

export interface WebSearchResponse {
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

export interface XLinksSearchResponse {
  /** Miner tweets */
  miner_tweets: TwitterScraperTweet[];
}

export interface XRetweetersResponse {
  /** List of users who retweeted */
  users: TwitterScraperUser[];
  /** Cursor for pagination */
  next_cursor?: string | null;
}

export interface XUserPostsResponse {
  /** User profile information */
  user: TwitterScraperUser;
  /** User's tweets */
  tweets: TwitterScraperTweet[];
  /** Cursor for pagination */
  next_cursor?: string | null;
}

export interface WebSearchResultsResponse {
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
  /** Retweeted tweet object */
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
