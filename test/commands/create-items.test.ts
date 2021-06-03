import { expect, test } from '@oclif/test';
import { readFileSync } from 'fs';
import { join } from 'path';

import { deleteFile } from '../../src/lib/fs';

const TestDataPath = join(__dirname, '..', 'test-data');
const GoldenPath = join(TestDataPath, 'golden.pvs.json');
const DstPath = join(__dirname, 'out.json');
const SrcPath = join(TestDataPath, 'golden.pvs.xml');

describe('create-items', () => {
  afterEach(() => {
    deleteFile(DstPath);
  });

  test
    .command(['create-items'])
    .catch((error) => {
      expect(error.message).to.contain('Missing required flag:');
      expect(error.message).to.contain('-f, --format FORMAT');
    })
    .it('requires --format');

  test
    .command(['create-items', '-f', 'xml'])
    .catch((error) => {
      expect(error.message).to.contain(
        'Expected --format=xml to be one of: pvs'
      );
    })
    .it('requires valid --format');

  test
    .command(['create-items', '-f', 'pvs'])
    .catch((error) => {
      expect(error.message).to.contain(
        "'undefined' is not a valid file path, exiting."
      );
    })
    .it('requires path');

  test
    .stdout()
    .command(['create-items', '-f', 'pvs', '-o', DstPath, SrcPath])
    .it('converts file', (ctx) => {
      expect(ctx.stdout).to.contain(
        `Wrote 5 pvs item(s) from '${SrcPath}' to '${DstPath}'.`
      );
      expect(readFileSync(GoldenPath).equals(readFileSync(DstPath))).to.be.true;
    });
});
