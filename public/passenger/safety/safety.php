<!doctype html>
<html lang="en text-gray-900">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Safety - Emergency Contacts</title>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">

  <style>
    :root {
      --byahero-blue: #0d47a1;
      --byahero-light: #e3f2fd;
      --page-bg: #f8f9fa;
      --card-radius: 16px;
      --btn-radius: 12px;
    }

    body {
      background-color: var(--page-bg);
      padding-bottom: 80px;
    }

    .container-custom {
      max-width: 500px;
      margin: 0 auto;
    }

    .app-header {
      margin-top: 80px;
      margin-bottom: 30px;
    }

    .card-custom {
      background: white;
      border-radius: var(--card-radius);
      border: 1px solid rgba(0, 0, 0, 0.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .card-custom:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
    }

    .icon-box {
      width: 48px;
      height: 48px;
      border-radius: var(--btn-radius);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-box.add-btn {
      background-color: var(--byahero-light);
      color: var(--byahero-blue);
    }

    .contact-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      text-transform: uppercase;
    }

    .btn-custom {
      border-radius: var(--btn-radius);
      padding: 0.5rem 1.5rem;
      font-weight: 500;
    }

    .modal-content {
      border-radius: var(--card-radius);
      border: none;
    }

    .dropdown-toggle::after {
      display: none;
    }
  </style>
</head>

<body>
  <?php
  session_start();

/**
 * SECURE SYSTEM:
 * Require login before accessing to prevent URL manipulation.
 */
if (!isset($_SESSION['user_id'])) {
    $r = $_SERVER['SCRIPT_NAME'] ?? '';
    $p = rtrim(str_replace('\', '/', dirname($r)), '/');
    $b = preg_replace('~/public/.*$~', '', $p) ?: '';
    header('Location: ' . $b . '/public/login.php', true, 302);
    exit;
}
$pageTitle = 'Safety';
  $backLink = '../index.php';
  $pageDepth = '../../../';
  include __DIR__ . "/../../../components/navbarPassenger.php";
  ?>

  <main class="container-custom px-3">
    <div class="app-header">
      <h1 class="h3 fw-bold mb-1" style="color:var(--byahero-blue);">Emergency Contacts</h1>
      <p class="text-muted small">Add up to 5 people we can reach out to in an emergency.</p>
    </div>

    <a href="addNewContact.php" class="text-decoration-none text-dark d-block mb-4">
      <div class="card-custom p-3 d-flex align-items-center gap-3">
        <div class="icon-box add-btn flex-shrink-0">
          <span class="material-symbols-rounded">add</span>
        </div>
        <div class="flex-grow-1">
          <h6 class="mb-0 fw-semibold">Add New Contact</h6>
          <small class="text-muted">Tap to add</small>
        </div>
        <span class="material-symbols-rounded text-muted">chevron_right</span>
      </div>
    </a>

    <section>
      <div class="d-flex align-items-center justify-content-between mb-3 px-1">
        <h6 class="mb-0 fw-semibold text-secondary">Your Contacts</h6>
        <span id="contacts-status" class="spinner-border spinner-border-sm text-primary d-none" role="status"></span>
      </div>

      <div id="contacts-list" class="vstack gap-3">
        </div>
    </section>
  </main>

  <div class="modal fade" id="editContactModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header border-bottom-0 pb-0">
          <h5 class="modal-title fw-bold">Edit Contact</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body">
          <input type="hidden" id="edit-id">

          <div class="form-floating mb-3">
            <input type="text" class="form-control" id="edit-first" placeholder="First Name" required>
            <label for="edit-first">First Name</label>
          </div>

          <div class="form-floating mb-3">
            <input type="text" class="form-control" id="edit-last" placeholder="Last Name">
            <label for="edit-last">Last Name (Optional)</label>
          </div>

          <div class="form-floating mb-3">
            <input type="tel" class="form-control" id="edit-phone" placeholder="Phone Number" required>
            <label for="edit-phone">Phone Number</label>
            <div class="form-text small">e.g., 09XXXXXXXXX</div>
          </div>

          <div class="form-floating mb-1">
            <select class="form-select" id="edit-relative" required>
              <option value="Parent">Parent</option>
              <option value="Spouse">Spouse</option>
              <option value="Sibling">Sibling</option>
              <option value="Friend">Friend</option>
              <option value="Other">Other</option>
            </select>
            <label for="edit-relative">Relationship</label>
          </div>
        </div>

        <div class="modal-footer border-top-0 pt-0">
          <button type="button" class="btn btn-light btn-custom" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary btn-custom" onclick="submitEdit()" style="background-color: var(--byahero-blue); border-color: var(--byahero-blue);">Save Changes</button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

  <script>
    const BACKEND_BASE = "../../../backend";
    let editModal;

    function escapeHtml(str) {
      return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function getInitials(firstName, lastName) {
        let initials = "";
        if (firstName) initials += firstName.charAt(0);
        if (lastName) initials += lastName.charAt(0);
        return initials.toUpperCase() || "?";
    }

    function avatarColorById(id) {
      const colors = ["#4285F4", "#DB4437", "#F4B400", "#0F9D58", "#AB47BC", "#00ACC1"];
      const idx = Math.abs(parseInt(id || 0, 10)) % colors.length;
      return colors[idx];
    }

    function renderContactCard(c) {
      const color = avatarColorById(c.id);
      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown';
      const initials = getInitials(c.first_name, c.last_name);

      return `
        <div class="card-custom p-3 d-flex align-items-center gap-3">
          <div class="contact-avatar flex-shrink-0" style="background-color: ${color};">
            ${escapeHtml(initials)}
          </div>

          <div class="flex-grow-1 min-w-0">
            <h6 class="mb-1 text-truncate fw-semibold">${escapeHtml(fullName)}</h6>
            <div class="d-flex align-items-center text-muted small mb-1">
              <span class="material-symbols-rounded me-1" style="font-size: 16px;">call</span>
              ${escapeHtml(c.phone || '')}
            </div>
            <span class="badge bg-light text-dark border fw-normal">${escapeHtml(c.relative_type || 'Other')}</span>
          </div>

          <div class="dropdown flex-shrink-0">
            <button class="btn btn-sm btn-light rounded-circle p-2 dropdown-toggle d-flex align-items-center justify-content-center border-0" 
                    type="button" data-bs-toggle="dropdown" aria-expanded="false" style="width: 36px; height: 36px;">
              <span class="material-symbols-rounded text-secondary" style="font-size: 20px;">more_vert</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 py-2" style="border-radius: 12px;">
              <li><a class="dropdown-item d-flex align-items-center gap-2 py-2" href="tel:${encodeURIComponent(c.phone || '')}"><span class="material-symbols-rounded fs-6">call</span> Call</a></li>
              <li><a class="dropdown-item d-flex align-items-center gap-2 py-2" href="sms:${encodeURIComponent(c.phone || '')}"><span class="material-symbols-rounded fs-6">chat</span> Message</a></li>
              <li><hr class="dropdown-divider my-1"></li>
              <li><button class="dropdown-item d-flex align-items-center gap-2 py-2" type="button" onclick='openEditModal(${JSON.stringify(c)})'><span class="material-symbols-rounded fs-6">edit</span> Edit</button></li>
              <li><button class="dropdown-item d-flex align-items-center gap-2 py-2 text-danger" type="button" onclick="deleteContact(${c.id})"><span class="material-symbols-rounded fs-6">delete</span> Delete</button></li>
            </ul>
          </div>
        </div>
      `;
    }

    async function loadEmergencyContacts() {
      const statusEl = document.getElementById("contacts-status");
      const listEl = document.getElementById("contacts-list");

      statusEl.classList.remove("d-none"); // Show spinner
      listEl.innerHTML = "";

      try {
        const res = await fetch(`${BACKEND_BASE}/getEmergencyContacts.php`, { credentials: "include" });

        if (!res.ok) {
           listEl.innerHTML = `<div class="alert alert-warning">Error loading contacts.</div>`;
           return;
        }

        const data = await res.json();

        if (!data.success) {
           listEl.innerHTML = `<div class="alert alert-warning">${escapeHtml(data.message || "Error")}</div>`;
           return;
        }

        const contacts = data.contacts || [];

        if (contacts.length === 0) {
          listEl.innerHTML = `
            <div class="text-center py-5 text-muted">
              <span class="material-symbols-rounded mb-2" style="font-size: 48px; opacity: 0.5;">contact_phone</span>
              <p>No emergency contacts added yet.</p>
            </div>`;
          return;
        }

        listEl.innerHTML = contacts.map(renderContactCard).join("");

      } catch (e) {
        console.error(e);
        listEl.innerHTML = `<div class="alert alert-danger">Connection error.</div>`;
      } finally {
        statusEl.classList.add("d-none"); // Hide spinner
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
      const ok = confirm("Are you sure you want to remove this contact?");
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

    // Initialize
    document.addEventListener("DOMContentLoaded", loadEmergencyContacts);
  </script>
</body>

</html>