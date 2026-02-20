import 'whatwg-fetch';
import {
	additionalRequestKeys,
	appendResults,
	Beacon,
	PAGE_LOAD_ID_EXPIRATION,
	KEYS,
	PayloadRequest,
	PREFLIGHT_DEBOUNCE_TIMEOUT,
	REQUEST_GROUPING_TIMEOUT,
} from './Beacon';
import { Currency, ImpressionSchemaData, Product, ResultProductType } from './client';

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

// Helper to flush the microtask queue. Provides two microtask ticks:
// 1) async function invocation schedules a microtask, 2) await Promise.resolve() schedules another.
// This double-flush is needed for nested promise chains in the beacon code to fully resolve.
const flushPromises = async () => {
	await Promise.resolve();
};

describe('Beacon', () => {
	let beacon: Beacon;
	const mockFetchApi = jest.fn().mockResolvedValue(Promise.resolve({ status: 200, json: () => Promise.resolve({}) }));
	const mockGlobals = { siteId: 'abc123' };
	const mockConfig = {
		apis: {
			fetch: mockFetchApi,
		},
		requesters: {
			beacon: {
				headers: {
					'Content-Type': 'application/json',
				},
			},
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
		jest.useFakeTimers();
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
			const multiQuantityTestProduct = { uid: 'multiQuantityText', parentId: 'multiQuantityParentText', qty: 3, price: 10 };
			const mockProducts: Product[] = [
				{ uid: 'productUid1', parentId: 'productparentId1', sku: 'productSku1', qty: 1, price: 9.99 },
				{ uid: 'productUid2', parentId: 'productparentId2', sku: 'productSku2', qty: 2, price: 10.99 },
				{ uid: 'productUid3', parentId: 'productparentId3', sku: 'productSku3', qty: 3, price: 0 },
				{ uid: 'productUid4', parentId: 'productparentId4', qty: 3, price: 0 },
				multiQuantityTestProduct,
			];

			it('can set and get cart products', () => {
				beacon.storage.cart.set(mockProducts);

				// beacon cart getter
				const cartData = beacon.storage.cart.get();
				expect(cartData).toEqual(mockProducts);

				// cookie contains cart data (both primary and legacy keys)
				const encodedCartCookie = encodeURIComponent(mockProducts.map((product) => product.sku || product.uid).join(','));
				expect(global.document.cookie).toContain(`${KEYS.CART_PRODUCTS.primary}=${encodedCartCookie}`);
				expect(global.document.cookie).toContain(`${KEYS.CART_PRODUCTS.legacy}=${encodedCartCookie}`);

				// localStorage contains cart data (both primary and legacy keys)
				expect(localStorageMock.setItem).toHaveBeenCalled();
				expect(localStorageMock.getItem(KEYS.CART_PRODUCTS.primary)).toBe(JSON.stringify({ value: mockProducts }));
				expect(localStorageMock.getItem(KEYS.CART_PRODUCTS.legacy)).toBe(JSON.stringify({ value: mockProducts }));

				// can add to existing cart data and should be at the front
				const product = { uid: 'productUid5', parentId: 'productparentId5', sku: 'productSku5', qty: 1, price: 9.99 };
				beacon.storage.cart.add([product]);

				const updatedCartData = beacon.storage.cart.get();
				expect(updatedCartData).toEqual([product, ...mockProducts]);

				// can remove from cart data
				beacon.storage.cart.remove([product]);
				const removedCartData = beacon.storage.cart.get();
				expect(removedCartData).toEqual(mockProducts);

				// can decrease quantity from existing cart data
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

				// can add to existing cart data and should be at the front
				const product2 = { uid: 'productUid6', parentId: 'productparentId6', sku: 'productSku6', qty: 1, price: 9.99 };
				beacon.storage.cart.add([product2]);
				const addedCartData = beacon.storage.cart.get();
				expect(addedCartData).toEqual([product2, ...removedSingleQuantityCartData]);

				// can add quantity to existing sku in cart data
				const increaseQuantityBy = 2;
				const product3 = { ...product2, qty: increaseQuantityBy };
				beacon.storage.cart.add([product3]);
				const increasedCartData = beacon.storage.cart.get();
				expect(increasedCartData).toEqual([{ ...product2, qty: product2.qty + increaseQuantityBy }, ...removedSingleQuantityCartData]);

				// can clear cart data
				beacon.storage.cart.clear();
				const clearedCartData = beacon.storage.cart.get();
				expect(clearedCartData).toEqual([]);
				expect(global.document.cookie).toContain(`${KEYS.CART_PRODUCTS.primary}=`);
				expect(global.document.cookie).toContain(`${KEYS.CART_PRODUCTS.legacy}=`);
				expect(localStorageMock.getItem(KEYS.CART_PRODUCTS.primary)).toBe(JSON.stringify({ value: [] }));
				expect(localStorageMock.getItem(KEYS.CART_PRODUCTS.legacy)).toBe(JSON.stringify({ value: [] }));
			});
		});
		describe('Methods', () => {
			it('can getStoredId', async () => {
				// must use real timers with cookie expiration
				jest.useRealTimers();

				const id1 = beacon['getStoredId']('userId', { primary: 'storage-key', legacy: 'legacy-storage-key' }, 0);
				expect(id1).toStrictEqual(expect.any(String));

				await new Promise((resolve) => setTimeout(resolve, 101)); // wait for timestamp to change

				const id2 = beacon['getStoredId']('userId', { primary: 'storage-key', legacy: 'legacy-storage-key' }, 0);
				expect(id2).toStrictEqual(expect.any(String));
				expect(id1).toBe(id2);
			});

			it('can get new id with getStoredId when expired', async () => {
				// must use real timers with cookie expiration
				jest.useRealTimers();

				const expiration = 100;
				const id1 = beacon['getStoredId']('userId', { primary: 'storage-key', legacy: 'legacy-storage-key' }, expiration);
				expect(id1).toStrictEqual(expect.any(String));

				await new Promise((resolve) => setTimeout(resolve, expiration / 2));

				const id2 = beacon['getStoredId']('userId', { primary: 'storage-key', legacy: 'legacy-storage-key' }, expiration);
				expect(id2).toStrictEqual(expect.any(String));
				expect(id1).toBe(id2);

				await new Promise((resolve) => setTimeout(resolve, expiration + 100));

				const id3 = beacon['getStoredId']('userId', { primary: 'storage-key', legacy: 'legacy-storage-key' }, expiration);
				expect(id3).toStrictEqual(expect.any(String));
				expect(id3).not.toBe(id2);
			});

			it('can getPageLoadId', async () => {
				localStorageMock.clear(); // clear storage again due to reinstantiating beacon
				const href = 'test-href';
				beacon = new Beacon(mockGlobals, {
					...mockConfig,
					href,
				});
				const pageLoadId1 = beacon.getPageLoadId();
				expect(pageLoadId1).toStrictEqual(expect.any(String));

				jest.advanceTimersByTime(100);

				// should return the same id
				const pageLoadId2 = beacon.getPageLoadId();
				expect(pageLoadId2).toStrictEqual(pageLoadId1);

				// should save generated id to storage
				const stored = localStorageMock.getItem(KEYS.PAGE_LOAD_ID.primary) || '{}';
				expect(JSON.parse(stored)).toStrictEqual({
					value: {
						href,
						value: pageLoadId1,
						timestamp: expect.any(String),
					},
				});
			});

			it('can getPageLoadId from storage', async () => {
				localStorageMock.clear(); // clear stale data from beforeEach beacon construction
				const stored = { href: 'test-href', value: 'test-value', timestamp: beacon.getTimestamp() };
				localStorageMock.setItem(KEYS.PAGE_LOAD_ID.primary, JSON.stringify({ value: stored }));

				jest.advanceTimersByTime(100); // wait for timestamp to change
				// reconstruct beacon due to pageLoadId being created in constructor
				beacon = new Beacon(mockGlobals, {
					...mockConfig,
					href: stored.href,
				});
				expect(beacon['config'].href).toStrictEqual(stored.href);
				expect(beacon['pageLoadId']).toStrictEqual(stored.value);

				// stored value shouldn't change - timestamp should be different
				const stored2 = localStorageMock.getItem(KEYS.PAGE_LOAD_ID.primary) || '{}';
				expect(JSON.parse(stored2)).toStrictEqual({
					value: {
						href: stored.href,
						value: stored.value,
						timestamp: expect.any(String),
					},
				});
				expect(JSON.parse(stored2).value.value).toBe(stored.value);
				expect(JSON.parse(stored2).value.timestamp).not.toBe(stored.timestamp);
			});

			it('does not get expired pageLoadId from storage', async () => {
				localStorageMock.clear();
				const stored = { href: 'test-href', value: 'test-value', timestamp: beacon.getTimestamp() };
				localStorageMock.setItem(KEYS.PAGE_LOAD_ID.primary, JSON.stringify({ value: stored }));

				jest.advanceTimersByTime(PAGE_LOAD_ID_EXPIRATION + 10);

				// reconstruct beacon due to pageLoadId being created in constructor
				beacon = new Beacon(mockGlobals, {
					...mockConfig,
					href: stored.href,
				});
				expect(beacon['config'].href).toStrictEqual(stored.href);
				expect(beacon['pageLoadId']).not.toBe(stored.value);
				expect(beacon['pageLoadId']).toStrictEqual(expect.any(String));

				// should save new id to storage
				const stored2 = localStorageMock.getItem(KEYS.PAGE_LOAD_ID.primary) || '{}';

				expect(JSON.parse(stored2)).toStrictEqual({
					value: {
						href: stored.href,
						value: expect.any(String),
						timestamp: expect.any(String),
					},
				});
				expect(JSON.parse(stored2).value.value).not.toBe(stored.value);
				expect(JSON.parse(stored2).value.timestamp).not.toBe(stored.timestamp);
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
			jest.advanceTimersByTime(PREFLIGHT_DEBOUNCE_TIMEOUT);

			await flushPromises();
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

		it('can setShopperId and getShopperId', async () => {
			// context should not have shopperId initially
			const context = beacon.getContext();
			expect(context.shopperId).toEqual('');

			// storage should not have shopperId initially
			const emptyStoredShopperId = beacon.getShopperId();
			expect(emptyStoredShopperId).toEqual('');

			// set shopperId
			const shopperId = 'test-shopper-id';
			beacon.setShopperId(shopperId);
			jest.advanceTimersByTime(PREFLIGHT_DEBOUNCE_TIMEOUT);

			await flushPromises();

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
			const currency: Currency = { code: 'EUR' };
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

	describe('searchspring.io tests', () => {
		it('can switch siteIds to searchspring', async () => {
			const beacon = new Beacon(mockGlobals, mockConfig);
			const basePath = 'analytics.searchspring.net';
			expect(beacon['apis'].shopper['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].autocomplete['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].search['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].category['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].recommendations['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].product['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].cart['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].order['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].error['configuration'].basePath).toContain(basePath);
		});
	});

	describe('athoscommerce.net tests', () => {
		it('can switch siteIds to athoscommerce', async () => {
			const athosSiteId = 'athos-site-id';
			const beacon = new Beacon({ siteId: athosSiteId }, mockConfig);
			const basePath = 'analytics.athoscommerce.net';
			expect(beacon['apis'].shopper['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].autocomplete['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].search['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].category['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].recommendations['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].product['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].cart['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].order['configuration'].basePath).toContain(basePath);
			expect(beacon['apis'].error['configuration'].basePath).toContain(basePath);
		});
	});

	describe('Events', () => {
		const otherFetchParams = {
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
		};
		describe('Shopper Login', () => {
			it('can process login event', async () => {
				const shopperId = 'shopper123';
				const spy = jest.spyOn(beacon['apis'].shopper, 'login');
				beacon.setShopperId(shopperId);
				beacon.setShopperId(shopperId);
				beacon.setShopperId(shopperId);

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				jest.advanceTimersByTime(PREFLIGHT_DEBOUNCE_TIMEOUT);

				await flushPromises();
				expect(beacon['shopperId']).toBe(shopperId);

				expect(spy).toHaveBeenCalledTimes(1);
				expect(mockFetchApi).toHaveBeenCalledTimes(2);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.stringContaining('/v1/preflight'), expect.any(Object));
				expect(mockFetchApi).toHaveBeenCalledWith(expect.stringContaining('analytics.searchspring.net/beacon/v2'), fetchPayloadAssertion);
			});

			it('can batch multiple login events', async () => {
				const shopperId = 'shopper123';
				const spy = jest.spyOn(beacon['apis'].shopper, 'login');

				beacon.events.shopper.login({ data: { id: shopperId } });
				beacon.events.shopper.login({ data: { id: shopperId } });
				beacon.events.shopper.login({ data: { id: shopperId } });

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				jest.advanceTimersByTime(PREFLIGHT_DEBOUNCE_TIMEOUT);

				await flushPromises();
				expect(beacon['shopperId']).toBe(shopperId);

				expect(spy).toHaveBeenCalledTimes(1);
				expect(mockFetchApi).toHaveBeenCalledTimes(2);
				expect(mockFetchApi).toHaveBeenCalledWith(expect.stringContaining('/v1/preflight'), expect.any(Object));
				expect(mockFetchApi).toHaveBeenCalledWith(expect.stringContaining('analytics.searchspring.net/beacon/v2'), fetchPayloadAssertion);
			});
		});
		describe('Autocomplete', () => {
			it('can process render event', async () => {
				const data = {
					responseId: 'responseId-test',
				};
				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].autocomplete, 'autocompleteRender');

				beacon.events.autocomplete.render({ data });
				jest.advanceTimersByTime(REQUEST_GROUPING_TIMEOUT);

				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
			it('can process impression event', async () => {
				const data = {
					responseId: 'test-response-id',
					results: [
						{ type: ResultProductType.Product, parentId: 'parentId1', uid: 'prodUid1', sku: 'prodSku1' },
						{ type: ResultProductType.Product, parentId: 'parentId2', uid: 'prodUid2', sku: 'prodSku2' },
						{ type: ResultProductType.Product, parentId: 'parentId3', uid: 'prodUid3', sku: 'prodSku3' },
						{ type: ResultProductType.Product, parentId: 'parentId4', uid: 'prodUid4', sku: 'prodSku4' },
						{ type: ResultProductType.Banner, uid: 'inlinebanneruid' },
					],
					banners: [{ uid: 'merchandisingbanneruid' }],
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};
				const spy = jest.spyOn(beacon['apis'].autocomplete, 'autocompleteImpression');
				beacon.events.autocomplete.impression({ data });
				jest.advanceTimersByTime(REQUEST_GROUPING_TIMEOUT);

				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
			it('can process addToCart event', async () => {
				beacon.storage.cart.clear();

				const data = {
					responseId: 'test-response-id',
					results: [
						{ uid: 'prodUid1', parentId: 'prodparentId1', sku: 'prodSku1', qty: 1, price: 10.99 },
						{ uid: 'prodUid2', parentId: 'prodparentId2', sku: 'prodSku2', qty: 1, price: 10.99 },
					],
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].autocomplete, 'autocompleteAddtocart');

				beacon.events.autocomplete.addToCart({ data });
				jest.advanceTimersByTime(REQUEST_GROUPING_TIMEOUT);

				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);

				// validate cart storage data
				const cartData = beacon.storage.cart.get();
				expect(cartData).toEqual(data.results);
			});
			it('can process clickThrough event', async () => {
				const data = {
					responseId: 'test-response-id',
					results: [{ type: ResultProductType.Product, parentId: 'parentId1', uid: 'prodUid1', sku: 'prodSku1' }],
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].autocomplete, 'autocompleteClickthrough');

				beacon.events.autocomplete.clickThrough({ data });
				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
			it('can process redirect event', async () => {
				const data = {
					responseId: 'test-response-id',
					redirect: '/new-url',
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].autocomplete, 'autocompleteRedirect');

				beacon.events.autocomplete.redirect({ data });
				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
		});
		describe('Search', () => {
			it('can process render event', async () => {
				const data = {
					responseId: 'test-response-id',
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].search, 'searchRender');

				beacon.events.search.render({ data });
				jest.advanceTimersByTime(REQUEST_GROUPING_TIMEOUT);

				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
			it('can process impression event', async () => {
				const results = [
					{ type: ResultProductType.Product, parentId: 'parentId1', uid: 'prodUid1', sku: 'prodSku1' },
					{ type: ResultProductType.Product, parentId: 'parentId2', uid: 'prodUid2', sku: 'prodSku2' },
					{ type: ResultProductType.Product, parentId: 'parentId3', uid: 'prodUid3', sku: 'prodSku3' },
					{ type: ResultProductType.Product, parentId: 'parentId4', uid: 'prodUid4', sku: 'prodSku4' },
					{ type: ResultProductType.Banner, uid: 'inlinebanneruid' },
				];
				const banners = [{ uid: 'merchandisingbanneruid2' }, { uid: 'merchandisingbanneruid3' }];
				const data: ImpressionSchemaData = {
					responseId: 'test-response-id',
					results: [],
					banners: [],
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data: {
							...data,
							results: [{ type: ResultProductType.Product, parentId: 'parentId0', uid: 'prodUid0', sku: 'prodSku0' }, ...results],
							banners: [{ uid: 'merchandisingbanneruid0' }, { uid: 'merchandisingbanneruid1' }, ...banners],
						},
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].search, 'searchImpression');

				results.forEach((result, index) => {
					if (index === 0) {
						beacon.events.search.impression({
							data: {
								...data,
								results: [{ type: ResultProductType.Product, parentId: 'parentId0', uid: 'prodUid0', sku: 'prodSku0' }, result],
								banners: [{ uid: 'merchandisingbanneruid0' }, { uid: 'merchandisingbanneruid1' }],
							},
						});
					} else {
						beacon.events.search.impression({
							data: {
								...data,
								results: [result],
							},
						});
					}
				});
				banners.forEach((banner) => {
					beacon.events.search.impression({
						data: {
							...data,
							banners: [banner],
						},
					});
				});

				jest.advanceTimersByTime(REQUEST_GROUPING_TIMEOUT);

				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
			it('can process addToCart event', async () => {
				beacon.storage.cart.clear();

				const data = {
					responseId: 'test-response-id',
					results: [
						{ uid: 'prodUid1', parentId: 'prodparentId1', sku: 'prodSku1', qty: 1, price: 10.99 },
						{ uid: 'prodUid2', parentId: 'prodparentId2', sku: 'prodSku2', qty: 1, price: 10.99 },
					],
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].search, 'searchAddtocart');

				beacon.events.search.addToCart({ data });
				jest.advanceTimersByTime(REQUEST_GROUPING_TIMEOUT);

				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);

				// validate cart storage data
				const cartData = beacon.storage.cart.get();
				expect(cartData).toEqual(data.results);
			});
			it('can process clickThrough event', async () => {
				const data = {
					responseId: 'test-response-id',
					results: [{ type: ResultProductType.Product, parentId: 'parentId1', uid: 'prodUid1', sku: 'prodSku1' }],
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].search, 'searchClickthrough');

				beacon.events.search.clickThrough({ data });
				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
			it('can process redirect event', async () => {
				const data = {
					responseId: 'test-response-id',
					redirect: '/new-url',
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].search, 'searchRedirect');

				beacon.events.search.redirect({ data });
				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
		});
		describe('Category', () => {
			it('can process render event', async () => {
				const data = {
					responseId: 'test-response-id',
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].category, 'categoryRender');

				beacon.events.category.render({ data });
				jest.advanceTimersByTime(REQUEST_GROUPING_TIMEOUT);

				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
			it('can process impression event', async () => {
				const data = {
					responseId: 'test-response-id',
					results: [
						{ type: ResultProductType.Product, parentId: 'parentId1', uid: 'prodUid1', sku: 'prodSku1' },
						{ type: ResultProductType.Product, parentId: 'parentId2', uid: 'prodUid2', sku: 'prodSku2' },
						{ type: ResultProductType.Product, parentId: 'parentId3', uid: 'prodUid3', sku: 'prodSku3' },
						{ type: ResultProductType.Product, parentId: 'parentId4', uid: 'prodUid4', sku: 'prodSku4' },
						{ type: ResultProductType.Banner, uid: 'inlinebanneruid' },
					],
					banners: [{ uid: 'merchandisingbanneruid' }],
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].category, 'categoryImpression');

				beacon.events.category.impression({ data });
				jest.advanceTimersByTime(REQUEST_GROUPING_TIMEOUT);

				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
			it('can process addToCart event', async () => {
				beacon.storage.cart.clear();

				const data = {
					responseId: 'test-response-id',
					results: [
						{ uid: 'prodUid1', parentId: 'prodparentId1', sku: 'prodSku1', qty: 1, price: 10.99 },
						{ uid: 'prodUid2', parentId: 'prodparentId2', sku: 'prodSku2', qty: 1, price: 10.99 },
					],
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].category, 'categoryAddtocart');

				beacon.events.category.addToCart({ data });
				jest.advanceTimersByTime(REQUEST_GROUPING_TIMEOUT);

				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);

				// validate cart storage data
				const cartData = beacon.storage.cart.get();
				expect(cartData).toEqual(data.results);
			});
			it('can process clickThrough event', async () => {
				const data = {
					responseId: 'test-response-id',
					results: [{ type: ResultProductType.Product, parentId: 'parentId1', uid: 'prodUid1', sku: 'prodSku1' }],
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].category, 'categoryClickthrough');

				beacon.events.category.clickThrough({ data });
				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
		});
		describe('Recommendations', () => {
			it('can process render event', async () => {
				const data = {
					tag: 'test-tag',
					responseId: 'test-response-id',
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].recommendations, 'recommendationsRender');

				beacon.events.recommendations.render({ data });
				jest.advanceTimersByTime(REQUEST_GROUPING_TIMEOUT);

				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
			it('can process impression event', async () => {
				const data = {
					responseId: 'test-response-id',
					tag: 'test-tag',
					results: [
						{ type: ResultProductType.Product, parentId: 'parentId1', uid: 'prodUid1', sku: 'prodSku1' },
						{ type: ResultProductType.Product, parentId: 'parentId2', uid: 'prodUid2', sku: 'prodSku2' },
						{ type: ResultProductType.Product, parentId: 'parentId3', uid: 'prodUid3', sku: 'prodSku3' },
						{ type: ResultProductType.Product, parentId: 'parentId4', uid: 'prodUid4', sku: 'prodSku4' },
						{ type: ResultProductType.Banner, uid: 'inlinebanneruid' },
					],
					banners: [{ uid: 'merchandisingbanneruid' }],
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].recommendations, 'recommendationsImpression');

				beacon.events.recommendations.impression({ data });
				jest.advanceTimersByTime(REQUEST_GROUPING_TIMEOUT);

				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
			it('can process addToCart event', async () => {
				beacon.storage.cart.clear();

				const data = {
					responseId: 'test-response-id',
					tag: 'test-tag',
					results: [
						{ uid: 'prodUid1', parentId: 'prodparentId1', sku: 'prodSku1', qty: 1, price: 10.99 },
						{ uid: 'prodUid2', parentId: 'prodparentId2', sku: 'prodSku2', qty: 1, price: 10.99 },
					],
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].recommendations, 'recommendationsAddtocart');

				beacon.events.recommendations.addToCart({ data });
				jest.advanceTimersByTime(REQUEST_GROUPING_TIMEOUT);

				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);

				// validate cart storage data
				const cartData = beacon.storage.cart.get();
				expect(cartData).toEqual(data.results);
			});
			it('can process clickThrough event', async () => {
				const data = {
					responseId: 'test-response-id',
					tag: 'test-tag',
					results: [{ type: ResultProductType.Product, parentId: 'parentId1', uid: 'prodUid1', sku: 'prodSku1' }],
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].recommendations, 'recommendationsClickthrough');

				beacon.events.recommendations.clickThrough({ data });
				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
		});
		describe('Product', () => {
			it('can process pageView event', async () => {
				const data = {
					result: { uid: 'prodUid1', parentId: 'prodparentId1', sku: 'prodSku1' },
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].product, 'productPageview');

				beacon.events.product.pageView({ data });
				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
		});
		describe('Cart', () => {
			it('can process add event', async () => {
				const cart = [
					{ uid: 'prodUidA', parentId: 'prodparentIdA', sku: 'prodSkuA', qty: 1, price: 10.99 },
					{ uid: 'prodUidB', parentId: 'prodparentIdB', sku: 'prodSkuB', qty: 1, price: 10.99 },
				];

				beacon.storage.cart.set(cart);

				const results = [
					{ uid: 'prodUid1', parentId: 'prodparentId1', sku: 'prodSku1', qty: 1, price: 10 },
					{ uid: 'prodUid2', parentId: 'prodparentId2', sku: 'prodSku2', qty: 1, price: 10 },
					{ uid: 'prodUid3', parentId: 'prodparentId3', sku: 'prodSku3', qty: 1, price: 10 },
					{ uid: 'prodUid4', parentId: 'prodparentId4', sku: 'prodSku4', qty: 1, price: 10 },
				];
				const data = {
					results,
					cart: cart.concat(results),
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].cart, 'cartAdd');

				beacon.events.cart.add({ data });
				await flushPromises();

				expect(spy).toHaveBeenCalled();

				// actual event is the third request due to storage changes sending preflights
				expect(mockFetchApi).toHaveBeenNthCalledWith(1, expect.any(String), fetchPayloadAssertion);

				// validate cart storage data
				const cartData = beacon.storage.cart.get();
				expect(cartData).toEqual(data.cart);
			});

			it('can process remove event', async () => {
				const cart = [
					{ uid: 'prodUidA', parentId: 'prodparentIdA', sku: 'prodSkuA', qty: 1, price: 10.99 },
					{ uid: 'prodUidB', parentId: 'prodparentIdB', sku: 'prodSkuB', qty: 1, price: 10.99 },
					{ uid: 'prodUid1', parentId: 'prodparentId1', sku: 'prodSku1', qty: 1, price: 10 },
					{ uid: 'prodUid2', parentId: 'prodparentId2', sku: 'prodSku2', qty: 1, price: 10 },
					{ uid: 'prodUid3', parentId: 'prodparentId3', sku: 'prodSku3', qty: 1, price: 10 },
					{ uid: 'prodUid4', parentId: 'prodparentId4', sku: 'prodSku4', qty: 1, price: 10 },
				];

				beacon.storage.cart.set(cart);

				const results = [
					{ uid: 'prodUidA', parentId: 'prodparentIdA', sku: 'prodSkuA', qty: 1, price: 10.99 },
					{ uid: 'prodUid1', parentId: 'prodparentId1', sku: 'prodSku1', qty: 1, price: 10 },
				];
				const data = {
					results,
					cart: [
						{ uid: 'prodUidB', parentId: 'prodparentIdB', sku: 'prodSkuB', qty: 1, price: 10.99 },
						{ uid: 'prodUid2', parentId: 'prodparentId2', sku: 'prodSku2', qty: 1, price: 10 },
						{ uid: 'prodUid3', parentId: 'prodparentId3', sku: 'prodSku3', qty: 1, price: 10 },
						{ uid: 'prodUid4', parentId: 'prodparentId4', sku: 'prodSku4', qty: 1, price: 10 },
					],
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].cart, 'cartRemove');

				beacon.events.cart.remove({ data });
				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);

				// validate cart storage data
				const storedCartData = beacon.storage.cart.get();
				expect(storedCartData).toEqual(data.cart);
			});
		});
		describe('Order', () => {
			it('can process transaction event', async () => {
				const data = {
					orderId: '12345',
					transactionTotal: 100,
					total: 110,
					city: 'test-city',
					state: 'test-state',
					country: 'test-country',
					results: [
						{ uid: 'prodUid1', parentId: 'prodparentId1', sku: 'prodSku1', qty: 1, price: 10 },
						{ uid: 'prodUid2', parentId: 'prodparentId2', sku: 'prodSku2', qty: 1, price: 10 },
						{ uid: 'prodUid3', parentId: 'prodparentId3', sku: 'prodSku3', qty: 1, price: 10 },
						{ uid: 'prodUid4', parentId: 'prodparentId4', sku: 'prodSku4', qty: 1, price: 10 },
					],
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].order, 'orderTransaction');

				beacon.events.order.transaction({ data });
				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
		});
		describe('Error', () => {
			it('can process shopifypixel event', async () => {
				const data = {
					message: 'test-message',
					stack: 'test-stack',
					details: { test: 'test' },
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].error, 'logShopifypixel');

				beacon.events.error.shopifypixel({ data });
				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
			});
			it('can process snap event', async () => {
				const data = {
					message: 'test-message',
					stack: 'test-stack',
					details: { test: 'test' },
				};

				const fetchPayloadAssertion = {
					...otherFetchParams,
					body: {
						data,
						context: {
							...beacon.getContext(),
							timestamp: expect.any(String),
						},
					},
				};

				const spy = jest.spyOn(beacon['apis'].error, 'logSnap');

				beacon.events.error.snap({ data });
				await flushPromises();

				expect(spy).toHaveBeenCalled();
				expect(mockFetchApi).toHaveBeenCalledWith(expect.any(String), fetchPayloadAssertion);
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
			responseId: 'responseId',
			tag: 'tag',
			banners: [{ uid: 'merchandisingBanner' }],
			results: [
				{ type: ResultProductType.Product, parentId: 'parentId1', uid: 'product1', sku: 'sku1' },
				{ type: ResultProductType.Product, parentId: 'parentId2', uid: 'product2', sku: 'sku2' },
				{ type: ResultProductType.Banner, uid: 'inlineBanner' },
			],
			pagination: {
				totalResults: 100,
				page: 1,
				resultsPerPage: 20,
			},
		};
		describe('additionalRequestKeys', () => {
			it('handles search impression type', () => {
				const schema = {
					context: mockContext,
					data: mockData,
				};
				const context = schema.context;
				const data = schema.data;
				const { pageLoadId, sessionId } = context;
				const { responseId } = data;

				const baseKey = `${mockGlobals.siteId}||search`;
				const key = additionalRequestKeys(baseKey, 'search', schema);
				const expected = `${baseKey}||${pageLoadId}||${sessionId}||responseId=${responseId}`;
				expect(key).toStrictEqual(expected);
			});

			it('handles recommendation impression type', () => {
				const schema = {
					context: mockContext,
					data: mockData,
				};
				const context = schema.context;
				const data = schema.data;
				const { pageLoadId, sessionId } = context;
				const { responseId, tag } = data;

				const baseKey = `${mockGlobals.siteId}||recommendation`;
				const key = additionalRequestKeys(baseKey, 'recommendation', schema);
				const expected = `${baseKey}||${pageLoadId}||${sessionId}||responseId=${responseId}||tag=${tag}`;
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

				const schemaName = 'impressionSchema';
				const initialRequest = {
					apiType: 'search' as const,
					endpoint: 'searchImpression',
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
				const { responseId } = data;

				const key = `${mockGlobals.siteId}||${initialRequest.endpoint}||${pageLoadId}||${sessionId}||responseId=${responseId}`;

				// first request should initialize the key in batches
				appendResults(acc, key, schemaName, initialRequest);
				expect(acc.batches[key]).toStrictEqual(initialRequest);
				expect(acc.batches[key].payload[schemaName].data.results.length).toBe(3);
				expect(acc.batches[key].payload[schemaName].data.banners.length).toBe(1);
				expect(acc.nonBatched.length).toBe(0);

				// additional request should append results to same key
				const additionalRequest = {
					apiType: 'search' as const,
					endpoint: 'searchImpression',
					payload: {
						[schemaName]: {
							context: mockContext,
							data: {
								...mockData,
								results: [
									{ type: ResultProductType.Product, parentId: 'parentId3', uid: 'product3', sku: 'sku3' },
									{ type: ResultProductType.Product, parentId: 'parentId4', uid: 'product4', sku: 'sku4' },
									{ type: ResultProductType.Banner, uid: 'inlineBanner1' },
								],
								banners: [{ uid: 'banner1' }],
							},
						},
					},
				};

				appendResults(acc, key, schemaName, additionalRequest);

				// Should still be just one batched request
				expect(Object.keys(acc.batches).length).toBe(1);

				// The original request should be preserved (not replaced)
				expect(acc.batches[key]).toStrictEqual({
					...initialRequest,
					payload: {
						[schemaName]: {
							...initialRequest.payload[schemaName],
							data: {
								...initialRequest.payload[schemaName].data,
								results: [...initialRequest.payload[schemaName].data.results, ...additionalRequest.payload[schemaName].data.results],
								banners: [...initialRequest.payload[schemaName].data.banners, ...additionalRequest.payload[schemaName].data.banners],
							},
						},
					},
				});

				// Results should be appended
				expect(acc.batches[key].payload[schemaName].data.results.length).toBe(6);
				expect(acc.batches[key].payload[schemaName].data.banners.length).toBe(2);

				// Test with different key - should create a new batch
				// Simulate different responseId
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
								responseId: 'differentResponseId',
							},
						},
					},
				};

				const context2 = differentRequest.payload[schemaName].context;
				const data2 = differentRequest.payload[schemaName].data;
				const key2 = `${mockGlobals.siteId}||${differentRequest.endpoint}||${context2.pageLoadId}||${context2.sessionId}||responseId=${data2.responseId}`;

				appendResults(acc, key2, schemaName, differentRequest);

				// Now should have two batched requests
				expect(Object.keys(acc.batches).length).toBe(2);
				expect(acc.batches[key2]).toStrictEqual(differentRequest);

				// Original batch should be unchanged
				expect(acc.batches[key].payload[schemaName].data.results.length).toBe(6);
				expect(acc.batches[key].payload[schemaName].data.banners.length).toBe(2);

				// New batch should have its own results
				expect(acc.batches[key2].payload[schemaName].data.results.length).toBe(3);
				expect(acc.batches[key2].payload[schemaName].data.banners.length).toBe(1);

				// Test different schema on same original pageLoadId
				const recsSchemaName = 'recommendationsImpressionSchema';
				const recommendationsRequest = {
					apiType: 'recommendations' as const,
					endpoint: 'recommendationsImpression',
					payload: {
						[recsSchemaName]: {
							context: mockContext,
							data: {
								responseId: 'recResponseId',
								tag: 'tag',
								results: [
									{ uid: 'recProduct1', sku: 'recSku1' },
									{ uid: 'recProduct2', sku: 'recSku2' },
								],
								banners: [],
							},
						},
					},
				};

				const recs_context = recommendationsRequest.payload[recsSchemaName].context;
				const recs_data = recommendationsRequest.payload[recsSchemaName].data;
				const recsKey = `${mockGlobals.siteId}||${recommendationsRequest.endpoint}||${recs_context.pageLoadId}||${recs_context.sessionId}||responseId=${recs_data.responseId}||tag=${recs_data.tag}`;

				appendResults(acc, recsKey, recsSchemaName, recommendationsRequest);

				// Now should have three batched requests
				expect(Object.keys(acc.batches).length).toBe(3);

				// Other batches should remain unchanged
				expect(acc.batches[key].payload[schemaName].data.results.length).toBe(6);
				expect(acc.batches[key].payload[schemaName].data.banners.length).toBe(2);
				expect(acc.batches[key2].payload[schemaName].data.results.length).toBe(3);
				expect(acc.batches[key2].payload[schemaName].data.banners.length).toBe(1);

				// New recommendations batch should have its results
				expect(acc.batches[recsKey].payload[recsSchemaName].data.results.length).toBe(2);
				expect(acc.batches[recsKey].payload[recsSchemaName].data.banners.length).toBe(0);
			});
		});
	});

	describe('sendPreflight', () => {
		it('can sendPreflight via POST', async () => {
			// only add 1 product to be under threshold and still generate GET request
			const items = [{ uid: 'uid123', sku: 'sku123', parentId: 'parentId123', qty: 1, price: 10.99 }];

			beacon.storage.cart.add(items);

			const body = {
				userId: beacon.getUserId(),
				// @ts-ignore - accessing protected property
				siteId: beacon.globals.siteId,
				cart: items,
			};

			jest.advanceTimersByTime(PREFLIGHT_DEBOUNCE_TIMEOUT);
			await flushPromises();

			expect(mockFetchApi).toHaveBeenCalledWith(`https://${mockGlobals.siteId}.a.searchspring.io/v1/preflight`, {
				method: 'POST',
				headers: {
					'Content-Type': 'text/plain',
				},
				body: JSON.stringify({
					...body,
					cart: items.map((item) => item.sku || item.uid),
				}),
				keepalive: true,
			});
		});

		it('can sendPreflight via POST to athoscommerce.io', async () => {
			// only add 1 product to be under threshold and still generate GET request
			const items = [{ uid: 'uid123', sku: 'sku123', parentId: 'parentId123', qty: 1, price: 10.99 }];

			const athosSiteId = 'athos-site-id';
			beacon = new Beacon({ ...mockGlobals, siteId: athosSiteId }, mockConfig);
			beacon.storage.cart.add(items);

			const body = {
				userId: beacon.getUserId(),
				// @ts-ignore - accessing protected property
				siteId: beacon.globals.siteId,
				cart: items,
			};

			jest.advanceTimersByTime(PREFLIGHT_DEBOUNCE_TIMEOUT);
			await flushPromises();

			expect(mockFetchApi).toHaveBeenCalledWith(`https://${athosSiteId}.a.athoscommerce.net/v1/preflight`, {
				method: 'POST',
				headers: {
					'Content-Type': 'text/plain',
				},
				body: JSON.stringify({
					...body,
					cart: items.map((item) => item.sku || item.uid),
				}),
				keepalive: true,
			});
		});
	});
});
