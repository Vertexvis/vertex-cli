import { flags } from '@oclif/command';
import { logError, VertexError } from '@vertexvis/api-client-node';

import BaseCommand from '../../lib/base';
import { vertexClient } from '../../lib/client';
import { fetchSceneItemTree } from '../../lib/scene-items';
import { serializeTreeToZipFile } from '../../lib/tree-serializer';

export default class Export extends BaseCommand {
  public static readonly description = `Export a scene's scene item tree to a ZIP file.`;

  public static readonly examples = [
    `$ vertex scene-trees:export 54964c61-05d8-4f37-9638-18f7c4960c80
Tree saved to: 54964c61-05d8-4f37-9638-18f7c4960c80.zip
`,
  ];

  public static readonly args = [{ name: 'sceneId', required: true }];

  public static readonly flags = {
    ...BaseCommand.flags,
    output: flags.string({
      char: 'o',
      description: 'Output file path.',
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { sceneId },
      flags: { output },
    } = this.parse(Export);
    const basePath = this.parsedFlags?.basePath;
    const filePath = output ?? `${sceneId}.zip`;

    try {
      this.log(`Fetching scene item tree for scene ID: ${sceneId}...`);
      const root = await fetchSceneItemTree(
        await vertexClient(basePath, this.userConfig),
        sceneId
      );
      if (root === undefined) {
        throw new Error(`Failed to locate root scene item for scene.`);
      } else {
        this.log(`Fetched ${root.size} scene items. Saving to file...`);
        await serializeTreeToZipFile({
          root,
          filePath,
          entryName: `${sceneId}.json`,
        });
        this.log(`Tree saved to: ${filePath}`);
      }
    } catch (error) {
      logError(error as VertexError, this.error);
    }
  }
}
