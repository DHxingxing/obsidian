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
  projectName: 'obsidian',  // 修改为 obsidian，与仓库名一致
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'zh-Hans',  // 改为中文
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/DHxingxing/obsidian/edit/main/',
        },
        blog: {
          showReadingTime: true,
          blogSidebarCount: 5,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/DHxingxing/obsidian/edit/main/',
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

  // 插件配置 - live-codeblock 已经正确添加
  plugins: [
    '@docusaurus/theme-live-codeblock',
    '@docusaurus/theme-mermaid',  // 如果需要 mermaid 图表支持
  ],

  themeConfig:
  /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
      ({
        image: 'img/docusaurus-social-card.jpg',
        navbar: {
          title: '不百科',
          logo: {
            alt: 'logo',
            src: 'img/logo.svg',
          },
          items: [
            {
              type: 'docSidebar',
              sidebarId: 'tutorialSidebar',
              position: 'left',
              label: '文档',
            },
            {to: '/blog', label: '博客', position: 'left'},
            {
              href: 'https://github.com/DHxingxing/obsidian',
              label: 'GitHub',
              position: 'right',
            },
          ],
        },
        footer: {
          style: 'dark',
          links: [
            {
              title: '文档',
              items: [{label: '快速开始', to: '/docs/intro'}],
            },
            {
              title: '社区',
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
              title: '更多',
              items: [
                {label: '博客', to: '/blog'},
                {label: 'GitHub', href: 'https://github.com/DHxingxing/obsidian'},
              ],
            },
          ],
          copyright: `Copyright © ${new Date().getFullYear()} DHxingxing. Built with Docusaurus.`,
        },
        prism: {
          theme: prismThemes.github,
          darkTheme: prismThemes.dracula,
          // 如果需要支持更多语言，可以在这里添加
          additionalLanguages: ['java', 'python', 'bash'],
        },
        // live-codeblock 配置 - 这是关键配置
        liveCodeBlock: {
          playgroundPosition: 'bottom', // 或者 'top'
        },
      }),

  // 如果使用 mermaid 插件，添加这个配置
  mermaid: {
    theme: { light: 'default', dark: 'dark' },
  },
};

export default config;