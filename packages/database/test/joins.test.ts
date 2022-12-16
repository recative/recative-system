import { Database } from '../src';

import { IFilmDirectoryTestRecord, IFilmTestRecord } from './definition';

describe('joins', () => {
  it('works', () => {
    const db = new Database('testJoins');

    const directorsCollection =
      db.addCollection<IFilmDirectoryTestRecord>('directors');
    const filmsCollection = db.addCollection<IFilmTestRecord>('films');

    directorsCollection.insert([
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

    filmsCollection.insert([
      {
        title: 'Taxi',
        filmId: 1,
        directorId: 1,
      },
      {
        title: 'Raging Bull',
        filmId: 2,
        directorId: 1,
      },
      {
        title: 'The Godfather',
        filmId: 3,
        directorId: 2,
      },
      {
        title: 'Jaws',
        filmId: 4,
        directorId: 3,
      },
      {
        title: 'ET',
        filmId: 5,
        directorId: 3,
      },
      {
        title: 'Raiders of the Lost Ark',
        filmId: 6,
        directorId: 3,
      },
    ]);

    // Basic non-mapped join
    const test1 = filmsCollection
      .eqJoin(directorsCollection.data, 'directorId', 'directorId')
      .data();
    expect(test1[0].left.title).toEqual('Taxi');

    // Basic join with map
    const test2 = filmsCollection
      .eqJoin(
        directorsCollection.data,
        'directorId',
        'directorId',
        (left, right) => ({
          filmTitle: left.title,
          directorName: right.name,
        })
      )
      .data();
    expect(test2.length).toEqual(filmsCollection.data.length);
    expect(test2[0].filmTitle).toEqual('Taxi');
    expect(test2[0].directorName).toEqual('Martin Scorsese');

    // Basic non-mapped join with chained map
    const test3 = filmsCollection
      .eqJoin(directorsCollection.data, 'directorId', 'directorId')
      .map((obj) => {
        return {
          filmTitle: obj.left.title,
          directorName: obj.right.name,
        };
      })
      .data();
    expect(test3[0].filmTitle).toEqual('Taxi');
    expect(test3[0].directorName).toEqual('Martin Scorsese');

    // Test filtered join
    const test4 = filmsCollection
      .chain()
      .find({
        directorId: 3,
      })
      .simpleSort('title')
      .eqJoin(
        directorsCollection.data,
        'directorId',
        'directorId',
        (left, right) => {
          return {
            filmTitle: left.title,
            directorName: right.name,
          };
        }
      );
    expect(test4.data().length).toEqual(3);

    // Test chaining after join
    test4.find({
      filmTitle: 'Jaws',
    });
    expect(test4.data()[0].filmTitle).toEqual('Jaws');

    // Test calculated keys
    const test5 = filmsCollection
      .chain()
      .eqJoin(
        directorsCollection.data,
        (director) => {
          return director.directorId + 1;
        },
        (film) => {
          return film.directorId - 1;
        }
      )
      .data();

    expect(test5[0].right.name).toEqual('Steven Spielberg');
  });
});
