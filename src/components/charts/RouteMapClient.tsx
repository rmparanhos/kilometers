"use client";

import dynamic from "next/dynamic";
import type { NormalizedRecord } from "@/lib/parsers/records";

const RouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[460px] w-full animate-pulse rounded-md bg-gray-100" />
  ),
});

interface Props {
  records: NormalizedRecord[];
}

export default function RouteMapClient({ records }: Props) {
  return <RouteMap records={records} />;
}
