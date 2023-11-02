import CONSTS from './consts'
import populateDb from './helpers/populateDb'
import clearDb from './helpers/clearDb'
import {
    IRegion,
    IStoreDocument
} from '@/app/types/store'
import {connectToDatabase} from '@/app/utils/mongo'
import createDefaultShippingMethod from '../helpers/createDefaultShippingMethod'
import createDefaultShippingBand from '../helpers/createDefaultShippingBand'
import ShippingMethodModel from '../models/ShippingMethod'
import {IShippingRateRequestBodyItem} from '@/app/utils/aggregator/types'
import {getCartTotalPrice, getCartTotalWeight, getNominatedDate} from '@/app/utils/aggregator/shippingAggregator'

const createShippingRateRequestCartItems = (): IShippingRateRequestBodyItem[] => {
    return [
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
            properties: {},
            product_id: 1,
            variant_id: 2
        },
        {
            name: "Line Item Two",
            sku: "LINEITEMONE",
            quantity: 2,
            grams: 500,
            price: 9999,
            vendor: "Jest Store",
            requires_shipping: true,
            taxable: false,
            fulfillment_service: "manual",
            properties: {
                _nominated_date: new Date(),
            },
            product_id: 2,
            variant_id: 3
        }
    ]
}

describe('shippingMethodBands', () => {

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
    })

    it('should apply the "cartCost" requirement with a "between" condition correctly', async () => {
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'test_cartCost_between_band')
        const band = createDefaultShippingBand(1)
        band.requirement.type = 'cartCost'
        band.requirement.condition = 'between'
        band.requirement.value = {
            min: 10,
            max: 20,
        }
        method.bands = [band]
        const model = ShippingMethodModel(method)

        const cartItems = createShippingRateRequestCartItems()
        cartItems[0].price = 6
        cartItems[1].price = 6

        const cartTotal = getCartTotalPrice(cartItems)
        const cartWeight = getCartTotalWeight(cartItems)
        const nominatedDate = getNominatedDate(cartItems)

        expect(cartTotal).toBeGreaterThan(band.requirement.value.min)
        expect(cartTotal).toBeLessThan(band.requirement.value.max)

        const applicableBands = model.getApplicableBandsForCart(cartItems, cartTotal, cartWeight, nominatedDate)

        expect(applicableBands.length).toBe(1)
    })

    it('should apply the "cartCost" requirement with a "greaterThan" condition correctly', async () => {
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'test_cartCost_greaterThan_band')
        const band = createDefaultShippingBand(1)
        band.requirement.type = 'cartCost'
        band.requirement.condition = 'greaterThan'
        band.requirement.value = 10
        method.bands = [band]
        const model = ShippingMethodModel(method)

        const cartItems = createShippingRateRequestCartItems()
        cartItems[0].price = 6
        cartItems[1].price = 6

        const cartTotal = getCartTotalPrice(cartItems)
        const cartWeight = getCartTotalWeight(cartItems)
        const nominatedDate = getNominatedDate(cartItems)

        expect(cartTotal).toBeGreaterThan(band.requirement.value)

        const applicableBands = model.getApplicableBandsForCart(cartItems, cartTotal, cartWeight, nominatedDate)

        expect(applicableBands.length).toBe(1)
    })

    it('should apply the "cartCost" requirement with a "lessThan" condition correctly', async () => {
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'test_cartCost_lessThan_band')
        const band = createDefaultShippingBand(1)
        band.requirement.type = 'cartCost'
        band.requirement.condition = 'lessThan'
        band.requirement.value = 20
        method.bands = [band]
        const model = ShippingMethodModel(method)

        const cartItems = createShippingRateRequestCartItems()
        cartItems[0].price = 6
        cartItems[1].price = 6

        const cartTotal = getCartTotalPrice(cartItems)
        const cartWeight = getCartTotalWeight(cartItems)
        const nominatedDate = getNominatedDate(cartItems)

        expect(cartTotal).toBeLessThan(band.requirement.value)

        const applicableBands = model.getApplicableBandsForCart(cartItems, cartTotal, cartWeight, nominatedDate)

        expect(applicableBands.length).toBe(1)
    })

    it('should apply the "cartWeight" requirement with a "between" condition correctly', async () => {
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'test_cartCost_between_band')
        const band = createDefaultShippingBand(1)
        band.requirement.type = 'cartWeight'
        band.requirement.condition = 'between'
        band.requirement.value = {
            min: 500,
            max: 2000,
        }
        method.bands = [band]
        const model = ShippingMethodModel(method)

        const cartItems = createShippingRateRequestCartItems()
        cartItems[0].price = 6
        cartItems[1].price = 6

        const cartTotal = getCartTotalPrice(cartItems)
        const cartWeight = getCartTotalWeight(cartItems)
        const nominatedDate = getNominatedDate(cartItems)

        expect(cartWeight).toBeGreaterThan(band.requirement.value.min)
        expect(cartWeight).toBeLessThan(band.requirement.value.max)

        const applicableBands = model.getApplicableBandsForCart(cartItems, cartTotal, cartWeight, nominatedDate)

        expect(applicableBands.length).toBe(1)
    })

    it('should apply the "cartWeight" requirement with a "greaterThan" condition correctly', async () => {
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'test_cartCost_greaterThan_band')
        const band = createDefaultShippingBand(1)
        band.requirement.type = 'cartWeight'
        band.requirement.condition = 'greaterThan'
        band.requirement.value = 500
        method.bands = [band]
        const model = ShippingMethodModel(method)

        const cartItems = createShippingRateRequestCartItems()
        cartItems[0].price = 6
        cartItems[1].price = 6

        const cartTotal = getCartTotalPrice(cartItems)
        const cartWeight = getCartTotalWeight(cartItems)
        const nominatedDate = getNominatedDate(cartItems)

        expect(cartWeight).toBeGreaterThan(band.requirement.value)

        const applicableBands = model.getApplicableBandsForCart(cartItems, cartTotal, cartWeight, nominatedDate)

        expect(applicableBands.length).toBe(1)
    })

    it('should apply the "cartWeight" requirement with a "lessThan" condition correctly', async () => {
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'test_cartCost_lessThan_band')
        const band = createDefaultShippingBand(1)
        band.requirement.type = 'cartWeight'
        band.requirement.condition = 'lessThan'
        band.requirement.value = 2000
        method.bands = [band]
        const model = ShippingMethodModel(method)

        const cartItems = createShippingRateRequestCartItems()
        cartItems[0].price = 6
        cartItems[1].price = 6

        const cartTotal = getCartTotalPrice(cartItems)
        const cartWeight = getCartTotalWeight(cartItems)
        const nominatedDate = getNominatedDate(cartItems)

        expect(cartWeight).toBeLessThan(band.requirement.value)

        const applicableBands = model.getApplicableBandsForCart(cartItems, cartTotal, cartWeight, nominatedDate)

        expect(applicableBands.length).toBe(1)
    })

    it('should apply the "cartDateRange" requirement with a between condition correctly', async () => {
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'test_cartDateRange_between_band')
        const band = createDefaultShippingBand(1)
        band.requirement.type = 'cartDateRange'
        band.requirement.condition = 'between'
        band.requirement.value = {
            start: new Date(Date.now() - (3 * 3600 * 1000 * 24)),
            end: new Date(Date.now() + (3 * 3600 * 1000 * 24)),
        }
        method.bands = [band]
        const model = ShippingMethodModel(method)

        const cartItems = createShippingRateRequestCartItems()
        cartItems[0].price = 6
        cartItems[1].price = 6

        const cartTotal = getCartTotalPrice(cartItems)
        const cartWeight = getCartTotalWeight(cartItems)
        const nominatedDate = getNominatedDate(cartItems)

        expect(nominatedDate.getTime()).toBeGreaterThan(band.requirement.value.start.getTime())
        expect(nominatedDate.getTime()).toBeLessThan(band.requirement.value.end.getTime())

        const applicableBands = model.getApplicableBandsForCart(cartItems, cartTotal, cartWeight, nominatedDate)

        expect(applicableBands.length).toBe(1)
    })

    it('should apply the "cartDateRange" requirement with a between condition with 0 results correctly', async () => {
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'test_cartDateRange_between_band')
        const band = createDefaultShippingBand(1)
        band.requirement.type = 'cartDateRange'
        band.requirement.condition = 'between'
        band.requirement.value = {
            start: new Date(Date.now() - (3 * 3600 * 1000 * 24)),
            end: new Date(Date.now() + (3 * 3600 * 1000 * 24)),
        }
        method.bands = [band]
        const model = ShippingMethodModel(method)

        const cartItems = createShippingRateRequestCartItems()
        cartItems[0].price = 6
        cartItems[1].price = 6
        cartItems[1].properties['_nominated_date'] = new Date(Date.now() + (4 * 3600 * 1000 * 24))

        const cartTotal = getCartTotalPrice(cartItems)
        const cartWeight = getCartTotalWeight(cartItems)
        const nominatedDate = getNominatedDate(cartItems)

        expect(nominatedDate.getTime()).toBeGreaterThan(band.requirement.value.start.getTime())
        expect(nominatedDate.getTime()).toBeGreaterThan(band.requirement.value.end.getTime())

        const applicableBands = model.getApplicableBandsForCart(cartItems, cartTotal, cartWeight, nominatedDate)

        expect(applicableBands.length).toBe(0)
    })
    it('should sort applicable bands by priority correctly', async () => {
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'test_band_priority')
        const bandA = createDefaultShippingBand(1)
        bandA.name = 'PRIORITY_2'
        bandA.priority = 2
        bandA.requirement.type = 'cartCost'
        bandA.requirement.condition = 'greaterThan'
        bandA.requirement.value = 10

        const bandB = createDefaultShippingBand(1)
        bandB.name = 'PRIORITY_1'
        bandB.priority = 1
        bandB.requirement.type = 'cartCost'
        bandB.requirement.condition = 'lessThan'
        bandB.requirement.value = 20

        method.bands = [bandA, bandB]
        const model = ShippingMethodModel(method)

        const cartItems = createShippingRateRequestCartItems()
        cartItems[0].price = 6
        cartItems[1].price = 6

        const cartTotal = getCartTotalPrice(cartItems)
        const cartWeight = getCartTotalWeight(cartItems)
        const nominatedDate = getNominatedDate(cartItems)

        const applicableBands = model.getApplicableBandsForCart(cartItems, cartTotal, cartWeight, nominatedDate)

        expect(applicableBands.length).toBe(2)

        expect(applicableBands[0].priority).toBe(1)
        expect(applicableBands[1].priority).toBe(2)
    })
})