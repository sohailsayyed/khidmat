"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import DateRangeFilter, { type DateRangeValue } from "@/components/admin/DateRangeFilter";
import type { DateRangeMode } from "@/lib/dateRange";

const VALID_MODES: DateRangeMode[] = ["all", "day", "month", "year"];

export default function DashboardDateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rangeParam = searchParams.get("range");
  const range: DateRangeMode = VALID_MODES.includes(rangeParam as DateRangeMode)
    ? (rangeParam as DateRangeMode)
    : "all";
  const date = searchParams.get("date") ?? "";

  function handleChange(next: DateRangeValue) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.range === "all") {
      params.delete("range");
      params.delete("date");
    } else {
      params.set("range", next.range);
      params.set("date", next.date);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return <DateRangeFilter value={{ range, date }} onChange={handleChange} />;
}
