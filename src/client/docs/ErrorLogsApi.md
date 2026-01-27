# ErrorLogsApi

All URIs are relative to *https://analytics.searchspring.net/beacon/v2*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**logPersonalization**](ErrorLogsApi.md#logpersonalization) | **POST** /{siteId}/log/personalization | personalization |
| [**logShopifypixel**](ErrorLogsApi.md#logshopifypixel) | **POST** /{siteId}/log/shopifypixel | shopifypixel |
| [**logSnap**](ErrorLogsApi.md#logsnap) | **POST** /{siteId}/log/snap | snap |



## logPersonalization

> InlineObject logPersonalization(siteId, personalizationLogSchema)

personalization

&lt;i&gt;/beacon/v2/{siteId}/log/personalization&lt;/i&gt;&lt;br&gt;&lt;br&gt;Personalization error log events

### Example

```ts
import {
  Configuration,
  ErrorLogsApi,
} from '';
import type { LogPersonalizationRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ErrorLogsApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // PersonalizationLogSchema | Personalization error log
    personalizationLogSchema: ...,
  } satisfies LogPersonalizationRequest;

  try {
    const data = await api.logPersonalization(body);
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
| **personalizationLogSchema** | [PersonalizationLogSchema](PersonalizationLogSchema.md) | Personalization error log | |

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


## logShopifypixel

> InlineObject logShopifypixel(siteId, logSchema)

shopifypixel

&lt;i&gt;/beacon/v2/{siteId}/log/shopifypixel&lt;/i&gt;&lt;br&gt;&lt;br&gt;Shopify Pixel Extension error log events

### Example

```ts
import {
  Configuration,
  ErrorLogsApi,
} from '';
import type { LogShopifypixelRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ErrorLogsApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // LogSchema | Shopify Pixel extension error log
    logSchema: ...,
  } satisfies LogShopifypixelRequest;

  try {
    const data = await api.logShopifypixel(body);
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
| **logSchema** | [LogSchema](LogSchema.md) | Shopify Pixel extension error log | |

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


## logSnap

> InlineObject logSnap(siteId, logSchema)

snap

&lt;i&gt;/beacon/v2/{siteId}/log/snap&lt;/i&gt;&lt;br&gt;&lt;br&gt;Snap error log events

### Example

```ts
import {
  Configuration,
  ErrorLogsApi,
} from '';
import type { LogSnapRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ErrorLogsApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // LogSchema | Snap error log
    logSchema: ...,
  } satisfies LogSnapRequest;

  try {
    const data = await api.logSnap(body);
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
| **logSchema** | [LogSchema](LogSchema.md) | Snap error log | |

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

