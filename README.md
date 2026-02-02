# beacon.js

A TypeScript library for tracking user interactions and analytics events to Athos Commerce's Beacon API. This library enables real-time tracking of user behavior across search, recommendations, autocomplete, and e-commerce interactions.

This package can be used by both Athos Commerce and Searchspring accounts.

## Features

- 🎯 **Multi-Channel Tracking**: Track events from search, autocomplete, recommendations, category pages, and product pages
- 📦 **Smart Batching**: Automatically batches requests for optimal performance
- 💾 **Local Storage Management**: Manages user IDs, session IDs, cart state, and viewed products
- 🔍 **Attribution Tracking**: Built-in support for tracking attribution and campaign sources
- 🎨 **Flexible Configuration**: Support for custom headers, custom fetch implementations, and multiple environments
- 🌍 **Multi-Currency**: Support for tracking transactions in different currencies
- ⚡ **Production Ready**: Optimized for performance with features like keepalive requests and efficient batching

## Installation

### CDN

To use the beacon via our CDN build, place the following script before the page's closing `</head>` tag:

```html
<script siteId="[REPLACE WITH ATHOS OR SEARCHSPRING SITEID]" src="https://cdn.athoscommerce.net/analytics/beacon.js"></script>
```

The beacon will then be available for usage via `window.athos.tracker`

```html
<script>
  window.athos.tracker.events.search.render({ data: { responseId: '35e5ea31-a537-471b-ba2b-6eea9caebe62' }})
</script>
```


Utilizing this package via the CDN is preferred if you either:

- plan on integrating Athos API and are not sending events directly to the beacon endpoint. 

OR

- You are actively developing an integration, however would like to start tracking events before going live with the integration. Note that after going live with a Snap integration, this beacon.js should be removed from the website, however the function calls can remain on the website. The Snap integration will publish an identical reference of this Beacon to the same path: `window.athos.tracker`.


### NPM

If you are integrating Athos via API instead of utilizing Snap, the `@athoscommerce/beacon` package is available to use for your convenience. 

```bash
npm install --save @athoscommerce/beacon
```

```typescript
import { Beacon } from '@athoscommerce/beacon';

// Initialize Beacon with required siteId
const beacon = new Beacon({ 
  siteId: 'abc123',
  currency: { code: 'USD' }
});

// Track an autocomplete render event
beacon.events.autocomplete.render({
  data: {
    // ... render data
  }
});

// Track a product page view
beacon.events.product.pageView({
  data: {
    result: {
      uid: 'product-123',
      sku: 'SKU-123',
      parentId: 'parent-123'
    }
  }
});
```

## Initialization

### Beacon Globals

The first parameter to the `Beacon` constructor contains required and optional global configuration that applies to all tracking events.

```typescript
import { Beacon } from '@athoscommerce/beacon';

const beacon = new Beacon({ siteId: 'abc123' });
```

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| `siteId` | `string` | Your Athos site ID | ✔️ |

### Beacon Config

The second parameter to the `Beacon` constructor provides optional configuration for API behavior and request handling.

```typescript
const beacon = new Beacon(
  { siteId: 'abc123' },
  {
    mode: 'development',
    initiator: 'my-app/1.0.0',
    requesters: {
      beacon: {
        origin: 'https://custom-beacon.example.com/beacon/v2',
        headers: { 'Authorization': 'Bearer token' }
      },
      personalization: {
        origin: 'https://custom-personalization.example.com',
        headers: { 'X-Custom-Header': 'value' }
      }
    },
    apis: {
      fetch: customFetchImplementation
    },
    href: 'https://example.com/page',
    userAgent: 'Custom User Agent'
  }
);
```

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `mode` | `'production' \| 'development'` | Application mode. In development mode, errors are logged to console | `'production'` |
| `initiator` | `string` | Identifier for the beacon instance | `beaconjs/{version}` |
| `apis.fetch` | `FetchAPI` | Custom fetch implementation | `window.fetch` |
| `requesters.beacon.origin` | `string` | Custom beacon API endpoint | Auto-detected based on siteId |
| `requesters.beacon.headers` | `HTTPHeaders` | Custom headers for beacon API requests | `{ 'Content-Type': 'text/plain' }` |
| `requesters.personalization.origin` | `string` | Custom personalization preflight endpoint | Auto-detected based on siteId |
| `requesters.personalization.headers` | `HTTPHeaders` | Custom headers for personalization requests | |
| `href` | `string` | Override page URL for tracking | `window.location.href` |
| `userAgent` | `string` | Override user agent string | `navigator.userAgent` |


## Common properties

### responseId

The Athos Search, Autocomplete, and Recommendations APIs will return a `responseId` property that is required on most beacon event's payload. It will only be returned if the `beacon=true` parameter is provided to each API. 

```typescript
// Search API Example Response
const response = {
  "breadcrumbs": [...],
  "merchandising": {...},
  "pagination": {...},
  "query": {...},
  "responseId": "f70594d2-c360-4292-8711-b256567099d3"
  "results": [...],
  "sorting": {...},
}

window.athos.tracker.events.search.render({ 
  data: {
    responseId: response.responseId,
  }
});
```

### Merchandising Banner uid

When building the data payload for `banners`, the `uid` property is located within the Banner content. Here is an example of how you may choose to extract it.

```typescript
// Search API Example Response
const response = {
  "merchandising": {
    "content": {
      "header": [
            "<script data-banner-id=\"440998\" data-banner-type=\"html\" data-banner-html=\"<div style=&quot;width: 100%; background: #ADD8E6; text-align: center; padding: 20px;&quot;>On Sale</div>\" type=\"text/widget\"></script><div style=\"width: 100%; background: #ADD8E6; text-align: center; padding: 20px;\">On Sale</div>"
      ],
      "banner": [],
      "footer": [],
      "left": [],
      "inline": []
    }
  }
}
function getMerchandisingBannerUid(response, type) {
  // Extract data-banner-id from the HTML string
  const htmlString = response.merchandising?.content?.[type]?.[0] || '';
  const match = typeof htmlString === 'string' && htmlString.match(/data-banner-id="(\d+)"/);
  const uid = match ? match[1] : '';
  return uid;
}
window.athos.tracker.events.search.impression({ 
  data: {
    responseId: response.responseId,
    results: [],
    banners: [
      { uid: getMerchandisingBannerUid(response, 'header') } // { uid: '440998' }
    ]
  }
});
```


## Tracking Events

The Beacon class provides a comprehensive event tracking system organized by feature area. Each event method accepts a payload object containing the event data. An optional `siteId` can be provided to override the global siteId for a specific event.

### Shopper Events

#### Login

Track when a user logs into their shopper account.

```typescript
window.athos.tracker.events.shopper.login({ 
  data: { id: 'shopper-12345' }
});
```

### Autocomplete Events

Autocomplete events track user interactions within the autocomplete/search suggestions interface.

#### Render

Track when autocomplete suggestions are rendered to the user.

```typescript
window.athos.tracker.events.autocomplete.render({ 
  data: {
    responseId: response.responseId
  }
});
```

#### Impression

Track impressions (visibility) of autocomplete suggestions.

```typescript
window.athos.tracker.events.autocomplete.impression({ 
  data: {
    responseId: response.responseId,
    results: [
      { type: 'product', uid: 'product-1', parentId: 'parent-1', sku: 'SKU-1' },
      { type: 'banner', uid: 'banner-1' }
    ],
    banners: [
      { uid: 'banner-1' }
    ]
  }
});
```

#### Add to Cart

Track when a user adds a product to cart from autocomplete results.

```typescript
window.athos.tracker.events.autocomplete.addToCart({ 
  data: {
    responseId: response.responseId,
    results: [
      { 
        uid: 'product-1', 
        parentId: 'parent-1',
        sku: 'SKU-1', 
        qty: 1, 
        price: 29.99 
      }
    ]
  }
});
```

This method automatically manages the stored cart state.

#### Click Through

Track when a user clicks on an autocomplete suggestion.

```typescript
window.athos.tracker.events.autocomplete.clickThrough({ 
  data: {
    responseId: response.responseId,
    results: [
      { 
        type: 'product', 
        uid: 'product-1', 
        parentId: 'parent-1',
        sku: 'SKU-1'
      }
    ]
  }
});
```

#### Redirect

Track when an autocomplete suggestion causes a page redirect.

```typescript
const redirectUrl = response.merchandising?.redirect; // 'https://example.com/sale-page'
window.athos.tracker.events.autocomplete.redirect({ 
  data: {
    redirect: redirectUrl,
    responseId: response.responseId
  }
});
```

### Search Events

Search events track user interactions within search results pages.

#### Render

```typescript
window.athos.tracker.events.search.render({ 
  data: {
    responseId: '607bafd1-f624-4e58-afa5-b8b8e90929f5'
  }
});
```

#### Impression

```typescript
window.athos.tracker.events.search.impression({ 
  data: {
    responseId: '607bafd1-f624-4e58-afa5-b8b8e90929f5',
    results: [
      { type: 'product', uid: 'product-1', parentId: 'parent-1', sku: 'SKU-1' },
      { type: 'product', uid: 'product-2', parentId: 'parent-2', sku: 'SKU-2' }
    ],
    banners: [{ uid: 'banner-1' }]
  }
});
```

#### Add to Cart

```typescript
window.athos.tracker.events.search.addToCart({ 
  data: {
    responseId: '607bafd1-f624-4e58-afa5-b8b8e90929f5',
    results: [
      { 
        uid: 'product-1', 
        parentId: 'parent-1',
        sku: 'SKU-1', 
        qty: 1, 
        price: 29.99 
      }
    ]
  }
});
```

#### Click Through

```typescript
window.athos.tracker.events.search.clickThrough({ 
  data: {
    responseId: '607bafd1-f624-4e58-afa5-b8b8e90929f5',
    results: [
      {
        type: 'product',
        uid: 'product-1',
        parentId: 'parent-1',
        sku: 'SKU-1'
      }
    ]
  }
});
```

#### Redirect

```typescript
window.athos.tracker.events.search.redirect({ 
  data: {
    redirect: 'https://example.com/promo',
    responseId: '607bafd1-f624-4e58-afa5-b8b8e90929f5'
  }
});
```

### Category Events

Category events track user interactions on category/listing pages.

#### Render

```typescript
window.athos.tracker.events.category.render({ 
  data: {
    responseId: '50c7aaf3-1909-43cd-8fff-a8e5c4452ddb'
  }
});
```

#### Impression

```typescript
window.athos.tracker.events.category.impression({ 
  data: {
    responseId: '50c7aaf3-1909-43cd-8fff-a8e5c4452ddb',
    results: [
      { type: 'product', uid: 'product-1', parentId: 'parent-1', sku: 'SKU-1' }
    ],
    banners: []
  }
});
```

#### Add to Cart

```typescript
window.athos.tracker.events.category.addToCart({ 
  data: {
    responseId: '50c7aaf3-1909-43cd-8fff-a8e5c4452ddb',
    results: [
      {
        uid: 'product-1',
        parentId: 'parent-1',
        sku: 'SKU-1',
        qty: 1,
        price: 49.99
      }
    ]
  }
});
```

#### Click Through

```typescript
window.athos.tracker.events.category.clickThrough({ 
  data: {
    responseId: '50c7aaf3-1909-43cd-8fff-a8e5c4452ddb',
    results: [
      {
        type: 'product',
        uid: 'product-1',
        parentId: 'parent-1',
        sku: 'SKU-1'
      }
    ]
  }
});
```

### Recommendations Events

Recommendations events track interactions with personalized product recommendations.

#### Render

Track when a recommendation set is rendered to the user.

```typescript
window.athos.tracker.events.recommendations.render({ 
  data: {
    tag: 'homepage-recommendations',
    responseId: '1a304980-27d4-4f4b-96cc-758b280dfa7a'
  }
});
```

#### Impression

Track impressions of recommended products.

```typescript
window.athos.tracker.events.recommendations.impression({ 
  data: {
    tag: 'homepage-recommendations',
    responseId: '1a304980-27d4-4f4b-96cc-758b280dfa7a',
    results: [
      { type: 'product', uid: 'product-1', parentId: 'parent-1', sku: 'SKU-1' },
      { type: 'product', uid: 'product-2', parentId: 'parent-2', sku: 'SKU-2' }
    ],
    banners: []
  }
});
```

#### Add to Cart

Track when a user adds a recommended product to cart.

```typescript
window.athos.tracker.events.recommendations.addToCart({ 
  data: {
    tag: 'homepage-recommendations',
    responseId: '1a304980-27d4-4f4b-96cc-758b280dfa7a',
    results: [
      {
        uid: 'product-1',
        parentId: 'parent-1',
        sku: 'SKU-1',
        qty: 1,
        price: 39.99
      }
    ]
  }
});
```

#### Click Through

Track clicks on recommended products.

```typescript
window.athos.tracker.events.recommendations.clickThrough({ 
  data: {
    tag: 'homepage-recommendations',
    responseId: '1a304980-27d4-4f4b-96cc-758b280dfa7a',
    results: [
      {
        type: 'product',
        uid: 'product-1',
        parentId: 'parent-1',
        sku: 'SKU-1'
      }
    ]
  }
});
```

### Product Events

#### Page View

Track product page views. This automatically updates the viewed products history.

```typescript
window.athos.tracker.events.product.pageView({ 
  data: {
    result: {
      uid: 'product-123',
      parentId: 'parent-123',
      sku: 'SKU-123'
    }
  }
});
```

### Cart Events

#### Add

Track when products are added to the cart.

```typescript
window.athos.tracker.events.cart.add({ 
  data: {
    results: [
      { 
        uid: 'product-1', 
        parentId: 'parent-1',
        sku: 'SKU-1', 
        qty: 1, 
        price: 29.99 
      }
    ],
    cart: [
      { 
        uid: 'product-1', 
        parentId: 'parent-1',
        sku: 'SKU-1', 
        qty: 1, 
        price: 29.99 
      },
      { 
        uid: 'product-2', 
        parentId: 'parent-2',
        sku: 'SKU-2', 
        qty: 2, 
        price: 19.99 
      }
    ]
  }
});
```

The cart state is automatically managed and synchronized with storage.

#### Remove

Track when products are removed from the cart.

```typescript
window.athos.tracker.events.cart.remove({ 
  data: {
    results: [
      { uid: 'product-1', parentId: 'parent-1', sku: 'SKU-1', qty: 1 }
    ],
    cart: [
      { 
        uid: 'product-2', 
        parentId: 'parent-2',
        sku: 'SKU-2', 
        qty: 2, 
        price: 19.99 
      }
    ]
  }
});
```

### Order Events

#### Transaction

Track completed transactions/orders.

```typescript
window.athos.tracker.events.order.transaction({ 
  data: {
    orderId: 'order-12345',
    transactionTotal: 119.97,
    total: 129.97,
    vat: 0.20,
    city: 'New York',
    state: 'NY',
    country: 'US',
    results: [
      { 
        uid: 'product-1', 
        parentId: 'parent-1',
        sku: 'SKU-1', 
        qty: 2, 
        price: 29.99 
      },
      { 
        uid: 'product-2', 
        parentId: 'parent-2',
        sku: 'SKU-2', 
        qty: 1, 
        price: 60.00 
      }
    ]
  }
});
```

This method automatically clears the stored cart after tracking the transaction.

### Error Tracking Events

#### Shopify Pixel Errors

Track errors from Shopify pixel implementations.

```typescript
window.athos.tracker.events.error.shopifypixel({ 
  data: {
    message: 'Product not found',
    stack: 'Error: Product not found\n  at fetchProduct (app.js:45)',
    details: { 
      productId: 'abc-123',
      endpoint: '/api/products/abc-123'
    }
  }
});
```

#### SNAP Errors

Track errors from SNAP implementations.

```typescript
window.athos.tracker.events.error.snap({ 
  data: {
    message: 'Failed to load recommendations',
    stack: 'Error: Network timeout\n  at loadRecs (snap.js:120)',
    details: { 
      tag: 'homepage-recs',
      timeout: 5000
    }
  }
});
```


## Storage Management

Beacon automatically manages local storage and cookies to maintain user state across sessions. This includes:

- **User IDs**: Persisted for 18 months
- **Session IDs**: Persisted for 30 minutes
- **Cart**: Current items in the user's cart
- **Viewed Products**: Recently viewed products (up to 20 items)
- **Attribution**: Campaign/attribution source tracking

### Cart Storage API

Access and manipulate the stored cart through the `storage.cart` API:

```typescript
// Get current cart
const cartItems = beacon.storage.cart.get();

// Set cart to specific items
beacon.storage.cart.set([
  { uid: 'p1', sku: 'SKU-1', qty: 2, price: 29.99 }
]);

// Add items to cart
beacon.storage.cart.add([
  { uid: 'p2', sku: 'SKU-2', qty: 1, price: 19.99 }
]);

// Remove items from cart
beacon.storage.cart.remove([
  { uid: 'p1', sku: 'SKU-1', qty: 1 }
]);

// Clear cart
beacon.storage.cart.clear();
```

### Viewed Products Storage API

Access and manipulate the viewed products history:

```typescript
// Get viewed products
const viewedItems = beacon.storage.viewed.get();

// Set viewed products
beacon.storage.viewed.set([
  { uid: 'p1', sku: 'SKU-1' }
]);

// Add to viewed products
beacon.storage.viewed.add([
  { uid: 'p2', sku: 'SKU-2' }
]);
```

## Public API Methods

### `setCurrency(currency: Currency)`

Set or change the currency for tracking transactions.

```typescript
const beacon = new Beacon({ siteId: 'abc123' });

// Set currency if not provided in globals
beacon.setCurrency({ code: 'EUR' });
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `currency.code` | `string` | ISO 4217 currency code |

### `getContext(): Context`

Get the current tracking context including user, session, and page information.

```typescript
const context = beacon.getContext();
// Returns: {
//   userId: 'uuid-...',
//   sessionId: 'uuid-...',
//   pageLoadId: 'uuid-...',
//   pageUrl: 'https://...',
//   userAgent: '...',
//   timestamp: '2024-01-01T...',
//   ...
// }
```

### `updateContext(key: keyof Context, value: any)`

Update specific context properties.

```typescript
beacon.updateContext('userId', 'custom-user-id');
beacon.updateContext('dev', 'development');
beacon.updateContext('pageUrl', 'https://example.com/new-page');
```

### User ID Management

#### `getUserId(): string`

Get or generate the current user ID.

```typescript
const userId = beacon.getUserId();
```

#### `getSessionId(): string`

Get or generate the current session ID (expires after 30 minutes of inactivity).

```typescript
const sessionId = beacon.getSessionId();
```

#### `getShopperId(): string`

Get the current shopper ID if set.

```typescript
const shopperId = beacon.getShopperId();
```

#### `setShopperId(shopperId: string): string | void`

Set the shopper ID and triggers both a login event to the beacon and preflight request for personalization.

```typescript
const result = beacon.setShopperId('shopper-12345');
```

### `getPageLoadId(): string`

Get the current page load ID. Generate a new one with `pageLoad()`.

```typescript
const pageLoadId = beacon.getPageLoadId();
```

### `pageLoad(): string`

Generate a new page load ID. Call this method when tracking page transitions or navigation within a single-page application.

```typescript
const newPageLoadId = beacon.pageLoad();
```

### `getTimestamp(): string`

Get the current timestamp in ISO 8601 format.

```typescript
const timestamp = beacon.getTimestamp();
```

### `sendPreflight(overrides?: PreflightRequestModel): void`

Send preflight data to the personalization API. This is automatically called when cart or shopper state changes, but can be manually triggered if needed.

```typescript
beacon.sendPreflight();

// With overrides
beacon.sendPreflight({
  userId: 'custom-user-id',
  siteId: 'custom-site-id',
  shopper: 'shopper-123',
  cart: [/* products */],
  lastViewed: [/* products */]
});
```

### `generateId(): string`

Generate and returns a new UUID. 

```typescript
const id = beacon.generateId();
```

## Advanced Usage

### Custom Fetch Implementation

For environments where the standard `fetch` API is unavailable or needs to be customized (e.g., adding authentication, request interception), provide a custom fetch implementation:

```typescript
// Custom fetch that adds authentication
const customFetch = async (url, options) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
  return response;
};

const beacon = new Beacon(
  { siteId: 'abc123' },
  {
    apis: {
      fetch: customFetch
    }
  }
);
```

### Custom API Endpoints

Override default API endpoints for internal proxying or custom infrastructure:

```typescript
const beacon = new Beacon(
  { siteId: 'abc123' },
  {
    requesters: {
      beacon: {
        origin: 'https://internal-api.example.com/beacon/v2',
        headers: { 'X-Internal-Key': 'secret' }
      },
      personalization: {
        origin: 'https://internal-api.example.com/personalization',
        headers: { 'X-Internal-Key': 'secret' }
      }
    }
  }
);
```


### Single Page Application (SPA) Support

For single-page applications, generate a new page load ID when the page/view changes:

```typescript
// On navigation
const newPageLoadId = beacon.pageLoad();
console.log('New page load:', newPageLoadId);

// Track that we're now viewing a new product
window.athos.tracker.events.product.pageView({ 
  data: { 
    result: { uid: 'new-product', sku: 'SKU-123' }
  }
});
```

### Context Updates

Update tracking context dynamically as user behavior or application state changes:

```typescript
// Update page URL for client-side routing
beacon.updateContext('pageUrl', window.location.href);
```


### Attribution Tracking

Attribution is automatically captured from url parameters (ie. https://example.com/products?ss_attribution=email:campaign-123) and will be placed on the beacon context.


## Error Handling

### Development Mode

Enabling development mode will prevent beacon events from appearing in reports in the Athos console.

```typescript
const beacon = new Beacon(
  { siteId: 'abc123' },
  { mode: 'development' }
);
```

## License

MIT - See LICENSE file for details


