// Push notifications, disguised as game nudges: never the sender, never the text.

export const NUDGES: [title: string, body: string][] = [
  ['Your snake is getting hungry', 'Come back and feed it.'],
  ['A new level is waiting', 'Think you can clear it on the first try?'],
  ['Snake misses you', 'One quick round? It’s been a while.'],
  ['Can you beat your best?', 'Your high score is looking lonely.'],
  ['Today’s run is ready', 'Fresh board, same hungry snake. Tap to play.'],
];

const NUDGE_EVERY = 3 * 60 * 1000; // at most one nudge per person per 3 minutes

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  channelId: 'default'; // the app's "Game updates" channel
  priority: 'high'; // delivered promptly even when the phone is idle
};
export type PushSender = (url: string, msg: PushMessage) => Promise<unknown>;
export type Nudger = ReturnType<typeof createNudger>;

const postJson: PushSender = (url, msg) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msg) });

/** Sends throttled nudges through Expo's push service. `send` is swappable for tests. */
export function createNudger({ pushUrl, every = NUDGE_EVERY, send = postJson }: { pushUrl: string; every?: number; send?: PushSender }) {
  const last = new Map<string, number>(); // userId -> time of last nudge (throttle only; tokens live in the store)

  return {
    /** Called when a message arrives and the recipient's chat isn't open. */
    nudge(userId: string, token: string | null) {
      if (!token || Date.now() - (last.get(userId) ?? 0) < every) return;
      last.set(userId, Date.now());
      const [title, body] = NUDGES[Math.floor(Math.random() * NUDGES.length)];
      send(pushUrl, { to: token, title, body, sound: 'default', channelId: 'default', priority: 'high' }).catch((err: Error) => console.warn('push failed:', err.message));
    },

    /** They just left the chat: the next message should nudge right away. */
    reset: (userId: string) => void last.delete(userId),
  };
}
