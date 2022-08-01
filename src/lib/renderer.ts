import { createWriteStream } from 'fs-extra';

export function validate({
  height,
  onError,
  width,
}: {
  height: number;
  onError: (msg: string) => void;
  width: number;
}): void {
  if (height < 1) onError(`Invalid height ${height}.`);
  if (width < 1) onError(`Invalid width ${width}.`);
}

export function validateImage({
  id,
  length,
  onError,
  resource,
}: {
  id: string;
  length: string;
  onError: (msg: string) => void;
  resource: string;
}): void {
  if (Number.parseInt(length, 10) < 140) {
    onError(`Received empty image for ${resource} ${id}.`);
  }
}

export function createFile(
  stream: NodeJS.ReadableStream,
  path: string
): Promise<void> {
  return new Promise((resolve) => {
    const ws = createWriteStream(path);
    stream.pipe(ws);
    ws.on('finish', resolve);
  });
}

export function generateHtml(
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
      href="https://unpkg.com/@vertexvis/viewer@0.15.x/dist/viewer/viewer.css"
    />
    <script
      type="module"
      src="https://unpkg.com/@vertexvis/viewer@0.15.x/dist/viewer/viewer.esm.js"
    ></script>
    <script
      nomodule
      src="https://unpkg.com/@vertexvis/viewer@0.15.x/dist/viewer.js"
    ></script>
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
    <vertex-viewer
      class="viewer"
    >
    </vertex-viewer>

    <script type="module">
      import { applyPolyfills, defineCustomElements } from 'https://unpkg.com/@vertexvis/viewer@0.15.x/loader/index.js';
      import { ColorMaterial } from 'https://unpkg.com/@vertexvis/viewer@0.15.x/dist/esm/index.mjs';

      async function main() {
        await applyPolyfills();
        await defineCustomElements(window);

        const viewer = document.querySelector('vertex-viewer');
        ${config ? `viewer.configEnv = '${config}';` : ''}
        await viewer.load('urn:vertexvis:stream-key:${streamKey}');
        let selectedItemId;

        viewer.addEventListener('tap', async (event) => {
          const scene = await viewer.scene();
          const raycaster = scene.raycaster();
          const result = await raycaster.hitItems(event.detail.position);
          const [hit] = result.hits;

          if (hit != null) {
            const itemId = hit.itemId?.hex;
            const suppliedId = hit.itemSuppliedId?.value;
            console.debug(
              \`Selected \${itemId}\${suppliedId ? \`, \${suppliedId}\` : ''}\`
            );

            await scene
              .items((op) => [
                  ...(selectedItemId
                  ? [op.where((q) => q.withItemId(selectedItemId)).deselect()]
                  : []),
                  op
                    .where((q) => q.withItemId(itemId))
                    .select(ColorMaterial.create(255, 255, 0)),
                ])
              .execute();
            selectedItemId = itemId;
          } else if (selectedItemId) {
            await scene
              .items((op) => [
                op.where((q) => q.withItemId(selectedItemId)).deselect(),
              ])
              .execute();
          }
        });
      }

      main();
    </script>
  </body>
</html>`;
}
