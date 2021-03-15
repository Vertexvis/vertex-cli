import { VertexClient } from '@vertexvis/vertex-api-client';
import cli from 'cli-ux';
import { lstat } from 'fs-extra';
import { Agent } from 'https';
import { Config } from './base';

interface ProgressBar {
  start: (total: number, current: number) => void;
  increment: () => void;
  update: (complete: number) => void;
  stop: () => void;
}

export async function vertexClient(
  basePath: string,
  config?: Config
): Promise<VertexClient> {
  return VertexClient.build({
    axiosOptions: { httpsAgent: new Agent({ keepAlive: true }) },
    basePath,
    client: config?.client,
  });
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
  });
}
