import { atom } from 'nanostores';

export interface IErrorLog {
  date: Date;
  object: unknown;
}

export const errorCollectingAtom = atom<IErrorLog[]>([]);

// @ts-ignore: We need this.
window.addEventListener('recative-error', ({ detail }: CustomEvent) => {
  errorCollectingAtom.set([
    ...errorCollectingAtom.get(),
    { date: new Date(), object: detail as unknown },
  ]);
});
