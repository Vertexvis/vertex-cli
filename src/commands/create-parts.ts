import { flags } from '@oclif/command';
import {
  arrayChunked,
  createPartFromFileIfNotExists,
  FileRelationshipDataTypeEnum,
  Utf8,
  VertexClient,
} from '@vertexvis/vertex-api-client';
import { lstatSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'querystring';
import BaseCommand from '../base';
import { ExtendedSceneTemplate } from '../create-template';
import { DefaultPartRevision } from '../create-template/pvs';

interface CreatePartArgs {
  client: VertexClient;
  verbose: boolean;
  directory: string;
  fileName: string;
  partName: string;
  partRevision: string;
}

const ChunkSize = 20;

const createPart = async (args: CreatePartArgs): Promise<string> =>
  createPartFromFileIfNotExists({
    client: args.client,
    verbose: args.verbose,
    fileData: readFileSync(join(args.directory, args.fileName)),
    createFileReq: {
      data: {
        attributes: { name: args.fileName, suppliedId: args.fileName },
        type: 'file',
      },
    },
    createPartReq: (fileId) => ({
      data: {
        attributes: {
          suppliedId: args.partName,
          suppliedRevisionId: args.partRevision,
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

export default class CreateParts extends BaseCommand {
  public static description = `Given JSON file in Vertex's scene template format, upload geometry files and create parts in Vertex Part Library.`;

  public static examples = [
    `$ vertex create-parts -d path/to/geometry/directory path/to/file
Uploaded and created 5 parts.
`,
  ];

  public static args = [{ name: 'path' }];

  public static flags = {
    ...BaseCommand.flags,
    directory: flags.string({
      char: 'd',
      description: 'Directory containing geometry files.',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = this.parse(CreateParts);
    if (!lstatSync(args.path).isFile()) {
      this.error(`'${args.path}' is not a valid file path, exiting.`);
    }
    if (!lstatSync(flags.directory).isDirectory()) {
      this.error(
        `'${flags.directory}' is not a valid directory path, exiting.`
      );
    }

    const template: ExtendedSceneTemplate = JSON.parse(
      readFileSync(args.path, Utf8)
    );
    const client = await VertexClient.build({ basePath: flags.basePath });

    const itemsWithGeometry = new Map<string, CreatePartArgs>();
    template.items
      .filter((i) => i.name && i.fileName && i.source)
      .forEach((i) => {
        if (!itemsWithGeometry.has(i.fileName as string)) {
          const queryParams = parse(i.source as string) || {};
          itemsWithGeometry.set(i.fileName as string, {
            client,
            verbose: flags.verbose,
            directory: flags.directory,
            partName: i.name as string,
            partRevision:
              (queryParams['filter[part-revisions][suppliedId]'] as string) ||
              DefaultPartRevision,
            fileName: i.fileName as string,
          });
        }
      });

    this.log(`Creating ${itemsWithGeometry.size} files...`);

    // Chunk array into ChunkSize sizes and await each using Promise.allSettled.
    // This ensures all uploads within each chunk finish even if some fail.
    // Promise.all, in contrast, stops eval if any reject, killing connections
    // and leaving files in a partially uploaded state.
    const chunks = arrayChunked([...itemsWithGeometry.values()], ChunkSize);
    /* eslint-disable no-await-in-loop */
    for (const chunk of chunks) {
      const responses = await Promise.allSettled(chunk.map(createPart));
      const failures = (responses.filter(
        (p) => p.status === 'rejected'
      ) as PromiseRejectedResult[]).map((p) => p.reason.message);

      // If any in this chunk failed, exit with error.
      if (failures.length > 0)
        this.error(`Error(s) creating parts, exiting, ${failures.join('\n')}`);
    }
    /* eslint-enable no-await-in-loop */

    this.log(`Uploaded and created ${itemsWithGeometry.size} part(s).`);
  }
}
