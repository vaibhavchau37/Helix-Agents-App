import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './supabase';

/**
 * Subscribes to realtime changes on a table and re-fetches data automatically.
 * Combines Supabase realtime channels with periodic polling as a fallback.
 */
export function useLiveQuery<T>(
  table: string,
  query: ReturnType<typeof supabase.from<T>['select']> extends never ? never : Parameters<typeof supabase.from<T>['select']>[0],
  deps: any[] = []
): { data: T[] | null; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const result = await (supabase.from(table).select(query) as any);
    setData((result.data || []) as T[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, query, ...deps]);

  useEffect(() => {
    fetchData();
    const ch = supabase
      .channel(`live-${table}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => fetchData())
      .subscribe();
    // Fallback poll every 5s in case realtime misses an event
    const interval = setInterval(fetchData, 5000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(interval);
    };
  }, [fetchData]);

  return { data, loading, refresh: fetchData };
}

/**
 * Animated number counter — eases from 0 to the target value on mount/change.
 */
export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    startRef.current = null;
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}
