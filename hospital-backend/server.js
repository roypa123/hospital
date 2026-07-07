require("dotenv").config();

const app = require("./app");
const connectDatabase = require("./src/config/database");

const PORT = process.env.PORT || 3000;

(async () => {

    await connectDatabase();

    app.listen(PORT, () => {

        console.log(`Server running on ${PORT}`);

    });

})();