import type { Metadata } from "next";
import { Suspense } from "react";
import { listPublicRestaurants } from "@/lib/restaurants";
import ListPage from "@/app/_components/ListPage";
import ListSkeleton from "@/app/_components/ListSkeleton";

export const metadata: Metadata = { title: "List" };

export const instant = false;

export default async function List() {
  const restaurants = await listPublicRestaurants();
  return (
    // ListPage reads filters and sort from the URL (useSearchParams), which
    // needs a Suspense boundary.
    <Suspense fallback={<ListSkeleton variant="list" />}>
      <ListPage restaurants={restaurants} />
    </Suspense>
  );
}
