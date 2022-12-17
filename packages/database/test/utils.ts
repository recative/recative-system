export class User {
  constructor(public name: string) {}

  customInflater = false;

  log = () => {
    // eslint-disable-next-line no-console
    console.log(`Name: ${this.name}`);
  };
}
