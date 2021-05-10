import { VertexClient } from '@vertexvis/api-client-node';
import { HttpsAgent } from 'agentkeepalive';
import { Config } from './base';

export async function vertexClient(
  basePath: string,
  config?: Config
): Promise<VertexClient> {
  return VertexClient.build({
    axiosOptions: { httpsAgent: new HttpsAgent({ keepAlive: true }) },
    basePath,
    client: config?.client,
  });
}
