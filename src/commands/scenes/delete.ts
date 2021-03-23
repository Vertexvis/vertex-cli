import { logError } from '@vertexvis/vertex-api-client';
import cli from 'cli-ux';
import BaseDeleteCommand from '../../lib/base-delete';
import { vertexClient } from '../../lib/client';
import { deleter, sceneDeleter, validate } from '../../lib/deleter';

export default class Delete extends BaseDeleteCommand {
  public static description = `Delete scenes.`;

  public static examples = [
    `$ vertex scenes:delete 54964c61-05d8-4f37-9638-18f7c4960c80
Deleted scene 54964c61-05d8-4f37-9638-18f7c4960c80.
Deleting scene(s)...... done
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
    const resource = 'scene';
    await validate({ all, id, onError: this.error, resource });

    try {
      cli.action.start(`Deleting ${resource}(s)...`);

      await deleter({
        all,
        deleter: sceneDeleter({
          client: await vertexClient(basePath, this.userConfig),
          verbose,
        }),
        id,
        onLog: this.log,
        resource,
      });

      cli.action.stop();
    } catch (error) {
      logError(error, this.error);
    }
  }
}
