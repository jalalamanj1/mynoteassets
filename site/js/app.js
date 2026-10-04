(function () {
  'use strict';

  var SUBJECTS = ['Biology', 'Geography', 'Chemistry', 'General', 'Math', 'Physics', 'Science'];
  var MAX_MB = 50;

  var $ = function (id) { return document.getElementById(id); };

  var loginView = $('login-view');
  var appView = $('app-view');
  var loginForm = $('login-form');
  var uploadForm = $('upload-form');
  var subjectTabs = $('subject-tabs');
  var fileGrid = $('file-grid');
  var browseStatus = $('browse-status');

  var currentSubject = SUBJECTS[0];
  var currentCategory = '';

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

  function isImage(name) {
    var ext = name.split('.').pop().toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].indexOf(ext) !== -1;
  }

  /* ---------------- Auth ---------------- */

  function showApp(username) {
    loginView.classList.add('hidden');
    appView.classList.remove('hidden');
    $('user-name').textContent = username || 'admin';
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
      showApp(data.username);
    }).catch(function (err) {
      showMsg($('login-error'), err.message, 'error');
    }).finally(function () {
      btn.disabled = false;
    });
  });

  $('logout').addEventListener('click', function () {
    api('/api/logout').catch(function () { /* ignore */ }).finally(function () {
      showLogin();
    });
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
        currentCategory = '';
        subjectTabs.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        loadSubject(s);
      });
      subjectTabs.appendChild(btn);
    });
  }

  function loadSubject(subject, category) {
    currentCategory = category || '';
    showMsg(browseStatus, 'Loading ' + subject + (currentCategory ? '/' + currentCategory : '') + '…', 'ok');
    fileGrid.innerHTML = '';

    var params = new URLSearchParams({ subject: subject });
    if (currentCategory) { params.set('category', currentCategory); }

    api('/api/list?' + params.toString())
      .then(function (data) {
        renderGrid(data, subject);
        var label = subject + (currentCategory ? '/' + currentCategory : '');
        showMsg(browseStatus, data.files.length + ' item(s) in ' + label, 'ok');
      })
      .catch(function (err) {
        if (err.status === 401) { showLogin(); return; }
        showMsg(browseStatus, err.message, 'error');
      });
  }

  function renderGrid(data, subject) {
    fileGrid.innerHTML = '';

    if (currentCategory) {
      var back = document.createElement('button');
      back.type = 'button';
      back.className = 'back-btn';
      back.textContent = '← ' + subject;
      back.addEventListener('click', function () { loadSubject(subject); });
      fileGrid.appendChild(back);
    }

    data.dirs.forEach(function (d) {
      var tile = document.createElement('div');
      tile.className = 'tile dir';
      tile.setAttribute('title', d.name);
      var icon = document.createElement('div');
      icon.className = 'thumb icon';
      icon.textContent = '📁';
      var meta = document.createElement('div');
      meta.className = 'meta';
      var name = document.createElement('span');
      name.className = 'name';
      name.textContent = d.name + '/';
      meta.appendChild(name);
      tile.appendChild(icon);
      tile.appendChild(meta);
      tile.addEventListener('click', function () { loadSubject(subject, d.name); });
      fileGrid.appendChild(tile);
    });

    data.files.forEach(function (f) {
      var tile = document.createElement('div');
      tile.className = 'tile';

      var thumb = document.createElement('div');
      thumb.className = 'thumb';
      var fileUrl = '/api/file?path=' + encodeURIComponent(f.path);
      if (isImage(f.name)) {
        var img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = f.name;
        img.onerror = function () { thumb.className += ' icon'; thumb.textContent = '🖼'; };
        img.src = fileUrl;
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
      link.href = fileUrl + '&download=1';
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'view';
      meta.appendChild(link);

      tile.appendChild(meta);
      fileGrid.appendChild(tile);
    });

    if (!data.dirs.length && !data.files.length) {
      var empty = document.createElement('div');
      empty.className = 'msg ok';
      empty.textContent = 'No files here yet.';
      fileGrid.appendChild(empty);
    }
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
      return api('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: $('subject').value,
          category: $('category').value.trim(),
          filename: file.name,
          content: content
        })
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

  api('/api/check').then(function (data) {
    showApp(data.username);
  }).catch(function () {
    showLogin();
  });
})();