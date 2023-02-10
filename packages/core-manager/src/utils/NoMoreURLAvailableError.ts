export class NoMoreURLAvailableError extends Error {
  name = 'NoMoreURLAvailableError';

  triedUrls: string[] = [];

  constructor(
    public urlMap?: Record<string, string>,
    public preferredUploaders?: string[]
  ) {
    super();
    this.updateErrorMessage();
  }

  private updateErrorMessage = () => {
    const urlMapLog = this.urlMap
      ? `URL Map\r\n========\r\n${Object.keys(this.urlMap)
          .map(
            (x, index) => `${index + 1}. ${x}: ${Reflect.get(this.urlMap!, x)}`
          )
          .join('\r\n')}\r\n\r\n`
      : '';

    const preferredUploadersLog = this.preferredUploaders
      ? `Preferred Uploaders\r\n====================\r\n${this.preferredUploaders
          .map((x, index) => `${index + 1}. ${x}`)
          .join('\r\n')}\r\n\r\n`
      : '';

    const tryLog = this.triedUrls.length
      ? `Trying Logs\r\n=============\r\n${this.triedUrls
          .map((url, index) => `${index + 1}. ${url}`)
          .join(',\r\n')}\r\n`
      : '';

    this.message = `\r\n\r\nDIAGNOSIS REPORT\r\n\r\n~~~~~~~~~~~~~~~~~~\r\n${urlMapLog}${preferredUploadersLog}${tryLog}`;
  };

  addUrl = (x: string) => {
    this.triedUrls.push(x);
    this.updateErrorMessage();
  };
}
