import winston from 'winston'
import WinstonCloudWatch from 'winston-cloudwatch'

// @ts-ignore
let Logger: Logger = global.Logger

if (!Logger) {

    Logger = winston.createLogger({
        format: winston.format.combine(
            winston.format.errors({stack: true}),
            winston.format.metadata(),
            winston.format.json(),
        ),
        transports: [
            new winston.transports.Console(),
        ]
    })

    if (process.env.NODE_ENV !== 'test') {
        Logger.add(new WinstonCloudWatch({
            logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME ?? 'default',
            logStreamName: `${(new Date()).toISOString().split('T')[0]}-${(new Date()).getTime()}`,
            awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
            awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
            awsRegion: 'eu-west-1',
            jsonMessage: true,
        }))
    }

    // @ts-ignore
    global.Logger = Logger
}

/**
 * Wait for the kthxbye method to be invoked by the WinstonCloudWatch transport (assuming it exists)
 * If we exceed the given timeout then we will reject so program execution can continue
 *
 * @param timeout
 */
export const flushLogs = (timeout: number = 1000) => {

    let timeoutHandle: NodeJS.Timeout

    const timeoutPromise = new Promise((resolve, reject) => {
        timeoutHandle = setTimeout(() => reject('timeout exceeded'), timeout)
    })

    return Promise.race([
        new Promise((resolve, reject) => {

            if (process.env.NODE_ENV === 'test') {
                resolve('in test')
                return
            }

            const transport = Logger.transports.find((t) => {
                return typeof t.kthxbye !== 'undefined'
            })

            if (!transport) {
                resolve('transport does not exist')
                return
            }

            transport.kthxbye(() => {
                resolve('kthxbye')
            })
        }),
        timeoutPromise
    ]).then((result) => {
        clearTimeout(timeoutHandle)
        return result
    })
}

export default Logger