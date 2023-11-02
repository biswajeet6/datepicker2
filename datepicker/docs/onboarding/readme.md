# Setup

1. The frontend integration of the date selector for the client site(s) staging & live - lives within the clients theme
2. Create 2 new custom apps (staging and production) each with client specific configuration
3. Setup event bridge for each client [read more](https://shopify.dev/apps/webhooks/eventbridge)
4. The .circleci/config.yml includes the deployment work flow
5. Deployment workflow for the event handlers live in separate repository
6. Create a staging/production Mongo instance for the client - recommend minimum M5 for production
7. Create a realm app within Mongo for staging & live. [see](../../.REALM)
8. Populate the CircleCI contexts (staging and production) with the required env vars [see](../env/readme.md)
9. Deploy the staging and production branches - this should create a new distribution for each environment in CloudFront.
10. Enable "test mode" on the apps configuration page for live sites, this can be disabled once the client is ready to use the app.

