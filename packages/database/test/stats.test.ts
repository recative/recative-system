import { Database } from '../src';

describe('stats', () => {
  interface ITestRecord {
    name: string;
    age: number;
    relatives: {
      firstGrade: number;
    };
  }

  const database = new Database();
  const collection = database.addCollection<ITestRecord>('users');
  collection.insert({
    name: 'joe',
    age: 35,
    relatives: {
      firstGrade: 15,
    },
  });
  collection.insert({
    name: 'jack',
    age: 20,
    relatives: {
      firstGrade: 20,
    },
  });
  collection.insert({
    name: 'jim',
    age: 40,
    relatives: {
      firstGrade: 32,
    },
  });
  collection.insert({
    name: 'dave',
    age: 15,
    relatives: {
      firstGrade: 20,
    },
  });
  collection.insert({
    name: 'jim',
    age: 28,
    relatives: {
      firstGrade: 15,
    },
  });
  collection.insert({
    name: 'dave',
    age: 12,
    relatives: {
      firstGrade: 12,
    },
  });

  it('max should be 32', () => {
    expect(collection.max('relatives.firstGrade')).toEqual(32);
  });
  it('max record should be 3, 32', () => {
    expect({
      index: 3,
      value: 32,
    }).toEqual(collection.maxRecord('relatives.firstGrade'));
  });

  it('min should be 12', () => {
    expect(collection.min('age')).toEqual(12);
  });

  it('min record to be 6, 12', () => {
    expect(collection.minRecord('age')).toEqual({
      index: 6,
      value: 12,
    });
  });

  it('average to be 19', () => {
    expect(collection.mean('relatives.firstGrade')).toEqual(19);
  });

  it('median to be 17.5', () => {
    expect(collection.median('relatives.firstGrade')).toEqual(17.5);
  });

  it('ages should be [35, 20, 40, 15, 28, 12]', () => {
    expect(collection.extract('age')).toEqual([35, 20, 40, 15, 28, 12]);
  });

  it('Standard deviation on firstGrade relatives should be 6.48...', () => {
    expect(collection.standardDeviation('relatives.firstGrade')).toEqual(
      6.48074069840786
    );
  });

  it('stdDev should be 10.23...', () => {
    expect(collection.standardDeviation('age')).toEqual(10.23067283548187);
  });
});
