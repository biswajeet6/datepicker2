# Date Selector

This application was initially created as a custom application for Cutter & Squidge. Its primary focus is to take into consideration various rules and conditions which govern delivery date availability for the stores customers. It does this by:
- Providing an interface to configure rules, regions and shipping methods
- Providing an API endpoint to retrieve aggregated date availability
- Providing an API endpoint for Shopify to retrieve shipping rates from for the carrier service.

The app leverages serverless technologies to provide the capabilities and is primarily API and event driven.

## Sections

[API Proxy](docs/api/readme.md)

[Architecture](docs/architecture/readme.md)

[Deployment](docs/deployment/readme.md)

[Env](docs/env/readme.md)

[Local Development](docs/local/readme.md)

[Onboarding](docs/onboarding/readme.md)

## Note
find and replace ENTER-DOMAIN-HERE with pertinent AWS / server info

## Access

### AWS Organisation

Access info here

## Notes
- The app has a magical "/settings" page which is hidden from the admin app. You can use this page to enable / disable the carrier integration and sync any new or existing webhooks.
- You can also sync the webhooks from the settings page. Use this if you are adding new, or deleting webhooks for the store.
- For new installs, the webhooks and carrier integration will be disabled by default.
