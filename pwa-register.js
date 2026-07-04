(function () {
  const status = document.getElementById("appAvailabilityStatus");

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  if (location.protocol === "file:") {
    setStatus("Use hosted link to install");
    return;
  }

  if (!("serviceWorker" in navigator)) {
    setStatus("Browser cache only");
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").then((registration) => {
      if (registration.active || registration.waiting) {
        setStatus("Installable app ready");
        return;
      }
      setStatus("Preparing offline app");
      navigator.serviceWorker.ready.then(() => {
        setStatus("Installable app ready");
      }).catch(() => {
        setStatus("Offline app setup unavailable");
      });
    }).catch(() => {
      setStatus("Offline app setup unavailable");
    });
  });
})();
