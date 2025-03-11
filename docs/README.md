datura-js / [Exports](modules.md)

# Datura

Datura API in JavaScript

https://console.datura.ai/

## Installation

`npm install datura-js`

## Usage

Import the package and initialize the Datura client with your API key:

```javascript
    const Datura = require('datura-js');

    const datura = new Datura('your-api-key');
```

## Common requests

```javascript
    
    // Desearch AI Search
    const aiSearchResult = await datura.AISearch({
        prompt: "Bittensor",
        tools: [
            "Web Search",
            "Hacker News Search",
            "Reddit Search",
            "Wikipedia Search",
            "Youtube Search",
            "Twitter Search",
            "ArXiv Search"
        ],
        model: "NOVA",
        date_filter: "PAST_24_HOURS",
        streaming: false,
    });
    console.log(aiSearchResult);

    // Twitter post search
    const twitterLinksResult = await datura.twitterLinksSearch({
        prompt: "Bittensor",
        model: "NOVA",
    });
    console.log(twitterLinksResult);

    // Web links search
    const webLinksResult = await datura.webLinksSearch({
        prompt: "Bittensor",
        tools: [
            "Web Search",
            "Hacker News Search",
            "Reddit Search",
            "Wikipedia Search",
            "Youtube Search",
            "Twitter Search",
            "ArXiv Search"
        ],
        model: "NOVA",
    });
    console.log(webLinksResult);

    // Basic Twitter search
    const basicTwitterResult = await datura.basicTwitterSearch({
        query: "Whats going on with Bittensor",
        sort: "Top",
        user: "elonmusk",
        start_date: "2024-12-01",
        end_date: "2025-02-25",
        lang: "en",
        verified: true,
        blue_verified: true,
        is_quote: true,
        is_video: true,
        is_image: true,
        min_retweets: 1,
        min_replies: 1,
        min_likes: 1
    });
    console.log(basicTwitterResult);

    // Basic Web search
    const basicWebResult = await datura.basicWebSearch({
        query: "latest news on AI",
        num: 10,
        start: 0
    });
    console.log(basicWebResult);

    // Fetch Tweets by URLs
    const twitterByUrlsResult = await datura.twitterByUrls({
        urls: ["https://twitter.com/elonmusk/status/1613000000000000000"]
    });
    console.log(twitterByUrlsResult);

    // Fetch Tweets by ID
    const twitterByIdResult = await datura.twitterById({
        id: "123456789"
    });
    console.log(twitterByIdResult);

```
