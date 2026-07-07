import { IConfig } from '@oclif/config';
import { expect, test } from '@oclif/test';
import { SceneItemData, VertexClient } from '@vertexvis/api-client-node';
import sinon, { assert } from 'sinon';

import Export from '../../../src/commands/scene-trees/export';
import * as vc from '../../../src/lib/client';
import * as si from '../../../src/lib/scene-items';
import { TreeNode } from '../../../src/lib/tree-node';
import * as ts from '../../../src/lib/tree-serializer';

const sceneId = 'my-scene-id';

describe('scene-trees:export', () => {
  afterEach(() => {
    sinon.restore();
  });

  test
    .command(['scene-trees:export'])
    .catch((error) => {
      expect(error.message).to.contain('Missing 1 required arg:');
      expect(error.message).to.contain('sceneId');
    })
    .it('requires sceneId');

  test
    .stdout()
    .do(async () => {
      sinon
        .stub(vc, 'vertexClient')
        .resolves(sinon.stub() as unknown as VertexClient);

      const root = new TreeNode<SceneItemData>({
        id: 'root-id',
      } as SceneItemData);
      sinon.stub(si, 'fetchSceneItemTree').resolves(root);
      sinon.stub(ts, 'serializeTreeToZipFile').resolves();

      await new Export([sceneId], {} as IConfig).run();
    })
    .it('saves tree to default zip path', (ctx) => {
      expect(ctx.stdout).to.contain(`${sceneId}.zip`);
    });

  test
    .stdout()
    .do(async () => {
      sinon
        .stub(vc, 'vertexClient')
        .resolves(sinon.stub() as unknown as VertexClient);

      const root = new TreeNode<SceneItemData>({
        id: 'root-id',
      } as SceneItemData);
      sinon.stub(si, 'fetchSceneItemTree').resolves(root);
      const serializeStub = sinon.stub(ts, 'serializeTreeToZipFile').resolves();

      await new Export(
        [sceneId, '--output', 'custom.zip'],
        {} as IConfig
      ).run();

      assert.calledOnce(serializeStub);
      expect(serializeStub.getCall(0).args[0].filePath).to.equal('custom.zip');
      expect(serializeStub.getCall(0).args[0].entryName).to.equal(
        `${sceneId}.json`
      );
    })
    .it('uses --output path and correct entry name', (ctx) => {
      expect(ctx.stdout).to.contain('custom.zip');
    });
});
