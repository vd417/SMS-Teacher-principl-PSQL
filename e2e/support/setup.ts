// src/config/env.ts reads __DEV__ at import time; jest-expo defines it, plain Node does not.
(globalThis as { __DEV__?: boolean }).__DEV__ = true;
