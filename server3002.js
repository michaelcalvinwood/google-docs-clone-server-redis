const PORT=3002;

const app = require('express')();
const httpServer = require('http').createServer(app);
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
  });
const pubClient = createClient({ host: 'localhost', port: 6379 });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  io.listen(PORT);
});

const mongoose = require('mongoose');
const Document = require('./Document');

mongoose.connect('mongodb://localhost/google-docs-clone');
const defaultValue = '';


io.on("connection", socket => {
    console.log('connection');
    socket.on('get-document', async documentId => {
        const document = await findOrCreateDocument(documentId);

        socket.join(documentId);
        socket.emit('load-document', document.data);

        socket.on('send-changes', delta => {
            socket.broadcast.to(documentId).emit("receive-changes", delta);
        })

        socket.on("save-document", async data => {
            await Document.findByIdAndUpdate(documentId, { data: data});
        });
    })
});

async function findOrCreateDocument(id) {
    if (id == null) return;

    const document = await Document.findById(id)

    if (document) return document;

    return await Document.create({ _id: id, data: defaultValue})
}
