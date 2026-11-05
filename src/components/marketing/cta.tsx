import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PUBLIC_DEMO, SITE_ONLY } from "@/lib/site";
import { cn } from "@/lib/utils";

const PRIMARY = "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-[16px] font-semibold text-night shadow-lg transition hover:bg-brand-50";
const SECONDARY = "inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-[16px] font-medium text-white transition hover:bg-white/10";

/** The main call to action on dark sections: free trial plus demo, or only the demo on the public-website-only site. */
export function StartButtons({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 sm:flex-row", className)}>
      {SITE_ONLY ? (
        <>
          <Link href="/demo" className={PRIMARY}>Demo vereinbaren <ArrowRight className="h-4 w-4" /></Link>
          {PUBLIC_DEMO && <Link href="/login" className={SECONDARY}>Selbst ausprobieren</Link>}
        </>
      ) : (
        <>
          <Link href="/register" className={PRIMARY}>14 Tage kostenlos testen <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/demo" className={SECONDARY}>Demo vereinbaren</Link>
        </>
      )}
    </div>
  );
}
