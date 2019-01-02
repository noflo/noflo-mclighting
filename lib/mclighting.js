const debug = require('debug')('noflo-mclighting:connection');
const url = require('url');
const WebSocket = require('isomorphic-ws');
require('isomorphic-fetch');

function addressToHttp(address) {
  const parsed = url.parse(address);
  parsed.protocol = 'http';
  parsed.port = '80';
  delete parsed.host;
  return url.format(parsed);
}

module.exports = (address) => {
  let ws;
  let connecting = false;
  const ensureConnection = () => {
    if (connecting || ws) {
      return;
    }
    connecting = true;
    const connection = new WebSocket(address);
    connection.onopen = () => {
      connecting = false;
      debug(`Connected to ${address}`);
      ws = connection;
    };
    connection.onclose = () => {
      connecting = false;
      ws = null;
      setTimeout(ensureConnection, 1000);
    };
    connection.onerror = (err) => {
      debug(err);
      connecting = false;
      ws = null;
      setTimeout(ensureConnection, 1000);
    };
  };
  ensureConnection();
  return {
    send: payload => new Promise((resolve, reject) => {
      if (!ws) {
        reject(new Error(`Not connected to McLighting ${address}`));
        return;
      }
      ws.onmessage = (data) => {
        delete ws.onmessage;
        resolve(data);
      };
      debug(`Sending ${payload} to ${address}`);
      ws.send(payload);
    }),
    status: () => fetch(`${addressToHttp(address)}status`)
      .then(res => res.json()),
  };
};
