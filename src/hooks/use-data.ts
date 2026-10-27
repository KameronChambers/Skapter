import { useCallback, useEffect, useState } from "react";
import { subscribe, type Table } from "@/lib/data";

/** Loads data via a data.ts reader and re-fetches when any listed table changes. */
export function useData<T>(loader: () => Promise<T>, tables: Table[], deps: unknown[] = []): T | undefined {
  const [value, setValue] = useState<T>();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps);
  useEffect(() => {
    let alive = true;
    const run = () => load().then((v) => alive && setValue(v));
    run();
    const unsubs = tables.map((t) => subscribe(t, run));
    return () => {
      alive = false;
      unsubs.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, tables.join()]);
  return value;
}
