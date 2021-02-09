import { Command, flags } from '@oclif/command';
import { Input, OutputFlags } from '@oclif/parser';
import { BASE_PATH } from '@vertexvis/vertex-api-client';

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

  public async init(): Promise<void> {
    this.parsedFlags = this.parse(
      this.constructor as Input<typeof BaseCommand.flags>
    ).flags;
  }
}
