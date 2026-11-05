# hideout

A snake game with a hidden chat inside.

- **`app/`**: Expo / React Native app (TypeScript). The game is the front door; Settings → Cheat codes opens the chat.
- **`server/`**: Node + TypeScript WebSocket relay. Stores users, friends, an offline mailbox and a message archive in Postgres (Supabase).

## Run locally

```bash
# server (needs server/.env with DB_CONNECTION_STRING, DB_PASSWORD, CHAT_KEY)
cd server && npm install && npm start

# app (scan the QR code with Expo Go)
cd app && npm install && npx expo start
```

## Checks

```bash
cd app && npm run typecheck && npm run lint && npm test
cd server && npm run typecheck && npm test
```
