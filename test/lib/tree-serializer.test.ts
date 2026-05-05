import { expect } from 'chai';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

import { TreeNode } from '../../src/lib/tree-node';
import {
  deserializeTreeFromBuffer,
  deserializeTreeFromFile,
  serializeTreeToBuffer,
  serializeTreeToFile,
  serializeTreeToZipFile,
} from '../../src/lib/tree-serializer';

interface NodeData {
  id: string;
  value: number;
}

// Builds: root -> [child1 -> grandchild, child2]
function makeTree(): TreeNode<NodeData> {
  const root = new TreeNode<NodeData>({ id: 'root', value: 1 });
  const child1 = new TreeNode<NodeData>({ id: 'child1', value: 2 }, root);
  const grandchild = new TreeNode<NodeData>({ id: 'grandchild', value: 3 });
  grandchild.parent = child1;
  child1.children.push(grandchild);
  const child2 = new TreeNode<NodeData>({ id: 'child2', value: 4 });
  child2.parent = root;
  root.children.push(child2);
  return root;
}

// Asserts that two trees contain identical data in pre-order and that parent
// links are wired correctly on the restored tree.
function assertTreeRoundTrip(
  original: TreeNode<NodeData>,
  restored: TreeNode<NodeData>
): void {
  expect([...restored].map((n) => n.data)).to.deep.equal(
    [...original].map((n) => n.data)
  );
  for (const node of restored) {
    for (const child of node.children) {
      expect(child.parent).to.equal(node);
    }
  }
}

// Reads the first (and only) entry from a single-entry ZIP file without
// external dependencies.  Sizes are taken from the central directory, which
// is always authoritative even when the local file header carries zeros (bit-3
// data-descriptor flag).
function readFirstZipEntry(filePath: string): {
  name: string;
  content: string;
} {
  const buf = fs.readFileSync(filePath);

  if (buf.readUInt32LE(0) !== 0x04034b50) {
    throw new Error('Not a ZIP file (missing PK\\x03\\x04 signature)');
  }

  // Locate the End of Central Directory record (PK\x05\x06 = 0x06054b50).
  // Scan backwards from the end to handle a trailing comment.
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('EOCD record not found');

  // Offset of the first central directory header.
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  if (buf.readUInt32LE(cdOffset) !== 0x02014b50) {
    throw new Error('Invalid central directory signature');
  }

  const compressionMethod = buf.readUInt16LE(cdOffset + 10);
  const compressedSize = buf.readUInt32LE(cdOffset + 20);
  const fileNameLen = buf.readUInt16LE(cdOffset + 28);
  const localHeaderOffset = buf.readUInt32LE(cdOffset + 42);

  const name = buf
    .subarray(cdOffset + 46, cdOffset + 46 + fileNameLen)
    .toString('utf8');

  // Jump to the local file header to find where the data begins.
  const lfhFileNameLen = buf.readUInt16LE(localHeaderOffset + 26);
  const lfhExtraFieldLen = buf.readUInt16LE(localHeaderOffset + 28);
  const dataOffset = localHeaderOffset + 30 + lfhFileNameLen + lfhExtraFieldLen;

  const compressedData = buf.subarray(dataOffset, dataOffset + compressedSize);
  const content =
    compressionMethod === 0
      ? compressedData.toString('utf8')
      : zlib.inflateRawSync(compressedData).toString('utf8');

  return { name, content };
}

// ─── serializeTreeToBuffer / deserializeTreeFromBuffer ───────────────────────

describe('serializeTreeToBuffer / deserializeTreeFromBuffer', () => {
  it('round-trips a multi-level tree as plain JSON', async () => {
    const root = makeTree();
    const buf = await serializeTreeToBuffer({ root });
    expect(buf).to.be.instanceOf(Buffer);
    // Must not start with gzip magic bytes.
    expect(buf[0]).to.not.equal(0x1f);
    assertTreeRoundTrip(root, deserializeTreeFromBuffer({ buffer: buf }));
  });

  it('round-trips a multi-level tree as gzipped JSON', async () => {
    const root = makeTree();
    const buf = await serializeTreeToBuffer({ root, compress: true });
    expect(buf[0]).to.equal(0x1f);
    expect(buf[1]).to.equal(0x8b);
    assertTreeRoundTrip(root, deserializeTreeFromBuffer({ buffer: buf }));
  });

  it('produces smaller output with compression', async () => {
    const root = makeTree();
    const plain = await serializeTreeToBuffer({ root });
    const compressed = await serializeTreeToBuffer({ root, compress: true });
    expect(compressed.length).to.be.lessThan(plain.length);
  });

  it('plain buffer is valid JSON', async () => {
    const root = makeTree();
    const buf = await serializeTreeToBuffer({ root });
    const parsed = JSON.parse(buf.toString('utf8'));
    expect(parsed).to.have.property('data');
    expect(parsed).to.have.property('children');
  });

  it('pretty option inserts newlines into the JSON', async () => {
    const root = new TreeNode<NodeData>({ id: 'r', value: 0 });
    const buf = await serializeTreeToBuffer({ root, pretty: true });
    expect(buf.toString('utf8')).to.include('\n');
  });

  it('handles a single-node (leaf) tree', async () => {
    const root = new TreeNode<NodeData>({ id: 'solo', value: 42 });
    const buf = await serializeTreeToBuffer({ root });
    const restored = deserializeTreeFromBuffer<NodeData>({ buffer: buf });
    expect(restored.data).to.deep.equal({ id: 'solo', value: 42 });
    expect(restored.children).to.have.length(0);
    expect(restored.isRoot()).to.be.true;
    expect(restored.isLeaf()).to.be.true;
  });

  it('restores parent links correctly', async () => {
    const root = makeTree();
    const restored = deserializeTreeFromBuffer<NodeData>({
      buffer: await serializeTreeToBuffer({ root }),
    });
    const grandchild = restored.children[0].children[0];
    const grandchildParent = grandchild.parent;
    expect(grandchildParent).to.equal(restored.children[0]);
    expect(grandchildParent?.parent).to.equal(restored);
    expect(grandchildParent?.parent?.parent).to.be.null;
  });
});

// ─── serializeTreeToFile / deserializeTreeFromFile ───────────────────────────

describe('serializeTreeToFile / deserializeTreeFromFile', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vertex-cli-file-test-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('round-trips a multi-level tree as plain JSON', async () => {
    const root = makeTree();
    const filePath = path.join(tmpDir, 'tree.json');
    await serializeTreeToFile({ root, filePath });
    expect(fs.existsSync(filePath)).to.be.true;
    assertTreeRoundTrip(root, deserializeTreeFromFile<NodeData>({ filePath }));
  });

  it('round-trips a multi-level tree as gzipped JSON', async () => {
    const root = makeTree();
    const filePath = path.join(tmpDir, 'tree.json.gz');
    await serializeTreeToFile({ root, filePath, compress: true });
    const bytes = fs.readFileSync(filePath);
    expect(bytes[0]).to.equal(0x1f);
    expect(bytes[1]).to.equal(0x8b);
    assertTreeRoundTrip(root, deserializeTreeFromFile<NodeData>({ filePath }));
  });

  it('creates nested output directories if they do not exist', async () => {
    const root = new TreeNode<NodeData>({ id: 'r', value: 0 });
    const filePath = path.join(tmpDir, 'a', 'b', 'c', 'tree.json');
    await serializeTreeToFile({ root, filePath });
    expect(fs.existsSync(filePath)).to.be.true;
  });

  it('overwrites an existing file', async () => {
    const root1 = new TreeNode<NodeData>({ id: 'first', value: 1 });
    const root2 = new TreeNode<NodeData>({ id: 'second', value: 2 });
    const filePath = path.join(tmpDir, 'overwrite.json');
    await serializeTreeToFile({ root: root1, filePath });
    await serializeTreeToFile({ root: root2, filePath });
    const restored = deserializeTreeFromFile<NodeData>({ filePath });
    expect(restored.data).to.deep.equal({ id: 'second', value: 2 });
  });

  it('auto-detects gzip when deserializing a .gz file', async () => {
    const root = makeTree();
    const filePath = path.join(tmpDir, 'autodetect.json.gz');
    await serializeTreeToFile({ root, filePath, compress: true });
    // deserializeTreeFromFile has no compress flag — it detects gzip by magic bytes
    const restored = deserializeTreeFromFile<NodeData>({ filePath });
    expect(restored.data).to.deep.equal(root.data);
    expect(restored.children).to.have.length(2);
  });
});

// ─── serializeTreeToZipFile ───────────────────────────────────────────────────

describe('serializeTreeToZipFile', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vertex-cli-zip-test-'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a non-empty ZIP file at the specified path', async () => {
    const root = makeTree();
    const filePath = path.join(tmpDir, 'tree.zip');
    await serializeTreeToZipFile({ root, filePath, entryName: 'tree.json' });
    expect(fs.existsSync(filePath)).to.be.true;
    expect(fs.statSync(filePath).size).to.be.greaterThan(0);
  });

  it('ZIP file begins with PK\\x03\\x04 magic bytes', async () => {
    const root = makeTree();
    const filePath = path.join(tmpDir, 'magic.zip');
    await serializeTreeToZipFile({ root, filePath, entryName: 'tree.json' });
    const bytes = fs.readFileSync(filePath);
    expect(bytes[0]).to.equal(0x50); // 'P'
    expect(bytes[1]).to.equal(0x4b); // 'K'
    expect(bytes[2]).to.equal(0x03);
    expect(bytes[3]).to.equal(0x04);
  });

  it('entry inside the ZIP has the correct name', async () => {
    const root = makeTree();
    const entryName = 'f79d4760-0b71-44e4-ad0b-22743fdd4ca3.json';
    const filePath = path.join(tmpDir, 'named.zip');
    await serializeTreeToZipFile({ root, filePath, entryName });
    const { name } = readFirstZipEntry(filePath);
    expect(name).to.equal(entryName);
  });

  it('different entryName values produce differently-named entries', async () => {
    const root = new TreeNode<NodeData>({ id: 'r', value: 0 });
    const fp1 = path.join(tmpDir, 'alpha.zip');
    const fp2 = path.join(tmpDir, 'beta.zip');
    await serializeTreeToZipFile({
      root,
      filePath: fp1,
      entryName: 'alpha.json',
    });
    await serializeTreeToZipFile({
      root,
      filePath: fp2,
      entryName: 'beta.json',
    });
    expect(readFirstZipEntry(fp1).name).to.equal('alpha.json');
    expect(readFirstZipEntry(fp2).name).to.equal('beta.json');
  });

  it('ZIP entry content contains the correct root-node data', async () => {
    const root = makeTree();
    const filePath = path.join(tmpDir, 'content-root.zip');
    await serializeTreeToZipFile({ root, filePath, entryName: 'scene.json' });
    const { content } = readFirstZipEntry(filePath);
    const parsed = JSON.parse(content);
    expect(parsed.data).to.deep.equal({ id: 'root', value: 1 });
  });

  it('ZIP entry content preserves the full tree structure', async () => {
    const root = makeTree();
    const filePath = path.join(tmpDir, 'content-full.zip');
    await serializeTreeToZipFile({ root, filePath, entryName: 'scene.json' });
    const { content } = readFirstZipEntry(filePath);
    const parsed = JSON.parse(content);

    expect(parsed.children).to.have.length(2);
    expect(parsed.children[0].data).to.deep.equal({ id: 'child1', value: 2 });
    expect(parsed.children[0].children[0].data).to.deep.equal({
      id: 'grandchild',
      value: 3,
    });
    expect(parsed.children[1].data).to.deep.equal({ id: 'child2', value: 4 });
    expect(parsed.children[1].children).to.have.length(0);
  });

  it('ZIP entry content round-trips back to an equivalent TreeNode', async () => {
    const root = makeTree();
    const filePath = path.join(tmpDir, 'roundtrip.zip');
    await serializeTreeToZipFile({ root, filePath, entryName: 'scene.json' });
    const { content } = readFirstZipEntry(filePath);
    const restored = deserializeTreeFromBuffer<NodeData>({
      buffer: Buffer.from(content, 'utf8'),
    });
    assertTreeRoundTrip(root, restored);
  });

  it('creates nested output directories if they do not exist', async () => {
    const root = new TreeNode<NodeData>({ id: 'r', value: 0 });
    const filePath = path.join(tmpDir, 'sub', 'dir', 'tree.zip');
    await serializeTreeToZipFile({ root, filePath, entryName: 'tree.json' });
    expect(fs.existsSync(filePath)).to.be.true;
  });
});
