import {Button} from '@shopify/polaris'
import React from 'react'
import {useRouter} from 'next/router'

const BackButton: React.FC<{
    path: string,
}> = ({path}): JSX.Element => {

    const router = useRouter()

    return (
        <React.Fragment>
            <Button onClick={() => router.replace(path)}>Back</Button>
        </React.Fragment>
    )
}

export default BackButton