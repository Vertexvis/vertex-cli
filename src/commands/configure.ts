import cli from 'cli-ux';
import { mkdirp, readJSON, writeFile } from 'fs-extra';
import { join } from 'path';
import BaseCommand, { FileConfig } from '../base';

export default class Configure extends BaseCommand {
  public static description = `Configure Vertex credentials.`;

  public static examples = [
    `$ vertex configure
Saved 'https://platform.vertexvis.com' configuration to '~/.config/@vertexvis/vertex-cli/config.json'.
`,
  ];

  public static flags = { ...BaseCommand.flags };

  public async run(): Promise<void> {
    const basePath = this.parsedFlags?.basePath;
    const client = this.userConfig?.client;
    const id = await cli.prompt(`Vertex client ID`, {
      default: client?.id,
      required: false,
    });
    const secret = await cli.prompt(`Vertex client secret`, {
      default: client?.secret,
      required: false,
      type: 'hide',
    });

    const configPath = join(this.config.configDir, 'config.json');
    await mkdirp(this.config.configDir);
    await writeFile(
      configPath,
      JSON.stringify(await this.buildConfig(basePath, configPath, id, secret))
    );
    this.log(`Saved '${basePath}' configuration to '${configPath}'.`);
  }

  private async buildConfig(
    basePath: string,
    configPath: string,
    id: string,
    secret: string
  ): Promise<FileConfig> {
    try {
      const fileConfig: FileConfig = await readJSON(configPath);
      fileConfig[basePath] = { client: { id, secret } };
      return fileConfig;
    } catch {
      return { [basePath]: { client: { id, secret } } };
    }
  }
}
