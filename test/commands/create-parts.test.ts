import { IConfig } from '@oclif/config';
import { expect, test } from '@oclif/test';
import { join } from 'path';
import sinon from 'sinon';

import CreateParts from '../../src/commands/create-parts';
import * as client from '../../src/lib/client';

const TestDataPath = join(__dirname, '..', 'test-data');
const GoldenPath = join(TestDataPath, 'golden.pvs.json');

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
      sinon.stub(client, 'vertexClient');
      await new CreateParts(
        ['-v', '-d', TestDataPath, GoldenPath],
        {} as IConfig
      ).innerRun(sinon.stub());
    })
    .it('works');
});

// describe('auth:whoami', () => {
//   test
// .nock('https://api.heroku.com', (api) =>
//   api
//     .get('/account')
//     // user is logged in, return their name
//     .reply(200, { email: 'jeff@example.com' })
// )
//     .stdout()
//     .command(['auth:whoami'])
//     .it('shows user email when logged in', (ctx) => {
//       expect(ctx.stdout).to.equal('jeff@example.com\n');
//     });

//   test
//     .nock('https://api.heroku.com', (api) =>
//       api
//         .get('/account')
//         // HTTP 401 means the user is not logged in with valid credentials
//         .reply(401)
//     )
//     .command(['auth:whoami'])
//     // checks to ensure the command exits with status 100
//     .exit(100)
//     .it('exits with status 100 when not logged in');
// });

// describe('hello', () => {
//   test
//     .stdout()
//     .command(['hello'])
//     .it('runs hello', (ctx) => {
//       expect(ctx.stdout).to.contain('hello world');
//     });

//   test
//     .stdout()
//     .command(['hello', '--name', 'jeff'])
//     .it('runs hello --name jeff', (ctx) => {
//       expect(ctx.stdout).to.contain('hello jeff');
//     });
// });
