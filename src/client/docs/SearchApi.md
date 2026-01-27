# SearchApi

All URIs are relative to *https://analytics.searchspring.net/beacon/v2*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**searchAddtocart**](SearchApi.md#searchaddtocart) | **POST** /{siteId}/search/addtocart | addtocart |
| [**searchClickthrough**](SearchApi.md#searchclickthrough) | **POST** /{siteId}/search/clickthrough | clickthrough |
| [**searchImpression**](SearchApi.md#searchimpression) | **POST** /{siteId}/search/impression | impression |
| [**searchRedirect**](SearchApi.md#searchredirect) | **POST** /{siteId}/search/redirect | redirect |
| [**searchRender**](SearchApi.md#searchrender) | **POST** /{siteId}/search/render | render |



## searchAddtocart

> InlineObject searchAddtocart(siteId, addtocartSchema)

addtocart

&lt;i&gt;/beacon/v2/{siteId}/search/addtocart&lt;/i&gt;&lt;br&gt;&lt;br&gt;This event should be triggered when a shopper lands on a search results page where Athos Commerce search results are rendered, and adds a result to the cart via a &#x60;Quick Add to Cart&#x60; button. **If frontend &#x60;Quick Add to Cart&#x60; is not implemented, omit usage of this endpoint.**

### Example

```ts
import {
  Configuration,
  SearchApi,
} from '';
import type { SearchAddtocartRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SearchApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // AddtocartSchema | Results payload
    addtocartSchema: ...,
  } satisfies SearchAddtocartRequest;

  try {
    const data = await api.searchAddtocart(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **siteId** | `string` | Customer siteId found in the Athos Console or Athos Management Console | [Defaults to `undefined`] |
| **addtocartSchema** | [AddtocartSchema](AddtocartSchema.md) | Results payload | |

### Return type

[**InlineObject**](InlineObject.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `text/plain`, `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |
| **400** | Bad request |  -  |
| **404** | Invalid path |  -  |
| **405** | Invalid request method |  -  |
| **413** | Payload too large |  -  |
| **415** | Unsupported media type |  -  |
| **500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchClickthrough

> InlineObject searchClickthrough(siteId, clickthroughSchema)

clickthrough

&lt;i&gt;/beacon/v2/{siteId}/search/clickthrough&lt;/i&gt;&lt;br&gt;&lt;br&gt;This event should be triggered when a shopper lands on a search results page, clicks on a Athos Commerce search result, and will be taken to the product detail page (PDP).

### Example

```ts
import {
  Configuration,
  SearchApi,
} from '';
import type { SearchClickthroughRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SearchApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // ClickthroughSchema | Results payload
    clickthroughSchema: ...,
  } satisfies SearchClickthroughRequest;

  try {
    const data = await api.searchClickthrough(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **siteId** | `string` | Customer siteId found in the Athos Console or Athos Management Console | [Defaults to `undefined`] |
| **clickthroughSchema** | [ClickthroughSchema](ClickthroughSchema.md) | Results payload | |

### Return type

[**InlineObject**](InlineObject.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `text/plain`, `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |
| **400** | Bad request |  -  |
| **404** | Invalid path |  -  |
| **405** | Invalid request method |  -  |
| **413** | Payload too large |  -  |
| **415** | Unsupported media type |  -  |
| **500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchImpression

> InlineObject searchImpression(siteId, impressionSchema)

impression

&lt;i&gt;/beacon/v2/{siteId}/search/impression&lt;/i&gt;&lt;br&gt;&lt;br&gt;This event should be triggered when a shopper lands on a search results page and Athos Commerce search results receive an impression.

### Example

```ts
import {
  Configuration,
  SearchApi,
} from '';
import type { SearchImpressionRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SearchApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // ImpressionSchema | Results payload
    impressionSchema: ...,
  } satisfies SearchImpressionRequest;

  try {
    const data = await api.searchImpression(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **siteId** | `string` | Customer siteId found in the Athos Console or Athos Management Console | [Defaults to `undefined`] |
| **impressionSchema** | [ImpressionSchema](ImpressionSchema.md) | Results payload | |

### Return type

[**InlineObject**](InlineObject.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `text/plain`, `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |
| **400** | Bad request |  -  |
| **404** | Invalid path |  -  |
| **405** | Invalid request method |  -  |
| **413** | Payload too large |  -  |
| **415** | Unsupported media type |  -  |
| **500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchRedirect

> InlineObject searchRedirect(siteId, redirectSchema)

redirect

&lt;i&gt;/beacon/v2/{siteId}/search/redirect&lt;/i&gt;&lt;br&gt;&lt;br&gt;This event should be triggered after a shopper lands on a search results page where Athos Commerce search results are rendered, but a redirect URL is returned in the Search API response and the shopper is redirected to the returned redirect URL.

### Example

```ts
import {
  Configuration,
  SearchApi,
} from '';
import type { SearchRedirectRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SearchApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // RedirectSchema | Results payload
    redirectSchema: ...,
  } satisfies SearchRedirectRequest;

  try {
    const data = await api.searchRedirect(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **siteId** | `string` | Customer siteId found in the Athos Console or Athos Management Console | [Defaults to `undefined`] |
| **redirectSchema** | [RedirectSchema](RedirectSchema.md) | Results payload | |

### Return type

[**InlineObject**](InlineObject.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `text/plain`, `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |
| **400** | Bad request |  -  |
| **404** | Invalid path |  -  |
| **405** | Invalid request method |  -  |
| **413** | Payload too large |  -  |
| **415** | Unsupported media type |  -  |
| **500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchRender

> InlineObject searchRender(siteId, renderSchema)

render

&lt;i&gt;/beacon/v2/{siteId}/search/render&lt;/i&gt;&lt;br&gt;&lt;br&gt;This event should be triggered when a shopper lands on a search results page and Athos Commerce search results are rendered.

### Example

```ts
import {
  Configuration,
  SearchApi,
} from '';
import type { SearchRenderRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SearchApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // RenderSchema | Results payload
    renderSchema: ...,
  } satisfies SearchRenderRequest;

  try {
    const data = await api.searchRender(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **siteId** | `string` | Customer siteId found in the Athos Console or Athos Management Console | [Defaults to `undefined`] |
| **renderSchema** | [RenderSchema](RenderSchema.md) | Results payload | |

### Return type

[**InlineObject**](InlineObject.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `text/plain`, `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |
| **400** | Bad request |  -  |
| **404** | Invalid path |  -  |
| **405** | Invalid request method |  -  |
| **413** | Payload too large |  -  |
| **415** | Unsupported media type |  -  |
| **500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

