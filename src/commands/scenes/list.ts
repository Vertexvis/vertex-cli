import { logError } from '@vertexvis/vertex-api-client';
import BaseListCommand from '../../lib/base-list';
import { vertexClient } from '../../lib/client';
import { sceneGetter, getter } from '../../lib/getter';

export default class List extends BaseListCommand {
  public static description = `Get resources.`;

  public static examples = [
    `$ vertex scenes:list
Id                                   Name
54964c61-05d8-4f37-9638-18f7c4960c80 my-scene-1
a8070713-e48e-466b-b4bb-b3132895d5ce my-scene-2
`,
  ];

  public static flags = BaseListCommand.flags;

  public async run(): Promise<void> {
    const {
      flags: { cursor, extended, verbose },
    } = this.parse(List);
    const basePath = this.parsedFlags?.basePath;

    try {
      return getter({
        all: true,
        cursor,
        extended,
        getter: sceneGetter({
          client: await vertexClient(basePath, this.userConfig),
          verbose,
        }),
      });
    } catch (error) {
      logError(error, this.error);
    }
  }
}
