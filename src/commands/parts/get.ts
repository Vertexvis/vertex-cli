import { logError } from '@vertexvis/api-client-node';

import BaseGetCommand from '../../lib/base-get';
import { vertexClient } from '../../lib/client';
import { getterFn, partGetter } from '../../lib/getter';

export default class Get extends BaseGetCommand {
  public static description = `Get a part.`;

  public static examples = [
    `$ vertex parts:get 54964c61-05d8-4f37-9638-18f7c4960c80
Id                                   Name
54964c61-05d8-4f37-9638-18f7c4960c80 my-part
`,
  ];

  public static args = [{ name: 'id' }];

  public static flags = BaseGetCommand.flags;

  public async run(): Promise<void> {
    const {
      args: { id },
      flags: { extended, verbose },
    } = this.parse(Get);
    const basePath = this.parsedFlags?.basePath;

    try {
      return getterFn({
        extended,
        id,
        getter: partGetter({
          client: await vertexClient(basePath, this.userConfig),
          verbose,
        }),
      });
    } catch (error) {
      logError(error, this.error);
    }
  }
}
