import { flags } from '@oclif/command';
import { logError, VertexClient } from '@vertexvis/vertex-api-client';
import BaseCommand from '../base';

export default class CreateStreamKey extends BaseCommand {
  public static description = `Generate a stream-key for a scene.`;

  public static examples = [
    `$ vertex create-stream-key f79d4760-0b71-44e4-ad0b-22743fdd4ca3
Created stream-key 'hBXAoQdnsHVhgDZkxeLEPQVxPJ600QwDMdgq' expiring in 600 seconds.
`,
  ];

  public static args = [{ name: 'id' }];

  public static flags = {
    ...BaseCommand.flags,
    expiry: flags.integer({
      char: 'k',
      description: `Expiry in seconds to set on stream-key.`,
      default: 600,
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { id },
      flags: { basePath, expiry },
    } = this.parse(CreateStreamKey);
    if (expiry < 1) {
      this.error(`Invalid expiry ${expiry}.`);
    }

    try {
      const client = await VertexClient.build({ basePath: basePath });
      const streamKeyRes = await client.streamKeys.createSceneStreamKey({
        id,
        createStreamKeyRequest: {
          data: {
            attributes: {
              expiry: expiry,
            },
            type: 'stream-key',
          },
        },
      });

      this.log(
        `Created stream-key '${streamKeyRes.data.data.attributes.key}' expiring in ${expiry} seconds.`
      );
    } catch (error) {
      logError(error, this.error);
    }
  }
}
