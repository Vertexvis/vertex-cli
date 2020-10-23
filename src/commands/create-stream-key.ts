import { flags } from '@oclif/command';
import { VertexClient } from '@vertexvis/vertex-api-client';
import BaseCommand from '../base';

export default class CreateTemplate extends BaseCommand {
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
    const { args, flags } = this.parse(CreateTemplate);
    if (flags.expiry < 1) {
      this.error(`Invalid expiry ${flags.expiry}.`);
    }

    try {
      const client = await VertexClient.build({ basePath: flags.basePath });
      const streamKeyRes = await client.streamKeys.createSceneStreamKey(
        args.id,
        {
          data: {
            attributes: {
              expiry: flags.expiry,
            },
            type: 'stream-key',
          },
        }
      );

      this.log(
        `Created stream-key '${streamKeyRes.data.data.attributes.key}' expiring in ${flags.expiry} seconds.`
      );
    } catch (error) {
      if (error.vertexErrorMessage) this.error(error.vertexErrorMessage);
      throw error;
    }
  }
}
