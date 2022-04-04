import { flags } from '@oclif/command';
import {
  createExport,
  CreateExportReq,
  Export,
  logError,
  VertexError,
} from '@vertexvis/api-client-node';

import BaseCommand from '../../lib/base';
import { vertexClient } from '../../lib/client';

type CreateExportFn = (args: CreateExportReq) => Promise<Export>;

export default class Create extends BaseCommand {
  public static description = `Create an export for a scene.`;

  public static examples = [
    `$ vertex exports:create --sceneId f79d4760-0b71-44e4-ad0b-22743fdd4ca3 --format jt
bf0c4343-96eb-4aa9-8dee-e79c6458dedf
`,
  ];

  public static flags = {
    ...BaseCommand.flags,
    sceneId: flags.string({
      description: `Scene to export.`,
      required: true,
    }),
    format: flags.string({
      description: `Type of file to export. Currently supports 'step' and 'jt'`,
      required: true,
    }),
  };

  public async run(): Promise<void> {
    await this.innerRun(createExport);
  }

  public async innerRun(createExport: CreateExportFn): Promise<void> {
    const {
      flags: { sceneId, format },
    } = this.parse(Create);
    const basePath = this.parsedFlags?.basePath;

    try {
      const client = await vertexClient(basePath, this.userConfig);
      const createRes = await createExport({
        client: client,
        createExportReq: () => ({
          data: {
            attributes: {
              config: {
                format: format,
              },
            },
            type: 'export',
            relationships: {
              source: {
                data: {
                  id: sceneId,
                  type: 'scene',
                },
              },
            },
          },
        }),
        onMsg: this.log,
        verbose: this.parsedFlags?.verbose,
      });

      this.log(createRes.data.id);
    } catch (error) {
      logError(error as VertexError, this.error);
    }
  }
}
