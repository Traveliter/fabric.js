/* eslint-disable @typescript-eslint/no-empty-object-type -- augmenting vitest matchers */
import 'vitest';
import type { TMat2D } from './src/typedefs';
import type { cloneDeepWith } from 'es-toolkit/compat';
import type { FabricImage } from './src/shapes/Image';

type ExtendedOptions = {
  // NOTE:
  // `es-toolkit/compat`'s `cloneDeepWith` is not modeled as a generic function in
  // a way that supports instantiation expressions (`typeof fn<T>`). Using
  // `typeof cloneDeepWith<T>` can collapse to `never` under `tsc-files`, which
  // then breaks callers (e.g. `customiser?.(...)` becomes "not callable").
  //
  // We only need the runtime signature here, so we take the second parameter
  // type from the non-instantiated function.
  cloneDeepWith?: Parameters<typeof cloneDeepWith>[1];
} & object;

type ObjectOptions = ExtendedOptions & {
  includeDefaultValues?: boolean;
};

interface CustomMatchers<R = unknown> {
  toMatchSnapshot(
    propertiesOrHint?: ExtendedOptions | string,
    hint?: string,
  ): R;

  toMatchObjectSnapshot(propertiesOrHint?: ObjectOptions, hint?: string): R;

  toMatchSVGSnapshot(hint?: string): R;

  toEqualRoundedMatrix(expected: TMat2D, precision?: number): R;

  toEqualSVG(expected: string): void;

  toSameImageObject(expected: Partial<FabricImage>): void;
}

declare module 'vitest' {
  interface Assertion<T = unknown> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
