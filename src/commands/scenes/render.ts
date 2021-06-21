import { flags } from '@oclif/command';
import { logError, renderScene } from '@vertexvis/api-client-node';
import { cli } from 'cli-ux';
import { createWriteStream, writeFile } from 'fs-extra';

import BaseRenderCommand from '../../lib/base-render';
import { vertexClient } from '../../lib/client';
import {
  createFile,
  generateHtml,
  validate,
  validateImage,
} from '../../lib/renderer';

export default class Render extends BaseRenderCommand {
  public static description = `Render a scene.`;

  public static examples = [
    `$ vertex scenes:render 54964c61-05d8-4f37-9638-18f7c4960c80
54964c61-05d8-4f37-9638-18f7c4960c80.jpg
`,
  ];

  public static args = [{ name: 'id', required: true }];

  public static flags = {
    ...BaseRenderCommand.flags,
    viewer: flags.boolean({
      description: 'Create Web SDK Viewer HTML instead of jpg image.',
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { id },
      flags: { height, output, verbose, viewer, width },
    } = this.parse(Render);
    const basePath = this.parsedFlags?.basePath;
    validate({ height, onError: this.error, width });

    try {
      const resource = 'scene';
      const client = await vertexClient(basePath, this.userConfig);
      if (viewer) {
        const streamKeyRes = await client.streamKeys.createSceneStreamKey({
          id: id,
          createStreamKeyRequest: {
            data: { attributes: {}, type: 'stream-key' },
          },
        });
        const out = output || `${id}.html`;
        const key = streamKeyRes.data.data.attributes.key;
        if (!key) this.error('Error creating stream-key');
        await writeFile(
          out,
          generateHtml(key, basePath, this.userConfig?.client?.id)
        );

        await cli.open(out);
        this.log(out);
      } else {
        const renderRes = await renderScene<NodeJS.ReadableStream>({
          client,
          onMsg: console.error,
          renderReq: {
            id,
            height: height,
            width: width,
          },
          verbose,
        });
        validateImage({
          id,
          length: renderRes.headers['content-length'],
          onError: this.error,
          resource,
        });

        const out = output || `${id}.jpg`;
        renderRes.data.pipe(createWriteStream(out));
        await createFile(renderRes.data, out);

        await cli.open(out);
        this.log(out);
      }
    } catch (error) {
      logError(error, this.error);
    }
  }
}
