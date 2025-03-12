import axios, { AxiosInstance, AxiosResponse } from 'axios';

const BASE_URL = 'https://apis.datura.ai';
const AUTH_HEADER = 'Authorization';

/**
 * @typedef {Object} DesearchPayload
 * @property {string} prompt - The prompt for the search.
 * @property {Array<'Web Search' | 'Hacker News Search' | 'Reddit Search' | 'Wikipedia Search' | 'Youtube Search' | 'Twitter Search' | 'ArXiv Search'>} tools - The tools to be used in the search.
 * @property {'NOVA' | 'ORBIT' | 'HORIZON'} model - The model to be used for the search.
 * @property {'PAST_24_HOURS' | 'PAST_2_DAYS' | 'PAST_WEEK' | 'PAST_2_WEEKS' | 'PAST_MONTH' | 'PAST_2_MONTHS' | 'PAST_YEAR' | 'PAST_2_YEARS'} [date_filter] - The date filter to apply to the search.
 * @property {boolean} streaming - Whether the search should be streamed.
 */
interface DesearchPayload {
  prompt: string;
  tools: Array<'Web Search' | 'Hacker News Search' | 'Reddit Search' | 'Wikipedia Search' | 'Youtube Search' | 'Twitter Search' | 'ArXiv Search'>;
  model: 'NOVA' | 'ORBIT' | 'HORIZON';
  date_filter?: 'PAST_24_HOURS' | 'PAST_2_DAYS' | 'PAST_WEEK' | 'PAST_2_WEEKS' | 'PAST_MONTH' | 'PAST_2_MONTHS' | 'PAST_YEAR' | 'PAST_2_YEARS';
  streaming: boolean;
}

/**
 * @typedef {Object} TwitterSearchPayload
 * @property {string} query - The search query string.
 * @property {"Top" | "Latest"} [sort] - Sort order of the search results.
 * @property {string} [user] - Specific user to search tweets from.
 * @property {string} [start_date] - Start date for the search.
 * @property {string} [end_date] - End date for the search.
 * @property {string} [lang] - Language of the tweets.
 * @property {boolean} [verified] - Whether to include only verified users.
 * @property {boolean} [blue_verified] - Whether to include only blue verified users.
 * @property {boolean} [is_quote] - Whether to include only quote tweets.
 * @property {boolean} [is_video] - Whether to include only tweets with videos.
 * @property {boolean} [is_image] - Whether to include only tweets with images.
 * @property {number | string} [min_retweets] - Minimum number of retweets.
 * @property {number | string} [min_replies] - Minimum number of replies.
 * @property {number | string} [min_likes] - Minimum number of likes.
 */
interface TwitterSearchPayload {
  query: string;
  sort?: "Top" | "Latest";
  user?: string;
  start_date?: string;
  end_date?: string;
  lang?: string;
  verified?: boolean;
  blue_verified?: boolean;
  is_quote?: boolean;
  is_video?: boolean;
  is_image?: boolean;
  min_retweets?: number | string;
  min_replies?: number | string;
  min_likes?: number | string;
}

/**
 * @typedef {Object} WebSearchPayload
 * @property {string} query - The search query string.
 * @property {number} num - The number of search results to return.
 * @property {number} start - The starting index for the search results.
 */
interface WebSearchPayload {
  query: string;
  num: number;
  start: number;
}

/**
 * @typedef {Object} LinksSearchWebPayload
 * @property {string} prompt - The prompt for the search.
 * @property {Array<'Web Search' | 'Hacker News Search' | 'Reddit Search' | 'Wikipedia Search' | 'Youtube Search' | 'Twitter Search' | 'ArXiv Search'>} tools - The tools to be used in the search.
 * @property {'NOVA' | 'ORBIT' | 'HORIZON'} [model] - The model to be used for the search.
 */
interface LinksSearchWebPayload {
  prompt: string;
  tools: Array<'Web Search' | 'Hacker News Search' | 'Reddit Search' | 'Wikipedia Search' | 'Youtube Search' | 'Twitter Search' | 'ArXiv Search'>;
  model: 'NOVA' | 'ORBIT' | 'HORIZON';
}

/**
 * @typedef {Object} LinksSearchTwitterPayload
 * @property {string} prompt - The prompt for the search.
 * @property {'NOVA' | 'ORBIT' | 'HORIZON'} [model] - The model to be used for the search.
 */
interface LinksSearchTwitterPayload {
  prompt: string;
  model?: 'NOVA' | 'ORBIT' | 'HORIZON';
}


/**
 * @typedef {Object} AISearchResult
 * @property {Object} [youtube_search_results] - Results from YouTube search.
 * @property {Array<Object>} youtube_search_results.organic_results - List of organic search results.
 * @property {string} youtube_search_results.organic_results[].title - Title of the result.
 * @property {string} youtube_search_results.organic_results[].link - Link to the result.
 * @property {string} youtube_search_results.organic_results[].snippet - Snippet of the result.
 * @property {string} youtube_search_results.organic_results[].summary_description - Summary description of the result.
 * 
 * @property {Object} [hacker_news_search_results] - Results from Hacker News search.
 * @property {Array<Object>} hacker_news_search_results.organic_results - List of organic search results.
 * @property {string} hacker_news_search_results.organic_results[].title - Title of the result.
 * @property {string} hacker_news_search_results.organic_results[].link - Link to the result.
 * @property {string} hacker_news_search_results.organic_results[].snippet - Snippet of the result.
 * @property {string} hacker_news_search_results.organic_results[].summary_description - Summary description of the result.
 * 
 * @property {Object} [reddit_search_results] - Results from Reddit search.
 * @property {Array<Object>} reddit_search_results.organic_results - List of organic search results.
 * @property {string} reddit_search_results.organic_results[].title - Title of the result.
 * @property {string} reddit_search_results.organic_results[].link - Link to the result.
 * @property {string} reddit_search_results.organic_results[].snippet - Snippet of the result.
 * @property {string} reddit_search_results.organic_results[].summary_description - Summary description of the result.
 * 
 * @property {Object} [arxiv_search_results] - Results from arXiv search.
 * @property {Array<Object>} arxiv_search_results.organic_results - List of organic search results.
 * @property {string} arxiv_search_results.organic_results[].title - Title of the result.
 * @property {string} arxiv_search_results.organic_results[].link - Link to the result.
 * @property {string} arxiv_search_results.organic_results[].snippet - Snippet of the result.
 * @property {boolean} arxiv_search_results.organic_results[].with_metadata - Whether the result includes metadata.
 * @property {string} arxiv_search_results.organic_results[].summary_description - Summary description of the result.
 * 
 * @property {Object} [wikipedia_search_results] - Results from Wikipedia search.
 * @property {Array<Object>} wikipedia_search_results.organic_results - List of organic search results.
 * @property {string} wikipedia_search_results.organic_results[].title - Title of the result.
 * @property {string} wikipedia_search_results.organic_results[].link - Link to the result.
 * @property {string} wikipedia_search_results.organic_results[].snippet - Snippet of the result.
 * @property {boolean} wikipedia_search_results.organic_results[].with_metadata - Whether the result includes metadata.
 * @property {string} wikipedia_search_results.organic_results[].summary_description - Summary description of the result.
 * 
 * @property {Object} [text_chunks] - Text chunks from the search.
 * @property {string[]} text_chunks.twitter_summary - Summary of Twitter results.
 * 
 * @property {string[]} [search_completion_links] - Links to search completions.
 * @property {string[]} [completion_links] - Links to completions.
 * 
 * @property {Object} [completion] - Completion details.
 * @property {Array<Object>} [completion.key_posts] - Key posts in the completion.
 * @property {string} completion.key_posts[].text - Text of the post.
 * @property {string} completion.key_posts[].url - URL of the post.
 * @property {Array<Object>} [completion.key_tweets] - Key tweets in the completion.
 * @property {string} completion.key_tweets[].text - Text of the tweet.
 * @property {string} completion.key_tweets[].url - URL of the tweet.
 * @property {Array<Object>} [completion.key_news] - Key news articles in the completion.
 * @property {string} completion.key_news[].text - Text of the news article.
 * @property {string} completion.key_news[].url - URL of the news article.
 * @property {Array<Object>} [completion.key_sources] - Key sources in the completion.
 * @property {string} completion.key_sources[].text - Text of the source.
 * @property {string} completion.key_sources[].url - URL of the source.
 * @property {string} [completion.twitter_summary] - Summary of Twitter results.
 * @property {string} [completion.summary] - General summary of the results.
 * @property {string} [completion.reddit_summary] - Summary of Reddit results.
 * @property {string} [completion.hacker_news_summary] - Summary of Hacker News results.
 */
interface AISearchResult {
  youtube_search_results?: {
    organic_results: Array<{
      title: string;
      link: string;
      snippet: string;
      summary_description: string;
    }>;
  };
  hacker_news_search_results?: {
    organic_results: Array<{
      title: string;
      link: string;
      snippet: string;
      summary_description: string;
    }>;
  };
  reddit_search_results?: {
    organic_results: Array<{
      title: string;
      link: string;
      snippet: string;
      summary_description: string;
    }>;
  };
  arxiv_search_results?: {
    organic_results: Array<{
      title: string;
      link: string;
      snippet: string;
      with_metadata: boolean;
      summary_description: string;
    }>;
  };
  wikipedia_search_results?: {
    organic_results: Array<{
      title: string;
      link: string;
      snippet: string;
      with_metadata: boolean;
      summary_description: string;
    }>;
  };
  text_chunks?: {
    twitter_summary: string[];
  };
  search_completion_links?: string[];
  completion_links?: string[];
  completion?: {
    key_posts?: Array<{
      text: string;
      url: string;
    }>;
    key_tweets?: Array<{
      text: string;
      url: string;
    }>;
    key_news?: Array<{
      text: string;
      url: string;
    }>;
    key_sources?: Array<{
      text: string;
      url: string;
    }>;
    twitter_summary?: string;
    summary?: string;
    reddit_summary?: string;
    hacker_news_summary?: string;
  };
}

/**
 * @typedef {Object} webLinksSearchResult
 * @property {Array<Object>} [youtube_search_results] - Results from YouTube search.
 * @property {string} youtube_search_results[].title - Title of the result.
 * @property {string} youtube_search_results[].link - Link to the result.
 * @property {string} youtube_search_results[].snippet - Snippet of the result.
 * @property {string} youtube_search_results[].summary_description - Summary description of the result.
 * 
 * @property {Object} [hacker_news_search_results] - Results from Hacker News search.
 * @property {Array<Object>} hacker_news_search_results.organic_results - List of organic search results.
 * @property {number} hacker_news_search_results.organic_results[].position - Position of the result.
 * @property {string} hacker_news_search_results.organic_results[].title - Title of the result.
 * @property {string} hacker_news_search_results.organic_results[].link - Link to the result.
 * @property {string} hacker_news_search_results.organic_results[].redirect_link - Redirect link of the result.
 * @property {string} hacker_news_search_results.organic_results[].displayed_link - Displayed link of the result.
 * @property {string} hacker_news_search_results.organic_results[].favicon - Favicon of the result.
 * @property {string} hacker_news_search_results.organic_results[].date - Date of the result.
 * @property {string} hacker_news_search_results.organic_results[].snippet - Snippet of the result.
 * @property {string[]} hacker_news_search_results.organic_results[].snippet_highlighted_words - Highlighted words in the snippet.
 * @property {string} hacker_news_search_results.organic_results[].source - Source of the result.
 * 
 * @property {Object} [reddit_search_results] - Results from Reddit search.
 * @property {Array<Object>} reddit_search_results.organic_results - List of organic search results.
 * @property {number} reddit_search_results.organic_results[].position - Position of the result.
 * @property {string} reddit_search_results.organic_results[].title - Title of the result.
 * @property {string} reddit_search_results.organic_results[].link - Link to the result.
 * @property {string} reddit_search_results.organic_results[].redirect_link - Redirect link of the result.
 * @property {string} reddit_search_results.organic_results[].displayed_link - Displayed link of the result.
 * @property {string} reddit_search_results.organic_results[].favicon - Favicon of the result.
 * @property {string} reddit_search_results.organic_results[].snippet - Snippet of the result.
 * @property {string[]} reddit_search_results.organic_results[].snippet_highlighted_words - Highlighted words in the snippet.
 * @property {string} reddit_search_results.organic_results[].source - Source of the result.
 * 
 * @property {Array<Object>} [arxiv_search_results] - Results from arXiv search.
 * @property {string} arxiv_search_results[].title - Title of the result.
 * @property {string} arxiv_search_results[].link - Link to the result.
 * @property {string} arxiv_search_results[].snippet - Snippet of the result.
 * @property {boolean} arxiv_search_results[].with_metadata - Whether the result includes metadata.
 * @property {string} arxiv_search_results[].summary_description - Summary description of the result.
 * 
 * @property {Array<Object>} [wikipedia_search_results] - Results from Wikipedia search.
 * @property {string} wikipedia_search_results[].title - Title of the result.
 * @property {string} wikipedia_search_results[].link - Link to the result.
 * @property {string} wikipedia_search_results[].snippet - Snippet of the result.
 * @property {boolean} wikipedia_search_results[].with_metadata - Whether the result includes metadata.
 * @property {string} wikipedia_search_results[].summary_description - Summary description of the result.
 * 
 * @property {Object} [search_results] - General search results.
 * @property {Array<Object>} search_results.organic_results - List of organic search results.
 * @property {number} search_results.organic_results[].position - Position of the result.
 * @property {string} search_results.organic_results[].title - Title of the result.
 * @property {string} search_results.organic_results[].link - Link to the result.
 * @property {string} search_results.organic_results[].redirect_link - Redirect link of the result.
 * @property {string} search_results.organic_results[].displayed_link - Displayed link of the result.
 * @property {string} search_results.organic_results[].favicon - Favicon of the result.
 * @property {string} search_results.organic_results[].snippet - Snippet of the result.
 * @property {string[]} search_results.organic_results[].snippet_highlighted_words - Highlighted words in the snippet.
 * @property {Object} [search_results.organic_results[].sitelinks] - Sitelinks of the result.
 * @property {Array<Object>} search_results.organic_results[].sitelinks.inline - Inline sitelinks.
 * @property {string} search_results.organic_results[].sitelinks.inline[].title - Title of the sitelink.
 * @property {string} search_results.organic_results[].sitelinks.inline[].link - Link of the sitelink.
 * @property {string} search_results.organic_results[].source - Source of the result.
 */
interface webLinksSearchResult {
  youtube_search_results?: Array<{
    title: string;
    link: string;
    snippet: string;
    summary_description: string;
  }>;
  hacker_news_search_results?: {
    organic_results: Array<{
      position: number;
      title: string;
      link: string;
      redirect_link: string;
      displayed_link: string;
      favicon: string;
      date: string;
      snippet: string;
      snippet_highlighted_words: string[];
      source: string;
    }>;
  };
  reddit_search_results?: {
    organic_results: Array<{
      position: number;
      title: string;
      link: string;
      redirect_link: string;
      displayed_link: string;
      favicon: string;
      snippet: string;
      snippet_highlighted_words: string[];
      source: string;
    }>;
  };
  arxiv_search_results?: Array<{
    title: string;
    link: string;
    snippet: string;
    with_metadata: boolean;
    summary_description: string;
  }>;
  wikipedia_search_results?: Array<{
    title: string;
    link: string;
    snippet: string;
    with_metadata: boolean;
    summary_description: string;
  }>;
  search_results?: {
    organic_results: Array<{
      position: number;
      title: string;
      link: string;
      redirect_link: string;
      displayed_link: string;
      favicon: string;
      snippet: string;
      snippet_highlighted_words: string[];
      sitelinks?: {
        inline: Array<{
          title: string;
          link: string;
        }>;
      };
      source: string;
    }>;
  };
}

/**
 * @typedef {Object} TwitterUser
 * @property {string} id - User ID.
 * @property {string} url - URL of the user's profile.
 * @property {string} name - Name of the user.
 * @property {string} username - Username of the user.
 * @property {string} created_at - Account creation date.
 * @property {string} description - Description of the user.
 * @property {number} favourites_count - Number of favourites.
 * @property {number} followers_count - Number of followers.
 * @property {number} listed_count - Number of times listed.
 * @property {number} media_count - Number of media items.
 * @property {string} profile_image_url - URL of the profile image.
 * @property {number} statuses_count - Number of statuses.
 * @property {boolean} verified - Whether the user is verified.
 */
interface TwitterUser {
  id: string;
  url: string;
  name: string;
  username: string;
  created_at: string;
  description: string;
  favourites_count: number;
  followers_count: number;
  listed_count: number;
  media_count: number;
  profile_image_url: string;
  statuses_count: number;
  verified: boolean;
}

/**
 * @typedef {Object} TwitterTweet
 * @property {TwitterUser} user - The user who posted the tweet.
 * @property {string} id - Tweet ID.
 * @property {string} text - Text of the tweet.
 * @property {number} reply_count - Number of replies.
 * @property {number} retweet_count - Number of retweets.
 * @property {number} like_count - Number of likes.
 * @property {number} view_count - Number of views.
 * @property {number} quote_count - Number of quotes.
 * @property {number} impression_count - Number of impressions.
 * @property {number} bookmark_count - Number of bookmarks.
 * @property {string} url - URL of the tweet.
 * @property {string} created_at - Creation date of the tweet.
 * @property {Array<any>} media - Media attached to the tweet.
 * @property {boolean} is_quote_tweet - Whether the tweet is a quote tweet.
 * @property {boolean} is_retweet - Whether the tweet is a retweet.
 * @property {Object} entities - Entities in the tweet.
 * @property {string} summary_description - Summary description of the tweet.
 */
interface TwitterTweet {
  user: TwitterUser;
  id: string;
  text: string;
  reply_count: number;
  retweet_count: number;
  like_count: number;
  view_count: number;
  quote_count: number;
  impression_count: number;
  bookmark_count: number;
  url: string;
  created_at: string;
  media: any[]; // Adjust type if media structure is known
  is_quote_tweet: boolean;
  is_retweet: boolean;
  entities: Record<string, any>; // Adjust type if entities structure is known
  summary_description: string;
}

/**
 * @typedef {Object} TwitterLinksSearchResult
 * @property {Array<TwitterTweet>} miner_tweets - List of mined tweets.
 */
interface TwitterLinksSearchResult {
  miner_tweets: TwitterTweet[];
}


interface TwitterUser {
  id: string;
  url: string;
  name: string;
  username: string;
  created_at: string;
  description: string;
  favourites_count: number;
  followers_count: number;
  listed_count: number;
  media_count: number;
  profile_image_url: string;
  statuses_count: number;
  verified: boolean;
}

interface TwitterTweet {
  user: TwitterUser;
  id: string;
  text: string;
  reply_count: number;
  retweet_count: number;
  like_count: number;
  view_count: number;
  quote_count: number;
  impression_count: number;
  bookmark_count: number;
  url: string;
  created_at: string;
  media: any[]; // Adjust type if media structure is known
  is_quote_tweet: boolean;
  is_retweet: boolean;
}

type BasicTwitterSearchResult = TwitterTweet[];

interface WebSearchResultItem {
  title: string;
  snippet: string;
  link: string;
  date: string;
  source: string;
  author: string;
  image: string;
  favicon: string;
  highlights: string[];
}

/**
 * @typedef {Object} WebSearchResult
 * @property {Array<WebSearchResultItem>} data - List of web search result items.
 */
interface WebSearchResult {
  data: WebSearchResultItem[];
}

class Datura {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: { [AUTH_HEADER]: apiKey }
    });
  }

  private async handleRequest<T>(request: Promise<AxiosResponse<T>>): Promise<T> {
    try {
      const response = await request;
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Axios-specific error handling
        if (error.response) {
          // Server responded with a status code outside the 2xx range
          console.error('Server Error:', error.response.status, error.response.data);
          throw new Error(`Server Error: ${error.response.status} - ${error.response.data}`);
        } else if (error.request) {
          // Request was made but no response was received
          console.error('Network Error: No response received', error.request);
          throw new Error('Network Error: No response received');
        } else {
          // Something happened in setting up the request
          console.error('Request Setup Error:', error.message);
          throw new Error(`Request Setup Error: ${error.message}`);
        }
      } else {
        // Non-Axios error
        const typedError = error as Error; // Explicitly type the error
        console.error(typedError.message); // Use the typed error
        throw new Error(`Unexpected Error: ${typedError.message}`);
      }
    }
  }

  async AISearch(payload: DesearchPayload): Promise<AISearchResult | string | Record<string, any>> {
    if (payload.streaming) {
      // Handle streaming logic here
      return this.client.post('/desearch/ai/search', payload, { responseType: 'stream' });
    }
    return this.handleRequest(this.client.post('/desearch/ai/search', payload));
  }

  async webLinksSearch(payload: LinksSearchWebPayload): Promise<webLinksSearchResult> {
    return this.handleRequest(this.client.post('/desearch/ai/search/links/web', payload));
  }

  async twitterLinksSearch(payload: LinksSearchTwitterPayload): Promise<TwitterLinksSearchResult> {
    return this.handleRequest(this.client.post('/desearch/ai/search/links/twitter', payload));
  }

  async basicTwitterSearch(payload: TwitterSearchPayload): Promise<BasicTwitterSearchResult> {
    return this.handleRequest(this.client.post('/twitter', payload));
  }

  async basicWebSearch(payload: WebSearchPayload): Promise<WebSearchResult> {
    return this.handleRequest(this.client.get('/twitter', { params: payload }));
  }
}

export default Datura;