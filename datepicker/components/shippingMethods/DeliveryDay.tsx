import React from "react";
import {IShippingMethodDeliveryDay} from "@/app/types/store";
import {Checkbox} from "@shopify/polaris";

const DispatchDay: React.FC<{
    deliveryDay: IShippingMethodDeliveryDay,
    onChangeCallback: any
}> = ({deliveryDay, onChangeCallback}): JSX.Element => {
    return (
        <React.Fragment>
            <Checkbox
                id={`${deliveryDay.key}.enabled`}
                label={deliveryDay.label}
                checked={deliveryDay.enabled}
                onChange={onChangeCallback}
            />
        </React.Fragment>
    )
}

export default DispatchDay