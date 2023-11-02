# Local Development

## Requirements

- node 
- npm
- ngrok
- AWS access
- Mongo access
- Shopify partners access
- MongoDB Compass

## Getting Started

- Read through the app architecture [here](../architecture/readme.md) to gain a high level understanding of the services used and how they interlink.
- `git clone` & `npm install`
- Setup (or reuse) a Shopify custom app instance [read more](../architecture/custom_app.md) 
- Configure your Shopify environment variables [read more](../env/readme.md) or use the env variables outlined [here](demo_app.md)
    - Note that some environment variables are not required for local development.
        - AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY (unless you are deploying from local - which you really shouldn't be)
        - PARTNER_EVENT_SOURCE_ARN (unless you are testing event handlers from a newly installed app)
- `npm run dev` To spin up the NextJS instance
- `npm run test-watch` To kick off jest
- `npm run ngrok` To expose the NextJS instance to the web (and Shopify)

### Mongo

The "Dev" instance in the "Shopify Date Selection" project has been the primary database used for all local development, testing and staging apps. You will need to configure a user in the MongoDB UI to connect to the database.

### Ngrok

The `npm run ngrok` command uses a host and sub-domain configured in my ngrok account. You may want / need to swap this out for a host setup in your own account. I'd strongly recommend you use a custom hostname, otherwise you'll have to change the Shopify configuration everytime you run the ngrok command. 
