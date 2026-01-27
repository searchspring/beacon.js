# CartApi

All URIs are relative to *https://analytics.searchspring.net/beacon/v2*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**cartAdd**](CartApi.md#cartadd) | **POST** /{siteId}/cart/add | add |
| [**cartRemove**](CartApi.md#cartremove) | **POST** /{siteId}/cart/remove | remove |



## cartAdd

> InlineObject cartAdd(siteId, cartSchema)

add

&lt;i&gt;/beacon/v2/{siteId}/cart/add&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper adds additional item quantities to an item in the cart via the cart page or a slideout cart.

### Example

```ts
import {
  Configuration,
  CartApi,
} from '';
import type { CartAddRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CartApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // CartSchema | Cart update payload
    cartSchema: ...,
  } satisfies CartAddRequest;

  try {
    const data = await api.cartAdd(body);
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
| **cartSchema** | [CartSchema](CartSchema.md) | Cart update payload | |

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


## cartRemove

> InlineObject cartRemove(siteId, cartSchema)

remove

&lt;i&gt;/beacon/v2/{siteId}/cart/remove&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopper removes an item or reduces an items quantity in the cart via the cart page or a slideout cart.

### Example

```ts
import {
  Configuration,
  CartApi,
} from '';
import type { CartRemoveRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CartApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // CartSchema | Cart update payload
    cartSchema: ...,
  } satisfies CartRemoveRequest;

  try {
    const data = await api.cartRemove(body);
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
| **cartSchema** | [CartSchema](CartSchema.md) | Cart update payload | |

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

