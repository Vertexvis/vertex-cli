import { Command, flags } from '@oclif/command';
import { Input, OutputFlags } from '@oclif/parser';
import { BASE_PATH } from '@vertexvis/api-client-node';
import { readJSON } from 'fs-extra';
import { join } from 'path';

export interface Config {
  client?: {
    id?: string;
    secret?: string;
  };
}

export interface FileConfig {
  [basePath: string]: Config;
}

const BasePathAliases = new Map<string, string>();
BasePathAliases.set('platdev', 'https://platform.platdev.vertexvis.io');
BasePathAliases.set('platstaging', 'https://platform.platstaging.vertexvis.io');

export default abstract class BaseCommand extends Command {
  public static flags = {
    help: flags.help({ char: 'h' }),
    basePath: flags.string({
      char: 'b',
      description: 'Vertex API base path.',
      default: BASE_PATH,
    }),
    verbose: flags.boolean({ char: 'v' }),
  };

  protected parsedFlags?: OutputFlags<typeof BaseCommand.flags>;
  protected userConfig?: Config;

  public async init(): Promise<void> {
    this.parsedFlags = this.parse(
      this.constructor as Input<typeof BaseCommand.flags>
    ).flags;
    const bp = this.parsedFlags.basePath;
    const basePath = BasePathAliases.get(bp) ?? bp;
    this.parsedFlags.basePath = basePath;

    const id = process.env.VERTEX_CLIENT_ID;
    const secret = process.env.VERTEX_CLIENT_SECRET;
    let config: Config = { client: { id, secret } };
    if (id || secret) {
      this.warn(
        'VERTEX_CLIENT_ID and/or VERTEX_CLIENT_SECRET exported, this overrides credentials set with `configure` command.'
      );
    }

    if (!id || !secret) {
      try {
        const configPath = join(this.config.configDir, 'config.json');
        const fileConfig: FileConfig = await readJSON(configPath);
        config = fileConfig[basePath];
      } catch {
        this.log(
          `Unable to find Vertex credentials for ${basePath}, try running 'configure'.`
        );
      }
    }

    this.userConfig = config;
  }
}
