import { flags } from '@oclif/command';
import { Input, OutputFlags } from '@oclif/parser';
import BaseGetCommand from './base-get';

export default abstract class BaseListCommand extends BaseGetCommand {
  public static flags = {
    ...BaseGetCommand.flags,
    cursor: flags.string({
      description: 'Cursor for next page of items.',
    }),
  };

  protected parsedFlags?: OutputFlags<typeof BaseListCommand.flags>;

  public async init(): Promise<void> {
    this.parsedFlags = this.parse(
      this.constructor as Input<typeof BaseListCommand.flags>
    ).flags;
    await super.init();
  }
}
