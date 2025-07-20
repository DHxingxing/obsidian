// src/pages/index.js

import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';

// 步骤 1: 将核心内容封装成一个独立的 Header 组件
function HomepageHeader() {
    const {siteConfig} = useDocusaurusContext();
    return (
        // 使用 heroBanner 类来创建一个居中的容器，并添加了入场动画类
        <header className={`${styles.heroBanner} ${styles.fadeInUp}`}>
            <div className="container">
                {/* 步骤 2: 添加 H1 主标题 */}
                <h1 className="hero__title">{siteConfig.title}</h1>
                {/* 步骤 3: 添加 P 标签副标题 */}
                <p className="hero__subtitle">{siteConfig.tagline}</p>

                {/* 将按钮和引言放在一个容器里 */}
                <div className={styles.buttons}>
                    <Link
                        className="button button--primary button--lg"
                        to="/docs/intro">
                        Let's go
                    </Link>
                </div>

                <div className={`${styles.quote} ${styles.delayFadeIn}`}>
                    “Talk is cheap. Show me the code.”
                </div>
            </div>
        </header>
    );
}


export default function Home() {
    const {siteConfig} = useDocusaurusContext();
    return (
        <Layout
            title={`${siteConfig.title} - ${siteConfig.tagline}`} // 优化浏览器标签页标题
            description={siteConfig.tagline}
        >
            {/* 背景图容器保持不变 */}
            <div className={styles.homePageBg}></div>

            {/* 直接调用我们新创建的 Header 组件 */}
            <HomepageHeader />

        </Layout>
    );
}