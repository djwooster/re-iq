import "server-only";

/**
 * Structured server logs: one JSON line per event, ready to forward to Sentry later.
 * Never pass personal data, financial figures, file contents, tokens or cookies. As a backstop,
 * fields whose names look sensitive are redacted.
 */

type Value = string | number | boolean | null | undefined;
type Fields = Record<string, Value>;

const SENSITIVE = /email|password|token|secret|cookie|authorization|session|phone|address|^ip$|_ip$|^name$|_name$|amount|balance|account/i;

function write(level: "info" | "warn" | "error", event: string, fields: Fields = {}) {
  const safe = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, SENSITIVE.test(k) ? "[redacted]" : v]));
  console[level](JSON.stringify({ level, event, time: new Date().toISOString(), ...safe }));
}

export const log = {
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, fields?: Fields) => write("error", event, fields),
};
