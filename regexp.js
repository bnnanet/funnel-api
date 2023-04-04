"use strict";

//@ts-ignore
globalThis.RegExp._escape = function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

module.exports.RegExp = globalThis.RegExp;
