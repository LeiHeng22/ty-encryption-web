/**
 * 与 zlchs.TYEncryption.Base64Util 一致的自定义 Base64 编解码。
 * 密码表: ABCDEFGHIJKLMNOPQRSTUVWXYZbacdefghijklmnopqrstu_wxyz0123456789*-
 * 补码: v
 */
(function (global) {
  "use strict";

  var CODE_TABLE =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZbacdefghijklmnopqrstu_wxyz0123456789*-";
  var PAD = "v";

  var encodeMap = {};
  var decodeMap = {};

  function initDict() {
    encodeMap = {};
    decodeMap = {};
    decodeMap[PAD] = -1;
    for (var i = 0; i < CODE_TABLE.length; i++) {
      encodeMap[i] = CODE_TABLE.charAt(i);
      decodeMap[CODE_TABLE.charAt(i)] = i;
    }
  }

  initDict();

  function utf8Encode(str) {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(str);
    }
    var utf8 = unescape(encodeURIComponent(str));
    var arr = new Uint8Array(utf8.length);
    for (var i = 0; i < utf8.length; i++) {
      arr[i] = utf8.charCodeAt(i);
    }
    return arr;
  }

  function utf8Decode(bytes) {
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8").decode(bytes);
    }
    var s = "";
    for (var i = 0; i < bytes.length; i++) {
      s += String.fromCharCode(bytes[i]);
    }
    try {
      return decodeURIComponent(escape(s));
    } catch (e) {
      console.error("utf8Decode failed", e);
      return s;
    }
  }

  function encodeUnit(b0, b1, b2) {
    var obj = [
      (b0 & 0xfc) >> 2,
      ((b0 & 0x03) << 4) + ((b1 & 0xf0) >> 4),
      ((b1 & 0x0f) << 2) + ((b2 & 0xc0) >> 6),
      b2 & 0x3f,
    ];
    return (
      encodeMap[obj[0]] +
      encodeMap[obj[1]] +
      encodeMap[obj[2]] +
      encodeMap[obj[3]]
    );
  }

  function encode(source) {
    if (source == null || source === "") {
      return "";
    }
    var tmp = Array.prototype.slice.call(utf8Encode(source));
    var remain = tmp.length % 3;
    var patch = 3 - remain;
    if (remain !== 0) {
      for (var p = 0; p < patch; p++) {
        tmp.push(0);
      }
    }
    var cnt = Math.ceil(tmp.length / 3);
    var sb = "";
    for (var i = 0; i < cnt; i++) {
      sb += encodeUnit(tmp[i * 3], tmp[i * 3 + 1], tmp[i * 3 + 2]);
    }
    if (remain !== 0) {
      sb = sb.substring(0, sb.length - patch);
      for (var j = 0; j < patch; j++) {
        sb += PAD;
      }
    }
    return sb;
  }

  function decodeUnit(byteArr, c0, c1, c2, c3) {
    var unit = [
      decodeMap[c0],
      decodeMap[c1],
      decodeMap[c2],
      decodeMap[c3],
    ];
    byteArr.push((unit[0] << 2) + ((unit[1] & 0x30) >> 4));
    byteArr.push(((unit[1] & 0xf) << 4) + ((unit[2] & 0x3c) >> 2));
    byteArr.push(((unit[2] & 0x3) << 6) + unit[3]);
  }

  function decode(source) {
    if (source == null || source === "") {
      return "";
    }
    var list = [];
    var tmp = source.split("");
    var remain = tmp.length % 4;
    if (remain !== 0) {
      tmp.length = tmp.length - remain;
    }
    var patch = source.indexOf(PAD);
    if (patch !== -1) {
      patch = source.length - patch;
    } else {
      patch = 0;
    }
    var cnt = tmp.length / 4;
    for (var i = 0; i < cnt; i++) {
      decodeUnit(
        list,
        tmp[i * 4],
        tmp[i * 4 + 1],
        tmp[i * 4 + 2],
        tmp[i * 4 + 3]
      );
    }
    for (var j = 0; j < patch; j++) {
      list.pop();
    }
    return utf8Decode(new Uint8Array(list));
  }

  global.Base64Util = {
    encode: encode,
    decode: decode,
  };
})(typeof window !== "undefined" ? window : globalThis);
