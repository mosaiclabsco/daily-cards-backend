import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api';

// Carrega dados assíncronos: busca ao montar (e quando `key` muda) e expõe `reload` para puxar de novo.
// Os dados anteriores ficam na tela até a resposta nova chegar.

type Result<T> = { key: string | null; data: T; error: ApiError | null };

export function useLoader<T>(load: (() => Promise<T>) | null, key: string | null, initial: T) {
  const [result, setResult] = useState<Result<T>>({ key: null, data: initial, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef(load);
  const latest = useRef(0);

  useEffect(() => {
    loadRef.current = load;
  });

  const run = useCallback(async (forKey: string | null) => {
    const fn = loadRef.current;
    if (!fn) return;
    const request = ++latest.current;
    try {
      const data = await fn();
      if (latest.current === request) setResult({ key: forKey, data, error: null });
    } catch (e) {
      if (latest.current === request) {
        const error = e instanceof ApiError ? e : new ApiError('unknown');
        setResult((prev) => ({ key: forKey, data: prev.data, error }));
      }
    }
  }, []);

  useEffect(() => {
    if (key !== null) void run(key);
  }, [key, run]);

  const reload = useCallback(async () => {
    setRefreshing(true);
    await run(key);
    setRefreshing(false);
  }, [key, run]);

  return {
    data: result.data,
    error: result.key === key ? result.error : null,
    loading: key !== null && (result.key !== key || refreshing),
    reload,
  };
}
