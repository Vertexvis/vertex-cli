import { Command, flags } from '@oclif/command';
import { Input, OutputFlags } from '@oclif/parser';

export default abstract class BaseCommand extends Command {
  public static flags = {
    help: flags.help({ char: 'h' }),
    environment: flags.string({
      char: 'e',
      description: 'Vertex API environment.',
      default: 'platprod',
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
