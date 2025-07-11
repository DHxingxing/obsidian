import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import './index.module.css'

export default function Home() {
    const {siteConfig} = useDocusaurusContext();

    return (
        <Layout
            title={siteConfig.title}
            description={siteConfig.tagline}
        >
           <div className="homePage=bg"> </div>

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
