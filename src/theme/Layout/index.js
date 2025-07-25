// src/theme/Layout/index.js

import React from 'react';
import Layout from '@theme-original/Layout';
import { useReadingProgress } from '../../hooks/useReadingProgress'; // 确保路径正确

// 在 JS 版本中，我们移除了所有的 TypeScript 类型定义
export default function LayoutWrapper(props) {
    const progress = useReadingProgress();

    return (
        <>
            {/* 阅读进度条 */}
            <div
                style={{
                    height: '3px',
                    backgroundColor: 'var(--ifm-color-primary)',
                    width: `${progress}%`,
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    zIndex: 9999,
                    transition: 'width 0.1s ease-out', // 让过渡更平滑
                }}
            />
            {/* 渲染原始的 Layout 组件，并把所有 props 传递给它 */}
            <Layout {...props}>{props.children}</Layout>
        </>
    );
}