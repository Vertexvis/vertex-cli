import cli from 'cli-ux';
import { chmod, mkdirp, readJSON, writeFile } from 'fs-extra';
import { join } from 'path';

import BaseCommand, { FileConfig } from '../lib/base';
import { deleteFile, fileExists } from '../lib/fs';

const UserRw = 0o600; // rw- --- ---

export default class Configure extends BaseCommand {
  public static description = `Configure Vertex credentials.`;

  public static examples = [
    `$ vertex configure
Saved 'https://platform.vertexvis.com' configuration to '~/.config/@vertexvis/cli/config.json'.
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
    const oldPath = join(
      join(this.config.configDir, '..', 'vertex-cli'),
      'config.json'
    );
    const migrate = { exists: await fileExists(oldPath), oldPath };
    await mkdirp(this.config.configDir);
    await writeFile(
      configPath,
      JSON.stringify(
        await this.buildConfig({ basePath, configPath, id, migrate, secret })
      ),
      { mode: UserRw }
    );

    // Update permissions for already existing config files
    await chmod(configPath, UserRw);
    if (migrate.exists) await deleteFile(oldPath);

    this.log(`Saved '${basePath}' configuration to '${configPath}'.`);
  }

  private async buildConfig({
    basePath,
    configPath,
    id,
    migrate: { exists, oldPath },
    secret,
  }: {
    basePath: string;
    configPath: string;
    id: string;
    migrate: {
      exists: boolean;
      oldPath: string;
    };
    secret: string;
  }): Promise<FileConfig> {
    try {
      const fileConfig: FileConfig = await readJSON(
        exists ? oldPath : configPath
      );
      fileConfig[basePath] = { client: { id, secret } };

      return fileConfig;
    } catch {
      return { [basePath]: { client: { id, secret } } };
    }
  }
}
