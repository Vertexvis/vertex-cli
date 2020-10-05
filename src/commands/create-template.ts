import { flags } from '@oclif/command';
import { Utf8 } from '@vertexvis/vertex-api-client';
import { lstatSync, readFileSync, writeFileSync } from 'fs';
import { processPvs } from '../create-template/pvs';
import BaseCommand from '../base';

export default class CreateTemplate extends BaseCommand {
  public static description = `Calculate path IDs and transforms for each instance in file and output new file in Vertex's scene template format.`;

  public static examples = [
    `$ vertex create-template -f pvs path/to/file
Wrote 5 pvs items from 'path/to/file' to 'template.json'.
`,
  ];

  public static args = [{ name: 'path' }];

  public static flags = {
    ...BaseCommand.flags,
    format: flags.string({
      char: 'f',
      description: 'File format.',
      options: ['pvs'],
      required: true,
    }),
    output: flags.string({
      char: 'o',
      description: 'Path to output file.',
      default: 'template.json',
    }),
    root: flags.string({
      char: 'r',
      description: 'Part/assembly to use as root in file.',
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = this.parse(CreateTemplate);
    if (!lstatSync(args.path).isFile()) {
      this.error(`'${args.path}' is not a valid file path, exiting.`);
    }

    let items = [];
    switch (flags.format) {
      case 'pvs':
        items = processPvs(
          readFileSync(args.path, Utf8),
          flags.verbose,
          flags.root
        );
        break;
      default:
        this.error(`Unsupported format ${flags.format}`);
    }

    writeFileSync(flags.output, JSON.stringify({ version: '0.1', items }));

    this.log(
      `Wrote ${items.length} ${flags.format} item(s) from '${args.path}' to '${flags.output}'.`
    );
  }
}
