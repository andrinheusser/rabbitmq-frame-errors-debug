import { Amqp } from "./../../deps.ts";

export type SetupFunc = (channel: Amqp.AmqpChannel) => Promise<void>;
export type HeartbeatInterval = number;
export type ReconnectTime = number;

export type RabbitConnectionManagerOptions = {
  heartbeatInterval?: HeartbeatInterval;
  reconnectTime?: ReconnectTime;
};

export interface Consumer {
  consumerTag?: string;
  queue: string;
  onMessage: Amqp.BasicDeliverHandler;
  args: Amqp.BasicConsumeArgs;
  active: boolean;
}
