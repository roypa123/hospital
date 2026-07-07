const db = require("./knex");

async function connectDatabase() {

    try {

        await db.raw("SELECT NOW()");

        console.log("Database Connected");

    } catch (error) {

        console.error(error);

        process.exit(1);

    }

}

module.exports = connectDatabase;