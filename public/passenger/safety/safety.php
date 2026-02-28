<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Safety - Emergency Contacts</title>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
    rel="stylesheet">

  <style>
    :root {
      --byahero-blue: #0d47a1;
      --page-bg: #f7fafc;
    }

    body {
      background: var(--page-bg);
      padding-bottom: 100px;
    }

    .max-w-520 {
      max-width: 520px;
    }

    .soft-shadow {
      box-shadow: 0 6px 18px rgba(16, 42, 67, .10);
    }

    .tile-radius {
      border-radius: 16px;
    }

    .contact-radius {
      border-radius: 14px;
    }

    .avatar {
      width: 56px;
      height: 56px;
    }
  </style>
</head>

<body>
  <?php
  $pageTitle = 'Safety';
  $backLink = '../index.php';
  $pageDepth = '../../../';
  include __DIR__ . "/../../../components/navbarPassenger.php";
  ?>

  <main class="container max-w-520 pt-4" style="margin-top:72px;">
    <div class="mb-3">
      <h1 class="display-6 fw-bold mb-0" style="color:var(--byahero-blue);">Emergency Contact</h1>
    </div>

    <a href="addNewContact.php" class="text-decoration-none text-dark">
      <div class="d-flex align-items-center gap-3 p-3 bg-white tile-radius soft-shadow">
        <div class="rounded-circle bg-secondary-subtle d-flex align-items-center justify-content-center flex-shrink-0"
          style="width:56px;height:56px;">
          <span class="material-symbols-rounded"
            style="font-size:32px; color:#000; font-variation-settings:'FILL' 1,'wght' 600,'opsz' 48;">add</span>
        </div>
        <div class="flex-grow-1">
          <div class="fw-bold">Add New</div>
          <div class="text-muted small">Maximum of 5 contacts</div>
        </div>
      </div>
    </a>

    <section class="mt-4">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <small id="contacts-status" class="text-muted"></small>
      </div>

      <div id="contacts-list" class="vstack gap-3"></div>
    </section>
  </main>

  <!-- Edit Modal -->
  <div class="modal fade" id="editContactModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4">
        <div class="modal-header">
          <h5 class="modal-title fw-bold">Edit Contact</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body">
          <input type="hidden" id="edit-id">

          <div class="mb-3">
            <label class="form-label">First Name</label>
            <input class="form-control" id="edit-first" required>
          </div>

          <div class="mb-3">
            <label class="form-label">Last Name</label>
            <input class="form-control" id="edit-last">
          </div>

          <div class="mb-3">
            <label class="form-label">Phone (PH mobile)</label>
            <input class="form-control" id="edit-phone" placeholder="+639XXXXXXXXX or 09XXXXXXXXX" required>
            <div class="form-text">Accepted: +639XXXXXXXXX, 09XXXXXXXXX, or 9XXXXXXXXX</div>
          </div>

          <div class="mb-0">
            <label class="form-label">Relative Type</label>
            <select class="form-select" id="edit-relative" required>
              <option value="Parent">Parent</option>
              <option value="Spouse">Spouse</option>
              <option value="Sibling">Sibling</option>
              <option value="Friend">Friend</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
          <button class="btn btn-primary" type="button" onclick="submitEdit()">Save</button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

  <script>
    const BACKEND_BASE = "/ByaHero-Prototype-V3/backend";
    let editModal;

    function escapeHtml(str) {
      return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function avatarColorById(id) {
      const colors = ["#ff66b3", "#59b6ff", "#46e59a", "#ff5c8a", "#fbbf24", "#a78bfa"];
      const idx = Math.abs(parseInt(id || 0, 10)) % colors.length;
      return colors[idx];
    }

    function renderContactCard(c) {
      const color = avatarColorById(c.id);
      const fullName = `${c.first_name || ''}${c.last_name ? ' ' + c.last_name : ''}`.trim() || 'Unknown';

      return `
        <div class="bg-white soft-shadow contact-radius px-3 py-2 d-flex align-items-center gap-3">
          <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 avatar"
              style="background:${color};">
            <span class="material-symbols-rounded"
              style="font-size:28px; color:#000; font-variation-settings:'FILL' 1,'wght' 600,'opsz' 48;">
              person
            </span>
          </div>

          <div class="flex-grow-1">
            <div class="fw-bold lh-sm">${escapeHtml(fullName)}</div>
            <div class="d-flex align-items-center gap-2 text-muted small">
              <span class="material-symbols-rounded" style="font-size:18px; line-height:1;">call</span>
              <span>${escapeHtml(c.phone || '')}</span>
            </div>
            <div class="text-muted small">${escapeHtml(c.relative_type || '')}</div>
          </div>

          <div class="dropdown">
            <button class="btn btn-sm btn-link text-decoration-none text-muted p-0"
              type="button" data-bs-toggle="dropdown" aria-expanded="false"
              style="width:36px;height:36px;">
              <span class="material-symbols-rounded" style="font-size:22px;">more_vert</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item" href="tel:${encodeURIComponent(c.phone || '')}">Call</a></li>
              <li><a class="dropdown-item" href="sms:${encodeURIComponent(c.phone || '')}">Text</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><button class="dropdown-item" type="button" onclick='openEditModal(${JSON.stringify(c)})'>Edit</button></li>
              <li><button class="dropdown-item text-danger" type="button" onclick="deleteContact(${c.id})">Delete</button></li>
            </ul>
          </div>
        </div>
      `;
    }

    async function loadEmergencyContacts() {
      const statusEl = document.getElementById("contacts-status");
      const listEl = document.getElementById("contacts-list");

      statusEl.textContent = "Loading…";
      listEl.innerHTML = "";

      try {
        const res = await fetch(`${BACKEND_BASE}/getEmergencyContacts.php`, { credentials: "include" });

        if (!res.ok) {
          statusEl.textContent = (res.status === 401) ? "Please sign in" : "Error";
          return;
        }

        const data = await res.json();

        if (!data.success) {
          statusEl.textContent = data.message || "Error";
          return;
        }

        const contacts = data.contacts || [];
        statusEl.textContent = "";

        if (contacts.length === 0) {
          listEl.innerHTML = `<div class="text-muted small">No emergency contacts yet.</div>`;
          return;
        }

        listEl.innerHTML = contacts.map(renderContactCard).join("");

      } catch (e) {
        console.error(e);
        statusEl.textContent = "Error";
      }
    }

    function openEditModal(contact) {
      if (!editModal) editModal = new bootstrap.Modal(document.getElementById('editContactModal'));

      document.getElementById('edit-id').value = contact.id;
      document.getElementById('edit-first').value = contact.first_name || '';
      document.getElementById('edit-last').value = contact.last_name || '';
      document.getElementById('edit-phone').value = contact.phone || '';
      document.getElementById('edit-relative').value = contact.relative_type || 'Friend';

      editModal.show();
    }

    async function submitEdit() {
      const payload = {
        id: parseInt(document.getElementById('edit-id').value, 10),
        first_name: document.getElementById('edit-first').value.trim(),
        last_name: document.getElementById('edit-last').value.trim(),
        phone: document.getElementById('edit-phone').value.trim(),
        relative_type: document.getElementById('edit-relative').value
      };

      try {
        const res = await fetch(`${BACKEND_BASE}/updateEmergencyContact.php`, {
          method: 'POST',
          credentials: "include",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Failed to update");

        if (editModal) editModal.hide();
        await loadEmergencyContacts();

      } catch (e) {
        alert(e.message);
      }
    }

    async function deleteContact(id) {
      const ok = confirm("Delete this contact?");
      if (!ok) return;

      try {
        const res = await fetch(`${BACKEND_BASE}/deleteEmergencyContact.php`, {
          method: 'POST',
          credentials: "include",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Failed to delete");

        await loadEmergencyContacts();

      } catch (e) {
        alert(e.message);
      }
    }

    loadEmergencyContacts();
  </script>
</body>

</html>