"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useLiveClinicData(onRefresh: () => Promise<void>, intervalMs = 12000) {
  useEffect(() => {
    const supabase = createClient();
    let isDisposed = false;

    const channel = supabase
      .channel("clinic-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => {
        if (!isDisposed) void onRefresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_events" }, () => {
        if (!isDisposed) void onRefresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        if (!isDisposed) void onRefresh();
      })
      .subscribe();

    const poller = setInterval(() => {
      if (!isDisposed) void onRefresh();
    }, intervalMs);

    return () => {
      isDisposed = true;
      clearInterval(poller);
      supabase.removeChannel(channel);
    };
  }, [intervalMs, onRefresh]);
}
