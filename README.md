## Debugging RabbitMQ Frame Error

This repo contains is used to reproduce an issue resulting in RabbitMQ reporting invalid frames.

## Requirements

- A running minikube cluster (I've only yet encountered the error on minikube)
- `devspace`: [Installation](https://www.devspace.sh/docs/getting-started/installation?x0=5)

## How to run

(Optional: Set namespace & kube context to use)

`devspace use namespace my-namespace`

`devspace use context my-context`


To run the app, use (in the same directory as the file `devspace.yaml`)
`devspace dev`

This will
- provide a UI on `localhost:8090`. You can conviniently access logs there.
- forward port `15672` to localhost for accessing the RabbitMQ UI
- sync files in the app container, which will reload the app on file changes

To disable these functionalites, remove lines under `dev:` in `devspace.yaml`

## The Error Itself / What happens

This setup will publish a lot of messages, every 5 seconds, each containing a string of 7000 times the char `a`.

For me, the error occurs reliably within the first 30 seconds after connecting to RabbitMQ. 
The error also occurs on less messages/second, it just takes longer.

## Directory Structure Overview

*devspace.yaml*

- Contains the cluster setup

*app*

- Contains the entrypoint `main.ts`. 

*libraries*

- *library-deno-amqp*: Library on top of deno-amqp which handles connection management and topology setup.
- *deno-amqp*: Forked from deno-amqp, contains my changes: Instead of using separate writes to the tcp connection, encodes multiple frames (method, header, content(s)) and writes all in one go. THIS IS NOT USED AT THE MOMENT. (see commented out dependency in `libraries/library-deno-amqp/deps.ts`) The error occurs with the original deno-amqp, as well as the included version.


