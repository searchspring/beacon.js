# CategoryApi

All URIs are relative to *https://analytics.searchspring.net/beacon/v2*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**categoryAddtocart**](CategoryApi.md#categoryaddtocart) | **POST** /{siteId}/category/addtocart | addtocart |
| [**categoryClickthrough**](CategoryApi.md#categoryclickthrough) | **POST** /{siteId}/category/clickthrough | clickthrough |
| [**categoryImpression**](CategoryApi.md#categoryimpression) | **POST** /{siteId}/category/impression | impression |
| [**categoryRender**](CategoryApi.md#categoryrender) | **POST** /{siteId}/category/render | render |



## categoryAddtocart

> InlineObject categoryAddtocart(siteId, addtocartSchema)

addtocart

&lt;i&gt;/beacon/v2/{siteId}/category/addtocart&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper lands on a category results page where Athos Commerce results are rendered, and adds a result to the cart via a &#x60;Quick Add to Cart&#x60; button. **If frontend &#x60;Quick Add to Cart&#x60; is not implemented, omit usage of this endpoint.**

### Example

```ts
import {
  Configuration,
  CategoryApi,
} from '';
import type { CategoryAddtocartRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CategoryApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // AddtocartSchema | Results payload
    addtocartSchema: ...,
  } satisfies CategoryAddtocartRequest;

  try {
    const data = await api.categoryAddtocart(body);
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


## categoryClickthrough

> InlineObject categoryClickthrough(siteId, clickthroughSchema)

clickthrough

&lt;i&gt;/beacon/v2/{siteId}/category/clickthrough&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper lands on a category results page, clicks on a Athos Commerce result, and will be taken to the product detail page (PDP).

### Example

```ts
import {
  Configuration,
  CategoryApi,
} from '';
import type { CategoryClickthroughRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CategoryApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // ClickthroughSchema | Results payload
    clickthroughSchema: ...,
  } satisfies CategoryClickthroughRequest;

  try {
    const data = await api.categoryClickthrough(body);
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


## categoryImpression

> InlineObject categoryImpression(siteId, impressionSchema)

impression

&lt;i&gt;/beacon/v2/{siteId}/category/impression&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper lands on a category results page and Athos Commerce results receive an impression.

### Example

```ts
import {
  Configuration,
  CategoryApi,
} from '';
import type { CategoryImpressionRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CategoryApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // ImpressionSchema | Results payload
    impressionSchema: ...,
  } satisfies CategoryImpressionRequest;

  try {
    const data = await api.categoryImpression(body);
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


## categoryRender

> InlineObject categoryRender(siteId, renderSchema)

render

&lt;i&gt;/beacon/v2/{siteId}/category/render&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper lands on a category results page and Athos Commerce results are rendered.

### Example

```ts
import {
  Configuration,
  CategoryApi,
} from '';
import type { CategoryRenderRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CategoryApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // RenderSchema | Results payload
    renderSchema: ...,
  } satisfies CategoryRenderRequest;

  try {
    const data = await api.categoryRender(body);
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

