import { flags } from '@oclif/command';
import { Input, OutputFlags } from '@oclif/parser';
import BaseCommand from './base';

export default abstract class BaseDeleteCommand extends BaseCommand {
  public static flags = {
    ...BaseCommand.flags,
    all: flags.boolean({
      description: 'Delete all resources.',
      default: false,
    }),
  };

  protected parsedFlags?: OutputFlags<typeof BaseDeleteCommand.flags>;

  public async init(): Promise<void> {
    this.parsedFlags = this.parse(
      this.constructor as Input<typeof BaseDeleteCommand.flags>
    ).flags;
    await super.init();
  }
}
