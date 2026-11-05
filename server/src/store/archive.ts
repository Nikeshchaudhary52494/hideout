// Turns a relayed event into the archived fields it touches. Shared by both stores; pure.
import type { RelayEvent } from '../protocol.ts';

export type ArchivedMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  image: { w: number; h: number } | null; // dimensions only: photo bytes are never archived
  replyTo: string | null;
  sentAt: Date;
};

const str = (v: unknown) => (typeof v === 'string' ? v : null);

export function toArchivedMessage(e: RelayEvent): ArchivedMessage | null {
  const id = str(e.id);
  if (!id) return null;
  const img = e.image as { w?: unknown; h?: unknown } | undefined;
  const ts = Number(e.ts);
  return {
    id,
    senderId: e.from,
    recipientId: e.to,
    text: str(e.text) ?? '',
    image: img ? { w: Number(img.w) || 1, h: Number(img.h) || 1 } : null,
    replyTo: str(e.replyTo),
    sentAt: Number.isFinite(ts) && ts > 0 ? new Date(ts) : new Date(),
  };
}

export const eventId = (e: RelayEvent) => str(e.id);
export const eventText = (e: RelayEvent) => str(e.text);
export const eventEmoji = (e: RelayEvent) => str(e.emoji);
