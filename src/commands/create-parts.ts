import { flags } from '@oclif/command';
import {
  BaseArgs,
  createPartFromFileIfNotExists,
  FileRelationshipDataTypeEnum,
  PartRevisionData,
  Utf8,
  VertexClient,
} from '@vertexvis/vertex-api-client';
import cli from 'cli-ux';
import { createReadStream, lstatSync, readFileSync } from 'fs';
import { Agent } from 'https';
import logUpdate from 'log-update';
import pLimit from 'p-limit';
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
      flags: { directory, parallelism, verbose },
    } = this.parse(CreateParts);
    const basePath = this.parsedFlags?.basePath;
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
      basePath,
      client: this.userConfig?.client,
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

    const total = itemsWithGeometry.size;
    this.log(`Found ${total} part(s) with geometry.`);
    cli.action.start(`Uploading file(s) and creating part(s)...`);

    let complete = 0;
    const log = logUpdate.create(process.stdout, { showCursor: true });
    const limit = pLimit(parallelism);
    await Promise.all(
      [...itemsWithGeometry.values()].map(async (req) =>
        limit<Args[], PartRevisionData>(async (r) => {
          const res = await createPart(r);
          log(`${Math.round((100 * (complete += 1)) / total)}% complete...`);
          return res;
        }, req)
      )
    );

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
    fileData: createReadStream(path),
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
