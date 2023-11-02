import React from 'react'
import {Link} from '@shopify/polaris'

interface IProps {
    description: string
    link?: {
        url: string
        label?: string | null
    } | null
}

const LayoutSectionDescription: React.FC<IProps> = ({description, link = null, children}): JSX.Element => {

    const handleClick = () => {
        window.open(link.url)
    }

    return (
        <React.Fragment>
            {description} {link && <React.Fragment>
            <Link external={true} onClick={handleClick}>{link.label ?? 'Learn more'}</Link>
        </React.Fragment>}
        </React.Fragment>
    )
}

export default LayoutSectionDescription