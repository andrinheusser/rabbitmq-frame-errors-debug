import { abc } from "../deps.ts";
import MyMessageGateway from "../libraries/library-deno-amqp/src/MyMessageGateway.ts";
import { retryAsync } from "https://deno.land/x/retry@v2.0.0/mod.ts";

// abc is a web server implementation
const app = new abc.Application();
app
  .get("/", () => "healthy")
  .start({ hostname: '0.0.0.0', port: 8886 });

import { AmqpChannel, connect } from "https://deno.land/x/amqp/mod.ts";

const messageData = [...Array(70).keys()].reduce((acc, _curr) => acc += 'aaaaaaaaaa', '')
// We're sending 70 orders every time
const messages = [...Array(70).keys()].map(() => messageData);

const encoder = new TextEncoder();

const connection = await retryAsync(async () => {
  console.log('trying to connect...')
  return await connect({ hostname: 'store-rabbitmq', username: 'rabbitmq-debug', password: 'rabbitmq-debug' });
}, { delay: 1000, maxTry: 100 });

console.log('connected to rabbitmq')

const channel = await connection.openChannel();

const queueName = "my.queue";
await channel.declareQueue({ queue: queueName });

function publish(channel: AmqpChannel, messages: Array<unknown>) {
  return messages.map(msg => channel.publish(
    { routingKey: queueName },
    { contentType: "application/json", expiration: `${1000 * 6}` },
    encoder.encode(JSON.stringify(msg)),
  ))
}

setInterval(() => {
  return Promise.all([
    ...publish(channel, messages),
    ...publish(channel, messages),
    ...publish(channel, messages),
    ...publish(channel, messages),
    ...publish(channel, messages),
    ...publish(channel, messages),
    ...publish(channel, messages),
    ...publish(channel, messages),
    ...publish(channel, messages),
    ...publish(channel, messages),
  ])
}, 5000)
/*
await channel.publish(
  { routingKey: queueName },
  { contentType: "application/json" },
  new TextEncoder().encode(JSON.stringify({ foo: "bar" })),
);
*/

/*
const ra = new MyMessageGateway(['amqp://rabbitmq-debug:rabbitmq-debug@store-rabbitmq/'])
// Connect to RabbitMQ, create Channels, declare Queue(s)
await ra.setup();

// Each message wil contain the char 'a' 70 * 10 times
const orderData = [...Array(70).keys()].reduce((acc, _curr) => acc += 'aaaaaaaaaa', '')
// We're sending 70 orders every time
const testOrders = [...Array(70).keys()].map(() => orderData);

type TMessage = {
  payload: unknown
}

// Sending the test messages
setInterval(async () => {
  return await Promise.all([
    // The more messages we send, the faster the error occurs
    ...testOrders.map(order => ra.publish<TMessage>(
      'my.debug.queue',
      { payload: order },
    )),
    ...testOrders.map(order => ra.publish<TMessage>(
      'my.debug.queue',
      { payload: order },
    )),
    ...testOrders.map(order => ra.publish<TMessage>(
      'my.debug.queue',
      { payload: order },
    )),
    ...testOrders.map(order => ra.publish<TMessage>(
      'my.debug.queue',
      { payload: order },
    )),
    ...testOrders.map(order => ra.publish<TMessage>(
      'my.debug.queue',
      { payload: order },
    )),
    ...testOrders.map(order => ra.publish<TMessage>(
      'my.debug.queue',
      { payload: order },
    )),
    ...testOrders.map(order => ra.publish<TMessage>(
      'my.debug.queue',
      { payload: order },
    )),
    ...testOrders.map(order => ra.publish<TMessage>(
      'my.debug.queue',
      { payload: order },
    )),
  ])
}, 5000)
*/