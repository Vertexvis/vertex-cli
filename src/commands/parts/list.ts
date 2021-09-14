import { logError, VertexError } from '@vertexvis/api-client-node';

import BaseListCommand from '../../lib/base-list';
import { vertexClient } from '../../lib/client';
import { getterFn, partGetter } from '../../lib/getter';

export default class List extends BaseListCommand {
  public static description = `Get parts.`;

  public static examples = [
    `$ vertex parts:list
Id                                   Name
54964c61-05d8-4f37-9638-18f7c4960c80 my-part-1
a8070713-e48e-466b-b4bb-b3132895d5ce my-part-2
`,
  ];

  public static flags = BaseListCommand.flags;

  public async run(): Promise<void> {
    const {
      flags: { cursor, extended, verbose },
    } = this.parse(List);
    const basePath = this.parsedFlags?.basePath;

    try {
      return getterFn({
        all: true,
        cursor,
        extended,
        getter: partGetter({
          client: await vertexClient(basePath, this.userConfig),
          verbose,
        }),
      });
    } catch (error) {
      logError(error as VertexError, this.error);
    }
  }
}
