import CONSTS from './consts'
import populateDb from './helpers/populateDb'
import clearDb from './helpers/clearDb'
import {ObjectID} from 'mongodb'
import handler from '../pages/api/proxy/lookup'
import {testApiHandler} from 'next-test-api-route-handler'
import {utcToZonedTime, zonedTimeToUtc} from 'date-fns-tz'
import {addDays, addHours, startOfDay, subHours} from 'date-fns'
import createDefaultShippingMethod from '../helpers/createDefaultShippingMethod'
import DateHelper, {DAYS_IN_WEEK} from '@/app/utils/date'
import {IBlockedDate, IOrderDocument, IRegion, IStoreDocument} from '@/app/types/store'
import ShippingMethodModel from '../models/ShippingMethod'
import createDefaultRule from '../helpers/createDefaultRule'
import {APP_TIMEZONE} from '@/app/consts/app'
import {connectToDatabase} from '@/app/utils/mongo'

// @todo THERE IS A BUG IF THE TEST IS RUN AT MIDNIGHT FOR ANY TESTS WHICH SET THE OFFSET AS 1 HOUR AHEAD - TESTS WILL ALWAYS FAIL AFTER 11 PM
// @todo iterate all tests so they are run for every hour of the day?

const getSubOffsetHours = (hours: number) => {
    // then we're going back a day - enforce midnight
    if (hours === 23) {
        return '00'
    } else {
        return `${hours}`
    }
}

describe('lookup', () => {

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
        await db.collection('orders').deleteMany({})
        await db.collection('blocked_dates').deleteMany({})
        await db.collection('rules').deleteMany({})
    })

    /**
     * This test configures a delivery method which should allow for same day delivery
     * This allows us to ensure that in a best case scenario, where every day should be available - it is.
     */
    it('should retrieve a date window with all dates available', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        // setup & insert a delivery method which allows same day delivery
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'SAME_DAY')
        method.promise_start = 0
        method.promise_end = 2
        method.region_ids = [ObjectID(defaultRegion._id)]

        // setup dispatch days to allow for a next day delivery (i.e. cutoff is 1 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = json.dates

                expect(res.status).toBe(200)

                expect(dates.length).toBe(store.config.window)

                const unavailableDates = dates.filter(date => !date.available)

                expect(unavailableDates.length).toBe(0)
            }
        })
    })

    /**
     * This test ensures that the earliest date available is tomorrow, when there is no same day delivery
     * method available
     */
    it('should retrieve a date window with no same day delivery', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const today = zonedTimeToUtc(startOfDay(now), CONSTS.APP_TIMEZONE)

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY')
        method.promise_start = 1
        method.promise_end = 2
        method.region_ids = [ObjectID(defaultRegion._id)]

        // setup dispatch days to allow for a next day delivery (i.e. cutoff is 1 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        expect(ShippingMethodModel(method).isExpressMethod()).toBe(false)

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = json.dates

                expect(res.status).toBe(200)

                expect(dates.length).toBeGreaterThan(0)

                const unavailableDates = dates.filter(date => !date.available)

                expect(unavailableDates.length).toBe(1)

                expect(unavailableDates[0].date).toBe(today.toISOString())
            }
        })
    })

    /**
     * Ensures delivery methods with next day available are accounted for
     */
    it('should retrieve a date window with next day being the earliest', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const tomorrow = zonedTimeToUtc(startOfDay(addDays(now, 1)), CONSTS.APP_TIMEZONE)

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY')
        method.promise_start = 1
        method.promise_end = 2
        method.region_ids = [ObjectID(defaultRegion._id)]

        // setup dispatch days to allow for a next day delivery (i.e. cutoff is 1 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        expect(ShippingMethodModel(method).isExpressMethod()).toBe(false)

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = json.dates

                expect(res.status).toBe(200)

                expect(dates.length).toBeGreaterThan(0)

                const earliestAvailableDate = dates.find(date => date.available)

                expect(earliestAvailableDate.date).toBe(tomorrow.toISOString())
            }
        })
    })

    /**
     * Ensure promise is adhered to for more standard delivery methods
     */
    it('should retrieve a date window with the earliest date being one which matches the methods promise start', async () => {

        const promiseStart = 2

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const expectedEarliestDate = zonedTimeToUtc(startOfDay(addDays(now, promiseStart)), CONSTS.APP_TIMEZONE)

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY')
        method.promise_start = promiseStart
        method.promise_end = 4
        method.region_ids = [ObjectID(defaultRegion._id)]

        // setup dispatch days to allow for a next day delivery (i.e. cutoff is 1 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        expect(ShippingMethodModel(method).isExpressMethod()).toBe(false)

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = json.dates

                expect(res.status).toBe(200)

                expect(dates.length).toBeGreaterThan(0)

                const earliestAvailableDate = dates.find(date => date.available)

                expect(earliestAvailableDate.date).toBe(expectedEarliestDate.toISOString())
            }
        })
    })

    /**
     * Tests cutoff handling for delivery methods
     */
    it('should not allow next day delivery when the current time has surpassed the methods configured cutoff time', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const expectedEarliestDeliveryDate = zonedTimeToUtc(startOfDay(addDays(now, 2)), CONSTS.APP_TIMEZONE)

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY')
        method.promise_start = 1
        method.promise_end = 2
        method.region_ids = [ObjectID(defaultRegion._id)]

        // setup dispatch days to allow for a next day delivery (i.e. cutoff is 1 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${getSubOffsetHours(subHours(now, 1).getHours())}:00`

        expect(ShippingMethodModel(method).isExpressMethod()).toBe(false)

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = json.dates

                expect(res.status).toBe(200)

                expect(dates.length).toBeGreaterThan(0)

                const earliestAvailableDate = dates.find(date => date.available)

                expect(earliestAvailableDate.date).toBe(expectedEarliestDeliveryDate.toISOString())
            }
        })
    })

    /**
     * Tests handling for disabling unavailable days
     */
    it('should disable days which cannot be fulfilled by the configured method', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY')
        method.promise_start = 0
        method.promise_end = 1
        method.delivery_days.friday.enabled = false // 5
        method.region_ids = [ObjectID(defaultRegion._id)]

        // setup dispatch days to allow for a next day delivery (i.e. cutoff is 1 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        expect(ShippingMethodModel(method).isExpressMethod()).toBe(false)

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = json.dates

                const unavailableDates = dates.filter(date => !date.available)

                // each unavailable date should a friday
                unavailableDates.forEach((date) => {
                    expect(utcToZonedTime(date.date, store.config.timezone).getDay()).toBe(5)
                })
            }
        })
    })

    /**
     * Tests handling for same day only methods
     */
    it('should disable days which cannot be fulfilled a same day only method', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const currentDayNumber = now.getDay()

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'SAMEDAY')
        method.promise_start = 0
        method.promise_end = 0
        method.delivery_days[DAYS_IN_WEEK[0]].enabled = false
        method.delivery_days[DAYS_IN_WEEK[1]].enabled = false
        method.delivery_days[DAYS_IN_WEEK[2]].enabled = false
        method.delivery_days[DAYS_IN_WEEK[3]].enabled = false
        method.delivery_days[DAYS_IN_WEEK[4]].enabled = false
        method.delivery_days[DAYS_IN_WEEK[5]].enabled = false
        method.delivery_days[DAYS_IN_WEEK[6]].enabled = false
        method.delivery_days[DAYS_IN_WEEK[currentDayNumber]].enabled = true
        method.region_ids = [ObjectID(defaultRegion._id)]

        // setup dispatch days to allow for a same day delivery (i.e. cutoff is 1 hour from now)
        method.dispatch_days[DateHelper().dayToString(currentDayNumber)].cutoff = `${addHours(now, 1).getHours()}:00`

        expect(ShippingMethodModel(method).isExpressMethod()).toBe(true)

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = json.dates

                const unavailableDates = dates.filter(date => !date.available)

                // all dates expect the first delivery date should be unavailable
                expect(unavailableDates.length).toBe(store.config.window - 1)
                expect(dates[0].available).toBe(true)
            }
        })
    })

    /**
     * Tests handling for next day only methods
     */
    it('should disable days which cannot be fulfilled a next day only method', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const currentDayNumber = now.getDay()

        const getNextDayNumber = () => {
            if (currentDayNumber === 6) {
                return 0
            }
            return currentDayNumber + 1
        }

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY')
        method.promise_start = 1
        method.promise_end = 1
        method.delivery_days[DAYS_IN_WEEK[getNextDayNumber()]].enabled = true
        method.region_ids = [ObjectID(defaultRegion._id)]

        // setup dispatch days to allow for a same day delivery (i.e. cutoff is 1 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        expect(ShippingMethodModel(method).isExpressMethod()).toBe(true)

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = json.dates

                const unavailableDates = dates.filter(date => !date.available)

                // all dates expect the first delivery date should be unavailable
                expect(unavailableDates.length).toBe(store.config.window - 1)
                expect(dates[1].available).toBe(true)
            }
        })
    })

    /**
     * Tests handling for two day only methods
     */
    it('should disable days which cannot be fulfilled a two day only method', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const currentDayNumber = now.getDay()

        const getTwoDayNumber = () => {
            if (currentDayNumber === 5) {
                return 0
            }
            return currentDayNumber + 2
        }

        // setup & insert a two day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'TWODAY')
        method.promise_start = 2
        method.promise_end = 2
        method.delivery_days[DAYS_IN_WEEK[getTwoDayNumber()]].enabled = true
        method.region_ids = [ObjectID(defaultRegion._id)]

        // setup dispatch days to allow for a same day delivery (i.e. cutoff is 1 hour from now)
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`

        expect(ShippingMethodModel(method).isExpressMethod()).toBe(true)

        // insert record
        await db.collection('shipping_methods').insertOne(method)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = json.dates

                const unavailableDates = dates.filter(date => !date.available)

                // all dates except the date 2 days from now should be unavailable
                expect(unavailableDates.length).toBe(store.config.window - 1)
                expect(dates[2].available).toBe(true)
            }
        })
    })


    /**
     * Test blocked date handling for single dates
     */
    it('should disable a date which has been blocked by store level blocked dates', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const expectedBlockedDate = zonedTimeToUtc(startOfDay(addDays(now, 2)), CONSTS.APP_TIMEZONE)

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')
        method.promise_start = 0
        method.promise_end = 4
        method.region_ids = [ObjectID(defaultRegion._id)]
        await db.collection('shipping_methods').insertOne(method)

        // create blocked date record
        const blockedDate: IBlockedDate = {
            store_id: store._id,
            resource_id: store._id,
            title: 'JEST',
            start: expectedBlockedDate,
            end: expectedBlockedDate,
        }

        await db.collection('blocked_dates').insertOne(blockedDate)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = json.dates

                const date = dates.find(date => date.date === expectedBlockedDate.toISOString())

                expect(date).toBeDefined()
            }
        })
    })

    /**
     * Test blocked date handling for date ranges
     */
    it('should disable a date range which has been blocked by store level blocked dates', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const expectedBlockedDateStart = zonedTimeToUtc(startOfDay(addDays(now, 2)), CONSTS.APP_TIMEZONE)
        const expectedBlockedDateEnd = zonedTimeToUtc(startOfDay(addDays(now, 4)), CONSTS.APP_TIMEZONE)

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')
        method.promise_start = 0
        method.promise_end = 4
        method.region_ids = [ObjectID(defaultRegion._id)]
        await db.collection('shipping_methods').insertOne(method)

        // create blocked date record
        const blockedDate: IBlockedDate = {
            store_id: store._id,
            resource_id: store._id,
            title: 'JEST',
            start: expectedBlockedDateStart,
            end: expectedBlockedDateEnd,
        }

        await db.collection('blocked_dates').insertOne(blockedDate)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = json.dates

                const range = dates.filter((date) => {
                    const _date = new Date(date.date)

                    return (_date >= expectedBlockedDateStart && _date <= expectedBlockedDateEnd && date.available === false)
                })

                expect(range.length).toBe(3)
            }
        })
    })

    /**
     * Test blocked date handling for store order level limits
     */
    it('should block a date based on store order limits', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const nominatedDate = startOfDay(addDays(now, 3))

        // setup & insert a standard shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')
        method.service_code = 'STD'
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${getSubOffsetHours(subHours(now, 1).getHours())}:00`
        method.promise_start = 0
        method.promise_end = 4
        method.region_ids = [ObjectID(defaultRegion._id)]
        await db.collection('shipping_methods').insertOne(method)

        // create mock orders
        const orders: IOrderDocument[] = []
        for (let i = 0; i < store.config.max_orders; i++) {
            orders.push({
                store_id: CONSTS.STORE_ID,
                order_id: `${Math.floor(Math.random() * 100)}`,
                internal_status: "processed",
                internal_message: null,
                order_number: "1007",
                region_id: ObjectID(defaultRegion._id),
                tags: [""],
                line_items: [
                    {
                        id: "6641516642499",
                        quantity: 1,
                        variant_id: '1'
                    }
                ],
                tag_history: [],
                shipping_lines: [{
                    code: method.service_code,
                }],
                shipping_method: method.service_code,
                postcode: "BS165AW",
                note_attributes: [{
                    name: "_nominated_date",
                    value: zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE).toString()
                }],
                nominated_date: zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE),
                last_modified: zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE),
                externally_shipped: false,
                local_pickup: false,
            })
        }
        await db.collection('orders').insertMany(orders)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = await json.dates

                // find nominated date and ensure its blocked
                const aggregatedNominatedDate = dates.find((date) => {
                    return date.date === zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE).toISOString()
                })

                expect(aggregatedNominatedDate).toBeTruthy()

                expect(aggregatedNominatedDate.available).toBe(false)
            }
        })
    })

    /**
     * Test blocked date handling for next day shipping method order limits
     */
    it('should block a date based on a next day shipping method order limits when there are no alternative methods', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = zonedTimeToUtc(startOfDay(addDays(now, 1)), CONSTS.APP_TIMEZONE)

        // setup & insert a standard shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY')
        method.service_code = 'NXTDAY'
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`
        method.promise_start = 1
        method.promise_end = 1
        method.daily_order_limit = 5
        method.region_ids = [ObjectID(defaultRegion._id)]
        await db.collection('shipping_methods').insertOne(method)

        // create mock orders
        const orders: IOrderDocument[] = []
        for (let i = 0; i < method.daily_order_limit; i++) {
            orders.push({
                store_id: CONSTS.STORE_ID,
                order_id: `${Math.floor(Math.random() * 100)}`,
                internal_status: "processed",
                internal_message: null,
                order_number: "1007",
                region_id: ObjectID(defaultRegion._id),
                tags: [""],
                line_items: [
                    {
                        id: "6641516642499",
                        quantity: 1,
                        variant_id: '1'
                    }
                ],
                tag_history: [],
                shipping_lines: [{
                    code: method.service_code,
                }],
                shipping_method: method.service_code,
                postcode: "BS165AW",
                note_attributes: [{
                    name: "_nominated_date",
                    value: nominatedDate.toString()
                }],
                nominated_date: nominatedDate,
                last_modified: nominatedDate,
                externally_shipped: false,
                local_pickup: false,
            })
        }
        await db.collection('orders').insertMany(orders)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = await json.dates

                // find nominated date and ensure its blocked
                const aggregatedNominatedDate = dates.find((date) => {
                    return date.date === nominatedDate.toISOString()
                })

                expect(aggregatedNominatedDate).toBeTruthy()

                expect(aggregatedNominatedDate.available).toBe(false)

                expect(aggregatedNominatedDate.source).toBe('shipping_method_limits')
            }
        })
    })

    /**
     * Test blocked date handling for next day shipping method order limits when there are alternative methods
     */
    it('should not block a date based on a next day shipping method order limits when there are alternative methods', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = zonedTimeToUtc(startOfDay(addDays(now, 1)), CONSTS.APP_TIMEZONE)

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY')
        method.service_code = 'NXTDAY'
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`
        method.promise_start = 1
        method.promise_end = 1
        method.daily_order_limit = 5
        method.region_ids = [ObjectID(defaultRegion._id)]
        await db.collection('shipping_methods').insertOne(method)

        const alternativeMethod = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY_ALTERNATIVE')
        alternativeMethod.service_code = 'NXTDAY_ALTERNATIVE'
        alternativeMethod.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`
        alternativeMethod.promise_start = 1
        alternativeMethod.promise_end = 2
        alternativeMethod.daily_order_limit = 5
        alternativeMethod.region_ids = [ObjectID(defaultRegion._id)]
        await db.collection('shipping_methods').insertOne(alternativeMethod)


        // create mock orders
        const orders: IOrderDocument[] = []
        for (let i = 0; i < method.daily_order_limit; i++) {
            orders.push({
                store_id: CONSTS.STORE_ID,
                order_id: `${Math.floor(Math.random() * 100)}`,
                internal_status: "processed",
                internal_message: null,
                order_number: "1007",
                region_id: ObjectID(defaultRegion._id),
                tags: [""],
                line_items: [
                    {
                        id: "6641516642499",
                        quantity: 1,
                        variant_id: '1'
                    }
                ],
                tag_history: [],
                shipping_lines: [{
                    code: method.service_code,
                }],
                shipping_method: method.service_code,
                postcode: "BS165AW",
                note_attributes: [{
                    name: "_nominated_date",
                    value: nominatedDate.toString()
                }],
                nominated_date: nominatedDate,
                last_modified: nominatedDate,
                externally_shipped: false,
                local_pickup: false,
            })
        }
        await db.collection('orders').insertMany(orders)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = await json.dates

                // find nominated date and ensure its blocked
                const aggregatedNominatedDate = dates.find((date) => {
                    return date.date === nominatedDate.toISOString()
                })

                expect(aggregatedNominatedDate).toBeTruthy()

                expect(aggregatedNominatedDate.available).toBe(true)
            }
        })
    })

    /**
     * Test blocked date handling for next day shipping method order limits when there are alternative methods
     */
    it('should block a date based on a next day shipping method order limits when the only alternative method is not next day', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = zonedTimeToUtc(startOfDay(addDays(now, 1)), CONSTS.APP_TIMEZONE)

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY')
        method.service_code = 'NXTDAY'
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`
        method.promise_start = 1
        method.promise_end = 1
        method.daily_order_limit = 5
        method.region_ids = [ObjectID(defaultRegion._id)]
        await db.collection('shipping_methods').insertOne(method)

        const alternativeMethod = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD_ALTERNATIVE')
        alternativeMethod.service_code = 'STD_ALTERNATIVE'
        alternativeMethod.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`
        alternativeMethod.promise_start = 2
        alternativeMethod.promise_end = 4
        alternativeMethod.daily_order_limit = 5
        alternativeMethod.region_ids = [ObjectID(defaultRegion._id)]
        await db.collection('shipping_methods').insertOne(alternativeMethod)

        // create mock orders
        const orders: IOrderDocument[] = []
        for (let i = 0; i < method.daily_order_limit; i++) {
            orders.push({
                store_id: CONSTS.STORE_ID,
                order_id: `${Math.floor(Math.random() * 100)}`,
                internal_status: "processed",
                internal_message: null,
                order_number: "1007",
                region_id: ObjectID(defaultRegion._id),
                tags: [""],
                line_items: [
                    {
                        id: "6641516642499",
                        quantity: 1,
                        variant_id: '1'
                    }
                ],
                tag_history: [],
                shipping_lines: [{
                    code: method.service_code,
                }],
                shipping_method: method.service_code,
                postcode: "BS165AW",
                note_attributes: [{
                    name: "_nominated_date",
                    value: nominatedDate.toString()
                }],
                nominated_date: nominatedDate,
                last_modified: nominatedDate,
                externally_shipped: false,
                local_pickup: false,
            })
        }
        await db.collection('orders').insertMany(orders)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = await json.dates

                // find nominated date and ensure its blocked
                const aggregatedNominatedDate = dates.find((date) => {
                    return date.date === nominatedDate.toISOString()
                })

                expect(aggregatedNominatedDate).toBeTruthy()
                expect(aggregatedNominatedDate.available).toBe(false)
                expect(aggregatedNominatedDate.source).toBe('shipping_method_limits')
            }
        })
    })

    /**
     * Test blocked date handling for standard delivery shipping method order limits
     */
    it('should block a date based on a standard delivery shipping method order limits when there are no alternative methods', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = zonedTimeToUtc(startOfDay(addDays(now, 3)), CONSTS.APP_TIMEZONE)

        // setup & insert a standard shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')
        method.service_code = 'STD'
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`
        method.promise_start = 2
        method.promise_end = 4
        method.daily_order_limit = 5
        method.region_ids = [ObjectID(defaultRegion._id)]
        await db.collection('shipping_methods').insertOne(method)

        // create mock orders
        const orders: IOrderDocument[] = []
        for (let i = 0; i < method.daily_order_limit; i++) {
            orders.push({
                store_id: CONSTS.STORE_ID,
                order_id: `${Math.floor(Math.random() * 100)}`,
                internal_status: "processed",
                internal_message: null,
                order_number: "1007",
                region_id: ObjectID(defaultRegion._id),
                tags: [""],
                line_items: [
                    {
                        id: "6641516642499",
                        quantity: 1,
                        variant_id: '1'
                    }
                ],
                tag_history: [],
                shipping_lines: [{
                    code: method.service_code,
                }],
                shipping_method: method.service_code,
                postcode: "BS165AW",
                note_attributes: [{
                    name: "_nominated_date",
                    value: nominatedDate.toString()
                }],
                nominated_date: nominatedDate,
                last_modified: nominatedDate,
                externally_shipped: false,
                local_pickup: false,
            })
        }
        await db.collection('orders').insertMany(orders)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = await json.dates

                // find nominated date and ensure its blocked
                const aggregatedNominatedDate = dates.find((date) => {
                    return date.date === nominatedDate.toISOString()
                })

                expect(aggregatedNominatedDate).toBeTruthy()

                expect(aggregatedNominatedDate.available).toBe(false)

                expect(aggregatedNominatedDate.source).toBe('shipping_method_limits')
            }
        })
    })

    /**
     * Test blocked date handling for standard delivery shipping method order limits
     */
    it('should not block a date based on a standard delivery shipping method order limits when there are alternative methods', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = zonedTimeToUtc(startOfDay(addDays(now, 3)), CONSTS.APP_TIMEZONE)

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')
        method.service_code = 'STD'
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`
        method.promise_start = 2
        method.promise_end = 4
        method.daily_order_limit = 5
        method.region_ids = [ObjectID(defaultRegion._id)]
        await db.collection('shipping_methods').insertOne(method)

        const alternativeMethod = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD_ALTERNATIVE')
        alternativeMethod.service_code = 'STD_ALTERNATIVE'
        alternativeMethod.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`
        alternativeMethod.promise_start = 2
        alternativeMethod.promise_end = 4
        alternativeMethod.daily_order_limit = 5
        alternativeMethod.region_ids = [ObjectID(defaultRegion._id)]
        await db.collection('shipping_methods').insertOne(alternativeMethod)


        // create mock orders
        const orders: IOrderDocument[] = []
        for (let i = 0; i < method.daily_order_limit; i++) {
            orders.push({
                store_id: CONSTS.STORE_ID,
                order_id: `${Math.floor(Math.random() * 100)}`,
                internal_status: "processed",
                internal_message: null,
                order_number: "1007",
                region_id: ObjectID(defaultRegion._id),
                tags: [""],
                line_items: [
                    {
                        id: "6641516642499",
                        quantity: 1,
                        variant_id: '1'
                    }
                ],
                tag_history: [],
                shipping_lines: [{
                    code: method.service_code,
                }],
                shipping_method: method.service_code,
                postcode: "BS165AW",
                note_attributes: [{
                    name: "_nominated_date",
                    value: nominatedDate.toString()
                }],
                nominated_date: nominatedDate,
                last_modified: nominatedDate,
                externally_shipped: false,
                local_pickup: false,
            })
        }
        await db.collection('orders').insertMany(orders)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = await json.dates

                // find nominated date and ensure its blocked
                const aggregatedNominatedDate = dates.find((date) => {
                    return date.date === nominatedDate.toISOString()
                })

                expect(aggregatedNominatedDate).toBeTruthy()

                expect(aggregatedNominatedDate.available).toBe(true)
            }
        })
    })

    /**
     * Test blocked date handling for standard delivery shipping method order limits
     */
    it('should block a date based on a standard delivery shipping method order limits when the only alternative method is next day only', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = zonedTimeToUtc(startOfDay(addDays(now, 3)), CONSTS.APP_TIMEZONE)

        // setup & insert a next day shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')
        method.service_code = 'STD'
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`
        method.promise_start = 2
        method.promise_end = 4
        method.daily_order_limit = 5
        method.region_ids = [ObjectID(defaultRegion._id)]
        await db.collection('shipping_methods').insertOne(method)

        const alternativeMethod = createDefaultShippingMethod(CONSTS.STORE_ID, 'NXTDAY_ALTERNATIVE')
        alternativeMethod.service_code = 'NXTDAY_ALTERNATIVE'
        alternativeMethod.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${addHours(now, 1).getHours()}:00`
        alternativeMethod.promise_start = 1
        alternativeMethod.promise_end = 1
        alternativeMethod.daily_order_limit = 5
        alternativeMethod.region_ids = [ObjectID(defaultRegion._id)]
        await db.collection('shipping_methods').insertOne(alternativeMethod)


        // create mock orders
        const orders: IOrderDocument[] = []
        for (let i = 0; i < method.daily_order_limit; i++) {
            orders.push({
                store_id: CONSTS.STORE_ID,
                order_id: `${Math.floor(Math.random() * 100)}`,
                internal_status: "processed",
                internal_message: null,
                order_number: "1007",
                region_id: ObjectID(defaultRegion._id),
                tags: [""],
                line_items: [
                    {
                        id: "6641516642499",
                        quantity: 1,
                        variant_id: '1'
                    }
                ],
                tag_history: [],
                shipping_lines: [{
                    code: method.service_code,
                }],
                shipping_method: method.service_code,
                postcode: "BS165AW",
                note_attributes: [{
                    name: "_nominated_date",
                    value: nominatedDate.toString()
                }],
                nominated_date: nominatedDate,
                last_modified: nominatedDate,
                externally_shipped: false,
                local_pickup: false,
            })
        }
        await db.collection('orders').insertMany(orders)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = await json.dates

                // find nominated date and ensure its blocked
                const aggregatedNominatedDate = dates.find((date) => {
                    return date.date === nominatedDate.toISOString()
                })

                expect(aggregatedNominatedDate).toBeTruthy()
                expect(aggregatedNominatedDate.available).toBe(false)
                expect(aggregatedNominatedDate.source).toBe('shipping_method_limits')
            }
        })
    })

    /**
     * Test product level limits imposed by rules
     */
    it('should block a date based on a single product level limit', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)
        const nominatedDate = zonedTimeToUtc(startOfDay(addDays(now, 3)), CONSTS.APP_TIMEZONE)

        // get store
        const store: IStoreDocument = await db.collection('stores').findOne({_id: CONSTS.STORE_ID})

        // get default region
        const region = await db.collection('regions').findOne({default: true})

        // product id
        const productId = 'gid://shopify/Product/6641516642499'

        // setup & insert a standard shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')
        method.service_code = 'STD'
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${getSubOffsetHours(subHours(now, 1).getHours())}:00`
        method.promise_start = 2
        method.promise_end = 4
        method.region_ids = [ObjectID(region._id)]
        await db.collection('shipping_methods').insertOne(method)

        // setup & insert a rule which limits the product
        const rule = createDefaultRule(CONSTS.STORE_ID, 'LIMIT_PRODUCTS', zonedTimeToUtc(startOfDay(now), APP_TIMEZONE))
        rule.production_limits.product_ids = [productId]
        rule.production_limits.max_units_per_day = (store.config.max_orders - 1)
        rule.enabled = true

        await db.collection('rules').insertOne(rule)

        // create mock orders
        const orders: IOrderDocument[] = []
        for (let i = 0; i < (store.config.max_orders - 1); i++) {
            orders.push({
                store_id: CONSTS.STORE_ID,
                order_id: `${Math.floor(Math.random() * 100)}`,
                internal_status: "processed",
                internal_message: null,
                order_number: "1007",
                region_id: ObjectID(region._id),
                tags: [""],
                line_items: [
                    {
                        id: productId.replace('gid://shopify/Product/', '').toString(),
                        variant_id: productId.replace('gid://shopify/ProductVariant/', '').toString(),
                        quantity: 1,
                    }
                ],
                tag_history: [],
                shipping_lines: [{
                    code: method.service_code,
                }],
                shipping_method: method.service_code,
                postcode: "BS165AW",
                note_attributes: [{
                    name: "_nominated_date",
                    value: nominatedDate.toString()
                }],
                nominated_date: nominatedDate,
                last_modified: nominatedDate,
                externally_shipped: false,
                local_pickup: false,
            })
        }
        await db.collection('orders').insertMany(orders)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [
                            {
                                productId: productId,
                                variantId: '123',
                                sku: '123',
                                quantity: 1,
                                grams: 0,
                            }
                        ],
                    })
                })

                const json = await res.json()

                const dates = await json.dates

                // find nominated date and ensure its blocked
                const aggregatedNominatedDate = dates.find((date) => {
                    return date.date === nominatedDate.toISOString()
                })

                expect(aggregatedNominatedDate).toBeTruthy()
                expect(aggregatedNominatedDate.available).toBe(false)
                expect(aggregatedNominatedDate.source).toBe('product_level_limits')
            }
        })
    })

    /**
     * Test external methods are excluded from order level limit aggregations
     */
    it('should exclude external methods from store order level limits', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const nominatedDate = startOfDay(addDays(now, 3))

        // setup & insert a standard shipping method to db (all delivery & dispatch days enabled)
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')
        method.service_code = 'STD'
        method.dispatch_days[DateHelper().dayToString(now.getDay())].cutoff = `${getSubOffsetHours(subHours(now, 1).getHours())}:00`
        method.promise_start = 0
        method.promise_end = 4
        method.region_ids = [ObjectID(defaultRegion._id)]
        await db.collection('shipping_methods').insertOne(method)

        // create mock orders
        const orders: IOrderDocument[] = []
        for (let i = 0; i < (store.config.max_orders - 1); i++) {
            orders.push({
                store_id: CONSTS.STORE_ID,
                order_id: `${Math.floor(Math.random() * 100)}`,
                internal_status: "processed",
                internal_message: null,
                order_number: "1007",
                region_id: ObjectID(defaultRegion._id),
                tags: [""],
                line_items: [
                    {
                        id: "6641516642499",
                        quantity: 1,
                        variant_id: '1'
                    }
                ],
                tag_history: [],
                shipping_lines: [{
                    code: method.service_code,
                }],
                shipping_method: method.service_code,
                postcode: "BS165AW",
                note_attributes: [{
                    name: "_nominated_date",
                    value: zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE).toString()
                }],
                nominated_date: zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE),
                last_modified: zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE),
                externally_shipped: false,
                local_pickup: false,
            })
        }
        orders.push({
            store_id: CONSTS.STORE_ID,
            order_id: `${Math.floor(Math.random() * 100)}`,
            internal_status: "processed",
            internal_message: null,
            order_number: "1007",
            region_id: ObjectID(defaultRegion._id),
            tags: [""],
            line_items: [
                {
                    id: "6641516642499",
                    quantity: 1,
                    variant_id: '1'
                }
            ],
            tag_history: [],
            shipping_lines: [{
                code: 'external',
            }],
            shipping_method: 'external',
            postcode: "BS165AW",
            note_attributes: [{
                name: "_nominated_date",
                value: zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE).toString()
            }],
            nominated_date: zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE),
            last_modified: zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE),
            externally_shipped: true,
            local_pickup: false,
        })
        await db.collection('orders').insertMany(orders)

        // mock api request and test response
        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
            }),
            params: {
                shop: CONSTS.STORE_ID,
            },
            test: async ({fetch}) => {
                const res = await fetch({
                    method: 'POST',
                    body: JSON.stringify({
                        postcode: 'WC1V6PB',
                        lineItems: [],
                    })
                })

                const json = await res.json()

                const dates = await json.dates

                // find nominated date and ensure its blocked
                const aggregatedNominatedDate = dates.find((date) => {
                    return date.date === zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE).toISOString()
                })

                expect(aggregatedNominatedDate).toBeTruthy()

                expect(aggregatedNominatedDate.available).toBe(true)
            }
        })
    })
})
