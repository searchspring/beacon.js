import packageJSON from '../package.json';
export const { version } = packageJSON;
import { featureFlags } from './utils/featureFlags';

import { v4 as uuidv4 } from 'uuid';
import {
	Context,
	AutocompleteApi,
	AutocompleteClickthroughRequest,
	AutocompleteImpressionRequest,
	CartApi,
	CartSchemaData,
	CategoryApi,
	CategoryClickthroughRequest,
	CategoryImpressionRequest,
	ErrorLogsApi,
	OrderApi,
	OrderTransactionSchemaData,
	Product,
	ProductApi,
	RecommendationsApi,
	RecommendationsClickthroughRequest,
	RecommendationsImpressionRequest,
	SearchApi,
	SearchClickthroughRequest,
	SearchImpressionRequest,
	ShopperApi,
	Configuration,
	InitOverrideFunction,
	FetchAPI,
	RecommendationsImpressionSchema,
	RedirectSchemaData,
	ClickthroughSchemaData,
	AddtocartSchemaData,
	ImpressionSchemaData,
	RecommendationsRenderSchemaData,
	RecommendationsImpressionSchemaData,
	RecommendationsAddtocartSchemaData,
	RecommendationsClickthroughSchemaData,
	RenderSchemaData,
	ProductPageviewSchemaData,
	ProductPageviewSchemaDataResult,
	ImpressionSchema,
	AttributionInner,
	Currency,
	LogSchema,
	LogSchemaData,
	ShopperContext,
	HTTPHeaders,
	RecommendationsAddtocartSchema,
	AddtocartSchema,
} from './client';
import type {
	AutocompleteAddtocartRequest,
	AutocompleteRedirectRequest,
	AutocompleteRenderRequest,
	CartAddRequest,
	CartRemoveRequest,
	CategoryAddtocartRequest,
	CategoryRenderRequest,
	LoginRequest,
	OrderTransactionRequest,
	ProductPageviewRequest,
	RecommendationsAddtocartRequest,
	RecommendationsRenderRequest,
	SearchAddtocartRequest,
	SearchRedirectRequest,
	SearchRenderRequest,
	LogShopifypixelRequest,
	LogSnapRequest,
} from './client/apis';

declare global {
	interface Window {
		Beacon?: typeof Beacon;
		searchspring?: any;
		athos?: any;
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
			headers?: HTTPHeaders;
		};
		beacon?: {
			origin?: string;
			headers?: HTTPHeaders;
		};
	};
	apis?: {
		fetch?: FetchAPI;
	};
	href?: string;
	userAgent?: string;
};
export type BeaconGlobals = {
	siteId: string;
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
export const PREFLIGHT_DEBOUNCE_TIMEOUT = 300;
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
	private attribution: AttributionInner[] | undefined;
	private currency: Currency = {
		code: '',
	};
	private initiator: string = '';
	private batchIntervalTimeout: number | NodeJS.Timeout = 0;
	private preflightTimeout: number | NodeJS.Timeout = 0;
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

		const fetchApi = this.config.apis?.fetch;

		const domain = `${globals.siteId}`.trim().toLowerCase().startsWith('at') ? 'athos' : 'searchspring';
		const basePath = domain === 'searchspring' ? "https://analytics.searchspring.net/beacon/v2" : undefined;
		const apiConfig = new Configuration({ fetchApi, basePath: this.config.requesters?.beacon?.origin || basePath, headers: { 'Content-Type': 'text/plain' } });
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

		this.initiator = this.config.initiator || `${domain}/beaconjs/${version}`;

		this.globals = globals;
		this.pageLoadId = this.getPageLoadId();

		if(!this.globals?.siteId) {
			throw new Error('Beacon: No siteId found in globals. Beacon will not initialize.');
		} else {
			this.globals.siteId = `${this.globals.siteId}`.trim().toLowerCase();
		}
	}

	private getCookie(name: string): string {
		if (typeof window !== 'undefined' && featureFlags.cookies) {
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
		if (featureFlags.cookies) {
			try {
				const secureString = window.location.protocol == 'https:' ? 'Secure;' : '';
				const sameSiteString = 'SameSite=' + (samesite || 'Lax') + ';';
				let expiresString = '';
				if (expiration) {
					const d = new Date();
					d.setTime(d.getTime() + expiration);
					expiresString = 'expires=' + d['toUTCString']() + ';';
				}
				const valueString = encodeURIComponent(value) + ';';
				if (domain) {
					window.document.cookie = name + "=" + valueString + expiresString + sameSiteString + secureString + "path=/; domain=" + domain;
				} else {
					const host = window?.location?.hostname;
					if (!host || host.split('.').length === 1) {
						window.document.cookie = name + "=" + valueString + expiresString + sameSiteString + secureString + "path=/";
					} else {
						const domainParts = host.split('.');
						domainParts.shift();
						domain = '.' + domainParts.join('.');

						window.document.cookie = name + "=" + valueString + expiresString + sameSiteString + secureString + "path=/; domain=" + domain;

						if (this.getCookie(name) == null || this.getCookie(name) != value) {
							domain = '.' + host;
							window.document.cookie = name + "=" + valueString + expiresString + sameSiteString + secureString + "path=/; domain=" + domain;
						}
					}
				}
			} catch (e: any) {
				console.error(`Failed to set '${name}' cookie:`, e);
			}
		}
	}

	private getLocalStorageItem<T = LocalStorageItem>(name: string): T | undefined {
		if (typeof window !== 'undefined' && featureFlags.storage) {
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
		if (typeof window !== 'undefined' && featureFlags.storage) {
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
						.map((sku) => ({ parentId: sku, uid: sku, sku: sku, qty: 1, price: 0 }));
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
					this._sendPreflight();
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
								if (product.parentId !== isSkuAlreadyInCart.parentId || product.sku !== isSkuAlreadyInCart.sku) {
									// parentId or sku are set to the same values if fallback (due to localstorage disabled/full) to storing in cookie.
									isSkuAlreadyInCart.parentId = product.parentId;
									isSkuAlreadyInCart.sku = product.sku;
								}
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
								cartProduct.uid === product.uid
						);
						if (isSkuAlreadyInCart) {
							if (isSkuAlreadyInCart.qty > 0) {
								isSkuAlreadyInCart.qty -= product.qty || 1;
								if (product.parentId !== isSkuAlreadyInCart.parentId || product.sku !== isSkuAlreadyInCart.sku) {
									// parentId or sku are set to the same values if fallback (due to localstorage disabled/full) to storing in cookie.
									isSkuAlreadyInCart.parentId = product.parentId;
									isSkuAlreadyInCart.sku = product.sku;
								}
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
						.map((sku) => ({ parentId: sku, uid: sku, sku: sku }));
				}
				return [];
			},
			set: (products: ProductPageviewSchemaDataResult[]): void => {
				const currentViewedItems = this.storage.viewed.get();
				// remove qty and price if product is provided
				const normalizedItems: ProductPageviewSchemaDataResult[] = products
					.map((item) => ({ sku: item.sku, parentId: item.parentId, uid: item.uid }))
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
					this._sendPreflight();
				}
			},
			add: (products: ProductPageviewSchemaDataResult[]): void => {
				// the order of the stored items matters - most recently viewed should be in front of array?
				if (products.length) {
					const viewedProducts = this.storage.viewed.get();
					products.forEach((product) => {
						const item: ProductPageviewSchemaDataResult = {
							sku: product.sku,
							parentId: product.parentId,
							uid: product.uid,
						};
						const isItemAlreadyViewed = viewedProducts.find((viewedProduct) => viewedProduct.uid === item.uid);
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
			login: (event: Payload<{ id: string }>) => {
				const context = this.getContext() as ShopperContext;
				context.shopperId = event.data?.id;
				if(event.data?.id) {
					const payload: LoginRequest = {
						siteId: event?.siteId || this.globals.siteId,
						shopperLoginSchema: {
							context,
						},
					};
					const request = this.createRequest('shopper', 'login', payload);
					this.sendRequests([request]);
				}
			},
		},
		autocomplete: {
			render: (event: Payload<RenderSchemaData>) => {
				const payload: AutocompleteRenderRequest = {
					siteId: event?.siteId || this.globals.siteId,
					renderSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('autocomplete', 'autocompleteRender', payload);
				this.queueRequest(request);
			},
			impression: (event: Payload<ImpressionSchemaData>) => {
				const payload: AutocompleteImpressionRequest = {
					siteId: event?.siteId || this.globals.siteId,
					impressionSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('autocomplete', 'autocompleteImpression', payload);
				this.queueRequest(request);
			},
			addToCart: (event: Payload<AddtocartSchemaData>) => {
				if (event.data.results) {
					this.storage.cart.add(event.data.results);
				}

				const payload: AutocompleteAddtocartRequest = {
					siteId: event?.siteId || this.globals.siteId,
					addtocartSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('autocomplete', 'autocompleteAddtocart', payload);
				this.queueRequest(request);
			},
			clickThrough: (event: Payload<ClickthroughSchemaData>) => {
				const payload: AutocompleteClickthroughRequest = {
					siteId: event?.siteId || this.globals.siteId,
					clickthroughSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('autocomplete', 'autocompleteClickthrough', payload);
				this.sendRequests([request]);
			},
			redirect: (event: Payload<RedirectSchemaData>) => {
				const payload: AutocompleteRedirectRequest = {
					siteId: event?.siteId || this.globals.siteId,
					redirectSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('autocomplete', 'autocompleteRedirect', payload);
				this.sendRequests([request]);
			},
		},
		search: {
			render: (event: Payload<RenderSchemaData>) => {
				const payload: SearchRenderRequest = {
					siteId: event?.siteId || this.globals.siteId,
					renderSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('search', 'searchRender', payload);
				this.queueRequest(request);
			},
			impression: (event: Payload<ImpressionSchemaData>) => {
				const payload: SearchImpressionRequest = {
					siteId: event?.siteId || this.globals.siteId,
					impressionSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('search', 'searchImpression', payload);
				this.queueRequest(request);
			},
			addToCart: (event: Payload<AddtocartSchemaData>) => {
				if (event.data.results) {
					this.storage.cart.add(event.data.results);
				}

				const payload: SearchAddtocartRequest = {
					siteId: event?.siteId || this.globals.siteId,
					addtocartSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('search', 'searchAddtocart', payload);
				this.queueRequest(request);
			},
			clickThrough: (event: Payload<ClickthroughSchemaData>) => {
				const payload: SearchClickthroughRequest = {
					siteId: event?.siteId || this.globals.siteId,
					clickthroughSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('search', 'searchClickthrough', payload);
				this.sendRequests([request]);
			},
			redirect: (event: Payload<RedirectSchemaData>) => {
				const payload: SearchRedirectRequest = {
					siteId: event?.siteId || this.globals.siteId,
					redirectSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('search', 'searchRedirect', payload);
				this.sendRequests([request]);
			},
		},
		category: {
			render: (event: Payload<RenderSchemaData>) => {
				const payload: CategoryRenderRequest = {
					siteId: event?.siteId || this.globals.siteId,
					renderSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('category', 'categoryRender', payload);
				this.queueRequest(request);
			},
			impression: (event: Payload<ImpressionSchemaData>) => {
				const payload: CategoryImpressionRequest = {
					siteId: event?.siteId || this.globals.siteId,
					impressionSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('category', 'categoryImpression', payload);
				this.queueRequest(request);
			},
			addToCart: (event: Payload<AddtocartSchemaData>) => {
				if (event.data.results) {
					this.storage.cart.add(event.data.results);
				}

				const payload: CategoryAddtocartRequest = {
					siteId: event?.siteId || this.globals.siteId,
					addtocartSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('category', 'categoryAddtocart', payload);
				this.queueRequest(request);
			},
			clickThrough: (event: Payload<ClickthroughSchemaData>) => {
				const payload: CategoryClickthroughRequest = {
					siteId: event?.siteId || this.globals.siteId,
					clickthroughSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('category', 'categoryClickthrough', payload);
				this.sendRequests([request]);
			},
		},
		recommendations: {
			render: (event: Payload<RecommendationsRenderSchemaData>) => {
				const payload: RecommendationsRenderRequest = {
					siteId: event?.siteId || this.globals.siteId,
					recommendationsRenderSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('recommendations', 'recommendationsRender', payload);
				this.queueRequest(request);
			},
			impression: (event: Payload<RecommendationsImpressionSchemaData>) => {
				const payload: RecommendationsImpressionRequest = {
					siteId: event?.siteId || this.globals.siteId,
					recommendationsImpressionSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('recommendations', 'recommendationsImpression', payload);
				this.queueRequest(request);
			},
			addToCart: (event: Payload<RecommendationsAddtocartSchemaData>) => {
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
			},
			clickThrough: (event: Payload<RecommendationsClickthroughSchemaData>) => {
				const payload: RecommendationsClickthroughRequest = {
					siteId: event?.siteId || this.globals.siteId,
					recommendationsClickthroughSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('recommendations', 'recommendationsClickthrough', payload);
				this.sendRequests([request]);
			},
		},
		product: {
			pageView: (event: Payload<ProductPageviewSchemaData>) => {
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
			},
		},
		cart: {
			add: (event: Payload<CartSchemaData>) => {
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
			},
			remove: (event: Payload<CartSchemaData>) => {
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
			},
		},
		order: {
			transaction: (event: Payload<OrderTransactionSchemaData>) => {
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
			},
		},
		error: {
			shopifypixel: (event: Payload<LogSchemaData>) => {
				const payload: LogShopifypixelRequest = {
					siteId: event?.siteId || this.globals.siteId,
					logSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('error', 'logShopifypixel', payload);
				this.sendRequests([request]);
			},
			snap: (event: Payload<LogSchemaData>) => {
				const payload: LogSnapRequest = {
					siteId: event?.siteId || this.globals.siteId,
					logSchema: {
						context: this.getContext(),
						data: event.data,
					},
				};

				const request = this.createRequest('error', 'logSnap', payload);
				this.sendRequests([request]);
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
				 *  AttributionInner[], and { timestamp: string; value: string }
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
			this.setCookie(storageKey, data.value, COOKIE_SAMESITE, EXPIRED_COOKIE, COOKIE_DOMAIN); // clear old subdomain cookie
			this.setCookie(storageKey, data.value, COOKIE_SAMESITE, expiration); // attempt to store in cookie

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

	public setShopperId(shopperId: string): void {
		if (!shopperId) {
			return;
		}
		const existingShopperId = this.getShopperId();
		if (existingShopperId !== shopperId) {
			this.shopperId = '' + shopperId; // ensure string
			this.setCookie(SHOPPER_ID_KEY, this.shopperId, COOKIE_SAMESITE, MAX_EXPIRATION, COOKIE_DOMAIN);
			try {
				this.setLocalStorageItem(SHOPPER_ID_KEY, this.shopperId);
			} catch (e: any) {
				sendStorageError(e, this, SHOPPER_ID_KEY, this.shopperId);
			}
			this.events.shopper.login({ data: { id: this.shopperId }});
			this._sendPreflight();
		}
	}

	private getAttribution(): AttributionInner[] | undefined {
		let attribution: AttributionInner[] = [];

		let urlAttribution: string | null = null;
		try {
			const url = new URL(this.config.href || (typeof window !== 'undefined' && window.location.href) || '');
			urlAttribution = url.searchParams.get(ATTRIBUTION_QUERY_PARAM);
		} catch (e) {
			// noop - URL failed to parse empty url
		}

		const storedAttribution = this.getCookie(ATTRIBUTION_KEY) || (this.getLocalStorageItem(ATTRIBUTION_KEY) as AttributionInner[]);
		if (storedAttribution) {
			try {
				if (typeof storedAttribution === 'string') {
					// from cookie
					attribution = JSON.parse(storedAttribution) as AttributionInner[];
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

	setCurrency(currency: Currency): void {
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
				const headers = { ...init.headers, ...this.config.requesters?.beacon?.headers || {} };
				const isJSON = headers && 'Content-Type' in headers && headers['Content-Type'] === 'application/json';
				return {
					// Cypress intecepts does not support keepalive
					keepalive: this.mode === 'production' ? true : undefined,
					body: isJSON ? init.body : JSON.stringify(init.body),
					headers,
				};
			};

			// typing is difficult due to dynamic API and method call
			(api as any)[apiMethod as keyof typeof api](request.payload, initOverrides).catch((e: any) => {
				// noop - do not throw errors
				if (this.mode === 'development') {
					console.debug(e)
				}
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
					case 'recommendationsAddtocart':
						const recommendationsAddtocart = (request.payload as RecommendationsAddtocartRequest).recommendationsAddtocartSchema;
						key += additionalRequestKeys(key, 'recommendation', recommendationsAddtocart);
						appendResults(acc, key, 'recommendationsAddtocartSchema', request);
						break;
					case 'recommendationsImpression':
						const recommendationsImpression = (request.payload as RecommendationsImpressionRequest).recommendationsImpressionSchema;
						key += additionalRequestKeys(key, 'recommendation', recommendationsImpression);
						appendResults(acc, key, 'recommendationsImpressionSchema', request);
						break;
					case 'searchAddtocart':
						const searchAddtocart = (request.payload as SearchAddtocartRequest).addtocartSchema;
						key += additionalRequestKeys(key, 'search', searchAddtocart);
						appendResults(acc, key, 'addtocartSchema', request);
						break;
					case 'searchImpression':
						const searchImpression = (request.payload as SearchImpressionRequest).impressionSchema;
						key += additionalRequestKeys(key, 'search', searchImpression);
						appendResults(acc, key, 'impressionSchema', request);
						break;
					case 'autocompleteAddtocart':
						const autocompleteAddtocart = (request.payload as AutocompleteAddtocartRequest).addtocartSchema;
						key += additionalRequestKeys(key, 'autocomplete', autocompleteAddtocart);
						appendResults(acc, key, 'addtocartSchema', request);
						break;
					case 'autocompleteImpression':
						const autocompleteImpression = (request.payload as AutocompleteImpressionRequest).impressionSchema;
						key += additionalRequestKeys(key, 'autocomplete', autocompleteImpression);
						appendResults(acc, key, 'impressionSchema', request);
						break;
					case 'categoryAddtocart':
						const categoryAddtocart = (request.payload as CategoryAddtocartRequest).addtocartSchema;
						key += additionalRequestKeys(key, 'category', categoryAddtocart);
						appendResults(acc, key, 'addtocartSchema', request);
						break;
					case 'categoryImpression':
						const categoryImpression = (request.payload as CategoryImpressionRequest).impressionSchema;
						key += additionalRequestKeys(key, 'category', categoryImpression);
						appendResults(acc, key, 'impressionSchema', request);
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

	private _sendPreflight(): void {
		clearTimeout(this.preflightTimeout);
		this.preflightTimeout = setTimeout(() => {
			this.sendPreflight();
		}, PREFLIGHT_DEBOUNCE_TIMEOUT);
	}

	public sendPreflight(overrides?: { userId: string; siteId: string; shopper: string; cart: Product[]; lastViewed: ProductPageviewSchemaDataResult[] }): void {
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

			const domain = `${siteId}`.toLowerCase().startsWith('at') ? 'athoscommerce.io' : 'searchspring.io';
			const origin = this.config.requesters?.personalization?.origin || `https://${siteId}.a.${domain}`;
			const endpoint = `${origin}/api/personalization/preflightCache`;

			if (this.config.apis?.fetch || typeof fetch !== 'undefined') {
				(this.config.apis?.fetch || fetch)(endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'text/plain',
						...this.config.requesters?.personalization?.headers || {},
					},
					body: JSON.stringify(preflightParams),
					keepalive: true,
				});
			}
		}
	}

	protected getProductId(product: Product | ProductPageviewSchemaDataResult): string {
		return `${product.sku || product.uid || ''}`.trim();
	}
}

export function appendResults(
	acc: {
		nonBatched: PayloadRequest[];
		batches: Record<string, PayloadRequest>;
	},
	key: string,
	schemaName: string,
	request: PayloadRequest
) {
	if (!acc.batches[key]) {
		// first request for this batch will contain context data
		acc.batches[key] = JSON.parse(JSON.stringify(request));
	} else {
		// append results
		const batchPayload = acc.batches[key].payload;
		const requestPayload = request.payload;
		const batchSchema = batchPayload[schemaName];
		const requestSchema = requestPayload[schemaName];

		if (requestSchema?.data?.results) {
			const results = batchSchema.data.results || [];
			const resultsToAdd = requestSchema.data.results;
			const newResults = [...results, ...resultsToAdd];
			batchSchema.data.results = newResults;
		}
		// also do this for banners
		if (requestSchema?.data?.banners) {
			const banners = batchSchema?.data?.banners || [];
			const bannersToAdd = requestSchema.data.banners;
			const newBanners = [...banners, ...bannersToAdd];
			batchSchema.data.banners = newBanners;
		}
	}
}

export function additionalRequestKeys(
	key: string,
	type: 'search' | 'autocomplete' | 'category' | 'recommendation',
	schema: ImpressionSchema | RecommendationsImpressionSchema | RecommendationsAddtocartSchema | AddtocartSchema
): string {
	let value = key;
	value += `||${schema.context.pageLoadId}`;
	value += `||${schema.context.sessionId}`;

	if (schema.data.responseId) {
		value += `||responseId=${schema.data.responseId}`;
	}

	if (type === 'recommendation') {
		value += `||tag=${(schema as RecommendationsImpressionSchema).data.tag}`;
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
