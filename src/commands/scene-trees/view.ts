import { logError, VertexError } from '@vertexvis/api-client-node';

import BaseCommand from '../../lib/base';
import { vertexClient } from '../../lib/client';
import { fetchSceneItemTree } from '../../lib/scene-items';

export default class View extends BaseCommand {
  public static description = `View a scene's item tree.`;

  public static examples = [
    `$ vertex scene-trees:view 54964c61-05d8-4f37-9638-18f7c4960c80
[TreeNode (root) has 3 child nodes, data=[...]]
└── [TreeNode  has 2 child nodes, data=[...]]
`,
  ];

  public static args = [{ name: 'sceneId', required: true }];

  public static flags = BaseCommand.flags;

  public async run(): Promise<void> {
    const {
      args: { sceneId },
    } = this.parse(View);
    const basePath = this.parsedFlags?.basePath;

    try {
      this.log(`Fetching scene item tree for scene ID: ${sceneId}...`);
      const root = await fetchSceneItemTree(
        await vertexClient(basePath, this.userConfig),
        sceneId
      );
      this.log(`Fetched ${root.size} scene items.`);
      this.log(root.dump());
    } catch (error) {
      logError(error as VertexError, this.error);
    }
  }
}
