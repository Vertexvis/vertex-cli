import { flags } from '@oclif/command';
import {
  BaseReq,
  createPartFromFile,
  CreatePartFromFileReq,
  CreatePartFromFileRes,
  FileRelationshipDataTypeEnum,
  Utf8,
} from '@vertexvis/api-client-node';
import cli from 'cli-ux';
import { createReadStream, readFile } from 'fs-extra';
import pLimit from 'p-limit';
import { join } from 'path';

import { SceneItem } from '../create-items';
import BaseCommand from '../lib/base';
import { vertexClient } from '../lib/client';
import { directoryExists, fileExists } from '../lib/fs';
import { progressBar } from '../lib/progress';

type CreatePartsFn = (
  args: CreatePartFromFileReq
) => Promise<CreatePartFromFileRes>;

interface Args extends BaseReq {
  readonly createPartsFn: CreatePartsFn;
  readonly fileName: string;
  readonly path: string;
  readonly indexMetadata: boolean;
  readonly suppliedInstanceIdKey?: string;
  readonly suppliedPartId: string;
  readonly suppliedRevisionId: string;
}

export default class CreateParts extends BaseCommand {
  public static description = `Given JSON file containing SceneItems (as defined in src/create-items/index.d.ts), upload geometry files and create parts in Vertex Part Library.`;

  public static examples = [
    `$ vertex create-parts --directory [YOUR_PATH_TO_GEOMETRY_DIRECTORY] [YOUR_PATH_TO_JSON_FILE]
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
    await this.innerRun(createPartFromFile);
  }

  public async innerRun(createPartsFn: CreatePartsFn): Promise<void> {
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
      this.error(`Invalid parallelism '${parallelism}'.`);
    }

    const itemsWithGeometry = new Map<string, Args>();
    const items: SceneItem[] = JSON.parse(await readFile(path, Utf8));
    const client = await vertexClient(basePath, this.userConfig);
    await Promise.all(
      items
        .filter((i) => i.source)
        .map(async (i) => {
          const mapKey = `${i.source?.suppliedPartId}:${i.source?.suppliedRevisionId}`;
          const fileName = i.source?.fileName as string;
          if (i.source && !itemsWithGeometry.has(mapKey)) {
            const srcPath = directory ? join(directory, fileName) : fileName;
            if (!(await fileExists(srcPath))) {
              this.error(
                `'${srcPath}' is not a valid file path. Did you forget the '--directory' flag?`
              );
            }

            itemsWithGeometry.set(mapKey, {
              createPartsFn,
              client,
              verbose,
              fileName,
              indexMetadata: i.indexMetadata ?? false,
              path: srcPath,
              suppliedInstanceIdKey: i.suppliedInstanceIdKey,
              suppliedPartId: i.source?.suppliedPartId,
              suppliedRevisionId: i.source?.suppliedRevisionId,
            });
          }
        })
    );

    const msg = 'Creating part(s)';
    const useProgBar = itemsWithGeometry.size > 1 && !verbose;
    const progress = progressBar(msg);
    const limit = pLimit(parallelism);

    useProgBar
      ? progress.start(itemsWithGeometry.size, 0)
      : cli.action.start(msg);

    await Promise.all(
      [...itemsWithGeometry.values()].map((req) =>
        limit<Args[], CreatePartFromFileRes>(async (r) => {
          const res = await createPart(r);
          if (useProgBar) progress.increment();
          return res;
        }, req)
      )
    );

    useProgBar ? progress.stop() : cli.action.stop();
  }
}

function createPart({
  client,
  createPartsFn,
  fileName,
  indexMetadata,
  path,
  suppliedInstanceIdKey,
  suppliedPartId,
  suppliedRevisionId,
  verbose,
}: Args): Promise<CreatePartFromFileRes> {
  return createPartsFn({
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
          indexMetadata,
          suppliedId: suppliedPartId,
          suppliedInstanceIdKey,
          suppliedRevisionId,
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
