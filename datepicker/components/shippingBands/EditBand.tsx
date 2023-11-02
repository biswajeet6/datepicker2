import React, {useCallback} from 'react'
import {IShippingMethodBand} from '@/app/types/store'
import {Card, Select, Stack, TextField, TextStyle} from '@shopify/polaris'
import ShippingBandRequirements, {
    getShippingBandCostByType,
    getShippingBandRequirementByKey,
    getShippingBandRequirementConditionByKey,
    ShippingBandCosts
} from '@/app/utils/bands'
import NumericValueInput from '@/app/components/shippingBands/conditionInputs/NumericValue'
import RangeValue from '@/app/components/shippingBands/conditionInputs/RangeValue'
import ProductSelectInput from '@/app/components/shippingBands/conditionInputs/ProductSelectInput'
import DateRangeValue from '@/app/components/shippingBands/conditionInputs/DateRangeValue'

const EditBand: React.FC<{
    band: IShippingMethodBand
    index: number
    callback(band: IShippingMethodBand, index: number)
}> = ({band, index, callback}): JSX.Element => {

    const handleChangeCostType = useCallback((value) => {
        band.cost.type = value
        band.cost.value = getShippingBandCostByType(band.cost.type).default
        callback(band, index)
    }, [band])

    const handleChangeCostValue = useCallback((value) => {
        band.cost.value = parseInt(value)
        callback(band, index)
    }, [band])

    const handleChangeName = useCallback((value) => {
        band.name = value
        callback(band, index)
    }, [band])

    const handleChangeRequirementType = useCallback((type) => {
        band.requirement.type = type
        band.requirement.condition = getShippingBandRequirementByKey(type).defaultCondition
        band.requirement.value = getShippingBandRequirementConditionByKey(band.requirement.type, band.requirement.condition).default
        callback(band, index)
    }, [band])

    const handleChangeRequirementCondition = useCallback((condition) => {
        band.requirement.condition = condition
        band.requirement.value = getShippingBandRequirementConditionByKey(band.requirement.type, band.requirement.condition).default
        callback(band, index)
    }, [band])

    const handleChangeRequirementValue = useCallback((value) => {
        band.requirement.value = value
        callback(band, index)
    }, [band])

    const renderRequirementConditionInput = (): JSX.Element => {

        const condition = getShippingBandRequirementByKey(band.requirement.type).conditions.find(condition => condition.key === band.requirement.condition)

        switch (condition.inputType) {
            case 'NumericValueInput':
                return (
                    <React.Fragment>
                        <NumericValueInput
                            unit={getShippingBandRequirementByKey(band.requirement.type).conditionUnitType}
                            value={band.requirement.value}
                            callback={handleChangeRequirementValue}
                        />
                    </React.Fragment>
                )
            case 'RangeInput':
                return (
                    <React.Fragment>
                        <RangeValue
                            unit={getShippingBandRequirementByKey(band.requirement.type).conditionUnitType}
                            value={band.requirement.value}
                            callback={handleChangeRequirementValue}
                        />
                    </React.Fragment>
                )
            case 'ProductSelectInput':
                return (
                    <React.Fragment>
                        <ProductSelectInput
                            value={band.requirement.value}
                            callback={handleChangeRequirementValue}
                        />
                    </React.Fragment>
                )
            case 'DateRangeValue':
                return (
                    <React.Fragment>
                        <DateRangeValue
                            value={band.requirement.value}
                            callback={handleChangeRequirementValue}
                        />
                    </React.Fragment>
                )
        }

        return (
            <React.Fragment>
                <TextStyle variation={'negative'}>
                    <TextStyle variation={'strong'}>Input type "{condition.inputType}" does not exist.</TextStyle>
                </TextStyle>
            </React.Fragment>
        )
    }

    const renderRequirement = () => {
        return (
            <React.Fragment>
                <Stack alignment={'center'}>
                    <Stack.Item>If</Stack.Item>
                    <Stack.Item>
                        <Select
                            label={null}
                            value={band.requirement.type}
                            options={ShippingBandRequirements.map(requirement => {
                                return {
                                    label: requirement.label,
                                    value: requirement.key,
                                }
                            })}
                            onChange={handleChangeRequirementType}
                        />
                    </Stack.Item>
                    {getShippingBandRequirementByKey(band.requirement.type).conditionConnector && <React.Fragment>
                        <Stack.Item>
                            {getShippingBandRequirementByKey(band.requirement.type).conditionConnector}
                        </Stack.Item>
                    </React.Fragment>}
                    <Stack.Item>
                        <Select
                            label={null}
                            value={band.requirement.condition}
                            options={getShippingBandRequirementByKey(band.requirement.type).conditions.map(condition => {
                                return {
                                    label: condition.label,
                                    value: condition.key,
                                }
                            })}
                            onChange={handleChangeRequirementCondition}
                        />
                    </Stack.Item>
                    {getShippingBandRequirementByKey(band.requirement.type).inputConnector && <React.Fragment>
                        <Stack.Item>
                            {getShippingBandRequirementByKey(band.requirement.type).inputConnector}
                        </Stack.Item>
                    </React.Fragment>}
                    <Stack.Item>
                        {renderRequirementConditionInput()}
                    </Stack.Item>
                </Stack>
            </React.Fragment>
        )
    }

    return (
        <React.Fragment>
            <Stack alignment={'center'}>
                <Stack.Item>
                    <Card.Section flush>
                        <Stack vertical={true}>
                            <div style={{ width: '98%' }}>
                                <Stack.Item>
                                    <TextField
                                        label={null}
                                        value={band.name}
                                        onChange={handleChangeName}
                                    />
                                </Stack.Item>
                            </div>  
                            <Stack.Item>
                                {renderRequirement()}
                            </Stack.Item>
                            <Stack.Item fill={true}>
                                <Stack alignment={'center'}>
                                    <Stack.Item>
                                        <TextStyle>Then apply a</TextStyle>
                                    </Stack.Item>
                                    <Stack.Item>
                                        <Select
                                            label={null}
                                            value={band.cost.type}
                                            options={ShippingBandCosts.map((cost) => {
                                                return {
                                                    label: cost.label,
                                                    value: cost.type,
                                                }
                                            })}
                                            onChange={handleChangeCostType}
                                        />
                                    </Stack.Item>
                                    <Stack.Item>
                                        <TextStyle>of</TextStyle>
                                    </Stack.Item>
                                    <Stack.Item>
                                        <TextField
                                            label={null}
                                            value={band.cost.value.toString()}
                                            type={'number'}
                                            onChange={handleChangeCostValue}
                                            suffix={getShippingBandCostByType(band.cost.type).unitType}
                                        />
                                    </Stack.Item>
                                    <Stack.Item>
                                        <TextStyle>to the rate.</TextStyle>
                                    </Stack.Item>
                                </Stack>
                            </Stack.Item>
                        </Stack>
                    </Card.Section>
                </Stack.Item>
            </Stack>
        </React.Fragment>
    )
}

export default EditBand