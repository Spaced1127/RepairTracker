import pkg from "../package.json";

export const APP_VERSION: string = pkg.version;
/** Newest migration file this version of the code expects. A test keeps it in sync with supabase/migrations. */
export const LATEST_MIGRATION = "0006_notifications.sql";
