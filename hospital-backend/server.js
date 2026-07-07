require("dotenv").config();

const http = require("http");
const app = require("./app");
const connectDatabase = require("./src/config/database");
const { initSocketServer } = require("./src/config/socket");

const PORT = process.env.PORT || 3000;

(async () => {
    await connectDatabase();

    const server = http.createServer(app);
    initSocketServer(server);

    server.listen(PORT, () => {
        console.log(`Server running on ${PORT}`);
    });
})();