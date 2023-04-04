"use strict";

require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.secret" });

let PORT = process.env.PORT || 2662;

let http = require("node:http");
let FsSync = require("node:fs");

let EMAILS_DIR = process.env.EMAILS_DIR || "./emails";
FsSync.mkdirSync(EMAILS_DIR, { recursive: true });

let app = require("./app.js");

let express = require("express");
let server = express();

if ("production" !== process.env.NODE_ENV) {
  // set special options
  server.set("json-spaces", 2);
}

server.use("/", app);

let httpServer = http.createServer(server);
httpServer.listen(PORT, function () {
  console.info("Listening on", httpServer.address());
});
