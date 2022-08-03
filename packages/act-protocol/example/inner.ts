import { AsyncCall } from 'async-call-rpc';
import { MessagePortChannel, HostFunctions } from '../src';

const init = (event: MessageEvent) => {
  if (event.data instanceof MessagePort) {
    window.removeEventListener('message', init);
    AsyncCall<HostFunctions>(null, {
      channel: new MessagePortChannel(event.data as MessagePort),
      log: { sendLocalStack: true },
    });
  }
};

window.addEventListener('message', init);
