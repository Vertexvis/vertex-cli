import { expect } from 'chai';

import {
  buildTreeFromFlat,
  buildTreeFromNested,
} from '../../src/lib/tree-builder';

interface Item {
  id: string;
  parentId?: string;
  name: string;
  children?: Item[];
}

describe('tree-builder', () => {
  describe('buildTreeFromNested', () => {
    it('builds a single node from a leaf record', () => {
      const root = buildTreeFromNested<Item>({ id: '1', name: 'root' });
      expect(root.data?.id).to.equal('1');
      expect(root.children).to.have.length(0);
      expect(root.isRoot()).to.be.true;
    });

    it('builds nested children', () => {
      const data: Item = {
        id: '1',
        name: 'root',
        children: [
          { id: '2', name: 'child1', children: [] },
          { id: '3', name: 'child2', children: [] },
        ],
      };
      const root = buildTreeFromNested(data);
      expect(root.children).to.have.length(2);
      expect(root.children[0].data?.id).to.equal('2');
      expect(root.children[1].data?.id).to.equal('3');
    });

    it('links parents correctly', () => {
      const data: Item = {
        id: '1',
        name: 'root',
        children: [{ id: '2', name: 'child', children: [] }],
      };
      const root = buildTreeFromNested(data);
      expect(root.children[0].parent).to.equal(root);
    });

    it('builds deeply nested trees', () => {
      const data: Item = {
        id: '1',
        name: 'root',
        children: [
          {
            id: '2',
            name: 'child',
            children: [{ id: '3', name: 'grandchild', children: [] }],
          },
        ],
      };
      const root = buildTreeFromNested(data);
      expect(root.size).to.equal(3);
      expect(root.children[0].children[0].data?.id).to.equal('3');
      expect(root.children[0].children[0].depth).to.equal(2);
    });
  });

  describe('buildTreeFromFlat', () => {
    const records: Item[] = [
      { id: '1', parentId: undefined, name: 'Root' },
      { id: '2', parentId: '1', name: 'Child 1' },
      { id: '3', parentId: '1', name: 'Child 2' },
      { id: '4', parentId: '2', name: 'Grandchild 1' },
    ];

    const idFn = (r: Item): string => r.id;
    const parentFn = (r: Item): string | undefined => r.parentId;

    it('returns a single root for a rooted tree', () => {
      const roots = buildTreeFromFlat(records, idFn, parentFn);
      expect(roots).to.have.length(1);
    });

    it('sets the correct data on the root', () => {
      const [root] = buildTreeFromFlat(records, idFn, parentFn);
      expect(root.data?.name).to.equal('Root');
    });

    it('attaches correct children to root', () => {
      const [root] = buildTreeFromFlat(records, idFn, parentFn);
      expect(root.children).to.have.length(2);
    });

    it('sets parent references on children', () => {
      const [root] = buildTreeFromFlat(records, idFn, parentFn);
      expect(root.children[0].parent).to.equal(root);
      expect(root.children[1].parent).to.equal(root);
    });

    it('places grandchildren at the correct depth', () => {
      const [root] = buildTreeFromFlat(records, idFn, parentFn);
      const grandchild = root.children[0].children[0];
      expect(grandchild.depth).to.equal(2);
      expect(grandchild.data?.name).to.equal('Grandchild 1');
    });

    it('returns multiple roots for a forest', () => {
      const multiRoot: Item[] = [
        { id: '1', name: 'Root A' },
        { id: '2', name: 'Root B' },
      ];
      const roots = buildTreeFromFlat(multiRoot, idFn, parentFn);
      expect(roots).to.have.length(2);
    });

    it('treats records with unknown parent ids as roots', () => {
      const orphan: Item[] = [{ id: '1', parentId: 'missing', name: 'Orphan' }];
      const roots = buildTreeFromFlat(orphan, idFn, parentFn);
      expect(roots).to.have.length(1);
      expect(roots[0].parent).to.be.null;
    });

    it('returns an empty array for empty input', () => {
      expect(buildTreeFromFlat([], idFn, parentFn)).to.deep.equal([]);
    });
  });
});
