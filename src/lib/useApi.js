import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook for read endpoints. Pass an async fn (typically from src/api/*) and the
 * deps that should refetch.
 *
 * Returns { data, loading, error, refetch }.
 */
export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const counter = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFn = useCallback(fn, deps);

  const load = useCallback(() => {
    const requestId = ++counter.current;
    setLoading(true);
    setError(null);
    return stableFn()
      .then((result) => {
        if (counter.current !== requestId) return;
        setData(result);
      })
      .catch((err) => {
        if (counter.current !== requestId) return;
        setError(err);
      })
      .finally(() => {
        if (counter.current !== requestId) return;
        setLoading(false);
      });
  }, [stableFn]);

  useEffect(() => {
    load();
    return () => { counter.current++; };
  }, [load]);

  return { data, loading, error, refetch: load };
}

/**
 * Imperative hook for mutations (POST/PATCH/DELETE).
 *
 *   const { run, loading, error } = useMutation(signRTS);
 *   await run(txnId);
 */
export function useMutation(fn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current(...args);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading, error };
}
