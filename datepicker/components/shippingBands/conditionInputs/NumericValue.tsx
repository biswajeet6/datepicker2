import {Stack, TextField } from '@shopify/polaris'
import React, {useCallback} from 'react'

const NumericValueInput: React.FC<{
    value: number
    unit: string
    callback(value: number)
}> = ({ value, callback, unit }): JSX.Element => {

    const handleChange = useCallback((newValue) => {
        callback(parseInt(newValue))
    }, [value])

    return (
        <React.Fragment>
            <Stack>
                <Stack.Item>
                    <TextField
                        label={null}
                        value={value.toString()}
                        type={'number'}
                        onChange={handleChange}
                        suffix={unit}
                    />
                </Stack.Item>
            </Stack>
        </React.Fragment>
    )
}

export default NumericValueInput