import { flags } from '@oclif/command';
import {
  CreateSceneItemRequest,
  createSceneWithSceneItems,
  logError,
  SceneRelationshipDataTypeEnum,
  Utf8,
} from '@vertexvis/vertex-api-client';
import cli from 'cli-ux';
import { readFile } from 'fs-extra';
import BaseCommand from '../lib/base';
import { SceneItem } from '../create-items';
import { vertexClient } from '../lib/client';
import { fileExists } from '../lib/fs';
import { progressBar } from '../lib/progress';

export default class CreateScene extends BaseCommand {
  public static description = `Given JSON file containing SceneItems (as defined in src/create-items/index.d.ts), create scene in Vertex.`;

  public static examples = [
    `$ vertex create-scene -i path/to/items/file
  ████████████████████████████████████████ 100% | 10/10
f79d4760-0b71-44e4-ad0b-22743fdd4ca3
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
    suppliedId: flags.string({
      description: 'SuppliedId of scene.',
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { path },
      flags: { parallelism, suppliedId, verbose },
    } = this.parse(CreateScene);
    const basePath = this.parsedFlags?.basePath;
    if (!(await fileExists(path))) {
      this.error(`'${path}' is not a valid file path, exiting.`);
    }
    if (parallelism < 1 || parallelism > 200) {
      this.error(`Invalid parallelism ${parallelism}.`);
    }

    try {
      const progress = progressBar('Creating scene');
      const client = await vertexClient(basePath, this.userConfig);
      const items: SceneItem[] = JSON.parse(await readFile(path, Utf8));
      items.sort((a, b) => (a.depth || 0) - (b.depth || 0));

      const createSceneItemReqs: CreateSceneItemRequest[] = items.map((i) => ({
        data: {
          attributes: {
            materialOverride: i.materialOverride,
            parent: i.parentId,
            partInstanceSuppliedIdsAsSuppliedIds: Boolean(
              i.suppliedInstanceIdKey
            ),
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

      progress.start(createSceneItemReqs.length, 0);

      const scene = await createSceneWithSceneItems({
        client,
        createSceneItemReqs,
        createSceneReq: () => ({
          data: {
            attributes: {
              suppliedId: suppliedId,
            },
            type: SceneRelationshipDataTypeEnum.Scene,
          },
        }),
        onMsg: console.error,
        onProgress: (complete, total) => {
          progress.update(complete);
          if (complete === total) {
            progress.stop();
            cli.action.start('Created scene items. Awaiting scene completion');
          }
        },
        parallelism,
        verbose: verbose,
      });

      const getSceneItemsRes = await client.sceneItems.getSceneItems({
        id: scene.id,
        pageSize: 1,
      });

      cli.action.stop();
      this.log(scene.id);

      if (getSceneItemsRes.data.data.length === 0) {
        this.error(`No scene items exist in the scene.`);
      }
    } catch (error) {
      logError(error, this.error);
    }
  }
}
