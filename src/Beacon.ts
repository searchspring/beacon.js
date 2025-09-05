import packageJSON from '../package.json';
export const { version } = packageJSON;

import { v4 as uuidv4 } from 'uuid';
import {
	Context,
	AutocompleteAddtocartRequest,
	AutocompleteApi,
	AutocompleteClickthroughRequest,
	AutocompleteImpressionRequest,
	AutocompleteRedirectRequest,
	AutocompleteRenderRequest,
	AutocompleteSchemaData,
	CartAddRequest,
	CartRemoveRequest,
	CategoryAddtocartRequest,
	CategoryClickthroughRequest,
	CategoryImpressionRequest,
	CategoryRenderRequest,
	LoginRequest,
	OrderTransactionRequest,
	ProductApi,
	ProductPageviewRequest,
	RecommendationsAddtocartRequest,
	RecommendationsClickthroughRequest,
	RecommendationsImpressionRequest,
	RecommendationsRenderRequest,
	SearchAddtocartRequest,
	SearchClickthroughRequest,
	SearchImpressionRequest,
	SearchRedirectRequest,
	SearchRenderRequest,
	ShopperApi,
	AutocompleteRedirectSchemaData,
	SearchRedirectSchemaData,
	SearchSchemaData,
	CategorySchemaData,
	RecommendationsSchemaData,
	CartSchemaData,
	OrderTransactionSchemaData,
	ProductPageviewSchemaData,
	Item,
	Product,
	ContextAttributionInner,
	ContextCurrency,
	SearchApi,
	CategoryApi,
	RecommendationsApi,
	OrderApi,
	CartApi,
	SearchSchema,
	RecommendationsSchema,
	AutocompleteSchema,
	CategorySchema,
	ErrorLogsApi,
	LogShopifypixelRequest,
	Log,
	LogSnapRequest,
	Configuration,
	InitOverrideFunction,
	FetchAPI,
	AutocompleteAddtocartSchemaData,
	SearchAddtocartSchemaData,
	CategoryAddtocartSchemaData,
	RecommendationsAddtocartSchemaData,
	ProductPageviewSchemaDataResult,
	RecommendationsAddtocartSchema,
} from './client';

declare global {
	interface Window {
		searchspring?: any;
	}
}
type LocalStorageItem = string | number | boolean | object | null;
type PageLoadData = { href: string; value: string; timestamp: string };
export type PreflightRequestModel = {
	userId: string;
	siteId: string;
	shopper?: string;
	cart?: string[];
	lastViewed?: string[];
};

export type BeaconConfig = {
	mode?: 'production' | 'development';
	initiator?: string;
	requesters?: {
		personalization?: {
			origin?: string;
		};
		beacon?: {
			origin?: string;
		};
	};
	apis?: {
		fetch?: FetchAPI;
	};
	href?: string;
	userAgent?: string;
};
type BeaconGlobals = {
	siteId: string;
	currency?: ContextCurrency;
	cart?: Product[];
};

interface ApiMethodMap {
	shopper: ShopperApi;
	autocomplete: AutocompleteApi;
	search: SearchApi;
	category: CategoryApi;
	recommendations: RecommendationsApi;
	product: ProductApi;
	cart: CartApi;
	order: OrderApi;
	error: ErrorLogsApi;
}
export interface PayloadRequest {
	apiType: keyof ApiMethodMap;
	endpoint: string;
	payload: any;
}

export type Payload<T> = {
	siteId?: string;
	data: T;
};

export const REQUEST_GROUPING_TIMEOUT = 300;
const USER_ID_KEY = 'ssUserId';
export const PAGE_LOAD_ID_KEY = 'ssPageLoadId';
const SESSION_ID_KEY = 'ssSessionId';
const SHOPPER_ID_KEY = 'ssShopperId';
export const CART_KEY = 'ssCartProducts';
const VIEWED_KEY = 'ssViewedProducts';
export const COOKIE_SAMESITE = 'Lax';
const ATTRIBUTION_QUERY_PARAM = 'ss_attribution';
const ATTRIBUTION_KEY = 'ssAttribution';
const MAX_EXPIRATION = 47304000000; // 18 months
const THIRTY_MINUTES = 1800000; // 30 minutes
export const PAGE_LOAD_ID_EXPIRATION = 10000; // 10 seconds
const MAX_VIEWED_COUNT = 20;
const EXPIRED_COOKIE = -1;
export const COOKIE_DOMAIN =
	(typeof window !== 'undefined' && window.location.hostname && '.' + window.location.hostname.replace(/^www\./, '')) || undefined;

export class Beacon {
	protected config: BeaconConfig;
	protected globals: BeaconGlobals;
	protected mode: 'production' | 'development' = 'production';
	private pageLoadId: string = '';
	private userId: string = '';
	private sessionId: string = '';
	private shopperId: string = '';
	private attribution: ContextAttributionInner[] | undefined;
	private currency: ContextCurrency = {
		code: '',
	};
	private initiator: string = '';
	private batchIntervalTimeout: number | NodeJS.Timeout = 0;
	private apis: ApiMethodMap;

	private requests: PayloadRequest[] = [];

	constructor(globals: BeaconGlobals, config?: BeaconConfig) {
		if (typeof globals != 'object' || typeof globals.siteId != 'string') {
			throw new Error(`Invalid config passed to tracker. The "siteId" attribute must be provided.`);
		}

		this.config = { mode: 'production', ...(config || {}) };

		if (this.config.mode && ['production', 'development'].includes(this.config.mode)) {
			this.mode = this.config.mode;
		}
		// TODO: account for standalone beacon.js cdn usage vs package usage
		this.initiator = this.config.initiator || `beaconjs/${version}`;

		const fetchApi = this.config.apis?.fetch;
		const apiConfig = new Configuration({ fetchApi, basePath: this.config.requesters?.beacon?.origin });
		this.apis = {
			shopper: new ShopperApi(apiConfig),
			autocomplete: new AutocompleteApi(apiConfig),
			search: new SearchApi(apiConfig),
			category: new CategoryApi(apiConfig),
			recommendations: new RecommendationsApi(apiConfig),
			product: new ProductApi(apiConfig),
			cart: new CartApi(apiConfig),
			order: new OrderApi(apiConfig),
			error: new ErrorLogsApi(apiConfig),
		};

		this.globals = globals;
		this.pageLoadId = this.getPageLoadId();

		if (this.globals.currency) {
			this.setCurrency(this.globals.currency);
		}
	}

	private getCookie(name: string): string {
		if (typeof window !== 'undefined') {
			const cookieName = name + '=';
			const cookiesList = window.document.cookie.split(';');

			for (let i = 0; i < cookiesList.length; i++) {
				let cookie = cookiesList[i];

				while (cookie.charAt(0) == ' ') {
					cookie = cookie.substring(1);
				}

				if (cookie.indexOf(cookieName) == 0) {
					return decodeURIComponent(cookie.substring(cookieName.length, cookie.length));
				}
			}
			return '';
		}
		return '';
	}

	private setCookie(name: string, value: string, samesite: string, expiration: number, domain?: string): void {
		try {
			let cookie = `${name}=${encodeURIComponent(value)};` + `SameSite=${samesite};` + 'path=/;';
			if (!(typeof window !== 'undefined' && window.location.protocol == 'http:')) {
				// adds secure by default and for shopify pixel - only omits secure if protocol is http and not shopify pixel
				cookie += 'Secure;';
			}
			if (expiration === EXPIRED_COOKIE) {
				cookie += 'expires=Thu, 01 Jan 1970 00:00:00 GMT;';
			} else if (expiration) {
				const d = new Date();
				d.setTime(d.getTime() + expiration);
				cookie += `expires=${d['toUTCString']()};`;
			}
			if (domain) {
				cookie += `domain=${domain};`;
			}

			if (typeof window !== 'undefined') {
				window.document.cookie = cookie;
			}
		} catch (e: any) {
			console.error(`Failed to set '${name}' cookie:`, e);
		}
	}

	private getLocalStorageItem<T = LocalStorageItem>(name: string): T | undefined {
		if (typeof window !== 'undefined') {
			const rawData = window.localStorage?.getItem(name) || '';
			try {
				const data = JSON.parse(rawData);
				if (data && data.value) {
					return data.value;
				} else {
					// corrupted - delete entry
					window.localStorage.removeItem(name);
				}
			} catch {
				// noop - failed to parse stored value
			}
		}
	}

	private setLocalStorageItem(name: string, value: LocalStorageItem): void {
		if (typeof window !== 'undefined') {
			try {
				window.localStorage.setItem(name, JSON.stringify({ value }));
			} catch (e: any) {
				console.warn(`Something went wrong setting '${name}' to local storage:`, e);
				throw e;
			}
		}
	}

	storage = {
		cart: {
			get: (): Product[] => {
				// perhaps... always get from storage and return Product[] - storage always has Product[]
				const storedProducts = this.getLocalStorageItem(CART_KEY) as Product[];
				if (storedProducts) {
					try {
						if (Array.isArray(storedProducts)) {
							return storedProducts as Product[];
						}
					} catch {
						// corrupted - delete entry
						window?.localStorage.removeItem(CART_KEY);

						this.setCookie(CART_KEY, '', COOKIE_SAMESITE, 0, COOKIE_DOMAIN);
					}
				} else {
					const storedSkus = this.getCookie(CART_KEY);
					// split on ',' and remap to Product[], setting qty and price to unknowns (0?)
					return storedSkus
						.split(',')
						.filter((sku) => sku)
						.map((sku) => ({ uid: sku, sku: sku, qty: 1, price: 0 }));
				}

				return [];
			},
			set: (products: Product[]): void => {
				// store Product[] into storage + store mapped string[] into cookie (for legacy purposes)
				const currentCartProducts = this.storage.cart.get();
				const stringifiedProducts = JSON.stringify(products);

				try {
					this.setLocalStorageItem(CART_KEY, products);
				} catch (e: any) {
					sendStorageError(e, this, CART_KEY, stringifiedProducts);
				}

				// also set cookie with re-mapping - favoring the more specific variant
				const storedProductsCookie = products.map((product) => this.getProductId(product)).join(',');
				this.setCookie(CART_KEY, storedProductsCookie, COOKIE_SAMESITE, 0, COOKIE_DOMAIN);

				const productsHaveChanged = JSON.stringify(currentCartProducts) !== stringifiedProducts;
				if (productsHaveChanged) {
					this.sendPreflight();
				}
			},
			add: (products: Product[]): void => {
				if (products.length) {
					const existingCartProducts = this.storage.cart.get();
					const cartProducts = [...existingCartProducts];

					products
						.filter((product) => typeof product === 'object' && product.uid)
						.reverse()
						.forEach((product) => {
							// ensure objects have properties
							const isSkuAlreadyInCart = cartProducts.find(
								(cartProduct) =>
									cartProduct.childUid === product.childUid &&
									cartProduct.childSku === product.childSku &&
									cartProduct.uid === product.uid &&
									cartProduct.sku === product.sku
							);
							if (!isSkuAlreadyInCart) {
								cartProducts.unshift(product);
							} else {
								isSkuAlreadyInCart.qty += product.qty;
								isSkuAlreadyInCart.price = product.price || isSkuAlreadyInCart.price;
							}
						});

					this.storage.cart.set(cartProducts);
				}
			},
			remove: (products: Product[]): void => {
				if (products.length) {
					const existingCartProducts = this.storage.cart.get();
					const cartProducts = [...existingCartProducts];

					products.forEach((product) => {
						const isSkuAlreadyInCart = cartProducts.find(
							(cartProduct) =>
								cartProduct.childUid === product.childUid &&
								cartProduct.childSku === product.childSku &&
								cartProduct.uid === product.uid &&
								cartProduct.sku === product.sku
						);
						if (isSkuAlreadyInCart) {
							if (isSkuAlreadyInCart.qty > 0) {
								isSkuAlreadyInCart.qty -= product.qty || 1;
							}
						}
					});

					// keep products with qty > 0
					const updatedCartProducts = cartProducts.filter((product) => product.qty > 0);

					this.storage.cart.set(updatedCartProducts);
				}
			},
			clear: (): void => {
				this.storage.cart.set([]);
			},
		},
		viewed: {
			get: (): ProductPageviewSchemaDataResult[] => {
				const storedItems = this.getLocalStorageItem(VIEWED_KEY) as ProductPageviewSchemaDataResult[];
				if (storedItems) {
					try {
						if (Array.isArray(storedItems)) {
							return storedItems as ProductPageviewSchemaDataResult[];
						}
					} catch {
						// corrupted - delete entry
						window?.localStorage.removeItem(VIEWED_KEY);

						this.setCookie(VIEWED_KEY, '', COOKIE_SAMESITE, MAX_EXPIRATION, COOKIE_DOMAIN);
					}
				} else {
					const storedSkus = this.getCookie(VIEWED_KEY);
					// split on ',' and remap to Product[], setting qty and price to unknowns (0?)
					return storedSkus
						.split(',')
						.filter((sku) => sku)
						.map((sku) => ({ uid: sku, sku: sku }));
				}
				return [];
			},
			set: (products: ProductPageviewSchemaDataResult[]): void => {
				const currentViewedItems = this.storage.viewed.get();
				// remove qty and price if product is provided
				const normalizedItems: ProductPageviewSchemaDataResult[] = products
					.map((item) => ({ sku: item.sku, uid: item.uid, childUid: item.childUid, childSku: item.childSku }))
					.slice(0, MAX_VIEWED_COUNT);

				const stringifiedNormalizedItems = JSON.stringify(normalizedItems);

				try {
					this.setLocalStorageItem(VIEWED_KEY, normalizedItems);
				} catch (e: any) {
					sendStorageError(e, this, VIEWED_KEY, stringifiedNormalizedItems);
				}

				// also set cookie with re-mapping - favoring the more specific variant
				const storedProductsCookie = normalizedItems.map((item) => this.getProductId(item)).join(',');
				this.setCookie(VIEWED_KEY, storedProductsCookie, COOKIE_SAMESITE, MAX_EXPIRATION, COOKIE_DOMAIN);

				const productsHaveChanged = JSON.stringify(currentViewedItems) !== stringifiedNormalizedItems;
				if (productsHaveChanged) {
					this.sendPreflight();
				}
			},
			add: (products: ProductPageviewSchemaDataResult[]): void => {
				// the order of the stored items matters - most recently viewed should be in front of array?
				if (products.length) {
					const viewedProducts = this.storage.viewed.get();
					products.forEach((product) => {
						const item: ProductPageviewSchemaDataResult = {
							sku: product.sku,
							uid: product.uid,
							childUid: product.childUid,
							childSku: product.childSku,
						};
						const isItemAlreadyViewed = viewedProducts.find(
							(viewedProduct) =>
								viewedProduct.uid === item.uid &&
								viewedProduct.sku === item.sku &&
								viewedProduct.childUid === item.childUid &&
								viewedProduct.childSku === item.childSku
						);
						if (isItemAlreadyViewed) {
							// item has been viewed remove it from array
							const index = viewedProducts.indexOf(isItemAlreadyViewed);
							viewedProducts.splice(index, 1);
						}
						// add item to front of array
						viewedProducts.unshift(item);
					});
					this.storage.viewed.set(viewedProducts);
				}
			},
		},
	};

	events = {
		shopper: {
			login: (event: Payload<{ id: string }>): LoginRequest | void => {
				const setNewId = this.setShopperId(event.data.id);
				if (setNewId) {
					const payload: LoginRequest = {
						siteId: event?.siteId || this.globals.siteId,
						shopperLoginSchema: {
							context: this.getContext(),
						},
					};
					const request = this.createRequest('shopper', 'login', payload);
					this.sendRequests([request]);
					return payload;
				}
			},
		},
		autocomplete: {
			render: (event: Payload<AutocompleteSchemaData>): AutocompleteRenderRequest => {
				const payload: AutocompleteRenderRequest = {
					siteId: event?.siteId || this.globals.siteId,
					autocompleteSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('autocomplete', 'autocompleteRender', payload);
				this.queueRequest(request);
				return payload;
			},
			impression: (event: Payload<AutocompleteSchemaData>): AutocompleteImpressionRequest => {
				const payload: AutocompleteImpressionRequest = {
					siteId: event?.siteId || this.globals.siteId,
					autocompleteSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('autocomplete', 'autocompleteImpression', payload);
				this.queueRequest(request);
				return payload;
			},
			addToCart: (event: Payload<AutocompleteAddtocartSchemaData>): AutocompleteAddtocartRequest => {
				if (event.data.results) {
					this.storage.cart.add(event.data.results);
				}

				const payload: AutocompleteAddtocartRequest = {
					siteId: event?.siteId || this.globals.siteId,
					autocompleteAddtocartSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('autocomplete', 'autocompleteAddtocart', payload);
				this.sendRequests([request]);
				return payload;
			},
			clickThrough: (event: Payload<AutocompleteSchemaData>): AutocompleteClickthroughRequest => {
				const payload: AutocompleteClickthroughRequest = {
					siteId: event?.siteId || this.globals.siteId,
					autocompleteSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('autocomplete', 'autocompleteClickthrough', payload);
				this.sendRequests([request]);
				return payload;
			},
			redirect: (event: Payload<AutocompleteRedirectSchemaData>): AutocompleteRedirectRequest => {
				const payload: AutocompleteRedirectRequest = {
					siteId: event?.siteId || this.globals.siteId,
					autocompleteRedirectSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('autocomplete', 'autocompleteRedirect', payload);
				this.sendRequests([request]);
				return payload;
			},
		},
		search: {
			render: (event: Payload<SearchSchemaData>): SearchRenderRequest => {
				const payload: SearchRenderRequest = {
					siteId: event?.siteId || this.globals.siteId,
					searchSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('search', 'searchRender', payload);
				this.queueRequest(request);
				return payload;
			},
			impression: (event: Payload<SearchSchemaData>): SearchImpressionRequest => {
				const payload: SearchImpressionRequest = {
					siteId: event?.siteId || this.globals.siteId,
					searchSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('search', 'searchImpression', payload);
				this.queueRequest(request);
				return payload;
			},
			addToCart: (event: Payload<SearchAddtocartSchemaData>): SearchAddtocartRequest => {
				if (event.data.results) {
					this.storage.cart.add(event.data.results);
				}

				const payload: SearchAddtocartRequest = {
					siteId: event?.siteId || this.globals.siteId,
					searchAddtocartSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('search', 'searchAddtocart', payload);
				this.sendRequests([request]);
				return payload;
			},
			clickThrough: (event: Payload<SearchSchemaData>): SearchClickthroughRequest => {
				const payload: SearchClickthroughRequest = {
					siteId: event?.siteId || this.globals.siteId,
					searchSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('search', 'searchClickthrough', payload);
				this.sendRequests([request]);
				return payload;
			},
			redirect: (event: Payload<SearchRedirectSchemaData>): SearchRedirectRequest => {
				const payload: SearchRedirectRequest = {
					siteId: event?.siteId || this.globals.siteId,
					searchRedirectSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('search', 'searchRedirect', payload);
				this.sendRequests([request]);
				return payload;
			},
		},
		category: {
			render: (event: Payload<CategorySchemaData>): CategoryRenderRequest => {
				const payload: CategoryRenderRequest = {
					siteId: event?.siteId || this.globals.siteId,
					categorySchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('category', 'categoryRender', payload);
				this.queueRequest(request);
				return payload;
			},
			impression: (event: Payload<CategorySchemaData>): CategoryImpressionRequest => {
				const payload: CategoryImpressionRequest = {
					siteId: event?.siteId || this.globals.siteId,
					categorySchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('category', 'categoryImpression', payload);
				this.queueRequest(request);
				return payload;
			},
			addToCart: (event: Payload<CategoryAddtocartSchemaData>): CategoryAddtocartRequest => {
				if (event.data.results) {
					this.storage.cart.add(event.data.results);
				}

				const payload: CategoryAddtocartRequest = {
					siteId: event?.siteId || this.globals.siteId,
					categoryAddtocartSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('category', 'categoryAddtocart', payload);
				this.sendRequests([request]);
				return payload;
			},
			clickThrough: (event: Payload<CategorySchemaData>): CategoryClickthroughRequest => {
				const payload: CategoryClickthroughRequest = {
					siteId: event?.siteId || this.globals.siteId,
					categorySchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('category', 'categoryClickthrough', payload);
				this.sendRequests([request]);
				return payload;
			},
		},
		recommendations: {
			render: (event: Payload<RecommendationsSchemaData>): RecommendationsRenderRequest => {
				const payload: RecommendationsRenderRequest = {
					siteId: event?.siteId || this.globals.siteId,
					recommendationsSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('recommendations', 'recommendationsRender', payload);
				this.queueRequest(request);
				return payload;
			},
			impression: (event: Payload<RecommendationsSchemaData>): RecommendationsImpressionRequest => {
				const payload: RecommendationsImpressionRequest = {
					siteId: event?.siteId || this.globals.siteId,
					recommendationsSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('recommendations', 'recommendationsImpression', payload);
				this.queueRequest(request);
				return payload;
			},
			addToCart: (event: Payload<RecommendationsAddtocartSchemaData>): RecommendationsAddtocartRequest => {
				if (event.data.results) {
					this.storage.cart.add(event.data.results);
				}

				const payload: RecommendationsAddtocartRequest = {
					siteId: event?.siteId || this.globals.siteId,
					recommendationsAddtocartSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('recommendations', 'recommendationsAddtocart', payload);
				this.queueRequest(request);
				return payload;
			},
			clickThrough: (event: Payload<RecommendationsSchemaData>): RecommendationsClickthroughRequest => {
				const payload: RecommendationsClickthroughRequest = {
					siteId: event?.siteId || this.globals.siteId,
					recommendationsSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('recommendations', 'recommendationsClickthrough', payload);
				this.sendRequests([request]);
				return payload;
			},
		},
		product: {
			pageView: (event: Payload<ProductPageviewSchemaData>): ProductPageviewRequest => {
				const payload: ProductPageviewRequest = {
					siteId: event?.siteId || this.globals.siteId,
					productPageviewSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('product', 'productPageview', payload);
				this.sendRequests([request]);

				const item = event.data.result;
				this.storage.viewed.add([item]);
				return payload;
			},
		},
		cart: {
			add: (event: Payload<CartSchemaData>): CartAddRequest => {
				const data = {
					...event.data,
				};

				if (!data.cart) {
					if (data.results) {
						this.storage.cart.add(data.results);
					}
					data.cart = this.storage.cart.get();
				} else {
					this.storage.cart.set(data.cart);
				}

				const payload: CartAddRequest = {
					siteId: event?.siteId || this.globals.siteId,
					cartSchema: {
						context: this.getContext(),
						data,
					},
				};
				const request = this.createRequest('cart', 'cartAdd', payload);
				this.sendRequests([request]);

				return payload;
			},
			remove: (event: Payload<CartSchemaData>): CartRemoveRequest => {
				const data = {
					...event.data,
				};
				if (!data.cart) {
					if (data.results) {
						this.storage.cart.remove(data.results);
					}
					data.cart = this.storage.cart.get();
				} else {
					this.storage.cart.set(data.cart);
				}

				const payload: CartRemoveRequest = {
					siteId: event?.siteId || this.globals.siteId,
					cartSchema: {
						context: this.getContext(),
						data,
					},
				};

				const request = this.createRequest('cart', 'cartRemove', payload);
				this.sendRequests([request]);

				return payload;
			},
		},
		order: {
			transaction: (event: Payload<OrderTransactionSchemaData>): OrderTransactionRequest => {
				const payload: OrderTransactionRequest = {
					siteId: event?.siteId || this.globals.siteId,
					orderTransactionSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('order', 'orderTransaction', payload);
				this.sendRequests([request]);
				this.storage.cart.clear();
				return payload;
			},
		},
		error: {
			shopifypixel: (event: Payload<Log>): LogShopifypixelRequest => {
				const payload: LogShopifypixelRequest = {
					siteId: event?.siteId || this.globals.siteId,
					shopifyPixelExtensionLogEvent: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('error', 'logShopifypixel', payload);
				this.sendRequests([request]);
				return payload;
			},
			snap: (event: Payload<Log>): LogSnapRequest => {
				const payload: LogSnapRequest = {
					siteId: event?.siteId || this.globals.siteId,
					snapLogEvent: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('error', 'logSnap', payload);
				this.sendRequests([request]);
				return payload;
			},
		},
	};

	queueRequest(request: PayloadRequest): void {
		this.requests.push(request);

		clearTimeout(this.batchIntervalTimeout);
		this.batchIntervalTimeout = setTimeout(() => {
			this.processRequests();
		}, REQUEST_GROUPING_TIMEOUT);
	}

	updateContext(key: keyof Context, value: any): void {
		if (value === undefined) {
			return;
		}
		switch (key) {
			case 'userId':
			case 'sessionId':
			case 'shopperId':
			case 'pageLoadId':
			case 'attribution':
				this[key] = value;
				break;
			case 'pageUrl':
				this.config.href = value;
				break;
			case 'userAgent':
				this.config.userAgent = value;
				break;
			case 'dev':
				if (['production', 'development'].includes(value)) this.mode = value;
				break;
			default:
				break;
		}
	}

	getContext(): Context {
		const context: Context = {
			userAgent: this.config.userAgent,
			timestamp: this.getTimestamp(),
			pageUrl: this.config.href || (typeof window !== 'undefined' && window.location.href) || '',
			userId: this.userId || this.getUserId(),
			sessionId: this.sessionId || this.getSessionId(),
			pageLoadId: this.pageLoadId,
			shopperId: this.shopperId || this.getShopperId(),
			initiator: this.initiator,
			dev: this.mode === 'development' ? true : undefined,
			attribution: this.attribution || this.getAttribution(),
		};
		if (this.currency.code) {
			context.currency = { ...this.currency };
		}
		return context;
	}

	private getStoredId(key: 'userId' | 'sessionId', storageKey: string, expiration: number): string {
		const keys = ['userId', 'sessionId'];
		let uuid: string = '';
		let storedCookieValue: string = '';

		try {
			// try to get the value from the cookie
			storedCookieValue = this.getCookie(storageKey);

			// try to get the value from the local storage
			const data = this.getLocalStorageItem(storageKey) as { timestamp: string; value: string };
			if (data.timestamp && new Date(data.timestamp).getTime() < Date.now() - expiration) {
				uuid = this.generateId();
				/**
				 * TODO: move this expiration to setLocalStorageItem at value level instead of data.value level and
				 * then create a new return type getLocalStorageItem with Product[], Item[],
				 *  ContextAttributionInner[], and { timestamp: string; value: string }
				 */
				this.attribution = undefined;
			} else {
				uuid = data.value;
			}
		} catch {
			// noop - Either no value or failed to parse stored, create new id
		} finally {
			const data = {
				value: storedCookieValue || uuid || this.generateId(),
				timestamp: this.getTimestamp(),
			};

			if (keys.includes(key)) {
				this[key] = data.value;
			}

			// set cookie
			this.setCookie(storageKey, data.value, COOKIE_SAMESITE, expiration, COOKIE_DOMAIN); // attempt to store in cookie

			// set local storage
			try {
				this.setLocalStorageItem(storageKey, data);
			} catch (e: any) {
				// failed to save value - storage may be disabled
				sendStorageError(e, this, storageKey, data.value);
			}

			return data.value;
		}
	}

	public getPageLoadId(): string {
		if (this.pageLoadId) {
			return this.pageLoadId;
		}

		let pageLoadId = this.generateId();
		const pageLoadData = this.getLocalStorageItem<PageLoadData>(PAGE_LOAD_ID_KEY);
		const currentHref = this.config.href || (typeof window !== 'undefined' && window.location.href) || '';
		if (pageLoadData) {
			const { href, value, timestamp } = pageLoadData;
			if (href === currentHref && value && timestamp && new Date(timestamp).getTime() > Date.now() - PAGE_LOAD_ID_EXPIRATION) {
				pageLoadId = value;
			}
		}

		this.pageLoadId = pageLoadId;

		try {
			this.setLocalStorageItem(PAGE_LOAD_ID_KEY, { href: currentHref, value: pageLoadId, timestamp: this.getTimestamp() });
		} catch (e: any) {
			// failed to save value - storage may be disabled
			sendStorageError(e, this, PAGE_LOAD_ID_KEY, pageLoadId);
		}

		return pageLoadId;
	}

	public getUserId(): string {
		return this.userId || this.getStoredId('userId', USER_ID_KEY, MAX_EXPIRATION);
	}

	public getSessionId(): string {
		return this.sessionId || this.getStoredId('sessionId', SESSION_ID_KEY, THIRTY_MINUTES);
	}

	public getShopperId(): string {
		try {
			// cookie value is always a string, but localstorage could be a number
			const cookieValue = this.getCookie(SHOPPER_ID_KEY);
			const storageValue = this.getLocalStorageItem(SHOPPER_ID_KEY) as string;

			// set the shopperId to the cookie value if it exists, otherwise use the local storage value and then convert to string if they exist
			const shopperId = cookieValue || (storageValue ? '' + storageValue : undefined);
			if (shopperId) {
				this.shopperId = shopperId;
			}
		} catch {
			// noop
		}

		return this.shopperId || '';
	}

	public setShopperId(shopperId: string): string | void {
		if (!shopperId) {
			return;
		}
		const exisitingShopperId = this.getShopperId();
		if (exisitingShopperId !== shopperId) {
			this.shopperId = '' + shopperId; // ensure string
			this.setCookie(SHOPPER_ID_KEY, this.shopperId, COOKIE_SAMESITE, MAX_EXPIRATION, COOKIE_DOMAIN);
			try {
				this.setLocalStorageItem(SHOPPER_ID_KEY, this.shopperId);
			} catch (e: any) {
				sendStorageError(e, this, SHOPPER_ID_KEY, this.shopperId);
			}
			this.sendPreflight();
			return this.shopperId;
		}
	}

	private getAttribution(): ContextAttributionInner[] | undefined {
		let attribution: ContextAttributionInner[] = [];

		let urlAttribution: string | null = null;
		try {
			const url = new URL(this.config.href || (typeof window !== 'undefined' && window.location.href) || '');
			urlAttribution = url.searchParams.get(ATTRIBUTION_QUERY_PARAM);
		} catch (e) {
			// noop - URL failed to parse empty url
		}

		const storedAttribution = this.getCookie(ATTRIBUTION_KEY) || (this.getLocalStorageItem(ATTRIBUTION_KEY) as ContextAttributionInner[]);
		if (storedAttribution) {
			try {
				if (typeof storedAttribution === 'string') {
					// from cookie
					attribution = JSON.parse(storedAttribution) as ContextAttributionInner[];
				} else if (Array.isArray(storedAttribution)) {
					attribution = storedAttribution;
				}
			} catch (e) {
				// noop - failed to parse stored attribution
			}
		}

		if (urlAttribution) {
			try {
				const [type, id] = decodeURIComponent(urlAttribution).split(':');
				if (type && id && !attribution.find((attr) => attr.type === type && attr.id === id)) {
					attribution.unshift({ type, id });
				}
			} catch {
				// noop - failed to decode url attribution
			}
		}

		if (attribution.length) {
			const stringifiedAttribution = JSON.stringify(attribution);
			this.setCookie(ATTRIBUTION_KEY, stringifiedAttribution, COOKIE_SAMESITE, THIRTY_MINUTES, COOKIE_DOMAIN);
			try {
				this.setLocalStorageItem(ATTRIBUTION_KEY, attribution);
			} catch (e: any) {
				sendStorageError(e, this, ATTRIBUTION_KEY, stringifiedAttribution);
			}
			this.attribution = attribution;
			return [...attribution];
		}
	}

	generateId(): string {
		return uuidv4();
	}

	getTimestamp(): string {
		return new Date().toISOString();
	}

	setCurrency(currency: ContextCurrency): void {
		if (currency && currency.code && this.currency?.code !== currency.code) {
			this.currency = currency;
		}
	}

	pageLoad(): string {
		this.pageLoadId = this.generateId();
		return this.pageLoadId;
	}

	// TODO: add resetSession method - clear cookies, local storage

	private createRequest(apiType: PayloadRequest['apiType'], endpoint: string, payload: any): PayloadRequest {
		const request: PayloadRequest = {
			apiType,
			endpoint,
			payload,
		};
		return request;
	}

	private getApiClient(apiType: PayloadRequest['apiType']): ApiMethodMap[typeof apiType] {
		return this.apis[apiType];
	}

	private sendRequests(requests: PayloadRequest[]): void {
		for (const request of requests) {
			const api = this.getApiClient(request.apiType);
			const apiMethod = request.endpoint;

			const initOverrides: InitOverrideFunction = async ({ init }) => {
				return {
					// Cypress intecepts does not support keepalive
					keepalive: this.mode === 'production' ? true : undefined,
					body: JSON.stringify(init.body),
				};
			};

			// typing is difficult due to dynamic API and method call
			(api as any)[apiMethod as keyof typeof api](request.payload, initOverrides).catch(() => {
				// noop - do not throw errors
			});
		}
	}

	private processRequests(): void {
		const data = this.requests.reduce<{
			nonBatched: PayloadRequest[];
			batches: Record<string, PayloadRequest>;
		}>(
			(acc, request) => {
				let key = `${request.payload.siteId}||${request.endpoint}`;

				switch (request.endpoint) {
					case 'recommendationsRender':
					case 'recommendationsImpression':
						const recommendationsSchema = request.payload.recommendationsSchema as RecommendationsSchema;
						key += additionalRequestKeys(key, 'recommendation', recommendationsSchema);
						appendResults(acc, key, 'recommendationsSchema', request);
						break;
					case 'recommendationsAddtocart':
						const recommendationsAddtocartSchema = request.payload.recommendationsAddtocartSchema as RecommendationsAddtocartSchema;
						key += additionalRequestKeys(key, 'recommendation', recommendationsAddtocartSchema);
						appendResults(acc, key, 'recommendationsAddtocartSchema', request);
						break;
					case 'searchRender':
					case 'searchImpression':
						const searchSchema = request.payload.searchSchema as SearchSchema;
						key += additionalRequestKeys(key, 'search', searchSchema);
						appendResults(acc, key, 'searchSchema', request);
						break;
					case 'autocompleteRender':
					case 'autocompleteImpression':
						const autocompleteSchema = request.payload.autocompleteSchema as AutocompleteSchema;
						key += additionalRequestKeys(key, 'autocomplete', autocompleteSchema);
						appendResults(acc, key, 'autocompleteSchema', request);
						break;
					case 'categoryRender':
					case 'categoryImpression':
						const categorySchema = request.payload.categorySchema as CategorySchema;
						key += additionalRequestKeys(key, 'category', categorySchema);
						appendResults(acc, key, 'categorySchema', request);
						break;
					default:
						// non-batched requests
						acc.nonBatched.push(request);
						break;
				}

				return acc;
			},
			{
				nonBatched: [],
				batches: {},
			}
		);

		this.requests = [];

		// combine batches and non-batched requests
		const requestsToSend = Object.values(data.batches).reduce<PayloadRequest[]>((acc, batch) => {
			acc.push(batch);
			return acc;
		}, data.nonBatched);

		this.sendRequests(requestsToSend);
	}

	public sendPreflight(overrides?: { userId: string; siteId: string; shopper: string; cart: Product[]; lastViewed: Item[] }): void {
		const userId = overrides?.userId || this.getUserId();
		const siteId = overrides?.siteId || this.globals.siteId;
		const shopper = overrides?.shopper || this.getShopperId();
		const cart = overrides?.cart || this.storage.cart.get();
		const lastViewed = overrides?.lastViewed || this.storage.viewed.get();

		if (userId && typeof userId == 'string' && siteId) {
			const preflightParams: PreflightRequestModel = {
				userId,
				siteId,
			};

			if (shopper) {
				preflightParams.shopper = shopper;
			}
			if (cart.length) {
				preflightParams.cart = cart.map((item) => this.getProductId(item));
			}
			if (lastViewed.length) {
				preflightParams.lastViewed = lastViewed.map((item) => this.getProductId(item));
			}

			const origin = this.config.requesters?.personalization?.origin || `https://${siteId}.a.searchspring.io`;
			const endpoint = `${origin}/api/personalization/preflightCache`;

			if (this.config.apis?.fetch || typeof fetch !== 'undefined') {
				(this.config.apis?.fetch || fetch)(endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(preflightParams),
					keepalive: true,
				});
			}
		}
	}

	protected getProductId(product: Product | Item | ProductPageviewSchemaDataResult): string {
		return `${product.childSku || product.childUid || product.sku || product.uid || ''}`.trim();
	}
}

export function appendResults(
	acc: {
		nonBatched: PayloadRequest[];
		batches: Record<string, PayloadRequest>;
	},
	key: string,
	schemaName: 'searchSchema' | 'autocompleteSchema' | 'categorySchema' | 'recommendationsSchema' | 'recommendationsAddtocartSchema',
	request: PayloadRequest
) {
	if (!acc.batches[key]) {
		// first request for this batch will contain context data
		acc.batches[key] = JSON.parse(JSON.stringify(request));
	} else {
		// append results
		const results = acc.batches[key].payload[schemaName].data.results;
		const resultsToAdd = request.payload[schemaName].data.results;
		const newResults = [...results, ...resultsToAdd].sort((a, b) => a.position - b.position);
		acc.batches[key].payload[schemaName].data.results = newResults;
	}
}

export function additionalRequestKeys(
	key: string,
	type: 'search' | 'autocomplete' | 'category' | 'recommendation',
	schema: SearchSchema | AutocompleteSchema | CategorySchema | RecommendationsSchema | RecommendationsAddtocartSchema
): string {
	let value = key;
	value += `||${schema.context.pageLoadId}`;
	value += `||${schema.context.sessionId}`;

	switch (type) {
		case 'search':
		case 'autocomplete':
		case 'category':
			const searchSchema = schema as SearchSchema | AutocompleteSchema | CategorySchema;
			value += `||rq=${searchSchema.data.rq || ''}`;
			value += `||page=${searchSchema.data.pagination.page}`;
			value += `||resultsPerPage=${searchSchema.data.pagination.resultsPerPage}`;
			value += `||totalResults=${searchSchema.data.pagination.totalResults}`;
			break;
		case 'recommendation':
			const recommendationsSchema = schema as RecommendationsSchema;
			value += `||tag=${recommendationsSchema.data.tag}`;
			break;
		default:
			break;
	}

	switch (type) {
		case 'search':
		case 'autocomplete':
			const searchSchema = schema as SearchSchema | AutocompleteSchema;
			value += `||q=${searchSchema.data.q}`;
			value += `||correctedQuery=${searchSchema.data.correctedQuery || ''}`;
			value += `||matchType=${searchSchema.data.matchType || ''}`;
			break;
		default:
			break;
	}

	return value;
}

function sendStorageError(e: Error, beacon: Beacon, storageKey: string, value: string) {
	if (e.name === 'QuotaExceededError') {
		beacon.events.error.snap({
			data: {
				message: 'QuotaExceededError',
				details: {
					key: storageKey,
					value,
				},
			},
		});
	}
}
