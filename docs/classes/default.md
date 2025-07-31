[desearch-js](../README.md) / [Exports](../modules.md) / default

# Class: default

## Table of contents

### Constructors

- [constructor](default.md#constructor)

### Properties

- [client](default.md#client)

### Methods

- [AISearch](default.md#aisearch)
- [deepResearch](default.md#deepresearch)
- [handleRequest](default.md#handlerequest)
- [latestTweets](default.md#latesttweets)
- [retweetsForPost](default.md#retweetsforpost)
- [tweeterUser](default.md#tweeteruser)
- [tweetsAndRepliesByUser](default.md#tweetsandrepliesbyuser)
- [tweetsByUser](default.md#tweetsbyuser)
- [twitterById](default.md#twitterbyid)
- [twitterByUrls](default.md#twitterbyurls)
- [twitterLinksSearch](default.md#twitterlinkssearch)
- [twitterRepliesPost](default.md#twitterrepliespost)
- [twitterSearch](default.md#twittersearch)
- [webCrawl](default.md#webcrawl)
- [webLinksSearch](default.md#weblinkssearch)
- [webSearch](default.md#websearch)

## Constructors

### constructor

• **new default**(`apiKey`): [`default`](default.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiKey` | `string` |

#### Returns

[`default`](default.md)

#### Defined in

[index.ts:563](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L563)

## Properties

### client

• `Private` **client**: `AxiosInstance`

#### Defined in

[index.ts:561](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L561)

## Methods

### AISearch

▸ **AISearch**(`payload`): `Promise`\<`string` \| `AISearchResult` \| `Record`\<`string`, `any`\>\>

Performs an AI search with the given payload.

This method sends a POST request to the /desearch/ai/search endpoint with the provided payload.

If the payload contains a streaming property set to true, the method will return a Promise that resolves to a stream of data.
If the payload does not contain a streaming property, or if the property is set to false, the method will return a Promise that resolves to an AISearchResult object.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payload` | `DesearchPayload` | The payload for the AI search. |

#### Returns

`Promise`\<`string` \| `AISearchResult` \| `Record`\<`string`, `any`\>\>

A Promise that resolves to an AISearchResult object, or a stream of data if the payload contains a streaming property set to true.

#### Defined in

[index.ts:624](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L624)

___

### deepResearch

▸ **deepResearch**(`payload`): `Promise`\<`string`\>

Performs an Deep research with the given payload.

This method sends a POST request to the /desearch/deep/search endpoint with the provided payload.

If the payload contains a streaming property set to true, the method will return a Promise that resolves to a stream of data.
If the payload does not contain a streaming property, or if the property is set to false, the method will return a Promise that resolves to an string.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payload` | `DeepResearchPayload` | The payload for the Deep research. |

#### Returns

`Promise`\<`string`\>

A Promise that resolves to an string, or a stream of data if the payload contains a streaming property set to true.

#### Defined in

[index.ts:643](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L643)

___

### handleRequest

▸ **handleRequest**\<`T`\>(`request`): `Promise`\<`T`\>

Handles HTTP requests and processes responses.

If the request is successful, this method returns the JSON response from the server.
If an HTTP error occurs, this method throws an Error with a descriptive message.
If a network error occurs, this method throws an Error with a descriptive message.
If an unexpected error occurs, this method throws an Error with a descriptive message.

#### Type parameters

| Name | Description |
| :------ | :------ |
| `T` | The type of the response data. |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `request` | `Promise`\<`AxiosResponse`\<`T`\>\> | The HTTP request promise. |

#### Returns

`Promise`\<`T`\>

A Promise that resolves to the JSON response from the server.

**`Throws`**

If an HTTP error, network error, or unexpected error occurs.

#### Defined in

[index.ts:584](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L584)

___

### latestTweets

▸ **latestTweets**(`«destructured»`): `Promise`\<`BasicTwitterSearchResult`\>

Performs a latest Tweets search with the given arguments.

#### Parameters

| Name | Type |
| :------ | :------ |
| `«destructured»` | `Object` |
| › `count?` | `number` |
| › `user` | `string` |

#### Returns

`Promise`\<`BasicTwitterSearchResult`\>

The response from the web search.

#### Defined in

[index.ts:755](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L755)

___

### retweetsForPost

▸ **retweetsForPost**(`«destructured»`): `Promise`\<`BasicTwitterSearchResult`\>

Performs a retweets search with the given arguments.

#### Parameters

| Name | Type |
| :------ | :------ |
| `«destructured»` | `Object` |
| › `count?` | `number` |
| › `post_id` | `string` |
| › `query?` | `string` |

#### Returns

`Promise`\<`BasicTwitterSearchResult`\>

The response from the web search.

#### Defined in

[index.ts:792](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L792)

___

### tweeterUser

▸ **tweeterUser**(`user`): `Promise`\<`TwitterUserResponse`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `user` | `string` |

#### Returns

`Promise`\<`TwitterUserResponse`\>

#### Defined in

[index.ts:796](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L796)

___

### tweetsAndRepliesByUser

▸ **tweetsAndRepliesByUser**(`«destructured»`): `Promise`\<`BasicTwitterSearchResult`\>

Performs a tweets and replies search with the given arguments.

#### Parameters

| Name | Type |
| :------ | :------ |
| `«destructured»` | `Object` |
| › `count?` | `number` |
| › `query?` | `string` |
| › `user` | `string` |

#### Returns

`Promise`\<`BasicTwitterSearchResult`\>

The response from the web search.

#### Defined in

[index.ts:767](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L767)

___

### tweetsByUser

▸ **tweetsByUser**(`«destructured»`): `Promise`\<`BasicTwitterSearchResult`\>

Performs a tweets by user search with the given arguments.

#### Parameters

| Name | Type |
| :------ | :------ |
| `«destructured»` | `Object` |
| › `count?` | `number` |
| › `query?` | `string` |
| › `user` | `string` |

#### Returns

`Promise`\<`BasicTwitterSearchResult`\>

The response from the web search.

#### Defined in

[index.ts:744](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L744)

___

### twitterById

▸ **twitterById**(`id`): `Promise`\<`TwitterByUrlsResult`\>

Performs a Twitter search by ID with the given arguments.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | The ID of the tweet to search for. |

#### Returns

`Promise`\<`TwitterByUrlsResult`\>

A Promise that resolves to a TwitterByUrlsResult object.

#### Defined in

[index.ts:732](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L732)

___

### twitterByUrls

▸ **twitterByUrls**(`payload`): `Promise`\<`TwitterByUrlsResult`[]\>

Fetches tweets by their URLs.

This method sends a request to the Twitter API to retrieve tweets based on the provided URLs.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payload` | `string`[] | An array of tweet URLs to search for. |

#### Returns

`Promise`\<`TwitterByUrlsResult`[]\>

A Promise that resolves to an array of TwitterByUrlsResult objects, each containing the user and associated tweets.

#### Defined in

[index.ts:721](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L721)

___

### twitterLinksSearch

▸ **twitterLinksSearch**(`payload`): `Promise`\<`TwitterLinksSearchResult`\>

Performs a Twitter links search with the given payload.

This method sends a POST request to the /desearch/ai/search/links/twitter endpoint with the provided payload.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payload` | `LinksSearchTwitterPayload` | The payload for the Twitter links search. |

#### Returns

`Promise`\<`TwitterLinksSearchResult`\>

The response from the Twitter links search.

#### Defined in

[index.ts:672](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L672)

___

### twitterRepliesPost

▸ **twitterRepliesPost**(`«destructured»`): `Promise`\<`BasicTwitterSearchResult`\>

Performs a tweets and replies search with the given arguments.

#### Parameters

| Name | Type |
| :------ | :------ |
| `«destructured»` | `Object` |
| › `count?` | `number` |
| › `post_id` | `string` |
| › `query?` | `string` |

#### Returns

`Promise`\<`BasicTwitterSearchResult`\>

The response from the web search.

#### Defined in

[index.ts:780](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L780)

___

### twitterSearch

▸ **twitterSearch**(`payload`): `Promise`\<`BasicTwitterSearchResult`\>

Performs a basic Twitter search with the given payload.

This method sends a POST request to the /twitter endpoint with the provided payload.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payload` | `TwitterSearchPayload` | The payload for the basic Twitter search. |

#### Returns

`Promise`\<`BasicTwitterSearchResult`\>

A Promise that resolves to a BasicTwitterSearchResult object.

#### Defined in

[index.ts:684](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L684)

___

### webCrawl

▸ **webCrawl**(`url`): `Promise`\<`string`\>

Performs a web crawl with the given url.

This method sends a GET request to the /web/crawl endpoint with the provided url.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | The url of the website to crawl. |

#### Returns

`Promise`\<`string`\>

A Promise that resolves to a string.

#### Defined in

[index.ts:708](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L708)

___

### webLinksSearch

▸ **webLinksSearch**(`payload`): `Promise`\<`webLinksSearchResult`\>

Performs a web links search with the given payload.

This method sends a POST request to the /desearch/ai/search/links/web endpoint with the provided payload.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payload` | `LinksSearchWebPayload` | The payload for the web links search. |

#### Returns

`Promise`\<`webLinksSearchResult`\>

A Promise that resolves to a webLinksSearchResult object.

#### Defined in

[index.ts:660](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L660)

___

### webSearch

▸ **webSearch**(`payload`): `Promise`\<`WebSearchResult`\>

Performs a basic web search with the given payload.

This method sends a GET request to the /web endpoint with the provided payload.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `payload` | `WebSearchPayload` | The payload for the basic web search. |

#### Returns

`Promise`\<`WebSearchResult`\>

A Promise that resolves to a WebSearchResult object.

#### Defined in

[index.ts:696](https://github.com/Desearch-ai/desearch.js/blob/e74f4707f28994480f6ac15ed81ffa2d1daef02b/src/index.ts#L696)
