import { flags } from '@oclif/command';
import {
  deleteAllFiles,
  deleteAllScenes,
  logError,
  VertexClient,
} from '@vertexvis/vertex-api-client';
import cli from 'cli-ux';
import BaseCommand from '../base';

interface Deleter {
  readonly deleteOne: (id: string) => Promise<void>;
  readonly deleteAll: () => Promise<void>;
}

export default class Delete extends BaseCommand {
  public static description = `Delete resources.`;

  public static examples = [
    `$ vertex delete --resource scene f79d4760-0b71-44e4-ad0b-22743fdd4ca3
Delete scene(s) f79d4760-0b71-44e4-ad0b-22743fdd4ca3.
`,
  ];

  public static args = [{ name: 'id' }];

  public static flags = {
    ...BaseCommand.flags,
    all: flags.boolean({
      description: 'Delete all of specified resources.',
      default: false,
    }),
    resource: flags.string({
      char: 'r',
      description: 'Resource type of ID provided.',
      options: ['file', 'scene'],
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = this.parse(Delete);
    if (flags.all) {
      const choice = await cli.prompt(
        `Are you sure you want to delete all ${flags.resource}s? (yes/no)`
      );
      if (choice.toLowerCase() !== 'yes') {
        this.log('Aborting...');
        this.exit(0);
      }
    } else if (!args.id) {
      this.error('Either --all flag or id argument required.');
    }

    try {
      cli.action.start(`Deleting ${flags.resource}(s)...`);

      const deleter = getDeleter(
        await VertexClient.build({ basePath: flags.basePath }),
        flags.resource,
        flags.verbose
      );
      if (flags.all) {
        await deleter.deleteAll();
        this.log(`Deleted all ${flags.resource}s.`);
      } else {
        await deleter.deleteOne(args.id);
        this.log(`Deleted ${flags.resource} ${args.id}.`);
      }

      cli.action.stop();
    } catch (error) {
      logError(error, this.error);
    }
  }
}

function getDeleter(
  client: VertexClient,
  resource: string,
  verbose: boolean
): Deleter {
  switch (resource) {
    case 'scene':
      return sceneDeleter(client, verbose);
    case 'file':
      return fileDeleter(client, verbose);
    default:
      throw new Error(`Unexpected resource ${resource}`);
  }
}

function fileDeleter(client: VertexClient, verbose: boolean): Deleter {
  return {
    deleteOne: async (id: string) => {
      await client.files.deleteFile({ id });
    },
    deleteAll: async () => {
      await deleteAllFiles({ client, pageSize: 100, verbose });
    },
  };
}

function sceneDeleter(client: VertexClient, verbose: boolean): Deleter {
  return {
    deleteOne: async (id: string) => {
      await client.scenes.deleteScene({ id });
    },
    deleteAll: async () => {
      await deleteAllScenes({ client, pageSize: 5, verbose });
    },
  };
}
