import { flags } from '@oclif/command';
import { Input, OutputFlags } from '@oclif/parser';

import BaseCommand from './base';

export default abstract class BaseRenderCommand extends BaseCommand {
  public static flags = {
    ...BaseCommand.flags,
    height: flags.integer({
      char: 'h',
      description: 'Image height.',
      default: 100,
    }),
    output: flags.string({
      char: 'o',
      description: 'Path to output file.',
    }),
    width: flags.integer({
      char: 'w',
      description: 'Image width.',
      default: 100,
    }),
  };

  protected parsedFlags?: OutputFlags<typeof BaseRenderCommand.flags>;

  public async init(): Promise<void> {
    this.parsedFlags = this.parse(
      this.constructor as Input<typeof BaseRenderCommand.flags>
    ).flags;
    await super.init();
  }
}
