import { Amqp } from "../deps.ts";
import { ChannelWrapper } from "./amqp/ChannelWrapper.ts";
import { ConnectionManager } from "./amqp/ConnectionManager.ts";


export default class MyMessageGateway {
  private manager: ConnectionManager;
  private nextPublishChannelNum = 0;
  private numPublishChannels = 10;
  protected publishChannels: ChannelWrapper[] = [];
  protected consumeChannel: ChannelWrapper;

  constructor(private amqpUrls: string[]) {
    this.manager = new ConnectionManager(this.amqpUrls, { reconnectTime: 5000 });
    for (let i = 0; i < this.numPublishChannels; i++) {
      this.publishChannels.push(
        this.manager.createChannel([
          async (channel: Amqp.AmqpChannel) => {
            await channel.declareQueue({ queue: 'my.debug.queue', durable: true });
          },
        ])
      )
    }

    this.consumeChannel = this.manager.createChannel([
      async (channel: Amqp.AmqpChannel) => {
        await channel.declareQueue({ queue: 'my.debug.queue', durable: true })
      }
    ]);
  }

  public async close() {
    await this.manager.close();
  }

  public async setup() {
    await this.manager.connect();
  }

  async publish<T>(
    queue: string,
    message: Omit<T, "headers">,
  ) {
    console.log(`${new Date().getTime()}`, 'publishing message')
    const messageId = crypto.randomUUID();

    const publishOnChannelNum = this.nextPublishChannelNum;
    if (publishOnChannelNum + 1 < this.numPublishChannels) {
      this.nextPublishChannelNum = publishOnChannelNum + 1;
    } else {
      this.nextPublishChannelNum = 0;
    }

    // Always publish on the same channel, this makes the error occur faster
    // can be changed to 
    // this.publishChannels[publishOnChannelNum] for round robin
    await this.publishChannels[0].publish("", queue, message, {
      expiration: `${1000 * 6}}`,
      messageId,
      timestamp: new Date().getTime()
    });

    return { id: messageId };
  }
}
