interface IConsts {
    MONGO_DB_URL: string
    MONGO_DB_NAME: string
    STORE_ID: string
    APP_TIMEZONE: string
}

const CONSTS: IConsts = {
    MONGO_DB_URL: 'mongodb+srv://staging:FXebnUpsTeqX6ZMc@dev.2x9fg.mongodb.net/date-picker-test?retryWrites=true&w=majority',
    MONGO_DB_NAME: 'date-picker-test',
    STORE_ID: 'test-store.myshopify.com',
    APP_TIMEZONE: 'Europe/London',
}

export default CONSTS