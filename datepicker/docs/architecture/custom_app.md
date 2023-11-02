# Shopify Custom App Configuration

You can read more about configuring and installing custom apps in Shopify [here](https://help.shopify.com/en/manual/apps/working-with-apps)

App specific configuration is outlined below:

## App Setup
Config | Description
--- | ---
App URL | Ensure this matches the APP_URL env var configured in your environment. (Note: Shopify may add a trailing "/" on save. **Do not** use a trailing / in your apps configuration, it is used to generate oauth callback urls)
Redirection URLs | Configure the urls which the app can redirect to i.e. /install and /configuration. This needs to include your app url
App Proxy | This is used by the front end to connect to the app and retrieve availability on the lookup endpoint. Ensure this matches the uri frontend is using to proxy with. The proxy URL should always route requests to `/api/proxy`
EventBridge | Each app requires an event source to be configured. Event subscriptions are used to handle post order create, update and delete events from Shopify.
