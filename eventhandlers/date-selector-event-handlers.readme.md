# Background


The following code was provided by BlueBolt however the README.md file contains boilerplate information from when the respostory was and looks like it originisates from older version of the serveless boilerplate which can be seen [here](https://github.com/andrenbrandao/serverless-typescript-boilerplate) and [here](https://www.serverless.com/examples/aws-node-rest-api-typescript)

From reviewing the code we understand the following, however a detailed breakdown of what each of the files are doing can be found in the associated `.readme` file.

## Overview

The module recieves webhooks emitted by Shopify for orderCreate, orderDelete, orderUpdate and orderCancel and in each event it updates the information for the order which is stored in [Mongo DB Atlas](https://www.mongodb.com/cloud/atlas/)

- The code Is deployed by [Circle CI](https://circleci.com/) with deployment confirguration in `.circleci`
- The code uses [AWS Event Bus](https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_EventBus.html) to pass data to lambda functions
- The code for the integration was written ontop of the [Serverless](https://www.serverless.com/)  framework to create a set of rest APIs that are implemented as AWS lamba functions and manage state via [Mongo DB Atlas](https://www.mongodb.com/cloud/atlas/) 

- The module recieves webhooks from Shopify for 
	- orderCreate
	- orderDelete
	- orderUpdate
	- orderCancel 
- These are passed to the src/functions and update Mongo DB state.

Environment Variables
-  
The following environment variables exist within the codebase:
|VARIABLE|USED FOR  |
|--|--|
|MONGO_DB_CONNECTION_STRING|Connecting to Mongo DB.|
|STAGE|Boolean flag, present only on staging environments.|
|EVENT_BUS_ARN|Amazon Resource Name (ARN) associated with an Amazon EventBridge event bus.|

Other Considerations
- 
- CTI Lambda Account?
- CTI Cloud Watch Account?
- CTI Event Bus Account?
- What is the sync-templates for?
- Any other env vars we need to be made aware of?
- How are these webhooks registered `Blubolt Connection` or `DateSelector`
- Mongo DB's for stage/prod
- `account: ['977846025308'],`  appears to be hardcoded what is this account ID?
- The orderCancelled `orderCancelled` -> `handler.ts` function's method is called `orderUpdated`