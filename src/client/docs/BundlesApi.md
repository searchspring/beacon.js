# BundlesApi

All URIs are relative to *https://analytics.athoscommerce.net/beacon/v2*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**bundlesAddtocart**](BundlesApi.md#bundlesaddtocart) | **POST** /{siteId}/bundles/addtocart | addtocart |
| [**bundlesClickthrough**](BundlesApi.md#bundlesclickthrough) | **POST** /{siteId}/bundles/clickthrough | clickthrough |
| [**bundlesImpression**](BundlesApi.md#bundlesimpression) | **POST** /{siteId}/bundles/impression | impression |
| [**bundlesRender**](BundlesApi.md#bundlesrender) | **POST** /{siteId}/bundles/render | render |



## bundlesAddtocart

> InlineObject bundlesAddtocart(siteId, bundlesAddtocartSchema)

addtocart

&lt;i&gt;/beacon/v2/{siteId}/bundles/addtocart&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper adds a Athos Commerce personalized bundle result to the cart via a &#x60;Quick Add to Cart&#x60; button in the rendered product card. **If frontend &#x60;Quick Add to Cart&#x60; is not implemented, omit usage of this endpoint.**

### Example

```ts
import {
  Configuration,
  BundlesApi,
} from '';
import type { BundlesAddtocartRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new BundlesApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // BundlesAddtocartSchema | Bundles payload
    bundlesAddtocartSchema: ...,
  } satisfies BundlesAddtocartRequest;

  try {
    const data = await api.bundlesAddtocart(body);
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
| **bundlesAddtocartSchema** | [BundlesAddtocartSchema](BundlesAddtocartSchema.md) | Bundles payload | |

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


## bundlesClickthrough

> InlineObject bundlesClickthrough(siteId, bundlesClickthroughSchema)

clickthrough

&lt;i&gt;/beacon/v2/{siteId}/bundles/clickthrough&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper clicks on a rendered Athos Commerce personalized bundle result, and is taken to the product detail page (PDP).

### Example

```ts
import {
  Configuration,
  BundlesApi,
} from '';
import type { BundlesClickthroughRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new BundlesApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // BundlesClickthroughSchema | Bundles payload
    bundlesClickthroughSchema: ...,
  } satisfies BundlesClickthroughRequest;

  try {
    const data = await api.bundlesClickthrough(body);
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
| **bundlesClickthroughSchema** | [BundlesClickthroughSchema](BundlesClickthroughSchema.md) | Bundles payload | |

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


## bundlesImpression

> InlineObject bundlesImpression(siteId, bundlesImpressionSchema)

impression

&lt;i&gt;/beacon/v2/{siteId}/bundles/impression&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper scrolls into view rendered Athos Commerce personalized bundle results. Results sent ***must*** only be results in the shoppers view at the time of the event.

### Example

```ts
import {
  Configuration,
  BundlesApi,
} from '';
import type { BundlesImpressionRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new BundlesApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // BundlesImpressionSchema | Bundles payload
    bundlesImpressionSchema: ...,
  } satisfies BundlesImpressionRequest;

  try {
    const data = await api.bundlesImpression(body);
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
| **bundlesImpressionSchema** | [BundlesImpressionSchema](BundlesImpressionSchema.md) | Bundles payload | |

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


## bundlesRender

> InlineObject bundlesRender(siteId, bundlesRenderSchema)

render

&lt;i&gt;/beacon/v2/{siteId}/bundles/render&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper navigates to a page where Athos Commerce personalized bundles are requested from the [Personalized Bundles API endpoint](https://docs.searchspring.com/reference/get-bundles) and rendered on the page.

### Example

```ts
import {
  Configuration,
  BundlesApi,
} from '';
import type { BundlesRenderRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new BundlesApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // BundlesRenderSchema | Bundles payload
    bundlesRenderSchema: ...,
  } satisfies BundlesRenderRequest;

  try {
    const data = await api.bundlesRender(body);
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
| **bundlesRenderSchema** | [BundlesRenderSchema](BundlesRenderSchema.md) | Bundles payload | |

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

