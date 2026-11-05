// Chat data on the phone: chat/state.json for messages, chat/images/ for photos.
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { readJson, writeJson } from '../lib/jsonFile';
import type { ChatDB, Img, Msg, OutboxEvent, WireImg } from './types';

const dir = new Directory(Paths.document, 'chat');
const imagesDir = new Directory(dir, 'images');
const stateFile = new File(dir, 'state.json');

export function loadDb(): ChatDB {
  imagesDir.create({ intermediates: true, idempotent: true });
  const fresh: ChatDB = { me: Crypto.randomUUID(), username: null, users: {}, friends: [], msgs: [], outbox: [] };
  const saved = readJson<Partial<ChatDB>>(stateFile);
  return saved ? { ...fresh, ...saved } : fresh; // older saves lack newer fields (e.g. friends)
}

// ponytail: rewrites the whole file per change; move to expo-sqlite if history gets huge
export const saveDb = (db: ChatDB) => writeJson(stateFile, db);

const imageFile = (id: string) => new File(imagesDir, `${id.replace(/[^\w-]/g, '')}.jpg`);

/** Saves a received photo to disk. */
export function saveIncomingImage(id: string, img: WireImg): Img {
  const f = imageFile(id);
  f.create({ overwrite: true });
  f.writeSync(img.b64, { encoding: 'base64' });
  return { uri: f.uri, w: img.w, h: img.h };
}

/** Moves a picked photo (in the cache folder) into permanent storage. */
export function keepOutgoingImage(id: string, draft: Img): Img {
  const f = imageFile(id);
  new File(draft.uri).moveSync(f);
  return { uri: f.uri, w: draft.w, h: draft.h };
}

/** Resizes and compresses a picked photo so it's quick to send. */
export async function shrink(asset: { uri: string; width: number; height: number }, max = 1600): Promise<Img> {
  const ctx = ImageManipulator.manipulate(asset.uri);
  const scale = Math.min(1, max / Math.max(asset.width, asset.height));
  if (scale < 1) ctx.resize({ width: Math.round(asset.width * scale) });
  const img = await (await ctx.renderAsync()).saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
  return { uri: img.uri, w: img.width, h: img.height };
}

/** Builds what actually goes over the socket for an outbox entry (photos inlined as base64). */
export async function toWire(e: OutboxEvent, msgs: Msg[]): Promise<object | null> {
  if (e.type !== 'msg') return e;
  const m = msgs.find((x) => x.id === e.id);
  if (!m) return null; // deleted before it was sent
  const image = m.image && { w: m.image.w, h: m.image.h, b64: await new File(m.image.uri).base64() };
  return { type: 'msg', to: m.peer, id: m.id, text: m.text, replyTo: m.replyTo, ts: m.ts, image };
}
