[datura-js](../README.md) / [Exports](../modules.md) / default

# Class: default

## Table of contents

### Constructors

- [constructor](default.md#constructor)

### Properties

- [client](default.md#client)

### Methods

- [AISearch](default.md#aisearch)
- [basicTwitterSearch](default.md#basictwittersearch)
- [basicWebSearch](default.md#basicwebsearch)
- [handleRequest](default.md#handlerequest)
- [twitterLinksSearch](default.md#twitterlinkssearch)
- [webLinksSearch](default.md#weblinkssearch)

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

[index.ts:498](https://github.com/Datura-ai/datura.js/blob/499c236c58de82321f3f8efb75ce017b6690fbad/src/index.ts#L498)

## Properties

### client

• `Private` **client**: `AxiosInstance`

#### Defined in

[index.ts:496](https://github.com/Datura-ai/datura.js/blob/499c236c58de82321f3f8efb75ce017b6690fbad/src/index.ts#L496)

## Methods

### AISearch

▸ **AISearch**(`payload`): `Promise`\<`string` \| `AISearchResult` \| `Record`\<`string`, `any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | `DesearchPayload` |

#### Returns

`Promise`\<`string` \| `AISearchResult` \| `Record`\<`string`, `any`\>\>

#### Defined in

[index.ts:534](https://github.com/Datura-ai/datura.js/blob/499c236c58de82321f3f8efb75ce017b6690fbad/src/index.ts#L534)

___

### basicTwitterSearch

▸ **basicTwitterSearch**(`payload`): `Promise`\<`BasicTwitterSearchResult`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | `TwitterSearchPayload` |

#### Returns

`Promise`\<`BasicTwitterSearchResult`\>

#### Defined in

[index.ts:550](https://github.com/Datura-ai/datura.js/blob/499c236c58de82321f3f8efb75ce017b6690fbad/src/index.ts#L550)

___

### basicWebSearch

▸ **basicWebSearch**(`payload`): `Promise`\<`WebSearchResult`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | `WebSearchPayload` |

#### Returns

`Promise`\<`WebSearchResult`\>

#### Defined in

[index.ts:554](https://github.com/Datura-ai/datura.js/blob/499c236c58de82321f3f8efb75ce017b6690fbad/src/index.ts#L554)

___

### handleRequest

▸ **handleRequest**\<`T`\>(`request`): `Promise`\<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | `Promise`\<`AxiosResponse`\<`T`\>\> |

#### Returns

`Promise`\<`T`\>

#### Defined in

[index.ts:505](https://github.com/Datura-ai/datura.js/blob/499c236c58de82321f3f8efb75ce017b6690fbad/src/index.ts#L505)

___

### twitterLinksSearch

▸ **twitterLinksSearch**(`payload`): `Promise`\<`TwitterLinksSearchResult`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | `LinksSearchTwitterPayload` |

#### Returns

`Promise`\<`TwitterLinksSearchResult`\>

#### Defined in

[index.ts:546](https://github.com/Datura-ai/datura.js/blob/499c236c58de82321f3f8efb75ce017b6690fbad/src/index.ts#L546)

___

### webLinksSearch

▸ **webLinksSearch**(`payload`): `Promise`\<`webLinksSearchResult`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | `LinksSearchWebPayload` |

#### Returns

`Promise`\<`webLinksSearchResult`\>

#### Defined in

[index.ts:542](https://github.com/Datura-ai/datura.js/blob/499c236c58de82321f3f8efb75ce017b6690fbad/src/index.ts#L542)
