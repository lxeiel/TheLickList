import { listPublicRestaurants } from "@/lib/restaurants";
import HomeClient from "@/app/HomeClient";

export const instant = false;

export default async function Home() {
  const restaurants = await listPublicRestaurants();
  return <HomeClient restaurants={restaurants} />;
}
