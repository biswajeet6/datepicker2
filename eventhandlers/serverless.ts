import type {AWS} from '@serverless/typescript'

import orderCreate from '@functions/orderCreate'
import orderUpdated from '@functions/orderUpdated'
import orderCancelled from '@functions/orderCancelled'
import orderDelete from '@functions/orderDelete'

const serverlessConfiguration: AWS = {
	service: `ds-event-handlers-${process.env.STAGE}`,
	frameworkVersion: '2',
	useDotenv: true,
	custom: {
		webpack: {
			webpackConfig: './webpack.config.js',
			includeModules: true,
		},
	},
	plugins: ['serverless-webpack'],
	provider: {
		region: 'eu-west-2',
		name: 'aws',
		runtime: 'nodejs14.x',
		memorySize: 256,
		apiGateway: {
			minimumCompressionSize: 1024,
			shouldStartNameWithService: true,
		},
		environment: {
			AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
			MONGO_DB_CONNECTION_STRING: process.env.MONGO_DB_CONNECTION_STRING
		},
		lambdaHashingVersion: '20201221',
		stage: 'dev',
	},
	// import the function via paths
	functions: {orderCreate, orderUpdated, orderCancelled, orderDelete},
};

module.exports = serverlessConfiguration;
