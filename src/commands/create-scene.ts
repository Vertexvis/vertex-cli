import { flags } from '@oclif/command';
import {
  groupBy,
  createSceneFromTemplateFile,
  CreateSceneItemRequest,
  createSceneWithSceneItems,
  FileRelationshipDataTypeEnum,
  SceneData,
  SceneItemRelationshipDataTypeEnum,
  SceneRelationshipDataTypeEnum,
  SceneTemplateRelationshipDataTypeEnum,
  Utf8,
  VertexClient,
} from '@vertexvis/vertex-api-client';
import cli from 'cli-ux';
import { lstatSync, readFileSync } from 'fs';
import { basename } from 'path';
import BaseCommand from '../base';
import { ExtendedSceneTemplate } from '../create-template';

export default class CreateScene extends BaseCommand {
  public static description = `Given JSON file in Vertex's scene template format, create scene in Vertex.`;

  public static examples = [
    `$ vertex create-scene -i scene-template-supplied-id -t path/to/template/file
Creating scene... done
Created scene f79d4760-0b71-44e4-ad0b-22743fdd4ca3.
`,
  ];

  public static args = [{ name: 'path' }];

  public static flags = {
    ...BaseCommand.flags,
    experimental: flags.boolean({
      description: 'Create scene with scene-items.',
    }),
    parallelism: flags.integer({
      char: 'p',
      description: 'Number of scene-items to create in parallel.',
      default: 20,
    }),
    template: flags.string({
      char: 't',
      description: 'Path to scene template.',
      required: true,
    }),
    templateSuppliedId: flags.string({
      char: 'i',
      description: 'Scene template supplied ID.',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = this.parse(CreateScene);
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
      let scene: SceneData;
      if (flags.experimental) {
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
                  source: i.fileName
                    ? {
                        suppliedPartId: i.suppliedPartId,
                        suppliedRevisionId: i.suppliedRevisionId,
                      }
                    : undefined,
                  suppliedId: i.suppliedId,
                  transform: i.transform,
                  visible: true,
                },
                relationships: {
                  parent: i.parentId
                    ? {
                        data: {
                          id: suppliedIdToSceneItemId.get(i.parentId) || '',
                          type: SceneItemRelationshipDataTypeEnum.SceneItem,
                        },
                      }
                    : undefined,
                },
                type: 'scene-item',
              },
            })
          )
        );

        scene = await createSceneWithSceneItems({
          client,
          parallelism: flags.parallelism,
          verbose: flags.verbose,
          createSceneReq: () => ({
            data: {
              attributes: {},
              type: SceneRelationshipDataTypeEnum.Scene,
            },
          }),
          createSceneItemReqFactoriesByDepth,
        });
      } else {
        scene = await createSceneFromTemplateFile({
          client,
          verbose: flags.verbose,
          fileData: readFileSync(flags.template),
          createFileReq: {
            data: {
              attributes: {
                name: basename(flags.template),
                suppliedId: flags.templateSuppliedId,
              },
              type: 'file',
            },
          },
          createSceneReq: (templateId) => ({
            data: {
              attributes: {},
              relationships: {
                source: {
                  data: {
                    id: templateId,
                    type: SceneTemplateRelationshipDataTypeEnum.SceneTemplate,
                  },
                },
              },
              type: SceneRelationshipDataTypeEnum.Scene,
            },
          }),
          createSceneTemplateReq: (fileId) => ({
            data: {
              attributes: { suppliedId: flags.templateSuppliedId },
              relationships: {
                source: {
                  data: { id: fileId, type: FileRelationshipDataTypeEnum.File },
                },
              },
              type: SceneTemplateRelationshipDataTypeEnum.SceneTemplate,
            },
          }),
        });
      }

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
      if (error.vertexErrorMessage) this.error(error.vertexErrorMessage);
      throw error;
    }
  }
}
