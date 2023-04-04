"use strict";

let Crypto = require("node:crypto");
let Fs = require("node:fs/promises");
let Path = require("node:path");

let app = require("@root/async-router").Router();

//@ts-ignore
let RegExp2 = require("./regexp.js").RegExp;
let bodyParser = require("body-parser");
let cors = require("cors");

let jsonParser = bodyParser.json({ limit: "100kb", strict: true });
let Postmark = require("./postmark.js");

if (!process.env.BASE_URL) {
  throw new Error(`'BASE_URL' is not defined`);
}
let BASE_URL = process.env.BASE_URL || "";

if (!process.env.EMAILS_DIR) {
  throw new Error(`'EMAILS_DIR' is not defined`);
}
let EMAILS_DIR = process.env.EMAILS_DIR || "";

//@ts-ignore
let baseUrlReStr = RegExp2._escape(BASE_URL);
let baseUrlRe = new RegExp(`${baseUrlReStr}(/|$)`);
let origins = [baseUrlRe];

if ("development" === process.env.NODE_ENV) {
  // set special options
  let lhRe = new RegExp(`https?://localhost(:|/|$)`);
  origins.push(lhRe);
}

app.use("/api", cors({ origin: origins, credentials: true }));
app.use("/api", jsonParser);
app.post("/api/request-invite", checkEmail, checkCache, inviteSaver);

app.use("/api", finalErrorHandler);

/** @type {import('express').Handler} */
async function inviteSaver(req, res) {
  let email = req.body.email;

  // TODO Eta+Mjml
  let response = await Postmark.send({
    stream: "activity",
    replyTo: `${process.env.APP_COMPANY_REPLY_TO}`,
    to: email,
    subject: `Hello from ${process.env.APP_COMPANY_SHORT_NAME}`,
    text: [
      `Thanks for your interest in ${process.env.APP_COMPANY_PRODUCT}.`,
      "",
      "While we're getting your invite ready please take a moment to let us know what kind of needs you have and how we could help.",
      "Just HIT REPLY and let us know. :)",
      "",
      `If you did not request an invite to ${process.env.APP_COMPANY_PRODUCT}, please disregard this message, or reply "UNSUBSCRIBE", or hit the unsubscribe button in your email client.`,
      "",
      "Sincerely,",
      `${process.env.APP_COMPANY_TEAM}`,
    ].join("\n"),
  });

  res.json({ success: true, response: response });
}

/** @type {import('express').Handler} */
async function checkCache(req, res, next) {
  let email = req.body.email;
  let filepath = Path.join(EMAILS_DIR, `${email}`);

  await Fs.access(filepath)
    .then(async function () {
      res.json({
        success: true,
      });
    })
    .catch(async function () {
      await Fs.writeFile(filepath, email);
      next();
    });
}

/** @type {import('express').Handler} */
async function checkEmail(req, res, next) {
  // TODO put in common validator
  let email = req.body.email || "";
  if (!email) {
    let err = new Error(`missing email`);
    Object.assign(err, {
      code: "E_BAD_REQUEST",
      statusCode: 400,
    });
    throw err;
  }

  // like a file path or list
  let nasty = /[\.\/\s,:;]/.test(email);
  // like an email
  let good = /.+@.+\..+/.test(email);
  let hasEmail = good && !nasty;
  if (hasEmail) {
    let err = new Error(`invalid email`);
    Object.assign(err, {
      code: "E_BAD_REQUEST",
      statusCode: 400,
    });
    throw err;
  }

  next();
}

/** @type {import('express').ErrorRequestHandler} */
function finalErrorHandler(err, req, res, next) {
  //@ts-ignore
  if (!err._id) {
    let rnd = Crypto.randomUUID().slice(0, 8);
    //@ts-ignore
    err._id = `#${rnd}`;
  }
  //@ts-ignore
  err._method = req.method;
  //@ts-ignore
  err._url = req.url;

  let statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    console.error(err);
    res.json({
      success: false,
      code: "E_INTERNAL",
      error: "internal server error",
    });
    return;
  }

  res.json({
    success: false,
    code: "E_INTERNAL",
    error: "internal server error",
  });
}

module.exports = app;
