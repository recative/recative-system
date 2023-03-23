import * as React from 'react';

import { useSdkConfig } from './useSdkConfig';
import { ContentModuleFactory } from '../components/Content';

export const useContentComponent = () => {
  const config = useSdkConfig();

  const Content = React.useMemo(
    () => ContentModuleFactory(config.pathPattern, config.dataType),
    [config.pathPattern, config.dataType]
  );

  return Content;
};
