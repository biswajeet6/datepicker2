import CONSTS from './consts'
import populateDb from './helpers/populateDb'
import clearDb from './helpers/clearDb'
import handler from '../pages/api/realm/cleanup'
import {testApiHandler} from 'next-test-api-route-handler'
import {IBlockedDate, IOrderDocument, IRegion, IStoreDocument} from '@/app/types/store'
import {connectToDatabase} from '@/app/utils/mongo'
import {utcToZonedTime, zonedTimeToUtc} from 'date-fns-tz'
import {addDays, startOfDay, subDays} from 'date-fns'

describe('cleanup', () => {

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
        //
    })

    it('should remove all expired blocked dates', async () => {

        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const expiredYesterday: IBlockedDate[] = [
            {
                store_id: store._id,
                resource_id: store._id,
                title: 'EXPIRED_YESTERDAY_1',
                start: zonedTimeToUtc(startOfDay(subDays(now, 3)), CONSTS.APP_TIMEZONE),
                end: zonedTimeToUtc(startOfDay(subDays(now, 1)), CONSTS.APP_TIMEZONE),
            },
            {
                store_id: store._id,
                resource_id: store._id,
                title: 'EXPIRED_YESTERDAY_2',
                start: zonedTimeToUtc(startOfDay(subDays(now, 3)), CONSTS.APP_TIMEZONE),
                end: zonedTimeToUtc(startOfDay(subDays(now, 1)), CONSTS.APP_TIMEZONE),
            }
        ]
        const expiresToday: IBlockedDate[] = [
            {
                store_id: store._id,
                resource_id: store._id,
                title: 'EXPIRES_TODAY_1',
                start: zonedTimeToUtc(startOfDay(subDays(now, 3)), CONSTS.APP_TIMEZONE),
                end: zonedTimeToUtc(now, CONSTS.APP_TIMEZONE),
            },
            {
                store_id: store._id,
                resource_id: store._id,
                title: 'EXPIRES_TODAY_2',
                start: zonedTimeToUtc(startOfDay(subDays(now, 3)), CONSTS.APP_TIMEZONE),
                end: zonedTimeToUtc(now, CONSTS.APP_TIMEZONE),
            }
        ]
        const expiresTomorrow: IBlockedDate[] = [
            {
                store_id: store._id,
                resource_id: store._id,
                title: 'EXPIRES_TOMORROW_1',
                start: zonedTimeToUtc(startOfDay(subDays(now, 3)), CONSTS.APP_TIMEZONE),
                end: zonedTimeToUtc(startOfDay(addDays(now, 1)), CONSTS.APP_TIMEZONE),
            },
            {
                store_id: store._id,
                resource_id: store._id,
                title: 'EXPIRES_TOMORROW_1',
                start: zonedTimeToUtc(startOfDay(subDays(now, 3)), CONSTS.APP_TIMEZONE),
                end: zonedTimeToUtc(startOfDay(addDays(now, 1)), CONSTS.APP_TIMEZONE),
            }
        ]

        await db.collection('blocked_dates').insertMany(expiredYesterday.concat(expiresToday.concat(expiresTomorrow)))

        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                await fetch({
                    method: 'POST',
                    body: JSON.stringify({})
                })

                const blockedDatesAfterCleanup = await db.collection('blocked_dates').find({}).toArray()

                expect(blockedDatesAfterCleanup.length).toBe((expiresToday.length + expiresTomorrow.length))
            }
        })
    })

    it('should remove all expired orders', async () => {

        const now = utcToZonedTime(new Date(), CONSTS.APP_TIMEZONE)

        const createOrder = (nominatedDate: Date): IOrderDocument => {
            return {
                store_id: CONSTS.STORE_ID,
                order_id: `${Math.floor(Math.random() * 100)}`,
                internal_status: "processed",
                internal_message: null,
                order_number: "1007",
                region_id: '1234',
                tags: [""],
                line_items: [
                    {
                        id: "6641516642499",
                        variant_id: '1',
                        quantity: 1
                    }
                ],
                shipping_lines: [{
                    code: 'STD'
                }],
                shipping_method: 'STD',
                postcode: "BS165AW",
                note_attributes: [{
                    name: "_nominated_date",
                    value: zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE).toString()
                }],
                nominated_date: zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE),
                last_modified: zonedTimeToUtc(nominatedDate, CONSTS.APP_TIMEZONE),
                tag_history: [],
                externally_shipped: false,
                local_pickup: false,
            }
        }

        const expiredYesterday: IOrderDocument[] = [
            createOrder(startOfDay(subDays(now, 1))),
            createOrder(startOfDay(subDays(now, 1))),
        ]

        const expiresToday: IOrderDocument[] = [
            createOrder(startOfDay(now)),
            createOrder(startOfDay(now)),
        ]

        const expiresTomorrow: IOrderDocument[] = [
            createOrder(startOfDay(addDays(now, 1))),
            createOrder(startOfDay(addDays(now, 1))),
        ]

        await db.collection('orders').insertMany(expiredYesterday.concat(expiresToday.concat(expiresTomorrow)))

        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {
                await fetch({
                    method: 'POST',
                    body: JSON.stringify({})
                })

                const ordersAfterCleanup = await db.collection('orders').find({}).toArray()

                expect(ordersAfterCleanup.length).toBe((expiresToday.length + expiresTomorrow.length))
            }
        })
    })
})