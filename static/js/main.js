const phoneInput = document.getElementById('phone');
const nameInput = document.getElementById('name');
const nameField = document.getElementById('name-field');
const nextBtn = document.getElementById('next-btn');
const sendBtn = document.getElementById('send-btn');
const status = document.getElementById('status');

nextBtn.addEventListener('click', () => {
  const phone = phoneInput.value.trim();
  if (!phone) {
    showStatus('Please enter a phone number.', 'error');
    return;
  }
  hideStatus();
  nameField.classList.remove('hidden');
  nextBtn.classList.add('hidden');
  sendBtn.classList.remove('hidden');
  sendBtn.disabled = true;
  nameInput.focus();
});

nameInput.addEventListener('input', () => {
  sendBtn.disabled = nameInput.value.trim() === '';
});

sendBtn.addEventListener('click', async () => {
  const phone = phoneInput.value.trim();
  const name = nameInput.value.trim();

  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';
  hideStatus();

  try {
    const res = await fetch('/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phone, sender_name: name }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showStatus(`A poem is on its way to ${phone}!`, 'success');
      nameInput.value = '';
      phoneInput.value = '';
      nameField.classList.add('hidden');
      nextBtn.classList.remove('hidden');
      sendBtn.classList.add('hidden');
    } else {
      showStatus(data.error || 'Something went wrong. Please try again.', 'error');
      sendBtn.disabled = false;
    }
  } catch {
    showStatus('Network error. Please try again.', 'error');
    sendBtn.disabled = false;
  }

  sendBtn.textContent = 'Send Poem';
});

function showStatus(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
  status.classList.remove('hidden');
}

function hideStatus() {
  status.classList.add('hidden');
}
