import {NextApiResponse} from 'next'
import {flushLogs} from '@/app/utils/logger'

const ApiResponse = (res: NextApiResponse) => ({
    async send(content: any, status: number = 200) {

        // perform any cleanup required before returning a response
        try {
            await flushLogs()
        } catch (e) {
            console.error('failed to flush logs')
            console.error(e)
        }

        res.status(status)

        return res.json(content)
    }
})

export default ApiResponse