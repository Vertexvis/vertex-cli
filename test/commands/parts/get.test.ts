import { IConfig } from '@oclif/config';
import { expect, test } from '@oclif/test';
import { VertexClient } from '@vertexvis/api-client-node';
import sinon from 'sinon';

import Get from '../../../src/commands/parts/get';
import * as vc from '../../../src/lib/client';
import * as g from '../../../src/lib/getter';

const id = 'my-id';

describe('parts:get', () => {
  afterEach(() => {
    sinon.restore();
  });

  test
    .command(['parts:get'])
    .catch((error) => {
      expect(error.message).to.contain('Missing 1 required arg:');
      expect(error.message).to.contain('id');
    })
    .it('requires id');

  test
    .stdout()
    .do(async () => {
      sinon
        .stub(vc, 'vertexClient')
        .resolves(sinon.stub() as unknown as VertexClient);
      sinon.stub(g, 'getterFn').resolves(sinon.stub() as unknown as void);
      sinon.stub(g, 'partGetter').resolves(sinon.stub());

      await new Get([id], {} as IConfig).run();
    })
    .it('works', (ctx) => {
      expect(ctx.stdout).to.contain('');
    });
});
