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
import BaseCommand from '../base';
import { cli } from 'cli-ux';
import { vertexClient } from '../utils';

export default class RenderImage extends BaseCommand {
  public static description = `Render an image for a scene, scene-view, or part-revision.`;

  public static examples = [
    `$ vertex render-image f79d4760-0b71-44e4-ad0b-22743fdd4ca3
f79d4760-0b71-44e4-ad0b-22743fdd4ca3.jpg
`,
  ];

  public static args = [{ name: 'id' }];

  public static flags = {
    ...BaseCommand.flags,
    viewer: flags.boolean({
      description: 'Create Web SDK Viewer HTML instead of jpg image.',
      default: false,
    }),
    height: flags.integer({
      char: 'h',
      description: 'Image height.',
      default: 100,
    }),
    output: flags.string({
      char: 'o',
      description: 'Path to output file.',
    }),
    resource: flags.string({
      char: 'r',
      description: 'Resource type of ID provided.',
      options: ['scene', 'scene-view', 'part-revision'],
      default: 'scene',
    }),
    width: flags.integer({
      char: 'w',
      description: 'Image width.',
      default: 100,
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { id },
      flags: { height, output, resource, verbose, viewer, width },
    } = this.parse(RenderImage);
    const basePath = this.parsedFlags?.basePath;
    if (height < 1) this.error(`Invalid height ${height}.`);
    if (width < 1) this.error(`Invalid width ${width}.`);
    if (viewer && resource !== 'scene')
      this.error(`--viewer flag only allowed for scene resources.`);

    try {
      const client = await vertexClient(basePath, this.userConfig);
      if (viewer) {
        const streamKeyRes = await client.streamKeys.createSceneStreamKey({
          id: id,
          createStreamKeyRequest: {
            data: {
              attributes: {},
              type: 'stream-key',
            },
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
        if (parseInt(renderRes.headers['content-length'], 10) < 140) {
          this.error(`Received empty image for ${resource} ${id}.`);
        }

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

async function createFile(
  stream: NodeJS.ReadableStream,
  path: string
): Promise<void> {
  return new Promise((resolve) => {
    const ws = createWriteStream(path);
    stream.pipe(ws);
    ws.on('finish', resolve);
  });
}

function generateHtml(
  streamKey: string,
  basePath: string,
  clientId?: string
): string {
  const config = basePath.includes('platdev')
    ? `platdev`
    : basePath.includes('platstaging')
    ? `platstaging`
    : undefined;

  return `<!DOCTYPE html>
<html lang="">
  <head>
    <meta charset="utf-8" />
    <title>Getting Started with Vertex</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/@vertexvis/viewer@0.9.x/dist/viewer/viewer.css"
    />
    <style>
      html,
      body,
      .viewer {
        width: 100%;
        height: 100%;
        padding: 0;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <script
      type="module"
      src="https://unpkg.com/@vertexvis/viewer@0.9.x/dist/viewer/viewer.esm.js"
    ></script>
    <script
      nomodule
      src="https://unpkg.com/@vertexvis/viewer@0.9.x/dist/viewer.js"
    ></script>

    <vertex-viewer
      class="viewer"
      client-id="${clientId || `[CLIENT_ID]`}"
    >
    </vertex-viewer>

    <script type="module">
      import { defineCustomElements } from 'https://unpkg.com/@vertexvis/viewer@0.9.x/dist/esm/loader.js';
      import { ColorMaterial } from 'https://unpkg.com/@vertexvis/viewer@0.9.x/dist/esm/index.js';

      async function main() {
        await defineCustomElements(window);

        const viewer = document.querySelector('vertex-viewer');
        ${config ? `viewer.configEnv = '${config}';` : ''}
        await viewer.load('urn:vertexvis:stream-key:${streamKey}');

        viewer.addEventListener('tap', async (event) => {
          const scene = await viewer.scene();
          const raycaster = scene.raycaster();
          const result = await raycaster.hitItems(event.detail.position);
          const [hit] = result.hits;

          if (hit != null) {
            await scene
              .items((op) => [
                op.where((q) => q.all()).deselect(),
                op
                  .where((q) => q.withItemId(hit.itemId.hex))
                  .select(ColorMaterial.create(255, 255, 0)),
              ])
              .execute();
          } else {
            await scene
              .items((op) => op.where((q) => q.all()).deselect())
              .execute();
          }
        });
      }

      main();
    </script>
  </body>
</html>`;
}
