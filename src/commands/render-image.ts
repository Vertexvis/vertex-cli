import { flags } from '@oclif/command';
import {
  logError,
  renderScene,
  renderSceneView,
  VertexClient,
} from '@vertexvis/vertex-api-client';
import { createWriteStream } from 'fs';
import BaseCommand from '../base';

export default class RenderImage extends BaseCommand {
  public static description = `Render an image of either a scene or scene-view.`;

  public static examples = [
    `$ vertex render-image f79d4760-0b71-44e4-ad0b-22743fdd4ca3
Image written to 'f79d4760-0b71-44e4-ad0b-22743fdd4ca3.jpg'.
`,
  ];

  public static args = [{ name: 'id' }];

  public static flags = {
    ...BaseCommand.flags,
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
      options: ['scene', 'scene-view'],
      default: 'scene',
    }),
    width: flags.integer({
      char: 'w',
      description: 'Image width.',
      default: 100,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = this.parse(RenderImage);
    if (flags.height < 1) this.error(`Invalid height ${flags.height}.`);
    if (flags.width < 1) this.error(`Invalid width ${flags.width}.`);

    try {
      const renderArgs = {
        client: await VertexClient.build({ basePath: flags.basePath }),
        renderReq: { id: args.id, height: flags.height, width: flags.width },
      };
      const renderRes = await (flags.resource === 'scene'
        ? renderScene<NodeJS.ReadableStream>(renderArgs)
        : renderSceneView<NodeJS.ReadableStream>(renderArgs));
      if (parseInt(renderRes.headers['content-length'], 10) < 140) {
        this.error(`Received empty image for ${flags.resource} ${args.id}.`);
      }

      const output = flags.output || `${args.id}.jpg`;
      renderRes.data.pipe(createWriteStream(output));
      await createFile(renderRes.data, output);

      this.log(`Image written to '${output}'.`);
    } catch (error) {
      logError(error, this.error);
    }
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
