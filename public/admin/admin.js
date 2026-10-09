(function () {
  var STATUSES = ['new', 'contacted', 'quoted', 'booked', 'lost'];
  var LABELS = { new: 'New', contacted: 'Contacted', quoted: 'Quoted', booked: 'Booked', lost: 'Lost' };
  var filter = '';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function api(path, opts) {
    opts = opts || {};
    if (opts.body) { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(opts.body); }
    return fetch('/admin/api' + path, opts).then(function (r) {
      if (r.status === 401) { window.location.href = '/admin/login'; throw new Error('auth'); }
      return r.json().then(function (b) { if (!r.ok) throw new Error(b.error || 'Request failed'); return b; });
    });
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtStamp(sqlStamp) {
    var d = new Date(sqlStamp.replace(' ', 'T') + 'Z');
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  /* ---------- Tabs ---------- */
  var tabs = { leads: document.getElementById('tab-leads'), stops: document.getElementById('tab-stops') };
  function show(name) {
    Object.keys(tabs).forEach(function (k) {
      tabs[k].setAttribute('aria-selected', String(k === name));
      document.getElementById('panel-' + k).hidden = k !== name;
    });
    if (name === 'stops') loadStops();
  }
  tabs.leads.addEventListener('click', function () { show('leads'); });
  tabs.stops.addEventListener('click', function () { show('stops'); });

  /* ---------- Stats ---------- */
  function loadStats() {
    return api('/stats').then(function (data) {
      var box = document.getElementById('stats');
      box.textContent = '';
      STATUSES.forEach(function (s) {
        var b = el('button', 'stat ' + s);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(filter === s));
        b.appendChild(el('b', '', data.counts[s]));
        b.appendChild(el('span', '', LABELS[s]));
        b.addEventListener('click', function () {
          filter = filter === s ? '' : s;
          refresh();
        });
        box.appendChild(b);
      });
    });
  }

  /* ---------- Leads ---------- */
  function leadCard(lead) {
    var card = el('article', 'lead');
    card.dataset.status = lead.status;

    var top = el('div', 'lead-top');
    var who = el('div');
    who.appendChild(el('div', 'lead-name', lead.name));
    who.appendChild(el('div', 'lead-when', 'Requested ' + fmtStamp(lead.created_at)));
    top.appendChild(who);

    var select = el('select');
    select.setAttribute('aria-label', 'Status for ' + lead.name);
    STATUSES.forEach(function (s) {
      var o = el('option', '', LABELS[s]);
      o.value = s;
      if (s === lead.status) o.selected = true;
      select.appendChild(o);
    });
    top.appendChild(select);
    card.appendChild(top);

    var facts = el('div', 'facts');
    [['Event', lead.event_type], ['Date', fmtDate(lead.event_date)], ['Guests', lead.guests], ['Town', lead.town]]
      .forEach(function (f) {
        if (!f[1]) return;
        var span = el('span');
        span.appendChild(el('b', '', f[0] + ': '));
        span.appendChild(document.createTextNode(f[1]));
        facts.appendChild(span);
      });
    if (facts.childNodes.length) card.appendChild(facts);
    if (lead.notes) card.appendChild(el('div', 'lead-notes', lead.notes));

    var actions = el('div', 'lead-actions');
    var call = el('a', 'btn btn-sm btn-red', 'Call ' + lead.phone);
    call.href = 'tel:' + lead.phone.replace(/[^\d+]/g, '');
    actions.appendChild(call);
    var text = el('a', 'btn btn-sm', 'Text');
    text.href = 'sms:' + lead.phone.replace(/[^\d+]/g, '');
    actions.appendChild(text);
    if (lead.email) {
      var mail = el('a', 'btn btn-sm', 'Email');
      mail.href = 'mailto:' + lead.email + '?subject=' + encodeURIComponent('Mighty Mini Donuts for your ' + (lead.event_type || 'event').toLowerCase());
      actions.appendChild(mail);
    }
    var saved = el('span', 'saved');
    actions.appendChild(saved);
    card.appendChild(actions);

    var notes = el('textarea');
    notes.placeholder = 'Your private notes (price quoted, follow-up date...)';
    notes.setAttribute('aria-label', 'Private notes for ' + lead.name);
    notes.value = lead.admin_notes || '';
    card.appendChild(notes);

    function save(body) {
      saved.textContent = 'Saving...';
      api('/leads/' + lead.id, { method: 'PATCH', body: body })
        .then(function (res) {
          lead = res.lead;
          card.dataset.status = lead.status;
          saved.textContent = 'Saved';
          setTimeout(function () { saved.textContent = ''; }, 1500);
          loadStats();
        })
        .catch(function (e) { saved.textContent = e.message; });
    }
    select.addEventListener('change', function () { save({ status: select.value }); });
    notes.addEventListener('change', function () { save({ admin_notes: notes.value }); });
    return card;
  }

  function loadLeads() {
    document.getElementById('filterHint').textContent = filter ? 'Showing ' + LABELS[filter].toLowerCase() + ' requests (tap again to show all)' : 'Showing all requests';
    return api('/leads' + (filter ? '?status=' + filter : '')).then(function (data) {
      var box = document.getElementById('leads');
      box.textContent = '';
      if (!data.leads.length) {
        box.appendChild(el('div', 'empty', filter
          ? 'No ' + LABELS[filter].toLowerCase() + ' requests right now.'
          : 'No booking requests yet. When someone fills out the form on your website, it shows up here and in your email.'));
        return;
      }
      data.leads.forEach(function (l) { box.appendChild(leadCard(l)); });
    });
  }

  function refresh() { loadStats(); loadLeads(); }

  /* ---------- Schedule ---------- */
  var today = new Date();
  var todayIso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  function loadStops() {
    return api('/stops').then(function (data) {
      var box = document.getElementById('stops');
      box.textContent = '';
      if (!data.stops.length) {
        box.appendChild(el('div', 'empty', 'No stops yet. Add your next fair, market or pop-up above and it shows on your website right away.'));
        return;
      }
      data.stops.forEach(function (s) {
        var past = (s.end_date || s.start_date) < todayIso;
        var row = el('div', 'stop-row' + (past ? ' past' : ''));
        var info = el('div');
        info.appendChild(el('b', '', s.place));
        var dates = fmtDate(s.start_date) + (s.end_date && s.end_date !== s.start_date ? ' to ' + fmtDate(s.end_date) : '');
        info.appendChild(el('span', '', [dates, s.town, s.hours, s.note].filter(Boolean).join(' · ') + (past ? ' (past, hidden from site)' : '')));
        row.appendChild(info);

        var del = el('button', 'btn btn-sm', 'Remove');
        del.type = 'button';
        var armed = false;
        del.addEventListener('click', function () {
          if (!armed) { armed = true; del.textContent = 'Tap to confirm'; setTimeout(function () { armed = false; del.textContent = 'Remove'; }, 3000); return; }
          api('/stops/' + s.id, { method: 'DELETE' }).then(loadStops).catch(function (e) { del.textContent = e.message; });
        });
        row.appendChild(del);
        box.appendChild(row);
      });
    });
  }

  var stopForm = document.getElementById('stopForm');
  var stopErr = document.getElementById('stopErr');
  stopForm.addEventListener('submit', function (e) {
    e.preventDefault();
    stopErr.hidden = true;
    var body = {};
    ['start_date', 'end_date', 'place', 'town', 'hours', 'note'].forEach(function (k) { body[k] = stopForm.elements[k].value; });
    api('/stops', { method: 'POST', body: body })
      .then(function () { stopForm.reset(); loadStops(); })
      .catch(function (err) { stopErr.textContent = err.message; stopErr.hidden = false; });
  });

  document.getElementById('logout').addEventListener('click', function () {
    fetch('/admin/logout', { method: 'POST' }).then(function () { window.location.href = '/admin/login'; });
  });

  refresh();
})();
