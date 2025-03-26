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
	CartViewRequest,
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
} from './client';

declare global {
	interface Window {
		searchspring?: any;
	}
}

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
	apis?: {
		cookie?: {
			get: (name?: string) => Promise<string>;
			set: (cookieString: string) => Promise<string>;
		};
		localStorage?: {
			clear: () => Promise<void>;
			getItem: (key: string) => Promise<string | null>;
			setItem: (key: string, value: string) => Promise<void>;
			removeItem: (key: string) => Promise<void>;
		};
		requesters?: {
			personalization?: {
				origin?: string;
			};
			beacon?: {
				origin?: string;
			};
		};
		fetch?: FetchAPI;
	};
	href?: string;
	userAgent?: string;
};
type BeaconGlobals = {
	siteId: string;
	currency?: ContextCurrency;
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

export const REQUEST_GROUPING_TIMEOUT = 200;
const USER_ID_KEY = 'ssUserId';
const SESSION_ID_KEY = 'ssSessionIdNamespace';
const SHOPPER_ID_KEY = 'ssShopperId';
export const CART_KEY = 'ssCartProducts';
const VIEWED_KEY = 'ssViewedProducts';
export const COOKIE_SAMESITE = 'Lax';
const ATTRIBUTION_QUERY_PARAM = 'ss_attribution';
const ATTRIBUTION_KEY = 'ssAttribution';
const MAX_EXPIRATION = 47304000000; // 18 months
const THIRTY_MINUTES = 1800000; // 30 minutes
const MAX_VIEWED_COUNT = 20;
const EXPIRED_COOKIE = -1;
export const COOKIE_DOMAIN =
	(typeof window !== 'undefined' && window.location.hostname && '.' + window.location.hostname.replace(/^www\./, '')) || undefined;

export class Beacon {
	public config: BeaconConfig;
	public globals: BeaconGlobals;
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
		const apiConfig = new Configuration({ fetchApi, basePath: this.config.apis?.requesters?.beacon?.origin });
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
		this.pageLoadId = this.generateId();

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

		const setCookieFn = this.config.apis?.cookie?.set;
		if (setCookieFn) {
			try {
				setCookieFn(cookie);
				return;
			} catch (e) {
				console.error('Failed to set cookie using custom API:', e);
			}
		} else if (typeof window !== 'undefined') {
			window.document.cookie = cookie;
		}
	}

	private getLocalStorageItem(name: string): string {
		let storedValue = '';
		if (typeof window !== 'undefined') {
			storedValue = window.localStorage?.getItem(name) || '';
		}

		try {
			const data = JSON.parse(storedValue);
			return data[this.globals.siteId] || '';
		} catch (e) {
			return '';
		}
	}

	private setLocalStorageItem(name: string, value: string): void {
		const storedValue = JSON.stringify({
			[this.globals.siteId]: value,
		});
		const setLocalStorageFn = this.config.apis?.localStorage?.setItem;
		if (setLocalStorageFn) {
			try {
				setLocalStorageFn(name, storedValue);
				return;
			} catch (e) {
				console.error('Failed to set localStorage item using custom API:', e);
				return;
			}
		} else if (typeof window !== 'undefined') {
			window.localStorage.setItem(name, storedValue);
		}
	}

	storage = {
		cart: {
			get: (): Product[] => {
				// perhaps... always get from storage and return Product[] - storage always has Product[]
				const storedProducts = this.getLocalStorageItem(CART_KEY);
				if (storedProducts) {
					try {
						const parsedProducts = JSON.parse(storedProducts);
						return parsedProducts as Product[];
					} catch {
						// corrupted - reset
						this.setLocalStorageItem(CART_KEY, '');
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

				const storedProducts = JSON.stringify(products);
				this.setLocalStorageItem(CART_KEY, storedProducts);

				// also set cookie with re-mapping - favoring the more specific variant
				const storedProductsCookie = products.map((product) => this.getProductId(product)).join(',');
				this.setCookie(CART_KEY, storedProductsCookie, COOKIE_SAMESITE, 0, COOKIE_DOMAIN);

				const productsHaveChanged = JSON.stringify(currentCartProducts) !== storedProducts;
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
							const isSkuAlreadyInCart = cartProducts.find((cartProduct) => cartProduct.uid === product.uid);
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
						const isSkuAlreadyInCart = cartProducts.find((cartProduct) => cartProduct.uid === product.uid);
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
			get: (): Item[] => {
				const storedItems = this.getLocalStorageItem(VIEWED_KEY);
				if (storedItems) {
					try {
						const parsedItems = JSON.parse(storedItems);
						return parsedItems as Item[];
					} catch {
						// corrupted - reset
						this.setLocalStorageItem(VIEWED_KEY, '');
						this.setCookie(VIEWED_KEY, '', COOKIE_SAMESITE, MAX_EXPIRATION, COOKIE_DOMAIN);
					}
				} else {
					const storedSkus = this.getCookie(VIEWED_KEY);
					// split on ',' and remap to Product[], setting qty and price to unknowns (0?)
					return storedSkus
						.split(',')
						.filter((sku) => sku)
						.map((sku) => ({ uid: sku, sku: sku, qty: 1, price: 0 }));
				}
				return [];
			},
			set: (products: (Item | Product)[]): void => {
				const currentViewedItems = this.storage.viewed.get();
				// remove qty and price if product is provided
				const normalizedItems: Item[] = products
					.map((item) => ({ sku: item.sku, uid: item.uid, childUid: item.childUid, childSku: item.childSku }))
					.slice(0, MAX_VIEWED_COUNT);
				const storedItems = JSON.stringify(normalizedItems);
				this.setLocalStorageItem(VIEWED_KEY, storedItems);

				// also set cookie with re-mapping - favoring the more specific variant
				const storedProductsCookie = normalizedItems.map((item) => this.getProductId(item)).join(',');
				this.setCookie(VIEWED_KEY, storedProductsCookie, COOKIE_SAMESITE, MAX_EXPIRATION, COOKIE_DOMAIN);

				const productsHaveChanged = JSON.stringify(currentViewedItems) !== storedItems;
				if (productsHaveChanged) {
					this.sendPreflight();
				}
			},
			add: (products: (Item | Product)[]): void => {
				// the order of the stored items matters - most recently viewed should be in front of array?
				if (products.length) {
					const viewedProducts = this.storage.viewed.get();
					products.forEach((product) => {
						const item: Item = { sku: product.sku, uid: product.uid, childUid: product.childUid, childSku: product.childSku };
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
			addToCart: (event: Payload<AutocompleteSchemaData>): AutocompleteAddtocartRequest => {
				const payload: AutocompleteAddtocartRequest = {
					siteId: event?.siteId || this.globals.siteId,
					autocompleteSchema: {
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
			addToCart: (event: Payload<SearchSchemaData>): SearchAddtocartRequest => {
				const payload: SearchAddtocartRequest = {
					siteId: event?.siteId || this.globals.siteId,
					searchSchema: {
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
			addToCart: (event: Payload<CategorySchemaData>): CategoryAddtocartRequest => {
				const payload: CategoryAddtocartRequest = {
					siteId: event?.siteId || this.globals.siteId,
					categorySchema: {
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
			addToCart: (event: Payload<RecommendationsSchemaData>): RecommendationsAddtocartRequest => {
				const payload: RecommendationsAddtocartRequest = {
					siteId: event?.siteId || this.globals.siteId,
					recommendationsSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('recommendations', 'recommendationsAddtocart', payload);
				this.sendRequests([request]);
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
				const payload: CartAddRequest = {
					siteId: event?.siteId || this.globals.siteId,
					cartSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};
				const request = this.createRequest('cart', 'cartAdd', payload);
				this.sendRequests([request]);
				this.storage.cart.add(event.data.results);
				return payload;
			},
			remove: (event: Payload<CartSchemaData>): CartRemoveRequest => {
				const payload: CartRemoveRequest = {
					siteId: event?.siteId || this.globals.siteId,
					cartSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('cart', 'cartRemove', payload);
				this.sendRequests([request]);
				this.storage.cart.remove(event.data.results);
				return payload;
			},
			view: (event: Payload<CartSchemaData>): CartViewRequest => {
				const payload: CartViewRequest = {
					siteId: event?.siteId || this.globals.siteId,
					cartviewSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('cart', 'cartView', payload);
				this.sendRequests([request]);
				this.storage.cart.set(event.data.results);
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
			userAgent: this.config.userAgent || (typeof navigator !== 'undefined' && navigator?.userAgent) || '',
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

	private getStoredId(key: string, expiration: number): string {
		// try to get the value from the cookie
		const storedCookieValue = this.getCookie(key);
		if (storedCookieValue) {
			this.setCookie(key, storedCookieValue, COOKIE_SAMESITE, expiration, COOKIE_DOMAIN);
			return storedCookieValue;
		}

		// try to get the value from the local storage
		const storedLocalStorageValue = this.getLocalStorageItem(key);
		let uuid;
		try {
			const data = JSON.parse(storedLocalStorageValue);
			if (data.timestamp && new Date(data.timestamp).getTime() < Date.now() - expiration) {
				uuid = this.generateId();
				this.attribution = undefined;
			} else {
				uuid = data.id;
			}
		} catch (_) {
			// noop - Either no value or failed to parse stored, create new id
		} finally {
			const data = {
				id: uuid || this.generateId(),
				timestamp: this.getTimestamp(),
			};
			this.setLocalStorageItem(key, JSON.stringify(data));
			this.setCookie(key, data.id, COOKIE_SAMESITE, expiration, COOKIE_DOMAIN); // attempt to store in cookie
			return data.id;
		}
	}

	public getUserId(): string {
		try {
			const value = this.getStoredId(USER_ID_KEY, MAX_EXPIRATION);
			this.userId = value;
			return this.userId;
		} catch (e) {
			console.error('Failed to get user id:', e);
			return '';
		}
	}

	public getSessionId(): string {
		const value = this.getStoredId(SESSION_ID_KEY, THIRTY_MINUTES);
		this.sessionId = value;
		return this.sessionId;
	}

	public getShopperId(): string {
		let shopperId: string | null = null;
		try {
			shopperId = this.getCookie(SHOPPER_ID_KEY) || this.getLocalStorageItem(SHOPPER_ID_KEY);
			this.shopperId = shopperId;
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
			this.shopperId = shopperId;
			this.setCookie(SHOPPER_ID_KEY, shopperId, COOKIE_SAMESITE, MAX_EXPIRATION, COOKIE_DOMAIN);
			this.setLocalStorageItem(SHOPPER_ID_KEY, shopperId);
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

		const storedAttribution = this.getCookie(ATTRIBUTION_KEY) || this.getLocalStorageItem(ATTRIBUTION_KEY);
		if (storedAttribution) {
			try {
				const data = JSON.parse(storedAttribution);
				if (Array.isArray(data)) {
					attribution = data;
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
			this.setCookie(ATTRIBUTION_KEY, JSON.stringify(attribution), COOKIE_SAMESITE, THIRTY_MINUTES, COOKIE_DOMAIN);
			this.setLocalStorageItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
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
					keepalive: true,
					body: JSON.stringify(init.body),
				};
			};

			// typing is difficult due to dynamic API and method call
			(api as any)[apiMethod as keyof typeof api](request.payload, initOverrides);
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

		if (userId && typeof userId == 'string' && siteId && (shopper || cart.length || lastViewed.length)) {
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

			const origin = this.config.apis?.requesters?.personalization?.origin || `https://${siteId}.a.searchspring.io`;
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

	protected getProductId(product: Product | Item): string {
		return `${product.childUid || product.childSku || product.uid || product.sku || ''}`.trim();
	}
}

export function appendResults(
	acc: {
		nonBatched: PayloadRequest[];
		batches: Record<string, PayloadRequest>;
	},
	key: string,
	schemaName: 'searchSchema' | 'autocompleteSchema' | 'categorySchema' | 'recommendationsSchema',
	request: PayloadRequest
) {
	if (!acc.batches[key]) {
		// first request for this batch will contain context data
		acc.batches[key] = request;
	} else {
		// append results
		const results = acc.batches[key].payload[schemaName].data.results;
		const resultsToAdd = request.payload[schemaName].data.results;
		const newResults = [...results, ...resultsToAdd];
		acc.batches[key].payload[schemaName].data.results = newResults;
	}
}

export function additionalRequestKeys(
	key: string,
	type: 'search' | 'autocomplete' | 'category' | 'recommendation',
	schema: SearchSchema | AutocompleteSchema | CategorySchema | RecommendationsSchema
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
