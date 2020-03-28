import websocket from 'ws'
import express from 'express'
const port = process.env.PORT || 3000
const wsServer = new websocket.Server({port: +port})


console.log("websocket server listening on", wsServer.address())

const app = express()

app.listen(3001)
app.use("/health", (req, res) => {
  res.sendStatus(200)
})

wsServer.on('connection', ws => {
    console.log('=== websocket connection established ===');
    ws.on('message', message => {
      console.log(message)
      wsServer.clients.forEach( client => {
        // console.log("Client Info", client, client.protocol)
        if(ws === client) {
          console.log('== skip sender ==');
        }
        else {
          console.log('== sending message ==');
          client.send(message);
        }
      });
    });
  });
