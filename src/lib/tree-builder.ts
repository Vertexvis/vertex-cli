import { TreeNode } from './tree-node';

/*
 * Given any object T that may have a `children?: T[]`,
 * recursively build a TreeNode<T> subtree.
 */
export function buildTreeFromNested<T extends { children?: T[] }>(
  record: T,
  parent?: TreeNode<T>
): TreeNode<T> {
  // auto-links to parent if provided
  const node = new TreeNode<T>(record, parent);
  for (const child of record.children ?? []) {
    buildTreeFromNested(child, node);
  }
  return node;
}

/**
 * Given a flat array of objects T, build a forest of TreeNode<T> trees.
 * This is useful for converting a flat list of records with resolvable
 * parent-child relationships into a tree structure.
 * @param data          Array of records to convert
 * @param dataIdFunction Function to extract the unique key for each record (default: rec.id)
 * @param parentIdFunction Function to extract the parent key for each record (default: rec.parentId)
 * @returns                Array of root TreeNode<T> instances representing the forest
 * @example
 * // Given a flat list of records with parent-child relationships:
 * const records = [
 *   { id: '1', parentId: undefined, name: 'Root' },
 *   { id: '2', parentId: '1', name: 'Child 1' },
 *   { id: '3', parentId: '1', name: 'Child 2' },
 *   { id: '4', parentId: '2', name: 'Grandchild 1' },
 * ];
 * // Build the tree structure:
 * const tree = buildTreeFromFlat(records, rec => rec.id, rec => rec.parentId);
 * // Resulting tree structure:
 * // [
 * //   TreeNode { data: { id: '1', parentId: undefined, name: 'Root' }, children: [
 * //     TreeNode { data: { id: '2', parentId: '1', name: 'Child 1' }, children: [
 * //       TreeNode { data: { id: '4', parentId: '2', name: 'Grandchild 1' }, children: [] }
 * //     ] },
 * //     TreeNode { data: { id: '3', parentId: '1', name: 'Child 2' }, children: [] }
 * //   ] }
 * // ]
 */
export function buildTreeFromFlat<T>(
  data: T[],
  dataIdFunction: (rec: T) => string,
  parentIdFunction: (rec: T) => string | undefined
): TreeNode<T>[] {
  // 1) Create a TreeNode for every record, keyed by id
  const nodeMap = new Map<string, TreeNode<T>>();
  for (const rec of data) {
    nodeMap.set(dataIdFunction(rec), new TreeNode<T>(rec));
  }

  // 2) Link parents & children
  const roots: TreeNode<T>[] = [];
  for (const rec of data) {
    const node = nodeMap.get(dataIdFunction(rec))!;
    const parentId = parentIdFunction(rec);
    const parent = parentId ? nodeMap.get(parentId) ?? null : null;
    if (parent === null) {
      // no parent, must be a root
      roots.push(node);
    } else {
      // attach as child
      node.parent = parent;
      parent.children.push(node);
    }
  }

  return roots;
}
