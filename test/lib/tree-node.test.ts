import { expect } from 'chai';

import { TreeNode } from '../../src/lib/tree-node';

describe('TreeNode', () => {
  let root: TreeNode<string>;
  let child1: TreeNode<string>;
  let child2: TreeNode<string>;
  let grandchild: TreeNode<string>;

  beforeEach(() => {
    root = new TreeNode('root');
    child1 = new TreeNode('child1', root);
    child2 = new TreeNode('child2', root);
    grandchild = new TreeNode('grandchild', child1);
  });

  describe('constructor', () => {
    it('creates a node with null data by default', () => {
      const node = new TreeNode();
      expect(node.data).to.be.null;
      expect(node.parent).to.be.null;
      expect(node.children).to.have.length(0);
    });

    it('links to parent and adds itself to parent children', () => {
      expect(child1.parent).to.equal(root);
      expect(child2.parent).to.equal(root);
      expect(root.children).to.include(child1);
      expect(root.children).to.include(child2);
    });
  });

  describe('size', () => {
    it('returns 1 for a leaf', () => {
      expect(grandchild.size).to.equal(1);
    });

    it('counts all descendants', () => {
      expect(root.size).to.equal(4);
    });
  });

  describe('depth', () => {
    it('returns 0 for root', () => {
      expect(root.depth).to.equal(0);
    });

    it('returns 1 for a direct child', () => {
      expect(child1.depth).to.equal(1);
    });

    it('returns 2 for a grandchild', () => {
      expect(grandchild.depth).to.equal(2);
    });
  });

  describe('numChildren', () => {
    it('returns 0 for a leaf', () => {
      expect(grandchild.numChildren).to.equal(0);
    });

    it('returns the correct child count', () => {
      expect(root.numChildren).to.equal(2);
    });
  });

  describe('numSiblings', () => {
    it('returns 0 for root', () => {
      expect(root.numSiblings).to.equal(0);
    });

    it('returns sibling count including self', () => {
      expect(child1.numSiblings).to.equal(2);
    });

    it('returns 1 for an only child', () => {
      expect(grandchild.numSiblings).to.equal(1);
    });
  });

  describe('isRoot', () => {
    it('returns true for root', () => {
      expect(root.isRoot()).to.be.true;
    });

    it('returns false for non-root', () => {
      expect(child1.isRoot()).to.be.false;
    });
  });

  describe('isLeaf', () => {
    it('returns true for a leaf', () => {
      expect(grandchild.isLeaf()).to.be.true;
    });

    it('returns false for a non-leaf', () => {
      expect(root.isLeaf()).to.be.false;
    });
  });

  describe('hasChildren', () => {
    it('returns true when node has children', () => {
      expect(root.hasChildren()).to.be.true;
    });

    it('returns false for a leaf', () => {
      expect(grandchild.hasChildren()).to.be.false;
    });
  });

  describe('hasSiblings', () => {
    it('returns false for root', () => {
      expect(root.hasSiblings()).to.be.false;
    });

    it('returns true when node has siblings', () => {
      expect(child1.hasSiblings()).to.be.true;
    });

    it('returns false for an only child', () => {
      expect(grandchild.hasSiblings()).to.be.false;
    });
  });

  describe('isEmpty', () => {
    it('returns true for a leaf', () => {
      expect(grandchild.isEmpty()).to.be.true;
    });

    it('returns false when node has children', () => {
      expect(root.isEmpty()).to.be.false;
    });
  });

  describe('preorder', () => {
    it('yields nodes in pre-order', () => {
      const nodes = [...TreeNode.preorder(root)].map((n) => n.data);
      expect(nodes).to.deep.equal(['root', 'child1', 'grandchild', 'child2']);
    });
  });

  describe('[Symbol.iterator]', () => {
    it('iterates nodes in pre-order', () => {
      const data = [...root].map((n) => n.data);
      expect(data).to.deep.equal(['root', 'child1', 'grandchild', 'child2']);
    });
  });

  describe('contains', () => {
    it('returns true when the value exists in the subtree', () => {
      expect(root.contains('grandchild')).to.be.true;
    });

    it('returns false when the value does not exist', () => {
      expect(root.contains('missing')).to.be.false;
    });
  });

  describe('clear', () => {
    it('removes all descendants', () => {
      root.clear();
      expect(root.children).to.have.length(0);
      expect(root.size).to.equal(1);
    });

    it('recursively clears nested children', () => {
      root.clear();
      expect(child1.children).to.have.length(0);
    });
  });

  describe('toArray', () => {
    it('returns data payloads in pre-order', () => {
      expect(root.toArray()).to.deep.equal([
        'root',
        'child1',
        'grandchild',
        'child2',
      ]);
    });
  });

  describe('toString', () => {
    it('includes [TreeNode in the output', () => {
      expect(root.toString()).to.contain('[TreeNode');
    });

    it('marks root with (root)', () => {
      expect(root.toString()).to.contain('(root)');
    });

    it('marks leaves with (leaf)', () => {
      expect(grandchild.toString()).to.contain('(leaf)');
    });

    it('shows singular "child node" for exactly one child', () => {
      expect(child1.toString()).to.contain('1 child node');
    });

    it('shows plural "child nodes" for multiple children', () => {
      expect(root.toString()).to.contain('2 child nodes');
    });

    it('uses custom node formatter when provided', () => {
      expect(root.toString({ node: (n) => `id:${n.data}` })).to.equal(
        'id:root'
      );
    });

    it('uses custom data formatter when provided', () => {
      expect(root.toString({ data: (d) => `<${d}>` })).to.contain('<root>');
    });
  });

  describe('dump', () => {
    it('returns a multiline string containing all nodes', () => {
      const out = root.dump();
      expect(out).to.contain('root');
      expect(out).to.contain('child1');
      expect(out).to.contain('grandchild');
      expect(out).to.contain('child2');
    });

    it('includes tree prefix characters for children', () => {
      expect(root.dump()).to.contain('└──');
    });

    it('accepts custom node and data formatters', () => {
      const out = root.dump({ data: (d) => `[${d}]` });
      expect(out).to.contain('[root]');
      expect(out).to.contain('[child1]');
    });
  });
});
