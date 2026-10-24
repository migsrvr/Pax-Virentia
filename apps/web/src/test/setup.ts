import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { csrfStore } from '../services/api';

afterEach(() => {
  cleanup();
  csrfStore.set(null);
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
