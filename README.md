# Desearch

The official TypeScript SDK for the Desearch API — AI-driven search, web crawling, and X (Twitter) data extraction.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [AI Contextual Search](#ai-contextual-search)
- [AI Web Links Search](#ai-web-links-search)
- [AI X Posts Links Search](#ai-x-posts-links-search)
- [X Search](#x-search)
- [Fetch Posts by URLs](#fetch-posts-by-urls)
- [Retrieve Post by ID](#retrieve-post-by-id)
- [Search X Posts by User](#search-x-posts-by-user)
- [Get Retweeters of a Post](#get-retweeters-of-a-post)
- [Get X Posts by Username](#get-x-posts-by-username)
- [Fetch User's Tweets and Replies](#fetch-users-tweets-and-replies)
- [Retrieve Replies for a Post](#retrieve-replies-for-a-post)
- [SERP Web Search](#serp-web-search)
- [Crawl a URL](#crawl-a-url)

## Installation

```bash
npm install desearch-js
```

## Quick Start

```typescript
import Desearch from 'desearch-js';

const desearch = new Desearch('your-api-key');

// Perform an AI-powered search
const results = await desearch.aiSearch({
  prompt: 'Latest developments in AI',
  tools: ['web', 'twitter', 'reddit'],
  streaming: false,
});

console.log(results);
```

## AI Contextual Search

`aiSearch`

AI-powered multi-source contextual search. Searches across web, X (Twitter), Reddit, YouTube, HackerNews, Wikipedia, and arXiv and returns results with optional AI-generated summaries.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | `string` | Yes | — | Search query prompt |
| `tools` | `(ToolEnum \| string)[]` | Yes | — | A list of tools to be used for the search |
| `start_date` | `string \| null` | No | `null` | The start date for the search query (YYYY-MM-DDTHH:MM:SSZ) |
| `end_date` | `string \| null` | No | `null` | The end date for the search query (YYYY-MM-DDTHH:MM:SSZ) |
| `date_filter` | `DateFilterEnum \| null` | No | `'PAST_24_HOURS'` | Predefined date filter for search results |
| `streaming` | `boolean` | No | `false` | Always overridden to false in the SDK |
| `result_type` | `ResultTypeEnum \| null` | No | `'LINKS_WITH_FINAL_SUMMARY'` | The result type for the search |
| `system_message` | `string \| null` | No | `''` | System message for the search |
| `scoring_system_message` | `string \| null` | No | `null` | System message for scoring the response |
| `count` | `number \| null` | No | `10` | Number of results per source (10–200) |

```typescript
desearch.aiSearch({
  prompt: 'Bittensor',
  tools: ['web', 'hackernews', 'reddit', 'wikipedia', 'youtube', 'twitter', 'arxiv'],
  date_filter: 'PAST_24_HOURS',
  streaming: false,
  result_type: 'LINKS_WITH_FINAL_SUMMARY',
  count: 20,
}).then(result => {
  console.log(result);
});
```

## AI Web Links Search

`aiWebLinksSearch`

Search for raw links across web sources (web, HackerNews, Reddit, Wikipedia, YouTube, arXiv). Returns structured link results without AI summaries.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | `string` | Yes | — | Search query prompt |
| `tools` | `(WebToolEnum \| string)[]` | Yes | — | List of tools to search with |
| `count` | `number \| null` | No | `10` | Number of results per source (10–200) |

```typescript
desearch.aiWebLinksSearch({
  prompt: 'What are the recent sport events?',
  tools: ['web', 'hackernews', 'reddit', 'wikipedia', 'youtube', 'arxiv'],
  count: 20,
}).then(result => {
  console.log(result);
});
```

## AI X Posts Links Search

`aiXLinksSearch`

Search for X (Twitter) post links matching a prompt using AI-powered models. Returns tweet objects from the miner network.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prompt` | `string` | Yes | — | Search query prompt |
| `count` | `number \| null` | No | `10` | Number of results per source (10–200) |

```typescript
desearch.aiXLinksSearch({
  prompt: 'What are the recent sport events?',
  count: 20,
}).then(result => {
  console.log(result);
});
```

## X Search

`xSearch`

X (Twitter) search with extensive filtering options: date range, user, language, verification status, media type (image/video/quote), and engagement thresholds (min likes, retweets, replies). Sort by Top or Latest.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | `string` | Yes | — | Advanced search query |
| `sort` | `string \| null` | No | `'Top'` | Sort by Top or Latest |
| `user` | `string \| null` | No | `null` | User to search for |
| `start_date` | `string \| null` | No | `null` | Start date in UTC (YYYY-MM-DD) |
| `end_date` | `string \| null` | No | `null` | End date in UTC (YYYY-MM-DD) |
| `lang` | `string \| null` | No | `null` | Language code (e.g., en, es, fr) |
| `verified` | `boolean \| null` | No | `null` | Filter for verified users |
| `blue_verified` | `boolean \| null` | No | `null` | Filter for blue checkmark verified users |
| `is_quote` | `boolean \| null` | No | `null` | Include only tweets with quotes |
| `is_video` | `boolean \| null` | No | `null` | Include only tweets with videos |
| `is_image` | `boolean \| null` | No | `null` | Include only tweets with images |
| `min_retweets` | `number \| string \| null` | No | `null` | Minimum number of retweets |
| `min_replies` | `number \| string \| null` | No | `null` | Minimum number of replies |
| `min_likes` | `number \| string \| null` | No | `null` | Minimum number of likes |
| `count` | `number \| null` | No | `20` | Number of tweets to retrieve (1–100) |

```typescript
desearch.xSearch({
  query: 'Whats going on with Bittensor',
  sort: 'Top',
  user: 'elonmusk',
  start_date: '2024-12-01',
  end_date: '2025-02-25',
  lang: 'en',
  verified: true,
  blue_verified: true,
  count: 20,
}).then(result => {
  console.log(result);
});
```

## Fetch Posts by URLs

`xPostsByUrls`

Fetch full post data for a list of X (Twitter) post URLs. Returns metadata, content, and engagement metrics for each URL.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `urls` | `string[]` | Yes | — | List of post URLs to retrieve |

```typescript
desearch.xPostsByUrls({
  urls: ['https://x.com/RacingTriple/status/1892527552029499853'],
}).then(result => {
  console.log(result);
});
```

## Retrieve Post by ID

`xPostById`

Fetch a single X (Twitter) post by its unique ID. Returns metadata, content, and engagement metrics.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Yes | — | The unique ID of the post |

```typescript
desearch.xPostById({
  id: '1892527552029499853',
}).then(result => {
  console.log(result);
});
```

## Search X Posts by User

`xPostsByUser`

Search X (Twitter) posts by a specific user, with optional keyword filtering.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `user` | `string` | Yes | — | User to search for |
| `query` | `string` | No | `''` | Advanced search query |
| `count` | `number` | No | `10` | Number of tweets to retrieve (1–100) |

```typescript
desearch.xPostsByUser({
  user: 'elonmusk',
  query: 'Whats going on with Bittensor',
  count: 20,
}).then(result => {
  console.log(result);
});
```

## Get Retweeters of a Post

`xPostRetweeters`

Retrieve the list of users who retweeted a specific post by its ID. Supports cursor-based pagination.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Yes | — | The ID of the post to get retweeters for |
| `cursor` | `string \| null` | No | `null` | Cursor for pagination |

```typescript
desearch.xPostRetweeters({
  id: '1982770537081532854',
}).then(result => {
  console.log(result);
});
```

## Get X Posts by Username

`xUserPosts`

Retrieve a user's timeline posts by their username. Fetches the latest tweets posted by that user. Supports cursor-based pagination.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `username` | `string` | Yes | — | Username to fetch posts for |
| `cursor` | `string \| null` | No | `null` | Cursor for pagination |

```typescript
desearch.xUserPosts({
  username: 'elonmusk',
}).then(result => {
  console.log(result);
});
```

## Fetch User's Tweets and Replies

`xUserReplies`

Fetch tweets and replies posted by a specific user, with optional keyword filtering.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `user` | `string` | Yes | — | The username of the user to search for |
| `count` | `number` | No | `10` | The number of tweets to fetch (1–100) |
| `query` | `string` | No | `''` | Advanced search query |

```typescript
desearch.xUserReplies({
  user: 'elonmusk',
  count: 20,
  query: 'latest news on AI',
}).then(result => {
  console.log(result);
});
```

## Retrieve Replies for a Post

`xPostReplies`

Fetch replies to a specific X (Twitter) post by its post ID.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `post_id` | `string` | Yes | — | The ID of the post to search for |
| `count` | `number` | No | `10` | The number of tweets to fetch (1–100) |
| `query` | `string` | No | `''` | Advanced search query |

```typescript
desearch.xPostReplies({
  post_id: '1234567890',
  count: 20,
  query: 'latest news on AI',
}).then(result => {
  console.log(result);
});
```

## SERP Web Search

`webSearch`

SERP web search. Returns paginated web search results, replicating a typical search engine experience.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | `string` | Yes | — | The search query string |
| `start` | `number` | No | `0` | How many results to skip for pagination (0, 10, 20, etc.) |

```typescript
desearch.webSearch({
  query: 'latest news on AI',
  start: 10,
}).then(result => {
  console.log(result);
});
```

## Crawl a URL

`webCrawl`

Crawl a URL and return its content as plain text or HTML.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | `string` | Yes | — | URL to crawl |
| `format` | `'html' \| 'text'` | No | `'text'` | Format of the content to be returned |

```typescript
desearch.webCrawl({
  url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
  format: 'html',
}).then(result => {
  console.log(result);
});
```
