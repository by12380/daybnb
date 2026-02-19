import { useCallback, useEffect, useState } from "react";
import api from "../redux/api.js";

export function useCampaignBanner() {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCampaign = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/offers/campaign");
      setCampaign(data?.campaign || null);
    } catch (_err) {
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  return { campaign, loading, refetch: loadCampaign };
}
