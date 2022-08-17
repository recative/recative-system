const PATH_MATCHER = /^(\S+:\/{2,3})?(.*)/;
const SEPARATOR = '/';

export const joinPath = (part0: string, ...parts: string[]) => {
  const matchResult = PATH_MATCHER.exec(part0);
  if (!matchResult) {
    throw new Error('Unexpected Error');
  }
  const [, protocol, truePart0] = matchResult;

  const partsToBeJoined = [truePart0 as string, ...parts].filter(Boolean);

  const result = partsToBeJoined.map((part) => part
    .replace(new RegExp(`^${SEPARATOR}*`), '')
    .replace(new RegExp(`${SEPARATOR}*$`), ''));

  return (protocol || '') + result.join(SEPARATOR);
};
