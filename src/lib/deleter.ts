import {
  BaseArgs,
  deleteAllFiles,
  deleteAllParts,
  deleteAllScenes,
} from '@vertexvis/vertex-api-client';
import cli from 'cli-ux';

interface Deleter {
  readonly deleteOne: (id: string) => Promise<void>;
  readonly deleteAll: () => Promise<void>;
}

export async function validate({
  all,
  id,
  onError,
  resource,
}: {
  all: boolean;
  id?: string;
  onError: (msg: string) => void;
  resource: string;
}): Promise<void> {
  if (all) {
    const choice = await cli.confirm(
      `Are you sure you want to delete all ${resource}s?`
    );
    if (!choice) {
      onError('Aborting...');
    }
  } else if (!id) {
    onError('Either --all flag or id argument required.');
  }
}

export async function deleter({
  all = false,
  id,
  deleter,
  onLog,
  resource,
}: {
  all?: boolean;
  deleter: Deleter;
  id?: string;
  onLog: (msg: string) => void;
  resource: string;
}): Promise<void> {
  if (all) {
    await deleter.deleteAll();
    onLog(`Deleted all ${resource}s.`);
  } else if (id) {
    await deleter.deleteOne(id);
    onLog(`Deleted ${resource} ${id}.`);
  }
}

export function fileDeleter({ client, verbose }: BaseArgs): Deleter {
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

export function partDeleter({ client, verbose }: BaseArgs): Deleter {
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

export function sceneDeleter({ client, verbose }: BaseArgs): Deleter {
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