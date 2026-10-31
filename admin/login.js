(function () {
  var form = document.getElementById("form"), pw = document.getElementById("password"),
      msg = document.getElementById("msg"), btn = document.getElementById("submit");

  function show(text) { msg.textContent = text; msg.hidden = !text; }

  /* уже вошли — сразу в панель */
  fetch("/api/admin/session", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.authenticated) location.replace("/admin/"); }).catch(function () {});

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!pw.value) { show("Введите пароль."); return; }
    btn.disabled = true; show("");
    fetch("/api/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw.value }), cache: "no-store"
    }).then(function (r) {
      if (r.ok) { location.replace("/admin/"); return; }
      btn.disabled = false; pw.value = ""; pw.focus();
      if (r.status === 401) show("Неверный пароль.");
      else if (r.status === 429) show("Слишком много попыток. Повторите позже.");
      else if (r.status === 503) show("Панель не настроена на сервере: задайте ADMIN_PASSWORD и ADMIN_SESSION_SECRET.");
      else show("Не удалось войти (код " + r.status + ").");
    }).catch(function () {
      btn.disabled = false; show("Нет связи с сервером. Проверьте подключение.");
    });
  });
})();

