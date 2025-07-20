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
  baseUrl: '/obsidian/',
  organizationName: 'DHxingxing',
  projectName: 'obsidian',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/DHxingxing/obsidian/edit/main/',
        },
        blog: {
          showReadingTime: true,
          blogSidebarCount: 'ALL',
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
      },
    ],
  ],

  themes: ['@docusaurus/theme-mermaid'],
  plugins: [
    '@docusaurus/theme-live-codeblock', // 您原有的插件保持不变

    // 在下面添加新的本地搜索插件配置
    [
      require.resolve('docusaurus-plugin-search-local'),
      {
        // 插件的选项，在这里保持为空对象即可使用默认配置
      },
    ],
  ],

  markdown: {
    mermaid: true,
  },



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
            { to: '/docs/intro', label: '文档', position: 'left' },
            { to: '/blog', label: '博客', position: 'left' },
            {
              href: 'https://github.com/DHxingxing/obsidian',
              label: 'GitHub',
              position: 'right',
            },
          ],
        },
        mermaid: {
          theme: { light: 'default', dark: 'dark' },
        },
        footer: {
          style: 'dark',
          links: [
            {
              title: '文档',
              items: [{ label: '快速开始', to: '/docs/intro' }],
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
                { label: '博客', to: '/blog' },
                { label: 'GitHub', href: 'https://github.com/DHxingxing/obsidian' },
              ],
            },
          ],
          copyright: `Copyright © ${new Date().getFullYear()} DHxingxing. Built with Docusaurus.`,
        },
        prism: {
          theme: prismThemes.github,
          darkTheme: prismThemes.dracula,
          additionalLanguages: ['java', 'python', 'bash'],
        },
        liveCodeBlock: {
          playgroundPosition: 'bottom',
        },
      }),
};

export default config;
