import { abc } from "../deps.ts";
import MyMessageGateway from "../libraries/library-deno-amqp/src/MyMessageGateway.ts";

// abc is a web server implementation
const app = new abc.Application();
app
  .get("/", () => "healthy")
  .start({ hostname: '0.0.0.0', port: 8886 });


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
