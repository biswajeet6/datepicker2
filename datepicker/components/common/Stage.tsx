import React from 'react'
import Head from 'next/head'
import Navigation from '@/app/components/common/Navigation'

const Stage: React.FC = ({children}) => {
    return (
        <React.Fragment>
            <div className="Header">
                <Navigation/>
                <style jsx>{`
				.Header {
            		position: fixed;
            		top: 0;
            		background-color: #F9FAFB;
            		z-index: 99;
            		width: 100%;
          		}`}</style>
            </div>
            <main className="mainWrapper">
                <Head>
                    <title>Date Picker</title>
                    <link rel="icon" href="/static/favicon.ico"/>
                </Head>
                {children}
                <style jsx>{`
					.mainWrapper {
						padding-top: 60px;
					}`}</style>
            </main>
        </React.Fragment>
    )
}

export default Stage