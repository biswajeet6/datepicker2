const {exec} = require('child_process')

if (!process.env.STAGE) {
	throw 'STAGE env missing'
}

const args = process.argv.slice(2)

if (
	args.length === 0 ||
	!['local', 'aws'].includes(args[0])
) {
	throw 'Sync destination missing. Use "local" to sync from AWS to Local or "aws" to sync from Local to AWS'
}

const command = args[0] === 'local' ? `aws s3 sync s3://date-selector-event-handlers-distribution-templates/${process.env.STAGE} .serverless --delete` : `aws s3 sync .serverless s3://date-selector-event-handlers-distribution-templates/${process.env.STAGE} --delete`

exec(command, (error, stdout, stderr) => {
	if (error) {
		console.error(error)
		throw 'Failed to sync AWS bucket'
	}

	if (stderr) {
		console.error(stderr)
		throw 'Failed to sync AWS bucket'
	}

	console.log(stdout)
})