import { v4 as uuidV4 } from 'uuid';

import { EventTarget2 } from './EventTarget';

const REGISTRY_STYLE = uuidV4();

export const StyleDefinition = () => uuidV4();

interface IRegistryStyleEvent {
  name: string;
  getter: () => number;
  setter: (x: number) => void;
}

type TRegistryFunction<T> = (
  name: string,
  getter: () => number,
  setter: (x: number) => void
) => T;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const emptySetter = (x: number) => {};

export const RegistryStyleEvent: TRegistryFunction<
CustomEvent<IRegistryStyleEvent>
> = (name, getter, setter = emptySetter) => new CustomEvent(REGISTRY_STYLE, {
  detail: { name, getter, setter },
});

export const StyleStore = <T = number>({
  initialValue,
  getter,
  setter,
}: {
  initialValue: T;
  getter?: (x: T) => T;
  setter?: (x: T) => T;
}) => {
  let storedValue = initialValue;

  const getValue = () => {
    if (getter) return getter(storedValue);
    return storedValue;
  };

  const setValue = (x: T) => {
    if (setter) storedValue = setter(x);
    storedValue = x;
  };

  const atomStore = {
    get value() {
      return getValue();
    },
    set value(x) {
      setValue(x);
    },
    getEvent(x: string) {
      if (typeof storedValue === 'number') {
        return RegistryStyleEvent(
          x,
          getValue as unknown as () => number,
          setValue as unknown as () => number,
        );
      }
      throw new Error('Initial value could only be number!');
    },
  };

  return atomStore;
};

export class Stylesheet {
  constructor(eventTarget: EventTarget2) {
    eventTarget.addEventListener(
      REGISTRY_STYLE,
      (x: CustomEvent<IRegistryStyleEvent>) => {
        const { detail } = x;
        this.register(detail.name, detail.getter, detail.setter);
      },
    );
  }

  styles: Record<string, number> = {};

  keys: string[] = [];

  register: TRegistryFunction<void> = (name, getter, setter) => {
    Object.defineProperty(this.styles, name, {
      get: getter,
      set: setter,
    });
  };

  deregister(name: string) {
    Object.defineProperty(this.styles, name, {
      get: undefined,
      set: undefined,
    });
  }

  dispose() {
    this.keys.forEach((x) => this.deregister(x));
  }
}
