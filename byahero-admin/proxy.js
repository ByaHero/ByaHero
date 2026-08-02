const net = require('net');

const LOCAL_PORT = 8083; // Port exposed to the network/phone
const TARGET_PORT = 8093; // Port Expo is running on locally

const server = net.createServer((socket) => {
  const target = net.createConnection({ port: TARGET_PORT, host: '127.0.0.1' }, () => {
    socket.pipe(target);
    target.pipe(socket);
  });

  socket.on('error', (err) => {
    target.end();
  });

  target.on('error', (err) => {
    socket.end();
  });
});

server.listen(LOCAL_PORT, '0.0.0.0', () => {
  console.log(`Proxy listening on 0.0.0.0:${LOCAL_PORT} -> forwarding to localhost:${TARGET_PORT}`);
});
