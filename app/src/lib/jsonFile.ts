import { File } from 'expo-file-system';

/** Reads a JSON file. Missing → null. Corrupt → kept aside for recovery (never overwritten) and null. */
export function readJson<T>(file: File): T | null {
  if (!file.exists) return null;
  try {
    return JSON.parse(file.textSync()) as T;
  } catch {
    file.copySync(new File(file.parentDirectory, `${file.name}.corrupt-${Date.now()}`));
    return null;
  }
}

/** Write-then-rename, so a crash mid-write can't leave a half-written file behind. */
export function writeJson(file: File, value: unknown) {
  const tmp = new File(file.parentDirectory, `${file.name}.tmp`);
  tmp.create({ overwrite: true });
  tmp.writeSync(JSON.stringify(value));
  tmp.moveSync(file, { overwrite: true });
}

export function deleteFile(uri?: string) {
  const f = uri ? new File(uri) : null;
  if (f?.exists) f.delete();
}
