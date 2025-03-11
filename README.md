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
    datura.AISearch({
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
    }).then(result => console.log(result));

    // Twitter post search
    datura.twitterLinksSearch({
        prompt: "Bittensor",
        model: "NOVA",
    }).then(result => console.log(result));

    // Web links search
    datura.webLinksSearch({
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
    }).then(result => console.log(result));

    // Basic Twitter search
    datura.basicTwitterSearch({
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
    }).then(result => console.log(result));

    // Basic Web search
    datura.basicWebSearch({
        query: "latest news on AI",
        num: 10,
        start: 0
    }).then(result => console.log(result));

    // Fetch Tweets by URLs
    datura.twitterByUrls({
        urls: ["https://twitter.com/elonmusk/status/1613000000000000000"]
    }).then(result => console.log(result));

    // Fetch Tweets by ID
    datura.twitterById({
        id: "123456789"
    }).then(result => console.log(result));

```