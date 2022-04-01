// import { IConfig } from '@oclif/config';
import { IConfig } from '@oclif/config';
import { expect, test } from '@oclif/test';
import { CreateExportReq, VertexClient } from '@vertexvis/api-client-node';
import sinon, { assert } from 'sinon';

import CreateExport from '../../../src/commands/exports/create';
import * as vc from '../../../src/lib/client';

describe('exports:create', () => {
  afterEach(() => {
    sinon.restore();
  });

  test
    .command(['exports:create'])
    .catch((error) => {
      expect(error.message).to.contain(
        'Missing required flag:\n --sceneId SCENEID'
      );
    })
    .it('requires sceneId');

  test
    .command(['exports:create', '--sceneId', 'my-scene-id'])
    .catch((error) => {
      expect(error.message).to.contain(
        'Missing required flag:\n --format FORMAT'
      );
    })
    .it('requires format');

  test
    .stdout()
    .do(async () => {
      const createExportFn = sinon.stub();
      const sceneId = 's-id';
      const format = 'jt';
      const getQueuedExport = sinon.stub();
      const client = {
        queuedExport: { getQueuedExport },
      } as unknown as VertexClient;
      const exp: CreateExportReq = {
        client: client,
        createExportReq: () => ({
          data: {
            attributes: {
              config: {
                format: format,
              },
            },
            type: 'export',
            relationships: {
              source: {
                data: {
                  id: sceneId,
                  type: 'scene',
                },
              },
            },
          },
        }),
        onMsg: console.log,
        verbose: true,
      };
      sinon.stub(vc, 'vertexClient').resolves(client);
      createExportFn.resolves({
        data: { id: 'some-export-id' },
      });

      await new CreateExport(
        ['--sceneId', sceneId, '--format', format, '--verbose'],
        {} as IConfig
      ).innerRun(createExportFn);

      assert.calledOnce(createExportFn);
      const act: CreateExportReq = createExportFn.getCall(0).args[0];
      expect(act.client).to.equal(exp.client);
      console.log(`expected ${JSON.stringify(exp.createExportReq())}`);
      console.log(`actual   ${JSON.stringify(act.createExportReq())}`);
      expect(act.createExportReq().data.attributes.config.format).equal(format);
      expect(act.createExportReq().data.type).equal('export');
      expect(act.createExportReq().data.relationships.source.data.id).equal(
        sceneId
      );
      expect(act.createExportReq().data.relationships.source.data.type).equal(
        'scene'
      );
      // expect(act.createExportReq).to.deep.equal(exp.createExportReq);
    })
    .it('works');
});
