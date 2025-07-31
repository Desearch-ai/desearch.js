# Desearch

Desearch API in JavaScript

https://desearch.ai/

## Installation

`npm install desearch-js`

## Usage

Import the package and initialize the Desearch client with your API key:

```javascript
    import Desearch from "desearch-js"

    const desearch = new Desearch('your-api-key')
```

## Common requests

```javascript
    
    // Desearch AI Search
    const aiSearchResult = await desearch.AISearch({
        prompt: "Bittensor",
        tools: [
            "web",
            "hackernews",
            "reddit",
            "wikipedia",
            "youtube",
            "twitter",
            "arxiv"
        ],
        date_filter: "PAST_24_HOURS",
        streaming: false,
        result_type: "LINKS_WITH_SUMMARIES",
        system_message: "",
        count: 10
    });
    console.log(aiSearchResult);

    // Desearch Deep Research
    const deepResearchResult = await desearch.deepResearch({
        prompt: "Bittensor",
        tools: [
            "web",
            "hackernews",
            "reddit",
            "wikipedia",
            "youtube",
            "twitter",
            "arxiv"
        ],
        date_filter: "PAST_24_HOURS",
        streaming: false,
        system_message: "",
    });
    console.log(deepResearchResult);

    // Twitter post search
    const twitterLinksResult = await desearch.twitterLinksSearch({
        prompt: "Bittensor",
        count: 10
    });
    console.log(twitterLinksResult);

    // Web links search
    const webLinksResult = await desearch.webLinksSearch({
        prompt: "Bittensor",
        tools: [
            "web",
            "hackernews",
            "reddit",
            "wikipedia",
            "youtube",
            "arxiv"
        ],
        count: 10
    });
    console.log(webLinksResult);

    // Twitter search
    const twitterResult = await desearch.twitterSearch({
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
        min_likes: 1,
        count: 10
    });
    console.log(twitterResult);

    // Web search
    const webResult = await desearch.webSearch({
        query: "latest news on AI",
        num: 10,
        start: 0
    });
    console.log(webResult);

    // Web crawl
    const webContent = await desearch.webCrawl("https://docs.desearch.ai/docs/desearch-api");
    console.log(webContent);

    // Fetch Tweets by URLs
    const twitterByUrlsResult = await desearch.twitterByUrls( ["https://twitter.com/elonmusk/status/1613000000000000000"]);
    console.log(twitterByUrlsResult);

    // Fetch Tweets by ID
    const twitterByIdResult = await desearch.twitterById('1613000000000000000');
    console.log(twitterByIdResult);

    //Fetch Tweets by User
    const twitterByUserResult = await desearch.tweetsByUser({
        user: "elonmusk",
        query: "Bittensor",
        count: 10
    })
    console.log(twitterByUserResult)

    //Fetch Latest Tweets
    const latestTweetsResult = desearch.latestTweets({
        user: "elonmusk",
        count: 10
    })
    console.log(latestTweetsResult)

    //Fetch Tweets and Replies by User
    const tweetsAndRepliesByUserResult = desearch.tweetsAndRepliesByUser({
        user: "elonmusk",
        query: "Bittensor",
        count: 10
    })
    console.log(tweetsAndRepliesByUserResult)

    
    const twitterRepliesPostResult = desearch.twitterRepliesPost({
        post_id: "1613000000000000000",
        count: 10,
        query: "Bittensor"
    })

    console.log(twitterRepliesPostResult)

    //Fetch Retweets
    const retweetsForPostResult = desearch.retweetsForPost({
        post_id: "1613000000000000000",
        count: 10,
        query: "Bittensor"
    })
    console.log(retweetsForPostResult)

    // Fetch Tweeter User
    const tweeterUserResult = desearch.tweeterUser("elonmusk");
    console.log(tweeterUserResult);
```