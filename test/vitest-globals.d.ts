declare global {
  function describe(name: string, fn: () => void | Promise<void>): void;
  function it(name: string, fn: () => void | Promise<void>): void;
  function test(name: string, fn: () => void | Promise<void>): void;
  function expect(actual: unknown): any;
  function beforeEach(fn: () => void | Promise<void>): void;
  function afterEach(fn: () => void | Promise<void>): void;
  const vi: typeof import('vitest')['vi'];
}

export {};
