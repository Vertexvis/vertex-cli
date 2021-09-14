import { logError, VertexError } from '@vertexvis/api-client-node';

import BaseGetCommand from '../../lib/base-get';
import { vertexClient } from '../../lib/client';
import { getterFn, sceneGetter } from '../../lib/getter';

export default class Get extends BaseGetCommand {
  public static description = `Get a scene.`;

  public static examples = [
    `$ vertex scenes:get 54964c61-05d8-4f37-9638-18f7c4960c80
Id                                   Name
54964c61-05d8-4f37-9638-18f7c4960c80 my-scene
`,
  ];

  public static args = [{ name: 'id', required: true }];

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
        getter: sceneGetter({
          client: await vertexClient(basePath, this.userConfig),
          verbose,
        }),
      });
    } catch (error) {
      logError(error as VertexError, this.error);
    }
  }
}
