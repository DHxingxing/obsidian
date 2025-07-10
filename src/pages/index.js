import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function Home() {
    const {siteConfig} = useDocusaurusContext();

    return (
        <Layout
            title={siteConfig.title}
            description={siteConfig.tagline}
        >
            {/* 顶部横幅 */}
            <div
                style={{
                    width: '100%',
                    height: '320px',
                    backgroundImage: `url(${useBaseUrl('src/static/img/wallhaven-xe5eel.png')})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />

            {/* 中心按钮 */}
            <div style={{textAlign: 'center', marginTop: '2rem'}}>
                <Link
                    className="button button--primary button--lg"
                    to="/docs/intro"
                >
                    Let's go
                </Link>
            </div>

            {/* 介绍文字 */}
            <div style={{textAlign:'center', marginTop:'2rem', fontStyle:'italic', fontSize:'1.5rem'}}>
                “Talk is cheap. Show me the code.”
            </div>
        </Layout>
    );
}
