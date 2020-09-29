import { Command, flags } from '@oclif/command';
import { Utf8 } from '@vertexvis/vertex-api-client';
import { lstatSync, readFileSync, writeFileSync } from 'fs';
import { processPvs } from '../create-template/pvs';

export default class CreateTemplate extends Command {
  public static description = `Calculate path IDs and transforms for each instance in file and output new file in Vertex's scene template format.`;

  public static examples = [
    `$ vertex template -f pvs path/to/file
Wrote 5 pvs instances from 'path/to/file' to 'template.json'.
`,
  ];

  public static args = [{ name: 'path' }];

  public static flags = {
    help: flags.help({ char: 'h' }),
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
    verbose: flags.boolean({ char: 'v' }),
  };

  public async run(): Promise<void> {
    const { args, flags } = this.parse(CreateTemplate);
    if (!lstatSync(args.path).isFile()) {
      this.error(`'${args.path}' is not a valid file path, exiting.`);
    }

    let items = [];
    switch (flags.format) {
      case 'pvs':
        items = processPvs(readFileSync(args.path, Utf8), flags.verbose);
        break;
      default:
        this.error(`Unsupported format ${flags.format}`);
    }

    writeFileSync(flags.output, JSON.stringify({ version: '0.1', items }));

    const len = items.length;
    this.log(
      `Wrote ${len} ${flags.format} item${len === 1 ? '' : 's'} from '${
        args.path
      }' to '${flags.output}'.`
    );
  }
}
