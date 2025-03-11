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
- [searchTwitterLinks](default.md#searchtwitterlinks)
- [searchWebLinks](default.md#searchweblinks)

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

[index.ts:82](https://github.com/Datura-ai/datura.js/blob/67399829ef4abe36b65350b9c76079abf46a98c3/src/index.ts#L82)

## Properties

### client

• `Private` **client**: `AxiosInstance`

#### Defined in

[index.ts:80](https://github.com/Datura-ai/datura.js/blob/67399829ef4abe36b65350b9c76079abf46a98c3/src/index.ts#L80)

## Methods

### AISearch

▸ **AISearch**(`payload`): `Promise`\<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | `DesearchPayload` |

#### Returns

`Promise`\<`any`\>

#### Defined in

[index.ts:118](https://github.com/Datura-ai/datura.js/blob/67399829ef4abe36b65350b9c76079abf46a98c3/src/index.ts#L118)

___

### basicTwitterSearch

▸ **basicTwitterSearch**(`payload`): `Promise`\<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | `TwitterSearchPayload` |

#### Returns

`Promise`\<`any`\>

#### Defined in

[index.ts:130](https://github.com/Datura-ai/datura.js/blob/67399829ef4abe36b65350b9c76079abf46a98c3/src/index.ts#L130)

___

### basicWebSearch

▸ **basicWebSearch**(`payload`): `Promise`\<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | `WebSearchPayload` |

#### Returns

`Promise`\<`any`\>

#### Defined in

[index.ts:134](https://github.com/Datura-ai/datura.js/blob/67399829ef4abe36b65350b9c76079abf46a98c3/src/index.ts#L134)

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

[index.ts:89](https://github.com/Datura-ai/datura.js/blob/67399829ef4abe36b65350b9c76079abf46a98c3/src/index.ts#L89)

___

### searchTwitterLinks

▸ **searchTwitterLinks**(`payload`): `Promise`\<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | `LinksSearchTwitterPayload` |

#### Returns

`Promise`\<`any`\>

#### Defined in

[index.ts:126](https://github.com/Datura-ai/datura.js/blob/67399829ef4abe36b65350b9c76079abf46a98c3/src/index.ts#L126)

___

### searchWebLinks

▸ **searchWebLinks**(`payload`): `Promise`\<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `payload` | `LinksSearchWebPayload` |

#### Returns

`Promise`\<`any`\>

#### Defined in

[index.ts:122](https://github.com/Datura-ai/datura.js/blob/67399829ef4abe36b65350b9c76079abf46a98c3/src/index.ts#L122)
