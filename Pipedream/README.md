### Pipedream 

Pipedream is a tool similar to the likes of Zapier / Make.com that performs an IFTTT process but allows adding in code steps [see](https://pipedream.com/)

## Reason for use / Requirement

Cutter and Squidge rely heavily on the custom date picker app to monitor their availabilty for orders on a daily basis - and to ensure they don't offer delivery days that would exceed their productivity

Cutter and Squidge have recently setup and offer Recharge subscriptions for their products - the main requirement for using pipedream is that subsequent orders need to have the correct delivery information and not the default recharge delivery method - as well as the newly curated expected delivery date

## Flow

[see diagram](./Architecture.png)

* The initial order would go through the cart (date picker) and ensure that the initial date is selected
* Listen to Recharge webhook for order created - on pipedream workflow - [trigger](/order_created/)
* Ensure the delivery method and code is update on Shopify and on the Recharge Address
* Listen to Recharge webhook for charge created - on pipedream workflow - [trigger](/charge_created/) 
* Ensure the line item properties for the new order have the new date information
* This will trigger an order update on Shopify - and pass the new information onto the date app
* the date app will then update any tags on the Shopify order


## Configure pipedream

* For each of the workflows you will need to create a trigger endpoint - this will generate a url 
* you will then need to use the url to subscribe to Recharge webhooks  - [see](/example_webhook_creation) - can also be done in Pipedream
* Each folder has been layed out in order of the steps 1-6 / 1-3 with the code in use and the relevant authentication steps where necessary