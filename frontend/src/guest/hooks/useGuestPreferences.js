import { useCallback, useState } from "react";

export default function useGuestPreferences(initial = {}) {
  const [preferences, setPreferences] = useState(initial);

  const updatePreference = useCallback((key, value) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { preferences, updatePreference };
}
