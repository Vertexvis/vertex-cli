import { flags } from '@oclif/command';
import { logError, VertexError } from '@vertexvis/api-client-node';

import BaseCommand from '../../lib/base';
import { vertexClient } from '../../lib/client';

export default class Create extends BaseCommand {
  public static readonly description = `Create a stream key for a scene.`;

  public static readonly examples = [
    `$ vertex stream-keys:create --sceneId f79d4760-0b71-44e4-ad0b-22743fdd4ca3
hBXAoQdnsHVhgDZkxeLEPQVxPJ600QwDMdgq
`,
  ];

  public static readonly flags = {
    ...BaseCommand.flags,
    expiry: flags.integer({
      char: 'k',
      description: `Expiry in seconds to set on stream-key.`,
      default: 600,
    }),
    sceneId: flags.string({
      description: `Scene to access with stream key.`,
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      flags: { expiry, sceneId },
    } = this.parse(Create);
    const basePath = this.parsedFlags?.basePath;
    if (expiry < 1) {
      this.error(`Invalid expiry ${expiry}.`);
    }

    try {
      const client = await vertexClient(basePath, this.userConfig);
      const createRes = await client.streamKeys.createSceneStreamKey({
        id: sceneId,
        createStreamKeyRequest: {
          data: {
            attributes: { expiry: expiry },
            type: 'stream-key',
          },
        },
      });

      this.log(createRes.data.data.attributes.key);
    } catch (error) {
      logError(error as VertexError, this.error);
    }
  }
}
