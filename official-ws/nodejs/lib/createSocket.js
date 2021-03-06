'use strict';
var debug = require('debug')('BitMEX:realtime-api:socket');
var signMessage = require('./signMessage');
var WebSocketClient = require('./ReconnectingSocket');

module.exports = function createSocket(options, emitter) {
  'use strict';
  var endpoint = options.endpoint;
  if (options.apiKeyID && options.apiKeySecret) {
    endpoint += '?' + signMessage.getWSAuthQuery(options.apiKeyID, options.apiKeySecret);
  }
  debug('connecting to %s', endpoint);

  var client = new WebSocketClient();

  client.onopen = function() {
    client.opened = true;
    console.log('Connection to BitMEX at', endpoint, 'opened.');
    emitter.emit('connect');
  };

  client.onmessage = function(data) {
    try {
      data = JSON.parse(data);
    } catch(e) {
      emitter.emit('error', 'Unable to parse incoming data:', data);
      return;
    }

    if (data.error) return emitter.emit('error', data.error);
    if (!data.data) return; // connection or subscription notice

    // If no data was found, stub the symbol. At least we'll get keys.
    var symbol = data.data[0] && data.data[0].symbol || 'stub';

    // Fires events as <table>:<symbol>:<action>, such as
    // instrument:XBU24H:update
    var key = data.table + ':' + symbol + ':' + data.action;
    debug('emitting %s with data %j', key, data);
    emitter.emit(key, data);
  };

  client.onerror = function(e) {
    var listeners = emitter.listeners('error');
    // If no error listeners are attached, throw.
    if (!listeners.length) throw e;
    else emitter.emit('error', e);
  }

  client.open(endpoint);

  return client;
};
