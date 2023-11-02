export interface IParsedPostcode {
    outcode: string
    area: string
    district: string
    incode: string
    sector: string
    unit: string
    postcode: string
}

const PostcodeParser = {
    parse: (postcode: string): IParsedPostcode => {
        const parsed = postcode.toUpperCase().split(/^(([A-Z][A-Z]{0,1})([0-9][A-Z0-9]{0,1})) {0,}(([0-9])([A-Z]{2}))$/i)

        if (parsed.length <= 1) {
            return null
        }

        return {
            outcode: parsed[1],
            area: parsed[2],
            district: parsed[3],
            incode: parsed[4],
            sector: parsed[5],
            unit: parsed[6],
            postcode: postcode
        }
    }
}

export default PostcodeParser