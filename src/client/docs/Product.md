
# Product

Product details

## Properties

Name | Type
------------ | -------------
`parentId` | string
`uid` | string
`sku` | string
`qty` | number
`price` | number

## Example

```typescript
import type { Product } from ''

// TODO: Update the object below with actual values
const example = {
  "parentId": null,
  "uid": null,
  "sku": null,
  "qty": null,
  "price": null,
} satisfies Product

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Product
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


