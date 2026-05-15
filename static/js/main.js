const phoneInput = document.getElementById('phone');
const nameInput = document.getElementById('name');
const nameField = document.getElementById('name-field');
const nextBtn = document.getElementById('next-btn');
const sendBtn = document.getElementById('send-btn');
const status = document.getElementById('status');
const phoneHint = document.getElementById('phone-hint');

const SUPPORTED_CODES = ['+1', '+44', '+47', '+45'];
const CODE_LABELS = {
  '+1': 'US (+1)',
  '+44': 'UK (+44)',
  '+47': 'Norway (+47)',
  '+45': 'Denmark (+45)',
};

function validatePhone(raw) {
  const phone = raw.trim();

  if (!phone) return { valid: false, message: '' };

  if (!phone.startsWith('+')) {
    return { valid: false, message: 'Phone number must start with + and a country code (e.g. +1, +44, +47, +45).' };
  }

  const matchedCode = SUPPORTED_CODES.find(code => phone.startsWith(code));
  if (!matchedCode) {
    const supported = SUPPORTED_CODES.map(c => CODE_LABELS[c]).join(', ');
    return { valid: false, message: `Unsupported country code. Supported: ${supported}.` };
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    return { valid: false, message: 'Number is too short. Please include the full phone number.' };
  }

  return { valid: true, message: '' };
}

nextBtn.disabled = true;

phoneInput.addEventListener('input', () => {
  const { valid, message } = validatePhone(phoneInput.value);
  nextBtn.disabled = !valid;

  if (phoneInput.value.trim() === '') {
    phoneHint.textContent = '';
    phoneHint.className = 'hint';
  } else if (!valid) {
    phoneHint.textContent = message;
    phoneHint.className = 'hint error-hint';
  } else {
    phoneHint.textContent = 'Looks good!';
    phoneHint.className = 'hint success-hint';
  }
});

nextBtn.addEventListener('click', () => {
  const { valid } = validatePhone(phoneInput.value);
  if (!valid) return;

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
      phoneHint.textContent = '';
      phoneHint.className = 'hint';
      nameField.classList.add('hidden');
      nextBtn.classList.remove('hidden');
      nextBtn.disabled = true;
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
