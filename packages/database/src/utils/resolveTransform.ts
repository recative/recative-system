import type { TransformRequest } from '../ResultSet';

import { clone, CloneMethod } from './clone';
import { hasOwn } from './hasOwn';

// used to recursively scan hierarchical transform step object for param
// substitution
export const resolveTransformObject = <T extends object>(
  object: T,
  parameters: Record<string, unknown>,
  depth = 0
) => {
  const internalDepth = depth + 1;

  if (internalDepth >= 10) return object;

  const properties = Object.keys(object) as (keyof T)[];

  for (let i = 0; i < properties.length; i += 1) {
    const property = properties[i];

    const value = object[property];
    if (typeof value === 'string' && value.startsWith('[%lktxp]')) {
      const parameterName = value.substring(8);
      if (hasOwn(parameters, parameterName)) {
        object[property] = Reflect.get(parameters, parameterName) as T[keyof T];
      }
    } else if (typeof value === 'object' && value !== null) {
      object[property] = resolveTransformObject(
        value,
        parameters,
        internalDepth
      );
    }
  }

  return object;
};

// top level utility to resolve an entire (single) transform (array of steps)
// for parameter substitution
export const resolveTransformParameters = <
  T extends object,
  R0 extends object = T,
  R1 extends object = T
>(
  transform: TransformRequest<T, R0, R1>[],
  parameters: Record<string, unknown>
) => {
  let clonedStep;
  const resolvedTransform: TransformRequest<T, R0, R1>[] = [];

  if (typeof parameters === 'undefined') return transform;

  // iterate all steps in the transform array
  for (let i = 0; i < transform.length; i += 1) {
    // clone transform so our scan/replace can operate directly on cloned
    // transform
    clonedStep = clone(transform[i], CloneMethod.ShallowRecurseObjects);
    resolvedTransform.push(resolveTransformObject(clonedStep, parameters));
  }

  return resolvedTransform;
};
