import {ObjectID} from 'mongodb'
import {connectToDatabase} from '@/app/utils/mongo'
import {IRegion} from '@/app/types/store'

const COLLECTION = 'regions'

const regionMethods = {
    getById: async (storeId: string, regionId: string) => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).findOne({
            _id: ObjectID(regionId),
            store_id: storeId
        }) ?? null
    },
    getByStoreId: async (storeId: string, archived: boolean = false) => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).find({
            store_id: storeId,
            archived: archived
        }) ?? null
    },
    getStoreDefault: async (storeId: string) => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).findOne({store_id: storeId, default: true}) ?? null
    },
    getByPostcode: async (storeId: string, postcode: string, area: string, outcode: string, sector: string, archived: boolean = false) => {
        const mongo = await connectToDatabase()

        return mongo.client.db().collection(COLLECTION).find({
            store_id: storeId,
            archived: archived,
            $or: [
                {default: true},
                {'postcode_filters': {$eq: postcode.split(' ').join('')}},
                {'sector_filters': {$eq: `${outcode}${sector}`}},
                {'outcode_filters': {$eq: outcode}},
                {'area_filters': {$eq: area}}
            ]
        }).toArray()
    },
    insert: async (document: IRegion) => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).insertOne(document) ?? null
    },
    update: async (storeId: string, regionId: string, fields: []) => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).update(
            {_id: ObjectID(regionId), store_id: storeId},
            {$set: {...fields}}
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

export default regionMethods