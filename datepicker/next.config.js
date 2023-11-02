const {parsed: localEnv} = require('dotenv').config()
const webpack = require('webpack')

if (process.env === 'development') {
    module.exports = {
        webpack(config) {
            config.plugins.push(new webpack.EnvironmentPlugin(localEnv))
            return config
        },
    }
} else {
    module.exports = {
        env: {
            APP_URL: process.env.APP_URL,
            SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
            SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
            SHOPIFY_APP_SCOPES: process.env.SHOPIFY_APP_SCOPES,
            PARTNER_EVENT_SOURCE_ARN: process.env.PARTNER_EVENT_SOURCE_ARN,
            MONGO_DB_CONNECTION_STRING: process.env.MONGO_DB_CONNECTION_STRING,
            TEST_MONGO_DB_CONNECTION_STRING: process.env.TEST_MONGO_DB_CONNECTION_STRING,
            AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
            AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
            APP_AUTHENTICATION_KEY: process.env.APP_AUTHENTICATION_KEY,
            CLOUDWATCH_LOG_GROUP_NAME: process.env.CLOUDWATCH_LOG_GROUP_NAME,
            SENTRY_DSN: process.env.SENTRY_DSN,
            ROLLBAR_PROJECT_KEY: process.env.ROLLBAR_PROJECT_KEY,
            STAGE: process.env.STAGE
        }
    }
}
