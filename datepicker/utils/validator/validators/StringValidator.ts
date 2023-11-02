import Validator from '@/app/utils/validator/Validator'

class StringValidator extends Validator {
    constructor() {
        super()
    }

    validate(value: any) {

        if (value === '' || value === null) return true

        if (typeof value !== 'string') {
            return 'Field must be a string'
        }

        return true
    }
}

export default StringValidator