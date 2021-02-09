import { AxiosResponse } from 'axios';
import { flags } from '@oclif/command';
import {
  logError,
  RenderImageArgs,
  renderPartRevision,
  renderScene,
  renderSceneView,
  VertexClient,
} from '@vertexvis/vertex-api-client';
import { createWriteStream, writeFileSync } from 'fs';
import BaseCommand from '../base';

export default class RenderImage extends BaseCommand {
  public static description = `Render an image for a scene, scene-view, or part-revision.`;

  public static examples = [
    `$ vertex render-image f79d4760-0b71-44e4-ad0b-22743fdd4ca3
Image written to 'f79d4760-0b71-44e4-ad0b-22743fdd4ca3.jpg'.
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
      flags: { basePath, height, output, resource, verbose, viewer, width },
    } = this.parse(RenderImage);
    if (height < 1) this.error(`Invalid height ${height}.`);
    if (width < 1) this.error(`Invalid width ${width}.`);
    if (viewer && resource !== 'scene')
      this.error(`--viewer flag only allowed for scene resources.`);

    try {
      const client = await VertexClient.build({ basePath: basePath });
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
        writeFileSync(
          out,
          generateHtml(key, basePath, process.env.VERTEX_CLIENT_ID)
        );

        this.log(`Viewer HTML written to '${out}'.`);
      } else {
        const renderRes = await render(
          {
            client,
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

        this.log(`Image written to '${out}'.`);
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

  return `<html>
  <head>
    <meta charset="utf-8" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/@vertexvis/viewer@0.9.x/dist/viewer/viewer.css"
    />
    <script
      type="module"
      src="https://unpkg.com/@vertexvis/viewer@0.9.x/dist/viewer/viewer.esm.js"
    ></script>
    <script
      nomodule
      src="https://unpkg.com/@vertexvis/viewer@0.9.x/dist/viewer.js"
    ></script>
  </head>
  <body>
    <vertex-viewer id="viewer" class="viewer" client-id="${
      clientId || `[CLIENT_ID]`
    }" style="width: auto; height: auto">
    </vertex-viewer>

    <script type="module">
      import { ColorMaterial } from 'https://unpkg.com/@vertexvis/viewer@0.9.x/dist/esm/index.mjs';
      import { defineCustomElements } from 'https://unpkg.com/@vertexvis/viewer@0.9.x/dist/esm/loader.mjs';

      document.addEventListener('DOMContentLoaded', () => {
        main();
      });

      async function main() {
        await defineCustomElements();
        const viewer = document.querySelector('vertex-viewer');
        ${config ? `viewer.configEnv = '${config}';` : ''}
        await viewer.load('urn:vertexvis:stream-key:${streamKey}');

        viewer.addEventListener('tap', async (event) => {
          const { position } = event.detail;
          const scene = await viewer.scene();
          const raycaster = await scene.raycaster();

          const result = await raycaster.hitItems(position);

          if (result.hits && result.hits.length == 0) {
            await scene
              .items((op) => op.where((q) => q.all()).clearMaterialOverrides())
              .execute();
          } else {
            await scene
              .items((op) => [
                op.where((q) => q.all()).clearMaterialOverrides(),
                op
                  .where((q) => q.withItemId(result.hits[0].itemId.hex))
                  .materialOverride(ColorMaterial.fromHex('#ff0000')),
              ])
              .execute();
          }
        });
      }
    </script>
  </body>
</html>`;
}
