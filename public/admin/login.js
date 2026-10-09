(function () {
  var form = document.getElementById('loginForm');
  var err = document.getElementById('loginErr');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: form.elements.password.value })
    })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); })
      .then(function (res) {
        if (res.ok) { window.location.href = '/admin/'; return; }
        err.textContent = res.body.error || 'Could not log in.';
        err.hidden = false;
        form.elements.password.select();
      })
      .catch(function () {
        err.textContent = 'Could not reach the server. Check your connection and try again.';
        err.hidden = false;
      });
  });
})();
