require("dotenv").config();

const http = require("http");
const app = require("./app");
const connectDatabase = require("./src/config/database");
const { initSocketServer } = require("./src/sockets");
const { initMinio } = require("./src/config/minio");
const storageService = require("./src/services/storage.service");

const PORT = process.env.PORT || 3000;

(async () => {
    await connectDatabase().then(() => {
        const httpServer = http.createServer(app);
        initSocketServer(httpServer);

        initMinio().then((success) => {
            storageService.setUseMinio(success);
        });

        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    });
})();