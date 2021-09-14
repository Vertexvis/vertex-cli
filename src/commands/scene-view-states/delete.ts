import { logError, VertexError } from '@vertexvis/api-client-node';
import cli from 'cli-ux';

import BaseDeleteCommand from '../../lib/base-delete';
import { vertexClient } from '../../lib/client';
import { deleter, sceneViewStateDeleter, validate } from '../../lib/deleter';

export default class Delete extends BaseDeleteCommand {
  public static description = `Delete scene-view-states.`;

  public static examples = [
    `$ vertex scene-view-states:delete 54964c61-05d8-4f37-9638-18f7c4960c80
Deleted scene view state 54964c61-05d8-4f37-9638-18f7c4960c80.
Deleting scene view state(s)...... done
`,
  ];

  public static args = [{ name: 'id' }];

  public static flags = BaseDeleteCommand.flags;

  public async run(): Promise<void> {
    const {
      args: { id },
      flags: { all, verbose },
    } = this.parse(Delete);
    const basePath = this.parsedFlags?.basePath;
    const resource = 'scene-view-state';
    await validate({ all, id, onError: this.error, resource });

    try {
      cli.action.start(`Deleting ${resource}(s)...`);

      await deleter({
        all,
        deleter: sceneViewStateDeleter({
          client: await vertexClient(basePath, this.userConfig),
          verbose,
        }),
        id,
        onLog: this.log,
        resource,
      });

      cli.action.stop();
    } catch (error) {
      logError(error as VertexError, this.error);
    }
  }
}
