/** Where to send someone after signing in. Only plain in-app paths, so `next` can't redirect off-site. */
export function safeNext(next: string | null | undefined): string {
  if (next && (/^\/app(\/[\w-]+)*$/.test(next) || next === "/reset-password")) return next;
  return "/app";
}
