import { IConfig } from '@oclif/config';
import { expect, test } from '@oclif/test';
import {
  CreateSceneAndSceneItemsReq,
  SceneRelationshipDataTypeEnum,
  Utf8,
  VertexClient,
} from '@vertexvis/api-client-node';
import { readFile } from 'fs-extra';
import { join } from 'path';
import sinon, { assert } from 'sinon';

import CreateScene from '../../src/commands/create-scene';
import { SceneItem } from '../../src/create-items/index.d';
import * as vc from '../../src/lib/client';

const TestDataPath = join(__dirname, '..', 'test-data');
const GoldenPath = join(TestDataPath, 'golden.pvs.json');

describe('create-scene', () => {
  afterEach(() => {
    sinon.restore();
  });

  test
    .command(['create-scene'])
    .catch((error) => {
      expect(error.message).to.contain(
        "'undefined' is not a valid file path, exiting."
      );
    })
    .it('requires path');

  test
    .command(['create-scene', '-p', '0', GoldenPath])
    .catch((error) => {
      expect(error.message).to.contain(`Invalid parallelism '0'.`);
    })
    .it('requires above lower-bound');

  test
    .command(['create-scene', '-p', '201', GoldenPath])
    .catch((error) => {
      expect(error.message).to.contain(`Invalid parallelism '201'.`);
    })
    .it('requires below upper-bound');

  test
    .stdout()
    .do(async () => {
      const createSceneFn = sinon.stub();
      const items: SceneItem[] = JSON.parse(await readFile(GoldenPath, Utf8));
      const sceneId = 's-id';
      const getSceneItems = sinon.stub();
      const client = {
        sceneItems: { getSceneItems },
      } as unknown as VertexClient;
      const exp: CreateSceneAndSceneItemsReq = {
        client,
        createSceneItemReqs: items.map((i) => ({
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
              name: i.name ?? undefined,
              ordinal: i.ordinal ?? undefined,
              phantom: i.phantom,
              endItem: i.endItem,
            },
            relationships: {},
            type: 'scene-item',
          },
        })),
        createSceneReq: () => ({
          data: {
            attributes: {
              name: undefined,
              suppliedId: undefined,
              treeEnabled: false,
            },
            type: SceneRelationshipDataTypeEnum.Scene,
          },
        }),
        failFast: true,
        onMsg: console.error,
        onProgress: () => sinon.match.any,
        parallelism: 20,
        verbose: false,
      };
      sinon.stub(vc, 'vertexClient').resolves(client);
      createSceneFn.resolves({
        errors: [],
        sceneItemErrors: [],
        scene: { data: { id: sceneId } },
      });
      getSceneItems.resolves({ data: { data: [{}] } });

      await new CreateScene([GoldenPath], {} as IConfig).innerRun(
        createSceneFn,
        false
      );

      assert.calledOnce(createSceneFn);
      const act: CreateSceneAndSceneItemsReq = createSceneFn.getCall(0).args[0];
      expect(act.client).to.equal(exp.client);
      expect(act.createSceneItemReqs).to.deep.equal(exp.createSceneItemReqs);
      expect(act.createSceneReq()).to.deep.equal(exp.createSceneReq());
      expect(act.failFast).to.equal(exp.failFast);
      expect(act.onMsg).to.equal(exp.onMsg);
      expect(act.parallelism).to.equal(exp.parallelism);
      expect(act.verbose).to.equal(exp.verbose);
    })
    .it('works');

  test
    .stdout()
    .do(async () => {
      const createSceneFn = sinon.stub();
      const items: SceneItem[] = JSON.parse(await readFile(GoldenPath, Utf8));
      const sceneId = 's-id';
      const getSceneItems = sinon.stub();
      const client = {
        sceneItems: { getSceneItems },
      } as unknown as VertexClient;
      const createSceneItemReqs = items.map((i) => ({
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
            name: i.name ?? undefined,
            ordinal: i.ordinal ?? undefined,
            phantom: i.phantom,
            endItem: i.endItem,
          },
          relationships: {},
          type: 'scene-item',
        },
      }));

      sinon.stub(vc, 'vertexClient').resolves(client);
      createSceneFn.resolves({
        errors: [
          {
            ops: [],
            res: {
              errors: new Set([
                {
                  status: '404',
                  code: 'NotFound',
                  title: 'The requested resource was not found.',
                  source: { pointer: '/body/data/attributes/parent' },
                },
              ]),
            },
          },
        ],
        sceneItemErrors: createSceneItemReqs.map((csir) => {
          return {
            req: csir.data,
            res: {
              status: '404',
              code: 'NotFound',
              title: 'The requested resource was not found.',
              source: { pointer: '/body/data/attributes/parent' },
            },
          };
        }),
        scene: { data: { id: sceneId } },
      });
      getSceneItems.resolves({ data: { data: [{}] } });

      await new CreateScene([GoldenPath], {} as IConfig).innerRun(
        createSceneFn,
        false
      );

      assert.calledOnce(createSceneFn);
    })
    .it('handles errors');
});
