import { flags } from '@oclif/command';
import { logError, VertexError } from '@vertexvis/api-client-node';

import BaseCommand from '../../lib/base';
import { vertexClient } from '../../lib/client';

export default class Create extends BaseCommand {
  public static description = `Create a new empty file collection.`;

  public static examples = [
    `$ vertex file-collections:create --name "my file collection" --suppliedId "my-file-collection"
bf0c4343-96eb-4aa9-8dee-e79c6458dedf
`,
  ];

  public static flags = {
    ...BaseCommand.flags,
    name: flags.string({
      description: `Name of the file collection.`,
      required: false,
    }),
    suppliedId: flags.string({
      description: `Supplied ID of the file collection.`,
      required: false,
    }),
  };

  public async run(): Promise<void> {
    const {
      flags: { name, suppliedId },
    } = this.parse(Create);
    const basePath = this.parsedFlags?.basePath;

    try {
      const client = await vertexClient(basePath, this.userConfig);
      const createRes = await client.fileCollections.createFileCollection({
        createFileCollectionRequest: {
          data: {
            attributes: {
              name,
              suppliedId,
            },
            type: 'file-collection',
          },
        },
      });

      this.log(createRes.data.data.id);
    } catch (error) {
      logError(error as VertexError, this.error);
    }
  }
}
