# Background

This code exports a single function, `transformOrderFromEvent`, which takes an `event` object of type `IEventOrders` as an argument and returns an `IOrder` object or `null` depending on whether the order requires shipping or not.

Here's what the different helper functions and the main `transformOrderFromEvent` function do:

1.  `requiresShipping(lineItems)`: This function takes an array of line items and checks if any of them require shipping. It returns `true` if there is at least one item that requires shipping, and `false` otherwise.
    
2.  `isExternallyShipped(event)`: This function checks if the order is shipped externally (i.e., not by "Cutters"). It returns `true` if the first shipping line's source is not "Cutters", and `false` otherwise.
    
3.  `isLocalPickup(event)`: This function checks if the order is a local pickup by looking at the `shipping_address` property of the `event` object. It returns `true` if the `shipping_address` is `undefined`, and `false` otherwise.
    
4.  `transformOrderFromEvent(event)`: This is the main function that transforms an `event` object into an `IOrder` object. It first checks if the order requires shipping using the `requiresShipping` function. If shipping is not required, the function returns `null`.
    
    If shipping is required, the function creates a new `IOrder` object with the appropriate properties, including `store_id`, `order_id`, `internal_status`, `internal_message`, `internal_retry`, `order_number`, `region_id`, `tags`, `line_items`, `shipping_lines`, `shipping_method`, `postcode`, `note_attributes`, `nominated_date`, `externally_shipped`, `local_pickup`, `tag_history`, and `last_modified`.
    

The transformed `IOrder` object is then returned by the `transformOrderFromEvent` function. This function is useful for converting raw event data from a webhook, for example, into a more structured and relevant format for further processing or storage.