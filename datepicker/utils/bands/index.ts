import {IBandCost, IBandRequirement, IBandRequirementCondition} from '@/app/types/store'

const ShippingBandRequirements: IBandRequirement[] = [
    {
        key: 'cartCost',
        label: 'Cart Cost',
        defaultCondition: 'between',
        conditionConnector: 'is',
        conditionUnitType: 'pence',
        inputConnector: null,
        conditions: [
            {
                key: 'between',
                label: 'Between',
                inputType: 'RangeInput',
                default: {
                    min: 0,
                    max: 0,
                },
            },
            {
                key: 'greaterThan',
                label: 'Greater Than',
                inputType: 'NumericValueInput',
                default: 0,
            },
            {
                key: 'lessThan',
                label: 'Less Than',
                inputType: 'NumericValueInput',
                default: 0,
            }
        ]
    },
    {
        key: 'cartDateRange',
        label: 'Cart Date',
        defaultCondition: 'between',
        conditionConnector: 'is',
        conditionUnitType: null,
        inputConnector: null,
        conditions: [
            {
                key: 'between',
                label: 'between',
                inputType: 'DateRangeValue',
                default: [],
            },
        ]
    },
    {
        key: 'cartItems',
        label: 'Cart Items',
        defaultCondition: 'hasAny',
        conditionConnector: null,
        conditionUnitType: null,
        inputConnector: 'of',
        conditions: [
            {
                key: 'hasAny',
                label: 'Has Any',
                inputType: 'ProductSelectInput',
                default: [],
            },
            {
                key: 'hasNone',
                label: 'Has None',
                inputType: 'ProductSelectInput',
                default: [],
            },
        ]
    },
    {
        key: 'cartWeight',
        label: 'Cart Weight',
        defaultCondition: 'between',
        conditionConnector: 'is',
        conditionUnitType: 'grams',
        inputConnector: null,
        conditions: [
            {
                key: 'between',
                label: 'Between',
                inputType: 'RangeInput',
                default: {
                    min: 0,
                    max: 0,
                },
            },
            {
                key: 'greaterThan',
                label: 'Greater Than',
                inputType: 'NumericValueInput',
                default: 0,
            },
            {
                key: 'lessThan',
                label: 'Less Than',
                inputType: 'NumericValueInput',
                default: 0,
            }
        ]
    },
]

export const getShippingBandRequirementByKey = (key: string): IBandRequirement => {
    return ShippingBandRequirements.find(requirement => requirement.key === key)
}

export const getShippingBandRequirementConditionByKey = (requirementKey: string, conditionKey: string): IBandRequirementCondition => {
    const requirement = ShippingBandRequirements.find(requirement => requirement.key === requirementKey)

    return requirement.conditions.find(condition => condition.key === conditionKey)
}

export const ShippingBandCosts: IBandCost[] = [
    {
        type: 'fixedCost',
        label: 'Fixed Cost',
        default: 0,
        unitType: 'pence',
    },
]

export const getShippingBandCostByType = (type: string) => {
    return ShippingBandCosts.find(cost => cost.type === type)
}

export default ShippingBandRequirements