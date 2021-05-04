import { lstat, unlink } from 'fs-extra';

export async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await lstat(path)).isDirectory();
  } catch {
    return false;
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    return (await lstat(path)).isFile();
  } catch {
    return false;
  }
}

export async function deleteFile(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {}
}
