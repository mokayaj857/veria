(function () {
  function isWalletNoise(reason) {
    var msg = "";
    if (typeof reason === "string") msg = reason;
    else if (reason && typeof reason === "object") {
      msg = String(reason.message || reason.reason || "");
      if (reason.stack) msg += " " + reason.stack;
    }
    return (
      /Cannot redefine property:\s*ethereum/i.test(msg) ||
      /error getting provider injection options/i.test(msg) ||
      /evmAsk\.js/i.test(msg) ||
      /Failed to connect to MetaMask/i.test(msg)
    );
  }

  window.addEventListener(
    "error",
    function (event) {
      if (isWalletNoise(event.error || event.message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    "unhandledrejection",
    function (event) {
      if (isWalletNoise(event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  var previousOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    if (isWalletNoise(error || message)) return true;
    if (typeof previousOnError === "function") {
      return previousOnError(message, source, lineno, colno, error);
    }
    return false;
  };
})();
