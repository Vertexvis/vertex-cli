import { flags } from '@oclif/command';
import {
  BaseArgs,
  deleteAllFiles,
  deleteAllParts,
  deleteAllScenes,
  logError,
  VertexClient,
} from '@vertexvis/vertex-api-client';
import cli from 'cli-ux';
import { Agent } from 'https';
import BaseCommand from '../base';

interface Deleter {
  readonly deleteOne: (id: string) => Promise<void>;
  readonly deleteAll: () => Promise<void>;
}

export default class Delete extends BaseCommand {
  public static description = `Delete resources.`;

  public static examples = [
    `$ vertex delete --resource scene f79d4760-0b71-44e4-ad0b-22743fdd4ca3
Deleted all files.
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
      options: ['file', 'part', 'scene'],
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { id },
      flags: { all, resource, verbose },
    } = this.parse(Delete);
    const basePath = this.parsedFlags?.basePath;
    if (all) {
      const choice = await cli.confirm(
        `Are you sure you want to delete all ${resource}s?`
      );
      if (!choice) {
        this.log('Aborting...');
        this.exit(0);
      }
    } else if (!id) {
      this.error('Either --all flag or id argument required.');
    }

    try {
      cli.action.start(`Deleting ${resource}(s)...`);

      const deleter = getDeleter({
        client: await VertexClient.build({
          axiosOptions: { httpsAgent: new Agent({ keepAlive: true }) },
          basePath,
          client: this.userConfig?.client,
        }),
        resource: resource,
        verbose: verbose,
      });
      if (all) {
        await deleter.deleteAll();
        this.log(`Deleted all ${resource}s.`);
      } else {
        await deleter.deleteOne(id);
        this.log(`Deleted ${resource} ${id}.`);
      }

      cli.action.stop();
    } catch (error) {
      logError(error, this.error);
    }
  }
}

function getDeleter({
  resource,
  ...args
}: BaseArgs & { resource: string }): Deleter {
  switch (resource) {
    case 'file':
      return fileDeleter(args);
    case 'part':
      return partDeleter(args);
    case 'scene':
      return sceneDeleter(args);
    default:
      throw new Error(`Unexpected resource ${resource}`);
  }
}

function fileDeleter({ client, verbose }: BaseArgs): Deleter {
  return {
    deleteOne: async (id: string) => {
      await client.files.deleteFile({ id });
    },
    deleteAll: async () => {
      await deleteAllFiles({
        client,
        onMsg: console.error,
        pageSize: 10,
        verbose,
      });
    },
  };
}

function partDeleter({ client, verbose }: BaseArgs): Deleter {
  return {
    deleteOne: async (id: string) => {
      await client.parts.deletePart({ id });
    },
    deleteAll: async () => {
      await deleteAllParts({
        client,
        onMsg: console.error,
        pageSize: 10,
        verbose,
      });
    },
  };
}

function sceneDeleter({ client, verbose }: BaseArgs): Deleter {
  return {
    deleteOne: async (id: string) => {
      await client.scenes.deleteScene({ id });
    },
    deleteAll: async () => {
      await deleteAllScenes({
        client,
        onMsg: console.error,
        pageSize: 10,
        verbose,
      });
    },
  };
}
