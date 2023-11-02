import CONSTS from './consts'
import populateDb from './helpers/populateDb'
import clearDb from './helpers/clearDb'
import {ObjectID} from 'mongodb'
import createDefaultRule from '../helpers/createDefaultRule'
import {IRegion, IStoreDocument} from '@/app/types/store'
import {utcToZonedTime, zonedTimeToUtc} from 'date-fns-tz'
import methods from '../atlas'
import determineRules from '@/app/utils/aggregator/determineRules'
import PostcodeParser from '@/app/utils/postcodeParser'
import {addDays, startOfDay, subDays} from 'date-fns'
import {APP_TIMEZONE} from '@/app/consts/app'
import {connectToDatabase} from '@/app/utils/mongo'
import {IQueryLineItem} from '@/app/utils/aggregator/types'

describe('determineRules', () => {

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
        await db.collection('rules').deleteMany({})
    })

    it('should return a rule when the regional configuration type `in` matches', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        // create rule
        const rule = createDefaultRule(store._id, 'JEST_RULE', zonedTimeToUtc(startOfDay(now), APP_TIMEZONE))

        rule.enabled = true
        rule.conditions.region_based.enabled = true
        rule.conditions.region_based.type = 'in'
        rule.conditions.region_based.region_ids = [ObjectID(defaultRegion._id)]

        // insert rule
        await methods.rule.insert(rule)

        // get determined rules
        const determinedRules = await determineRules({
            query: {
                storeId: store._id,
                lineItems: [],
                postcode: PostcodeParser.parse('BA12HX'),
            },
        }, defaultRegion)

        expect(determinedRules.length).toBe(1)
    })

    it('should not return a rule when the regional configuration type `in` does not match', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        // create rule
        const rule = createDefaultRule(store._id, 'JEST_RULE', zonedTimeToUtc(startOfDay(now), APP_TIMEZONE))

        rule.enabled = true
        rule.conditions.region_based.enabled = true
        rule.conditions.region_based.type = 'in'
        rule.conditions.region_based.region_ids = ['1234']

        // insert rule
        await methods.rule.insert(rule)

        // get determined rules
        const determinedRules = await determineRules({
            query: {
                storeId: store._id,
                lineItems: [],
                postcode: PostcodeParser.parse('BA12HX'),
            },
        }, defaultRegion)

        expect(determinedRules.length).toBe(0)
    })

    it('should return a rule when the regional configuration type `not_in` does not match', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        // create rule
        const rule = createDefaultRule(store._id, 'JEST_RULE', zonedTimeToUtc(startOfDay(now), APP_TIMEZONE))

        rule.enabled = true
        rule.conditions.region_based.enabled = true
        rule.conditions.region_based.type = 'not_in'
        rule.conditions.region_based.region_ids = ['1234']

        // insert rule
        await methods.rule.insert(rule)

        // get determined rules
        const determinedRules = await determineRules({
            query: {
                storeId: store._id,
                lineItems: [],
                postcode: PostcodeParser.parse('BA12HX'),
            },
        }, defaultRegion)

        expect(determinedRules.length).toBe(1)
    })

    it('should not return a rule when the regional configuration type `not_in` matches', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        // create rule
        const rule = createDefaultRule(store._id, 'JEST_RULE', zonedTimeToUtc(startOfDay(now), APP_TIMEZONE))

        rule.enabled = true
        rule.conditions.region_based.enabled = true
        rule.conditions.region_based.type = 'not_in'
        rule.conditions.region_based.region_ids = [ObjectID(defaultRegion._id)]

        // insert rule
        await methods.rule.insert(rule)

        // get determined rules
        const determinedRules = await determineRules({
            query: {
                storeId: store._id,
                lineItems: [],
                postcode: PostcodeParser.parse('BA12HX'),
            },
        }, defaultRegion)

        expect(determinedRules.length).toBe(0)
    })

    it('should return a rule when the product condition type `all` matches', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const lineItems: IQueryLineItem[] = [
            {
                productId: 'gid://shopify/Product/PID001',
                variantId: 'gid://shopify/ProductVariant/VID001',
                quantity: 1,
                sku: 'VID001',
                grams: 0,
            },
            {
                productId: 'gid://shopify/Product/PID002',
                variantId: 'gid://shopify/ProductVariant/VID002',
                quantity: 1,
                sku: 'VID002',
                grams: 0,
            },
            {
                productId: 'gid://shopify/Product/PID003',
                variantId: 'gid://shopify/ProductVariant/VID003',
                quantity: 1,
                sku: 'VID003',
                grams: 0,
            }
        ]

        // create rule
        const rule = createDefaultRule(store._id, 'JEST_RULE', zonedTimeToUtc(startOfDay(now), APP_TIMEZONE))
        rule.enabled = true
        rule.conditions.product_based.enabled = true
        rule.conditions.product_based.type = 'all'
        rule.conditions.product_based.product_ids = lineItems.map(item => item.productId)

        // insert rule
        await methods.rule.insert(rule)

        // get determined rules
        const determinedRules = await determineRules({
            query: {
                storeId: store._id,
                lineItems: lineItems,
                postcode: PostcodeParser.parse('BA12HX'),
            },
        }, defaultRegion)

        expect(determinedRules.length).toBe(1)
    })

    it('should not return a rule when the product condition type `all` does not match', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const productIds = ['gid://shopify/Product/PID001', 'gid://shopify/Product/PID002', 'gid://shopify/Product/PID003']
        const lineItems: IQueryLineItem[] = [
            {
                productId: 'gid://shopify/Product/PID001',
                variantId: 'gid://shopify/ProductVariant/VID001',
                quantity: 1,
                sku: 'VID001',
                grams: 0,
            },
            {
                productId: 'gid://shopify/Product/PID002',
                variantId: 'gid://shopify/ProductVariant/VID002',
                quantity: 1,
                sku: 'VID002',
                grams: 0,
            }
        ]

        // create rule
        const rule = createDefaultRule(store._id, 'JEST_RULE', zonedTimeToUtc(startOfDay(now), APP_TIMEZONE))
        rule.enabled = true
        rule.conditions.product_based.enabled = true
        rule.conditions.product_based.type = 'all'
        rule.conditions.product_based.product_ids = productIds

        // insert rule
        await methods.rule.insert(rule)

        // get determined rules
        const determinedRules = await determineRules({
            query: {
                storeId: store._id,
                lineItems: lineItems,
                postcode: PostcodeParser.parse('BA12HX'),
            },
        }, defaultRegion)

        expect(determinedRules.length).toBe(0)
    })

    it('should return a rule when the product condition type `at_least_one` matches', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const productIds = ['gid://shopify/Product/PID001', 'gid://shopify/Product/PID002', 'gid://shopify/Product/PID003']
        const lineItems: IQueryLineItem[] = [
            {
                productId: 'gid://shopify/Product/PID001',
                variantId: 'gid://shopify/ProductVariant/VID001',
                quantity: 1,
                sku: 'VID001',
                grams: 0,
            },
        ]

        // create rule
        const rule = createDefaultRule(store._id, 'JEST_RULE', zonedTimeToUtc(startOfDay(now), APP_TIMEZONE))
        rule.enabled = true
        rule.conditions.product_based.enabled = true
        rule.conditions.product_based.type = 'at_least_one'
        rule.conditions.product_based.product_ids = productIds

        // insert rule
        await methods.rule.insert(rule)

        // get determined rules
        const determinedRules = await determineRules({
            query: {
                storeId: store._id,
                lineItems: lineItems,
                postcode: PostcodeParser.parse('BA12HX'),
            },
        }, defaultRegion)

        expect(determinedRules.length).toBe(1)
    })

    it('should not return a rule when the product condition type `at_least_one` does not match', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const productIds = ['gid://shopify/Product/PID001', 'gid://shopify/Product/PID002', 'gid://shopify/Product/PID003']
        const lineItems: IQueryLineItem[] = [
            {
                productId: 'gid://shopify/Product/PID004',
                variantId: 'gid://shopify/ProductVariant/VID004',
                quantity: 1,
                sku: 'VID004',
                grams: 0,
            },
        ]

        // create rule
        const rule = createDefaultRule(store._id, 'JEST_RULE', zonedTimeToUtc(startOfDay(now), APP_TIMEZONE))
        rule.enabled = true
        rule.conditions.product_based.enabled = true
        rule.conditions.product_based.type = 'at_least_one'
        rule.conditions.product_based.product_ids = productIds

        // insert rule
        await methods.rule.insert(rule)

        // get determined rules
        const determinedRules = await determineRules({
            query: {
                storeId: store._id,
                lineItems: lineItems,
                postcode: PostcodeParser.parse('BA12HX'),
            },
        }, defaultRegion)

        expect(determinedRules.length).toBe(0)
    })

    it('should return a rule when the product condition type `none` matches', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const productIds = ['gid://shopify/Product/PID001', 'gid://shopify/Product/PID002', 'gid://shopify/Product/PID003']
        const lineItems: IQueryLineItem[] = [
            {
                productId: 'gid://shopify/Product/PID004',
                variantId: 'gid://shopify/ProductVariant/VID004',
                quantity: 1,
                sku: 'VID004',
                grams: 0,
            },
            {
                productId: 'gid://shopify/Product/PID005',
                variantId: 'gid://shopify/ProductVariant/VID005',
                quantity: 1,
                sku: 'VID005',
                grams: 0,
            },
        ]

        // create rule
        const rule = createDefaultRule(store._id, 'JEST_RULE', zonedTimeToUtc(startOfDay(now), APP_TIMEZONE))
        rule.enabled = true
        rule.conditions.product_based.enabled = true
        rule.conditions.product_based.type = 'none'
        rule.conditions.product_based.product_ids = productIds

        // insert rule
        await methods.rule.insert(rule)

        // get determined rules
        const determinedRules = await determineRules({
            query: {
                storeId: store._id,
                lineItems: lineItems,
                postcode: PostcodeParser.parse('BA12HX'),
            },
        }, defaultRegion)

        expect(determinedRules.length).toBe(1)
    })

    it('should not return a rule when the product condition type `none` does not match', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const productIds = ['gid://shopify/Product/PID001', 'gid://shopify/Product/PID002', 'gid://shopify/Product/PID003']
        const lineItems: IQueryLineItem[] = [
            {
                productId: 'gid://shopify/Product/PID001',
                variantId: 'gid://shopify/ProductVariant/VID001',
                quantity: 1,
                sku: 'VID001',
                grams: 0,
            },
            {
                productId: 'gid://shopify/Product/PID005',
                variantId: 'gid://shopify/ProductVariant/VID005',
                quantity: 1,
                sku: 'VID005',
                grams: 0,
            },
        ]

        // create rule
        const rule = createDefaultRule(store._id, 'JEST_RULE', zonedTimeToUtc(startOfDay(now), APP_TIMEZONE))
        rule.enabled = true
        rule.conditions.product_based.enabled = true
        rule.conditions.product_based.type = 'none'
        rule.conditions.product_based.product_ids = productIds

        // insert rule
        await methods.rule.insert(rule)

        // get determined rules
        const determinedRules = await determineRules({
            query: {
                storeId: store._id,
                lineItems: lineItems,
                postcode: PostcodeParser.parse('BA12HX'),
            },
        }, defaultRegion)

        expect(determinedRules.length).toBe(0)
    })

    it('should not return a rule if the configured rule is disabled', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        // create rule
        const rule = createDefaultRule(store._id, 'JEST_RULE', zonedTimeToUtc(startOfDay(now), APP_TIMEZONE))

        rule.enabled = false
        rule.conditions.region_based.enabled = true
        rule.conditions.region_based.region_ids = [ObjectID(defaultRegion._id)]

        // insert rule
        await methods.rule.insert(rule)

        // get determined rules
        const determinedRules = await determineRules({
            query: {
                storeId: store._id,
                lineItems: [],
                postcode: PostcodeParser.parse('BA12HX'),
            },
        }, defaultRegion)

        expect(determinedRules.length).toBe(0)
    })

    it('should not return a rule if the configured rule is archived', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        // create rule
        const rule = createDefaultRule(store._id, 'JEST_RULE', zonedTimeToUtc(startOfDay(now), APP_TIMEZONE))

        rule.enabled = true
        rule.archived = true
        rule.conditions.region_based.enabled = true
        rule.conditions.region_based.region_ids = [ObjectID(defaultRegion._id)]

        // insert rule
        await methods.rule.insert(rule)

        // get determined rules
        const determinedRules = await determineRules({
            query: {
                storeId: store._id,
                lineItems: [],
                postcode: PostcodeParser.parse('BA12HX'),
            },
        }, defaultRegion)

        expect(determinedRules.length).toBe(0)
    })

    it('should not return a rule if the configured rule is not yet active', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const activeFrom = zonedTimeToUtc(startOfDay(addDays(now, 1)), APP_TIMEZONE)

        // create rule
        const rule = createDefaultRule(store._id, 'JEST_RULE', activeFrom)

        rule.enabled = true
        rule.conditions.region_based.enabled = true
        rule.conditions.region_based.region_ids = [ObjectID(defaultRegion._id)]

        // insert rule
        await methods.rule.insert(rule)

        // get determined rules
        const determinedRules = await determineRules({
            query: {
                storeId: store._id,
                lineItems: [],
                postcode: PostcodeParser.parse('BA12HX'),
            },
        }, defaultRegion)

        expect(determinedRules.length).toBe(0)
    })

    it('should not return a rule if the current time is outside of the rule active from range', async () => {

        // get date time now (in app timezone)
        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const activeFromStart = zonedTimeToUtc(startOfDay(subDays(now, 2)), APP_TIMEZONE)
        const activeFromEnd = zonedTimeToUtc(startOfDay(subDays(now, 1)), APP_TIMEZONE)

        // create rule
        const rule = createDefaultRule(store._id, 'JEST_RULE', activeFromStart)

        rule.active_from = {
            start: activeFromStart,
            end: activeFromEnd
        }
        rule.enabled = true
        rule.conditions.region_based.enabled = true
        rule.conditions.region_based.region_ids = [ObjectID(defaultRegion._id)]

        // insert rule
        await methods.rule.insert(rule)

        // get determined rules
        const determinedRules = await determineRules({
            query: {
                storeId: store._id,
                lineItems: [],
                postcode: PostcodeParser.parse('BA12HX'),
            },
        }, defaultRegion)

        expect(determinedRules.length).toBe(0)
    })
})