import { flags } from '@oclif/command';
import {
  CreateSceneItemRequest,
  createSceneWithSceneItems,
  logError,
  SceneRelationshipDataTypeEnum,
  Utf8,
  VertexClient,
} from '@vertexvis/vertex-api-client';
import cli from 'cli-ux';
import { lstatSync, readFileSync } from 'fs';
import { Agent } from 'https';
import logUpdate from 'log-update';
import BaseCommand from '../base';
import { SceneItem } from '../create-items';

export default class CreateScene extends BaseCommand {
  public static description = `Given JSON file containing SceneItems (as defined in src/create-items/index.d.ts), create scene in Vertex.`;

  public static examples = [
    `$ vertex create-scene -i path/to/items/file
Creating scene... done
Created scene f79d4760-0b71-44e4-ad0b-22743fdd4ca3.
`,
  ];

  public static args = [{ name: 'path' }];

  public static flags = {
    ...BaseCommand.flags,
    parallelism: flags.integer({
      char: 'p',
      description: 'Number of scene-items to create in parallel.',
      default: 20,
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { path },
      flags: { parallelism, verbose },
    } = this.parse(CreateScene);
    const basePath = this.parsedFlags?.basePath;
    if (!lstatSync(path).isFile()) {
      this.error(`'${path}' is not a valid file path, exiting.`);
    }
    if (parallelism < 1 || parallelism > 200) {
      this.error(`Invalid parallelism ${parallelism}.`);
    }

    try {
      cli.action.start(`Creating scene...`);

      const client = await VertexClient.build({
        axiosOptions: { httpsAgent: new Agent({ keepAlive: true }) },
        basePath,
        client: this.userConfig?.client,
      });
      const items: SceneItem[] = JSON.parse(readFileSync(path, Utf8));
      items.sort((a, b) => (a.depth || 0) - (b.depth || 0));
      const log = logUpdate.create(process.stdout, { showCursor: true });
      const createSceneItemReqs: CreateSceneItemRequest[] = items.map((i) => ({
        data: {
          attributes: {
            materialOverride: i.materialOverride,
            parent: i.parentId,
            source: i.source
              ? {
                  suppliedPartId: i.source.suppliedPartId,
                  suppliedRevisionId: i.source.suppliedRevisionId,
                }
              : undefined,
            suppliedId: i.suppliedId,
            transform: i.transform,
            visible: true,
          },
          relationships: {},
          type: 'scene-item',
        },
      }));

      const scene = await createSceneWithSceneItems({
        client,
        parallelism: parallelism,
        verbose: verbose,
        createSceneReq: () => ({
          data: {
            attributes: {
              treeEnabled: true,
            },
            type: SceneRelationshipDataTypeEnum.Scene,
          },
        }),
        createSceneItemReqs,
        onProgress: (complete, total) =>
          log(`${Math.round((100 * complete) / total)}% complete...`),
      });

      const getSceneItemsRes = await client.sceneItems.getSceneItems({
        id: scene.id,
        pageSize: 1,
      });

      cli.action.stop();

      this.log(`Created scene ${scene.id}.`);

      if (getSceneItemsRes.data.data.length === 0) {
        this.error(`No scene items exist in the scene.`);
      }
    } catch (error) {
      logError(error, this.error);
    }
  }
}
