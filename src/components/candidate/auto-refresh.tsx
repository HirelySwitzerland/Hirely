"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Reloads the page data while Hirely is still working on an application: every 5 s for 3 minutes, then every 30 s up to 20 minutes. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const start = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const elapsed = Date.now() - start;
      if (elapsed > 20 * 60_000) return;
      timer = setTimeout(() => { router.refresh(); tick(); }, elapsed < 3 * 60_000 ? 5_000 : 30_000);
    };
    tick();
    return () => clearTimeout(timer);
  }, [router]);
  return null;
}
