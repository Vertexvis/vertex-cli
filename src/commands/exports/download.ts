import { logError, VertexError } from '@vertexvis/api-client-node';

import BaseGetCommand from '../../lib/base-get';
import { vertexClient } from '../../lib/client';
import { exportGetter } from '../../lib/getter';

export default class Get extends BaseGetCommand {
  public static description = `Download an export.`;

  public static examples = [
    `$ vertex exports:download 54964c61-05d8-4f37-9638-18f7c4960c80
Export saved as: 54964c61-05d8-4f37-9638-18f7c4960c80
`,
  ];

  public static args = [{ name: 'id', required: true }];

  public static flags = BaseGetCommand.flags;

  public async run(): Promise<void> {
    const {
      args: { id },
      flags: { verbose },
    } = this.parse(Get);
    const basePath = this.parsedFlags?.basePath;

    try {
      exportGetter(
        {
          client: await vertexClient(basePath, this.userConfig),
          verbose,
        },
        true
      ).getOne(id);
    } catch (error) {
      logError(error as VertexError, this.error);
    }
  }
}
