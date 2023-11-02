import {ObjectID} from 'mongodb'
import {connectToDatabase} from '@/app/utils/mongo'
import {IBlockedDate} from '@/app/types/store'

const COLLECTION = 'blocked_dates'

const blockedDateMethods = {
    getById: async (storeId: string, id: string): Promise<IBlockedDate> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).findOne({_id: ObjectID(id), store_id: storeId}) ?? null
    },
    getByResourceId: async (storeId: string, resourceId: string, sort: 'asc' | 'desc' = 'asc') => {
        const mongo = await connectToDatabase()

        const result = await mongo.client.db().collection(COLLECTION).find({
            store_id: storeId,
            resource_id: resourceId
        }).sort({start: sort === 'asc' ? 1 : -1})
        return result.toArray()
    },
    getByResourceIds: async (storeId: string, resourceIds: string[]) => {
        const mongo = await connectToDatabase()

        resourceIds = resourceIds.map((resourceId: any) => resourceId.toString())

        const result = await mongo.client.db().collection(COLLECTION).find({
            store_id: storeId,
            resource_id: {
                $in: resourceIds
            }
        })
        return result.toArray()
    },
    insert: async (document: IBlockedDate) => {
        const mongo = await connectToDatabase()

        document.start = new Date(document.start)
        document.end = new Date(document.end)

        return await mongo.client.db().collection(COLLECTION).insertOne(document) ?? null
    },
    update: async (storeId: string, document: IBlockedDate) => {
        const mongo = await connectToDatabase()

        const id = document._id

        delete document._id

        document.start = new Date(document.start)
        document.end = new Date(document.end)

        return await mongo.client.db().collection(COLLECTION).updateOne({_id: ObjectID(id)}, {$set: document}) ?? null
    },
    delete: async (id: string, storeId: string): Promise<any> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).deleteOne({_id: ObjectID(id), store_id: storeId}) ?? null
    },
}

export default blockedDateMethods