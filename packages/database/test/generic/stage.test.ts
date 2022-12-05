import { Database } from '../../src';
import { IFilmDirectoryTestRecord } from './definition';

describe('Staging and commits', () => {
  it('work', () => {
    const database = new Database('testJoins');
    const directors =
      database.addCollection<IFilmDirectoryTestRecord>('directors');

    directors.insert([
      {
        name: 'Martin Scorsese',
        directorId: 1,
      },
      {
        name: 'Francis Ford Coppola',
        directorId: 2,
      },
      {
        name: 'Steven Spielberg',
        directorId: 3,
      },
      {
        name: 'Quentin Tarantino',
        directorId: 4,
      },
    ]);

    const stageName = 'tentative directors';
    const newDirectorsName = 'Joel and Ethan Cohen';
    const message = 'Edited Cohen brothers name';

    const cohen = directors.insert({
      name: 'Cohen Brothers',
      directorId: 5,
    });
    const new_cohen = directors.stage(stageName, cohen);
    new_cohen.name = newDirectorsName;
    expect(cohen.name).toEqual('Cohen Brothers');
    directors.commitStage(stageName, message);
    expect(directors.get(cohen.$loki)?.name).toEqual('Joel and Ethan Cohen');
    expect(
      directors.commitLog.filter((entry) => {
        return entry.message === message;
      }).length
    ).toBe(1);
  });
});
