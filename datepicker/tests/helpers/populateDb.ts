import {IRegion, IStoreDocument} from '@/app/types/store'
import createDefaultRegion from '../../helpers/createDefaultRegion'
import CONSTS from '../consts'

/**
 * insert stores to test with
 *
 * @param db
 */
const insertStores = async (db) => {
    const store: IStoreDocument = {
        _id: CONSTS.STORE_ID,
        token: '@todo', // @todo (maybe)
        config: {
            timezone: CONSTS.APP_TIMEZONE,
            window: 30,
            max_orders: 10,
            carrier_test_mode_enabled: false,
            carrier_test_mode_match: 'test',
            order_tagging_enabled: false,
            order_tagging_date_format: 'dd/MM/yyyy',
        },
        webhook_subscriptions: [],
        carrier_service: null,
    }
    await db.collection('stores').insertOne(store)
}

/**
 * insert various regions to test with
 *
 * @param db
 */
const insertRegions = async (db) => {
    const region: IRegion = createDefaultRegion(CONSTS.STORE_ID)

    await db.collection('regions').insertOne(region)
}

/**
 * Populate DB with defaults
 *
 * @param db
 */
const populateDb = async (db) => {

    // insert stores
    await insertStores(db)

    // insert regions
    await insertRegions(db)
}

export default populateDb