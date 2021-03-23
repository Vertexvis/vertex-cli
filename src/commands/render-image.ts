import { AxiosResponse } from 'axios';
import { flags } from '@oclif/command';
import {
  logError,
  RenderImageArgs,
  renderPartRevision,
  renderScene,
  renderSceneView,
} from '@vertexvis/vertex-api-client';
import { createWriteStream, writeFile } from 'fs-extra';
import { cli } from 'cli-ux';
import BaseRenderCommand from '../lib/base-render';
import { vertexClient } from '../lib/client';
import {
  createFile,
  generateHtml,
  validate,
  validateImage,
} from '../lib/renderer';

export default class RenderImage extends BaseRenderCommand {
  public static description = `Render an image for a scene, scene-view, or part-revision.`;

  public static examples = [
    `$ vertex render-image f79d4760-0b71-44e4-ad0b-22743fdd4ca3
f79d4760-0b71-44e4-ad0b-22743fdd4ca3.jpg
`,
  ];

  public static args = [{ name: 'id' }];

  public static flags = {
    ...BaseRenderCommand.flags,
    viewer: flags.boolean({
      description: 'Create Web SDK Viewer HTML instead of jpg image.',
      default: false,
    }),
    resource: flags.string({
      char: 'r',
      description: 'Resource type of ID provided.',
      options: ['scene', 'scene-view', 'part-revision'],
      default: 'scene',
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { id },
      flags: { height, output, resource, verbose, viewer, width },
    } = this.parse(RenderImage);
    const basePath = this.parsedFlags?.basePath;
    validate({ height, onError: this.error, width });
    if (viewer && resource !== 'scene')
      this.error(`--viewer flag only allowed for scene resources.`);

    this.log(
      'WARNING: This command is deprecated and will soon be removed. ' +
        'Use `vertex scenes:render`, `vertex scene-views:render`, or ' +
        '`vertex part-revisions:render` instead.\n'
    );

    try {
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

        cli.open(out);
        this.log(out);
      } else {
        const renderRes = await render(
          {
            client,
            onMsg: console.error,
            renderReq: {
              id,
              height: height,
              width: width,
            },
            verbose,
          },
          resource
        );
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
      }
    } catch (error) {
      logError(error, this.error);
    }
  }
}

async function render(
  args: RenderImageArgs,
  resource: string
): Promise<AxiosResponse<NodeJS.ReadableStream>> {
  switch (resource) {
    case 'part-revision':
      return renderPartRevision<NodeJS.ReadableStream>(args);
    case 'scene':
      return renderScene<NodeJS.ReadableStream>(args);
    case 'scene-view':
      return renderSceneView<NodeJS.ReadableStream>(args);
    default:
      throw new Error(`Invalid resource ${resource}`);
  }
}
