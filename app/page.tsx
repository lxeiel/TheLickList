import { Suspense } from "react";
import { listPublicRestaurants } from "@/lib/restaurants";
import ListSkeleton from "@/app/_components/ListSkeleton";
import MapPage from "@/app/_components/MapPage";

export const instant = false;

export default async function Home() {
  const restaurants = await listPublicRestaurants();
  return (
    // MapPage reads filters from the URL (useSearchParams), which needs a
    // Suspense boundary.
    <Suspense fallback={<ListSkeleton />}>
      <MapPage restaurants={restaurants} />
    </Suspense>
  );
}
