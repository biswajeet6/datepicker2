const EVENT_BRIDGE_WEBHOOK_SUBSCRIPTION_CREATE = () => {
    return `
		mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: EventBridgeWebhookSubscriptionInput!) {
			eventBridgeWebhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
				webhookSubscription {
					id
				}
				userErrors {
					message
				}
			}
		}
	`
}

export default EVENT_BRIDGE_WEBHOOK_SUBSCRIPTION_CREATE