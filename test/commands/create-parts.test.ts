import { IConfig } from '@oclif/config';
import { expect, test } from '@oclif/test';
import {
  CreatePartFromFileReq,
  FileRelationshipDataTypeEnum,
  Utf8,
  VertexClient,
} from '@vertexvis/api-client-node';
import { readFile } from 'fs-extra';
import { join } from 'path';
import sinon, { assert } from 'sinon';

import CreateParts from '../../src/commands/create-parts';
import { SceneItem } from '../../src/create-items';
import * as vc from '../../src/lib/client';

const client = {} as VertexClient;
const TestDataPath = join(__dirname, '..', 'test-data');
const GoldenPath = join(TestDataPath, 'golden.pvs.json');
const PN0FileName = 'PN0.ol';
const PN1FileName = 'PN1.ol';

describe('create-parts', () => {
  test
    .command(['create-parts'])
    .catch((error) => {
      expect(error.message).to.contain(
        "'undefined' is not a valid file path, exiting."
      );
    })
    .it('requires path');

  test
    .command(['create-parts', '-d', 'invalid', GoldenPath])
    .catch((error) => {
      expect(error.message).to.contain(
        "'invalid' is not a valid directory path, exiting."
      );
    })
    .it('requires directory to exist if provided');

  test
    .command(['create-parts', '-p', '0', GoldenPath])
    .catch((error) => {
      expect(error.message).to.contain(`Invalid parallelism '0'.`);
    })
    .it('requires parallelism > 0');

  test
    .command(['create-parts', '-p', '21', GoldenPath])
    .catch((error) => {
      expect(error.message).to.contain(`Invalid parallelism '21'.`);
    })
    .it('requires parallelism <= 20');

  test
    .command(['create-parts', GoldenPath])
    .catch((error) => {
      expect(error.message).to.contain(
        `'PN1.ol' is not a valid file path. Did you forget the '--directory' flag?`
      );
    })
    .it('requires paths in JSON to exist');

  test
    .stdout()
    .do(async () => {
      const createPartsFn = sinon.stub();
      const items = JSON.parse(await readFile(GoldenPath, Utf8));
      sinon.stub(vc, 'vertexClient').resolves(client);

      await new CreateParts(
        ['-v', '-d', TestDataPath, GoldenPath],
        {} as IConfig
      ).innerRun(createPartsFn);

      assert.calledTwice(createPartsFn);
      assertCreatePartsCall(
        createPartsFn.getCall(0).args[0],
        createReq(PN1FileName, items)
      );
      assertCreatePartsCall(
        createPartsFn.getCall(1).args[0],
        createReq(PN0FileName, items)
      );
    })
    .it('works');
});

function assertCreatePartsCall(
  act: CreatePartFromFileReq,
  exp: CreatePartFromFileReq
): void {
  expect(act.client).to.equal(exp.client);
  expect(act.createFileReq).to.deep.equal(exp.createFileReq);
  const fId = 'f-id';
  expect(act.createPartReq(fId)).to.deep.equal(exp.createPartReq(fId));
  expect(act.verbose).to.equal(exp.verbose);
}

function createReq(
  fileName: string,
  items: SceneItem[]
): CreatePartFromFileReq {
  const item = items.find((i) => i.source?.fileName === fileName);
  return {
    client,
    createFileReq: {
      data: {
        attributes: { name: fileName, suppliedId: fileName },
        type: 'file',
      },
    },
    createPartReq: (fileId) => ({
      data: {
        attributes: {
          indexMetadata: false,
          suppliedId: item?.source?.suppliedPartId,
          suppliedInstanceIdKey: undefined,
          suppliedRevisionId: item?.source?.suppliedRevisionId,
        },
        relationships: {
          source: {
            data: { id: fileId, type: FileRelationshipDataTypeEnum.File },
          },
        },
        type: 'part',
      },
    }),
    fileData: sinon.match.any,
    onMsg: console.error,
    verbose: true,
  };
}
