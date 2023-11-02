import {MongoClient} from 'mongodb'

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
// @ts-ignore
let cached = global.mongo

if (!cached) {
    // @ts-ignore
    cached = global.mongo = {connection: null, promise: null}
}

export async function connectToDatabase() {
    if (cached.connection) {
        return cached.connection
    }

    if (!cached.promise) {
        const opts = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }

        cached.promise = MongoClient.connect(process.env.MONGO_DB_CONNECTION_STRING, opts).then((client) => {
            return {
                client,
                db: client.db(),
            }
        })
    }

    cached.connection = await cached.promise
    return cached.connection
}
