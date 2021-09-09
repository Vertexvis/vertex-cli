import { flags } from '@oclif/command';
import { logError, VertexError } from '@vertexvis/api-client-node';

import BaseListCommand from '../../lib/base-list';
import { vertexClient } from '../../lib/client';
import { getterFn, sceneViewGetter } from '../../lib/getter';

export default class List extends BaseListCommand {
  public static description = `Get scene views.`;

  public static examples = [
    `$ vertex scene-views:list
Id                                   Name
54964c61-05d8-4f37-9638-18f7c4960c80 my-scene-view-1
a8070713-e48e-466b-b4bb-b3132895d5ce my-scene-view-2
`,
  ];

  public static flags = {
    ...BaseListCommand.flags,
    sceneId: flags.string({
      description: `Scene to list scene view states.`,
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      flags: { cursor, extended, sceneId, verbose },
    } = this.parse(List);
    const basePath = this.parsedFlags?.basePath;

    try {
      return getterFn({
        all: true,
        cursor,
        extended,
        id: sceneId,
        getter: sceneViewGetter({
          client: await vertexClient(basePath, this.userConfig),
          verbose,
        }),
      });
    } catch (error) {
      logError(error as VertexError, this.error);
    }
  }
}
