import { flags } from '@oclif/command';
import { logError } from '@vertexvis/api-client-node';

import BaseCommand from '../../lib/base';
import { vertexClient } from '../../lib/client';

export default class Create extends BaseCommand {
  public static description = `Create a webhook subscription.`;

  public static examples = [
    `$ vertex webhook-subscriptions:create --topics queued-translation.completed,scene.updated --url https://example.com
ta47eOIQtg13pSyf/PgpAB47r4JYJoAZfyzAcB5x8IHo+gQ
`,
  ];

  public static flags = {
    ...BaseCommand.flags,
    topics: flags.string({
      description: `Comma-separated list of topics.`,
      required: true,
    }),
    url: flags.string({
      description: `URL Vertex will POST webhook events.`,
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      flags: { topics, url },
    } = this.parse(Create);
    const basePath = this.parsedFlags?.basePath;

    try {
      const u = new URL(url);
      if (u.protocol !== 'https:') this.error('HTTPS URL required.');
    } catch {
      this.error('Valid URL required.');
    }

    try {
      const client = await vertexClient(basePath, this.userConfig);
      const res = await client.webhookSubscriptions.createWebhookSubscription({
        createWebhookSubscriptionRequest: {
          data: {
            attributes: { url, topics: topics.split(',') },
            type: 'webhook-subscription',
          },
        },
      });

      this.log(res.data.data.attributes.secret);
    } catch (error) {
      logError(error, this.error);
    }
  }
}
