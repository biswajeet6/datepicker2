import {INextApiRequest} from '@/app/types/api'
import {NextApiResponse} from 'next'
import ApiResponse from '@/app/utils/apiResponse'

const handle = async (req: INextApiRequest, res: NextApiResponse) => {
    return ApiResponse(res).send({
        message: 'Invoked',
    })
}

export default handle