# AutocompleteApi

All URIs are relative to *https://analytics.searchspring.net/beacon/v2*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**autocompleteAddtocart**](AutocompleteApi.md#autocompleteaddtocart) | **POST** /{siteId}/autocomplete/addtocart | addtocart |
| [**autocompleteClickthrough**](AutocompleteApi.md#autocompleteclickthrough) | **POST** /{siteId}/autocomplete/clickthrough | clickthrough |
| [**autocompleteImpression**](AutocompleteApi.md#autocompleteimpression) | **POST** /{siteId}/autocomplete/impression | impression |
| [**autocompleteRedirect**](AutocompleteApi.md#autocompleteredirect) | **POST** /{siteId}/autocomplete/redirect | redirect |
| [**autocompleteRender**](AutocompleteApi.md#autocompleterender) | **POST** /{siteId}/autocomplete/render | render |



## autocompleteAddtocart

> InlineObject autocompleteAddtocart(siteId, addtocartSchema)

addtocart

&lt;i&gt;/beacon/v2/{siteId}/autocomplete/addtocart&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper adds a Athos Commerce autocomplete result to the cart via a &#x60;Quick Add to Cart&#x60; button in the Autocomplete Module. **If frontend &#x60;Quick Add to Cart&#x60; is not implemented, omit usage of this endpoint.**

### Example

```ts
import {
  Configuration,
  AutocompleteApi,
} from '';
import type { AutocompleteAddtocartRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AutocompleteApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // AddtocartSchema | Results payload
    addtocartSchema: ...,
  } satisfies AutocompleteAddtocartRequest;

  try {
    const data = await api.autocompleteAddtocart(body);
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


## autocompleteClickthrough

> InlineObject autocompleteClickthrough(siteId, clickthroughSchema)

clickthrough

&lt;i&gt;/beacon/v2/{siteId}/autocomplete/clickthrough&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper clicks on a Athos Commerce autocomplete search result rendered in the Autocomplete Module, and is taken to the product detail page (PDP).

### Example

```ts
import {
  Configuration,
  AutocompleteApi,
} from '';
import type { AutocompleteClickthroughRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AutocompleteApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // ClickthroughSchema | Results payload
    clickthroughSchema: ...,
  } satisfies AutocompleteClickthroughRequest;

  try {
    const data = await api.autocompleteClickthrough(body);
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


## autocompleteImpression

> InlineObject autocompleteImpression(siteId, impressionSchema)

impression

&lt;i&gt;/beacon/v2/{siteId}/autocomplete/impression&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper views the rendered Athos Commerce autocomplete results in the Autocomplete Module.

### Example

```ts
import {
  Configuration,
  AutocompleteApi,
} from '';
import type { AutocompleteImpressionRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AutocompleteApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // ImpressionSchema | Results payload
    impressionSchema: ...,
  } satisfies AutocompleteImpressionRequest;

  try {
    const data = await api.autocompleteImpression(body);
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


## autocompleteRedirect

> InlineObject autocompleteRedirect(siteId, redirectSchema)

redirect

&lt;i&gt;/beacon/v2/{siteId}/autocomplete/redirect&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper types in the searchbar and an Autocomplete Module with Athos Commerce autocomplete search results are rendered, but a redirect URL is returned in the Autocomplete API response and the shopper is redirected to the returned redirect URL.

### Example

```ts
import {
  Configuration,
  AutocompleteApi,
} from '';
import type { AutocompleteRedirectRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AutocompleteApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // RedirectSchema | Results payload
    redirectSchema: ...,
  } satisfies AutocompleteRedirectRequest;

  try {
    const data = await api.autocompleteRedirect(body);
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


## autocompleteRender

> InlineObject autocompleteRender(siteId, renderSchema)

render

&lt;i&gt;/beacon/v2/{siteId}/autocomplete/render&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper types in the searchbar and an Autocomplete Module with Athos Commerce autocomplete search results are rendered.

### Example

```ts
import {
  Configuration,
  AutocompleteApi,
} from '';
import type { AutocompleteRenderRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AutocompleteApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // RenderSchema | Results payload
    renderSchema: ...,
  } satisfies AutocompleteRenderRequest;

  try {
    const data = await api.autocompleteRender(body);
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

