#! /usr/bin/env node

require('ts-node').register({
  project:require.resolve("../tsconfig.json")
});
require('../src/main.ts');
