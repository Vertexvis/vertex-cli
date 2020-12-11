import { flags } from '@oclif/command';
import {
  arrayChunked,
  createPartFromFileIfNotExists,
  FileRelationshipDataTypeEnum,
  PartRevisionData,
  Utf8,
  VertexClient,
} from '@vertexvis/vertex-api-client';
import cli from 'cli-ux';
import { lstatSync, readFileSync } from 'fs';
import { Agent } from 'https';
import { join } from 'path';
import BaseCommand from '../base';
import { SceneItem } from '../create-items';

interface Args {
  client: VertexClient;
  verbose: boolean;
  directory?: string;
  fileName: string;
  suppliedPartId: string;
  suppliedRevisionId: string;
}

export default class CreateParts extends BaseCommand {
  public static description = `Given JSON file containing SceneItems (as defined in src/create-items/index.d.ts), upload geometry files and create parts in Vertex Part Library.`;

  public static examples = [
    `$ vertex create-parts -d path/to/geometry/directory path/to/file
Found 5 part(s) with geometry.
Uploading file(s) and creating part(s)... done
`,
  ];

  public static args = [{ name: 'path' }];

  public static flags = {
    ...BaseCommand.flags,
    directory: flags.string({
      char: 'd',
      description: 'Directory containing geometry files.',
    }),
    parallelism: flags.integer({
      char: 'p',
      description: 'Number of files and parts to create in parallel.',
      default: 20,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = this.parse(CreateParts);
    if (!lstatSync(args.path).isFile()) {
      this.error(`'${args.path}' is not a valid file path, exiting.`);
    }
    if (flags.directory && !lstatSync(flags.directory).isDirectory()) {
      this.error(
        `'${flags.directory}' is not a valid directory path, exiting.`
      );
    }
    if (flags.parallelism < 1 || flags.parallelism > 20) {
      this.error(`Invalid parallelism ${flags.parallelism}.`);
    }

    const items: SceneItem[] = JSON.parse(readFileSync(args.path, Utf8));
    const client = await VertexClient.build({
      axiosOptions: { httpsAgent: new Agent({ keepAlive: true }) },
      basePath: flags.basePath,
    });

    const itemsWithGeometry = new Map<string, Args>();
    items
      .filter((i) => i.source)
      .forEach((i) => {
        if (i.source && !itemsWithGeometry.has(i.source?.suppliedPartId)) {
          itemsWithGeometry.set(i.source?.suppliedPartId, {
            client,
            verbose: flags.verbose,
            directory: flags.directory,
            suppliedPartId: i.source?.suppliedPartId,
            suppliedRevisionId: i.source?.suppliedRevisionId,
            fileName: i.source?.fileName,
          });
        }
      });

    this.log(`Found ${itemsWithGeometry.size} part(s) with geometry.`);
    cli.action.start(`Uploading file(s) and creating part(s)...`);

    const errors = new Set<PromiseRejectedResult>();
    // Chunk array into `flags.parallelism` sizes and await each using `Promise.allSettled`.
    // This ensures all uploads within each chunk finish even if some fail.
    // `Promise.all`, in contrast, stops eval if any reject, killing connections
    // and leaving files in a partially uploaded state.
    const chunks = arrayChunked(
      [...itemsWithGeometry.values()],
      flags.parallelism
    );
    /* eslint-disable no-await-in-loop */
    for (const chunk of chunks) {
      const responses = await Promise.allSettled(chunk.map(createPart));
      const failures = (responses.filter(
        (p) => p.status === 'rejected'
      ) as PromiseRejectedResult[]).map((p) =>
        p.reason.vertexErrorMessage
          ? p.reason.vertexErrorMessage
          : p.reason.message
      );

      // If all requests failed, something is probably wrong. Exit with error.
      if (failures.length === flags.parallelism)
        this.error([...errors.values(), ...failures].join('\n\n'));

      // Else add to `errors` and continue
      for (const f of failures) errors.add(f);
    }
    /* eslint-enable no-await-in-loop */

    if (errors.size > 0) this.error([...errors.values()].join('\n\n'));

    cli.action.stop();
  }
}

async function createPart(args: Args): Promise<PartRevisionData> {
  const path = args.directory
    ? join(args.directory, args.fileName)
    : args.fileName;
  return createPartFromFileIfNotExists({
    client: args.client,
    verbose: args.verbose,
    // Do not pass encoding, vertex-api-client expects buffer
    fileData: readFileSync(path),
    createFileReq: {
      data: {
        attributes: { name: args.fileName, suppliedId: args.fileName },
        type: 'file',
      },
    },
    createPartReq: (fileId) => ({
      data: {
        attributes: {
          suppliedId: args.suppliedPartId,
          suppliedRevisionId: args.suppliedRevisionId,
        },
        relationships: {
          source: {
            data: { id: fileId, type: FileRelationshipDataTypeEnum.File },
          },
        },
        type: 'part',
      },
    }),
  });
}
