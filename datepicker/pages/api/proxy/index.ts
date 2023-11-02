import withApp from '@/app/middleware/withApp'
import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {
    return res.json({
        message: 'success'
    })
}

export default withApp(handle)