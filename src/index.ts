import axios, { AxiosInstance, AxiosResponse } from 'axios';

const BASE_URL = 'https://apis.datura.ai';
const AUTH_HEADER = 'Authorization';

interface DesearchPayload {
  prompt: string;
  tools: ToolEnum[];
  model: ModelEnum;
  date_filter?: DateFilterEnum;
  streaming: boolean;
}

enum ToolEnum {
  WEB_SEARCH = "Web Search",
  HACKER_NEWS_SEARCH = "Hacker News Search",
  REDDIT_SEARCH = "Reddit Search",
  WIKIPEDIA_SEARCH = "Wikipedia Search",
  YOUTUBE_SEARCH = "Youtube Search",
  TWITTER_SEARCH = "Twitter Search",
  ARXIV_SEARCH = "ArXiv Search"
}

enum ModelEnum {
  NOVA = "NOVA",
  ORBIT = "ORBIT",
  HORIZON = "HORIZON"
}

enum DateFilterEnum {
  PAST_24_HOURS = "PAST_24_HOURS",
  PAST_2_DAYS = "PAST_2_DAYS",
  PAST_WEEK = "PAST_WEEK",
  PAST_2_WEEKS = "PAST_2_WEEKS",
  PAST_MONTH = "PAST_MONTH",
  PAST_2_MONTHS = "PAST_2_MONTHS",
  PAST_YEAR = "PAST_YEAR",
  PAST_2_YEARS = "PAST_2_YEARS"
}

// ... existing code ...

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

interface WebSearchPayload {
  query: string;
  num: number;
  start: number;
}

interface LinksSearchWebPayload {
  prompt: string;
  tools: ToolEnum[];
  model?: ModelEnum;
}

interface LinksSearchTwitterPayload {
  prompt: string;
  model?: ModelEnum;
}

// ... existing code ...

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
        console.error('Unexpected Error:', error);
        throw new Error(`Unexpected Error: ${error.message}`);
      }
    }
  }

  async AISearch(payload: DesearchPayload): Promise<any> {
    return this.handleRequest(this.client.post('/desearch/ai/search', payload));
  }

  async searchWebLinks(payload: LinksSearchWebPayload): Promise<any> {
    return this.handleRequest(this.client.post('/desearch/ai/search/links/web', payload));
  }

  async searchTwitterLinks(payload: LinksSearchTwitterPayload): Promise<any> {
    return this.handleRequest(this.client.post('/desearch/ai/search/links/twitter', payload));
  }

  async basicTwitterSearch(payload: TwitterSearchPayload): Promise<any> {
    return this.handleRequest(this.client.post('/twitter', payload));
  }

  async basicWebSearch(payload: WebSearchPayload): Promise<any> {
    return this.handleRequest(this.client.get('/twitter', { params: payload }));
  }
}

export default Datura;