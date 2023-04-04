"use strict";

let Postmark = module.exports;

Postmark._serverToken = process.env.POSTMARK_SERVER_TOKEN || "";
Postmark.streams = {
  account: {
    id: process.env["POSTMARK_STREAM_ACCOUNT_ID"] || "",
    from: process.env["POSTMARK_STREAM_ACCOUNT_FROM"] || "",
  },
  activity: {
    id: process.env["POSTMARK_STREAM_ACTIVITY_ID"] || "",
    from: process.env["POSTMARK_STREAM_ACTIVITY_FROM"] || "",
  },
  service: {
    id: process.env["POSTMARK_STREAM_SERVICE_ID"] || "",
    from: process.env["POSTMARK_STREAM_SERVICE_FROM"] || "",
  },
  promo: {
    id: process.env["POSTMARK_STREAM_PROMO_ID"] || "",
    from: process.env["POSTMARK_STREAM_PROMO_FROM"] || "",
  },
};
Postmark._defaultStream = Postmark.streams.activity;

// See "Forbidden File Types" in https://postmarkapp.com/developer/user-guide/send-email-with-api
Postmark._forbidden =
  "vbs, exe, bin, bat, chm, com, cpl, crt, hlp, hta, inf, ins, isp, jse, lnk, mdb, pcd, pif, reg, scr, sct, shs, vbe, vba, wsf, wsh, wsl, msc, msi, msp, mst"
    .split(/[,\s\n\r]+/)
    .filter(Boolean);

/**
 * @typedef PostMarkRequest
 * @prop {String} stream - id of one of the streams
 * @prop {String} to
 * @prop {String} replyTo - "from" will be the stream account
 * @prop {String} [cc]
 * @prop {String} [bcc]
 * @prop {String} subject
 * @prop {String} text
 * @prop {String} [html]
 */

/**
 * @typedef PostMarkResponse
 * @prop {PostMarkResponseBody} body
 * @prop {Number} status
 * @prop {String} statusText
 */

/**
 * @typedef PostMarkResponseBody
 * @prop {Number} ErrorCode
 * @prop {String} Message
 */

/**
 * @typedef PostMarkError
 * @prop {PostMarkResponse} response
 */
Postmark._ignoreInactiveRecipients =
  /** @param {Error&PostMarkError} error */
  function (error) {
    //@ts-ignore
    let resp = error.response;
    if (
      resp.status === 422 &&
      resp.body.ErrorCode === 406 &&
      resp.body.Message.match(
        /^You tried to send to a recipient that has been marked as inactive/,
      )
    ) {
      console.warn(`[warn] postmark ignore: '${resp.body.Message}'`);
      return resp;
    }
    throw error;
  };

Postmark.send =
  /** @param {PostMarkRequest} pmMsg */
  async function (pmMsg) {
    let stream = Postmark.streams[pmMsg.stream] || Postmark._defaultStream;

    /*
    replyTo: `${process.env.APP_COMPANY_REPLY_TO}`,
    to: email,
    subject: `Hello from ${process.env.APP_COMPANY_SHORT_NAME}`,
    text:
    */

    let msg = {
      MessageSteram: stream.id,
      //Tag: "Invitation",
      From: stream.from,
      ReplyTo: pmMsg.replyTo,
      To: pmMsg.to,
      Cc: pmMsg.cc,
      Bcc: pmMsg.bcc,
      // Metadata: { Color: 'blue', 'Client-Id': '12345' },
      Headers: [
        /* { Name: 'CUSTOM-HEADER', Value: 'value' }, */
      ],
      Subject: pmMsg.subject,
      TextBody: pmMsg.text,
      HtmlBody: pmMsg.html,
      Attachments: [
        /*  {
         *      "Name": "readme.txt",
         *      "Content": "dGVzdCBjb250ZW50",
         *      "ContentType": "text/plain"
         *  }
         */
      ],
      TrackOpens: false,
      // TrackLinks: "HtmlOnly",
    };
    let json = JSON.stringify(msg, null, 2);
    let url = "https://api.postmarkapp.com/email";
    let resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": Postmark._serverToken,
      },
      body: json,
    });

    let headerEntries = resp.headers.entries();
    let headers = Object.fromEntries(headerEntries);
    let text = await resp.text();

    if (!resp.ok) {
      let err = new Error("failed to send message");
      //@ts-ignore
      err.headers = headers;
      //@ts-ignore
      err.responseText = text;

      throw err;
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      let err = new Error("failed to parse response");
      //@ts-ignore
      err.headers = headers;
      //@ts-ignore
      err.responseText = text;

      throw err;
    }

    /*
    err.response.request.headers["X-Postmark-Server-Token"] =
        err.response.request.headers["X-Postmark-Server-Token"].replace(/\w/g, "*");
    */

    return {
      ok: resp.ok,
      status: resp.status,
      statusText: resp.statusText,
      headers: headers,
      body: result,
    };
  };
