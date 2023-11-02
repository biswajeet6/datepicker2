class RealmApiError extends Error {
    statusCode: number
    retry: boolean

    constructor(message: string, statusCode: number = 500, retry: boolean = false) {
        super(message)
        this.statusCode = statusCode
        this.retry = retry
        Error.captureStackTrace(this, RealmApiError)
    }
}

export default RealmApiError