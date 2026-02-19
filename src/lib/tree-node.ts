/**
 * A simple tree node class that can be used to create a tree structure.
 * Each node can have multiple children and a single parent.
 * The class provides methods to traverse the tree, check properties of nodes,
 * and manipulate the tree structure.
 *
 * @template T The type of the data stored in the node.
 * @class TreeNode
 * @implements {Iterable<TreeNode<T>>}
 * @property {TreeNode<T> | null} parent - The parent node of this node.
 * @property {TreeNode<T>[]} children - The child nodes of this node.
 * @property {T | null} data - The data stored in this node.
 * @property {number} size - The total number of nodes in this subtree (including this node).
 * @property {number} depth - The distance from this node up to the root (root.depth === 0).
 * @property {number} numChildren - The number of direct children of this node.
 * @property {number} numSiblings - The number of siblings (including this node).
 * @property {boolean} isRoot - Returns true if this node is the root of the tree.
 * @property {boolean} isLeaf - Returns true if this node is a leaf (has no children).
 * @property {boolean} hasChildren - Returns true if this node has children.
 * @property {boolean} hasSiblings - Returns true if this node has siblings.
 * @property {boolean} isEmpty - Returns true if this node has no children.
 * @example
 * const root = new TreeNode<string>('root')
 * const a = new TreeNode('child A', root)
 * new TreeNode('grandchild A1', a)
 * new TreeNode('child B', root)
 */
export class TreeNode<T> implements Iterable<TreeNode<T>> {
  public parent: TreeNode<T> | null = null;
  public children: TreeNode<T>[] = [];
  public data: T | null;

  public constructor(data: T | null = null, parent?: TreeNode<T>) {
    this.data = data;
    if (parent) {
      this.parent = parent;
      parent.children.push(this);
    }
  }

  // Pre-order traversal generator
  public static *preorder<U>(node: TreeNode<U>): Generator<TreeNode<U>> {
    yield node;
    for (const child of node.children) {
      yield* TreeNode.preorder(child);
    }
  }

  // Total number of nodes in this subtree (includes this node)
  public get size(): number {
    let count = 1;
    for (const child of this.children) {
      count += child.size;
    }
    return count;
  }

  // Distance from this node up to the root (root.depth === 0)
  public get depth(): number {
    let d = 0;
    let current = this.parent;
    while (current !== null) {
      d++;
      current = current.parent;
    }
    return d;
  }

  // Number of direct children
  public get numChildren(): number {
    return this.children.length;
  }

  // Number of siblings (including this node)
  public get numSiblings(): number {
    return this.parent ? this.parent.children.length : 0;
  }

  public isRoot(): boolean {
    return this.parent === null;
  }

  public isLeaf(): boolean {
    return this.children.length === 0;
  }

  public hasChildren(): boolean {
    return this.children.length > 0;
  }

  public hasSiblings(): boolean {
    return this.parent !== null && this.parent.children.length > 1;
  }

  public isEmpty(): boolean {
    return this.children.length === 0;
  }

  // Allow `for (const n of someNode) { ... }`
  public [Symbol.iterator](): Iterator<TreeNode<T>> {
    return TreeNode.preorder(this);
  }

  // True if any node in this subtree holds `obj` (by `===`)
  public contains(obj: T): boolean {
    for (const node of this) {
      if (node.data === obj) return true;
    }
    return false;
  }

  // Remove all descendants (but not this node itself)
  public clear(): void {
    for (const child of this.children) {
      child.clear();
    }
    this.children = [];
  }

  // Grab the data payload in pre-order as a flat array
  public toArray(): (T | null)[] {
    const out: (T | null)[] = [];
    for (const node of TreeNode.preorder(this)) {
      out.push(node.data);
    }
    return out;
  }

  public toString({
    node,
    data,
  }: {
    node?: (node: TreeNode<T>) => string;
    data?: (data: T | null) => string;
  } = {}): string {
    const role = this.isRoot() ? '(root)' : '';
    const childInfo = this.isLeaf()
      ? '(leaf)'
      : `has ${this.children.length.toString()} child node${
          this.children.length === 1 ? '' : 's'
        }`;
    return node
      ? node(this)
      : `[TreeNode ${role} ${childInfo}, data=[${
          data ? data(this.data) : JSON.stringify(this.data).slice(0, 160)
        }]]`;
  }

  // Human-readable dump with ASCII-tree lines
  public dump({
    node,
    data,
  }: {
    node?: (node: TreeNode<T>) => string;
    data?: (data: T | null) => string;
  } = {}): string {
    let result = '';
    for (const treeNode of TreeNode.preorder(this)) {
      const d = treeNode.depth;
      const prefix = d > 0 ? '│   '.repeat(d - 1) + '└── ' : '';
      result += prefix + treeNode.toString({ node, data }) + '\n';
    }
    return result;
  }
}
