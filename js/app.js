(function () {
  "use strict";

  var FEATURES = [
    { id: "feat-pre", label: "事前功能" },
    { id: "feat-mid", label: "事中功能" },
    { id: "feat-rx", label: "电子处方" },
    { id: "feat-face", label: "终端刷脸" },
    { id: "feat-zy", label: "中医适宜技术" },
  ];

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatDateYmd(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function todayInputValue() {
    return formatDateYmd(new Date());
  }

  function disabledExpiry() {
    return new Date().getFullYear() + "-01-01 23:59:59";
  }

  function enabledExpiry(dateStr) {
    return dateStr + " 23:59:59";
  }

  function parseCodes(raw) {
    return String(raw || "")
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(function (line) {
        return line.length > 0;
      });
  }

  function buildPlainText(code, expiryDate, featureFlags) {
    var parts = [code + "|"];
    for (var i = 0; i < FEATURES.length; i++) {
      var name = FEATURES[i].label;
      var on = !!featureFlags[FEATURES[i].id];
      var exp = on ? enabledExpiry(expiryDate) : disabledExpiry();
      parts.push(name + "※" + exp + "|");
    }
    return parts.join("");
  }

  function buildSql(code, cipher) {
    return (
      "UPDATE insur.his_config hc\n" +
      "SET his_parametervalue = '" +
      cipher.replace(/'/g, "''") +
      "'\n" +
      "FROM qw_base.b_org bo\n" +
      "WHERE bo.id = hc.org_id\n" +
      "  AND bo.healthcare_code = '" +
      code.replace(/'/g, "''") +
      "'\n" +
      "  AND hc.his_parametername = '启用功能'\n" +
      "RETURNING hc.id, hc.org_id, hc.his_parametervalue;"
    );
  }

  function collectFeatureFlags() {
    var flags = {};
    for (var i = 0; i < FEATURES.length; i++) {
      var el = document.getElementById(FEATURES[i].id);
      flags[FEATURES[i].id] = el ? el.checked : false;
    }
    return flags;
  }

  function setStatus(msg, isError) {
    var el = document.getElementById("status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "status" + (isError ? " status-error" : "");
  }

  function onEncrypt() {
    try {
      var codes = parseCodes(document.getElementById("codes").value);
      if (codes.length === 0) {
        setStatus("请至少输入一个贯标编码（每行一个）。", true);
        return;
      }
      var expiry = document.getElementById("expiry").value;
      if (!expiry) {
        setStatus("请选择授权有效期。", true);
        return;
      }
      var flags = collectFeatureFlags();
      var sqlParts = [];
      var detailParts = [];
      for (var i = 0; i < codes.length; i++) {
        var code = codes[i];
        var plain = buildPlainText(code, expiry, flags);
        var cipher = Base64Util.encode(plain);
        sqlParts.push(buildSql(code, cipher));
        detailParts.push(
          "-- " +
            code +
            "\n" +
            cipher +
            "\n明文: " +
            plain
        );
      }
      document.getElementById("sql-out").value = sqlParts.join("\n\n");
      document.getElementById("detail-out").value = detailParts.join("\n\n");
      setStatus("已生成 " + codes.length + " 条 UPDATE SQL。");
    } catch (e) {
      console.error("encrypt failed", e);
      setStatus("加密失败：" + (e && e.message ? e.message : String(e)), true);
    }
  }

  function onDecrypt() {
    try {
      var cipher = document.getElementById("decrypt-in").value.trim();
      if (!cipher) {
        setStatus("请输入要解密的密文。", true);
        return;
      }
      var plain = Base64Util.decode(cipher);
      document.getElementById("decrypt-out").value = plain;
      setStatus("解密完成。");
    } catch (e) {
      console.error("decrypt failed", e);
      setStatus("解密失败：" + (e && e.message ? e.message : String(e)), true);
    }
  }

  function copyText(id) {
    var el = document.getElementById(id);
    if (!el || !el.value) {
      setStatus("没有可复制的内容。", true);
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(el.value).then(
        function () {
          setStatus("已复制到剪贴板。");
        },
        function (err) {
          console.error("clipboard failed", err);
          fallbackCopy(el);
        }
      );
    } else {
      fallbackCopy(el);
    }
  }

  function fallbackCopy(el) {
    try {
      el.focus();
      el.select();
      var ok = document.execCommand("copy");
      setStatus(ok ? "已复制到剪贴板。" : "复制失败，请手动全选复制。", !ok);
    } catch (e) {
      console.error("fallbackCopy failed", e);
      setStatus("复制失败，请手动全选复制。", true);
    }
  }

  function init() {
    var expiry = document.getElementById("expiry");
    if (expiry && !expiry.value) {
      expiry.value = todayInputValue();
    }
    document.getElementById("btn-encrypt").addEventListener("click", onEncrypt);
    document.getElementById("btn-decrypt").addEventListener("click", onDecrypt);
    document.getElementById("btn-copy-sql").addEventListener("click", function () {
      copyText("sql-out");
    });
    document.getElementById("btn-copy-detail").addEventListener("click", function () {
      copyText("detail-out");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
