import React from "react";
import {IShippingMethodDispatchDay} from "@/app/types/store";
import {Checkbox, Select, Stack} from "@shopify/polaris";

const DispatchDay: React.FC<{
    dispatchDay: IShippingMethodDispatchDay,
    onChangeCallback: any
}> = ({dispatchDay, onChangeCallback}): JSX.Element => {
    return (
        <React.Fragment>
            <Stack vertical={true} spacing={'extraTight'}>
                <Stack.Item>
                    <Checkbox
                        id={`${dispatchDay.key}.enabled`}
                        label={dispatchDay.label}
                        checked={dispatchDay.enabled}
                        onChange={onChangeCallback}
                    />
                </Stack.Item>
                {dispatchDay.enabled && <React.Fragment>
                    <Stack.Item>
                        <div className={'SelectField-Small'}>
                            <Select
                                id={`${dispatchDay.key}.cutoff`}
                                label={'Cutoff time'}
                                onChange={onChangeCallback}
                                value={dispatchDay.cutoff}
                                options={['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'].map((time) => {
                                    return {
                                        label: time,
                                        value: time
                                    }
                                })}
                            />
                        </div>
                    </Stack.Item>
                </React.Fragment>}
            </Stack>
        </React.Fragment>
    )
}

export default DispatchDay