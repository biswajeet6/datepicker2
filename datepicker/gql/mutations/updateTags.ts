const UPDATE_TAGS = () => {
    return `
        mutation updateTags($orderId: ID!, $addTags: [String!]!, $removeTags: [String!]!) {
            orderTagsAdd: tagsAdd(id: $orderId, tags: $addTags) {
                node {
                    id
                }
                userErrors {
                    field
                    message
                }
            }
            orderTagsRemove: tagsRemove(id: $orderId, tags: $removeTags) {
                node {
                    id
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `
}

export default UPDATE_TAGS