# Env configuration

Key | Description
--- | ---
APP_URL | This is the URL exposing the apps endpoints to the web. Shopify requires for this to be a HTTPS endpoint. Ensure it contains no trailing slashes.
SHOPIFY_API_KEY | The API key of the Shopify app linked to the app instance.
SHOPIFY_API_SECRET | The API secret of the Shopify app linked to the app instance.
SHOPIFY_APP_SCOPES | The access scopes required for the app
AWS_ACCESS_KEY_ID | AWS account ID for deployments
AWS_SECRET_ACCESS_KEY | AWS account access key for deployments
MONGO_DB_CONNECTION_STRING | Mongo URI for the apps database instance
TEST_MONGO_DB_CONNECTION_STRING | Mongo URI for the apps test database instance
PARTNER_EVENT_SOURCE_ARN | Used during installation to specify the event bridge event source for the app
STAGE | Unique reference for the apps environment
APP_AUTHENTICATION_KEY | Used to authenticate calls from Realm to the app
TZ | The app should always be run in UTC
CLOUDWATCH_LOG_GROUP_NAME | The cloudwatch log group configured for the app to log to
ROLLBAR_PROJECT_KEY | Rollbar project key
