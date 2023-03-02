import { Amqp } from "./../../deps.ts";
import { Consumer, SetupFunc } from "./types.ts";
import { getConsumerTag } from "./helpers.ts";

export class ChannelWrapper {
  private _channel?: Amqp.AmqpChannel;
  private _setups?: SetupFunc[];
  private _settingUp: Promise<void> | undefined = undefined;
  private _consumers: Consumer[] = [];
  private _encoder = new TextEncoder();
  constructor(setups: SetupFunc[]) {
    this._setups = setups;
  }
  async onConnect(connection: Amqp.AmqpConnection) {
    const channel = await connection.openChannel();
    channel.qos({ prefetchCount: 1 });
    this._channel = channel;
    channel.closed().finally(() => {
      this._onClosed(channel);
    });
    if (this._setups) {
      this._settingUp = Promise.all(
        this._setups.map((setupFn) => setupFn(channel)),
      )
        .then(async () => {
          for (const consumer of this._consumers) {
            await this._reconnectConsumer(consumer);
          }
        })
        .then(() => {
          this._settingUp = undefined;
        });
      await this._settingUp;
    }
  }
  async consume(
    queue: string,
    onMessage: Amqp.BasicDeliverHandler,
    args?: Amqp.BasicConsumeArgs,
  ) {
    const consumer: Consumer = {
      queue,
      onMessage,
      args: args || {},
      active: false,
    };
    this._consumers.push(consumer);
    return await this._consume(consumer);
  }
  private async _consume(consumer: Consumer) {
    if (!this._channel) return;
    const tag = getConsumerTag() + consumer.queue.split(".").pop();
    console.log(
      `AMQP: Consuming from queue ${consumer.queue} with tag ${tag}`,
    );
    const { consumerTag } = await this._channel.consume(
      {
        consumerTag: tag,
        queue: consumer.queue,
        ...consumer.args,
        arguments: { prefetchCount: 10, ...consumer.args.arguments },
      },
      (args, props, data) => {
        if (!data) {
          consumer.consumerTag = undefined;
          this._reconnectConsumer(consumer);
        }
        return consumer.onMessage(args, props, data);
      },
    );
    consumer.active = true;
    consumer.consumerTag = consumerTag;
  }
  async _reconnectConsumer(consumer: Consumer) {
    console.log("AMQP: Reconnecting consumer for queue ", consumer.queue);
    if (this._consumers.find((c) => c.queue === consumer.queue && c.active)) {
      return;
    }
    await this._consume(consumer);
  }
  _onClosed(channel: Amqp.AmqpChannel) {
    if (this._channel === channel) {
      this._channel = undefined;
    }
  }
  ack(args: Amqp.BasicAckArgs) {
    this._channel && this._channel.ack(args);
  }
  nack(args: Amqp.BasicNackArgs) {
    this._channel && this._channel.nack(args);
  }
  async publish(
    exchange: string,
    routingKey: string,
    content: unknown,
    options?: Amqp.BasicProperties,
  ) {
    const channel = this._channel;
    if (!channel) return;
    const encodedContent = this._encoder.encode(JSON.stringify(content));
    return await channel.publish(
      { exchange, routingKey },
      {
        contentType: "application/json",
        ...options,
      },
      encodedContent,
    );
  }
  async declareQueue(args: Amqp.QueueDeclareArgs) {
    if (!this._channel) return;
    return await this._channel.declareQueue(args);
  }
  async close() {
    if (!this._channel) return;
    return await this._channel.close();
  }
}
