import { Command, flags } from '@oclif/command';
import {
  createPartFromFile,
  Environment,
  Environments,
  FileRelationshipDataTypeEnum,
  Utf8,
  VertexClient,
} from '@vertexvis/vertex-api-client';
import { lstatSync, readFileSync } from 'fs';
import pLimit from 'p-limit';
import { join } from 'path';
import { parse } from 'querystring';
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

const Parallelism = 20;

const createPart = async (args: CreatePartArgs): Promise<string> =>
  createPartFromFile({
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

export default class CreateParts extends Command {
  public static description = `Given JSON file in Vertex's scene template format, upload geometry files and create parts in Vertex Part Library.`;

  public static examples = [
    `$ vertex create-parts -d path/to/geometry/directory path/to/file
Uploaded and created 5 parts.
`,
  ];

  public static args = [{ name: 'path' }];

  public static flags = {
    help: flags.help({ char: 'h' }),
    directory: flags.string({
      char: 'd',
      description: 'Directory containing geometry files.',
      required: true,
    }),
    environment: flags.string({
      char: 'e',
      description: 'Vertex API environment.',
      options: Environments,
      default: 'platprod',
    }),
    verbose: flags.boolean({ char: 'v' }),
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
    const client = await VertexClient.build({
      environment: flags.environment as Environment,
    });

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

    const limit = pLimit(Parallelism);
    this.log(`Creating ${itemsWithGeometry.size} files...`);

    await Promise.all(
      [...itemsWithGeometry.values()].map((r) =>
        limit<CreatePartArgs[], string>(createPart, r)
      )
    );

    const len = itemsWithGeometry.size;
    this.log(`Uploaded and created ${len} part${len === 1 ? '' : 's'}.`);
  }
}
