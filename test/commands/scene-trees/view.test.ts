import { IConfig } from '@oclif/config';
import { expect, test } from '@oclif/test';
import { SceneItemData, VertexClient } from '@vertexvis/api-client-node';
import sinon from 'sinon';

import View from '../../../src/commands/scene-trees/view';
import * as vc from '../../../src/lib/client';
import * as si from '../../../src/lib/scene-items';
import { TreeNode } from '../../../src/lib/tree-node';

const sceneId = 'my-scene-id';

describe('scene-trees:view', () => {
  afterEach(() => {
    sinon.restore();
  });

  test
    .command(['scene-trees:view'])
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

      const root = new TreeNode<SceneItemData>(
        { id: 'root-id' } as SceneItemData
      );
      new TreeNode<SceneItemData>({ id: 'child-id' } as SceneItemData, root);
      sinon.stub(si, 'fetchSceneItemTree').resolves(root);

      await new View([sceneId], {} as IConfig).run();
    })
    .it('outputs the tree dump', (ctx) => {
      expect(ctx.stdout).to.contain('[TreeNode');
    });
});
