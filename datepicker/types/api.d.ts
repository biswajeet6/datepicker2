import {NextApiRequest} from 'next'
import {IStoreDocument} from '@/app/types/store'

interface INextApiRequest extends NextApiRequest {
    store: IStoreDocument | null
}