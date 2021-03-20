import { flags } from '@oclif/command';
import { Utf8 } from '@vertexvis/vertex-api-client';
import { readFile, writeFile } from 'fs-extra';
import { processPvs } from '../create-items/pvs';
import BaseCommand from '../lib/base';
import { fileExists } from '../lib/fs';

export default class CreateItems extends BaseCommand {
  public static description = `Calculate path IDs and transforms for each instance in file and output JSON file containing SceneItems (as defined in src/create-items/index.d.ts).`;

  public static examples = [
    `$ vertex create-items -f pvs path/to/file
Wrote 5 pvs item(s) from 'path/to/file' to 'items.json'.
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
      default: 'items.json',
    }),
    revisionProperty: flags.string({
      char: 'r',
      description: `Assuming the file format includes metadata properties, the property name to use for the part-revision's supplied ID. If not provided, the supplied ID defaults to '1'.`,
    }),
    root: flags.string({
      description: 'Part/assembly to use as root in file.',
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { path },
      flags: { format, output, revisionProperty, root, verbose },
    } = this.parse(CreateItems);
    if (!(await fileExists(path))) {
      this.error(`'${path}' is not a valid file path, exiting.`);
    }

    let items = [];
    switch (format) {
      case 'pvs':
        items = processPvs(
          await readFile(path, Utf8),
          verbose,
          root,
          revisionProperty
        );
        break;
      default:
        this.error(`Unsupported format ${format}`);
    }

    await writeFile(output, JSON.stringify(items));
    this.log(
      `Wrote ${items.length} ${format} item(s) from '${path}' to '${output}'.`
    );
  }
}
