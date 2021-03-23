import cli from 'cli-ux';

interface ProgressBar {
  start: (total: number, current: number) => void;
  increment: () => void;
  update: (complete: number) => void;
  stop: () => void;
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
