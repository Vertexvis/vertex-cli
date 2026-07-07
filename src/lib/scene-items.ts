import {
  getPage,
  SceneItemData,
  VertexClient,
} from '@vertexvis/api-client-node';

import { buildTreeFromFlat } from './tree-builder';
import { TreeNode } from './tree-node';

export async function fetchAllSceneItemsForScene(
  client: VertexClient,
  sceneId: string
): Promise<SceneItemData[]> {
  const sceneItemSets: SceneItemData[][] = [];
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
    if (cursor === undefined) {
      itemsRemain = false;
    }
    sceneItemSets.push(res.page.data);
  }
  return sceneItemSets.flat();
}

export async function fetchSceneItemTree(
  client: VertexClient,
  sceneId: string
): Promise<TreeNode<SceneItemData> | undefined> {
  const allSceneItems = await fetchAllSceneItemsForScene(client, sceneId);
  const roots = buildTreeFromFlat(
    allSceneItems,
    (rec) => rec.id,
    (rec) => rec.relationships.parent?.data.id
  );

  if (roots.length === 0) {
    return undefined;
  }

  return roots[0];
}
