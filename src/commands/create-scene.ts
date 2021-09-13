import { flags } from '@oclif/command';
import {
  createSceneAndSceneItems,
  createSceneAndSceneItemsEXPERIMENTAL,
  CreateSceneAndSceneItemsReq,
  CreateSceneAndSceneItemsRes,
  CreateSceneItemRequest,
  isFailure,
  logError,
  SceneData,
  SceneRelationshipDataTypeEnum,
  Utf8,
  VertexError,
} from '@vertexvis/api-client-node';
import cli from 'cli-ux';
import { readFile } from 'fs-extra';

import { SceneItem } from '../create-items';
import BaseCommand from '../lib/base';
import { vertexClient } from '../lib/client';
import { fileExists } from '../lib/fs';
import { progressBar } from '../lib/progress';

type CreateSceneFn = (
  args: CreateSceneAndSceneItemsReq
) => Promise<CreateSceneAndSceneItemsRes>;
export default class CreateScene extends BaseCommand {
  public static description = `Given JSON file containing SceneItems (as defined in src/create-items/index.d.ts), create scene in Vertex.`;

  public static examples = [
    `$ vertex create-scene --name my-scene [YOUR_PATH_TO_JSON_FILE]
  ████████████████████████████████████████ 100% | 10/10
f79d4760-0b71-44e4-ad0b-22743fdd4ca3
`,
  ];

  public static args = [{ name: 'path' }];

  public static flags = {
    ...BaseCommand.flags,
    experimental: flags.boolean({
      description: 'Whether or not to use batch scene item creation.',
      default: false,
    }),
    name: flags.string({
      description: 'Name of scene.',
    }),
    noFailFast: flags.boolean({
      description:
        'Whether or not to fail if any scene item fails initial validation.',
      default: false,
    }),
    parallelism: flags.integer({
      char: 'p',
      description: 'Number of scene-items to create in parallel.',
      default: 20,
    }),
    suppliedId: flags.string({
      description: 'SuppliedId of scene.',
    }),
    treeEnabled: flags.boolean({
      description: 'Whether or not scene trees can be viewed for this scene.',
      default: false,
    }),
  };

  public async run(): Promise<void> {
    await this.innerRun(createSceneAndSceneItems);
  }

  public async innerRun(
    createSceneFn: CreateSceneFn,
    showProgress = true
  ): Promise<void> {
    const {
      args: { path },
      flags: {
        experimental,
        name,
        noFailFast,
        parallelism,
        suppliedId,
        treeEnabled,
        verbose,
      },
    } = this.parse(CreateScene);
    const basePath = this.parsedFlags?.basePath;
    if (!(await fileExists(path))) {
      this.error(`'${path}' is not a valid file path, exiting.`);
    }
    if (parallelism < 1 || parallelism > 200) {
      this.error(`Invalid parallelism '${parallelism}'.`);
    }

    try {
      const progress = progressBar('Creating scene');
      const client = await vertexClient(basePath, this.userConfig);
      const items: SceneItem[] = JSON.parse(await readFile(path, Utf8));
      items.sort((a, b) => (a.depth || 0) - (b.depth || 0));

      const createSceneItemReqs: CreateSceneItemRequest[] = items.map((i) => ({
        data: {
          attributes: {
            materialOverride: i.materialOverride,
            parent: i.parentId,
            partInstanceSuppliedIdsAsSuppliedIds: Boolean(
              i.suppliedInstanceIdKey
            ),
            source: i.source
              ? {
                  suppliedPartId: i.source.suppliedPartId,
                  suppliedRevisionId: i.source.suppliedRevisionId,
                }
              : undefined,
            suppliedId: i.suppliedId,
            transform: i.transform,
            visible: true,
          },
          relationships: {},
          type: 'scene-item',
        },
      }));

      if (showProgress) progress.start(createSceneItemReqs.length, 0);

      let sceneData: SceneData | undefined;
      if (experimental) {
        const res = await createSceneAndSceneItemsEXPERIMENTAL({
          client,
          createSceneItemReqs,
          createSceneReq: () => ({
            data: {
              attributes: { name, suppliedId, treeEnabled },
              type: SceneRelationshipDataTypeEnum.Scene,
            },
          }),
          failFast: !noFailFast,
          onMsg: console.error,
          onProgress: (complete, total) => {
            if (showProgress) progress.update(complete);
            if (complete === total) {
              if (showProgress) progress.stop();
              cli.action.start(
                'Created scene items. Awaiting scene completion'
              );
            }
          },
          parallelism,
          verbose,
        });

        sceneData = res.scene.data;
        if (res.errors.length > 0) {
          this.warn(`Failed to create the following batches...`);
          cli.table(
            res.errors.map((e) => {
              const batchErrors = isFailure(e.res)
                ? e.res.errors
                : e.res?.data.attributes.errors;
              const first = (batchErrors ? [...batchErrors] : [])[0];
              return {
                error: first?.detail ? first.detail : first?.title,
              };
            }),
            {
              error: { header: 'Error' },
            },
            { 'no-truncate': true }
          );
        }

        if (res.sceneItemErrors.length > 0) {
          this.warn(`Failed to create the following scene-items...`);
          cli.table(
            res.sceneItemErrors.map((e) => {
              return {
                suppliedId: e.req.attributes.suppliedId,
                suppliedPartId: e.req.attributes.source?.suppliedPartId,
                suppliedRevisionId: e.req.attributes.source?.suppliedRevisionId,
                relSource: e.req.relationships.source?.data,
                error: e.res?.detail ? e.res.detail : e.res?.title,
              };
            }),
            {
              suppliedId: { header: 'Id' },
              suppliedPartId: { header: 'PartId' },
              suppliedRevisionId: { header: 'RevisionId' },
              relSource: { header: 'Source' },
              error: { header: 'Error' },
            },
            { 'no-truncate': true }
          );
        }
      } else {
        const res = await createSceneFn({
          client,
          createSceneItemReqs,
          createSceneReq: () => ({
            data: {
              attributes: { name, suppliedId, treeEnabled },
              type: SceneRelationshipDataTypeEnum.Scene,
            },
          }),
          failFast: !noFailFast,
          onMsg: console.error,
          onProgress: (complete, total) => {
            if (showProgress) progress.update(complete);
            if (complete === total) {
              if (showProgress) progress.stop();
              cli.action.start(
                'Created scene items. Awaiting scene completion'
              );
            }
          },
          parallelism,
          verbose,
        });

        sceneData = res.scene.data;
        if (res.errors.length > 0) {
          this.warn(`Errors when creating the following scene items...`);
          cli.table(
            res.errors.map((e) => {
              const errors = isFailure(e.res)
                ? e.res.errors
                : e.res?.data.attributes.errors;
              const first = (errors ? [...errors] : [])[0];
              return {
                suppliedId: e.req.data.attributes.suppliedId,
                suppliedPartId: e.req.data.attributes.source?.suppliedPartId,
                suppliedRevisionId:
                  e.req.data.attributes.source?.suppliedRevisionId,
                relSource: e.req.data.relationships.source?.data,
                error: first?.detail ? first.detail : first?.title,
              };
            }),
            {
              suppliedId: { header: 'Id' },
              suppliedPartId: { header: 'PartId' },
              suppliedRevisionId: { header: 'RevisionId' },
              relSource: { header: 'Source' },
              error: { header: 'Error' },
            },
            { 'no-truncate': true }
          );
        }
      }

      if (sceneData) {
        this.log(sceneData.id);

        const getSceneItemsRes = await client.sceneItems.getSceneItems({
          id: sceneData.id,
          pageSize: 1,
        });
        if (getSceneItemsRes.data.data.length === 0) {
          this.error(`No scene items exist in the scene.`);
        }
      }

      cli.action.stop();
    } catch (error) {
      logError(error as VertexError, this.error);
    }
  }
}
