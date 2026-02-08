import { useMemo } from "react";

export default function useSearchParams(state) {
  return useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(state).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params;
  }, [state]);
}
