# ProductApi

All URIs are relative to *https://analytics.searchspring.net/beacon/v2*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**productPageview**](ProductApi.md#productpageview) | **POST** /{siteId}/product/pageview | pageview |



## productPageview

> InlineObject productPageview(siteId, productPageviewSchema)

pageview

&lt;i&gt;/beacon/v2/{siteId}/product/pageview&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper has navigated to a product detail page (PDP).

### Example

```ts
import {
  Configuration,
  ProductApi,
} from '';
import type { ProductPageviewRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ProductApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // ProductPageviewSchema | Product page view payload
    productPageviewSchema: ...,
  } satisfies ProductPageviewRequest;

  try {
    const data = await api.productPageview(body);
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
| **productPageviewSchema** | [ProductPageviewSchema](ProductPageviewSchema.md) | Product page view payload | |

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

