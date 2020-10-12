import { Command, flags } from '@oclif/command';
import { Input, OutputFlags } from '@oclif/parser';

export default abstract class BaseCommand extends Command {
  public static flags = {
    help: flags.help({ char: 'h' }),
    basePath: flags.string({
      char: 'b',
      description: 'Vertex API base path.',
      default: 'https://platform.platprod.vertexvis.io',
    }),
    verbose: flags.boolean({ char: 'v' }),
  };

  protected parsedFlags?: OutputFlags<typeof BaseCommand.flags>;

  public async init(): Promise<void> {
    const { flags } = this.parse(
      this.constructor as Input<typeof BaseCommand.flags>
    );

    this.parsedFlags = flags;
  }
}
