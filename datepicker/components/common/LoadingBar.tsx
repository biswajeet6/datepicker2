import React from 'react'

const LoadingBar = () => {

    const accent = '#0191DE'

    const loading = true

    return (
        <div className="LoadingBar">
            {loading ? (
                <span className="Indicator" data-text="loading" style={{backgroundColor: accent}}>Loading</span>) : ''}
            <style jsx>
                {`
          .LoadingBar {
            width: 100%;
            min-width: 100%;
            height: 3px;
            display: flex;
            justify-content: center;
            overflow: hidden;
            position: fixed;
          }
          .Indicator {
            animation: SPAN-SPACE 3s infinite;
            text-indent: -999em;
            display: block;
            border-radius: 2px;
            background-color: ${accent ? accent : '#cccc'};
            background-image: linear-gradient(144deg, '#0191DE', '#00D0BB' 48%, '#BF3FF5');
          }
          @keyframes SPAN-SPACE{
            0%   { width: 0%; }
            75% {width: 100%;}
            100% { width: 0%; }
          }
        `}
            </style>
        </div>
    )
}

export default LoadingBar