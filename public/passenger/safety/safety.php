<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Safety - Emergency Contacts</title>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">

  <style>
    body{
      background:#f7fafc;
      color:#102a43;
      font-family:Inter,"Segoe UI",Roboto,system-ui,-apple-system,"Helvetica Neue",Arial;
      -webkit-font-smoothing:antialiased;
      -moz-osx-font-smoothing:grayscale;

      /* keep space for your bottom navbar (as you had) */
      padding-bottom:100px !important;
    }

    /* NEW: space for the TOP navbar */
    :root{
      --top-nav-offset: 76px; /* adjust if your navbar is taller/shorter */
    }

    .safety-page .container-wrap{
      max-width:560px;
    }

    .avatar{
      width:56px;height:56px;
      display:flex;align-items:center;justify-content:center;
      border-radius:50%;
      font-weight:800;
      box-shadow:0 .5rem 1rem rgba(15,23,42,.06);
      flex:0 0 auto;
      user-select:none;
    }
    .av-gray{ background:#f0f2f4; color:#102a43; font-size:28px; }
    .av-blue{ background:#5fb0ff; color:#fff; }
    .av-green{ background:#41d18a; color:#fff; }
    .av-yellow{ background:#ffd166; color:#072a15; }
    .av-pink{ background:#ff7aa2; color:#fff; }
    .av-red{ background:#ff6b6b; color:#fff; }

    .contact-card{
      border:0;
      border-radius:14px;
      box-shadow:0 6px 10px rgba(15, 23, 42, 0.06);
    }

    .three-dot-btn{
      width:40px;height:40px;
      display:inline-flex;align-items:center;justify-content:center;
    }

    .opacity-50x{ opacity:.45; }
  </style>
</head>

<body>
<?php
  $pageTitle = 'Safety';
  $backLink = '../index.php';
  $pageDepth = '../../../';
  include __DIR__ . "/../../../components/navbarPassenger.php";
?>

<div class="safety-page">
  <!-- UPDATED: added top padding to clear navbar -->
  <main class="container container-wrap pt-4" style="padding-top: calc(var(--top-nav-offset) + 1rem) !important;">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div>
        <h1 class="h5 mb-1 fw-bold text-primary-emphasis">Emergency Contacts</h1>
        <div class="text-muted small">Add up to 5 trusted people.</div>
      </div>
    </div>

    <div id="contactsList" class="vstack gap-3" aria-live="polite">
      <div id="addNewCard" role="button" tabindex="0" class="card contact-card">
        <div class="card-body d-flex align-items-center gap-3 p-3">
          <div class="avatar av-gray">+</div>

          <div class="flex-grow-1">
            <div class="fw-semibold">Add New</div>
            <div class="text-muted small">Maximum of 5 contacts</div>
          </div>

          <div class="text-muted">
            <span class="material-symbols-rounded" style="font-size:22px;">chevron_right</span>
          </div>
        </div>
      </div>

      <!-- contact cards are rendered here (JS) -->
    </div>
  </main>

  <div class="modal fade" id="contactModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" style="max-width:420px;">
      <div class="modal-content border-0 shadow">
        <div class="modal-header">
          <h5 class="modal-title" id="modalTitle">Add Contact</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body">
          <form id="contactForm" class="vstack gap-3" onsubmit="return false;">
            <div>
              <label for="contactName" class="form-label">Name</label>
              <input id="contactName" type="text" class="form-control" placeholder="e.g. Ate Jane" maxlength="60" />
            </div>

            <div>
              <label for="contactPhone" class="form-label">Phone</label>
              <input id="contactPhone" type="tel" inputmode="numeric" pattern="\d*" class="form-control" placeholder="09XXXXXXXXX" maxlength="11" />
              <div class="form-text">Phone numbers shown partially masked for privacy.</div>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button id="cancelModal" type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
          <button id="saveContact" type="button" class="btn btn-primary">Save</button>
        </div>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

<script>
  const MAX_CONTACTS = 5;
  const contactsContainer = document.getElementById('contactsList');
  const addNewCard = document.getElementById('addNewCard');

  const modalEl = document.getElementById('contactModal');
  const modalTitle = document.getElementById('modalTitle');
  const contactNameInput = document.getElementById('contactName');
  const contactPhoneInput = document.getElementById('contactPhone');
  const saveContactBtn = document.getElementById('saveContact');

  const bsModal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

  let contacts = [
    { name: 'Ate', phone: '+63 9123456789' },
    { name: 'Daddy Rob', phone: '+63 9174445555' },
    { name: 'Kuya', phone: '+63 9211112222' },
    { name: 'Mommy Oni', phone: '+63 9183334444' },
  ];

  let editingIndex = -1;

  function maskPhone(phone) {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length <= 4) return phone || '';
    const keep = 3;
    const endKeep = 3;
    const start = digits.slice(0, keep);
    const end = digits.slice(-endKeep);
    const middleCount = Math.max(0, digits.length - keep - endKeep);
    return start + '•'.repeat(middleCount) + end;
  }

  function pickAvatarColor(index) {
    const classes = ['av-pink', 'av-blue', 'av-green', 'av-yellow', 'av-red'];
    return classes[index % classes.length];
  }

  function createPhoneRow(masked) {
    const wrap = document.createElement('div');
    wrap.className = 'text-muted small d-flex align-items-center gap-2 mt-1';

    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.style.fontSize = '18px';
    icon.textContent = 'call';

    const txt = document.createElement('span');
    txt.textContent = masked;

    wrap.appendChild(icon);
    wrap.appendChild(txt);
    return wrap;
  }

  function render() {
    while (contactsContainer.children.length > 1) {
      contactsContainer.removeChild(contactsContainer.lastChild);
    }

    contacts.forEach((c, i) => {
      const card = document.createElement('div');
      card.className = 'card contact-card';
      card.setAttribute('data-index', i);

      const body = document.createElement('div');
      body.className = 'card-body d-flex align-items-center gap-3 p-3';

      const avatar = document.createElement('div');
      avatar.className = 'avatar ' + pickAvatarColor(i);
      avatar.textContent = (c.name && c.name.length > 0) ? c.name.trim().charAt(0).toUpperCase() : '?';

      const content = document.createElement('div');
      content.className = 'flex-grow-1';

      const nameEl = document.createElement('div');
      nameEl.className = 'fw-semibold';
      nameEl.textContent = c.name || 'Unnamed';

      const phoneRow = createPhoneRow(maskPhone(c.phone));

      content.appendChild(nameEl);
      content.appendChild(phoneRow);

      const dropdownWrap = document.createElement('div');
      dropdownWrap.className = 'dropdown';

      const menuBtn = document.createElement('button');
      menuBtn.className = 'btn btn-light three-dot-btn dropdown-toggle p-0';
      menuBtn.type = 'button';
      menuBtn.setAttribute('data-bs-toggle', 'dropdown');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.style.setProperty('--bs-btn-bg', '#ffffff');
      menuBtn.style.setProperty('--bs-btn-border-color', 'transparent');
      menuBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:22px;">more_vert</span>';

      const menu = document.createElement('ul');
      menu.className = 'dropdown-menu dropdown-menu-end shadow-sm';

      const editItem = document.createElement('li');
      const editLink = document.createElement('button');
      editLink.className = 'dropdown-item';
      editLink.type = 'button';
      editLink.innerHTML = '<span class="material-symbols-rounded me-2" style="font-size:18px; vertical-align:middle;">edit</span>Edit';
      editItem.appendChild(editLink);

      const delItem = document.createElement('li');
      const delLink = document.createElement('button');
      delLink.className = 'dropdown-item text-danger';
      delLink.type = 'button';
      delLink.innerHTML = '<span class="material-symbols-rounded me-2" style="font-size:18px; vertical-align:middle;">delete</span>Delete';
      delItem.appendChild(delLink);

      menu.appendChild(editItem);
      menu.appendChild(delItem);

      editLink.addEventListener('click', () => openModal('Edit Contact', c.name, c.phone, i));
      delLink.addEventListener('click', () => {
        if (confirm('Delete this contact?')) {
          contacts.splice(i, 1);
          render();
        }
      });

      dropdownWrap.appendChild(menuBtn);
      dropdownWrap.appendChild(menu);

      body.appendChild(avatar);
      body.appendChild(content);
      body.appendChild(dropdownWrap);

      card.appendChild(body);
      contactsContainer.appendChild(card);
    });

    if (contacts.length >= MAX_CONTACTS) {
      addNewCard.classList.add('opacity-50x');
      addNewCard.setAttribute('aria-disabled', 'true');
      addNewCard.style.pointerEvents = 'none';
    } else {
      addNewCard.classList.remove('opacity-50x');
      addNewCard.removeAttribute('aria-disabled');
      addNewCard.style.pointerEvents = '';
    }
  }

  function openModal(title = 'Add Contact', name = '', phone = '', index = -1) {
    modalTitle.textContent = title;
    contactNameInput.value = name || '';
    contactPhoneInput.value = phone || '';
    editingIndex = index;
    bsModal.show();
    setTimeout(() => contactNameInput.focus(), 150);
  }

  function closeModal() {
    bsModal.hide();
    editingIndex = -1;
    contactNameInput.value = '';
    contactPhoneInput.value = '';
  }

  contactPhoneInput.addEventListener('input', () => {
    const val = contactPhoneInput.value;
    let sanitized = val.replace(/[^\d+]/g, '');
    if (sanitized.indexOf('+') > 0) sanitized = sanitized.replace(/\+/g, '');
    contactPhoneInput.value = sanitized;
  });

  addNewCard.addEventListener('click', () => openModal('Add Contact'));
  addNewCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') openModal('Add Contact');
  });

  saveContactBtn.addEventListener('click', () => {
    const name = contactNameInput.value.trim();
    const phone = contactPhoneInput.value.trim();
    if (!name) { alert('Please enter a name.'); contactNameInput.focus(); return; }
    if (!phone) { alert('Please enter a phone number.'); contactPhoneInput.focus(); return; }

    if (editingIndex >= 0) {
      contacts[editingIndex] = { name, phone };
    } else {
      if (contacts.length >= MAX_CONTACTS) { alert('Maximum of ' + MAX_CONTACTS + ' contacts reached.'); return; }
      contacts.push({ name, phone });
    }

    render();
    closeModal();
  });

  render();
</script>
</body>
</html>