import CONSTS from '../../consts'
import populateDb from '../../helpers/populateDb'
import clearDb from '../../helpers/clearDb'
import handler from '../../../pages/api/shippingMethod/update'
import {testApiHandler} from 'next-test-api-route-handler'
import {IOrderDocument, IRegion, IStoreDocument} from '@/app/types/store'
import {connectToDatabase} from '@/app/utils/mongo'
import createDefaultShippingMethod from '../../../helpers/createDefaultShippingMethod'

describe('shippingMethod/update', () => {

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

    it('should update a method', async () => {

        const method = createDefaultShippingMethod(CONSTS.STORE_ID, 'STD')

        await db.collection('shipping_methods').insertOne(method)

        const beforeUpdate = await db.collection('shipping_methods').findOne({name: method.name})

        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {

                const newName = 'NEW_NAME'

                const updateRequest = {
                    storeId: CONSTS.STORE_ID,
                    shippingMethod: Object.assign(
                        {},
                        beforeUpdate,
                        {
                            name: 'NEW_NAME',
                        }
                    )
                }

                await fetch({
                    method: 'POST',
                    // literally no idea why i need to stringify twice
                    body: JSON.stringify(JSON.stringify(updateRequest))
                })

                const afterUpdate = await db.collection('shipping_methods').findOne({_id: beforeUpdate._id})

                expect(afterUpdate.name === beforeUpdate.name).toBe(false)

                expect(afterUpdate.name).toBe(newName)
            }
        })
    })

    it('should update associated orders when the service code is changed', async () => {

        const DO_NOT_UPDATE_CODE = 'DO_NOT_UPDATE_CODE'
        const DO_NOT_UPDATE_NAME = 'DO_NOT_UPDATE_NAME'
        const INITIAL_CODE = 'INITIAL_CODE'
        const INITIAL_NAME = 'INITIAL_NAME'
        const UPDATED_CODE = 'UPDATED_CODE'
        const UPDATED_NAME = 'UPDATED_NAME'

        // create shipping method
        const method = createDefaultShippingMethod(CONSTS.STORE_ID, INITIAL_NAME)
        method.service_code = INITIAL_CODE

        await db.collection('shipping_methods').insertOne(method)

        // populate DB with orders
        const orders: IOrderDocument[] = []

        // orders with the method to be updated
        for (let i = 0; i < 5; i++) {
            orders.push({
                store_id: CONSTS.STORE_ID,
                order_id: `${Math.floor(Math.random() * 100)}`,
                internal_status: "processed",
                internal_message: null,
                order_number: i.toString(),
                region_id: defaultRegion._id,
                tags: [''],
                line_items: [
                    {id: '1', quantity: 1},
                    {id: '1', quantity: 1},
                ],
                shipping_lines: [
                    {
                        code: method.service_code,
                        title: method.name,
                    },
                    {
                        code: DO_NOT_UPDATE_CODE,
                        title: DO_NOT_UPDATE_NAME,
                    },
                ],
                shipping_method: null,
                postcode: 'BS165AW',
                note_attributes: [{
                    name: '_nominated_date',
                    value: (new Date()).toString()
                }],
                nominated_date: new Date(),
                last_modified: new Date(),
            })
        }

        // orders with the method that should be left alone
        for (let i = 5; i < 10; i++) {
            orders.push({
                store_id: CONSTS.STORE_ID,
                order_id: `${Math.floor(Math.random() * 100)}`,
                internal_status: "processed",
                internal_message: null,
                order_number: i.toString(),
                region_id: defaultRegion._id,
                tags: [''],
                line_items: [
                    {id: '1', quantity: 1},
                    {id: '1', quantity: 1},
                ],
                shipping_lines: [
                    {
                        code: DO_NOT_UPDATE_CODE,
                        title: DO_NOT_UPDATE_NAME,
                    },
                    {
                        code: DO_NOT_UPDATE_CODE,
                        title: DO_NOT_UPDATE_NAME,
                    },
                ],
                shipping_method: null,
                postcode: 'BS165AW',
                note_attributes: [{
                    name: '_nominated_date',
                    value: (new Date()).toString()
                }],
                nominated_date: new Date(),
                last_modified: new Date(),
            })
        }

        await db.collection('orders').insertMany(orders)

        await testApiHandler({
            handler,
            requestPatcher: (req) => (req.headers = {
                'content-type': 'application/json',
                ['x-shopify-shop-domain']: CONSTS.STORE_ID
            }),
            test: async ({fetch}) => {

                // perform update
                const updateRequest = {
                    storeId: CONSTS.STORE_ID,
                    shippingMethod: Object.assign(
                        {},
                        method,
                        {
                            service_code: UPDATED_CODE,
                            name: UPDATED_NAME,
                        }
                    )
                }

                await fetch({
                    method: 'POST',
                    // literally no idea why i need to stringify twice
                    body: JSON.stringify(JSON.stringify(updateRequest))
                })
            }
        })

        // get all orders after update
        const updatedOrders: IOrderDocument[] = await db.collection('orders').find({}).toArray()

        updatedOrders.forEach((order, index) => {
            if (index < 5) {
                expect(order.shipping_lines[0].code).toBe(UPDATED_CODE)
                expect(order.shipping_lines[0].title).toBe(UPDATED_NAME)
                expect(order.shipping_lines[1].code).toBe(DO_NOT_UPDATE_CODE)
                expect(order.shipping_lines[1].title).toBe(DO_NOT_UPDATE_NAME)
            } else {
                expect(order.shipping_lines[0].code).toBe(DO_NOT_UPDATE_CODE)
                expect(order.shipping_lines[0].title).toBe(DO_NOT_UPDATE_NAME)
                expect(order.shipping_lines[1].code).toBe(DO_NOT_UPDATE_CODE)
                expect(order.shipping_lines[1].title).toBe(DO_NOT_UPDATE_NAME)
            }
        })
    })
})