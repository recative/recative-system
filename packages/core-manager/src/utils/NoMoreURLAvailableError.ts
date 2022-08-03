export class NoMoreURLAvailableError extends Error {
  name = 'NoMoreURLAvailableError';

  triedUrls: string[] = [];

  addUrl = (x: string) => {
    this.triedUrls.push(x);

    this.message = `No more URL available, Tried:\r\n${this.triedUrls
      .map((url, index) => `${index + 1}. ${url}`)
      .join(',\r\n')})}`;
  };
}
