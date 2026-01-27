# MessagingRecommendationsApi

All URIs are relative to *https://analytics.searchspring.net/beacon/v2*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**messagingEmailClickthrough**](MessagingRecommendationsApi.md#messagingemailclickthrough) | **POST** /{siteId}/email/clickthrough | email/clickthrough |
| [**messagingEmailRender**](MessagingRecommendationsApi.md#messagingemailrender) | **POST** /{siteId}/email/render | email/render |
| [**messagingSmsClickthrough**](MessagingRecommendationsApi.md#messagingsmsclickthrough) | **POST** /{siteId}/sms/clickthrough | sms/clickthrough |
| [**messagingSmsRender**](MessagingRecommendationsApi.md#messagingsmsrender) | **POST** /{siteId}/sms/render | sms/render |



## messagingEmailClickthrough

> InlineObject messagingEmailClickthrough(siteId, messagingSchema)

email/clickthrough

&lt;i&gt;/beacon/v2/{siteId}/messaging/email/clickthrough&lt;/i&gt;&lt;br&gt;&lt;br&gt;This event tracks when a shopper clicks through a messaging recommendation section in an email and is navigated to the website.

### Example

```ts
import {
  Configuration,
  MessagingRecommendationsApi,
} from '';
import type { MessagingEmailClickthroughRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new MessagingRecommendationsApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // MessagingSchema | Messaging recommendations payload
    messagingSchema: ...,
  } satisfies MessagingEmailClickthroughRequest;

  try {
    const data = await api.messagingEmailClickthrough(body);
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
| **messagingSchema** | [MessagingSchema](MessagingSchema.md) | Messaging recommendations payload | |

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


## messagingEmailRender

> InlineObject messagingEmailRender(siteId, messagingSchema)

email/render

&lt;i&gt;/beacon/v2/{siteId}/messaging/email/render&lt;/i&gt;&lt;br&gt;&lt;br&gt;This event tracks the rendering of a messaging recommendation section in an email.

### Example

```ts
import {
  Configuration,
  MessagingRecommendationsApi,
} from '';
import type { MessagingEmailRenderRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new MessagingRecommendationsApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // MessagingSchema | Messaging recommendations payload
    messagingSchema: ...,
  } satisfies MessagingEmailRenderRequest;

  try {
    const data = await api.messagingEmailRender(body);
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
| **messagingSchema** | [MessagingSchema](MessagingSchema.md) | Messaging recommendations payload | |

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


## messagingSmsClickthrough

> InlineObject messagingSmsClickthrough(siteId, messagingSchema)

sms/clickthrough

&lt;i&gt;/beacon/v2/{siteId}/messaging/sms/clickthrough&lt;/i&gt;&lt;br&gt;&lt;br&gt;This event tracks when a shopper clicks through a SMS recommendation section in an SMS text and is navigated to the website.

### Example

```ts
import {
  Configuration,
  MessagingRecommendationsApi,
} from '';
import type { MessagingSmsClickthroughRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new MessagingRecommendationsApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // MessagingSchema | Messaging recommendations payload
    messagingSchema: ...,
  } satisfies MessagingSmsClickthroughRequest;

  try {
    const data = await api.messagingSmsClickthrough(body);
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
| **messagingSchema** | [MessagingSchema](MessagingSchema.md) | Messaging recommendations payload | |

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


## messagingSmsRender

> InlineObject messagingSmsRender(siteId, messagingSchema)

sms/render

&lt;i&gt;/beacon/v2/{siteId}/messaging/sms/render&lt;/i&gt;&lt;br&gt;&lt;br&gt;This event tracks the rendering of an SMS recommendation section in an SMS text.

### Example

```ts
import {
  Configuration,
  MessagingRecommendationsApi,
} from '';
import type { MessagingSmsRenderRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new MessagingRecommendationsApi();

  const body = {
    // string | Customer siteId found in the Athos Console or Athos Management Console
    siteId: siteId_example,
    // MessagingSchema | Messaging recommendations payload
    messagingSchema: ...,
  } satisfies MessagingSmsRenderRequest;

  try {
    const data = await api.messagingSmsRender(body);
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
| **messagingSchema** | [MessagingSchema](MessagingSchema.md) | Messaging recommendations payload | |

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

