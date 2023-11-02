const WEBHOOK_SUBSCRIPTION_DELETE = () => {
    return `
        mutation webhookSubscriptionDelete($id: ID!) {
            webhookSubscriptionDelete(id: $id) {
                deletedWebhookSubscriptionId
                userErrors {
                  field
                  message
                }
            }
        }
    `
}

export default WEBHOOK_SUBSCRIPTION_DELETE