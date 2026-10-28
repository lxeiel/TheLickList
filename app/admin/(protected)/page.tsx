import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { listRestaurants } from "@/lib/restaurants";
import { formatScore } from "@/lib/format";
import { AddRestaurant } from "@/app/admin/AddRestaurant";
import StatusMark, { STATUS_LABEL } from "@/app/_components/StatusMark";
import { requireAdmin } from "@/lib/auth";
import styles from "@/app/admin/admin.module.css";
import { createRestaurantAction } from "./actions";

export const instant = false;

export default async function AdminPage() {
  await requireAdmin();
  const restaurants = await listRestaurants();

  return (
    <main>
      <div className={styles.header}>
        <h1>
          Restaurants <span className={styles.count}>{restaurants.length}</span>
        </h1>
        <AddRestaurant count={restaurants.length} onSubmit={createRestaurantAction} />
      </div>

      {restaurants.length === 0 ? (
        <p className={styles.empty}>No restaurants yet.</p>
      ) : (
        <ul className={styles.list}>
          {restaurants.map((restaurant) => {
            const details = [
              STATUS_LABEL[restaurant.status],
              restaurant.area,
              restaurant.cuisine_tags.join(", "),
              restaurant.price_range,
              formatScore(restaurant),
            ].filter(Boolean);
            return (
              <li key={restaurant.id}>
                <Link href={`/admin/restaurants/${restaurant.id}`} className={styles.row}>
                  <StatusMark status={restaurant.status} size="md" />
                  <span className={styles.rowText}>
                    <span className={styles.rowName}>{restaurant.name}</span>
                    <span className={styles.rowDetails}>{details.join(" · ")}</span>
                  </span>
                  {restaurant.lat == null && <span className={styles.flag}>No location</span>}
                  <CaretRight size={16} aria-hidden className={styles.rowArrow} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
