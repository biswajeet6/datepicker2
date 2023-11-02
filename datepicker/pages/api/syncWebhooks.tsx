import ShopifyGql from '@/app/utils/shopifyGql'
import {IEventBridgeWebhook} from '@/app/types/gql'
import methods from '../../atlas'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'
import withApp from '@/app/middleware/withApp'

const webhooks: IEventBridgeWebhook[] = [
    {
        topic: 'ORDERS_CREATE',
        arn: process.env.PARTNER_EVENT_SOURCE_ARN
    },
    {
        topic: 'ORDERS_UPDATED',
        arn: process.env.PARTNER_EVENT_SOURCE_ARN
    },
    {
        topic: 'ORDERS_DELETE',
        arn: process.env.PARTNER_EVENT_SOURCE_ARN
    },
    {
        topic: 'ORDERS_CANCELLED',
        arn: process.env.PARTNER_EVENT_SOURCE_ARN
    },
    {
        topic: 'ORDERS_EDITED',
        arn: process.env.PARTNER_EVENT_SOURCE_ARN
    }
]

export interface ISyncWebhookResult {
    success: boolean
    type: 'create' | 'unsubscribe' | 'skipped' | 'force_reset'
    topic: string
}

// @see https://shopify.dev/tutorials/manage-webhook-events-with-eventbridge @see https://community.shopify.com/c/Shopify-APIs-SDKs/AWS-EventBridge-set-up/td-p/816093
const handle = async (req: INextApiRequest, res: NextApiResponse) => {

    const {forceReset} = JSON.parse(req.body)

    const syncResults: ISyncWebhookResult[] = []

    // Force reset
    if (forceReset) {

        const existingSubscriptions = await ShopifyGql(req.store._id, req.store.token).webhookSubscriptions()

        for (let i = 0; i < existingSubscriptions.length; i++) {
            try {
                await ShopifyGql(req.store._id, req.store.token).webhookSubscriptionDelete(existingSubscriptions[i].id)

                syncResults.push({
                    success: true,
                    type: 'force_reset',
                    topic: existingSubscriptions[i].topic,
                })
            } catch (e) {
                console.error(e)

                syncResults.push({
                    success: false,
                    type: 'force_reset',
                    topic: existingSubscriptions[i].topic,
                })
            }
        }

        try {
            await methods.store.resetWebhookSubscriptions(req.store._id)

            // required to allow the create requests to continue below
            req.store.webhook_subscriptions = []

            syncResults.push({
                success: true,
                type: 'force_reset',
                topic: 'ALL',
            })
        } catch (e) {
            console.error(e)

            syncResults.push({
                success: false,
                type: 'force_reset',
                topic: 'ALL',
            })
        }
    }

    // Iterate required webhooks
    for (let i = 0; i < webhooks.length; i++) {

        // @todo add force reset flag which deletes any existing webhooks and resets them

        const isCreated = req.store.webhook_subscriptions.findIndex(webhookSubscription => webhookSubscription.topic === webhooks[i].topic)

        // If the webhook does not exist then create it & store a record of it in DB
        if (isCreated < 0) {
            try {
                const webhookId = await ShopifyGql(req.store._id, req.store.token).eventBridgeWebhookSubscriptionCreate(webhooks[i])

                await methods.store.insertWebhookSubscription(req.store._id, webhookId, webhooks[i].topic)

                syncResults.push({
                    success: true,
                    type: 'create',
                    topic: webhooks[i].topic,
                })
            } catch (e) {
                console.error(e)

                syncResults.push({
                    success: false,
                    type: 'create',
                    topic: webhooks[i].topic,
                })
            }
        } else {
            syncResults.push({
                success: true,
                type: 'skipped',
                topic: webhooks[i].topic,
            })
        }
    }


    // Determine if we need to unsubscribe any webhooks
    for (let i = 0; i < req.store.webhook_subscriptions.length; i++) {

        const isRequired = webhooks.findIndex(webhook => webhook.topic === req.store.webhook_subscriptions[i].topic)

        if (isRequired < 0) {
            try {
                const result = await ShopifyGql(req.store._id, req.store.token).webhookSubscriptionDelete(req.store.webhook_subscriptions[i].id)

                if (result) {
                    await methods.store.removeWebhookSubscription(req.store._id, req.store.webhook_subscriptions[i].id)
                }

                syncResults.push({
                    success: true,
                    type: 'create',
                    topic: webhooks[isRequired].topic,
                })
            } catch (e) {
                console.error(e)

                syncResults.push({
                    success: false,
                    type: 'unsubscribe',
                    topic: webhooks[isRequired].topic,
                })
            }
        }
    }

    return res.status(200).json(syncResults)
}

export default withApp(handle, {
    guards: ['jwt']
})