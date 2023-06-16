import { flags } from '@oclif/command';
import {
  createSceneAndSceneItems,
  CreateSceneAndSceneItemsReq,
  CreateSceneAndSceneItemsRes,
  CreateSceneItemRequest,
  getPage,
  isFailure,
  logError,
  SceneItemData,
  SceneRelationshipDataTypeEnum,
  Utf8,
  VertexClient,
  VertexError,
} from '@vertexvis/api-client-node';
import cli from 'cli-ux';
import { readFile } from 'fs-extra';

import { SceneItem } from '../create-items/index.d';
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
    validate: flags.boolean({
      description:
        'Whether or not to validate the creation of every scene item.',
      default: false,
    }),
    name: flags.string({
      description: 'Name of scene.',
    }),
    noFailFast: flags.boolean({
      description:
        'Whether or not to fail the process immediately if any scene item creation fails.',
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
      description:
        'Whether or not scene trees should be enabled for this scene.',
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
        name,
        noFailFast,
        parallelism,
        suppliedId,
        treeEnabled,
        validate,
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
      const itemsMap: Record<string, SceneItem> = {};
      let errors = false;

      const createSceneItemReqs: CreateSceneItemRequest[] = [];
      items.forEach((i) => {
        if (itemsMap[i.suppliedId]) {
          this.warn(
            `Ignoring entry with duplicate suppliedId: ${i.suppliedId}.`
          );
        } else {
          itemsMap[i.suppliedId] = i;
          createSceneItemReqs.push({
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
                name: i.name ?? i.suppliedId ?? undefined,
                ordinal: i.ordinal ?? undefined,
              },
              relationships: {},
              type: 'scene-item',
            },
          });
        }
      });

      const res = await createSceneFn({
        client,
        createSceneItemReqs: createSceneItemReqs,
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
              'Created scene items. Awaiting scene completion...'
            );
          }
        },
        parallelism,
        verbose,
      });

      if (res.errors.length > 0) {
        errors = true;
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
        errors = true;
        this.warn(`Failed to create the following scene items...`);
        cli.table(
          res.sceneItemErrors.map((e) => {
            return {
              suppliedId: e.req.attributes.suppliedId,
              suppliedPartId: e.req.attributes.source?.suppliedPartId,
              suppliedRevisionId: e.req.attributes.source?.suppliedRevisionId,
              relSource: e.res?.source?.pointer ?? e.res?.code,
              error: e.res?.title ?? e.res?.code,
              placeholder: noFailFast ? e.placeholderItem?.id ?? '' : '',
            };
          }),
          {
            suppliedId: { header: 'Id' },
            suppliedPartId: { header: 'PartId' },
            suppliedRevisionId: { header: 'RevisionId' },
            relSource: { header: 'Source' },
            error: { header: 'Error' },
            placeholder: noFailFast ? { header: 'Placeholder Created' } : {},
          },
          { 'no-truncate': true }
        );
      }

      const sceneData = res.scene?.data;

      if (sceneData && sceneData.id) {
        const sceneId = sceneData.id;
        if (validate && !errors) {
          if (verbose) cli.info(`Validating scene items...`);
          let sceneItemCount = 0;
          await iterateSceneItems(client, sceneId, (si: SceneItemData) => {
            if (si.attributes.suppliedId) {
              delete itemsMap[si.attributes.suppliedId];
            }
            sceneItemCount++;
          });
          const missingItems = Object.keys(itemsMap).map(
            (key) => itemsMap[key]
          );
          if (missingItems.length > 0) {
            this.warn(`The following scene items were missing...`);
            cli.table(
              missingItems
                .sort((a, b) => (a.depth || 0) - (b.depth || 0))
                .sort((a, b) => a.suppliedId.localeCompare(b.suppliedId))
                .map((sceneItem) => {
                  return {
                    depth: sceneItem.depth,
                    suppliedId: sceneItem.suppliedId,
                    suppliedPartId: sceneItem.source?.suppliedPartId || '',
                    suppliedRevisionId:
                      sceneItem.source?.suppliedRevisionId || '',
                  };
                }),
              {
                depth: { header: 'Depth' },
                suppliedId: { header: 'SuppliedId' },
                suppliedPartId: { header: 'PartId' },
                suppliedRevisionId: { header: 'RevisionId' },
              },
              { 'no-truncate': true }
            );
          } else if (verbose) {
            cli.info(`Validated ${sceneItemCount} scene items.`);
          }
        } else {
          const getSceneItemsRes = await client.sceneItems.getSceneItems({
            id: sceneData.id,
            pageSize: 1,
          });
          if (getSceneItemsRes.data.data.length === 0) {
            this.error(`No scene items exist in the scene.`);
          }
        }

        if (!verbose) {
          this.log(sceneId);
        }
      }

      cli.action.stop();
    } catch (error) {
      logError(error as VertexError, this.error);
    }
  }
}

async function iterateSceneItems(
  client: VertexClient,
  sceneId: string,
  callback: (item: SceneItemData) => void
): Promise<void> {
  let cursor: string | undefined;
  let itemsRemain = true;
  while (itemsRemain) {
    // eslint-disable-next-line no-await-in-loop
    const res = await getPage(() =>
      client.sceneItems.getSceneItems({
        id: sceneId,
        pageSize: 200,
        pageCursor: cursor,
      })
    );
    cursor = res.cursor;
    itemsRemain = cursor !== undefined;
    const sceneItems: Array<SceneItemData> = res.page.data;
    sceneItems.forEach((i) => callback(i));
  }
}
