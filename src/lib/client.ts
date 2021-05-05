import { VertexClient } from '@vertexvis/api-client-node';
import { Agent } from 'https';
import { Config } from './base';

export async function vertexClient(
  basePath: string,
  config?: Config
): Promise<VertexClient> {
  return VertexClient.build({
    axiosOptions: { httpsAgent: new Agent({ keepAlive: true }) },
    basePath,
    client: config?.client,
  });
}
