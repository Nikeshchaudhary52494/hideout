// Set at build time from EXPO_PUBLIC_* variables:
//   - local dev: app/.env.local (gitignored)
//   - EAS builds: EAS environment variables (see eas.json)
// Note: anything EXPO_PUBLIC_ ends up inside the app, so the key gates the server, it isn't a secret.
export const SERVER = process.env.EXPO_PUBLIC_SERVER_URL ?? 'ws://localhost:3000';
export const KEY = process.env.EXPO_PUBLIC_CHAT_KEY ?? 'change-me'; // must match CHAT_KEY on the server
export const NAME_RULE = /^[\w .-]{2,20}$/; // usernames; the server checks the same rule
