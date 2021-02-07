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
    const { args, flags } = this.parse(CreateScene);
    if (!lstatSync(args.path).isFile()) {
      this.error(`'${args.path}' is not a valid file path, exiting.`);
    }
    if (flags.parallelism < 1 || flags.parallelism > 200) {
      this.error(`Invalid parallelism ${flags.parallelism}.`);
    }

    try {
      cli.action.start(`Creating scene...`);

      const client = await VertexClient.build({
        axiosOptions: { httpsAgent: new Agent({ keepAlive: true }) },
        basePath: flags.basePath,
      });
      const items: SceneItem[] = JSON.parse(readFileSync(args.path, Utf8));
      items.sort((a, b) => (a.depth || 0) - (b.depth || 0));
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
        parallelism: flags.parallelism,
        verbose: flags.verbose,
        createSceneReq: () => ({
          data: {
            attributes: {},
            type: SceneRelationshipDataTypeEnum.Scene,
          },
        }),
        createSceneItemReqs,
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
