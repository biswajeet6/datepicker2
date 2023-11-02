import CONSTS from './consts'
import populateDb from './helpers/populateDb'
import clearDb from './helpers/clearDb'
import {IRegion, IStoreDocument} from '@/app/types/store'
import PostcodeParser from '@/app/utils/postcodeParser'
import {connectToDatabase} from '@/app/utils/mongo'
import determineRegion from '@/app/utils/aggregator/determineRegion'
import createDefaultRegion from '../helpers/createDefaultRegion'
import methods from '../atlas'

describe('determineRegion', () => {

    let mongo
    let connection
    let db
    let store: IStoreDocument = null
    let defaultRegion: IRegion = null

    beforeAll(async () => {
        mongo = await connectToDatabase()
        connection = mongo.connection
        db = mongo.db
        await populateDb(db)
        store = await db.collection('stores').findOne({_id: CONSTS.STORE_ID})
        defaultRegion = await db.collection('regions').findOne({default: true})
    })

    afterAll(async () => {
        await clearDb(db)
        await mongo.client.close()
    })

    afterEach(async () => {
        await db.collection('regions').deleteMany({
            default: false
        })
    })

    it('should match to a default region', async () => {
        const postcode = 'BS4 4PW'

        const determinedRegion = await determineRegion({
            query: {
                postcode: PostcodeParser.parse(postcode),
                productIds: [],
                storeId: CONSTS.STORE_ID,
            }
        })

        expect(determinedRegion.default).toBe(true)
    })

    it('should match to a region by area code filter', async () => {
        const postcode = 'BS4 4PW'

        const byAreaCode: IRegion = createDefaultRegion(CONSTS.STORE_ID)
        byAreaCode.default = false
        byAreaCode.name = 'byAreaCode'
        byAreaCode.area_filters = ['BS']

        await methods.region.insert(byAreaCode)

        const determinedRegion = await determineRegion({
            query: {
                postcode: PostcodeParser.parse(postcode),
                productIds: [],
                storeId: CONSTS.STORE_ID,
            }
        })

        expect(determinedRegion.name).toBe('byAreaCode')
    })

    it('should match to a region by out code filter', async () => {
        const postcode = 'BS4 4PW'

        const byAreaCode: IRegion = createDefaultRegion(CONSTS.STORE_ID)
        byAreaCode.default = false
        byAreaCode.name = 'byOutCode'
        byAreaCode.outcode_filters = ['BS4']

        await methods.region.insert(byAreaCode)

        const determinedRegion = await determineRegion({
            query: {
                postcode: PostcodeParser.parse(postcode),
                productIds: [],
                storeId: CONSTS.STORE_ID,
            }
        })

        expect(determinedRegion.name).toBe('byOutCode')
    })

    it('should match to a region by sector filter', async () => {
        const postcode = 'BS4 4PW'

        const byAreaCode: IRegion = createDefaultRegion(CONSTS.STORE_ID)
        byAreaCode.default = false
        byAreaCode.name = 'bySector'
        byAreaCode.sector_filters = ['BS44']

        await methods.region.insert(byAreaCode)

        const determinedRegion = await determineRegion({
            query: {
                postcode: PostcodeParser.parse(postcode),
                productIds: [],
                storeId: CONSTS.STORE_ID,
            }
        })

        expect(determinedRegion.name).toBe('bySector')
    })

    it('should match to a region by hierarchy subsets correctly', async () => {

        const postcodes: {
            code: string
            expect: string
        }[] = [
            {
                code: 'BS1 5PW',
                expect: 'byOutCode',
            },
            {
                code: 'BS1 4PW',
                expect: 'bySector',
            },
            {
                code: 'BS11 4PW',
                expect: 'byAreaCode',
            },
            {
                code: 'BS12 4PW',
                expect: 'byPostCode',
            },
        ]

        const byAreaCode: IRegion = createDefaultRegion(CONSTS.STORE_ID)
        byAreaCode.default = false
        byAreaCode.name = 'byAreaCode'
        byAreaCode.area_filters = ['BS']

        const byOutCode: IRegion = createDefaultRegion(CONSTS.STORE_ID)
        byOutCode.default = false
        byOutCode.name = 'byOutCode'
        byOutCode.outcode_filters = ['BS1']

        const bySector: IRegion = createDefaultRegion(CONSTS.STORE_ID)
        bySector.default = false
        bySector.name = 'bySector'
        bySector.sector_filters = ['BS14']

        const byPostCode: IRegion = createDefaultRegion(CONSTS.STORE_ID)
        byPostCode.default = false
        byPostCode.name = 'byPostCode'
        byPostCode.postcode_filters = ['BS124PW']

        await methods.region.insert(byAreaCode)
        await methods.region.insert(byOutCode)
        await methods.region.insert(bySector)
        await methods.region.insert(byPostCode)

        for (const postcode of postcodes) {
            const determinedRegion = await determineRegion({
                query: {
                    postcode: PostcodeParser.parse(postcode.code),
                    productIds: [],
                    storeId: CONSTS.STORE_ID,
                }
            })
            expect(determinedRegion.name).toBe(postcode.expect)
        }
    })
})