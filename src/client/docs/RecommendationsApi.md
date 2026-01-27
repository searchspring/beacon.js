# RecommendationsApi

All URIs are relative to *https://analytics.searchspring.net/beacon/v2*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**recommendationsAddtocart**](RecommendationsApi.md#recommendationsaddtocart) | **POST** /{siteId}/recommendations/addtocart | addtocart |
| [**recommendationsClickthrough**](RecommendationsApi.md#recommendationsclickthrough) | **POST** /{siteId}/recommendations/clickthrough | clickthrough |
| [**recommendationsImpression**](RecommendationsApi.md#recommendationsimpression) | **POST** /{siteId}/recommendations/impression | impression |
| [**recommendationsRender**](RecommendationsApi.md#recommendationsrender) | **POST** /{siteId}/recommendations/render | render |



## recommendationsAddtocart

> InlineObject recommendationsAddtocart(siteId, recommendationsAddtocartSchema)

addtocart

&lt;i&gt;/beacon/v2/{siteId}/recommendations/addtocart&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper adds a Athos Commerce personalized recommendation result to the cart via a &#x60;Quick Add to Cart&#x60; button in the rendered product card. **If frontend &#x60;Quick Add to Cart&#x60; is not implemented, omit usage of this endpoint.**

### Example

```ts
import {
  Configuration,
  RecommendationsApi,
} from '';
import type { RecommendationsAddtocartRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new RecommendationsApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // RecommendationsAddtocartSchema | Recommendations payload
    recommendationsAddtocartSchema: ...,
  } satisfies RecommendationsAddtocartRequest;

  try {
    const data = await api.recommendationsAddtocart(body);
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
| **recommendationsAddtocartSchema** | [RecommendationsAddtocartSchema](RecommendationsAddtocartSchema.md) | Recommendations payload | |

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


## recommendationsClickthrough

> InlineObject recommendationsClickthrough(siteId, recommendationsClickthroughSchema)

clickthrough

&lt;i&gt;/beacon/v2/{siteId}/recommendations/clickthrough&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper clicks on a rendered Athos Commerce personalized recommended result, and is taken to the product detail page (PDP).

### Example

```ts
import {
  Configuration,
  RecommendationsApi,
} from '';
import type { RecommendationsClickthroughRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new RecommendationsApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // RecommendationsClickthroughSchema | Recommendations payload
    recommendationsClickthroughSchema: ...,
  } satisfies RecommendationsClickthroughRequest;

  try {
    const data = await api.recommendationsClickthrough(body);
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
| **recommendationsClickthroughSchema** | [RecommendationsClickthroughSchema](RecommendationsClickthroughSchema.md) | Recommendations payload | |

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


## recommendationsImpression

> InlineObject recommendationsImpression(siteId, recommendationsImpressionSchema)

impression

&lt;i&gt;/beacon/v2/{siteId}/recommendations/impression&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper scrolls into view rendered Athos Commerce personalized recommended results. Results sent ***must*** only be results in the shoppers view at the time of the event.

### Example

```ts
import {
  Configuration,
  RecommendationsApi,
} from '';
import type { RecommendationsImpressionRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new RecommendationsApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // RecommendationsImpressionSchema | Recommendations payload
    recommendationsImpressionSchema: ...,
  } satisfies RecommendationsImpressionRequest;

  try {
    const data = await api.recommendationsImpression(body);
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
| **recommendationsImpressionSchema** | [RecommendationsImpressionSchema](RecommendationsImpressionSchema.md) | Recommendations payload | |

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


## recommendationsRender

> InlineObject recommendationsRender(siteId, recommendationsRenderSchema)

render

&lt;i&gt;/beacon/v2/{siteId}/recommendations/render&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper navigates to a page where Athos Commerce personalized recommendations are requested from the [Personalized Recommendations API endpoint](https://docs.searchspring.com/reference/get-recommendations) and rendered on the page.

### Example

```ts
import {
  Configuration,
  RecommendationsApi,
} from '';
import type { RecommendationsRenderRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new RecommendationsApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // RecommendationsRenderSchema | Recommendations payload
    recommendationsRenderSchema: ...,
  } satisfies RecommendationsRenderRequest;

  try {
    const data = await api.recommendationsRender(body);
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
| **recommendationsRenderSchema** | [RecommendationsRenderSchema](RecommendationsRenderSchema.md) | Recommendations payload | |

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

