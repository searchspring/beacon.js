import deepmerge from 'deepmerge';
import { v4 as uuidv4 } from 'uuid';
import { cookies, getFlags, AppMode, charsParams } from '@searchspring/snap-toolbox';
import { Context, AutocompleteAddtocartRequest, AutocompleteApi, AutocompleteClickthroughRequest, AutocompleteImpressionRequest, AutocompleteRedirectRequest, AutocompleteRenderRequest, AutocompleteSchemaData, CartAddRequest, CartRemoveRequest, CartViewRequest, CategoryAddtocartRequest, CategoryClickthroughRequest, CategoryImpressionRequest, CategoryRenderRequest, LoginRequest, OrderTransactionRequest, ProductApi, ProductPageviewRequest, RecommendationsAddtocartRequest, RecommendationsClickthroughRequest, RecommendationsImpressionRequest, RecommendationsRenderRequest, SearchAddtocartRequest, SearchClickthroughRequest, SearchImpressionRequest, SearchRedirectRequest, SearchRenderRequest, ShopperApi, AutocompleteRedirectSchemaData, SearchRedirectSchemaData, SearchSchemaData, CategorySchemaData, RecommendationsSchemaData, CartSchemaData, OrderTransactionSchemaData, ProductPageviewSchemaData, Item, Product, ContextAttributionInner, ContextCurrency } from './client'

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

type BeaconConfig = {
    id?: string;
    mode?: AppMode;
    framework: 'snap';
    version?: string;
    apis?: {
        cookie?: {
            get: (name?: string) => Promise<string>;
            set: (cookieOrName: string, value: string) => Promise<string>;
        },
        localStorage?: {
            clear: () => Promise<void>;
            getItem: (key: string) => Promise<string>;
            setItem: (key: string, value: any) => Promise<void>;
            removeItem: (key: string) => Promise<void>;
        },
        href?: string;
        userAgent?: string;
    }
}
type BeaconGlobals = {
	siteId: string;
	currency?: ContextCurrency
};

type PayloadRequest = {
    id: string;
    apiType: 'shopper' | 'autocomplete' | 'search' | 'category' | 'recommendations' | 'product' | 'cart' | 'order';
    endpoint: string;
    payload: any;
    timestamp: string;
};

type PayloadPool = {
    requests: PayloadRequest[];
};


type Payload<T> = {
    siteId?: string;
    data: T;
};


const defaultConfig: BeaconConfig = {
	id: 'track',
	framework: 'snap',
	mode: AppMode.production,
};

const USER_ID_KEY = 'ssUserId';
const SESSION_ID_KEY = 'ssSessionId';
const SHOPPER_ID_KEY = 'ssShopperId';
const CART_KEY = 'ssCart';
const VIEWED_KEY = 'ssViewed';
const COOKIE_SAMESITE = 'Lax';
const ATTRIBUTION_QUERY_PARAM = 'ss_attribution';
const ATTRIBUTION_KEY = 'ssAttribution';
const MAX_EXPIRATION = 47304000000; // 18 months
const THIRTY_MINUTES = 1800000; // 30 minutes
const MAX_VIEWED_COUNT = 20;
const COOKIE_DOMAIN = (typeof window !== 'undefined' && window.location.hostname && '.' + window.location.hostname.replace(/^www\./, '')) || undefined;

export class Beacon {
    private config: BeaconConfig;
    private mode: AppMode = AppMode.production;
    private globals: BeaconGlobals;

    private currency: ContextCurrency = {
        code: '',
    };
    queue: { eventFn: (...args: any[]) => Promise<void>, payload: any }[] = [];
    isSending: number = 0;

    private payloadPool: PayloadPool = {
        requests: []
    };

    constructor(globals: BeaconGlobals, config: BeaconConfig) {
        if (typeof globals != 'object' || typeof globals.siteId != 'string') {
            throw new Error(`Invalid config passed to tracker. The "siteId" attribute must be provided.`);
        }

        this.config = deepmerge(defaultConfig, config || {});

        if (Object.values(AppMode).includes(this.config.mode as AppMode)) {
            this.mode = this.config.mode as AppMode;
        }

        this.globals = globals;

        if (this.globals.currency?.code) {
            this.setCurrency(this.globals.currency);
		}

        // TODO: rename beacon to tracker to keep backwards compatibility?
        if (typeof window !== 'undefined' && !window.searchspring?.beacon) {
			window.searchspring = window.searchspring || {};
			window.searchspring.beacon = this;
		}

        // TODO: attribute tracking?

        this.processPayloadPool();
    }

    handleResponse = (response: any): void => {
        // TODO: handle response
        this.mode === AppMode.development && console.log('event resolved response:', response);
    }

    handleError = (error: any): void => {
        // TODO: handle error
        this.mode === AppMode.development && console.log('event resolved error:', error);
    }

    private async getCookie(name: string): Promise<string> {
        try {
            const getCookieFn = this.config.apis?.cookie?.get;
            if(getCookieFn) {
                return await getCookieFn(name);
            }
        } catch(e) {
            console.error('Failed to get cookie using custom API:', e);
        }
        return cookies.get(name);
    }

    private async setCookie(name: string, value: string, samesite: string, expiration: number, domain?: string): Promise<void> {
        try {
            const setCookieFn = this.config.apis?.cookie?.set;
            if(setCookieFn) {
                await setCookieFn(name, value);
                return;
            }
        } catch(e) {
            console.error('Failed to set cookie using custom API:', e);
        }
        cookies.set(name, value, samesite, expiration, domain);
    }

    private async getLocalStorageItem(name: string): Promise<string> {
        try {
            const getLocalStorageFn = this.config.apis?.localStorage?.getItem;
            if(getLocalStorageFn) {
                return await getLocalStorageFn(name);
            }
        } catch(e) {
            console.error('Failed to get localStorage item using custom API:', e);
        }
        return window.localStorage?.getItem(name) || '';
    }

    private async setLocalStorageItem(name: string, value: any): Promise<void> {
        try {
            const setLocalStorageFn = this.config.apis?.localStorage?.setItem;
            if(setLocalStorageFn) {
                await setLocalStorageFn(name, value);
                return;
            }
        } catch(e) {
            console.error('Failed to set localStorage item using custom API:', e);
        }
        window.localStorage.setItem(name, value);
    }

    cookies = {
		cart: {
			get: async (): Promise<string[]> => {
				const items = await this.getCookie(CART_KEY);
				if (!items) {
					return [];
				}
				return items.split(',');
			},
			set: async (items: string[]): Promise<void> => {
				if (items.length) {
					const cartItems = items.map((item) => `${item}`.trim());
					const uniqueCartItems = Array.from(new Set(cartItems));
					await this.setCookie(CART_KEY, uniqueCartItems.join(','), COOKIE_SAMESITE, 0, COOKIE_DOMAIN);

					const itemsHaveChanged = cartItems.filter((item) => items.includes(item)).length !== items.length;
					if (itemsHaveChanged) {
						await this.sendPreflight();
					}
				}
			},
			add: async (items: string[]): Promise<void> => {
				if (items.length) {
					const currentCartItems = await this.cookies.cart.get();
					const itemsToAdd = items.map((item) => `${item}`.trim());
					const uniqueCartItems = Array.from(new Set([...currentCartItems, ...itemsToAdd]));
					await this.setCookie(CART_KEY, uniqueCartItems.join(','), COOKIE_SAMESITE, 0, COOKIE_DOMAIN);

					const itemsHaveChanged = currentCartItems.filter((item) => itemsToAdd.includes(item)).length !== itemsToAdd.length;
					if (itemsHaveChanged) {
						await this.sendPreflight();
					}
				}
			},
			remove: async (items: string[]): Promise<void> => {
				if (items.length) {
					const currentCartItems = await this.cookies.cart.get();
					const itemsToRemove = items.map((item) => `${item}`.trim());
					const updatedItems = currentCartItems.filter((item) => !itemsToRemove.includes(item));
					await this.setCookie(CART_KEY, updatedItems.join(','), COOKIE_SAMESITE, 0, COOKIE_DOMAIN);

					const itemsHaveChanged = currentCartItems.length !== updatedItems.length;
					if (itemsHaveChanged) {
						await this.sendPreflight();
					}
				}
			},
			clear: async (): Promise<void> => {
				const items = await this.cookies.cart.get();
                if (items.length) {
					await this.setCookie(CART_KEY, '', COOKIE_SAMESITE, 0, COOKIE_DOMAIN);
                    // TODO: add clear cookie method? Shopify doesn't have one?
					await this.sendPreflight();
				}
			},
		},
		viewed: {
			get: async (): Promise<string[]> => {
				const items = await this.getCookie(VIEWED_KEY);
				if (!items) {
					return [];
				}
				return items.split(',');
			},
		},
	};

    events = {
        shopper: {
            login: async (event?: Payload<{ id: string }>): Promise<void> => {
                if(event?.data?.id) {
                    await this.setShopperId(event.data.id);
                }

                const shopperId = await this.getShopperId();
                if(!shopperId) {
                    console.error('beacon.events.shopper.login event: requires a valid shopper ID to exist');
                    return;
                }

                const payload: LoginRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    shopperLoginSchema: {
                        context: await this.getContext(),
                    },
                };

                this.addToPayloadPool('shopper', 'login', payload);
            }
        },
        autocomplete: {
            render: async (event: Payload<AutocompleteSchemaData>): Promise<void> => {
                const payload: AutocompleteRenderRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    autocompleteSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('autocomplete', 'autocompleteRender', payload);
            },
            impression: async (event: Payload<AutocompleteSchemaData>): Promise<void> => {
                const payload: AutocompleteImpressionRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    autocompleteSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('autocomplete', 'autocompleteImpression', payload);
            },
            addToCart: async (event: Payload<AutocompleteSchemaData>): Promise<void> => {
                const payload: AutocompleteAddtocartRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    autocompleteSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('autocomplete', 'autocompleteAddtocart', payload);
            },
            clickThrough: async (event: Payload<AutocompleteSchemaData>): Promise<void> => {
                const payload: AutocompleteClickthroughRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    autocompleteSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('autocomplete', 'autocompleteClickthrough', payload);
            },
            redirect: async (event: Payload<AutocompleteRedirectSchemaData>): Promise<void> => {
                const payload: AutocompleteRedirectRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    autocompleteRedirectSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('autocomplete', 'autocompleteRedirect', payload);
            },
        },
        search: {
            render: async (event: Payload<SearchSchemaData>): Promise<void> => {
                const payload: SearchRenderRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    searchSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('search', 'searchRender', payload);
            },
            impression: async (event: Payload<SearchSchemaData>): Promise<void> => {
                const payload: SearchImpressionRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    searchSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('search', 'searchImpression', payload);
            },
            addToCart: async (event: Payload<SearchSchemaData>): Promise<void> => {
                const payload: SearchAddtocartRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    searchSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('search', 'searchAddtocart', payload);
            },
            clickThrough: async (event: Payload<SearchSchemaData>): Promise<void> => {
                const payload: SearchClickthroughRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    searchSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('search', 'searchClickthrough', payload);
            },
            redirect: async (event: Payload<SearchRedirectSchemaData>): Promise<void> => {
                const payload: SearchRedirectRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    searchRedirectSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('search', 'searchRedirect', payload);
            },
        },
        category: {
            render: async (event: Payload<CategorySchemaData>): Promise<void> => {
                const payload: CategoryRenderRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    categorySchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('category', 'categoryRender', payload);
            },
            impression: async (event: Payload<CategorySchemaData>): Promise<void> => {
                const payload: CategoryImpressionRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    categorySchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('category', 'categoryImpression', payload);
            },
            addToCart: async (event: Payload<CategorySchemaData>): Promise<void> => {
                const payload: CategoryAddtocartRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    categorySchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('category', 'categoryAddtocart', payload);
            },
            clickThrough: async (event: Payload<CategorySchemaData>): Promise<void> => {
                const payload: CategoryClickthroughRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    categorySchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('category', 'categoryClickthrough', payload);
            },
        },
        recommendations: {
            render: async (event: Payload<RecommendationsSchemaData>): Promise<void> => {
                const payload: RecommendationsRenderRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    recommendationsSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('recommendations', 'recommendationsRender', payload);
            },
            impression: async (event: Payload<RecommendationsSchemaData>): Promise<void> => {
                const payload: RecommendationsImpressionRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    recommendationsSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('recommendations', 'recommendationsImpression', payload);
            },
            addToCart: async (event: Payload<RecommendationsSchemaData>): Promise<void> => {
                const payload: RecommendationsAddtocartRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    recommendationsSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('recommendations', 'recommendationsAddtocart', payload);
            },
            clickThrough: async (event: Payload<RecommendationsSchemaData>): Promise<void> => {
                const payload: RecommendationsClickthroughRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    recommendationsSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('recommendations', 'recommendationsClickthrough', payload);
            },
        },
        product: {
            pageView: async (event: Payload<ProductPageviewSchemaData>): Promise<void> => {
                const payload: ProductPageviewRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    productPageviewSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('product', 'productPageview', payload);
                
                const item = payload.productPageviewSchema.data.result;
                const sku = this.getSku(item);
                if (sku) {
                    const lastViewedProducts = await this.cookies.viewed.get();
                    const uniqueCartItems = Array.from(new Set([sku, ...lastViewedProducts])).map((item) => `${item}`.trim());
                    await this.setCookie(
                        VIEWED_KEY,
                        uniqueCartItems.slice(0, MAX_VIEWED_COUNT).join(','),
                        COOKIE_SAMESITE,
                        MAX_EXPIRATION,
                        COOKIE_DOMAIN
                    );
                    if (!lastViewedProducts.includes(sku)) {
                        await this.sendPreflight();
                    }
                }
            },
        },
        cart: {
            add: async (event: Payload<CartSchemaData>): Promise<void> => {
                const payload: CartAddRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    cartSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('cart', 'cartAdd', payload);
                await this.cookies.cart.add(event.data.results.map((product) => this.getSku(product)));
            },
            remove: async (event: Payload<CartSchemaData>): Promise<void> => {
                const payload: CartRemoveRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    cartSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('cart', 'cartRemove', payload);
                await this.cookies.cart.remove(event.data.results.map((product) => this.getSku(product)));
            },
            view: async (event: Payload<CartSchemaData>): Promise<void> => {
                const payload: CartViewRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    cartSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('cart', 'cartView', payload);
                // TODO: Tracker was calling cart.cookie.add() but set makes more sense? Also instead of string[], should it save the Item|Product[]?
                await this.cookies.cart.set(event.data.results.map((product) => this.getSku(product))); 
            },
        },
        order: {
            transaction: async (event: Payload<OrderTransactionSchemaData>): Promise<void> => {
                const payload: OrderTransactionRequest = { 
                    siteId: event?.siteId || this.globals.siteId,
                    orderTransactionSchema: {
                        context: await this.getContext(),
                        data: event.data,
                    },
                };

                this.addToPayloadPool('order', 'orderTransaction', payload);
                await this.cookies.cart.clear();
            },
        },
    }

    getSku(product: Product | Item): string {
        return `${product.childSku || product.childUid || product.sku || product.uid || ''}`.trim();
    }

    async getContext(): Promise<Context> {
        const context: Context = {
			userId: await this.getUserId(),
			sessionId: await this.getSessionId(),
			shopperId: await this.getShopperId(),
			pageLoadId: this.generateId(),
			timestamp: this.getTimestamp(),
			pageUrl: typeof window !== 'undefined' && window.location.href || this.config.apis?.href || 'https://searchspring.com', // TODO: should this be full URL or just hostname + path?
            initiator: `searchspring/${this.config.framework}${this.config.version ? `/${this.config.version}` : ''}`,
			attribution: await this.getAttribution(),
			userAgent: navigator.userAgent || this.config.apis?.userAgent,
		};
        if(this.currency.code) {
            context.currency = this.currency;
        }
        return context;
    }

    private async getStoredUUID(key: string, expiration: number): Promise<string> {
        let uuid;
        try {
            if (getFlags().cookies() || this.config.apis?.cookie?.get) {
                const storedValue = await this.getCookie(key);
                uuid = storedValue || this.generateId();
                await this.setCookie(key, uuid, COOKIE_SAMESITE, expiration, COOKIE_DOMAIN);
            } else if (getFlags().storage() || this.config.apis?.localStorage?.getItem) {
                const storedValue = await this.getLocalStorageItem(key);
                if(storedValue) {
                    try {
                        const data = JSON.parse(storedValue);
                        if(data.timestamp && new Date(data.timestamp).getTime() < Date.now() - expiration) {
                            uuid = this.generateId();
                        } else {
                            uuid = data.id;
                        }
                    } catch(e) {
                        console.error('Failed to parse stored UUID, generating new UUID:', e);
                    }
                }
                const data = { 
                    id: uuid || this.generateId(), 
                    timestamp: this.getTimestamp() 
                };
                await this.setLocalStorageItem(key, JSON.stringify(data));
            } else {
                throw new Error('No storage method available');
            }
        } catch(e) {
            console.error('Failed to persist user id to cookie or local storage:', e);
        }

        return uuid;
    }

    private async getUserId(): Promise<string> {
        return await this.getStoredUUID(USER_ID_KEY, THIRTY_MINUTES);
    }

    private async getSessionId(): Promise<string> {
        return await this.getStoredUUID(SESSION_ID_KEY, 0);
    }

    private async getShopperId(): Promise<string> {
        let shopperId: string | null = null;
        try {
            if (getFlags().cookies() || this.config.apis?.cookie?.get) {
                shopperId = await this.getCookie(SHOPPER_ID_KEY);
            } else if (getFlags().storage() || this.config.apis?.localStorage?.getItem) {
                shopperId = await this.getLocalStorageItem(SHOPPER_ID_KEY);
            } else {
                throw new Error('No storage method available');
            }
        } catch(e) {
            console.error('Failed to persist shopper id to cookie or local storage:', e);
        }

        return shopperId || '';
    }

    public async setShopperId(shopperId: string): Promise<void> {
        if (getFlags().cookies() || this.config.apis?.cookie?.set) {
            await this.setCookie(SHOPPER_ID_KEY, shopperId, COOKIE_SAMESITE, MAX_EXPIRATION, COOKIE_DOMAIN);
        } else if (getFlags().storage() || this.config.apis?.localStorage?.setItem) {
            await this.setLocalStorageItem(SHOPPER_ID_KEY, shopperId);
        }
        await this.sendPreflight();
    }

    private async getAttribution(): Promise<ContextAttributionInner[] | undefined> {
        // TODO: only ever returns a single attribution, but attribution can be an array - add other attributions
        let attribution: string | null = null;
        if(typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            attribution = url.searchParams.get(ATTRIBUTION_QUERY_PARAM)
        }
        
        if(attribution) {
            const [type, id] = attribution.split(':');
            if(type && id) {
                if (getFlags().cookies() || this.config.apis?.cookie?.set) {
                    await this.setCookie(ATTRIBUTION_KEY, attribution, COOKIE_SAMESITE, 0, COOKIE_DOMAIN);
                }
                return [{ type, id }];
            }
        } else if (getFlags().cookies() || this.config.apis?.cookie?.get){
            const storedAttribution = await this.getCookie(ATTRIBUTION_KEY);
            if(storedAttribution) {
                const [type, id] = storedAttribution.split(':');
                if(type && id) {
                    return [{ type, id }];
                }
            }
        }
    }

    generateId(): string {
        return uuidv4();
    }
    
    getTimestamp(): string {
        return new Date().toISOString();
    }

    setCurrency(currency: ContextCurrency): void {
        this.currency = currency;
    }
    // TODO: add preflightCache to API spec?
    // TODO: add helper methods:
    // resetSession
    // syncPersonalization
    // updateContext
    // pageLoad (for spa)
    
    private addToPayloadPool(apiType: PayloadRequest['apiType'], endpoint: string, payload: any): string {
        const request: PayloadRequest = {
            id: this.generateId(),
            apiType,
            endpoint,
            payload,
            timestamp: this.getTimestamp()
        };

        this.payloadPool.requests.push(request);
        this.processPayloadPool();
        return request.id;
    }

    private getApiClient(apiType: PayloadRequest['apiType']) {
        switch (apiType) {
            case 'shopper':
                return new ShopperApi();
            case 'autocomplete':
                return new AutocompleteApi();
            case 'search':
            case 'category':
            case 'recommendations':
            case 'product':
                return new ProductApi();
            default:
                throw new Error(`Unknown API type: ${apiType}`);
        }
    }

    private async processPayloadPool(): Promise<void> {
        const requests = [...this.payloadPool.requests];
        for (const request of requests) {
            try {
                const api = this.getApiClient(request.apiType);
                const apiMethod = request.endpoint as keyof typeof api;
                
                if (typeof api[apiMethod] !== 'function') {
                    throw new Error(`Invalid API endpoint: ${request.endpoint}`);
                }

                const response = await api[apiMethod](request.payload);
                this.payloadPool.requests = this.payloadPool.requests.filter(r => r.id !== request.id);
                this.handleResponse(response);
            } catch (error) {
                this.payloadPool.requests = this.payloadPool.requests.filter(r => r.id !== request.id);
                this.handleError(error);
            }
        }
    }

    public clearPayloadPool(): void {
        this.payloadPool.requests = [];
    }

    public async sendPreflight(): Promise<void> {
        // TODO: add preflightCache to API spec?
        const userId = await this.getUserId();
		const siteId = this.globals.siteId;
		const shopper = await this.getShopperId();
		const cart = await this.cookies.cart.get();
		const lastViewed = await this.cookies.viewed.get();

		if (userId && typeof userId == 'string' && siteId && (shopper || cart.length || lastViewed.length)) {
			const preflightParams: PreflightRequestModel = {
				userId,
				siteId,
			};

			let queryStringParams = `?userId=${encodeURIComponent(userId)}&siteId=${encodeURIComponent(siteId)}`;
			if (shopper) {
				preflightParams.shopper = shopper;
				queryStringParams += `&shopper=${encodeURIComponent(shopper)}`;
			}
			if (cart.length) {
				preflightParams.cart = cart;
				queryStringParams += cart.map((item) => `&cart=${encodeURIComponent(item)}`).join('');
			}
			if (lastViewed.length) {
				preflightParams.lastViewed = lastViewed;
				queryStringParams += lastViewed.map((item) => `&lastViewed=${encodeURIComponent(item)}`).join('');
			}

			// const origin = this.config.requesters?.personalization?.origin || `https://${siteId}.a.searchspring.io`;
            const origin = `https://${siteId}.a.searchspring.io`;
			const endpoint = `${origin}/api/personalization/preflightCache`;
			const xhr = new XMLHttpRequest();

			if (charsParams(preflightParams) > 1024) {
				xhr.open('POST', endpoint);
				xhr.setRequestHeader('Content-Type', 'application/json');
				xhr.send(JSON.stringify(preflightParams));
			} else {
				xhr.open('GET', endpoint + queryStringParams);
				xhr.send();
			}
		}
    }
}
