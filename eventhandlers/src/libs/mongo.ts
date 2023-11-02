'use strict'

import {MongoClient} from 'mongodb'

let cachedInstance = null

/**
 * This file serves to provide a "cached" version of a connection pool to mongo. Meaning we don't have to create a new connection every time we hit a cold start (increases response time by ~400MS).
 * Instead, if we're warm then use the cached instance.
 * This methodology means we do not have to manually close the connection at the end of every call - however, there's a fair amount of reading on this with on real definitive answer on the best approach.
 * At the time i could not fully dive into the best approach for our use case.
 * With some basic load testing in Shopify (archiving & un-archiving orders in bulk to hit the orders/update lambda) and using the "best practice (@see below)" approach with connection & concurrency defaults we did not at the time appear to hit any limits.
 *
 * We only need to care about this if we start hitting mongo connection limits.
 *
 * @todo depending on load per client we might start hitting some connection limits in Mongo. If this starts happening, before upgrading the instance we should do some investigation into mongo pool sizes and aws lambda concurrency limits.
 * @todo It may be possible to balance the two for throughput / cost effectiveness.
 * @todo But before you start investigating that, it would be worth testing how long it actually takes to create and close the mongo connection per execution ...
 * 		 if traffic isn't that high, it might prove that the difference in ££ cost is so negligible that we don't care. and opt for that approach anyway...
 * 		 At the time of writing:
 * 		 Cold start: ~500 MS to respond on the orders/update event
 * 		 Warm start: ~50 MS to respond on the orders/update event
 *
 * @see https://www.mongodb.com/blog/post/optimizing-aws-lambda-performance-with-mongodb-atlas-and-nodejs
 */
const mongo = {
	db: async (uri) => {
		if (cachedInstance && cachedInstance.serverConfig && cachedInstance.serverConfig.isConnected()) {
			console.log('=> using cached client instance')

			return Promise.resolve(cachedInstance)
		}

		return MongoClient.connect(uri, {
			useUnifiedTopology: true,
		}).then(client => {
			console.log('=> creating new client instance')
			cachedInstance = client.db()
			return cachedInstance
		})
	}
}

export default mongo

// // @see https://www.mongodb.com/blog/post/optimizing-aws-lambda-performance-with-mongodb-atlas-and-nodejs
// // @todo this is old handling which would be copied into each handler.ts file per function call. This handling has been replicated in libs/mongo.ts
//
// let db = null
//
// function getDatabase (uri) {
// 	if (db && db.serverConfig && db.serverConfig.isConnected()) {
// 		console.log('=> using cached client instance')
// 		return Promise.resolve(db)
// 	}
//
// 	return MongoClient.connect(uri, {
// 		useUnifiedTopology: true
// 	}).then(client => {
// 		console.log('=> creating new client instance')
// 		db = client.db()
// 		return db
// 	})
// }
