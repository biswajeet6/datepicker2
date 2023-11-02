const GQL_WEBHOOK_SUBSCRIPTIONS = `
{
  webhookSubscriptions(first: 100) {
    edges {
      node {
        id
        topic
        callbackUrl
        endpoint {
          __typename
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
          ... on WebhookEventBridgeEndpoint {
            arn
          }
        }
      }
    }
  }
}
`

export default GQL_WEBHOOK_SUBSCRIPTIONS