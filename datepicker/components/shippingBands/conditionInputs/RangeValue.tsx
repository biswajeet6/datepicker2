import {Stack, TextField} from '@shopify/polaris'
import React, {useCallback, useEffect, useState} from 'react'

const RangeValue: React.FC<{
    unit: string
    value: { min: number, max: number }
    callback(value: { min: number, max: number })
}> = ({value, callback, unit}): JSX.Element => {

    const [min, setMin] = useState<number>(null)
    const [max, setMax] = useState<number>(null)

    const handleChange = useCallback((newValue, key) => {
        if (key === 'min') {
            callback({
                min: newValue,
                max: max
            })
        } else if (key === 'max') {
            callback({
                min: min,
                max: newValue
            })
        }
    }, [min, max])

    useEffect(() => {
        setMin(value.min)
        setMax(value.max)
    }, [value, min, max])

    return (
        <React.Fragment>
            {(min !== null && max !== null) && <React.Fragment>
                <Stack alignment={'center'}>
                    <Stack.Item>
                        <div className={'TextField-W-100'}>
                            <TextField
                                id={'min'}
                                label={null}
                                value={min.toString()}
                                type={'number'}
                                onChange={handleChange}
                                suffix={unit}
                            />
                        </div>
                    </Stack.Item>
                    <Stack.Item>and</Stack.Item>
                    <Stack.Item>
                        <div className={'TextField-W-100'}>
                            <TextField
                                id={'max'}
                                label={null}
                                value={max.toString()}
                                type={'number'}
                                onChange={handleChange}
                                suffix={unit}
                            />
                        </div>
                    </Stack.Item>
                </Stack>
            </React.Fragment>}
        </React.Fragment>
    )
}

export default RangeValue