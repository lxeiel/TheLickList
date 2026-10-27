"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import RouteError from "@/app/_components/RouteError";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <RouteError retry={retry} />;
}
