fetch('/count')
  .then(r => r.json())
  .then(data => {
    const el = document.getElementById('poem-counter');
    if (el && data.count > 0) {
      el.textContent = `${data.count} poem${data.count === 1 ? '' : 's'} have taken flight`;
    }
  })
  .catch(() => {});

const phoneInput = document.getElementById('phone');
const nameInput = document.getElementById('name');
const nameField = document.getElementById('name-field');
const nextBtn = document.getElementById('next-btn');
const sendBtn = document.getElementById('send-btn');
const status = document.getElementById('status');
const phoneHint = document.getElementById('phone-hint');
const shareSection = document.getElementById('share-section');

const APP_URL = 'https://mechanicalbird.mariasaha.com';
const SHARE_TEXT = 'Send someone a poem by Denver Butson — it calls their phone and reads it aloud.';

document.getElementById('share-threads').href =
  `https://www.threads.net/intent/post?text=${encodeURIComponent(SHARE_TEXT + ' ' + APP_URL)}`;

document.getElementById('share-facebook').href =
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}`;

document.getElementById('share-copy').addEventListener('click', () => {
  navigator.clipboard.writeText(APP_URL).then(() => {
    const btn = document.getElementById('share-copy');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy Link', 2000);
  });
});

const COUNTRY_RULES = {
  '+1':   { min: 11, max: 11, hint: '10 digits after +1' },
  '+44':  { min: 12, max: 12, hint: '10 digits after +44' },
  '+47':  { min: 10, max: 10, hint: '8 digits after +47' },
  '+45':  { min: 10, max: 10, hint: '8 digits after +45' },
  '+34':  { min: 11, max: 11, hint: '9 digits after +34' },
  '+49':  { min: 11, max: 13, hint: '10-11 digits after +49' },
  '+353': { min: 12, max: 12, hint: '9 digits after +353' },
  '+31':  { min: 11, max: 11, hint: '9 digits after +31' },
};

function validatePhone(raw) {
  const phone = raw.trim();

  if (!phone) return { valid: false, message: '' };

  if (/[a-zA-Z]/.test(phone)) {
    return { valid: false, message: 'Phone numbers cannot contain letters.' };
  }

  if (!phone.startsWith('+')) {
    return { valid: false, message: 'Phone number must start with + and a country code (e.g. +1, +44, +47, +45).' };
  }

  const matchedCode = Object.keys(COUNTRY_RULES).find(code => phone.startsWith(code));
  if (!matchedCode) {
    return { valid: false, message: 'Unsupported country code. Supported: US (+1), UK (+44), Norway (+47), Denmark (+45), Spain (+34), Germany (+49), Ireland (+353), Netherlands (+31).' };
  }

  const digits = phone.replace(/\D/g, '');
  const rules = COUNTRY_RULES[matchedCode];

  if (digits.length < rules.min) {
    return { valid: false, message: `Number is too short — ${rules.hint}.` };
  }

  if (digits.length > rules.max) {
    return { valid: false, message: `Number is too long — ${rules.hint}.` };
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
  document.getElementById('disclaimer').classList.remove('hidden');
  sendBtn.disabled = true;
  nameInput.focus();
});

const BLOCKED_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'cock', 'piss',
  'bastard', 'asshole', 'motherfucker', 'fucker', 'damn', 'crap',
  'eff u', 'f u', 'fuk', 'fck', 'sht'
];

function containsBlockedWord(text) {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some(word => lower.includes(word));
}

function updateSendBtn() {
  const name = nameInput.value.trim();
  const hasName = name !== '';
  const hasConsent = document.getElementById('consent-checkbox').checked;
  const isClean = !containsBlockedWord(name);

  if (hasName && !isClean) {
    nameInput.style.borderColor = 'rgba(255, 100, 100, 0.7)';
  } else {
    nameInput.style.borderColor = '';
  }

  sendBtn.disabled = !(hasName && hasConsent && isClean);
}

nameInput.addEventListener('input', updateSendBtn);
document.addEventListener('change', (e) => {
  if (e.target.id === 'consent-checkbox') updateSendBtn();
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
      document.querySelector('.share-label').textContent = 'Know someone else who\'d love this?';
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

