// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '不百科',
  tagline: '他山之石，可以攻玉',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://DHxingxing.github.io',
  baseUrl: '/obsidian/',  // ← 结尾必须带 `/`
  organizationName: 'DHxingxing',
  projectName: 'obsidian',  // 修改为 obsidian，与你的仓库名一致
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'zh-Hans',  // 改回中文
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/DHxingxing/obsidian/edit/main/',  // 修改为你的仓库
        },
        blog: {
          showReadingTime: true,
          blogSidebarCount: 5,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/DHxingxing/obsidian/edit/main/',  // 修改为你的仓库
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  plugins: [
    '@docusaurus/theme-mermaid',  // 添加回 mermaid 支持
    '@docusaurus/theme-live-codeblock'
  ],

  themeConfig:
  /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
      ({
        image: 'img/docusaurus-social-card.jpg',
        navbar: {
          title: '不百科',  // 使用你的网站标题
          logo: {
            alt: 'logo',
            src: 'img/logo.svg',
          },
          items: [
            {
              type: 'docSidebar',
              sidebarId: 'tutorialSidebar',
              position: 'left',
              label: '文档',  // 改为中文
            },
            {to: '/blog', label: '博客', position: 'left'},  // 改为中文
            {
              href: 'https://github.com/DHxingxing/obsidian',  // 修改为你的仓库
              label: 'GitHub',
              position: 'right',
            },
          ],
        },
        footer: {
          style: 'dark',
          links: [
            {
              title: '文档',  // 改为中文
              items: [{label: '快速开始', to: '/docs/intro'}],
            },
            {
              title: '社区',  // 改为中文
              items: [
                {
                  label: 'Discord',
                  href: 'https://discord.gg/docusaurus',
                },
                {
                  label: 'Twitter',
                  href: 'https://twitter.com/docusaurus',
                },
              ],
            },
            {
              title: '更多',  // 改为中文
              items: [
                {label: '博客', to: '/blog'},
                {label: 'GitHub', href: 'https://github.com/DHxingxing/obsidian'},  // 修改为你的仓库
              ],
            },
          ],
          copyright: `Copyright © ${new Date().getFullYear()} DHxingxing. Built with Docusaurus.`,  // 修改版权信息
        },
        prism: {
          theme: prismThemes.github,
          darkTheme: prismThemes.dracula,
        },
        liveCodeBlock: {
          playgroundPosition: 'bottom', // 💡 这是你想要的 live playground 设置
        },
      }),

  // 添加 mermaid 配置
  mermaid: {
    theme: { light: 'default', dark: 'dark' },
  },
};

export default config;