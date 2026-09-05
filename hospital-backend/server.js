require("dotenv").config();

const http = require("http");
const app = require("./app");
const connectDatabase = require("./src/config/database");
const { initSocketServer } = require("./src/sockets");
const { initMinio } = require("./src/config/minio");

const PORT = process.env.PORT || 3000;

(async () => {
    await connectDatabase().then(() => {
        const httpServer = http.createServer(app);
        initSocketServer(httpServer);

        initMinio();

        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    });
})();