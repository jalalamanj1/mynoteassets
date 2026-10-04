(function () {
  'use strict';

  var SUBJECTS = ['Biology', 'Geography', 'Chemistry', 'General', 'Math', 'Physics', 'Science'];
  var REPO = 'jalalamanj1/mynoteassets';
  var BRANCH = 'main';
  var MAX_MB = 50;
  var IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

  var $ = function (id) { return document.getElementById(id); };

  var loginView = $('login-view');
  var appView = $('app-view');
  var loginForm = $('login-form');
  var uploadForm = $('upload-form');
  var subjectTabs = $('subject-tabs');
  var fileGrid = $('file-grid');
  var currentSubject = SUBJECTS[0];

  function showMsg(el, text, cls) {
    el.textContent = text;
    el.className = 'msg ' + (cls || '') + ' hidden';
    if (text) { el.classList.remove('hidden'); }
  }

  function api(path, opts) {
    return fetch(path, opts).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.error) || ('HTTP ' + res.status));
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  function getToken() { return sessionStorage.getItem('token'); }

  function isImage(name) {
    var ext = name.split('.').pop().toLowerCase();
    return IMAGE_EXT.indexOf(ext) !== -1;
  }

  /* ---------------- Auth ---------------- */

  function showApp(username) {
    loginView.classList.add('hidden');
    appView.classList.remove('hidden');
    $('user-name').textContent = username || getToken() || 'admin';
    buildSelects();
    buildTabs();
    loadSubject(currentSubject);
  }

  function showLogin() {
    appView.classList.add('hidden');
    loginView.classList.remove('hidden');
    $('username').value = '';
    $('password').value = '';
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('login-btn');
    btn.disabled = true;
    showMsg($('login-error'), '', 'error');
    api('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: $('username').value.trim(),
        password: $('password').value
      })
    }).then(function (data) {
      sessionStorage.setItem('token', data.token);
      showApp(data.username);
    }).catch(function (err) {
      showMsg($('login-error'), err.message, 'error');
    }).finally(function () {
      btn.disabled = false;
    });
  });

  $('logout').addEventListener('click', function () {
    sessionStorage.removeItem('token');
    showLogin();
  });

  /* ---------------- Browse ---------------- */

  function buildSelects() {
    var sel = $('subject');
    sel.innerHTML = '';
    SUBJECTS.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      sel.appendChild(opt);
    });
  }

  function buildTabs() {
    subjectTabs.innerHTML = '';
    SUBJECTS.forEach(function (s) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = s;
      if (s === currentSubject) { btn.classList.add('active'); }
      btn.addEventListener('click', function () {
        currentSubject = s;
        subjectTabs.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        loadSubject(s);
      });
      subjectTabs.appendChild(btn);
    });
  }

  function loadSubject(subject) {
    var status = $('browse-status');
    showMsg(status, 'Loading ' + subject + '…', 'ok');
    fileGrid.innerHTML = '';
    var url = 'https://api.github.com/repos/' + REPO + '/contents/diagrams/' + encodeURIComponent(subject) + '?ref=' + BRANCH;
    fetch(url).then(function (res) {
      if (res.status === 404) { return []; }
      if (!res.ok) { throw new Error('GitHub API error ' + res.status); }
      return res.json();
    }).then(function (entries) {
      renderGrid(entries);
      showMsg(status, entries.length ? subject + ' — ' + entries.length + ' item(s)' : subject + ' is empty', 'ok');
    }).catch(function (err) {
      showMsg(status, err.message, 'error');
    });
  }

  function renderGrid(entries) {
    fileGrid.innerHTML = '';
    if (!entries.length) {
      var empty = document.createElement('div');
      empty.className = 'msg ok';
      empty.textContent = 'No files in this subject yet.';
      fileGrid.appendChild(empty);
      return;
    }

    var files = entries.filter(function (f) { return f.type === 'file' && f.name !== '.gitkeep'; });

    files.forEach(function (f) {
      var tile = document.createElement('div');
      tile.className = 'tile';

      var thumb = document.createElement('div');
      thumb.className = 'thumb';
      if (isImage(f.name)) {
        var img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = f.name;
        img.onload = function () { img.style.display = ''; };
        img.onerror = function () { thumb.className += ' icon'; thumb.textContent = '🖼'; };
        img.src = f.download_url;
        thumb.appendChild(img);
      } else {
        thumb.className += ' icon';
        thumb.textContent = f.name.toLowerCase().endsWith('.eps') ? '◈' : '📄';
      }
      tile.appendChild(thumb);

      var meta = document.createElement('div');
      meta.className = 'meta';
      var name = document.createElement('span');
      name.className = 'name';
      name.title = f.name;
      name.textContent = f.name;
      meta.appendChild(name);

      var link = document.createElement('a');
      link.href = f.download_url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'view';
      meta.appendChild(link);

      tile.appendChild(meta);
      fileGrid.appendChild(tile);
    });
  }

  /* ---------------- Upload ---------------- */

  uploadForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var fileInput = $('file');
    var file = fileInput.files && fileInput.files[0];
    if (!file) { return; }

    if (file.size > MAX_MB * 1024 * 1024) {
      showMsg($('upload-status'), 'File too large — max ' + MAX_MB + ' MB.', 'error');
      return;
    }

    var btn = $('upload-btn');
    btn.disabled = true;
    showMsg($('upload-status'), 'Uploading ' + file.name + '…', 'ok');

    fileToBase64(file).then(function (content) {
      var body = {
        subject: $('subject').value,
        category: $('category').value.trim(),
        filename: file.name,
        content: content
      };
      return api('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify(body)
      });
    }).then(function (data) {
      showMsg($('upload-status'), 'Saved permanently: ' + data.path, 'ok');
      fileInput.value = '';
      $('category').value = '';
      loadSubject(currentSubject);
    }).catch(function (err) {
      if (err.status === 401) { showLogin(); return; }
      showMsg($('upload-status'), err.message, 'error');
    }).finally(function () {
      btn.disabled = false;
    });
  });

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = reader.result;
        var idx = result.indexOf(',');
        resolve(idx === -1 ? result : result.slice(idx + 1));
      };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  /* ---------------- Init ---------------- */

  var token = getToken();
  if (token) {
    api('/api/check', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function (data) { showApp(data.username); })
      .catch(function () { showLogin(); });
  } else {
    showLogin();
  }
})();