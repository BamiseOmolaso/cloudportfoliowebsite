declare module 'jsdom' {
  export class JSDOM {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(html?: string, options?: any);
    window: Window & typeof globalThis;
  }
} 