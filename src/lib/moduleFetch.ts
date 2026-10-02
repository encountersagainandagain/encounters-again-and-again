import { assertDataAccessEnabled } from '@/config/module-policy';
export const moduleFetch: typeof fetch = (input, init) => {
  assertDataAccessEnabled(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  return fetch(input, init);
};
