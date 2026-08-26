export const logger = {
  info: (msg: string, extra?: unknown) => {
    console.log(JSON.stringify({ level: "info", msg, extra, ts: new Date().toISOString() }));
  },
  warn: (msg: string, extra?: unknown) => {
    console.warn(JSON.stringify({ level: "warn", msg, extra, ts: new Date().toISOString() }));
  },
  error: (msg: string, extra?: unknown) => {
    console.error(JSON.stringify({ level: "error", msg, extra, ts: new Date().toISOString() }));
  },
};
