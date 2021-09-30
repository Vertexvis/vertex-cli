import { flags } from '@oclif/command';
import { logError, VertexError } from '@vertexvis/api-client-node';

import BaseCommand from '../../lib/base';
import { vertexClient } from '../../lib/client';

export default class Create extends BaseCommand {
  public static description = `Create a scene view for a scene.`;

  public static examples = [
    `$ vertex scene-views:create --sceneId f79d4760-0b71-44e4-ad0b-22743fdd4ca3
bf0c4343-96eb-4aa9-8dee-e79c6458dedf
`,
  ];

  public static flags = {
    ...BaseCommand.flags,
    sceneId: flags.string({
      description: `Scene to base scene view on.`,
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      flags: { sceneId },
    } = this.parse(Create);
    const basePath = this.parsedFlags?.basePath;

    try {
      const client = await vertexClient(basePath, this.userConfig);
      const createRes = await client.sceneViews.createSceneView({
        id: sceneId,
        createSceneViewRequest: {
          data: {
            attributes: {},
            type: 'scene-view',
          },
        },
      });

      this.log(createRes.data.data.id);
    } catch (error) {
      logError(error as VertexError, this.error);
    }
  }
}
