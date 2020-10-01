import { Command, flags } from '@oclif/command';
import {
  createSceneFromTemplateFile,
  Environment,
  Environments,
  FileRelationshipDataTypeEnum,
  SceneRelationshipDataTypeEnum,
  SceneTemplateRelationshipDataTypeEnum,
  VertexClient,
} from '@vertexvis/vertex-api-client';
import { lstatSync, readFileSync } from 'fs';
import { join, sep } from 'path';

export default class CreateTemplate extends Command {
  public static description = `Given JSON file in Vertex's scene template format, create scene in Vertex.`;

  public static examples = [
    `$ vertex create-scene -i scene-template-supplied-id -t path/to/template/file
Created scene f79d4760-0b71-44e4-ad0b-22743fdd4ca3.
`,
  ];

  public static args = [{ name: 'path' }];

  public static flags = {
    help: flags.help({ char: 'h' }),
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
    environment: flags.string({
      char: 'e',
      description: 'Vertex API environment.',
      options: Environments,
      default: 'platprod',
    }),
    verbose: flags.boolean({ char: 'v' }),
  };

  public async run(): Promise<void> {
    const { flags } = this.parse(CreateTemplate);
    const templatePath = flags.template.startsWith(join('.', sep))
      ? flags.template.substring(2)
      : flags.template;
    if (!lstatSync(templatePath).isFile()) {
      this.error(`'${templatePath}' is not a valid file path, exiting.`);
    }

    const client = await VertexClient.build({
      environment: flags.environment as Environment,
    });
    const sceneId = await createSceneFromTemplateFile({
      client,
      verbose: flags.verbose,
      fileData: readFileSync(templatePath),
      createFileReq: {
        data: {
          attributes: {
            name: templatePath,
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
