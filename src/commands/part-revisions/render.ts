import { logError, renderPartRevision } from '@vertexvis/vertex-api-client';
import { cli } from 'cli-ux';
import { createWriteStream } from 'fs-extra';
import BaseRenderCommand from '../../lib/base-render';
import { vertexClient } from '../../lib/client';
import { createFile, validate, validateImage } from '../../lib/renderer';

export default class Render extends BaseRenderCommand {
  public static description = `Render a part revision.`;

  public static examples = [
    `$ vertex part-revisions:render 54964c61-05d8-4f37-9638-18f7c4960c80
54964c61-05d8-4f37-9638-18f7c4960c80.jpg
`,
  ];

  public static args = [{ name: 'id' }];

  public static flags = BaseRenderCommand.flags;

  public async run(): Promise<void> {
    const {
      args: { id },
      flags: { height, output, verbose, width },
    } = this.parse(Render);
    validate({ height, onError: this.error, width });

    try {
      const resource = 'part-revision';
      const renderRes = await renderPartRevision<NodeJS.ReadableStream>({
        client: await vertexClient(this.parsedFlags?.basePath, this.userConfig),
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

      cli.open(out);
      this.log(out);
    } catch (error) {
      logError(error, this.error);
    }
  }
}
