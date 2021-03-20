import {
  BaseArgs,
  FileMetadataData,
  getPage,
  PartData,
  SceneData,
} from '@vertexvis/vertex-api-client';
import cli from 'cli-ux';

interface Paged<T> {
  items: T[];
  cursor?: string;
}

interface Getter<T> {
  readonly getOne: (id: string) => Promise<T>;
  readonly getAll: (cursor?: string) => Promise<Paged<T>>;
  readonly display: (res: Paged<T>, extended: boolean) => void;
}

export async function getter<T>({
  all = false,
  cursor,
  extended = false,
  getter,
  id,
}: {
  all?: boolean;
  cursor?: string;
  extended?: boolean;
  getter: Getter<T>;
  id?: string;
}): Promise<void> {
  if (all) {
    const res = await getter.getAll(cursor);
    getter.display(res, extended);
    if (res.cursor) console.log(res.cursor);
  } else if (id) {
    getter.display({ items: [await getter.getOne(id)] }, extended);
  }
}

export function fileGetter({ client }: BaseArgs): Getter<FileMetadataData> {
  return {
    getOne: async (id: string): Promise<FileMetadataData> => {
      return (await client.files.getFile({ id })).data.data;
    },
    getAll: async (cursor?: string): Promise<Paged<FileMetadataData>> => {
      const res = await getPage(() =>
        client.files.getFiles({ pageCursor: cursor, pageSize: 25 })
      );
      return { items: res.page.data, cursor: res.cursor };
    },
    display: (res: Paged<FileMetadataData>, extended: boolean): void =>
      cli.table(
        res.items.map((f) => ({ id: f.id, ...f.attributes })),
        {
          id: { minWidth: 36 },
          name: { minWidth: 12 },
          suppliedId: { extended: true, header: 'SuppliedId' },
          status: { extended: true },
          created: { extended: true },
        },
        { extended }
      ),
  };
}

export function partGetter({ client }: BaseArgs): Getter<PartData> {
  return {
    getOne: async (id: string): Promise<PartData> => {
      return (await client.parts.getPart({ id })).data.data;
    },
    getAll: async (cursor?: string): Promise<Paged<PartData>> => {
      const res = await getPage(() =>
        client.parts.getParts({ pageCursor: cursor, pageSize: 25 })
      );
      return { items: res.page.data, cursor: res.cursor };
    },
    display: (res: Paged<PartData>, extended: boolean): void =>
      cli.table(
        res.items.map((f) => ({ id: f.id, ...f.attributes })),
        {
          id: { minWidth: 36 },
          name: { minWidth: 12 },
          suppliedId: { extended: true, header: 'SuppliedId' },
          created: { extended: true },
        },
        { extended }
      ),
  };
}

export function sceneGetter({ client }: BaseArgs): Getter<SceneData> {
  return {
    getOne: async (id: string): Promise<SceneData> => {
      return (await client.scenes.getScene({ id })).data.data;
    },
    getAll: async (cursor?: string): Promise<Paged<SceneData>> => {
      const res = await getPage(() =>
        client.scenes.getScenes({ pageCursor: cursor, pageSize: 25 })
      );
      return { items: res.page.data, cursor: res.cursor };
    },
    display: (res: Paged<SceneData>, extended: boolean): void =>
      cli.table(
        res.items.map((f) => ({ id: f.id, ...f.attributes })),
        {
          id: { minWidth: 36 },
          name: { minWidth: 12 },
          suppliedId: { extended: true, header: 'SuppliedId' },
          state: { extended: true },
          created: { extended: true },
        },
        { extended }
      ),
  };
}