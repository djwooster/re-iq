/**
 * The data access layer. UI code imports from here and nowhere else in
 * `lib/data`. Every function is async and org-scoped so the mock internals
 * can be swapped for Supabase and a real parsing pipeline without UI changes.
 */
export * from "./portfolio";
export * from "./properties";
export * from "./insights";
export * from "./actions";
export * from "./imports";
export * from "./sources";
export * from "./org";
export { subscribe, getRevision } from "./store";
