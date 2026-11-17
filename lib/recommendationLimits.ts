// Client-safe: the popup imports these, and lib/recommendations.ts pulls in
// server-only code (node:crypto, the Supabase service client).
export const MAX_REC_NAME = 100;
export const MAX_REC_MAPS_URL = 500;
export const MAX_REC_NOTES = 1000;
export const MAX_REC_FROM = 50;
