import { flags } from '@oclif/command';
import {
  VertexClient,
  deleteAllFiles,
  deleteAllScenes,
} from '@vertexvis/vertex-api-client';
import cli from 'cli-ux';
import BaseCommand from '../base';

interface Deleter {
  deleteOne: (id: string) => void;
  deleteAll: () => void;
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
        deleter.deleteAll();
        this.log(`Deleted all ${flags.resource}s.`);
      } else {
        deleter.deleteOne(args.id);
        this.log(`Deleted ${flags.resource} ${args.id}.`);
      }

      cli.action.stop();
    } catch (error) {
      if (error.vertexErrorMessage) this.error(error.vertexErrorMessage);
      throw error;
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
    deleteOne: (id: string) => {
      client.files.deleteFile({ id });
    },
    deleteAll: () => {
      deleteAllFiles({ client, pageSize: 100, verbose });
    },
  };
}

function sceneDeleter(client: VertexClient, verbose: boolean): Deleter {
  return {
    deleteOne: (id: string) => {
      client.scenes.deleteScene({ id });
    },
    deleteAll: () => {
      deleteAllScenes({ client, pageSize: 5, verbose });
    },
  };
}
