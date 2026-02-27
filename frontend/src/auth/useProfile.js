import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth.js";
import api from "../redux/api.js";
import { supabase } from "../lib/supabaseClient.js";

export function useProfile() {
  const { user, session, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const prevUserIdRef = useRef(user?.id);

  // When the user id changes (login/logout), immediately mark as loading
  // so consumers never see a stale profile with loading=false.
  useEffect(() => {
    if (user?.id !== prevUserIdRef.current) {
      prevUserIdRef.current = user?.id;
      setLoading(true);
      if (!user?.id) {
        setProfile(null);
        setError(null);
      }
    }
  }, [user?.id]);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get("/auth/me");
      setProfile(data?.profile || null);
    } catch (error) {
      // If the access token is stale after idle time, trigger a session read/refresh
      // and retry once before treating profile fetch as failed.
      if (error?.status === 401 && supabase) {
        try {
          await supabase.auth.getSession();
          const { data } = await api.get("/auth/me");
          setProfile(data?.profile || null);
          setError(null);
          setLoading(false);
          return;
        } catch (retryError) {
          console.error("Error fetching profile after retry:", retryError);
          setError(retryError);
          setProfile((prev) => prev ?? null);
          setLoading(false);
          return;
        }
      }

      console.error("Error fetching profile:", error);
      setError(error);
      // Preserve last known profile on transient errors to avoid false role downgrade.
      setProfile((prev) => prev ?? null);
    }

    setLoading(false);
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    if (!authLoading) {
      fetchProfile();
    }
  }, [authLoading, fetchProfile, session?.access_token]);

  const role = profile?.user_type || null;
  const isAdmin = role === "admin";
  const isOwner = role === "owner";
  const isCustomer = role === "customer" || (!role && !!user);

  return {
    profile,
    loading: authLoading || loading,
    role,
    isAdmin,
    isOwner,
    isCustomer,
    error,
    refetch: fetchProfile,
  };
}
