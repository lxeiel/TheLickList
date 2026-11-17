# The Lick List

Lex's Nomz Adventure: a map and list of every place Lex has eaten, and every place still on the wishlist, mostly around Singapore.

- **Home** (`/`): the intro, About Me and the map.
- **Lick List** (`/list`): every spot in a table you can sort and filter.
- **About** (`/about`): what the marks and scores mean.
- **Admin** (`/reborn`): Lex's password-protected page for adding and editing spots and photos.

Built with Next.js 16 (App Router), Supabase (database and photo storage), Mapbox, iron-session for the admin login, and Vercel Analytics. Hosted on Vercel.

## Running it locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill it in:

   | Variable | What it is |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public (anon) key, used to read restaurants |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key, used only by admin saves on the server. Keep it secret. |
   | `ADMIN_PASSWORD` | The password for `/reborn` |
   | `SESSION_SECRET` | A random string of at least 32 characters that signs the admin login cookie |
   | `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public access token |

3. Set up the database: run the files in `supabase/migrations/` in order, in the Supabase SQL editor. They create the tables, the access rules and the public `restaurant-photos` storage bucket.

4. Start the dev server and open http://localhost:3000:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev`: start the dev server
- `npm run build`: build for production
- `npm start`: serve the production build
- `npm run lint`: run ESLint
- `npm test`: run the Vitest tests

## Project layout

- `app/`: pages and routes. Shared UI lives in `app/_components/`, and the admin page lives in `app/reborn/`.
- `lib/`: data access, validation, filters and sorting, each with its own `*.test.ts`.
- `proxy.ts`: checks the admin login cookie before `/reborn` pages load.
- `supabase/migrations/`: the database schema.
- `docs/superpowers/`: design specs and build plans for each feature.

## Deploying

The site runs on Vercel. Set the same environment variables in the Vercel project settings.
