// The chat hides itself whenever the app leaves the foreground (see App.tsx), except while we sent
// the user out of the app on purpose: photo picker, camera, a permission prompt. Those open another
// Android screen, which puts this app in the background for a moment.
let away = 0;

export const isAwayOnPurpose = () => away > 0;

/** Runs `fn` (e.g. launching the photo picker) without the background switch locking the chat. */
export async function awayOnPurpose<T>(fn: () => Promise<T>): Promise<T> {
  away++;
  try {
    return await fn();
  } finally {
    away--;
  }
}
