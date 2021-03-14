import cli from 'cli-ux';
import { lstat } from 'fs-extra';

interface ProgressBar {
  start: (total: number, current: number) => void;
  increment: () => void;
  update: (complete: number) => void;
  stop: () => void;
}

export async function directoryExists(path: string): Promise<boolean> {
  return (await lstat(path)).isDirectory();
}

export async function fileExists(path: string): Promise<boolean> {
  return (await lstat(path)).isFile();
}

export function progressBar(label?: string): ProgressBar {
  return cli.progress({
    format: `  ${
      label ? `${label} ` : ''
    }{bar} {percentage}% | {value}/{total}`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });
}
