# Background


This folder contains order events that can be passed to the serverless CLI see package.json for CLI Commands

    "scripts": {
	    "test": "",
		"serverless:deploy": "serverless deploy",
		"serverless:invoke:orders:create:default": "serverless invoke local -f orderCreate -p events/orders/create.default.json",
		"serverless:invoke:orders:updated:default": "serverless invoke local -f orderUpdated -p events/orders/updated.default.json"
	},

