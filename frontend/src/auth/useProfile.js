import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth.js";
import api from "../redux/api.js";

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.get("/auth/me");
      setProfile(data.profile || null);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) {
      fetchProfile();
    }
  }, [authLoading, fetchProfile]);

  const isAdmin = profile?.user_type === "admin";
  const isUser = profile?.user_type === "user" || (!profile?.user_type && !!user);

  return {
    profile,
    loading: authLoading || loading,
    isAdmin,
    isUser,
    refetch: fetchProfile,
  };
}
