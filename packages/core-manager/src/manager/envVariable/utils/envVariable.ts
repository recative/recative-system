import {
  getOS, isMobile, isWeChat, isTouchScreen,
} from './deviceType';

export const getBrowserRelatedEnvVariable = () => ({
  isMobile: isMobile(),
  isTouchScreen: isTouchScreen(),
  isWeChat: isWeChat(),
  os: getOS(),
});
