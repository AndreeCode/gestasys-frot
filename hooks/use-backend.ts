"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useNotify } from "@/components/common/toast";
import type { ApiResult } from "@/lib/api/types";

/** Si el backend dice que la sesión ya no vale (401), vuelve al login con navegación completa. */
function useSessionGuard() {
  return useCallback((result: ApiResult<unknown>) => {
    if (!result.ok && result.status === 401) {
      window.location.replace("/session-expired");
      return true;
    }
    return false;
  }, []);
}

/** Carga datos con una Server Action; `key` decide cuándo recargar y `reload()` vuelve a pedirlos. */
export function useBackendQuery<T>(key: string, load: () => Promise<ApiResult<T>>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  const expired = useSessionGuard();

  useEffect(() => {
    loadRef.current = load;
  });

  const apply = useCallback(
    (result: ApiResult<T>) => {
      if (expired(result)) return;
      if (result.ok) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
      setLoading(false);
    },
    [expired],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    apply(await loadRef.current());
  }, [apply]);

  useEffect(() => {
    let cancelled = false;
    loadRef.current().then((result) => {
      if (!cancelled) apply(result);
    });
    return () => {
      cancelled = true;
    };
  }, [key, apply]);

  return { data, error, loading, reload };
}

/** Ejecuta una Server Action que modifica datos y muestra el mensaje del backend en un aviso. */
export function useBackendAction() {
  const notify = useNotify();
  const expired = useSessionGuard();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T,>(action: Promise<ApiResult<T>>, successText?: string): Promise<{ data: T } | null> => {
      setPending(true);
      try {
        const result = await action;
        if (expired(result)) return null;
        if (!result.ok) {
          notify(result.error, "danger");
          return null;
        }
        notify(successText ?? (result.msg || "Cambios guardados"));
        return { data: result.data };
      } finally {
        setPending(false);
      }
    },
    [notify, expired],
  );

  return { run, pending };
}
