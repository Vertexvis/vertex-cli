import { IConfig } from '@oclif/config';
import { expect, test } from '@oclif/test';
import {
  CreatePartFromFileReq,
  FileRelationshipDataTypeEnum,
  PartRevisionData,
  Utf8,
  VertexClient,
} from '@vertexvis/api-client-node';
import { readFile } from 'fs-extra';
import { join } from 'path';
import sinon, { assert, SinonSpyCall } from 'sinon';

import CreateParts from '../../src/commands/create-parts';
import { SceneItem } from '../../src/create-items/index.d';
import * as vc from '../../src/lib/client';

const client = {} as VertexClient;
const TestDataPath = join(__dirname, '..', 'test-data');
const GoldenPath = join(TestDataPath, 'golden.pvs.json');
const PN0FileName = 'PN0.ol';
const PN1FileName = 'PN1.ol';

describe('create-parts', () => {
  afterEach(() => {
    sinon.restore();
  });

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
    .it('requires above lower-bound');

  test
    .command(['create-parts', '-p', '21', GoldenPath])
    .catch((error) => {
      expect(error.message).to.contain(`Invalid parallelism '21'.`);
    })
    .it('requires below upper-bound');

  test
    .do(() => {
      sinon.stub(vc, 'vertexClient').resolves(client);
    })
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

      const calls = createPartsFn.getCalls();
      assertCreatePartsCall(
        createReq(PN1FileName, items),
        getCall(PN1FileName, calls)
      );
      assertCreatePartsCall(
        createReq(PN0FileName, items),
        getCall(PN0FileName, calls)
      );
    })
    .it('works');
});

function assertCreatePartsCall(
  exp: CreatePartFromFileReq,
  act?: CreatePartFromFileReq
): void {
  expect(act?.client).to.equal(exp.client);
  expect(act?.createFileReq).to.deep.equal(exp.createFileReq);
  const fId = 'f-id';
  expect(act?.createPartReq(fId)).to.deep.equal(exp.createPartReq(fId));
  expect(act?.verbose).to.equal(exp.verbose);
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
          indexMetadata: true,
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
    fileData: sinon.match.any as unknown as Buffer,
    onMsg: console.error,
    verbose: true,
  };
}

function getCall(
  fileName: string,
  calls: SinonSpyCall<CreatePartFromFileReq[], Promise<PartRevisionData>>[]
): CreatePartFromFileReq | undefined {
  return calls.find(
    (c) => c.args[0].createFileReq.data.attributes.name === fileName
  )?.args[0];
}
