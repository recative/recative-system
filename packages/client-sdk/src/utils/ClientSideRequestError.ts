export class ClientSideRequestError extends Error {
  constructor(public url: string, public code: number) {
    super(`Failed to request the URL: ${url}, code: ${code}`);
  }
}
