// Note: type annotations allow type checking and IDEs autocompletion

const path = require('path');
const lightCodeTheme = require('prism-react-renderer/themes/github');

const labels = require('./packages');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Recative System',
  tagline: 'Web is Beautiful',
  url: 'https://recative.github.io',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  projectName: 'recative.github.io',
  organizationName: 'recative',
  trailingSlash: false,
  deploymentBranch: 'main',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/recative/recative-system/tree/master/packages/documents',
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/recative/recative-system/tree/master/packages/documents',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        logo: {
          alt: 'Recative System',
          src: 'img/logo.svg',
        },
        items: [
          {
            to: 'docs/tutorial/intro',
            activeBasePath: 'docs/tutorial',
            position: 'left',
            label: 'Tutorial',
          },
          {
            to: 'api',
            label: 'API',
            activeBasePath: 'api',
            position: 'left',
          },
          { to: '/blog', label: 'Blog', position: 'left' },
          {
            href: 'https://github.com/recative/recative-system',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        links: [],
        copyright: `© Recative System ${new Date().getFullYear()}`,
      },
      colorMode: {
        defaultMode: 'light',
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      prism: {
        theme: lightCodeTheme,
      },
    }),
  plugins: [
    [
      'docusaurus-plugin-typedoc-api',
      {
        projectRoot: path.join(__dirname, '..', '..'),
        packages: labels.map(({ id }) => ({
          path: `packages/${id}`,
          entry: 'src/index.ts',
        })),
        exclude: ['*.spec.ts', '*.test.ts'],
      },
    ],
  ],
};

module.exports = config;
