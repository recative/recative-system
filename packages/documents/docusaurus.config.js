// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');

const tsDocsConfig = (packageName, label) => [
  'docusaurus-plugin-typedoc',
  {
    id: `api-doc-${packageName}`,
    out: `api/${packageName}`,
    entryPoints: [
      `../${packageName}`,
    ],
    readme: `../${packageName}/README.md`,
    sidebar: {
      categoryLabel: label,
      fullNames: true,
    },
    entryPointStrategy: 'packages',
    tsconfig: './tsconfig.typedoc.json',
    excludeExternals: true,
  },
];

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
            to: 'docs/api/core-manager',
            activeBasePath: 'docs/api',
            label: 'API',
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
    tsDocsConfig('core-manager', 'Core Manager'),
    tsDocsConfig('audio-station', 'Audio Station'),
    tsDocsConfig('act-protocol', 'Act Protocol'),
    tsDocsConfig('client-sdk', 'Client SDK'),
    tsDocsConfig('open-promise', 'Open Promise'),
    tsDocsConfig('smart-resource', 'Smart Resource'),
    tsDocsConfig('atlas', 'Atlas'),
    tsDocsConfig('ugly-json', 'Ugly JSON'),
  ],
};

module.exports = config;
