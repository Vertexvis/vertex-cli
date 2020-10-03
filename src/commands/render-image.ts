import { flags } from '@oclif/command';
import {
  Environment,
  VertexClient,
  renderScene,
  renderSceneView,
} from '@vertexvis/vertex-api-client';
import { createWriteStream } from 'fs';
import BaseCommand from '../base';

export default class CreateTemplate extends BaseCommand {
  public static description = `Render an image of either a scene or scene-view.`;

  public static examples = [
    `$ vertex render-image f79d4760-0b71-44e4-ad0b-22743fdd4ca3
Image written to 'f79d4760-0b71-44e4-ad0b-22743fdd4ca3.jpeg'.
`,
  ];

  public static args = [{ name: 'id' }];

  public static flags = {
    ...BaseCommand.flags,
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
  };

  public async run(): Promise<void> {
    const { args, flags } = this.parse(CreateTemplate);

    const renderArgs = {
      client: await VertexClient.build({
        environment: flags.environment as Environment,
      }),
      renderReq: { id: args.id, height: 1000, width: 1000 },
    };
    const renderRes = await (flags.resource === 'scene'
      ? renderScene(renderArgs)
      : renderSceneView(renderArgs));
    if (renderRes.headers['content-length'] === '137') {
      this.error(`Received empty image for ${flags.resource} ${args.id}.`);
    }

    const output = flags.output || `${args.id}.jpeg`;
    renderRes.data.pipe(createWriteStream(output));

    this.log(`Image written to '${output}'.`);
  }
}
