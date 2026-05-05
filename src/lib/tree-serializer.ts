/**
 * These functions serialize and deserialize a TreeNode<T> to/from
 * a file or Buffer. The serialized format is JSON, and it can be
 * optionally gzipped for smaller size.
 *
 * See below for usage examples.
 *
 * File-based, gzipped:
 * await serializeTreeToFile({ root, filePath: './myTree.json.gz', compress: true });
 * const tree = deserializeTreeFromFile({ filePath: './myTree.json.gz' });
 *
 * Buffer-based, plain JSON:
 * const buf = serializeTreeToBuffer({ root, pretty: true });
 * const tree2 = deserializeTreeFromBuffer({ buffer: buf });
 *
 * Buffer-based, gzipped:
 * const gzBuf = await serializeTreeToBuffer({ root, compress: true });
 * const tree3 = deserializeTreeFromBuffer({ buffer: gzBuf });
 */
import archiver from 'archiver';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline, Readable, Transform } from 'node:stream';
import { finished } from 'node:stream/promises';
import { promisify } from 'node:util';
import zlib from 'node:zlib';

import { TreeNode } from './tree-node';

interface SerializedNode<T> {
  data: T;
  children: SerializedNode<T>[];
}

function buildTreeFromSerialized<T>(obj: SerializedNode<T>): TreeNode<T> {
  const node = new TreeNode<T>(obj.data);
  for (const childObj of obj.children) {
    const child = buildTreeFromSerialized(childObj);
    child.parent = node;
    node.children.push(child);
  }
  return node;
}

export interface SerializeFileOptions<T> {
  /** Root TreeNode to serialize */
  root: TreeNode<T>;
  /** Output path (will overwrite) */
  filePath: string;
  /** Whether to gzip the JSON before writing */
  compress?: boolean;
}

export interface DeserializeFileOptions {
  /** Path to read from (JSON or .gz) */
  filePath: string;
}

/*
 * Serialize a TreeNode<T> to disk as JSON or gzipped JSON.
 */
export async function serializeTreeToFile<T>({
  root,
  filePath,
  compress = false,
}: SerializeFileOptions<T>): Promise<void> {
  // ensure output folder exists
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  // create write stream (optionally gzip)
  const fileStream = fs.createWriteStream(filePath);
  const gzipStream = compress ? zlib.createGzip() : null;
  if (gzipStream) gzipStream.pipe(fileStream);
  const out = gzipStream ?? fileStream;

  async function writeChunk(chunk: string): Promise<void> {
    if (!out.write(chunk)) {
      await new Promise<void>((resolve, reject) => {
        out.once('drain', resolve);
        out.once('error', reject);
      });
    }
  }

  // write the JSON root opening
  await writeChunk('{"data":');
  await writeChunk(JSON.stringify(root.data));
  await writeChunk(',"children":[');

  // helper to write a node and its subtree
  async function writeNode(node: TreeNode<T>): Promise<void> {
    // open this node
    await writeChunk('{"data":');
    await writeChunk(JSON.stringify(node.data));
    await writeChunk(',"children":[');

    // write each child (comma-separated)
    for (let i = 0; i < node.children.length; i++) {
      if (i > 0) await writeChunk(',');
      // eslint-disable-next-line no-await-in-loop
      await writeNode(node.children[i]);
    }

    // close this node
    await writeChunk(']}');
  }

  // write top-level children
  for (let i = 0; i < root.children.length; i++) {
    if (i > 0) await writeChunk(',');
    // eslint-disable-next-line no-await-in-loop
    await writeNode(root.children[i]);
  }

  // close the JSON
  await writeChunk(']}');

  out.end();
  await finished(out);
}

/*
 * Read back a TreeNode<T> from disk, auto-detecting gzip.
 */
export function deserializeTreeFromFile<T>({
  filePath,
}: DeserializeFileOptions): TreeNode<T> {
  const buf = fs.readFileSync(filePath);
  const isGzipped = buf[0] === 0x1f && buf[1] === 0x8b;
  const json = (isGzipped ? zlib.gunzipSync(buf as Uint8Array) : buf).toString(
    'utf8'
  );

  // fallback to full parse—if your JSON is enormous you can
  // also hook in a streaming parser like `stream-json`
  const parsed = JSON.parse(json) as SerializedNode<T>;
  return buildTreeFromSerialized(parsed);
}

export interface BufferSerializeOptions<T> {
  /** Root TreeNode to serialize */
  root: TreeNode<T>;
  /** Pretty-print JSON (default false) */
  pretty?: boolean;
  /** Whether to gzip the JSON before returning */
  compress?: boolean;
}

export interface BufferDeserializeOptions {
  /** Buffer containing JSON or gzipped JSON */
  buffer: Buffer;
}

/*
 * Stream-serialize a TreeNode<T> into a Buffer of JSON or gzipped JSON
 * without ever building a giant string in memory.
 */
export async function serializeTreeToBuffer<T>({
  root,
  pretty = false,
  compress = false,
}: BufferSerializeOptions<T>): Promise<Buffer> {
  // Create a Readable that we'll push JSON fragments into
  const readable = new Readable({
    read() {
      // No-op; we push manually
    },
  });

  // Helper to push JSON fragments
  const push = (chunk: string): boolean => readable.push(chunk, 'utf8');

  // Start the JSON document
  push('{"data":');
  push(pretty ? JSON.stringify(root.data, null, 2) : JSON.stringify(root.data));
  push(',"children":[');

  // Recursive writer
  const writeNode = (node: TreeNode<T>): void => {
    push(pretty ? '\n{' : '{');
    push('"data":');
    push(
      pretty ? JSON.stringify(node.data, null, 2) : JSON.stringify(node.data)
    );
    push(',"children":[');
    node.children.forEach((child, idx) => {
      if (idx > 0) push(',');
      writeNode(child);
    });
    push(']');
    push('}');
  };

  // Write top-level children
  root.children.forEach((child, idx) => {
    if (idx > 0) push(',');
    writeNode(child);
  });

  // Close document
  push(']');
  push('}');
  readable.push(null);

  // Choose gzip or pass-through
  const transform = compress
    ? zlib.createGzip()
    : new Transform({
        transform(chunk, _enc, callback) {
          callback(null, chunk);
        },
      });

  // Collector for Buffer chunks
  const chunks: Buffer[] = [];
  const collector = new Transform({
    transform(chunk, _enc, callback) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else {
        chunks.push(Buffer.from(chunk));
      }
      callback();
    },
  });

  // Pipeline: readable -> transform -> collector
  const pipeAsync = promisify(pipeline);
  await pipeAsync(readable, transform, collector);

  // Combine all chunks into one Buffer
  return Buffer.concat(chunks as Uint8Array[]);
}

/*
 * Deserialize a TreeNode<T> from a Buffer of JSON or gzipped JSON.
 */
export function deserializeTreeFromBuffer<T>({
  buffer,
}: BufferDeserializeOptions): TreeNode<T> {
  // Detect gzip by magic numbers
  const isGz = buffer[0] === 0x1f && buffer[1] === 0x8b;
  const dataBuf = isGz ? zlib.gunzipSync(buffer as Uint8Array) : buffer;
  const parsed = JSON.parse(dataBuf.toString('utf8')) as SerializedNode<T>;

  return buildTreeFromSerialized(parsed);
}

export interface SerializeZipFileOptions<T> {
  /** Root TreeNode to serialize */
  root: TreeNode<T>;
  /** Output .zip file path (will overwrite) */
  filePath: string;
  /** Name of the JSON entry inside the zip (e.g. "my-tree.json") */
  entryName: string;
}

/*
 * Serialize a TreeNode<T> into a ZIP file containing a single JSON entry.
 */
export async function serializeTreeToZipFile<T>({
  root,
  filePath,
  entryName,
}: SerializeZipFileOptions<T>): Promise<void> {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const jsonBuffer = await serializeTreeToBuffer({ root });

  await new Promise<void>((resolve, reject) => {
    const fileStream = fs.createWriteStream(filePath);
    const archive = archiver('zip');

    fileStream.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(fileStream);
    archive.append(jsonBuffer, { name: entryName });
    archive.finalize().catch(reject);
  });
}
