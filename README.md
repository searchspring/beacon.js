# beacon.js

beacon.js is a TypeScript library for sending tracking events to SearchSpring's Beacon API. A full API reference is available [here](https://searchspring.github.io/beacon-oas/)


## Installation

```bash
npm install --save @searchspring/beacon
```

```js
<script src="https://snapui.searchspring.io/beacon.js"></script>
```

## Beacon Globals

```typescript
import { Beacon } from '@searchspring/beacon';

// Initialize Beacon with globals
const beacon = new Beacon({ siteId: 'abc123', currency: { code: 'USD' } });
```

| option | description | default value | required | 
|---|---|:---:|:---:|
| siteId | Required siteId | production | ✔️ |
| currency.code | ISO 4217 currency code |   |   |
| cart | array of current cart products |   |   |
| cart[].parentId | parent product uid |   |   |
| cart[].uid | product uid |   |   |
| cart[].sku | (optional) product sku |   |   |
| cart[].qty | (optional) product qty |   |   |
| cart[].price | (optional) product price |   |   |

## Beacon Config

In addition to providing globals, a config object can be provided as the second parameter.

```typescript
import { Beacon } from '@searchspring/beacon';

// Initialize Beacon with globals and config
const beacon = new Beacon(
    { siteId: 'abc123', currency: { code: 'USD' } },
    { mode: 'development' }
);
```

| option | description | default value | required | 
|---|---|:---:|:---:|
| mode | application mode (production, development) | production |   |
| initiator | unique identifier for the beacon | beaconjs/{version} |   |
| apis | configure various api options |  |   |
| apis.fetch | FetchAPI reference to use | window.fetch |   |
| requesters.personalization.origin | alternative endpoint for personalization preflight api | https://{siteId}.a.searchspring.io |   |
| requesters.personalization.headers | http headers for personalization preflight api | https://{siteId}.a.searchspring.io |   |
| requesters.beacon.origin | alternative endpoint for beacon api | https://beacon.searchspring.io/beacon/v2 |   |
| requesters.beacon.headers | http headers for beacon api | https://beacon.searchspring.io/beacon/v2 |   |
| href | set href | window.location.href |   |
| userAgent | set userAgent | navigator.userAgent |   |


## Tracking Events

This section lists all available events and their corresponding schemas names provided to the `data` object. Refer to the [API reference](https://searchspring.github.io/beacon-oas/) for data payloads and examples for each event.

An optional `siteId` can be provided to each event to override the siteId provided in the Beacon globals constructor.

```typescript
beacon.events.autocomplete.render({
    data,
    siteId: 'abc123'
});
```

### Shopper Login

```typescript
beacon.events.shopper.login({ id: 'shopper-id' });
```

### Autocomplete Render

```typescript
beacon.events.autocomplete.render({ data });
```

### Autocomplete Impression

```typescript
beacon.events.autocomplete.impression({ data });
```

### Autocomplete Add to Cart

```typescript
beacon.events.autocomplete.addToCart({ data });
```

### Autocomplete Click Through

```typescript
beacon.events.autocomplete.clickThrough({ data });
```

### Autocomplete Redirect

```typescript
beacon.events.autocomplete.redirect({ data });
```

### Search Render

```typescript
beacon.events.search.render({ data });
```

### Search Impression

```typescript
beacon.events.search.impression({ data });
```

### Search Add to Cart

```typescript
beacon.events.search.addToCart({ data });
```

### Search Click Through

```typescript
beacon.events.search.clickThrough({ data });
```

### Search Redirect

```typescript
beacon.events.search.redirect({ data });
```

### Category Render

```typescript
beacon.events.category.render({ data });
```

### Category Impression

```typescript
beacon.events.category.impression({ data });
```

### Category Add to Cart

```typescript
beacon.events.category.addToCart({ data });
```

### Category Click Through

```typescript
beacon.events.category.clickThrough({ data });
```

### Recommendations Render

```typescript
beacon.events.recommendations.render({ data });
```

### Recommendations Impression

```typescript
beacon.events.recommendations.impression({ data });
```

### Recommendations Add to Cart

```typescript
beacon.events.recommendations.addToCart({ data });
```

### Recommendations Click Through

```typescript
beacon.events.recommendations.clickThrough({ data });
```

### Product Page View

```typescript
beacon.events.product.pageView({ data });
```

### Cart Add

```typescript
beacon.events.cart.add({ data });
``` 

### Cart Remove

```typescript
beacon.events.cart.remove({ data });
```

### Order Transaction

```typescript
beacon.events.order.transaction({ data });
```


## Methods

### `setCurrency`
If a currency is not provided in the Beacon globals constructor, or if switching currencies, the `setCurrency` method can be used to set the currency code.

```typescript
const beacon = new Beacon({ siteId: 'abc123' });

beacon.setCurrency({ code: 'EUR' })
```


