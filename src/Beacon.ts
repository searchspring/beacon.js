import deepmerge from 'deepmerge';
import { v4 as uuidv4 } from 'uuid';
import { Context, 
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

type BeaconConfig = {
    id?: string;
    mode?: 'development' | 'production';
    framework?: string;
    version?: string;
    apis?: {
        cookie?: {
            get: (name?: string) => Promise<string>;
            set: (cookieString: string) => Promise<string>;
        },
        localStorage?: {
            clear: () => Promise<void>;
            getItem: (key: string) => Promise<string>;
            setItem: (key: string, value: any) => Promise<void>;
            removeItem: (key: string) => Promise<void>;
        },
    },
    href?: string;
    userAgent?: string;
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
	framework: 'snap/preact',
	mode: 'production',
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
    private mode: 'production' | 'development';
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

        if (this.config.mode && ['production', 'development'].includes(this.config.mode)) {
            this.mode = this.config.mode;
        }

        this.globals = globals;

        if (this.globals.currency?.code) {
            this.setCurrency(this.globals.currency);
		}

        if (typeof window !== 'undefined' && !window.searchspring?.beacon) {
			window.searchspring = window.searchspring || {};
			window.searchspring.beacon = this;
		}

        this.processPayloadPool();
    }

    handleResponse = (response: any): void => {
        // TODO: handle response
        this.mode === 'development' && console.log('event resolved response:', response);
    }

    handleError = (error: any): void => {
        // TODO: handle error
        this.mode === 'development' && console.log('event resolved error:', error);
    }

    private async getCookie(name: string): Promise<string> {
        const getCookieFn = this.config.apis?.cookie?.get;
        if(getCookieFn) {
            try {
                return await getCookieFn(name);
            } catch(e) {
                console.error('Failed to get cookie using custom API:', e);
            }
        } else if(typeof window !== 'undefined') {
            try {
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
            } catch(e) {
                console.error('Failed to get cookie:', e);
            }
        }
        return '';
    }

    private async setCookie(name: string, value: string, samesite: string, expiration: number, domain?: string): Promise<void> {
        let cookie = `${name}=${encodeURIComponent(value)};` + `SameSite=${samesite};` + 'path=/;';
        if (!(typeof window !== 'undefined' && window.location.protocol == 'http:')) {
            // adds secure by default and for shopify pixel - only omits secure if protocol is http and not shopify pixel
            cookie += 'Secure;';
        }
        if (expiration) {
            const d = new Date()
            d.setTime(d.getTime() + expiration);
            cookie += `expires=${d['toUTCString']()};`;
        }
        if (domain) {
            cookie += `domain=${domain};`;
        }

        const setCookieFn = this.config.apis?.cookie?.set;
        if(setCookieFn) {
            try {
                await setCookieFn(cookie);
                return;
            } catch(e) {
                console.error('Failed to set cookie using custom API:', e);
            }
        } else if(typeof window !== 'undefined') {
            try {
                window.document.cookie = cookie;
            } catch(e) {
                console.error('Failed to set cookie:', e);
            }
        }
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
            login: async (event: Payload<{ id: string }>): Promise<void> => {
                const shopperId = await this.getShopperId();
                if(!shopperId && !event.data?.id) {
                    console.error('beacon.events.shopper.login event: requires a valid shopper ID to exist');
                    return;
                }

                if(event.data?.id && event?.data?.id != shopperId) {
                    await this.setShopperId(event.data.id);
                    const payload: LoginRequest = { 
                        siteId: event?.siteId || this.globals.siteId,
                        shopperLoginSchema: {
                            context: await this.getContext(),
                        },
                    };
                    this.addToPayloadPool('shopper', 'login', payload);
                }
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
			pageUrl: typeof window !== 'undefined' && window.location.href || this.config.href || '', 
            initiator: `searchspring/${this.config.framework}${this.config.version ? `/${this.config.version}` : ''}`,
			attribution: await this.getAttribution(),
			userAgent: navigator?.userAgent || this.config.userAgent,
		};
        if(this.currency.code) {
            context.currency = this.currency;
        }
        return context;
    }

    private async getStoredID(key: string, expiration: number): Promise<string> {
        // try to get the value from the cookie
        const storedCookieValue = await this.getCookie(key);
        if(storedCookieValue) {
            await this.setCookie(key, storedCookieValue, COOKIE_SAMESITE, expiration, COOKIE_DOMAIN);
            return storedCookieValue;
        }

        // try to get the value from the local storage
        const storedLocalStorageValue = await this.getLocalStorageItem(key);
        if(storedLocalStorageValue) {
            let uuid;
            try {
                const data = JSON.parse(storedLocalStorageValue);
                if(data.timestamp && new Date(data.timestamp).getTime() < Date.now() - expiration) {
                    uuid = this.generateId();
                } else {
                    uuid = data.id;
                }
            } catch(e) {
                console.error('Failed to parse stored UUID, generating new UUID:', e);
            } finally {
                const data = {
                    id: uuid || this.generateId(), 
                    timestamp: this.getTimestamp() 
                }
                await this.setLocalStorageItem(key, JSON.stringify(data));
                await this.setCookie(key, data.id, COOKIE_SAMESITE, expiration, COOKIE_DOMAIN); // attempt to store in cookie
                return data.id;
            }
        }

        // if no stored value, generate a new one and store it in both cookie and local storage
        try {
            const data = { 
                id: this.generateId(), 
                timestamp: this.getTimestamp() 
            };
            await this.setCookie(key, data.id, COOKIE_SAMESITE, expiration, COOKIE_DOMAIN);
            await this.setLocalStorageItem(key, JSON.stringify(data));
            return data.id;
        } catch(e) {
            console.error('Failed to persist user id to cookie or local storage:', e);
        }

        return ''; // empty string will cause beacon validation to fail
    }

    private async getUserId(): Promise<string> {
        return await this.getStoredID(USER_ID_KEY, THIRTY_MINUTES);
    }

    private async getSessionId(): Promise<string> {
        return await this.getStoredID(SESSION_ID_KEY, 0);
    }

    private async getShopperId(): Promise<string> {
        let shopperId: string | null = null;
        try {
            shopperId = (await this.getCookie(SHOPPER_ID_KEY)) || (await this.getLocalStorageItem(SHOPPER_ID_KEY));
        } catch(_) {
            // noop
        }

        return shopperId || '';
    }

    public async setShopperId(shopperId: string): Promise<void> {
        if(!shopperId) {
            console.error('Shopper ID is required when setShopperId is called');
            return;
        }
        const exisitingShopperId = await this.getShopperId();
        if(exisitingShopperId !== shopperId) {
            await this.setCookie(SHOPPER_ID_KEY, shopperId, COOKIE_SAMESITE, MAX_EXPIRATION, COOKIE_DOMAIN);
            await this.setLocalStorageItem(SHOPPER_ID_KEY, shopperId);
            await this.sendPreflight();
        }
    }

    private async getAttribution(): Promise<ContextAttributionInner[] | undefined> {
        let attribution: string | null = null;
        
        try {
            const url = new URL((await this.getContext()).pageUrl);
            attribution = url.searchParams.get(ATTRIBUTION_QUERY_PARAM)
        } catch(e) {
            // noop - URL failed to parse empty url
        }
    
        // TODO: should this also fallback to storage?
        // TODO: should append attribution to existiing attribution data? 
        // TODO: What are the other attributions and how do we handle them? 
        // TODO: Do/should a/b campaigns use attribution?
        if(attribution) {
            const [type, id] = attribution.split(':');
            if(type && id) {
                
                await this.setCookie(ATTRIBUTION_KEY, attribution, COOKIE_SAMESITE, 0, COOKIE_DOMAIN);
                return [{ type, id }];
            }
        } else {
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
                return new SearchApi();
            case 'category':
                return new CategoryApi();
            case 'recommendations':
                return new RecommendationsApi();
            case 'product':
                return new ProductApi();
            case 'cart':
                return new CartApi();
            case 'order':
                return new OrderApi();
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

    public async sendPreflight(): Promise<void> {
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



export type ParameterObject = Record<string, boolean | string | string[] | number | number[] | unknown>;

export function charsParams(params: ParameterObject): number {
	if (typeof params != 'object') {
		throw new Error('function requires an object');
	}

	const count = Object.keys(params).reduce((count, key) => {
		const keyLength = key.length;
		const value = params[key];
		if (Array.isArray(value)) {
			return (
				count +
				(value as string[]).reduce((length, val) => {
					return length + keyLength + 1 + ('' + val).length;
				}, 0)
			);
		} else if (typeof value == 'object') {
			//recursive check
			return count + keyLength + 1 + charsParams(value as any);
		} else if (typeof value == 'string' || typeof value == 'number') {
			return count + keyLength + 1 + ('' + value).length;
		} else return count + keyLength;
	}, 1);

	return count;
}
