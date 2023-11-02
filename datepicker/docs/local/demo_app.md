# Demo App

The "Date Selector [Demo]" app is what I have been using for all of my local development. It already has the required configuration setup, and is installed on the demo store. If only a single developer is working on the app then you may wish to simply use my .env configuration. Pasted below, with sensitive data removed.

Key | Value
--- | ---
MONGO_DB_CONNECTION_STRING | mongodb+srv://staging:[REDACTED]@[REDACTED].mongodb.net/[DB]?retryWrites=true&w=majority
TEST_MONGO_DB_CONNECTION_STRING | mongodb+srv://staging:[REDACTED]@[REDACTED].mongodb.net/[DB-test]?retryWrites=true&w=majority
SHOPIFY_API_KEY | [REDACTED]
SHOPIFY_API_SECRET | [REDACTED]
APP_URL | https://ds.ngrok.io
SHOPIFY_APP_SCOPES | read_products,write_products,read_script_tags,write_script_tags,read_customers,write_customers,read_orders,write_orders,read_themes,write_themes,read_content,write_content,read_locations,read_checkouts,write_checkouts,write_shipping
PARTNER_EVENT_SOURCE_ARN | arn:aws:events:eu-west-2::event-source/aws.partner/shopify.com/[REDACTED]
AWS_ACCESS_KEY_ID | [REDACTED]
AWS_SECRET_ACCESS_KEY | [REDACTED]
STAGE | local
APP_AUTHENTICATION_KEY | [REDACTED]
CLOUDWATCH_LOG_GROUP_NAME | [REDACTED]
TZ | utc
