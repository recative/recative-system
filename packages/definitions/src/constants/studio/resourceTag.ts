import { LabelType } from '../meta/resourceTag/meta';

export const Color = {
  custom: 'custom' as const,
  neutral: 'neutral' as const,
  primary: 'primary' as const,
  accent: 'accent' as const,
  positive: 'positive' as const,
  warning: 'warning' as const,
  negative: 'negative' as const,
  black: 'black' as const,
  blue: 'blue' as const,
  red: 'red' as const,
  orange: 'orange' as const,
  yellow: 'yellow' as const,
  green: 'green' as const,
  purple: 'purple' as const,
  brown: 'brown' as const,
};

export const labelColorMap: Record<
LabelType,
  typeof Color[keyof typeof Color]
> = {
  [LabelType.MetaStatus]: Color.neutral,
  [LabelType.Language]: Color.blue,
  [LabelType.DeviceType]: Color.green,
  [LabelType.ScreenSize]: Color.yellow,
  [LabelType.ClientType]: Color.orange,
  [LabelType.Role]: Color.purple,
  [LabelType.Category]: Color.black,
  [LabelType.Engine]: Color.red,
  [LabelType.Custom]: Color.brown,
};
