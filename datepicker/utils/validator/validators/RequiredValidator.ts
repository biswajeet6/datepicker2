import Validator from '@/app/utils/validator/Validator'

class RequiredValidator extends Validator {
    constructor() {
        super()
    }

    validate(value: any) {

        if (
            typeof value === 'undefined' ||
            value === '' ||
            value === null
        ) {
            return 'Field is required'
        }

        return true
    }
}

export default RequiredValidator