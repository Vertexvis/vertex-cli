import { flags } from '@oclif/command';
import {
  BaseArgs,
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

interface Args extends BaseArgs {
  readonly directory?: string;
  readonly fileName: string;
  readonly indexMetadata: boolean;
  readonly suppliedPartId: string;
  readonly suppliedRevisionId: string;
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
    const {
      args: { path },
      flags: { basePath, directory, parallelism, verbose },
    } = this.parse(CreateParts);
    if (!lstatSync(path).isFile()) {
      this.error(`'${path}' is not a valid file path, exiting.`);
    }
    if (directory && !lstatSync(directory).isDirectory()) {
      this.error(`'${directory}' is not a valid directory path, exiting.`);
    }
    if (parallelism < 1 || parallelism > 20) {
      this.error(`Invalid parallelism ${parallelism}.`);
    }

    const items: SceneItem[] = JSON.parse(readFileSync(path, Utf8));
    const client = await VertexClient.build({
      axiosOptions: { httpsAgent: new Agent({ keepAlive: true }) },
      basePath: basePath,
    });

    const itemsWithGeometry = new Map<string, Args>();
    items
      .filter((i) => i.source)
      .forEach((i) => {
        const mapKey = `${i.source?.suppliedPartId}:${i.source?.suppliedRevisionId}`;
        if (i.source && !itemsWithGeometry.has(mapKey)) {
          itemsWithGeometry.set(mapKey, {
            client,
            verbose: verbose,
            directory: directory,
            fileName: i.source?.fileName,
            indexMetadata: i.indexMetadata ?? false,
            suppliedPartId: i.source?.suppliedPartId,
            suppliedRevisionId: i.source?.suppliedRevisionId,
          });
        }
      });

    this.log(`Found ${itemsWithGeometry.size} part(s) with geometry.`);
    cli.action.start(`Uploading file(s) and creating part(s)...`);

    const errors = new Set<PromiseRejectedResult>();
    // Chunk array into `parallelism` sizes and await each using `Promise.allSettled`.
    // This ensures all uploads within each chunk finish even if some fail.
    // `Promise.all`, in contrast, stops eval if any reject, killing connections
    // and leaving files in a partially uploaded state.
    const chunks = arrayChunked([...itemsWithGeometry.values()], parallelism);
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
      if (failures.length === parallelism)
        this.error([...errors.values(), ...failures].join('\n\n'));

      // Else add to `errors` and continue
      for (const f of failures) errors.add(f);
    }
    /* eslint-enable no-await-in-loop */

    if (errors.size > 0) this.error([...errors.values()].join('\n\n'));

    cli.action.stop();
  }
}

async function createPart({
  client,
  directory,
  fileName,
  indexMetadata,
  suppliedPartId,
  suppliedRevisionId,
  verbose,
}: Args): Promise<PartRevisionData> {
  const path = directory ? join(directory, fileName) : fileName;
  return createPartFromFileIfNotExists({
    client,
    verbose,
    // Do not pass encoding, vertex-api-client expects buffer
    fileData: readFileSync(path),
    createFileReq: {
      data: {
        attributes: { name: fileName, suppliedId: fileName },
        type: 'file',
      },
    },
    createPartReq: (fileId) => ({
      data: {
        attributes: {
          indexMetadata: indexMetadata,
          suppliedId: suppliedPartId,
          suppliedRevisionId: suppliedRevisionId,
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
