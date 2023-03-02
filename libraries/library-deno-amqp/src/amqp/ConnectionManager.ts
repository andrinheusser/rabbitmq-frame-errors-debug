import { Amqp, retryAsync } from "./../../deps.ts";
import { ChannelWrapper } from "./ChannelWrapper.ts";
import {
  HeartbeatInterval,
  RabbitConnectionManagerOptions,
  ReconnectTime,
  SetupFunc,
} from "./types.ts";

export class ConnectionManager {
  private _urls: string[];
  private _currentUrl: number;
  private _channels: ChannelWrapper[];
  private _currentConnection?: Amqp.AmqpConnection;

  private _heartbeatInterval?: HeartbeatInterval;
  private _reconnectTime?: ReconnectTime;

  private _closed = false;

  constructor(urls: string[], options?: RabbitConnectionManagerOptions) {
    this._urls = urls;
    this._channels = [];
    this._currentUrl = 0;
    this._heartbeatInterval = options?.heartbeatInterval || 50000;
    this._reconnectTime = options?.reconnectTime || this._heartbeatInterval;
  }

  closed() {
    return this._currentConnection?.closed();
  }

  async connect(force = false) {
    console.log("AMQP: Connecting to RabbitMQ");
    if (!force && (this._closed || this.isConnected())) {
      return Promise.resolve();
    }
    if (!this._urls.length) {
      throw new Error("Rabbit Connection Manager: no urls found");
    }
    const url = this._urls[this._currentUrl];
    if (this._currentUrl + 1 === this._urls.length) {
      this._currentUrl = 0;
    } else {
      this._currentUrl++;
    }
    let connect = url;
    if (this._heartbeatInterval && this._heartbeatInterval > 1000) {
      const u = new URL(url);
      if (!u.searchParams.get("heartbeat")) {
        u.searchParams.set(
          "heartbeat",
          `${Math.floor(this._heartbeatInterval / 1000)}`,
        );

        connect = u.toString();
      }
    }

    let attempts = 0;
    const connection = await retryAsync(
      async () => {
        attempts = attempts + 1;
        console.log(
          `Rabbit Connection Manager: Connecting... Attempt # ${attempts} (${connect})`,
        );
        const connection = await Amqp.connect(connect);
        console.log(`Rabbit Connection Manager: Connection established`);
        return connection;
      },
      { maxTry: 100, delay: this._reconnectTime },
    );

    for (const channel of this._channels) {
      await channel.onConnect(connection);
    }

    connection
      .closed()
      .catch((e) => {
        console.error("Rabbit Connection Manager: Connection closed on error");
        console.error(e);
      })
      .finally(() => {
        console.log("Rabbit Connection Manager: Connection closed");
        this._currentConnection = undefined;
        console.log("Rabbit Connection Manager: Reconnecting...");
        this.connect();
      });

    return connection;
  }
  isConnected(): boolean {
    return !!this._currentConnection;
  }
  get connection(): Amqp.AmqpConnection | undefined {
    return this._currentConnection;
  }
  createChannel(setups: SetupFunc[]) {
    const channel = new ChannelWrapper(setups);
    this._channels.push(channel);
    return channel;
  }
  async closeChannel(toClose: ChannelWrapper) {
    console.log(
      "Rabbit Connection Manager: Closing Channel, current no of channels: " +
      this._channels.length,
    );
    this._channels = this._channels.filter((channel) => channel !== toClose);
    await toClose.close();
    console.log(
      "Rabbit Connection Manager: Channel closed, current no of channels: " +
      this._channels.length,
    );
  }
  async close() {
    if (this._closed || !this._currentConnection) return;
    this._closed = true;
    await Promise.all(this._channels.map((channel) => channel.close()));
    this._channels = [];
    this._currentConnection.close();
    this._currentConnection = undefined;
  }
}
