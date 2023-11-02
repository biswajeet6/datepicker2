import GQL_WEBHOOK_SUBSCRIPTIONS from '../gql/actions/webhookSubscriptions'
import {IEventBridgeWebhook} from '@/app/types/gql'
import EVENT_BRIDGE_WEBHOOK_SUBSCRIPTION_CREATE from '../gql/mutations/eventBridgeWebhookSubscriptionCreate'
import WEBHOOK_SUBSCRIPTION_DELETE from '../gql/mutations/webhookSubscriptionDelete'
import SHOPIFY from '@/app/consts/shopify'
import UPDATE_TAGS from '../gql/mutations/updateTags'
import Logger from '@/app/utils/logger'

interface IWebhookSubscription {
    id: string,
    topic: string,
    endpoint: {
        __typename: string,
        arn: string | null
    }
}

type TShopifyGQL = (shop: string, token: string) => {
    webhookSubscriptions: () => Promise<IWebhookSubscription[]>,
    webhookSubscriptionDelete: (id: string) => Promise<boolean>,
    eventBridgeWebhookSubscriptionCreate: (webhook: IEventBridgeWebhook) => Promise<string>,
    updateTags: (resourceId: string, addTags: string[], removeTags: string[]) => Promise<boolean>,
}

const ShopifyGql: TShopifyGQL = (shop, token) => {

    const query = async (query: string, variables: any = {}) => {
        return await fetch(
            `https://${shop}/admin/api/${SHOPIFY.GQL_API_VERSION}/graphql.json`,
            {
                method: 'POST',
                body: JSON.stringify({
                    query: query,
                    variables: variables,
                }),
                headers: {
                    'X-Shopify-Access-Token': token,
                    'Content-Type': 'application/json',
                }
            }
        ).then((response) => {

            try {
                Logger.info('GQL Request ID', {
                    gqlRequestId: response.headers.get('x-request-id')
                })
            } catch (e) {
                // @ignore
            }

            return response.json()
        })
    }

    /**
     * Retrieve a list of all webhook subscriptions
     */
    const webhookSubscriptions = async () => {

        const result = await query(GQL_WEBHOOK_SUBSCRIPTIONS)

        const response: IWebhookSubscription[] = [];

        if (
            result.data &&
            result.data.webhookSubscriptions &&
            result.data.webhookSubscriptions.edges
        ) {
            result.data.webhookSubscriptions.edges.forEach((edge) => {
                response.push({
                    id: edge.node.id,
                    topic: edge.node.topic,
                    endpoint: {
                        __typename: edge.node.endpoint.__typename,
                        arn: edge.node.endpoint.arn ?? null
                    }
                })
            })
        }

        return response
    }

    /**
     * Delete a webhook subscription by ID
     */
    const webhookSubscriptionDelete = async (id: string) => {
        const result = await query(WEBHOOK_SUBSCRIPTION_DELETE(), {
            id: id
        })

        if (result.errors) {
            throw {
                message: 'Failed to delete webhook',
                result: result
            }

        }

        return true
    }

    /**
     * Create a webhook subscription and return the newly created ID
     *
     * @param webhook
     */
    const eventBridgeWebhookSubscriptionCreate = async (webhook: IEventBridgeWebhook) => {
        const result = await query(EVENT_BRIDGE_WEBHOOK_SUBSCRIPTION_CREATE(), {
            topic: webhook.topic,
            webhookSubscription: {
                arn: webhook.arn,
                format: 'JSON'
            }
        })

        if (
            result.data &&
            result.data.eventBridgeWebhookSubscriptionCreate &&
            result.data.eventBridgeWebhookSubscriptionCreate.webhookSubscription
        ) {
            return result.data.eventBridgeWebhookSubscriptionCreate.webhookSubscription.id
        } else {
            throw {
                message: 'Failed to create webhook',
                errors: result.errors ?? result.data.eventBridgeWebhookSubscriptionCreate.userErrors ?? [],
            }
        }
    }

    const updateTags = async (resourceId: string, addTags: string[], removeTags: string[]) => {

        const result = await query(UPDATE_TAGS(), {
            orderId: resourceId,
            addTags: addTags,
            removeTags: removeTags,
        })

        if (result && result.data) {
            if (result.data.orderTagsAdd.userErrors.length > 0) {
                throw {
                    message: 'Failed to add tags',
                    errors: result.data.orderTagsAdd.userErrors ?? []
                }
            } else if (result.data.orderTagsRemove.userErrors.length > 0) {
                throw {
                    message: 'Failed to remove tags',
                    errors: result.data.orderTagsRemove.userErrors ?? []
                }
            }
        } else {
            throw {
                message: 'Failed to update tags',
                errors: result.errors,
            }
        }

        return result
    }

    return {
        webhookSubscriptions,
        webhookSubscriptionDelete,
        eventBridgeWebhookSubscriptionCreate,
        updateTags
    }
}

export default ShopifyGql