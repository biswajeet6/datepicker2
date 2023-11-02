import {connectToDatabase} from '@/app/utils/mongo'
import {ICarrierService, IConfig, IStoreDocument} from '@/app/types/store'

const COLLECTION = 'stores'

const storeMethods = {
    getAll: async (): Promise<IStoreDocument | null> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).find({}).toArray() ?? null
    },
    getById: async (id: string): Promise<IStoreDocument | null> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).findOne({_id: id}) ?? null
    },
    create: async (document: IStoreDocument): Promise<boolean | null> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).insertOne(document) ?? null
    },
    updateConfig: async (id: string, config: IConfig): Promise<boolean | null> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).updateOne(
            {_id: id},
            {
                $set: {
                    config: config
                }
            }
        ) ?? null
    },
    resetWebhookSubscriptions: async (id: string): Promise<boolean | null> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).updateOne(
            {_id: id},
            {
                $set: {
                    webhook_subscriptions: []
                }
            }
        ) ?? null
    },
    updateCarrierService: async (id: string, carrierService: ICarrierService): Promise<boolean | null> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).updateOne(
            {_id: id},
            {
                $set: {
                    carrier_service: carrierService
                }
            }
        ) ?? null
    },
    insertWebhookSubscription: async (id: string, webhookId: string, topic: string): Promise<boolean | null> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).update(
            {_id: id},
            {
                $addToSet: {
                    webhook_subscriptions: {
                        id: webhookId,
                        topic: topic
                    }
                }
            }
        )
    },
    removeWebhookSubscription: async (id: string, webhookId: string): Promise<boolean | null> => {
        const mongo = await connectToDatabase()

        return await mongo.client.db().collection(COLLECTION).update(
            {_id: id},
            {
                $pull: {
                    webhook_subscriptions: {id: {$eq: webhookId}}
                }
            }
        )
    },
}

export default storeMethods