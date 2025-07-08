// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '不百科',
  tagline: '他山之石，可以攻玉',
  url: 'https://dhxingxing.github.io',
  baseUrl: '/',
  organizationName: 'DHxingxing',
  projectName: 'DHxingxing.github.io',
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
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/DHxingxing/DHxingxing.github.io/edit/main/',
        },
        blog: {
          showReadingTime: true,
          blogSidebarCount: 5,
          editUrl: 'https://github.com/DHxingxing/DHxingxing.github.io/edit/main/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  plugins: [
    '@docusaurus/theme-mermaid',
    '@docusaurus/theme-live-codeblock',
  ],

  themeConfig: {
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
          href: 'https://github.com/DHxingxing/DHxingxing.github.io',
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
          items: [{ label: '快速开始', to: '/docs/intro' }],
        },
        {
          title: '社区',
          items: [
            { label: 'Discord', href: 'https://discord.gg/docusaurus' },
            { label: 'Twitter', href: 'https://twitter.com/docusaurus' },
          ],
        },
        {
          title: '更多',
          items: [
            { label: '博客', to: '/blog' },
            { label: 'GitHub', href: 'https://github.com/DHxingxing' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} DHxingxing. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    liveCodeBlock: {
      playgroundPosition: 'bottom',
    },
  },

  mermaid: {
    theme: { light: 'default', dark: 'dark' },
  },
};

export default config;
