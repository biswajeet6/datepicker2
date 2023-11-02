# API

## Proxy

The API proxy is access via the configured proxy URL in the Shopify partner dashboard. It is good practice keeping this
consistent across each of the client apps.

Regardless of the Shopify app proxy endpoint that's configured, all requests should be routed to the `/pages/api/proxy`
directory. For the purpose of this documentation, the endpoint for each request will assume the proxy route has already
been configured to point to the apps proxy directory. I.e. `/api/proxy/lookup` will translate to `/lookup`

## Endpoints

### POST /lookup

The lookup endpoint is designed to accept the customer cart content and determine date availbility for it.

**Query Params**

Param | Description
--- | ---
shop | The shop the request is for. This will usually be automatically appended by the Shopify app proxy.

**Params**

Param | Description | Example
--- | --- | ---
postcode | The postcode the customer is intending to deliver to. | BA111JX
lineItems | The line items currently in the customers cart | ```{}```

<table>
<tr>
    <td>Param</td>
    <td>Description</td>
    <td>Example</td>
</tr>
<tr>
    <td>postcode</td>
    <td>The postcode the customer is intending to deliver to.</td>
    <td>BA111JX</td>
</tr>
<tr>
    <td>lineItems</td>
    <td>An array line items currently in the customers cart. Each of the fields in the example are required. Product and variant ids must be Shopify GUIDs.</td>
    <td>

```json
[
  {
    "productId": "gid://shopify/Product/PID001",
    "variantId": "gid://shopify/ProductVariant/VID001",
    "quantity": 5,
    "sku": "VID001",
    "grams": 1000
  },
  {
    "productId": "gid://shopify/Product/PID002",
    "variantId": "gid://shopify/ProductVariant/VID002",
    "quantity": 10,
    "sku": "VID002",
    "grams": 2500
  }
]
```

</td>
</tr>
</table>

### Response

<table>
<tr>
<td>Field</td>
<td>Description</td>
</tr>
<tr>
<td>dates</td>
<td>
Array of date availability which spans the stores configured window

`date` A UTC date string referring to the elements date

`available` A boolean flag representing whether the date should be available for selection or not

`source` If a date is not a available for selection, the source key provides reason as to why.
</td>
</tr>
<tr>
<td>available_shipping_methods</td>
<td>This contains the shipping methods that are available to the cart. They are **not** an aggregation of methods available for each date. For example, a method may be available for one date and not the other. These are primarily returned for debug reasons and should not be used in any FE logic without first defining what the FE requires from them and then providing only that data from the api.</td>
</tr>
</table>

#### Example
```json
{
  "dates": [
    {
      "date": "2021-10-04T23:00:00.000Z",
      "available": false,
      "source": "blocked_date"
    },
    {
      "date": "2021-10-05T23:00:00.000Z",
      "available": false,
      "source": "blocked_date"
    },
    {
      "date": "2022-06-30T23:00:00.000Z",
      "available": true,
      "source": null
    },
    ...
  ],
  "available_shipping_methods": [
    {
      "id": "60dt25gb0ad57f03086g7431",
      "method": {
        "_id": "60dt25gb0ad57f03086g7431",
        "store_id": "demo.myshopify.com",
        "name": "UK Standard",
        "type": "domestic",
        "description": "8am-6pm",
        "service_code": "UKSTD",
        "required_phone": false,
        "only_promise_delivery_days": true,
        "promise_start": 1,
        "promise_end": 2,
        "price": 495,
        "daily_order_limit": 0,
        "region_ids": [
          "60s095ec5ftfd6900vbc85c0"
        ],
        "delivery_days": {
          "sunday": {
            "key": "sunday",
            "label": "Sunday",
            "enabled": false
          },
          "monday": {
            "key": "monday",
            "label": "Monday",
            "enabled": false
          },
          "tuesday": {
            "key": "tuesday",
            "label": "Tuesday",
            "enabled": true
          },
          "wednesday": {
            "key": "wednesday",
            "label": "Wednesday",
            "enabled": true
          },
          "thursday": {
            "key": "thursday",
            "label": "Thursday",
            "enabled": true
          },
          "friday": {
            "key": "friday",
            "label": "Friday",
            "enabled": true
          },
          "saturday": {
            "key": "saturday",
            "label": "Saturday",
            "enabled": true
          }
        },
        "dispatch_days": {
          "sunday": {
            "key": "sunday",
            "label": "Sunday",
            "enabled": false,
            "cutoff": "12:00"
          },
          "monday": {
            "key": "monday",
            "label": "Monday",
            "enabled": true,
            "cutoff": "11:00"
          },
          "tuesday": {
            "key": "tuesday",
            "label": "Tuesday",
            "enabled": true,
            "cutoff": "11:00"
          },
          "wednesday": {
            "key": "wednesday",
            "label": "Wednesday",
            "enabled": true,
            "cutoff": "11:00"
          },
          "thursday": {
            "key": "thursday",
            "label": "Thursday",
            "enabled": true,
            "cutoff": "11:00"
          },
          "friday": {
            "key": "friday",
            "label": "Friday",
            "enabled": true,
            "cutoff": "11:00"
          },
          "saturday": {
            "key": "saturday",
            "label": "Saturday",
            "enabled": false,
            "cutoff": "12:00"
          }
        },
        "archived": false,
        "enabled": true,
        "bands": [
          {
            "name": "Free Shipping",
            "priority": 1,
            "requirement": {
              "type": "cartCost",
              "condition": "greaterThan",
              "value": 9999
            },
            "cost": {
              "type": "fixedCost",
              "value": 0
            },
            "edit": true
          }
        ],
        "apply_attributes": [],
        "apply_tags": [],
        "conditions": {
          "product_based": {
            "enabled": false,
            "type": "at_least_one",
            "product_ids": []
          }
        }
      },
      "earliest_date": "2021-10-07T00:00:00.000Z"
    },
    ...
  ]
}
```
