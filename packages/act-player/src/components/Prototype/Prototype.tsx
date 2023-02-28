import { useStyletron } from 'baseui';
import { Block } from 'baseui/block';
import { LabelXSmall } from 'baseui/typography';
import * as React from 'react';
import { extractPrototype } from './utils/extractPrototype';

export interface IPrototypeProps {
  valueKey: string;
  value: unknown;
  disableParse?: boolean;
}

const SUMMARY_STYLES = {
  display: 'flex',
}

export const Prototype: React.FC<IPrototypeProps> = React.memo(({
  value,
  valueKey,
  disableParse
}) => {
  const [css, theme] = useStyletron();

  const parsedValue = React.useMemo(
    () => disableParse ? value : extractPrototype(value),
    [disableParse, value]
  );

  const isObject = React.useMemo(
    () => typeof parsedValue === 'object' && parsedValue !== null,
    [parsedValue]
  )

  const prototype = React.useMemo(
    () => Object.prototype.toString.call(parsedValue)
      .replace('[object ', '')
      .replace(']', '')
      .toUpperCase(),
    [parsedValue]
  );

  console.log(parsedValue);

  const title = React.useMemo(() => (
    <LabelXSmall display="flex" alignItems="center">
      <Block marginRight="4px"><b>{valueKey}: </b></Block>
      {!isObject && (
        <Block marginRight="8px">{String(parsedValue)}</Block>
      )}
      <Block
        color={theme.colors.contentAccent}
      >
        {prototype}
      </Block>
    </LabelXSmall>
  ), [valueKey, isObject, parsedValue, theme.colors.contentAccent, prototype]);

  if (isObject) {
    return (
      <details>
        <summary className={css(SUMMARY_STYLES)}>{title}</summary>
        <Block marginLeft="12px">
          {
            Object.keys(parsedValue as object).map((x, i) => (
              <Prototype
                key={i}
                valueKey={x}
                value={Reflect.get(parsedValue as object, x)}
                disableParse
              />
            ))
          }
        </Block>
      </details>
    )
  }

  return title;
});