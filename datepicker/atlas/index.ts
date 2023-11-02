import storeMethods from "./store";
import blockedDateMethods from "./blockedDate";
import ruleMethods from "./rule";
import regionMethods from "./region";
import shippingMethodMethods from "./shippingMethod";
import orderMethods from "./order";

const methods = {
    store: storeMethods,
    blocked_date: blockedDateMethods,
    rule: ruleMethods,
    region: regionMethods,
    shippingMethod: shippingMethodMethods,
    order: orderMethods
}

export default methods