import CONSTS from './consts'
import populateDb from './helpers/populateDb'
import clearDb from './helpers/clearDb'
import {ObjectID} from 'mongodb'
import {addDays, addHours, startOfDay, subHours, subDays} from 'date-fns'
import {utcToZonedTime, zonedTimeToUtc} from 'date-fns-tz'
import handler from '../pages/api/getShippingRates'
import {testApiHandler} from 'next-test-api-route-handler'
import {IShippingRateRequestBody} from '@/app/utils/aggregator/types'
import createDefaultShippingMethod from '../helpers/createDefaultShippingMethod'
import DateHelper from '@/app/utils/date'
import {IBlockedDate, IOrderDocument, IRegion, IShippingMethodBand, IStoreDocument} from '@/app/types/store'
import {connectToDatabase} from '@/app/utils/mongo'
import createDefaultRegion from '../helpers/createDefaultRegion'
import methods from '../atlas'
import createDefaultRule from '../helpers/createDefaultRule'

const createDefaultShippingRateRequestBody = (nominatedDate: string): IShippingRateRequestBody => {
    return {
        rate: {
            origin: {
                country: "GB",
                postal_code: "ABC 12D",
                province: "ENG",
                city: "Bristol",
                name: null,
                address1: "1",
                address2: "Road",
                address3: null,
                phone: "01234567890",
                fax: null,
                email: null,
                address_type: null,
                company_name: "Jest"
            },
            destination: {
                country: "GB",
                postal_code: "BS44PW",
                province: "ENG",
                city: "Bristol",
                name: "Jester Jest",
                address1: "1",
                address2: "Road",
                address3: null,
                phone: null,
                fax: null,
                email: null,
                address_type: null,
                company_name: null
            },
            items: [
                {
                    name: "Line Item One",
                    sku: "LINEITEMONE",
                    quantity: 1,
                    grams: 0,
                    price: 9999,
                    vendor: "Jest Store",
                    requires_shipping: true,
                    taxable: false,
                    fulfillment_service: "manual",
                    properties: {},
                    product_id: 1,
                    variant_id: 2
                },
                {
                    name: "Line Item Two",
                    sku: "LINEITEMONE",
                    quantity: 1,
                    grams: 0,
                    price: 9999,
                    vendor: "Jest Store",
                    requires_shipping: true,
                    taxable: false,
                    fulfillment_service: "manual",
                    properties: {
                        _nominated_date: nominatedDate,
                    },
                    product_id: 2,
                    variant_id: 3
                }
            ],
            currency: "GBP",
            locale: "en"
        }
    }
}

const getSubOffsetHours = (hours: number) => {
    // then we're going back a day - enforce midnight
    if (hours === 23) {
        return '00'
    } else {
        return `${hours}`
    }
}

describe('getShippingRates', () => {

    let mongo
    let connection
    let db
    let store: IStoreDocument = null
    let defaultRegion: IRegion = null

    beforeAll(async () => {
        mongo = await connectToDatabase()

        connection = mongo.connection
        db = mongo.db

        await populateDb(db)
        store = await db.collection('stores').findOne({_id: CONSTS.STORE_ID})
        defaultRegion = await db.collection('regions').findOne({default: true})
    })

    afterAll(async () => {
        await clearDb(db)
        await mongo.client.close()
    })

    afterEach(async () => {
        await db.collection('shipping_methods').deleteMany({})

        store.config.carrier_test_mode_enabled = false
        store.config.carrier_test_mode_match = 'ABC123'
        await methods.store.updateConfig(store._id, store.config)
    })

    it('should return no rates when carrier test mode is enabled and the test criteria does not match', async () => {

        // set store to test mode
        const config = store.config
        config.carrier_test_mode_enabled = true
        await methods.store.updateConfig(store._id, config)

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should return rates when carrier test mode is enabled and the test criteria matches', async () => {

        // set store to test mode
        const config = store.config
        config.carrier_test_mode_enabled = true
        await methods.store.updateConfig(store._id, config)

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        rateRequest.rate.destination.address1 = config.carrier_test_mode_match

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should get next day only rates', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const tomorrow = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY')
        method.promise_start = 1
        method.promise_end = 1

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // setup dispatch days to allow for a next day delivery (i.e. cutoff is 1 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(tomorrow, CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should get two day only rates', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 2))

        // setup & insert a two day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'TWODAY')
        method.promise_start = 2
        method.promise_end = 2

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // setup dispatch days to allow for a next day delivery (i.e. cutoff is 1 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should get no rates when the configured method allows for next day but is past the cutoff', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const tomorrow = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY')
        method.promise_start = 1
        method.promise_end = 2

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // setup cutoff to be before now
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${getSubOffsetHours(subHours(now, 1).getHours())}:00`

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(tomorrow, CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should return no next day only delivery if we are exceeding the cutoff', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const tomorrow = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY')
        method.promise_start = 1
        method.promise_end = 1

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // setup dispatch days to allow for a next day delivery (i.e. cutoff is 1 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${now.getHours()}:00`

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(tomorrow, CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have no methods returned
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should not return disabled shipping methods', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.enabled = false

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should get standard rates (before cutoff)', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should get standard rates (after cutoff)', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${subHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, (method.promise_start + 1)), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should apply free shipping to relevant carts', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${subHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4

        // create a free shipping band
        const freeShippingBand: IShippingMethodBand = {
            name: 'FREE_SHIPPING',
            priority: 1,
            requirement: {
                type: 'cartCost',
                condition: 'greaterThan',
                value: 1
            },
            cost: {
                type: 'fixedCost',
                value: 0
            }
        }

        method.bands = [freeShippingBand]

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, (method.promise_start + 1)), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                expect(json.rates.length).toBe(1)

                const rate = json.rates[0]

                expect(rate.total_price).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should include rates when product condition "none" is met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.product_based.enabled = true
        method.conditions.product_based.type = 'none'
        method.conditions.product_based.product_ids = [
            {
                id: 'gid://shopify/Product/1',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/1',
                    }
                ]
            }
        ]

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should exclude rates when product condition "none" is not met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.product_based.enabled = true
        method.conditions.product_based.type = 'none'
        method.conditions.product_based.product_ids = [
            {
                id: 'gid://shopify/Product/1',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/1',
                    }
                ]
            }
        ]

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should include rates when product condition "all" is met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.product_based.enabled = true
        method.conditions.product_based.type = 'all'
        method.conditions.product_based.product_ids = [
            {
                id: 'gid://shopify/Product/1',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/1',
                    }
                ]
            },
            {
                id: 'gid://shopify/Product/2',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/2',
                    }
                ]
            },
            {
                id: 'gid://shopify/Product/3',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/3',
                    }
                ]
            }
        ]

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 3,
                variant_id: 3
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should exclude rates when product condition "all" is not met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.product_based.enabled = true
        method.conditions.product_based.type = 'all'
        method.conditions.product_based.product_ids = [
            {
                id: 'gid://shopify/Product/1',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/1',
                    }
                ]
            },
            {
                id: 'gid://shopify/Product/2',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/2',
                    }
                ]
            },
            {
                id: 'gid://shopify/Product/3',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/3',
                    }
                ]
            }
        ]

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 500,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 2,
                grams: 500,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should include rates when product condition "at_least_one" is met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.product_based.enabled = true
        method.conditions.product_based.type = 'at_least_one'
        method.conditions.product_based.product_ids = [
            {
                id: 'gid://shopify/Product/1',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/1',
                    }
                ]
            },
            {
                id: 'gid://shopify/Product/2',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/2',
                    }
                ]
            },
            {
                id: 'gid://shopify/Product/3',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/3',
                    }
                ]
            }
        ]

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 4,
                variant_id: 4
            },
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 5,
                variant_id: 5
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should exclude rates when product condition "at_least_one" is not met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.product_based.enabled = true
        method.conditions.product_based.type = 'at_least_one'
        method.conditions.product_based.product_ids = [
            {
                id: 'gid://shopify/Product/1',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/1',
                    }
                ]
            },
            {
                id: 'gid://shopify/Product/2',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/2',
                    }
                ]
            },
            {
                id: 'gid://shopify/Product/3',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/3',
                    }
                ]
            }
        ]

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 4,
                variant_id: 4
            },
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 5,
                variant_id: 5
            },
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 6,
                variant_id: 6
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should include rates when product condition "only" is met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.product_based.enabled = true
        method.conditions.product_based.type = 'only'
        method.conditions.product_based.product_ids = [
            {
                id: 'gid://shopify/Product/1',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/1',
                    }
                ]
            },
            {
                id: 'gid://shopify/Product/2',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/2',
                    }
                ]
            },
        ]

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should exclude rates when product condition "only" is not met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.product_based.enabled = true
        method.conditions.product_based.type = 'only'
        method.conditions.product_based.product_ids = [
            {
                id: 'gid://shopify/Product/1',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/1',
                    }
                ]
            },
            {
                id: 'gid://shopify/Product/2',
                variants: [
                    {
                        id: 'gid://shopify/ProductVariant/2',
                    }
                ]
            },
        ]

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "Line Item One",
                sku: "LINEITEMONE",
                quantity: 1,
                grams: 0,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 3,
                variant_id: 3
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should include rates when weight condition "greater_than" is met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.weight_based.enabled = true
        method.conditions.weight_based.type = 'greater_than'
        method.conditions.weight_based.value = {
            min: 500,
            max: 0,
        }

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should exclude rates when weight condition "greater_than" is not met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.weight_based.enabled = true
        method.conditions.weight_based.type = 'greater_than'
        method.conditions.weight_based.value = {
            min: 500,
            max: 0,
        }

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should include rates when weight condition "less_than" is met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.weight_based.enabled = true
        method.conditions.weight_based.type = 'less_than'
        method.conditions.weight_based.value = {
            min: 0,
            max: 1000,
        }

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should exclude rates when weight condition "less_than" is not met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.weight_based.enabled = true
        method.conditions.weight_based.type = 'less_than'
        method.conditions.weight_based.value = {
            min: 0,
            max: 50,
        }

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should include rates when weight condition "equal" is met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.weight_based.enabled = true
        method.conditions.weight_based.type = 'equal'
        method.conditions.weight_based.value = {
            min: 750,
            max: 0,
        }

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should exclude rates when weight condition "equal" is not met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.weight_based.enabled = true
        method.conditions.weight_based.type = 'equal'
        method.conditions.weight_based.value = {
            min: 250,
            max: 0,
        }

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should include rates when weight condition "between" is met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.weight_based.enabled = true
        method.conditions.weight_based.type = 'between'
        method.conditions.weight_based.value = {
            min: 250,
            max: 1000,
        }

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should exclude rates when weight condition "between" is not met', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.weight_based.enabled = true
        method.conditions.weight_based.type = 'between'
        method.conditions.weight_based.value = {
            min: 1000,
            max: 2000,
        }

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should include rates when sku condition "at_least_one" is met (exact match)', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.sku_based.enabled = true
        method.conditions.sku_based.partial_match = false
        method.conditions.sku_based.type = 'at_least_one'
        method.conditions.sku_based.value = 'line_1,line_2,line_3'

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should exclude rates when sku condition "at_least_one" is not met (exact match)', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.sku_based.enabled = true
        method.conditions.sku_based.partial_match = false
        method.conditions.sku_based.type = 'at_least_one'
        method.conditions.sku_based.value = 'line_4,line_5,line_6'

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should include rates when sku condition "at_least_one" is met (partial match)', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.sku_based.enabled = true
        method.conditions.sku_based.partial_match = true
        method.conditions.sku_based.type = 'at_least_one'
        method.conditions.sku_based.value = '_1'

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should exclude rates when sku condition "at_least_one" is not met (partial match)', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.sku_based.enabled = true
        method.conditions.sku_based.partial_match = true
        method.conditions.sku_based.type = 'at_least_one'
        method.conditions.sku_based.value = '_3'

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should include rates when sku condition "none" is met (exact match)', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.sku_based.enabled = true
        method.conditions.sku_based.partial_match = false
        method.conditions.sku_based.type = 'none'
        method.conditions.sku_based.value = 'line_3,line_4'

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should exclude rates when sku condition "none" is not met (exact match)', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.sku_based.enabled = true
        method.conditions.sku_based.partial_match = false
        method.conditions.sku_based.type = 'none'
        method.conditions.sku_based.value = 'line_1,line_2'

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should include rates when sku condition "none" is met (partial match)', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.sku_based.enabled = true
        method.conditions.sku_based.partial_match = true
        method.conditions.sku_based.type = 'none'
        method.conditions.sku_based.value = '_3'

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should exclude rates when sku condition "none" is not met (partial match)', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.sku_based.enabled = true
        method.conditions.sku_based.partial_match = true
        method.conditions.sku_based.type = 'none'
        method.conditions.sku_based.value = '_1'

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should include rates when sku condition "only" is met (exact match)', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.sku_based.enabled = true
        method.conditions.sku_based.partial_match = false
        method.conditions.sku_based.type = 'only'
        method.conditions.sku_based.value = 'line_1,line_2'

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should exclude rates when sku condition "only" is not met (exact match)', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.sku_based.enabled = true
        method.conditions.sku_based.partial_match = false
        method.conditions.sku_based.type = 'only'
        method.conditions.sku_based.value = 'line_4,line_5,line_6'

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should include rates when sku condition "only" is met (partial match)', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.sku_based.enabled = true
        method.conditions.sku_based.partial_match = true
        method.conditions.sku_based.type = 'only'
        method.conditions.sku_based.value = '_1,_2'

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 250,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should exclude rates when sku condition "only" is not met (partial match)', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = startOfDay(addDays(now, 1))

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        // setup dispatch days so delivery is before cutoff
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // set generic delivery promise
        method.promise_start = 2
        method.promise_end = 4
        method.conditions.sku_based.enabled = true
        method.conditions.sku_based.partial_match = true
        method.conditions.sku_based.type = 'only'
        method.conditions.sku_based.value = '_1'

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'
        rateRequest.rate.items = [
            {
                name: "line_1",
                sku: "line_1",
                quantity: 1,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 1,
                variant_id: 1
            },
            {
                name: "line_2",
                sku: "line_2",
                quantity: 2,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
            {
                name: "line_3",
                sku: "line_3",
                quantity: 2,
                grams: 50,
                price: 9999,
                vendor: "Jest Store",
                requires_shipping: true,
                taxable: false,
                fulfillment_service: "manual",
                properties: {
                    _nominated_date: zonedTimeToUtc(addDays(nominatedDate, method.promise_start), CONSTS.APP_TIMEZONE).toUTCString(),
                },
                product_id: 2,
                variant_id: 2
            },
        ]

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have only one method returned, our next day method
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method we just created
        await db.collection('shipping_methods').deleteMany({})
    })

    it('should return no delivery methods if date selected is blocked for this method', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const tomorrow = startOfDay(addDays(now, 1))
        const expectedBlockedStartDate = zonedTimeToUtc(startOfDay(subDays(now, 2)), CONSTS.APP_TIMEZONE)
        const expectedBlockedEndDate = zonedTimeToUtc(startOfDay(addDays(now, 2)), CONSTS.APP_TIMEZONE)

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY')
        method.promise_start = 1
        method.promise_end = 1

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // setup dispatch days to allow for a next day delivery (i.e. cutoff is 2 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${now.getHours() + 1}:00`

        // insert record
        const shipping_method = await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(tomorrow, CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'

        // create blocked date record
        const blockedDate: IBlockedDate = {
            store_id: store._id,
            resource_id: shipping_method.insertedId.toString(),
            title: 'JEST',
            start: expectedBlockedStartDate,
            end: expectedBlockedEndDate,
        }

        await db.collection('blocked_dates').insertOne(blockedDate)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have no methods returned
                expect(json.rates.length).toBe(0)
            }
        })

        // remove the shipping method and blocked date we just created
        await db.collection('shipping_methods').deleteMany({})
        await db.collection('blocked_dates').deleteMany({})
    })

    it('should return delivery methods if date selected is after blocked-dates for this method', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const deliveryDay = startOfDay(addDays(now, 5))
        const expectedBlockedStartDate = zonedTimeToUtc(startOfDay(subDays(now, 2)), CONSTS.APP_TIMEZONE)
        const expectedBlockedEndDate = zonedTimeToUtc(startOfDay(addDays(now, 2)), CONSTS.APP_TIMEZONE)

        // setup & insert a std shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD-DELIVERY')
        method.promise_start = 2
        method.promise_end = 3

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // setup dispatch days to allow for delivery (i.e. cutoff is 2 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${now.getHours() + 1}:00`

        // insert record
        const shipping_method = await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with deliveryDay as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(deliveryDay, CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'

        // create blocked date record
        const blockedDate: IBlockedDate = {
            store_id: store._id,
            resource_id: shipping_method.insertedId.toString(),
            title: 'JEST',
            start: expectedBlockedStartDate,
            end: expectedBlockedEndDate,
        }

        await db.collection('blocked_dates').insertOne(blockedDate)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have 1 method returned
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method and blocked date we just created
        await db.collection('shipping_methods').deleteMany({})
        await db.collection('blocked_dates').deleteMany({})
    })

    it('should return delivery methods if date selected is before blocked-dates for this method', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const deliveryDay = startOfDay(addDays(now, 5))
        const expectedBlockedStartDate = zonedTimeToUtc(startOfDay(addDays(now, 6)), CONSTS.APP_TIMEZONE)
        const expectedBlockedEndDate = zonedTimeToUtc(startOfDay(addDays(now, 8)), CONSTS.APP_TIMEZONE)

        // visual debugging
        console.log({
            'Timezone': CONSTS.APP_TIMEZONE,
            'Now': now, 
            'DeliverOn': zonedTimeToUtc(deliveryDay, CONSTS.APP_TIMEZONE), 
            'BlockedFrom': expectedBlockedStartDate, 
            'BlockedTo': expectedBlockedEndDate
        })

        // setup & insert a std shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD-DELIVERY')
        method.promise_start = 2
        method.promise_end = 3

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // setup dispatch days to allow for delivery (i.e. cutoff is 2 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${now.getHours() + 1}:00`

        // insert record
        const shipping_method = await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with deliveryDay as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(deliveryDay, CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'

        // create blocked date record
        const blockedDate: IBlockedDate = {
            store_id: store._id,
            resource_id: shipping_method.insertedId.toString(),
            title: 'JEST',
            start: expectedBlockedStartDate,
            end: expectedBlockedEndDate,
        }

        await db.collection('blocked_dates').insertOne(blockedDate)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have 1 method returned
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method and blocked date we just created
        await db.collection('shipping_methods').deleteMany({})
        await db.collection('blocked_dates').deleteMany({})
    })

    it('should return 1 of the 2 delivery methods if date selected is blocked for one of them', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const tomorrow = startOfDay(addDays(now, 1))
        const expectedBlockedStartDate = zonedTimeToUtc(startOfDay(subDays(now, 2)), CONSTS.APP_TIMEZONE)
        const expectedBlockedEndDate = zonedTimeToUtc(startOfDay(addDays(now, 2)), CONSTS.APP_TIMEZONE)

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY')
        method.promise_start = 1
        method.promise_end = 1

        // associate it with the default region
        const region = await db.collection('regions').findOne({default: true})
        method.region_ids = [ObjectID(region._id)]

        // setup dispatch days to allow for a next day delivery (i.e. cutoff is 2 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${now.getHours() + 1}:00`

        // insert record
        const shipping_method = await db.collection('shipping_methods').insertOne(method)

        // create a default create request body (with tomorrow as the nominated delivery date)
        const rateRequest = createDefaultShippingRateRequestBody(zonedTimeToUtc(tomorrow, CONSTS.APP_TIMEZONE).toUTCString())

        // ensure we fall into the default region
        rateRequest.rate.destination.postal_code = 'SW1V 1QT'

        // create blocked date record
        const blockedDate: IBlockedDate = {
            store_id: store._id,
            resource_id: shipping_method.insertedId.toString(),
            title: 'JEST',
            start: expectedBlockedStartDate,
            end: expectedBlockedEndDate,
        }

        await db.collection('blocked_dates').insertOne(blockedDate)

        // setup & insert a second shipping method to db (all delivery & dispatch days enabled)
        const methodTwo = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY-TWO')
        methodTwo.promise_start = 1
        methodTwo.promise_end = 1

        // associate it with the default region
        const regionTwo = await db.collection('regions').findOne({default: true})
        methodTwo.region_ids = [ObjectID(regionTwo._id)]

        // setup dispatch days to allow for a next day delivery (i.e. cutoff is 4 hour from now)
        methodTwo.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${now.getHours() + 3}:00`

        // insert record
        await db.collection('shipping_methods').insertOne(methodTwo)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify(rateRequest)
                })

                const json = await res.json()

                expect(res.status).toBe(200)

                // we should have 1 method returned
                expect(json.rates.length).toBe(1)
            }
        })

        // remove the shipping method and blocked date we just created
        await db.collection('shipping_methods').deleteMany({})
        await db.collection('blocked_dates').deleteMany({})
    })
})
