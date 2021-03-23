import { lstat } from 'fs-extra';

export async function directoryExists(path: string): Promise<boolean> {
  return (await lstat(path)).isDirectory();
}

export async function fileExists(path: string): Promise<boolean> {
  return (await lstat(path)).isFile();
}
