import { SceneItemData, VertexClient } from '@vertexvis/api-client-node';
import { assert, expect } from 'chai';
import sinon from 'sinon';

import {
  fetchAllSceneItemsForScene,
  fetchSceneItemTree,
} from '../../src/lib/scene-items';

const makeItem = (id: string, parentId?: string): SceneItemData =>
  ({
    id,
    relationships: {
      parent: parentId
        ? { data: { id: parentId, type: 'scene-item' } }
        : undefined,
    },
  } as unknown as SceneItemData);

/*
 * Build a mock VertexClient whose sceneItems.getSceneItems returns a paginated
 * Axios-style response. getPage calls getListing() and reads .data from it,
 * so we return { data: { data: items, links: { next: nextHref } } }.
 */
function makeClient(
  pages: { items: SceneItemData[]; nextHref?: string }[]
): VertexClient {
  let callCount = 0;
  const getSceneItems = sinon.stub().callsFake(() => {
    const page = pages[callCount] ?? pages[pages.length - 1];
    callCount++;
    return Promise.resolve({
      data: {
        data: page.items,
        links: page.nextHref ? { next: { href: page.nextHref } } : {},
      },
    });
  });
  return { sceneItems: { getSceneItems } } as unknown as VertexClient;
}

describe('scene-items', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('fetchAllSceneItemsForScene', () => {
    it('returns all items from a single page', async () => {
      const items = [makeItem('1'), makeItem('2')];
      const client = makeClient([{ items }]);

      const result = await fetchAllSceneItemsForScene(client, 'scene-id');
      expect(result).to.deep.equal(items);
    });

    it('fetches multiple pages until cursor is exhausted', async () => {
      const page1 = [makeItem('1')];
      const page2 = [makeItem('2')];
      const client = makeClient([
        {
          items: page1,
          nextHref: 'https://api.example.com?page[cursor]=next-token',
        },
        { items: page2 },
      ]);

      const result = await fetchAllSceneItemsForScene(client, 'scene-id');
      expect(result).to.have.length(2);
    });

    it('returns an empty array when the page has no items', async () => {
      const client = makeClient([{ items: [] }]);

      const result = await fetchAllSceneItemsForScene(client, 'scene-id');
      expect(result).to.deep.equal([]);
    });
  });

  describe('fetchSceneItemTree', () => {
    it('returns the root node of the scene item tree', async () => {
      const items = [makeItem('1'), makeItem('2', '1')];
      const client = makeClient([{ items }]);

      const root = await fetchSceneItemTree(client, 'scene-id');
      assert.isDefined(root);
      expect(root.data?.id).to.equal('1');
      expect(root.children).to.have.length(1);
      expect(root.children[0].data?.id).to.equal('2');
    });

    it('sets parent references correctly on the tree', async () => {
      const items = [makeItem('1'), makeItem('2', '1')];
      const client = makeClient([{ items }]);

      const root = await fetchSceneItemTree(client, 'scene-id');
      assert.isDefined(root);
      expect(root.children[0].parent).to.equal(root);
    });
  });
});
