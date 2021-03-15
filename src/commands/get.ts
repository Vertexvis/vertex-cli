import { flags } from '@oclif/command';
import {
  BaseArgs,
  FileMetadataData,
  getPage,
  logError,
  PartData,
  SceneData,
} from '@vertexvis/vertex-api-client';
import cli from 'cli-ux';
import BaseCommand from '../base';
import { vertexClient } from '../utils';

interface Paged<T> {
  items: T[];
  cursor?: string;
}

interface Getter<T> {
  readonly getOne: (id: string) => Promise<T>;
  readonly getAll: (cursor?: string) => Promise<Paged<T>>;
  readonly display: (res: Paged<T>, extended: boolean) => void;
}

export default class Get extends BaseCommand {
  public static description = `Get resources.`;

  public static examples = [
    `$ vertex get --resource scene 54964c61-05d8-4f37-9638-18f7c4960c80
Id                                   Name
54964c61-05d8-4f37-9638-18f7c4960c80 my-scene
`,
  ];

  public static args = [{ name: 'id' }];

  public static flags = {
    ...BaseCommand.flags,
    all: flags.boolean({
      description: 'Get all of specified resource.',
      default: false,
    }),
    cursor: flags.string({
      description: 'Cursor for next page of items.',
    }),
    extended: flags.boolean({
      description: 'Display extended output.',
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
      flags: { all, cursor, extended, resource, verbose },
    } = this.parse(Get);
    const basePath = this.parsedFlags?.basePath;
    if (!id && !all) {
      this.error('Either --all flag or id argument required.');
    }

    async function performGet({
      resource,
      ...args
    }: BaseArgs & { resource: string }): Promise<void> {
      switch (resource) {
        case 'file':
          return get(fileGetter(args));
        case 'part':
          return get(partGetter(args));
        case 'scene':
          return get(sceneGetter(args));
        default:
          throw new Error(`Unexpected resource ${resource}`);
      }
    }

    async function get<T>(getter: Getter<T>): Promise<void> {
      if (all) {
        const res = await getter.getAll(cursor);
        getter.display(res, extended);
        if (res.cursor) console.log(res.cursor);
      } else {
        getter.display({ items: [await getter.getOne(id)] }, extended);
      }
    }

    try {
      performGet({
        client: await vertexClient(basePath, this.userConfig),
        resource: resource,
        verbose: verbose,
      });
    } catch (error) {
      logError(error, this.error);
    }
  }
}

function fileGetter({ client }: BaseArgs): Getter<FileMetadataData> {
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

function partGetter({ client }: BaseArgs): Getter<PartData> {
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

function sceneGetter({ client }: BaseArgs): Getter<SceneData> {
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
