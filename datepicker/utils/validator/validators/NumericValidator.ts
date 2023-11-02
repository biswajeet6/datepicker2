import Validator from '@/app/utils/validator/Validator'

interface IOptions {
    type: 'eq' | 'gte' | 'gt' | 'lt' | 'lte'
    value: number
}

[]

class NumericValidator extends Validator {
    options: IOptions[] | null

    constructor(options: IOptions[] = []) {
        super()
        this.options = options
    }

    validate(value: any) {

        if (!isNaN(value)) false

        for (let option of this.options) {
            switch (option.type) {
                case 'eq':
                    if (value !== option.value) return `Value should be ${option.value}`
                    break;
                case 'gt':
                    if (!(value > option.value)) return `Value should be greater than ${option.value}`
                    break;
                case 'gte':
                    if (!(value >= option.value)) return `Value should be greater than or equal to ${option.value}`
                    break;
                case 'lt':
                    if (!(value < option.value)) return `Value should be less than ${option.value}`
                    break;
                case 'lte':
                    if (!(value <= option.value)) return `Value should be less than or equal to ${option.value}`
                    break;
                default:
                    throw new Error(`Invalid option ${JSON.stringify(option)}`)
            }
        }

        return true
    }
}

export default NumericValidator