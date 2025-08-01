import {
  BaseReq,
  deleteAllFileCollections,
  deleteAllFiles,
  deleteAllParts,
  deleteAllScenes,
} from '@vertexvis/api-client-node';
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

export function fileDeleter({ client, verbose }: BaseReq): Deleter {
  return {
    deleteOne: async (id: string) => {
      await client.files.deleteFile({ id });
    },
    deleteAll: async () => {
      await deleteAllFiles({
        client,
        onMsg: console.error,
        pageSize: 200,
        verbose,
      });
    },
  };
}

export function fileCollectionDeleter({ client, verbose }: BaseReq): Deleter {
  return {
    deleteOne: async (id: string) => {
      await client.fileCollections.deleteFileCollection({ id });
    },
    deleteAll: async () => {
      await deleteAllFileCollections({
        client,
        onMsg: console.error,
        pageSize: 200,
        verbose,
      });
    },
  };
}

export function partDeleter({ client, verbose }: BaseReq): Deleter {
  return {
    deleteOne: async (id: string) => {
      await client.parts.deletePart({ id });
    },
    deleteAll: async () => {
      await deleteAllParts({
        client,
        onMsg: console.error,
        pageSize: 200,
        verbose,
      });
    },
  };
}

export function sceneDeleter({ client, verbose }: BaseReq): Deleter {
  return {
    deleteOne: async (id: string) => {
      await client.scenes.deleteScene({ id });
    },
    deleteAll: async () => {
      await deleteAllScenes({
        client,
        onMsg: console.error,
        pageSize: 200,
        verbose,
      });
    },
  };
}

export function sceneViewStateDeleter({ client }: BaseReq): Deleter {
  return {
    deleteOne: async (id: string) => {
      await client.sceneViewStates.deleteSceneViewState({ id });
    },
    deleteAll: () => {
      throw new Error('Not implemented');
    },
  };
}
