// ============================================================
// Enums & Literal Union Types
// ============================================================

/** Tools available for AI contextual search (includes twitter). */
export type ToolEnum =
  | 'web'
  | 'hackernews'
  | 'reddit'
  | 'wikipedia'
  | 'youtube'
  | 'twitter'
  | 'arxiv';

/** Tools available for web-only link search (excludes twitter). */
export type WebToolEnum =
  | 'web'
  | 'hackernews'
  | 'reddit'
  | 'wikipedia'
  | 'youtube'
  | 'arxiv';

/** Predefined date filter options for search results. */
export type DateFilterEnum =
  | 'PAST_24_HOURS'
  | 'PAST_2_DAYS'
  | 'PAST_WEEK'
  | 'PAST_2_WEEKS'
  | 'PAST_MONTH'
  | 'PAST_2_MONTHS'
  | 'PAST_YEAR'
  | 'PAST_2_YEARS';

/** Result type controlling whether to include AI-generated summaries. */
export type ResultTypeEnum =
  | 'ONLY_LINKS'
  | 'LINKS_WITH_FINAL_SUMMARY';

/** Sort order for X search results. */
export type XSearchSort = 'Top' | 'Latest';

/** Content format for web crawl results. */
export type CrawlFormat = 'html' | 'text';

// ============================================================
// Request Types
// ============================================================

/** Request payload for AI contextual search. */
export interface AiSearchRequest {
  /** Search query prompt. */
  prompt: string;
  /** List of tools to use for the search. */
  tools: (ToolEnum | string)[];
  /** Start date for the search query (YYYY-MM-DDTHH:MM:SSZ UTC). */
  start_date?: string | null;
  /** End date for the search query (YYYY-MM-DDTHH:MM:SSZ UTC). */
  end_date?: string | null;
  /** Predefined date filter for search results. */
  date_filter?: DateFilterEnum | null;
  /** Whether to stream results. */
  streaming?: boolean;
  /** The result type for the search. */
  result_type?: ResultTypeEnum | null;
  /** System message to customize the search response. */
  system_message?: string | null;
  /** System message for scoring the response. */
  scoring_system_message?: string | null;
  /** Number of results to return per source (10–200). */
  count?: number | null;
}

/** Request payload for AI web links search. */
export interface AiWebLinksSearchRequest {
  /** Search query prompt. */
  prompt: string;
  /** List of web tools to search with. */
  tools: (WebToolEnum | string)[];
  /** Number of results to return per source (10–200). */
  count?: number | null;
}

/** Request payload for AI X (Twitter) links search. */
export interface AiXLinksSearchRequest {
  /** Search query prompt. */
  prompt: string;
  /** Number of results to return per source (10–200). */
  count?: number | null;
}

/** Query parameters for X search. */
export interface XSearchParams {
  /** Advanced search query. */
  query: string;
  /** Sort by Top or Latest. */
  sort?: XSearchSort | null;
  /** User to search for. */
  user?: string | null;
  /** Start date in UTC (YYYY-MM-DD format). */
  start_date?: string | null;
  /** End date in UTC (YYYY-MM-DD format). */
  end_date?: string | null;
  /** Language code (e.g., en, es, fr). */
  lang?: string | null;
  /** Filter for verified users. */
  verified?: boolean | null;
  /** Filter for blue checkmark verified users. */
  blue_verified?: boolean | null;
  /** Include only tweets with quotes. */
  is_quote?: boolean | null;
  /** Include only tweets with videos. */
  is_video?: boolean | null;
  /** Include only tweets with images. */
  is_image?: boolean | null;
  /** Minimum number of retweets. */
  min_retweets?: number | string | null;
  /** Minimum number of replies. */
  min_replies?: number | string | null;
  /** Minimum number of likes. */
  min_likes?: number | string | null;
  /** Number of tweets to retrieve (1–100). */
  count?: number | null;
}

/** Query parameters for fetching posts by URLs. */
export interface XPostsByUrlsParams {
  /** List of post URLs to retrieve. */
  urls: string[];
}

/** Query parameters for fetching a post by ID. */
export interface XPostByIdParams {
  /** The unique post ID. */
  id: string;
}

/** Query parameters for searching posts by user. */
export interface XPostsByUserParams {
  /** User to search for. */
  user: string;
  /** Advanced search query. */
  query?: string;
  /** Number of tweets to retrieve (1–100). */
  count?: number;
}

/** Query parameters for getting retweeters of a post. */
export interface XPostRetweetersParams {
  /** The ID of the post to get retweeters for. */
  id: string;
  /** Cursor for pagination. */
  cursor?: string | null;
}

/** Query parameters for getting a user's timeline posts. */
export interface XUserPostsParams {
  /** Username to fetch posts for. */
  username: string;
  /** Cursor for pagination. */
  cursor?: string | null;
}

/** Query parameters for fetching a user's tweets and replies. */
export interface XUserRepliesParams {
  /** The username of the user to search for. */
  user: string;
  /** The number of tweets to fetch (1–100). */
  count?: number;
  /** Advanced search query. */
  query?: string;
}

/** Query parameters for fetching replies to a specific post. */
export interface XPostRepliesParams {
  /** The ID of the post to search for. */
  post_id: string;
  /** The number of tweets to fetch (1–100). */
  count?: number;
  /** Advanced search query. */
  query?: string;
}

/** Query parameters for SERP web search. */
export interface WebSearchParams {
  /** The search query string. */
  query: string;
  /** Number of results to skip for pagination (0, 10, 20, ...). */
  start?: number;
}

/** Query parameters for web crawl. */
export interface WebCrawlParams {
  /** URL to crawl. */
  url: string;
  /** Format of the content to be returned ('html' or 'text'). */
  format?: CrawlFormat;
}

// ============================================================
// Response Types
// ============================================================

/** A single search result item with title, snippet, and link. */
export interface WebSearchResultItem {
  /** Title of the search result. */
  title: string;
  /** Snippet or summary of the search result. */
  snippet: string;
  /** URL link of the search result. */
  link: string;
}

/** Response data for AI contextual search. */
export interface ResponseData {
  /** Search results from Hacker News. */
  hacker_news_search?: Record<string, string | number>[] | null;
  /** Search results from Reddit. */
  reddit_search?: Record<string, string | number>[] | null;
  /** General web search results. */
  search?: Record<string, string | number>[] | null;
  /** Search results from YouTube. */
  youtube_search?: Record<string, string | number>[] | null;
  /** Tweets related to the search query. */
  tweets?: Record<string, string | number>[] | null;
  /** Additional text related to the search query. */
  text?: string | null;
  /** Miner link scores mapping URLs to score levels. */
  miner_link_scores?: Record<string, string> | null;
  /** AI-generated completion text. */
  completion?: string | null;
}

/** Union type for AI search response. */
export type AiSearchResponse = ResponseData | Record<string, unknown> | string;

/** Response for AI web links search. */
export interface WebSearchResponse {
  /** YouTube search results. */
  youtube_search_results: WebSearchResultItem[] | null;
  /** Hacker News search results. */
  hacker_news_search_results: WebSearchResultItem[] | null;
  /** Reddit search results. */
  reddit_search_results: WebSearchResultItem[] | null;
  /** arXiv search results. */
  arxiv_search_results: WebSearchResultItem[] | null;
  /** Wikipedia search results. */
  wikipedia_search_results: WebSearchResultItem[] | null;
  /** General web search results. */
  search_results: WebSearchResultItem[] | null;
}

/** Response for AI X links search. */
export interface XLinksSearchResponse {
  /** Miner tweets matching the search prompt. */
  miner_tweets: TwitterScraperTweet[];
}

/** Response for X retweeters. */
export interface XRetweetersResponse {
  /** List of users who retweeted the post. */
  users: TwitterScraperUser[];
  /** Cursor for pagination. */
  next_cursor?: string | null;
}

/** Response for X user posts (timeline). */
export interface XUserPostsResponse {
  /** The user object. */
  user: TwitterScraperUser;
  /** List of timeline tweets. */
  tweets: TwitterScraperTweet[];
  /** Cursor for pagination. */
  next_cursor?: string | null;
}

/** Response for SERP web search. */
export interface WebSearchResultsResponse {
  /** Array of web search result items. */
  data: WebSearchResultItem[];
}

// ============================================================
// Twitter / X Data Models
// ============================================================

/** Represents a tweet/post from X (Twitter). */
export interface TwitterScraperTweet {
  /** The user who posted the tweet. */
  user?: TwitterScraperUser | null;
  /** Unique tweet ID. */
  id: string;
  /** Tweet text content. */
  text: string;
  /** Number of replies. */
  reply_count: number;
  /** Number of views. */
  view_count?: number | null;
  /** Number of retweets. */
  retweet_count: number;
  /** Number of likes. */
  like_count: number;
  /** Number of quotes. */
  quote_count: number;
  /** Number of bookmarks. */
  bookmark_count: number;
  /** URL of the tweet. */
  url?: string | null;
  /** Creation timestamp. */
  created_at: string;
  /** Media attachments. */
  media?: TwitterScraperMedia[] | null;
  /** Whether this is a quote tweet. */
  is_quote_tweet?: boolean | null;
  /** Whether this is a retweet. */
  is_retweet?: boolean | null;
  /** Tweet language code. */
  lang?: string | null;
  /** Conversation thread ID. */
  conversation_id?: string | null;
  /** Username being replied to. */
  in_reply_to_screen_name?: string | null;
  /** Tweet ID being replied to. */
  in_reply_to_status_id?: string | null;
  /** User ID being replied to. */
  in_reply_to_user_id?: string | null;
  /** Quoted tweet ID. */
  quoted_status_id?: string | null;
  /** Quoted tweet object. */
  quote?: TwitterScraperTweet | null;
  /** Reply tweets. */
  replies?: TwitterScraperTweet[] | null;
  /** Text display range indices. */
  display_text_range?: number[] | null;
  /** Tweet entities (hashtags, URLs, mentions). */
  entities?: TwitterScraperEntities | null;
  /** Extended entities for media. */
  extended_entities?: TwitterScraperExtendedEntities | null;
  /** Retweeted tweet object. Available for user posts endpoint only. */
  retweet?: TwitterScraperTweet | null;
}

/** Simplified media object on a tweet. */
export interface TwitterScraperMedia {
  /** URL of the media. */
  media_url?: string;
  /** Type of media (photo, video, animated_gif). */
  type?: string;
}

/** Entities contained within a tweet. */
export interface TwitterScraperEntities {
  /** Hashtags in the tweet. */
  hashtags?: TwitterScraperEntitiesSymbol[] | null;
  /** Media attachments. */
  media?: TwitterScraperEntitiesMedia[] | null;
  /** Cashtags/symbols. */
  symbols?: TwitterScraperEntitiesSymbol[] | null;
  /** Timestamp entities. */
  timestamps?: unknown[] | null;
  /** URLs in the tweet. */
  urls?: TwitterScraperEntityUrl[] | null;
  /** Mentioned users. */
  user_mentions?: TwitterScraperEntitiesUserMention[] | null;
}

/** Extended entities for media attachments. */
export interface TwitterScraperExtendedEntities {
  /** Extended media information for multiple attachments. */
  media?: TwitterScraperEntitiesMedia[] | null;
}

/** A hashtag or cashtag symbol entity. */
export interface TwitterScraperEntitiesSymbol {
  /** Character indices of the symbol in tweet text. */
  indices: number[];
  /** The symbol text. */
  text: string;
}

/** A URL entity within a tweet. */
export interface TwitterScraperEntityUrl {
  /** Display URL. */
  display_url: string;
  /** Expanded full URL. */
  expanded_url?: string | null;
  /** Shortened URL. */
  url: string;
  /** Character indices in tweet text. */
  indices: number[];
}

/** A user mention entity within a tweet. */
export interface TwitterScraperEntitiesUserMention {
  /** User ID string. */
  id_str: string;
  /** Display name. */
  name: string;
  /** Screen name / username. */
  screen_name: string;
  /** Character indices in tweet text. */
  indices: number[];
}

/** Detailed media entity within a tweet. */
export interface TwitterScraperEntitiesMedia {
  /** Display URL for the media. */
  display_url?: string | null;
  /** Expanded URL for the media. */
  expanded_url?: string | null;
  /** Media ID string. */
  id_str?: string | null;
  /** Character indices in tweet text. */
  indices?: number[] | null;
  /** Media key identifier. */
  media_key?: string | null;
  /** HTTPS URL of the media. */
  media_url_https?: string | null;
  /** Media type: photo, video, or animated_gif. */
  type?: string | null;
  /** Shortened URL. */
  url?: string | null;
  /** Additional media information. */
  additional_media_info?: TwitterScraperEntitiesMediaAdditionalInfo | null;
  /** External media availability status. */
  ext_media_availability?: TwitterScraperEntitiesMediaExtAvailability | null;
  /** Media features like face detection. */
  features?: TwitterScraperEntitiesMediaFeatures | null;
  /** Available media sizes. */
  sizes?: TwitterScraperEntitiesMediaSizes | null;
  /** Original media information. */
  original_info?: TwitterScraperEntitiesMediaOriginalInfo | null;
  /** Download permission status. */
  allow_download_status?: TwitterScraperEntitiesMediaAllowDownloadStatus | null;
  /** Video-specific information. */
  video_info?: TwitterScraperEntitiesMediaVideoInfo | null;
  /** Media result details. */
  media_results?: TwitterScraperEntitiesMediaResults | null;
}

/** Additional info for media entities. */
export interface TwitterScraperEntitiesMediaAdditionalInfo {
  /** Whether the media is monetizable. */
  monetizable?: boolean | null;
  /** Source user information. */
  source_user?: Record<string, unknown> | null;
}

/** External media availability status. */
export interface TwitterScraperEntitiesMediaExtAvailability {
  /** Availability status string. */
  status?: string | null;
}

/** Media features such as face detection results by size. */
export interface TwitterScraperEntitiesMediaFeatures {
  /** Features for large size. */
  large?: TwitterScraperEntitiesMediaFeature | null;
  /** Features for medium size. */
  medium?: TwitterScraperEntitiesMediaFeature | null;
  /** Features for small size. */
  small?: TwitterScraperEntitiesMediaFeature | null;
  /** Features for original size. */
  orig?: TwitterScraperEntitiesMediaFeature | null;
}

/** Face detection results for a specific media size. */
export interface TwitterScraperEntitiesMediaFeature {
  /** Detected faces as rectangles. */
  faces?: Rect[] | null;
}

/** A rectangle region (used for face detection). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Media size dimensions. */
export interface MediaSize {
  /** Width. */
  w: number;
  /** Height. */
  h: number;
  /** Resize strategy. */
  resize?: string | null;
}

/** Available sizes for a media entity. */
export interface TwitterScraperEntitiesMediaSizes {
  /** Large size dimensions. */
  large?: MediaSize | null;
  /** Medium size dimensions. */
  medium?: MediaSize | null;
  /** Small size dimensions. */
  small?: MediaSize | null;
  /** Thumbnail size dimensions. */
  thumb?: MediaSize | null;
}

/** Original media information. */
export interface TwitterScraperEntitiesMediaOriginalInfo {
  /** Original height. */
  height: number;
  /** Original width. */
  width: number;
  /** Focus rectangles. */
  focus_rects?: Rect[] | null;
}

/** Download permission status for media. */
export interface TwitterScraperEntitiesMediaAllowDownloadStatus {
  /** Whether download is allowed. */
  allow_download?: boolean | null;
}

/** Video-specific information for media entities. */
export interface TwitterScraperEntitiesMediaVideoInfo {
  /** Video duration in milliseconds. */
  duration_millis?: number | null;
  /** Aspect ratio as [width, height]. */
  aspect_ratio?: number[] | null;
  /** Available video quality variants. */
  variants?: TwitterScraperEntitiesMediaVideoInfoVariant[] | null;
}

/** A video quality variant. */
export interface TwitterScraperEntitiesMediaVideoInfoVariant {
  /** Content type (e.g., video/mp4). */
  content_type: string;
  /** URL of the video variant. */
  url: string;
  /** Bitrate of the variant. */
  bitrate?: number | null;
}

/** Media result details. */
export interface TwitterScraperEntitiesMediaResults {
  /** The media result object. */
  result?: TwitterScraperEntitiesMediaResult | null;
}

/** Individual media result. */
export interface TwitterScraperEntitiesMediaResult {
  /** Media key identifier. */
  media_key: string;
}

/** Represents an X (Twitter) user. */
export interface TwitterScraperUser {
  /** Unique user ID. */
  id: string;
  /** Profile URL. */
  url?: string | null;
  /** Display name. */
  name?: string | null;
  /** Username / screen name. */
  username: string;
  /** Account creation timestamp. */
  created_at?: string | null;
  /** Profile description / bio. */
  description?: string | null;
  /** Number of favourited tweets. */
  favourites_count?: number | null;
  /** Number of followers. */
  followers_count?: number | null;
  /** Number of accounts followed. */
  followings_count?: number | null;
  /** Number of lists the user is a member of. */
  listed_count?: number | null;
  /** Number of media uploaded. */
  media_count?: number | null;
  /** Profile image URL. */
  profile_image_url?: string | null;
  /** Profile banner URL. */
  profile_banner_url?: string | null;
  /** Total number of statuses (tweets). */
  statuses_count?: number | null;
  /** Whether the user is verified. */
  verified?: boolean | null;
  /** Whether the user has Blue verification. */
  is_blue_verified?: boolean | null;
  /** User profile entities. */
  entities?: TwitterScraperUserEntities | null;
  /** Whether the user allows direct messages. */
  can_dm?: boolean | null;
  /** Whether the user can be tagged in media. */
  can_media_tag?: boolean | null;
  /** User location. */
  location?: string | null;
  /** IDs of pinned tweets. */
  pinned_tweet_ids?: string[] | null;
  /** Professional account information. */
  professional?: TwitterScraperUserProfessional | null;
}

/** Entities in a user profile (description and URL). */
export interface TwitterScraperUserEntities {
  /** Entities in user description. */
  description?: TwitterScraperUserEntitiesDescription | null;
  /** Entities in user profile URL. */
  url?: TwitterScraperUserEntitiesDescription | null;
}

/** URL entities for a user profile section. */
export interface TwitterScraperUserEntitiesDescription {
  /** URLs found in the section. */
  urls?: TwitterScraperEntityUrl[] | null;
}

/** Professional account information. */
export interface TwitterScraperUserProfessional {
  /** Professional type (e.g., Business). */
  professional_type: string;
  /** Professional categories. */
  category: TwitterScraperUserProfessionalCategory[];
}

/** A professional category for a user. */
export interface TwitterScraperUserProfessionalCategory {
  /** Category ID. */
  id: number;
  /** Category name. */
  name: string;
}

// ============================================================
// Error Response Types
// ============================================================

/** Unauthorized error response. */
export interface UnauthorizedResponse {
  detail: Record<string, string | number>;
}

/** Validation error response. */
export interface HTTPValidationError {
  detail?: ValidationError[];
}

/** Individual validation error. */
export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

/** Too many requests error response. */
export interface TooManyRequestsResponse {
  detail: Record<string, string | number>;
}

/** Internal server error response. */
export interface InternalServerErrorResponse {
  detail: Record<string, string | number>;
}

/** Moved permanently response. */
export interface MovedPermanentlyResponse {
  detail: Record<string, string | number>;
}
