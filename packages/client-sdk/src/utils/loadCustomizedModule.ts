import createLoadRemoteModule, {
  createRequires,
} from '@paciolan/remote-module-loader';

import * as sdk from '../external';

import { joinPath } from './joinPath';
import { postProcessUrl } from './postProcessUrl';

const dependencies = {
  '@nanostores/react': require('@nanostores/react'),
  classnames: require('classnames'),
  nanostores: require('nanostores'),
  debug: require('debug'),
  nanoid: require('nanoid'),
  baseui: require('baseui'),
  'baseui/block': require('baseui/block'),
  'baseui/button': require('baseui/button'),
  'baseui/select': require('baseui/select'),
  'baseui/form-control': require('baseui/form-control'),
  'baseui/typography': require('baseui/typography'),
  react: require('react'),
  'react/jsx-runtime': require('react/jsx-runtime'),
  'react-dom': require('react-dom'),
  'react-use': require('react-use'),
  'react-slider': require('react-slider'),
  'use-constant': require('use-constant'),
  'lottie-react': require('lottie-react'),
  '@recative/client-sdk': sdk,
  '@recative/act-player': require('@recative/act-player'),
  '@recative/definitions': require('@recative/definitions'),
  '@recative/open-promise': require('@recative/open-promise'),
  '@recative/act-protocol': require('@recative/act-protocol'),
  '@recative/core-manager': require('@recative/core-manager'),
  '@recative/smart-resource': require('@recative/smart-resource'),
};

export const loadCustomizedModule = (
  scriptName: string,
  pathPattern: string,
  dataType: string,
  baseUrl = ''
) => {
  const requires = createRequires(dependencies);
  const loadRemoteModule = createLoadRemoteModule({ requires });

  return loadRemoteModule(
    postProcessUrl(
      joinPath(baseUrl, scriptName), 
      pathPattern,
      dataType,
      true
    )
  );
};
