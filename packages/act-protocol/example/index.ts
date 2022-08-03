import { AsyncCall } from 'async-call-rpc';
import { MessagePortChannel, ContentFunctions } from '../src';

const channel = new MessageChannel();

AsyncCall<ContentFunctions>(
  null,
  {
    channel: new MessagePortChannel(channel.port1),
    log: { sendLocalStack: true },
  },
);

const inner = document.getElementById('inner')! as HTMLIFrameElement;
inner.addEventListener('load', () => {
  inner.contentWindow!.postMessage(channel.port2, '*', [channel.port2]);
});
