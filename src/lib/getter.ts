import {
  BaseReq,
  FileMetadataData,
  getPage,
  head,
  PartData,
  prettyJson,
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
  readonly displayOne: (res: Paged<T>) => void;
  readonly displayAll: (res: Paged<T>, extended: boolean) => void;
}

export async function getterFn<T>({
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
    getter.displayAll(res, extended);
    if (res.cursor) console.log(res.cursor);
  } else if (id) {
    getter.displayOne({ items: [await getter.getOne(id)] });
  }
}

export function fileGetter({ client }: BaseReq): Getter<FileMetadataData> {
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
    displayOne: (res: Paged<FileMetadataData>): void =>
      console.log(prettyJson(head(res.items))),
    displayAll: (res: Paged<FileMetadataData>, extended: boolean): void =>
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

export function partGetter({ client }: BaseReq): Getter<PartData> {
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
    displayOne: (res: Paged<PartData>): void =>
      console.log(prettyJson(head(res.items))),
    displayAll: (res: Paged<PartData>, extended: boolean): void =>
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

export function sceneGetter({ client }: BaseReq): Getter<SceneData> {
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
    displayOne: (res: Paged<SceneData>): void =>
      console.log(prettyJson(head(res.items))),
    displayAll: (res: Paged<SceneData>, extended: boolean): void =>
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
