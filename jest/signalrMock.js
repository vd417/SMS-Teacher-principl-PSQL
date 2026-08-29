// Jest stub for SignalR. Tests never open a real websocket; LiveProvider
// should still mount without talking to the API.
function connection() {
  return {
    on() {},
    off() {},
    onreconnected() {},
    onclose() {},
    start: async () => {},
    stop: async () => {},
  };
}

class HubConnectionBuilder {
  withUrl() {
    return this;
  }
  withAutomaticReconnect() {
    return this;
  }
  configureLogging() {
    return this;
  }
  build() {
    return connection();
  }
}

module.exports = {
  HubConnectionBuilder,
  LogLevel: { None: 0 },
};
