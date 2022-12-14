module.exports = {
  prune: false,
  packagerConfig: {
    ignore: [
      'public[/\\\\]*.*',
      'src[/\\\\]*.*',
      'node_modules[/\\\\]*.*',
      '.gitignore',
      'forge.config.js',
      'project.json',
      'README.md',
      'rollup.config.js',
      'tsconfig.json'
    ],
  },
  makers: []
}
