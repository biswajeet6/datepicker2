import {IParams} from '@/app/utils/aggregator/types'
import {IRegion} from '@/app/types/store'
import methods from '../../atlas'

const determineRegion = async (params: IParams): Promise<IRegion> => {
    const matchingRegions = await methods.region.getByPostcode(
        params.query.storeId,
        params.query.postcode.postcode,
        params.query.postcode.area,
        params.query.postcode.outcode,
        params.query.postcode.sector
    )

    // return first region if we only have 1
    if (matchingRegions.length === 1) return matchingRegions[0]

    // determine most accurate matched region (@todo might be able to do this in the initial mongo query)
    let matchedRegion
    matchingRegions.forEach((matchingRegion: IRegion) => {
        if (matchingRegion.postcode_filters.includes(params.query.postcode.postcode.split(' ').join(''))) {
            matchedRegion = matchingRegion
        }
    })
    if (!matchedRegion) {
        matchingRegions.forEach((matchingRegion: IRegion) => {
            if (matchingRegion.sector_filters.includes(`${params.query.postcode.outcode}${params.query.postcode.sector}`)) {
                matchedRegion = matchingRegion
            }
        })
    }
    if (!matchedRegion) {
        matchingRegions.forEach((matchingRegion: IRegion) => {
            if (matchingRegion.outcode_filters.includes(params.query.postcode.outcode)) {
                matchedRegion = matchingRegion
            }
        })
    }
    if (!matchedRegion) {
        matchingRegions.forEach((matchingRegion: IRegion) => {
            if (matchingRegion.area_filters.includes(params.query.postcode.area)) {
                matchedRegion = matchingRegion
            }
        })
    }

    // in theory we should never get here, if we do then something is seriously wrong
    // return the default so things are handled nicely for the aggregation
    // @todo setup alert for these errors
    if (!matchedRegion) {
        console.error(`=> CRITICAL: failed to determine matching region for postcode "${params.query.postcode.postcode}"`)
        return await methods.region.getStoreDefault(params.query.storeId)
    }

    return matchedRegion
}

export default determineRegion