export const isNotNullable = <TValue>(value: TValue | null | undefined): value is TValue => {
  // If the value is not null or undefined
  return value !== null && value !== undefined;
};

export const isNullable = <TValue>(value: TValue | null | undefined): value is null | undefined => {
  // If the value is not null or undefined
  return value === null && value === undefined;
};
