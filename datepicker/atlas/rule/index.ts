import {ObjectID} from 'mongodb';
import {connectToDatabase} from '@/app/utils/mongo'
import {IRule} from '@/app/types/store'

const COLLECTION = 'rules'

const ruleMethods = {
    getById: async (storeId: string, id: string): Promise<IRule> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).findOne({_id: ObjectID(id), store_id: storeId}) ?? null
    },
    getByStoreId: async (id: string, type: string, limit: number = 20, page: number = 1) => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).find({
            store_id: id,
            archived: false
        }).limit(limit).skip((page * limit) - limit) ?? null
    },
    insert: async (document: IRule) => {
        const mongo = await connectToDatabase()

        document.active_from.start = new Date(document.active_from.start)

        return await mongo.client.db().collection(COLLECTION).insertOne(document) ?? null
    },
    update: async (id: string, document: IRule) => {
        const mongo = await connectToDatabase()

        if (document._id) delete document._id

        if (document.conditions.region_based.region_ids.length) {
            document.conditions.region_based.region_ids = document.conditions.region_based.region_ids.map((regionId) => {
                return ObjectID(regionId)
            })
        }

        document.active_from.start = new Date(document.active_from.start)

        if (document.active_from.end) {
            document.active_from.end = new Date(document.active_from.end)
        }

        document.production_limits.max_units_per_day = parseInt(document.production_limits.max_units_per_day.toString())
        document.offset = parseInt(document.offset.toString())

        return await mongo.client.db().collection(COLLECTION).updateOne({_id: ObjectID(id)}, {$set: document}) ?? null
    },
    delete: async (id: string, storeId: string): Promise<any> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).updateOne(
            {_id: ObjectID(id), store_id: storeId},
            {$set: {archived: true}}
        ) ?? null
    },
    query: async (storeId: string, fromDate: Date, archived: boolean = false): Promise<IRule[]> => {
        const mongo = await connectToDatabase()

        const now = fromDate

        return mongo.client.db().collection(COLLECTION).find({
            store_id: storeId,
            archived: archived,
            enabled: true,
            [`active_from.start`]: {$lte: now},
            [`active_from.end`]: {$not: {$lte: now}},
        }).toArray()
    },
}

export default ruleMethods