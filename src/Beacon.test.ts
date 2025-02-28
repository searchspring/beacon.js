import { Beacon, CART_KEY, REQUEST_GROUPING_TIMEOUT } from './Beacon';
import { ContextCurrency, Product } from './client';

jest.mock('./client/apis/ShopperApi', () => {
    return {
        ShopperApi: jest.fn().mockImplementation(() => {
            return {
                login: jest.fn().mockResolvedValue({}),
            };
        })
    };
});
jest.mock('./client/apis/AutocompleteApi', () => {
    return {
        AutocompleteApi: jest.fn().mockImplementation(() => {
            return {
                autocompleteRender: jest.fn().mockResolvedValue({}),
                autocompleteImpression: jest.fn().mockResolvedValue({}),
                autocompleteAddtocart: jest.fn().mockResolvedValue({}),
                autocompleteClickthrough: jest.fn().mockResolvedValue({}),
                autocompleteRedirect: jest.fn().mockResolvedValue({}),
            };
        })
    };
});
jest.mock('./client/apis/SearchApi', () => {
    return {
        SearchApi: jest.fn().mockImplementation(() => {
            return {
                searchRender: jest.fn().mockResolvedValue({}),
                searchImpression: jest.fn().mockResolvedValue({}),
                searchAddtocart: jest.fn().mockResolvedValue({}),
                searchClickthrough: jest.fn().mockResolvedValue({}),
                searchRedirect: jest.fn().mockResolvedValue({}),
            };
        })
    };
});
jest.mock('./client/apis/CategoryApi', () => {
    return {
        CategoryApi: jest.fn().mockImplementation(() => {
            return {
                categoryRender: jest.fn().mockResolvedValue({}),
                categoryImpression: jest.fn().mockResolvedValue({}),
                categoryAddtocart: jest.fn().mockResolvedValue({}),
                categoryClickthrough: jest.fn().mockResolvedValue({}),
            };
        })
    };
});
jest.mock('./client/apis/RecommendationsApi', () => {
    return {
        RecommendationsApi: jest.fn().mockImplementation(() => {
            return {
                recommendationsRender: jest.fn().mockResolvedValue({}),
                recommendationsImpression: jest.fn().mockResolvedValue({}),
                recommendationsAddtocart: jest.fn().mockResolvedValue({}),
                recommendationsClickthrough: jest.fn().mockResolvedValue({}),
            };
        })
    };
});
jest.mock('./client/apis/ProductApi', () => {
    return {
        ProductApi: jest.fn().mockImplementation(() => {
            return {
                productPageview: jest.fn().mockResolvedValue({}),
            };
        })
    };
});
jest.mock('./client/apis/CartApi', () => {
    return {
        CartApi: jest.fn().mockImplementation(() => {
            return {
                cartAdd: jest.fn().mockResolvedValue({}),
                cartRemove: jest.fn().mockResolvedValue({}),
                cartView: jest.fn().mockResolvedValue({}),
            };
        })
    };
});
jest.mock('./client/apis/OrderApi', () => {
    return {
        OrderApi: jest.fn().mockImplementation(() => {
            return {
                orderTransaction: jest.fn().mockResolvedValue({}),
            };
        })
    };
});
jest.mock('./client/apis/ErrorLogsApi', () => {
    return {
        ErrorLogsApi: jest.fn().mockImplementation(() => {
            return {
                logShopifypixel: jest.fn().mockResolvedValue({}),
                logSnap: jest.fn().mockResolvedValue({}),
            };
        })
    };
});

const resetAllCookies = () => {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
};

describe('Beacon', () => {
    let beacon: Beacon;
    const mockGlobals = { siteId: 'test-site-id' };
    const mockConfig = {
        id: 'test-id',
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
            })
        };
    })();

    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        resetAllCookies();
        localStorageMock.clear();
        beacon = new Beacon(mockGlobals, mockConfig);
    });

    describe('Constructor', () => {
        it('should create an instance with default values', () => {
            expect(beacon['globals']).toBe(mockGlobals);
            expect(beacon['config'].id).toBe(mockConfig.id);
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

            it('can set and get cart products', async () => {
                await beacon.storage.cart.set(mockProducts);

                // beacon cart getter
                const cartData = await beacon.storage.cart.get();
                expect(cartData).toEqual(mockProducts);

                // cookie contains cart data
                expect(global.document.cookie).toContain(`${CART_KEY}=${encodeURIComponent(JSON.stringify(mockProducts))}`);

                // localStorage contains cart data
                expect(localStorageMock.setItem).toHaveBeenCalled();
                const rawItem = localStorageMock.getItem(CART_KEY)!;
                const data = JSON.parse(rawItem);
                // should be key'd by siteId
                expect(data[mockGlobals.siteId]).toBe(JSON.stringify(mockProducts));

                // can add to exisiting cart data and should be at the front
                const product = { uid: 'productUid5', childUid: 'productChildUid5', sku: 'productSku5', childSku: 'productChildSku5', qty: 1, price: 9.99 };
                await beacon.storage.cart.add([product]);

                const updatedCartData = await beacon.storage.cart.get();
                expect(updatedCartData).toEqual([product, ...mockProducts]);

                // can remove from cart data
                await beacon.storage.cart.remove([product]);
                const removedCartData = await beacon.storage.cart.get();
                expect(removedCartData).toEqual(mockProducts);

                // can decrease quantity from exisiting cart data
                const decreaseQuantityBy = 2;
                expect(multiQuantityTestProduct.qty).toBeGreaterThan(decreaseQuantityBy);
                await beacon.storage.cart.remove([{ ...multiQuantityTestProduct, qty: decreaseQuantityBy }]);

                const removedSingleQuantityCartData = await beacon.storage.cart.get();
                expect(removedSingleQuantityCartData).toEqual([
                    ...mockProducts.filter(p => p.uid !== multiQuantityTestProduct.uid),
                    {
                        ...multiQuantityTestProduct,
                        qty: multiQuantityTestProduct.qty - decreaseQuantityBy,
                    }
                ]);

                // can clear cart data
                await beacon.storage.cart.clear();
                const clearedCartData = await beacon.storage.cart.get();
                expect(clearedCartData).toEqual([]);
                expect(global.document.cookie).toContain(`${CART_KEY}=;`);
                const rawClearedItem = localStorageMock.getItem(CART_KEY)!;
                const clearedData = JSON.parse(rawClearedItem);
                expect(clearedData[mockGlobals.siteId]).toBe("");
            });
        });
    });

    describe('Beacon methods', () => {
        it('can getContext', async () => {
            const context = await beacon.getContext();
            expect(context).toEqual({
                userId: expect.any(String),
                sessionId: expect.any(String),
                shopperId: expect.any(String),
                pageLoadId: expect.any(String),
                timestamp: expect.any(String),
                pageUrl: expect.any(String),
                initiator: expect.any(String),
                attribution: undefined,
                userAgent: expect.any(String),
                currency: undefined,
            });
        });

        it('can persist getContext values', async () => {
            // recreate beacon to contain attribution
            const type = 'attr_type';
            const id = 'attr_value';
            const href = `https://www.example.com/test.html?ss_attribution=${type}:${id}`;
            beacon = new Beacon(mockGlobals, { ...mockConfig, href });

            await beacon.setShopperId('test-shopper-id');
            await beacon.setCurrency({ code: 'EUR' });
            
            const context1 = await beacon.getContext();
            await new Promise(resolve => setTimeout(resolve, 100));
            const context2 = await beacon.getContext();

            expect(context1.userId).toBe(context2.userId);
            expect(context1.sessionId).toBe(context2.sessionId);
            expect(context1.shopperId).toBe(context2.shopperId);
            expect(context1.pageLoadId).toBe(context2.pageLoadId);
            expect(context1.pageUrl).toBe(context2.pageUrl);
            expect(context1.initiator).toBe(context2.initiator);
            expect(context1.userAgent).toBe(context2.userAgent);
            expect(context1.currency).toBe(context2.currency);
            expect(context1.attribution).toStrictEqual(context2.attribution);

            // should be different timestamps
            expect(context1.timestamp).not.toBe(context2.timestamp);
        });

        it('can setShopperId and getShopperId', async () => {
            // context should not have shopperId initially
            const context = await beacon.getContext();
            expect(context.shopperId).toEqual('');

            // storage should not have shopperId initially
            const emptyStoredShopperId = await beacon.getShopperId();
            expect(emptyStoredShopperId).toEqual('');

            // set shopperId
            const shopperId = 'test-shopper-id';
            await beacon.setShopperId(shopperId);

            // should be stored
            const storedShopperId = await beacon.getShopperId();
            expect(storedShopperId).toEqual(shopperId);

            // should be on context
            const updatedContext = await beacon.getContext();
            expect(updatedContext.shopperId).toEqual(shopperId);
        });

        it('can setCurrency', async () => {
            // context should not have currency initially
            const context = await beacon.getContext();
            expect(context.currency).toBeUndefined();
            expect(beacon['currency']).toStrictEqual({ code: '' })


            // set currency
            const currency: ContextCurrency = { code: 'EUR' };
            await beacon.setCurrency(currency);

            // should be stored on class property
            expect(beacon['currency']).toStrictEqual(currency);

            // should be on context
            const updatedContext = await beacon.getContext();
            expect(updatedContext.currency).toStrictEqual(currency);
        });

        it('can getAttribution', async () => {
            // context should not have currency initially
            const context = await beacon.getContext();
            expect(context.attribution).toBeUndefined();

            // unable to mock url in jest, using config.href instead
            const type = 'attr_type';
            const id = 'attr_value';
            const href = `https://www.example.com/test.html?ss_attribution=${type}:${id}`;
            beacon = new Beacon(mockGlobals, { ...mockConfig, href });

            const attribution = await beacon['getAttribution']();
            expect(attribution).toStrictEqual([{ type, id }]);

            // should be on context
            const updatedContext = await beacon.getContext();
            expect(updatedContext.attribution).toStrictEqual([{ type, id }]);
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
        describe('Shopper Login', () => {
            it('can process login event', async () => {
                const shopperId = 'shopper123';
                const data = {
                    id: shopperId
                }
                await beacon.events.shopper.login({ data });
                expect(beacon['shopperId']).toBe(shopperId);
                expect(beacon['apis'].shopper.login).toHaveBeenCalled();
            });
        });
        describe('Autocomplete', () => {
            const data = {...baseSearchSchema};
            it('can process render event', async () => {
                await beacon.events.autocomplete.render({ data });
                await new Promise(resolve => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));
                expect(beacon['apis'].autocomplete.autocompleteRender).toHaveBeenCalled();
            });
            it('can process impression event', async () => {
                await beacon.events.autocomplete.impression({ data });
                await new Promise(resolve => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));
                expect(beacon['apis'].autocomplete.autocompleteImpression).toHaveBeenCalled();
            });
            it('can process addToCart event', async () => {
                await beacon.events.autocomplete.addToCart({ data });
                expect(beacon['apis'].autocomplete.autocompleteAddtocart).toHaveBeenCalled();
            });
            it('can process clickThrough event', async () => {
                await beacon.events.autocomplete.clickThrough({ data });
                expect(beacon['apis'].autocomplete.autocompleteClickthrough).toHaveBeenCalled();
            });
            it('can process redirect event', async () => {
                const data = {
                    redirect: '/new-url'
                }
                await beacon.events.autocomplete.redirect({ data });
                expect(beacon['apis'].autocomplete.autocompleteRedirect).toHaveBeenCalled();
            });
        });
        describe('Search', () => {
            const data = {...baseSearchSchema};
            it('can process render event', async () => {
                await beacon.events.search.render({ data });
                await new Promise(resolve => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));
                expect(beacon['apis'].search.searchRender).toHaveBeenCalled();
            });
            it('can process impression event', async () => {
                await beacon.events.search.impression({ data });
                await new Promise(resolve => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));
                expect(beacon['apis'].search.searchImpression).toHaveBeenCalled();
            });
            it('can process addToCart event', async () => {
                await beacon.events.search.addToCart({ data });
                expect(beacon['apis'].search.searchAddtocart).toHaveBeenCalled();
            });
            it('can process clickThrough event', async () => {
                await beacon.events.search.clickThrough({ data });
                expect(beacon['apis'].search.searchClickthrough).toHaveBeenCalled();
            });
            it('can process redirect event', async () => {
                const data = {
                    redirect: '/new-url'
                }
                await beacon.events.search.redirect({ data });
                expect(beacon['apis'].search.searchRedirect).toHaveBeenCalled();
            });
        });
        describe('Category', () => {
            const data = {...baseSearchSchema};
            it('can process render event', async () => {
                await beacon.events.category.render({ data });
                await new Promise(resolve => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));
                expect(beacon['apis'].category.categoryRender).toHaveBeenCalled();
            });
            it('can process impression event', async () => {
                await beacon.events.category.impression({ data });
                await new Promise(resolve => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));
                expect(beacon['apis'].category.categoryImpression).toHaveBeenCalled();
            });
            it('can process addToCart event', async () => {
                await beacon.events.category.addToCart({ data });
                expect(beacon['apis'].category.categoryAddtocart).toHaveBeenCalled();
            });
            it('can process clickThrough event', async () => {
                await beacon.events.category.clickThrough({ data });
                expect(beacon['apis'].category.categoryClickthrough).toHaveBeenCalled();
            });
        });
        describe('Recommendations', () => {
            const data = {
                tag: 'test-tag',
                results: [...baseSearchSchema.results],
            };
            it('can process render event', async () => {
                await beacon.events.recommendations.render({ data });
                await new Promise(resolve => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));
                expect(beacon['apis'].recommendations.recommendationsRender).toHaveBeenCalled();
            });
            it('can process impression event', async () => {
                await beacon.events.recommendations.impression({ data });
                await new Promise(resolve => setTimeout(resolve, REQUEST_GROUPING_TIMEOUT));
                expect(beacon['apis'].recommendations.recommendationsImpression).toHaveBeenCalled();
            });
            it('can process addToCart event', async () => {
                await beacon.events.recommendations.addToCart({ data });
                expect(beacon['apis'].recommendations.recommendationsAddtocart).toHaveBeenCalled();
            });
            it('can process clickThrough event', async () => {
                await beacon.events.recommendations.clickThrough({ data });
                expect(beacon['apis'].recommendations.recommendationsClickthrough).toHaveBeenCalled();
            });
        });
        describe('Product', () => {
            const data = {
                result: baseSearchSchema.results[0],
            };
            it('can process pageView event', async () => {
                await beacon.events.product.pageView({ data });
                expect(beacon['apis'].product.productPageview).toHaveBeenCalled();
            });
        });
        describe('Cart', () => {
            const data = {
                results: [...baseSearchSchema.results.map(item => {
                    return {
                        ...item,
                        price: 10,
                        qty: 1,
                    }
                })],
                // cart: [],
            };
            it('can process add event', async () => {
                await beacon.events.cart.add({ data });
                expect(beacon['apis'].cart.cartAdd).toHaveBeenCalled();
            });
            it('can process remove event', async () => {
                await beacon.events.cart.remove({ data });
                expect(beacon['apis'].cart.cartRemove).toHaveBeenCalled();
            });
            it('can process view event', async () => {
                await beacon.events.cart.view({ data });
                expect(beacon['apis'].cart.cartView).toHaveBeenCalled();
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
                results: [...baseSearchSchema.results.map(item => {
                    return {
                        ...item,
                        price: 10,
                        qty: 1,
                    }
                })],
            };
            it('can process transaction event', async () => {
                await beacon.events.order.transaction({ data });
                expect(beacon['apis'].order.orderTransaction).toHaveBeenCalled();
            });
        });
        describe('Error', () => {
            const data = {
                message: 'test-message',
                stack: 'test-stack',
                details: { test: 'test' },
            };
            it('can process shopifypixel event', async () => {
                await beacon.events.error.shopifypixel({ data });
                expect(beacon['apis'].error.logShopifypixel).toHaveBeenCalled();
            });
            it('can process snap event', async () => {
                await beacon.events.error.snap({ data });
                expect(beacon['apis'].error.logSnap).toHaveBeenCalled();
            });
        });
    });    
});
