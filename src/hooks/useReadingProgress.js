// src/hooks/useReadingProgress.js
import { useState, useEffect } from 'react';

export const useReadingProgress = () => {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const updateScroll = () => {
            const el = document.documentElement;
            const scrollTotal = el.scrollHeight - el.clientHeight;
            // 避免除以0的情况
            if (scrollTotal > 0) {
                setProgress((el.scrollTop / scrollTotal) * 100);
            }
        };
        // 监听滚动事件
        window.addEventListener('scroll', updateScroll);
        // 组件卸载时移除监听
        return () => window.removeEventListener('scroll', updateScroll);
    }); // 注意：这里的依赖项为空数组，意味着只在组件挂载和卸载时运行
    return progress;
};