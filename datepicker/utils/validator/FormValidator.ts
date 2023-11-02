import Validator from '@/app/utils/validator/Validator'

class FormValidator {
    fields: {
        [key: string]: {
            value: any
            message: string
            valid: boolean
        }
    }

    constructor() {
        this.fields = {}
    }

    fieldExists(key) {
        return this.fields.hasOwnProperty(key)
    }

    runValidator(value: any, validator: string) {

        const validatorKey = validator.split(':')[0]
        const validatorValue = validator.split(':')[1]

        try {
            switch (validatorKey) {
                case 'numeric':
                    return typeof value === 'number'
                case 'gte':
                    return value >= validatorValue
                case 'gt':
                    return value > validatorValue
                case 'lt':
                    return value < validatorValue
                case 'lte':
                    return value <= validatorValue
                case 'eq':
                    return value == validatorValue
                case 'strict_eq':
                    return value === validatorValue
                default:
                    false
            }
        } catch (e) {
            console.error(e)
            return false
        }
    }

    validate(key: string, value: any, validators: Validator[]) {

        if (!this.fieldExists(key)) {
            this.fields[key] = {
                value: value,
                message: null,
                valid: false,
            }
        }

        for (let validator of validators) {
            let result = validator.validate(value)

            if (result !== true) {
                this.fields[key].valid = false
                this.fields[key].message = result
                return this.fields[key].message
            } else {
                this.fields[key].valid = true
            }
        }

        return null
    }

    allValid() {
        for (let key of Object.keys(this.fields)) {
            if (!this.fields[key].valid) return false
        }
        return true
    }
}

export default FormValidator