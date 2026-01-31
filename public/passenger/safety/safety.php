<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Safety - Emergency Contacts</title>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

  <style>
    :root{
      --max-contacts:5;
    }
    /* Page */
    body {
      background: #f7fafc;
      color: #102a43;
      font-family: Inter, "Segoe UI", Roboto, system-ui, -apple-system, "Helvetica Neue", Arial;
      -webkit-font-smoothing:antialiased;
      -moz-osx-font-smoothing:grayscale;
    }

    /* Appbar */
    .appbar {
      background: linear-gradient(180deg,#1e5aa3,#295f9d);
      color: white;
      padding: 14px 12px;
      border-bottom-left-radius: 16px;
      border-bottom-right-radius: 16px;
      box-shadow: 0 4px 8px rgba(2,6,23,0.12);
      display:flex;
      align-items:center;
      gap:12px;
    }
    .appbar .back {
      width:36px; height:36px; display:flex; align-items:center; justify-content:center;
      border-radius:8px; background:rgba(255,255,255,0.08);
      color:#fff; font-size:18px;
    }
    .appbar .title { font-weight:700; font-size:16px; }

    .container-wrap { max-width:520px; margin:20px auto; padding:0 12px; }

    h2.h5 { color:#123e6c; font-weight:700; margin-bottom:10px; }

    .card-list { gap:12px; display:flex; flex-direction:column; }

    .card.ui-card {
      border-radius:14px;
      padding:14px;
      display:flex;
      align-items:center;
      box-shadow: 0 6px 10px rgba(15,23,42,0.06);
      background:white;
      border:0;
    }

    /* Add card */
    .addCard { cursor:pointer; user-select:none; }
    .avatar {
      width:56px; height:56px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:20px; color:#fff; border-radius:50%;
      box-shadow: 0 3px 8px rgba(2,6,23,0.08);
      flex-shrink:0;
    }
    .av-gray { background:#f0f2f4; color:#102a43; font-size:28px; font-weight:800; }
    .av-blue{ background:#5fb0ff; }
    .av-green{ background:#41d18a; }
    .av-yellow{ background:#ffd166; color:#072a15; }
    .av-pink{ background:#ff7aa2; }
    .av-red{ background:#ff6b6b; }

    .card-content { flex:1; margin-left:12px; }
    .card-content .name { font-weight:700; font-size:16px; }
    .card-content .phone { font-size:13px; color:#6b7280; margin-top:2px; display:flex; align-items:center; gap:8px; }

    .three-dot-btn {
      background:transparent; border:0; width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:10px;
    }

    .opacity-50 { opacity:0.45; }

    /* Responsive bottom spacing like mobile */
    @media (max-width:420px){
      .container-wrap{ padding-bottom:72px; }
    }
  </style>
</head>
<body>

  <header class="appbar">
    <button class="back" id="closeBtn" aria-label="Close">✕</button>
    <div class="title">Safety</div>
  </header>

  <main class="container-wrap">
    <h2 class="h5">Emergency Contact</h2>

    <div id="contactsList" class="card-list" aria-live="polite">
      <!-- Add New card -->
      <div id="addNewCard" role="button" tabindex="0" class="card ui-card addCard">
        <div class="avatar av-gray">+</div>
        <div class="card-content">
          <div class="name">Add New</div>
          <div class="text-muted small">Maximum of 5 contacts</div>
        </div>
      </div>

      <!-- contact cards are rendered here -->
    </div>
  </main>

  <!-- Modal -->
  <div class="modal fade" id="contactModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="modalTitle">Add Contact</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form id="contactForm" onsubmit="return false;">
            <div class="mb-3">
              <label for="contactName" class="form-label">Name</label>
              <input id="contactName" type="text" class="form-control" placeholder="e.g. Ate Jane" maxlength="60" />
            </div>
            <div class="mb-2">
              <label for="contactPhone" class="form-label">Phone</label>
              <input id="contactPhone" type="tel" inputmode="numeric" pattern="\d*" class="form-control" placeholder="09XXXXXXXXX" maxlength="11" />
            </div>
            <div class="text-muted small">Phone numbers shown partially masked for privacy.</div>
          </form>
        </div>
        <div class="modal-footer">
          <button id="cancelModal" type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
          <button id="saveContact" type="button" class="btn btn-primary">Save</button>
        </div>
      </div>
    </div>
  </div>



  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

  <script>
    // UI-only in-memory behavior (no persistence)
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

    function maskPhone(phone){
      const digits = (phone || '').replace(/\D/g,'');
      if(digits.length <= 4) return phone || '';
      const keep = 3;
      const endKeep = 3;
      const start = digits.slice(0, keep);
      const end = digits.slice(-endKeep);
      const middleCount = Math.max(0, digits.length - keep - endKeep);
      return start + '•'.repeat(middleCount) + end;
    }

    function pickAvatarColor(index){
      const classes = ['av-pink','av-blue','av-green','av-yellow','av-red'];
      return classes[index % classes.length];
    }

    function render(){
      // Remove existing contact cards (keep Add New which is first child)
      // Remove all children except the first (Add New)
      while(contactsContainer.children.length > 1){
        contactsContainer.removeChild(contactsContainer.lastChild);
      }

      contacts.forEach((c, i) => {
        const item = document.createElement('div');
        item.className = 'card ui-card';
        item.setAttribute('data-index', i);

        const avatar = document.createElement('div');
        avatar.className = 'avatar ' + pickAvatarColor(i);
        avatar.textContent = (c.name && c.name.length>0) ? c.name.trim().charAt(0).toUpperCase() : '?';

        const content = document.createElement('div');
        content.className = 'card-content';

        const nameEl = document.createElement('div');
        nameEl.className = 'name';
        nameEl.textContent = c.name || 'Unnamed';

        const phoneEl = document.createElement('div');
        phoneEl.className = 'phone';
        phoneEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="opacity:0.9"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.72c.12.9.36 1.78.72 2.6a2 2 0 0 1-.45 2.11L9.91 9.91a16 16 0 0 0 6 6l1.48-1.48a2 2 0 0 1 2.11-.45c.82.36 1.71.6 2.6.72A2 2 0 0 1 22 16.92z" stroke="#102a43" stroke-width="1" stroke-linejoin="round"/></svg>' + '<span>' + maskPhone(c.phone) + '</span>';

        content.appendChild(nameEl);
        content.appendChild(phoneEl);

        // three-dot menu (native dropdown)
        const dropdownWrap = document.createElement('div');
        dropdownWrap.className = 'ms-2 dropdown';

        const menuBtn = document.createElement('button');
        menuBtn.className = 'three-dot-btn';
        menuBtn.setAttribute('type','button');
        menuBtn.setAttribute('data-bs-toggle','dropdown');
        menuBtn.setAttribute('aria-expanded','false');
        menuBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.6" fill="#102a43"/><circle cx="12" cy="12" r="1.6" fill="#102a43"/><circle cx="12" cy="19" r="1.6" fill="#102a43"/></svg>';

        const menu = document.createElement('ul');
        menu.className = 'dropdown-menu dropdown-menu-end';
        const editItem = document.createElement('li');
        const editLink = document.createElement('button');
        editLink.className = 'dropdown-item';
        editLink.type = 'button';
        editLink.textContent = 'Edit';
        editItem.appendChild(editLink);

        const delItem = document.createElement('li');
        const delLink = document.createElement('button');
        delLink.className = 'dropdown-item text-danger';
        delLink.type = 'button';
        delLink.textContent = 'Delete';
        delItem.appendChild(delLink);

        menu.appendChild(editItem);
        menu.appendChild(delItem);

        editLink.addEventListener('click', () => openModal('Edit Contact', c.name, c.phone, i));
        delLink.addEventListener('click', () => {
          if(confirm('Delete this contact?')){
            contacts.splice(i,1);
            render();
          }
        });

        dropdownWrap.appendChild(menuBtn);
        dropdownWrap.appendChild(menu);

        item.appendChild(avatar);
        item.appendChild(content);
        item.appendChild(dropdownWrap);

        contactsContainer.appendChild(item);
      });

      // manage add state
      if(contacts.length >= MAX_CONTACTS){
        addNewCard.classList.add('opacity-50');
        addNewCard.setAttribute('aria-disabled','true');
        addNewCard.style.pointerEvents = 'none';
      } else {
        addNewCard.classList.remove('opacity-50');
        addNewCard.removeAttribute('aria-disabled');
        addNewCard.style.pointerEvents = '';
      }
    }

    function openModal(title='Add Contact', name='', phone='', index=-1){
      modalTitle.textContent = title;
      contactNameInput.value = name || '';
      contactPhoneInput.value = phone || '';
      editingIndex = index;
      bsModal.show();
      setTimeout(()=> contactNameInput.focus(), 150);
    }

    function closeModal(){
      bsModal.hide();
      editingIndex = -1;
      contactNameInput.value = '';
      contactPhoneInput.value = '';
    }

    // basic input sanitation for phone (digits and +)
    contactPhoneInput.addEventListener('input', () => {
      const val = contactPhoneInput.value;
      // allow + at start and digits thereafter
      let sanitized = val.replace(/[^\d+]/g, '');
      if(sanitized.indexOf('+') > 0){
        sanitized = sanitized.replace(/\+/g, '');
      }
      contactPhoneInput.value = sanitized;
    });

    addNewCard.addEventListener('click', () => openModal('Add Contact'));
    addNewCard.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') openModal('Add Contact'); });

    saveContactBtn.addEventListener('click', () => {
      const name = contactNameInput.value.trim();
      const phone = contactPhoneInput.value.trim();
      if(!name){ alert('Please enter a name.'); contactNameInput.focus(); return; }
      if(!phone){ alert('Please enter a phone number.'); contactPhoneInput.focus(); return; }

      if(editingIndex >= 0){
        contacts[editingIndex] = { name, phone };
      } else {
        if(contacts.length >= MAX_CONTACTS){ alert('Maximum of ' + MAX_CONTACTS + ' contacts reached.'); return; }
        contacts.push({ name, phone });
      }
      render();
      closeModal();
    });

    document.getElementById('closeBtn').addEventListener('click', () => {
      if(confirm('Close Safety?')) { /* mimic navigate back */ }
    });

    // init
    render();
  </script>
</body>
</html>