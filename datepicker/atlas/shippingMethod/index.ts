import {ObjectID} from 'mongodb';
import {connectToDatabase} from '@/app/utils/mongo'
import {IShippingMethod} from '@/app/types/store'

const COLLECTION = 'shipping_methods'

const shippingMethodMethods = {
    getById: async (storeId: string, shippingMethodId: string): Promise<IShippingMethod | null> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).findOne({
            _id: ObjectID(shippingMethodId),
            store_id: storeId
        }) ?? null
    },
    getByIds: async (storeId: string, shippingMethodIds: string[]): Promise<IShippingMethod[]> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).find({
            _id: {
                $in: shippingMethodIds.map(shippingMethodId => ObjectID(shippingMethodId))
            },
            store_id: storeId
        }).toArray()
    },
    getByStoreId: async (storeId: string, archived: boolean = false): Promise<IShippingMethod[]> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).find({
            store_id: storeId,
            archived: archived
        }).toArray()
    },
    getByRegionId: async (storeId: string, regionId: string, enabled: boolean = true, archived: boolean = false): Promise<IShippingMethod[]> => {
        const mongo = await connectToDatabase()

        return mongo.client.db().collection(COLLECTION).find({
            store_id: storeId,
            enabled: enabled,
            archived: archived,
            region_ids: {
                $eq: ObjectID(regionId)
            }
        }).toArray()
    },
    getByCode: async (storeId: string, shippingMethodCode: string): Promise<IShippingMethod | null> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).findOne({
            service_code: shippingMethodCode,
            store_id: storeId
        }) ?? null
    },
    insert: async (document: IShippingMethod) => {
        const mongo = await connectToDatabase()

        document.promise_start = parseInt(document.promise_start.toString())
        document.promise_end = parseInt(document.promise_end.toString())
        document.daily_order_limit = parseInt(document.daily_order_limit.toString())
        document.price = parseInt(document.price.toString())

        return await mongo.client.db().collection(COLLECTION).insertOne(document) ?? null
    },
    update: async (storeId: string, shippingMethod: IShippingMethod) => {
        const mongo = await connectToDatabase()

        const id = shippingMethod._id

        delete shippingMethod._id

        shippingMethod.region_ids = shippingMethod.region_ids.map((region_id) => {
            return ObjectID(region_id)
        })

        shippingMethod.promise_start = parseInt(shippingMethod.promise_start.toString())
        shippingMethod.promise_end = parseInt(shippingMethod.promise_end.toString())
        shippingMethod.daily_order_limit = parseInt(shippingMethod.daily_order_limit.toString())
        shippingMethod.price = parseInt(shippingMethod.price.toString())

        return await mongo.client.db().collection(COLLECTION).update(
            {_id: ObjectID(id), store_id: storeId},
            {$set: shippingMethod}
        ) ?? null
    },
    delete: async (id: string, storeId: string): Promise<any> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).updateOne(
            {_id: ObjectID(id), store_id: storeId},
            {$set: {archived: true}}
        ) ?? null
    },
}

export default shippingMethodMethods