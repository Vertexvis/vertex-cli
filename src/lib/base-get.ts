import { flags } from '@oclif/command';
import { Input, OutputFlags } from '@oclif/parser';

import BaseCommand from './base';

export default abstract class BaseGetCommand extends BaseCommand {
  public static flags = {
    ...BaseCommand.flags,
    extended: flags.boolean({
      description: 'Display extended output.',
      default: false,
    }),
  };

  protected parsedFlags?: OutputFlags<typeof BaseGetCommand.flags>;

  public async init(): Promise<void> {
    this.parsedFlags = this.parse(
      this.constructor as Input<typeof BaseGetCommand.flags>
    ).flags;
    await super.init();
  }
}
