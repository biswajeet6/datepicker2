import {FooterHelp, Link} from '@shopify/polaris'
import React from 'react'

interface IProps {
    url: string
    label: string
}

const LearnMoreFooter: React.FC<IProps> = ({url, label, children}): JSX.Element => {

    const handleClick = () => {
        window.open(url)
    }

    return (
        <React.Fragment>
            <FooterHelp>Learn more about <Link onClick={handleClick}>{label}</Link></FooterHelp>
        </React.Fragment>
    )
}

export default LearnMoreFooter