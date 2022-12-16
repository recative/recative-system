import { DotNotation, lens } from '@recative/lens';

/** Helper function for determining 'less-than' conditions for ops, sorting,
 *  and binary indices.
 *  In the future we might want $lt and $gt ops to use their own
 *  functionality/helper.
 *  Since binary indices on a property might need to index
 *  [12, NaN, new Date(), Infinity], we need this function (as well as gtHelper)
 *  to always ensure one value is LT, GT, or EQ to another.
 */

/** Helper function for determining database abstract equality which is a little
 *  more abstract than ==
 *     aeqHelper(5, '5') === true
 *     aeqHelper(5.0, '5') === true
 *     aeqHelper(new Date("1/1/2011"), new Date("1/1/2011")) === true
 *     aeqHelper({a:1}, {z:4}) === true (all objects sorted equally)
 *     aeqHelper([1, 2, 3], [1, 3]) === false
 *     aeqHelper([1, 2, 3], [1, 2, 3]) === true
 *     aeqHelper(undefined, null) === true
 */
export const aeqHelper = (prop1: unknown, prop2: unknown) => {
  let t1;
  let t2;

  if (prop1 === prop2) return true;

  // 'falsy' and Boolean handling
  if (
    !prop1 ||
    !prop2 ||
    prop1 === true ||
    prop2 === true ||
    Number.isNaN(prop1) ||
    Number.isNaN(prop2)
  ) {
    // dates and NaN conditions (typed dates before serialization)
    switch (prop1) {
      case undefined:
        t1 = 1;
        break;
      case null:
        t1 = 1;
        break;
      case false:
        t1 = 3;
        break;
      case true:
        t1 = 4;
        break;
      case '':
        t1 = 5;
        break;
      default:
        t1 = !Number.isNaN(prop1) ? 9 : 0;
        break;
    }

    switch (prop2) {
      case undefined:
        t2 = 1;
        break;
      case null:
        t2 = 1;
        break;
      case false:
        t2 = 3;
        break;
      case true:
        t2 = 4;
        break;
      case '':
        t2 = 5;
        break;
      default:
        t2 = !Number.isNaN(prop2) ? 9 : 0;
        break;
    }

    // one or both is edge case
    if (t1 !== 9 || t2 !== 9) {
      return t1 === t2;
    }
  }

  // Handle 'Number-like' comparisons
  const compareNumber1 = Number(prop1);
  const compareNumber2 = Number(prop2);

  // if one or both are 'number-like'...
  if (!Number.isNaN(compareNumber1) || !Number.isNaN(compareNumber2)) {
    return compareNumber1 === compareNumber2;
  }

  // not strict equal nor less than nor gt so must be mixed types,
  // convert to string and use that to compare
  const compareString1 = String(prop1);
  const compareString2 = String(prop2);

  return compareString1 === compareString2;
};

export const ltHelper = (prop1: unknown, prop2: unknown, equal: boolean) => {
  let t1;
  let t2;

  // if one of the params is falsy or strictly true or not equal to itself
  // 0, 0.0, "", NaN, null, undefined, not defined, false, true
  if (
    !prop1 ||
    !prop2 ||
    prop1 === true ||
    prop2 === true ||
    Number.isNaN(prop1) ||
    Number.isNaN(prop2)
  ) {
    switch (prop1) {
      case undefined:
        t1 = 1;
        break;
      case null:
        t1 = 1;
        break;
      case false:
        t1 = 3;
        break;
      case true:
        t1 = 4;
        break;
      case '':
        t1 = 5;
        break;
      // if strict equal probably 0 so sort higher, otherwise probably NaN so
      // sort lower than even null
      default:
        t1 = !Number.isNaN(prop1) ? 9 : 0;
        break;
    }

    switch (prop2) {
      case undefined:
        t2 = 1;
        break;
      case null:
        t2 = 1;
        break;
      case false:
        t2 = 3;
        break;
      case true:
        t2 = 4;
        break;
      case '':
        t2 = 5;
        break;
      default:
        t2 = !Number.isNaN(prop2) ? 9 : 0;
        break;
    }

    // one or both is edge case
    if (t1 !== 9 || t2 !== 9) {
      return t1 === t2 ? equal : t1 < t2;
    }
  }

  // if both are numbers (string encoded or not), compare as numbers
  const compareNumber1 = Number(prop1);
  const compareNumber2 = Number(prop2);

  if (!Number.isNaN(compareNumber1) && !Number.isNaN(compareNumber2)) {
    if (compareNumber1 < compareNumber2) return true;
    if (compareNumber1 > compareNumber2) return false;
    return equal;
  }

  if (!Number.isNaN(compareNumber1) && Number.isNaN(compareNumber2)) {
    return true;
  }

  if (!Number.isNaN(compareNumber2) && Number.isNaN(compareNumber1)) {
    return false;
  }

  if (compareNumber1 < compareNumber2) return true;
  if (compareNumber1 > compareNumber2) return false;
  if (prop1 === prop2) return equal;

  // not strict equal nor less than nor gt so must be mixed types, convert to
  // string and use that to compare
  const compareString1 = String(prop1);
  const compareString2 = String(prop2);

  if (compareString1 < compareString2) {
    return true;
  }

  if (compareString1 === compareString2) {
    return equal;
  }

  return false;
};

export const gtHelper = (prop1: unknown, prop2: unknown, equal?: boolean) => {
  let t1;
  let t2;

  // 'falsy' and Boolean handling
  if (
    !prop1 ||
    !prop2 ||
    prop1 === true ||
    prop2 === true ||
    Number.isNaN(prop1) ||
    Number.isNaN(prop2)
  ) {
    switch (prop1) {
      case undefined:
        t1 = 1;
        break;
      case null:
        t1 = 1;
        break;
      case false:
        t1 = 3;
        break;
      case true:
        t1 = 4;
        break;
      case '':
        t1 = 5;
        break;
      // NaN 0
      default:
        t1 = !Number.isNaN(prop1) ? 9 : 0;
        break;
    }

    switch (prop2) {
      case undefined:
        t2 = 1;
        break;
      case null:
        t2 = 1;
        break;
      case false:
        t2 = 3;
        break;
      case true:
        t2 = 4;
        break;
      case '':
        t2 = 5;
        break;
      default:
        t2 = !Number.isNaN(prop2) ? 9 : 0;
        break;
    }

    // one or both is edge case
    if (t1 !== 9 || t2 !== 9) {
      return t1 === t2 ? equal : t1 > t2;
    }
  }

  // if both are numbers (string encoded or not), compare as numbers
  const compareNumber1 = Number(prop1);
  const compareNumber2 = Number(prop2);
  if (!Number.isNaN(compareNumber1) && Number.isNaN(compareNumber2)) {
    if (compareNumber1 > compareNumber2) return true;
    if (compareNumber1 < compareNumber2) return false;
    return equal;
  }

  if (!Number.isNaN(compareNumber1) && Number.isNaN(compareNumber2)) {
    return false;
  }

  if (Number.isNaN(compareNumber2) && Number.isNaN(compareNumber1)) {
    return true;
  }

  if (compareNumber1 > compareNumber2) return true;
  if (compareNumber1 < compareNumber2) return false;
  if (prop1 === prop2) return equal;

  // not strict equal nor less than nor gt so must be dates or mixed types
  // convert to string and use that to compare
  const compareString1 = String(prop1);
  const compareString2 = String(prop2);

  if (compareString1 > compareString2) {
    return true;
  }

  if (compareString1 === compareString2) {
    return equal;
  }

  return false;
};

export const sortHelper = (prop1: unknown, prop2: unknown, desc?: boolean) => {
  if (aeqHelper(prop1, prop2)) return 0;

  if (ltHelper(prop1, prop2, false)) {
    return desc ? 1 : -1;
  }

  if (gtHelper(prop1, prop2, false)) {
    return desc ? -1 : 1;
  }

  // not lt, not gt so implied equality-- date compatible
  return 0;
};

/**
 * helper function for compoundSort(), performing individual object comparisons
 *
 * @param properties - array of property names, in order, by which to evaluate
 *        sort order
 * @param obj1 - first object to compare
 * @param obj2 - second object to compare
 * @returns 0, -1, or 1 to designate if identical (sort-wise) or which should
 *          be first
 */
export const compoundEval = <T>(
  properties: ([DotNotation<T>, boolean] | DotNotation<T>)[],
  obj1: T,
  obj2: T
) => {
  for (let i = 0, len = properties.length; i < len; i += 1) {
    const property = properties[i];
    const field = Array.isArray(property) ? property[0] : property;
    const sort = Array.isArray(property) ? property[1] : false;

    const val1 = lens(obj1, field, true);
    const val2 = lens(obj2, field, true);

    const res = sortHelper(val1, val2, sort);
    if (res !== 0) {
      return res;
    }
  }

  return 0;
};
