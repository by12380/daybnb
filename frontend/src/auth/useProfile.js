import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth.js";
import { supabase } from "../lib/supabaseClient.js";

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user?.id || !supabase) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    } else {
      setProfile(data);
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
