import { Suspense } from "react";
import { listPublicRestaurants } from "@/lib/restaurants";
import Hero from "@/app/_components/Hero";
import ListSkeleton from "@/app/_components/ListSkeleton";
import MapPage from "@/app/_components/MapPage";
import MenuSection from "@/app/_components/MenuSection";
import styles from "./page.module.css";

export const instant = false;

export default async function Home() {
  const restaurants = await listPublicRestaurants();
  return (
    <main>
      <Hero />
      <MenuSection restaurants={restaurants} />
      <section id="map" className={styles.map} aria-label="Map">
        {/* MapPage reads filters from the URL (useSearchParams), which needs a
            Suspense boundary. */}
        <Suspense fallback={<ListSkeleton />}>
          <MapPage restaurants={restaurants} />
        </Suspense>
      </section>
    </main>
  );
}
