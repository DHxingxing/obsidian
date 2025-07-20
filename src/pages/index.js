import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
// 确保导入了 CSS Module
import styles from './index.module.css';

export default function Home() {
    const {siteConfig} = useDocusaurusContext();

    return (
        <Layout
            title={siteConfig.title}
            description={siteConfig.tagline}
        >
            {/* 1. 这是我们的背景图容器 */}
            <div className={styles.homePageBg}></div>

            {/* 2. 我们将所有页面内容包裹在一个容器中，方便居中和管理 */}
            <div className={styles.homePageContent}>
                {/* 中心按钮 */}
                <div style={{textAlign: 'center', marginBottom: '2rem'}}>
                    <Link
                        className="button button--primary button--lg"
                        to="/docs/intro"
                    >
                        Let's go
                    </Link>
                </div>

                {/* 介绍文字 */}
                <div className={styles.quote}>
                    “Talk is cheap. Show me the code.”
                </div>
            </div>
        </Layout>
    );
}