(function () {
  // Paste the Facebook reel URL here to show it on the site, e.g.
  // 'https://www.facebook.com/reel/1234567890'
  var REEL_URL = '';

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Reel embed ---------- */
  if (REEL_URL) {
    var frame = document.createElement('iframe');
    frame.src = 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(REEL_URL) + '&show_text=false&width=360';
    frame.title = 'Mighty Mini Donuts on Facebook';
    frame.loading = 'lazy';
    frame.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture';
    frame.allowFullscreen = true;
    document.getElementById('reelFrame').appendChild(frame);
    document.getElementById('reel').hidden = false;
  }

  /* ---------- Upcoming stops ---------- */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function shortDate(iso) {
    var p = iso.split('-');
    return MONTHS[Number(p[1]) - 1] + ' ' + Number(p[2]);
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  var list = document.getElementById('stopList');
  fetch('/api/stops')
    .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function (data) {
      list.textContent = '';
      if (!data.stops.length) {
        list.appendChild(el('p', 'empty', "We're between events right now. Follow us on Facebook to hear about the next pop-up first."));
        return;
      }
      data.stops.forEach(function (s) {
        var row = el('div', 'stop');
        var when = shortDate(s.start_date);
        if (s.end_date && s.end_date !== s.start_date) {
          var sameMonth = s.start_date.slice(0, 7) === s.end_date.slice(0, 7);
          when += '–' + (sameMonth ? String(Number(s.end_date.slice(8, 10))) : shortDate(s.end_date));
        }
        row.appendChild(el('div', 'when', when));
        var what = el('div', 'what');
        what.appendChild(el('b', '', s.place));
        var sub = [s.town, s.hours, s.note].filter(Boolean).join(' · ');
        if (sub) what.appendChild(el('span', '', sub));
        row.appendChild(what);
        list.appendChild(row);
      });
    })
    .catch(function () {
      list.textContent = '';
      list.appendChild(el('p', 'empty', 'Check our Facebook page for this week’s stops.'));
    });

  /* ---------- Booking form ---------- */
  var form = document.getElementById('reqForm');
  var btn = document.getElementById('reqBtn');
  var msg = document.getElementById('formMsg');

  function setFieldErrors(fields) {
    form.querySelectorAll('.field-err').forEach(function (s) { s.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(function (i) { i.removeAttribute('aria-invalid'); });
    var first = null;
    Object.keys(fields || {}).forEach(function (name) {
      var input = form.elements[name];
      var slot = form.querySelector('.field-err[data-for="' + name + '"]');
      if (input) { input.setAttribute('aria-invalid', 'true'); first = first || input; }
      if (slot) slot.textContent = fields[name];
    });
    if (first) first.focus();
  }

  function showMsg(kind, html) {
    msg.className = 'form-msg ' + kind;
    msg.innerHTML = html;
    msg.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {};
    ['name', 'phone', 'email', 'event_date', 'guests', 'event_type', 'town', 'notes', 'website'].forEach(function (k) {
      data[k] = form.elements[k] ? form.elements[k].value : '';
    });

    var local = {};
    if (data.name.trim().length < 2) local.name = 'Please add your name.';
    if (data.phone.replace(/\D/g, '').length < 10) local.phone = 'Please add a phone number we can call or text.';
    if (Object.keys(local).length) { setFieldErrors(local); return; }
    setFieldErrors({});

    btn.disabled = true;
    btn.textContent = 'Sending...';
    fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
      .then(function (res) {
        if (!res.ok) {
          setFieldErrors(res.body.fields);
          showMsg('err', (res.body.error || 'Something went wrong.') + ' You can also call or text (603) 986-3359.');
          return;
        }
        form.reset();
        showMsg('ok', '<b>Request sent!</b> We’ll get back to you soon with a quote. Need it faster? Call or text (603) 986-3359.');
      })
      .catch(function () {
        showMsg('err', 'We couldn’t send that. Check your connection, or call or text (603) 986-3359.');
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = 'Request a quote';
      });
  });
})();
