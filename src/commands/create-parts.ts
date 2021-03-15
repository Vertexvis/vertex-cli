import { flags } from '@oclif/command';
import {
  BaseArgs,
  createPartFromFileIfNotExists,
  FileRelationshipDataTypeEnum,
  PartRevisionData,
  Utf8,
} from '@vertexvis/vertex-api-client';
import { createReadStream, readFile } from 'fs-extra';
import pLimit from 'p-limit';
import { join } from 'path';
import BaseCommand from '../base';
import { SceneItem } from '../create-items';
import {
  directoryExists,
  fileExists,
  progressBar,
  vertexClient,
} from '../utils';

interface Args extends BaseArgs {
  readonly fileName: string;
  readonly path: string;
  readonly indexMetadata: boolean;
  readonly suppliedPartId: string;
  readonly suppliedRevisionId: string;
}

export default class CreateParts extends BaseCommand {
  public static description = `Given JSON file containing SceneItems (as defined in src/create-items/index.d.ts), upload geometry files and create parts in Vertex Part Library.`;

  public static examples = [
    `$ vertex create-parts -d path/to/geometry/directory path/to/file
  ████████████████████████████████████████ 100% | 10/10
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
      flags: { directory, parallelism, verbose },
    } = this.parse(CreateParts);
    const basePath = this.parsedFlags?.basePath;
    if (!(await fileExists(path))) {
      this.error(`'${path}' is not a valid file path, exiting.`);
    }
    if (directory && !(await directoryExists(directory))) {
      this.error(`'${directory}' is not a valid directory path, exiting.`);
    }
    if (parallelism < 1 || parallelism > 20) {
      this.error(`Invalid parallelism ${parallelism}.`);
    }

    const itemsWithGeometry = new Map<string, Args>();
    const items: SceneItem[] = JSON.parse(await readFile(path, Utf8));
    const client = await vertexClient(basePath, this.userConfig);

    items
      .filter((i) => i.source)
      .forEach((i) => {
        const mapKey = `${i.source?.suppliedPartId}:${i.source?.suppliedRevisionId}`;
        const fileName = i.source?.fileName as string;
        if (i.source && !itemsWithGeometry.has(mapKey)) {
          itemsWithGeometry.set(mapKey, {
            client,
            verbose,
            fileName,
            indexMetadata: i.indexMetadata ?? false,
            path: directory ? join(directory, fileName) : fileName,
            suppliedPartId: i.source?.suppliedPartId,
            suppliedRevisionId: i.source?.suppliedRevisionId,
          });
        }
      });

    const progress = progressBar('Creating part(s)');
    const limit = pLimit(parallelism);
    if (!verbose) progress.start(itemsWithGeometry.size, 0);

    await Promise.all(
      [...itemsWithGeometry.values()].map(async (req) =>
        limit<Args[], PartRevisionData>(async (r) => {
          const res = await createPart(r);
          if (!verbose) progress.increment();
          return res;
        }, req)
      )
    );

    if (!verbose) progress.stop();
  }
}

async function createPart({
  client,
  fileName,
  indexMetadata,
  path,
  suppliedPartId,
  suppliedRevisionId,
  verbose,
}: Args): Promise<PartRevisionData> {
  return createPartFromFileIfNotExists({
    client,
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
    fileData: createReadStream(path),
    onMsg: console.error,
    verbose,
  });
}
