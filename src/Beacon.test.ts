import 'whatwg-fetch';
import {
	additionalRequestKeys,
	appendResults,
	Beacon,
	CART_KEY,
	COOKIE_DOMAIN,
	COOKIE_SAMESITE,
	PayloadRequest,
	REQUEST_GROUPING_TIMEOUT,
} from './Beacon';
import { AutocompleteSchema, CategorySchema, ContextCurrency, Product, RecommendationsSchema } from './client';

const resetAllCookies = () => {
	const cookies = document.cookie.split(';');
	for (let i = 0; i < cookies.length; i++) {
		const cookie = cookies[i];
		const eqPos = cookie.indexOf('=');
		const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
		document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
	}
};

// mocks fetch so beacon client does not make network requests
jest.spyOn(global.window, 'fetch').mockImplementation(() => Promise.resolve({ status: 200, json: () => Promise.resolve({}) } as Response));

describe('Beacon', () => {
	let beacon: Beacon;
	const mockFetchApi = jest.fn().mockResolvedValue(Promise.resolve({ status: 200, json: () => Promise.resolve({}) }));
	const mockGlobals = { siteId: 'test-site-id' };
	const mockConfig = {
		apis: {
			fetch: mockFetchApi,
		},
		mode: 'development' as const,
	};

	// Mock localStorage
	const localStorageMock = (() => {
		let store: Record<string, string> = {};
		return {
			getItem: jest.fn((key: string) => store[key] || null),
			setItem: jest.fn((key: string, value: string) => {
				store[key] = value.toString();
			}),
			removeItem: jest.fn((key: string) => {
				delete store[key];
			}),
			clear: jest.fn(() => {
				store = {};
			}),
		};
	})();

	Object.defineProperty(window, 'localStorage', {
		value: localStorageMock,
	});

	console.error = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		resetAllCookies();
		localStorageMock.clear();
		beacon = new Beacon(mockGlobals, mockConfig);
	});

	describe('Constructor', () => {
		it('should create an instance with default values', () => {
			expect(beacon['globals']).toBe(mockGlobals);
			expect(beacon['config'].mode).toBe('development');
			expect(beacon['pageLoadId']).toStrictEqual(expect.any(String));
		});

		it('should throw an error if siteId is missing', () => {
			expect(() => new Beacon({} as any)).toThrow('Invalid config passed to tracker. The "siteId" attribute must be provided.');
		});
	});

	describe('Storage', () => {
		describe('Cart', () => {
			const multiQuantityTestProduct = { uid: 'multiQuantityText', qty: 3, price: 10 };
			const mockProducts: Product[] = [
				{ uid: 'productUid1', childUid: 'productChildUid1', sku: 'productSku1', childSku: 'productChildSku1', qty: 1, price: 9.99 },
				{ uid: 'productUid2', childUid: 'productChildUid2', sku: 'productSku2', childSku: 'productChildSku2', qty: 2, price: 10.99 },
				{ uid: 'productUid3', childUid: 'productChildUid3', sku: 'productSku3', childSku: 'productChildSku3', qty: 3, price: 0 },
				{ uid: 'productUid4', qty: 3, price: 0 },
				multiQuantityTestProduct,
			];

			it('can set and get cart products', () => {
				beacon.storage.cart.set(mockProducts);

				// beacon cart getter
				const cartData = beacon.storage.cart.get();
				expect(cartData).toEqual(mockProducts);

				// cookie contains cart data
				expect(global.document.cookie).toContain(
					`${CART_KEY}=${encodeURIComponent(mockProducts.map((product) => product.childUid || product.childSku || product.uid || product.sku).join(','))}`
				);

				// localStorage contains cart data
				expect(localStorageMock.setItem).toHaveBeenCalled();
				const data = localStorageMock.getItem(CART_KEY)!;
				expect(data).toBe(JSON.stringify({ value: mockProducts}));

				// can add to exisiting cart data and should be at the front
				const product = { uid: 'productUid5', childUid: 'productChildUid5', sku: 'productSku5', childSku: 'productChildSku5', qty: 1, price: 9.99 };
				beacon.storage.cart.add([product]);

				const updatedCartData = beacon.storage.cart.get();
				expect(updatedCartData).toEqual([product, ...mockProducts]);

				// can remove from cart data
				beacon.storage.cart.remove([product]);
				const removedCartData = beacon.storage.cart.get();
				expect(removedCartData).toEqual(mockProducts);

				// can decrease quantity from exisiting cart data
				const decreaseQuantityBy = 2;
				expect(multiQuantityTestProduct.qty).toBeGreaterThan(decreaseQuantityBy);
				beacon.storage.cart.remove([{ ...multiQuantityTestProduct, qty: decreaseQuantityBy }]);

				const removedSingleQuantityCartData = beacon.storage.cart.get();
				expect(removedSingleQuantityCartData).toEqual([
					...mockProducts.filter((p) => p.uid !== multiQuantityTestProduct.uid),
					{
						...multiQuantityTestProduct,
						qty: multiQuantityTestProduct.qty - decreaseQuantityBy,
					},
				]);

				// can add to exisiting cart data and should be at the front
				const product2 = { uid: 'productUid6', childUid: 'productChildUid6', sku: 'productSku6', childSku: 'productChildSku6', qty: 1, price: 9.99 };
				beacon.storage.cart.add([product2]);
				const addedCartData = beacon.storage.cart.get();
				expect(addedCartData).toEqual([product2, ...removedSingleQuantityCartData]);

				// can add quantity to exisiting sku in cart data
				const increaseQuantityBy = 2;
				const product3 = { ...product2, qty: increaseQuantityBy };
				beacon.storage.cart.add([product3]);
				const increasedCartData = beacon.storage.cart.get();
				expect(increasedCartData).toEqual([{ ...product2, qty: product2.qty + increaseQuantityBy }, ...removedSingleQuantityCartData]);

				// can clear cart data
				beacon.storage.cart.clear();
				const clearedCartData = beacon.storage.cart.get();
				expect(clearedCartData).toEqual([]);
				expect(global.document.cookie).toContain(`${CART_KEY}=;`);
				const rawClearedItem = localStorageMock.getItem(CART_KEY)!;
				expect(rawClearedItem).toBe(JSON.stringify({ value: [] }));
			});
		});
		describe('Methods', () => {
			it('can getStoredId', async () => {
				const id1 = beacon['getStoredId']('key', 0);
				expect(id1).toStrictEqual(expect.any(String));

				await new Promise((resolve) => setTimeout(resolve, 100));

				const id2 = beacon['getStoredId']('key', 0);
				expect(id2).toStrictEqual(expect.any(String));
				expect(id1).toBe(id2);
			});

			it('can getStoredId with expiration', async () => {
				const expiration = 1000;
				const id1 = beacon['getStoredId']('key', expiration);
				expect(id1).toStrictEqual(expect.any(String));

				await new Promise((resolve) => setTimeout(resolve, expiration / 2));

				const id2 = beacon['getStoredId']('key', expiration);
				expect(id2).toStrictEqual(expect.any(String));
				expect(id1).toBe(id2);

				await new Promise((resolve) => setTimeout(resolve, expiration + 100));

				const id3 = beacon['getStoredId']('key', expiration);
				expect(id3).toStrictEqual(expect.any(String));
				expect(id3).not.toBe(id2);
			});
		});
	});

	describe('Beacon methods', () => {
		it('can getContext', () => {
			const context = beacon.getContext();
			expect(context).toEqual({
				userId: expect.any(String),
				sessionId: expect.any(String),
				shopperId: expect.any(String),
				pageLoadId: expect.any(String),
				timestamp: expect.any(String),
				pageUrl: expect.any(String),
				initiator: expect.any(String),
				attribution: undefined,
				userAgent: undefined,
				currency: undefined,
				dev: true,
			});
		});

		it('can persist getContext values', async () => {
			// recreate beacon to contain attribution
			const type = 'attr_type';
			const id = 'attr_value';
			const href = `https://www.example.com/test.html?ss_attribution=${type}:${id}`;
			beacon = new Beacon(mockGlobals, { ...mockConfig, href });

			beacon.setShopperId('test-shopper-id');
			beacon.setCurrency({ code: 'EUR' });

			const context1 = beacon.getContext();
			await new Promise((resolve) => setTimeout(resolve, 100));
			const context2 = beacon.getContext();

			expect(context1.userId).toBe(context2.userId);
			expect(context1.sessionId).toBe(context2.sessionId);
			expect(context1.shopperId).toBe(context2.shopperId);
			expect(context1.pageLoadId).toBe(context2.pageLoadId);
			expect(context1.pageUrl).toBe(context2.pageUrl);
			expect(context1.initiator).toBe(context2.initiator);
			expect(context1.userAgent).toBe(context2.userAgent);
			expect(context1.currency).toStrictEqual(context2.currency);
			expect(context1.attribution).toStrictEqual(context2.attribution);

			// should be different timestamps
			expect(context1.timestamp).not.toBe(context2.timestamp);
		});

		it('can setShopperId and getShopperId', () => {
			// context should not have shopperId initially
			const context = beacon.getContext();
			expect(context.shopperId).toEqual('');

			// storage should not have shopperId initially
			const emptyStoredShopperId = beacon.getShopperId();
			expect(emptyStoredShopperId).toEqual('');

			// set shopperId
			const shopperId = 'test-shopper-id';
			beacon.setShopperId(shopperId);

			// should be stored
			const storedShopperId = beacon.getShopperId();
			expect(storedShopperId).toEqual(shopperId);

			// should be on context
			const updatedContext = beacon.getContext();
			expect(updatedContext.shopperId).toEqual(shopperId);
		});

		it('can setCurrency', () => {
			// context should not have currency initially
			const context = beacon.getContext();
			expect(context.currency).toBeUndefined();
			expect(beacon['currency']).toStrictEqual({ code: '' });

			// set currency
			const currency: ContextCurrency = { code: 'EUR' };
			beacon.setCurrency(currency);

			// should be stored on class property
			expect(beacon['currency']).toStrictEqual(currency);

			// should be on context
			const updatedContext = beacon.getContext();
			expect(updatedContext.currency).toStrictEqual(currency);
		});

		it('can getAttribution', () => {
			// context should not have currency initially
			const context = beacon.getContext();
			expect(context.attribution).toBeUndefined();

			// unable to mock url in jest, using config.href instead
			const type = 'attr_type';
			const id = 'attr_value';
			const href = `https://www.example.com/test.html?ss_attribution=${type}:${id}`;
			beacon = new Beacon(mockGlobals, { ...mockConfig, href });

			const attribution = beacon['getAttribution']();
			expect(attribution).toStrictEqual([{ type, id }]);

			// should be on context
			const updatedContext = beacon.getContext();
			expect(updatedContext.attribution).toStrictEqual([{ type, id }]);

			// get persisted attribution
			const beacon2 = new Beacon(mockGlobals, mockConfig);
			const attribution2 = beacon2['getAttribution']();
			expect(attribution2).toStrictEqual([{ type, id }]);
		});
	});

	describe('Events', () => {
		const baseSearchSchema = {
			q: 'test',
			pagination: {
				totalResults: 100,
				page: 1,
				resultsPerPage: 20,
			},
			results: [
				{ uid: 'prodUid1', childUid: 'prodChildUid1', sku: 'prodSku1', childSku: 'prodChildSku1' },
				{ uid: 'prodUid2', childUid: 'prodChildUid2', sku: 'prodSku2', childSku: 'prodChildSku2' },
				{ uid: 'prodUid3', childUid: 'prodChildUid3', sku: 'prodSku3', childSku: 'prodChildSku3' },
				{ uid: 'prodUid4', childUid: 'prodChildUid4', sku: 'prodSku4', childSku: 'prodChildSku4' },
			],
		};

		const otherFetchParams = {
			headers: {
				'Content-Type': 'text/plain',
			},
			keepalive: true,
			method: 'POST',
		};
		describe('Shopper Login', () => {
			it('can process login event', async () => {
				const spy = jest.spyOn(beacon['apis'].shopper, 'login');
				const shopperId = 'shopper123';
				const data = {
					id: shopperId,
				};
				const payload = beacon.events.shopper.login({ data })!;
				await new Promise((resolve) => setTimeout(resolve, 0));
				expect(beacon['shopperId']).toBe(shopperId);

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.shopperLoginSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
		});
		describe('Autocomplete', () => {
			const data = { ...baseSearchSchema };

			it('can process render event', async () => {
				const spy = jest.spyOn(beacon['apis'].autocomplete, 'autocompleteRender');

				const payload = beacon.events.autocomplete.render({ data });
				await new Promise((resolve) => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.autocompleteSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
			it('can process impression event', async () => {
				const spy = jest.spyOn(beacon['apis'].autocomplete, 'autocompleteImpression');
				const payload = beacon.events.autocomplete.impression({ data });
				await new Promise((resolve) => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.autocompleteSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
			it('can process addToCart event', async () => {
				beacon.storage.cart.clear();

				const data = {
					...baseSearchSchema,
					results: [
						{ uid: 'prodUid1', childUid: 'prodChildUid1', sku: 'prodSku1', childSku: 'prodChildSku1', qty: 1, price: 10.99 },
						{ uid: 'prodUid2', childUid: 'prodChildUid2', sku: 'prodSku2', childSku: 'prodChildSku2', qty: 1, price: 10.99 },
					]
				};

				const spy = jest.spyOn(beacon['apis'].autocomplete, 'autocompleteAddtocart');

				const payload = beacon.events.autocomplete.addToCart({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.autocompleteAddtocartSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });

				// validate cart storage data
				const cartData = beacon.storage.cart.get();
				expect(cartData).toEqual(data.results);
			});
			it('can process clickThrough event', async () => {
				const spy = jest.spyOn(beacon['apis'].autocomplete, 'autocompleteClickthrough');
				const payload = beacon.events.autocomplete.clickThrough({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.autocompleteSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
			it('can process redirect event', async () => {
				const spy = jest.spyOn(beacon['apis'].autocomplete, 'autocompleteRedirect');
				const data = {
					redirect: '/new-url',
				};
				const payload = beacon.events.autocomplete.redirect({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.autocompleteRedirectSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
		});
		describe('Search', () => {
			const data = { ...baseSearchSchema };
			it('can process render event', async () => {
				const spy = jest.spyOn(beacon['apis'].search, 'searchRender');
				const payload = beacon.events.search.render({ data });
				await new Promise((resolve) => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.searchSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
			it('can process impression event', async () => {
				const spy = jest.spyOn(beacon['apis'].search, 'searchImpression');
				const payload = beacon.events.search.impression({ data });
				await new Promise((resolve) => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.searchSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
			it('can process addToCart event', async () => {
				beacon.storage.cart.clear();

				const data = {
					...baseSearchSchema,
					results: [
						{ uid: 'prodUid1', childUid: 'prodChildUid1', sku: 'prodSku1', childSku: 'prodChildSku1', qty: 1, price: 10.99 },
						{ uid: 'prodUid2', childUid: 'prodChildUid2', sku: 'prodSku2', childSku: 'prodChildSku2', qty: 1, price: 10.99 },
					]
				};

				const spy = jest.spyOn(beacon['apis'].search, 'searchAddtocart');

				const payload = beacon.events.search.addToCart({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.searchAddtocartSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });

				// validate cart storage data
				const cartData = beacon.storage.cart.get();
				expect(cartData).toEqual(data.results);
			});
			it('can process clickThrough event', async () => {
				const spy = jest.spyOn(beacon['apis'].search, 'searchClickthrough');
				const payload = beacon.events.search.clickThrough({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.searchSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
			it('can process redirect event', async () => {
				const spy = jest.spyOn(beacon['apis'].search, 'searchRedirect');
				const data = {
					redirect: '/new-url',
				};
				const payload = beacon.events.search.redirect({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.searchRedirectSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
		});
		describe('Category', () => {
			const data = { ...baseSearchSchema, q: undefined };

			it('can process render event', async () => {
				const spy = jest.spyOn(beacon['apis'].category, 'categoryRender');
				const payload = beacon.events.category.render({ data });
				await new Promise((resolve) => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.categorySchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
			it('can process impression event', async () => {
				const spy = jest.spyOn(beacon['apis'].category, 'categoryImpression');
				const payload = beacon.events.category.impression({ data });
				await new Promise((resolve) => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.categorySchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
			it('can process addToCart event', async () => {
				beacon.storage.cart.clear();

				const data = {
					...baseSearchSchema,
					q: undefined,
					results: [
						{ uid: 'prodUid1', childUid: 'prodChildUid1', sku: 'prodSku1', childSku: 'prodChildSku1', qty: 1, price: 10.99 },
						{ uid: 'prodUid2', childUid: 'prodChildUid2', sku: 'prodSku2', childSku: 'prodChildSku2', qty: 1, price: 10.99 },
					]
				};

				const spy = jest.spyOn(beacon['apis'].category, 'categoryAddtocart');

				const payload = beacon.events.category.addToCart({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.categoryAddtocartSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });

				// validate cart storage data
				const cartData = beacon.storage.cart.get();
				expect(cartData).toEqual(data.results);
			});
			it('can process clickThrough event', async () => {
				const spy = jest.spyOn(beacon['apis'].category, 'categoryClickthrough');
				const payload = beacon.events.category.clickThrough({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.categorySchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
		});
		describe('Recommendations', () => {
			const data = {
				tag: 'test-tag',
				results: [...baseSearchSchema.results],
			};
			it('can process render event', async () => {
				const spy = jest.spyOn(beacon['apis'].recommendations, 'recommendationsRender');
				const payload = beacon.events.recommendations.render({ data });
				await new Promise((resolve) => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.recommendationsSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
			it('can process impression event', async () => {
				const spy = jest.spyOn(beacon['apis'].recommendations, 'recommendationsImpression');
				const payload = beacon.events.recommendations.impression({ data });
				await new Promise((resolve) => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.recommendationsSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
			it('can process addToCart event', async () => {
				beacon.storage.cart.clear();

				const data = {
					tag: 'test-tag',
					results: [
						{ uid: 'prodUid1', childUid: 'prodChildUid1', sku: 'prodSku1', childSku: 'prodChildSku1', qty: 1, price: 10.99 },
						{ uid: 'prodUid2', childUid: 'prodChildUid2', sku: 'prodSku2', childSku: 'prodChildSku2', qty: 1, price: 10.99 },
					]
				};

				const spy = jest.spyOn(beacon['apis'].recommendations, 'recommendationsAddtocart');

				const payload = beacon.events.recommendations.addToCart({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.recommendationsAddtocartSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });

				// validate cart storage data
				const cartData = beacon.storage.cart.get();
				expect(cartData).toEqual(data.results);
			});
			it('can process clickThrough event', async () => {
				const spy = jest.spyOn(beacon['apis'].recommendations, 'recommendationsClickthrough');
				const payload = beacon.events.recommendations.clickThrough({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.recommendationsSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
		});
		describe('Product', () => {
			const data = {
				result: baseSearchSchema.results[0],
			};
			it('can process pageView event', async () => {
				const spy = jest.spyOn(beacon['apis'].product, 'productPageview');
				const payload = beacon.events.product.pageView({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.productPageviewSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
		});
		describe('Cart', () => {
			const data = {
				results: [
					...baseSearchSchema.results.map((item) => {
						return {
							...item,
							qty: 1,
							price: 10,
						};
					}),
				],
			};
			it('can process add event', async () => {
				const cart = [
					{ uid: 'prodUidA', childUid: 'prodChildUidA', sku: 'prodSkuA', childSku: 'prodChildSkuA', qty: 1, price: 10.99 },
					{ uid: 'prodUidB', childUid: 'prodChildUidB', sku: 'prodSkuB', childSku: 'prodChildSkuB', qty: 1, price: 10.99 },
				];

				beacon.storage.cart.set(cart);

				const spy = jest.spyOn(beacon['apis'].cart, 'cartAdd');
				const payload = beacon.events.cart.add({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify({
					...payload.cartSchema,
					data: {
						...payload.cartSchema.data,
						results: payload.cartSchema.data.results,
					},
				});

				// actual event is the third request due to storage changes sending preflights
				expect(mockFetchApi).toHaveBeenNthCalledWith(3, expect.any(String), { body, ...otherFetchParams });

				// validate cart storage data
				const cartData = beacon.storage.cart.get();
				expect(cartData).toEqual([...data.results, ...cart]);
			});

			it('can process add event with supplied cart', async () => {
				const cart = [
					{ uid: 'prodUidA', childUid: 'prodChildUidA', sku: 'prodSkuA', childSku: 'prodChildSkuA', qty: 1, price: 10.99 },
					{ uid: 'prodUidB', childUid: 'prodChildUidB', sku: 'prodSkuB', childSku: 'prodChildSkuB', qty: 1, price: 10.99 },
					...data.results
				];

				const cartData = {
					...data,
					cart
				}

				const spy = jest.spyOn(beacon['apis'].cart, 'cartAdd');
				const payload = beacon.events.cart.add({ data: cartData });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify({
					...payload.cartSchema,
					data: {
						results: payload.cartSchema.data.results,
						cart: payload.cartSchema.data.cart,
					},
				});

				// actual event is the second request due to storage change sending preflights
				expect(mockFetchApi).toHaveBeenNthCalledWith(2, expect.any(String), { body, ...otherFetchParams });

				// validate cart storage data
				const storedCartData = beacon.storage.cart.get();
				expect(storedCartData).toEqual(cart);
			});
			
			it('can process remove event', async () => {
				const cart = [
					{ uid: 'prodUidA', childUid: 'prodChildUidA', sku: 'prodSkuA', childSku: 'prodChildSkuA', qty: 1, price: 10.99 },
					{ uid: 'prodUidB', childUid: 'prodChildUidB', sku: 'prodSkuB', childSku: 'prodChildSkuB', qty: 1, price: 10.99 },
				];

				const removeData = {
					...data,
					results: [
						{ uid: 'prodUidA', childUid: 'prodChildUidA', sku: 'prodSkuA', childSku: 'prodChildSkuA', qty: 1, price: 10.99 },
					],
				}

				beacon.storage.cart.set(cart);

				const spy = jest.spyOn(beacon['apis'].cart, 'cartRemove');
				const payload = beacon.events.cart.remove({ data: removeData });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.cartSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });

				// validate cart storage data
				const storedCartData = beacon.storage.cart.get();
				expect(storedCartData).toEqual([cart[1]]);
			});
			
			it('can process remove event with supplied cart', async () => {
				const cart = [
					{ uid: 'prodUidB', childUid: 'prodChildUidB', sku: 'prodSkuB', childSku: 'prodChildSkuB', qty: 1, price: 10.99 },
				];

				const removeData = {
					...data,
					results: [
						{ uid: 'prodUidA', childUid: 'prodChildUidA', sku: 'prodSkuA', childSku: 'prodChildSkuA', qty: 1, price: 10.99 },
					],
					cart
				}

				const spy = jest.spyOn(beacon['apis'].cart, 'cartRemove');
				const payload = beacon.events.cart.remove({ data: removeData });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.cartSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });

				// validate cart storage data
				const storedCartData = beacon.storage.cart.get();
				expect(storedCartData).toEqual(cart);
			});

			it('can process view event', async () => {
				const spy = jest.spyOn(beacon['apis'].cart, 'cartView');
				const payload = beacon.events.cart.view({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.cartviewSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
		});
		describe('Order', () => {
			const data = {
				orderId: '12345',
				transactionTotal: 100,
				total: 110,
				city: 'test-city',
				state: 'test-state',
				country: 'test-country',
				results: [
					...baseSearchSchema.results.map((item) => {
						return {
							...item,
							qty: 1,
							price: 10,
						};
					}),
				],
			};
			it('can process transaction event', async () => {
				const spy = jest.spyOn(beacon['apis'].order, 'orderTransaction');
				const payload = beacon.events.order.transaction({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.orderTransactionSchema);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
		});
		describe('Error', () => {
			const data = {
				message: 'test-message',
				stack: 'test-stack',
				details: { test: 'test' },
			};
			it('can process shopifypixel event', async () => {
				const spy = jest.spyOn(beacon['apis'].error, 'logShopifypixel');
				const payload = beacon.events.error.shopifypixel({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.shopifyPixelExtensionLogEvent);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
			it('can process snap event', async () => {
				const spy = jest.spyOn(beacon['apis'].error, 'logSnap');
				const payload = beacon.events.error.snap({ data });
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(spy).toHaveBeenCalled();
				const body = JSON.stringify(payload.snapLogEvent);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), { body, ...otherFetchParams });
			});
		});
	});

	describe('Functions', () => {
		const mockContext = {
			userId: 'userId',
			sessionId: 'sessionId',
			shopperId: 'sessionId',
			pageLoadId: 'pageLoadId',
			timestamp: 'timestamp',
			pageUrl: 'pageUrl',
			initiator: 'initiator',
			attribution: [],
			userAgent: 'userAgent',
			currency: {
				code: 'USD',
			},
			dev: true,
		};
		const mockData = {
			q: 'shoes',
			rq: 'rq',
			correctedQuery: 'correctedQuery',
			matchType: 'matchType',
			results: [
				{ uid: 'product1', sku: 'sku1' },
				{ uid: 'product2', sku: 'sku2' },
			],
			pagination: {
				totalResults: 100,
				page: 1,
				resultsPerPage: 20,
			},
		};
		describe('additionalRequestKeys', () => {
			it('can handles unknown endpoint', () => {
				const schema = {
					context: mockContext,
					data: mockData,
				};
				const endpoint = 'unknown' as any;
				const context = schema.context;
				const { pageLoadId, sessionId } = context;

				let baseKey = `${mockGlobals.siteId}||${endpoint}`;
				const key = additionalRequestKeys(baseKey, endpoint, schema);
				const expected = `${mockGlobals.siteId}||${endpoint}||${pageLoadId}||${sessionId}`;
				expect(key).toStrictEqual(expected);
			});
			it('handles SearchSchema', () => {
				const schema = {
					context: mockContext,
					data: mockData,
				};
				const endpoint = 'search';
				const context = schema.context;
				const data = schema.data;
				const { pageLoadId, sessionId } = context;
				const { rq, pagination, q, correctedQuery, matchType } = data;

				let baseKey = `${mockGlobals.siteId}||${endpoint}`;
				const key = additionalRequestKeys(baseKey, endpoint, schema);
				const expected = `${mockGlobals.siteId}||${endpoint}||${pageLoadId}||${sessionId}||rq=${rq}||page=${pagination.page}||resultsPerPage=${pagination.resultsPerPage}||totalResults=${pagination.totalResults}||q=${q}||correctedQuery=${correctedQuery}||matchType=${matchType}`;
				expect(key).toStrictEqual(expected);
			});
			it('handles AutocompleteSchema', () => {
				const schema: AutocompleteSchema = {
					context: mockContext,
					data: mockData,
				};
				const endpoint = 'autocomplete';
				const context = schema.context;
				const data = schema.data;
				const { pageLoadId, sessionId } = context;
				const { rq, pagination, q, correctedQuery, matchType } = data;

				let baseKey = `${mockGlobals.siteId}||${endpoint}`;
				const key = additionalRequestKeys(baseKey, endpoint, schema);
				const expected = `${mockGlobals.siteId}||${endpoint}||${pageLoadId}||${sessionId}||rq=${rq}||page=${pagination.page}||resultsPerPage=${pagination.resultsPerPage}||totalResults=${pagination.totalResults}||q=${q}||correctedQuery=${correctedQuery}||matchType=${matchType}`;
				expect(key).toStrictEqual(expected);
			});
			it('handles CategorySchema', () => {
				const schema: CategorySchema = {
					context: mockContext,
					data: mockData,
				};
				const endpoint = 'category';
				const context = schema.context;
				const data = schema.data;
				const { pageLoadId, sessionId } = context;
				const { rq, pagination } = data;

				let baseKey = `${mockGlobals.siteId}||${endpoint}`;
				const key = additionalRequestKeys(baseKey, endpoint, schema);
				const expected = `${mockGlobals.siteId}||${endpoint}||${pageLoadId}||${sessionId}||rq=${rq}||page=${pagination.page}||resultsPerPage=${pagination.resultsPerPage}||totalResults=${pagination.totalResults}`;
				expect(key).toStrictEqual(expected);
			});
			it('handles RecommendationsSchema', () => {
				const schema: RecommendationsSchema = {
					context: mockContext,
					data: {
						tag: 'tag',
						results: mockData.results,
					},
				};
				const endpoint = 'recommendation';
				const context = schema.context;
				const data = schema.data;
				const { pageLoadId, sessionId } = context;
				const { tag } = data;

				let baseKey = `${mockGlobals.siteId}||${endpoint}`;
				const key = additionalRequestKeys(baseKey, endpoint, schema);
				const expected = `${mockGlobals.siteId}||${endpoint}||${pageLoadId}||${sessionId}||tag=${tag}`;
				expect(key).toStrictEqual(expected);
			});
		});

		describe('appendResults', () => {
			it('can appendResults', () => {
				const acc: {
					nonBatched: PayloadRequest[];
					batches: Record<string, PayloadRequest>;
				} = {
					nonBatched: [],
					batches: {},
				};

				const schemaName = 'searchSchema';
				const initialRequest = {
					apiType: 'search' as const,
					endpoint: 'searchRender',
					payload: {
						[schemaName]: {
							context: mockContext,
							data: mockData,
						},
					},
				};
				const context = initialRequest.payload[schemaName].context;
				const data = initialRequest.payload[schemaName].data;

				const { pageLoadId, sessionId } = context;
				const { rq, pagination, q, correctedQuery, matchType } = data;

				const key = `${mockGlobals.siteId}||${initialRequest.endpoint}||${pageLoadId}||${sessionId}||rq=${rq}||page=${pagination.page}||resultsPerPage=${pagination.resultsPerPage}||totalResults=${pagination.totalResults}||q=${q}||correctedQuery=${correctedQuery}||matchType=${matchType}`;

				// first request should initialize the key in batches
				appendResults(acc, key, schemaName, initialRequest);
				expect(acc.batches[key]).toBe(initialRequest);
				expect(acc.batches[key].payload[schemaName].data.results.length).toBe(2);
				expect(acc.nonBatched.length).toBe(0);

				// additional request should append results to same key
				const additionalRequest = {
					apiType: 'search' as const,
					endpoint: 'searchRender',
					payload: {
						[schemaName]: {
							context: mockContext,
							data: {
								...mockData,
								results: [
									{ uid: 'product3', sku: 'sku3' },
									{ uid: 'product4', sku: 'sku4' },
								],
							},
						},
					},
				};

				appendResults(acc, key, schemaName, additionalRequest);

				// Should still be just one batched request
				expect(Object.keys(acc.batches).length).toBe(1);

				// The original request should be preserved (not replaced)
				expect(acc.batches[key]).toBe(initialRequest);

				// Results should be appended
				expect(acc.batches[key].payload[schemaName].data.results.length).toBe(4);
				expect(acc.batches[key].payload[schemaName].data.results[0].uid).toBe('product1');
				expect(acc.batches[key].payload[schemaName].data.results[2].uid).toBe('product3');

				// Test with different key - should create a new batch
				// Simulate page load with different pageLoadId and pagination data
				const differentRequest = {
					...additionalRequest,
					payload: {
						[schemaName]: {
							...additionalRequest.payload[schemaName],
							context: {
								...additionalRequest.payload[schemaName].context,
								pageLoadId: 'differentPage',
							},
							data: {
								...additionalRequest.payload[schemaName].data,
								pagination: {
									page: 2,
									resultsPerPage: 20,
									totalResults: 100,
								},
							},
						},
					},
				};

				const context2 = differentRequest.payload[schemaName].context;
				const data2 = differentRequest.payload[schemaName].data;
				const key2 = `${mockGlobals.siteId}||${differentRequest.endpoint}||${context2.pageLoadId}||${context2.sessionId}||rq=${data2.rq}||page=${data2.pagination.page}||resultsPerPage=${data2.pagination.resultsPerPage}||totalResults=${data2.pagination.totalResults}||q=${data2.q}||correctedQuery=${data2.correctedQuery}||matchType=${data2.matchType}`;

				appendResults(acc, key2, schemaName, differentRequest);

				// Now should have two batched requests
				expect(Object.keys(acc.batches).length).toBe(2);
				expect(acc.batches[key2]).toBe(differentRequest);

				// Original batch should be unchanged
				expect(acc.batches[key].payload[schemaName].data.results.length).toBe(4);

				// New batch should have its own results
				expect(acc.batches[key2].payload[schemaName].data.results.length).toBe(2);

				// Test different schema on same original pageLoadId
				const recsSchemaName = 'recommendationsSchema';
				const recommendationsRequest = {
					apiType: 'recommendations' as const,
					endpoint: 'recommendationsRender',
					payload: {
						[recsSchemaName]: {
							context: mockContext,
							data: {
								tag: 'tag',
								results: [
									{ uid: 'recProduct1', sku: 'recSku1' },
									{ uid: 'recProduct2', sku: 'recSku2' },
								],
							},
						},
					},
				};

				const recs_context = recommendationsRequest.payload[recsSchemaName].context;
				const recsKey = `${mockGlobals.siteId}||${recommendationsRequest.endpoint}||${recs_context.pageLoadId}||${recs_context.sessionId}`;

				appendResults(acc, recsKey, recsSchemaName, recommendationsRequest);

				// Now should have three batched requests
				expect(Object.keys(acc.batches).length).toBe(3);

				// Other batches should remain unchanged
				expect(acc.batches[key].payload[schemaName].data.results.length).toBe(4);
				expect(acc.batches[key2].payload[schemaName].data.results.length).toBe(2);

				// New recommendations batch should have its results
				expect(acc.batches[recsKey].payload[recsSchemaName].data.results.length).toBe(2);
				expect(acc.batches[recsKey].payload[recsSchemaName].data.results[0].uid).toBe('recProduct1');
				expect(acc.batches[recsKey].payload[recsSchemaName].data.results[1].uid).toBe('recProduct2');
			});
		});
	});

	describe('sendPreflight', () => {
		it('can sendPreflight via POST', async () => {
			// only add 1 product to be under threshold and still generate GET request
			const items = [{ uid: 'uid123', sku: 'sku123', childUid: 'childUid123', childSku: 'childSku123', qty: 1, price: 10.99 }];

			// @ts-ignore - legacy string array support
			beacon.storage.cart.add(items);

			beacon.sendPreflight();

			const body = {
				userId: beacon.getUserId(),
				// @ts-ignore - accessing protected property
				siteId: beacon.globals.siteId,
				cart: items,
			};
			expect(mockFetchApi).toHaveBeenCalledWith(`https://${mockGlobals.siteId}.a.searchspring.io/api/personalization/preflightCache`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...body,
					cart: items.map((item) => item.childUid || item.childSku || item.uid || item.sku),
				}),
				keepalive: true,
			});
		});
	});
});
