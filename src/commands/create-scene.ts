import { flags } from '@oclif/command';
import {
  createSceneFromTemplateFile,
  FileRelationshipDataTypeEnum,
  SceneRelationshipDataTypeEnum,
  SceneTemplateRelationshipDataTypeEnum,
  VertexClient,
} from '@vertexvis/vertex-api-client';
import { lstatSync, readFileSync } from 'fs';
import { basename } from 'path';
import BaseCommand from '../base';

export default class CreateTemplate extends BaseCommand {
  public static description = `Given JSON file in Vertex's scene template format, create scene in Vertex.`;

  public static examples = [
    `$ vertex create-scene -i scene-template-supplied-id -t path/to/template/file
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
    templateSuppliedId: flags.string({
      char: 'i',
      description: 'Scene template supplied ID.',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = this.parse(CreateTemplate);
    if (!lstatSync(flags.template).isFile()) {
      this.error(`'${flags.template}' is not a valid file path, exiting.`);
    }

    const client = await VertexClient.build({ basePath: flags.basePath });
    const sceneId = await createSceneFromTemplateFile({
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

    this.log(`Created scene ${sceneId}.`);
  }
}
