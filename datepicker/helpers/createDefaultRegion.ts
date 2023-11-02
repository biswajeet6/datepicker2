import {IRegion} from '@/app/types/store'

const createDefaultRegion = (storeId: string): IRegion => {
    return {
        name: 'United Kingdom',
        store_id: storeId,
        default: true,
        postcode_filters: [],
        sector_filters: [],
        area_filters: [],
        outcode_filters: [],
        apply_tags: [],
        apply_attributes: [],
        archived: false
    }
}

export default createDefaultRegion