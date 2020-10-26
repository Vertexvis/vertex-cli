import { flags } from '@oclif/command';
import {
  groupBy,
  CameraFitTypeEnum,
  createSceneItem,
  CreateSceneRequest,
  CreateSceneItemRequest,
  PartRevisionRelationshipDataTypeEnum,
  SceneItem,
  SceneRelationshipDataTypeEnum,
  Utf8,
  VertexClient,
} from '@vertexvis/vertex-api-client';
import cli from 'cli-ux';
import { lstatSync, readFileSync } from 'fs';
import BaseCommand from '../base';
import { ExtendedSceneTemplate } from '../create-template';

export default class CreateTemplate extends BaseCommand {
  public static description = `Given JSON file in Vertex's scene template format, create scene in Vertex.`;

  public static examples = [
    `$ vertex create-scene -t path/to/template/file
Creating scene... done
Created scene f79d4760-0b71-44e4-ad0b-22743fdd4ca3.
`,
  ];

  public static args = [{ name: 'path' }];

  public static flags = {
    ...BaseCommand.flags,
    template: flags.string({
      char: 't',
      description: 'Path to scene template.',
      required: true,
    }),
    parallelism: flags.integer({
      char: 'p',
      description: 'Number of scene-items to create in parallel.',
      default: 20,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = this.parse(CreateTemplate);
    if (!lstatSync(flags.template).isFile()) {
      this.error(`'${flags.template}' is not a valid file path, exiting.`);
    }
    if (flags.parallelism < 1 || flags.parallelism > 20) {
      this.error(`Invalid parallelism ${flags.parallelism}.`);
    }

    try {
      cli.action.start(`Creating scene...`);

      const client = await VertexClient.build({ basePath: flags.basePath });
      const template: ExtendedSceneTemplate = JSON.parse(
        readFileSync(flags.template, Utf8)
      );
      const createSceneItemReqFactoriesByDepth: ((
        suppliedIdToSceneItemId: Map<string, string>
      ) => CreateSceneItemRequest)[][] = groupBy(
        template.items,
        (i) => i.depth
      ).map((g) =>
        g.map(
          (i) => (
            suppliedIdToSceneItemId: Map<string, string>
          ): CreateSceneItemRequest => ({
            data: {
              attributes: {
                materialOverride: i.materialOverride,
                // parent: i.parentId
                //   ? suppliedIdToSceneItemId.get(i.parentId)
                //   : undefined,
                suppliedId: i.suppliedId,
                transform: i.transform,
                visible: true,
              },
              relationships: {
                source: {
                  data: {
                    id: {
                      suppliedPartId: i.suppliedPartId,
                      suppliedRevisionId: i.suppliedRevisionId,
                    },
                    type: PartRevisionRelationshipDataTypeEnum.PartRevision,
                  },
                },
              },
              type: 'scene-item',
            },
          })
        )
      );

      const sceneId = await createSceneWithSceneItems({
        client,
        verbose: flags.verbose,
        createSceneReq: () => ({
          data: {
            attributes: {},
            type: SceneRelationshipDataTypeEnum.Scene,
          },
        }),
        createSceneItemReqFactoriesByDepth,
      });

      cli.action.stop();
      this.log(`Created scene ${sceneId}.`);
    } catch (error) {
      if (error.vertexErrorMessage) this.error(error.vertexErrorMessage);
      throw error;
    }
  }
}

interface CreateSceneWithSceneItemsArgs {
  client: VertexClient;
  verbose: boolean;
  createSceneReq: () => CreateSceneRequest;
  /*
  2D-array by depth. This allows awaiting creation of each depth in order to set
  the parent relationship for children at lower depths.
    [
      [...] // Items at depth 0 (root items)
      [...] // Items at depth 1
      ...
    ]
  */
  createSceneItemReqFactoriesByDepth: ((
    suppliedIdToSceneItemId: Map<string, string>
  ) => CreateSceneItemRequest)[][];
}

export async function createSceneWithSceneItems(
  args: CreateSceneWithSceneItemsArgs
): Promise<string> {
  const createSceneRes = await args.client.scenes.createScene({
    data: {
      attributes: {},
      type: SceneRelationshipDataTypeEnum.Scene,
    },
  });
  const sceneId = createSceneRes.data.data.id;
  const suppliedIdToSceneItemId = new Map<string, string>();

  /* eslint-disable no-await-in-loop */
  for (const reqFactoriesAtDepth of args.createSceneItemReqFactoriesByDepth) {
    const responses = await Promise.allSettled(
      reqFactoriesAtDepth.map((reqFactory) => {
        return createSceneItem({
          client: args.client,
          verbose: args.verbose,
          sceneId,
          createSceneItemReq: () => reqFactory(suppliedIdToSceneItemId),
        });
      })
    );
    const failures = (responses.filter(
      (p) => p.status === 'rejected'
    ) as PromiseRejectedResult[]).map((p) =>
      p.reason.vertexErrorMessage
        ? p.reason.vertexErrorMessage
        : p.reason.message
    );

    // If any in this group failed, exit with error.
    if (failures.length > 0) throw new Error(failures.join('\n\n'));

    (responses.filter(
      (p) => p.status === 'fulfilled'
    ) as PromiseFulfilledResult<SceneItem>[]).forEach((si) =>
      suppliedIdToSceneItemId.set(
        si.value.data.attributes.suppliedId,
        si.value.data.id
      )
    );
  }
  /* eslint-enable no-await-in-loop */

  await args.client.scenes.updateScene(sceneId, {
    data: {
      attributes: {
        camera: { type: CameraFitTypeEnum.FitVisibleSceneItems },
      },
      type: SceneRelationshipDataTypeEnum.Scene,
    },
  });

  return sceneId;
}
