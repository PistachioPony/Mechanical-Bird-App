# How Mechanical Bird Works
*A plain-English guide to the code behind mechanicalbird.mariasaha.com*

---

## The Big Picture

When someone visits your site and sends a poem, here's what happens in order:

1. They type a phone number into the browser
2. The browser checks if the number looks valid (JavaScript)
3. They type their name and check the consent box
4. They click "Send Poem"
5. The browser sends the phone number and name to your Flask app running on Railway
6. Flask asks Twilio to make a phone call
7. Twilio calls the recipient's phone
8. When they pick up, Twilio asks your app "what should I say?"
9. Your app sends back a script (called TwiML) with Joanna's intro and the poem MP3
10. Twilio reads the intro and plays the poem
11. Supabase records the send, and the counter on your homepage goes up by 1

Every single one of those steps is code we wrote together. Let's go through each piece.

---

## The Files

```
Mechanical Bird App/
├── app.py                  ← The brain (Flask backend)
├── requirements.txt        ← List of Python packages needed
├── HOW_IT_WORKS.md         ← This document
├── templates/
│   └── index.html          ← The webpage people see
├── static/
│   ├── css/style.css       ← How the page looks
│   ├── js/main.js          ← How the page behaves
│   └── poems/              ← 30 MP3s by Denver Butson
```

---

## The Page Layout (top to bottom)

Here's the order of everything on the page as of May 2026:

1. **Mechanical Bird** — the title (h1)
2. **Send someone a Denver Butson poem.** — subtitle
3. **X poems have taken flight** — live counter from Supabase, number in yellow
4. **Form** — phone field → Continue → name field + checkbox + Send button
5. **Help** — collapsible troubleshooting section (includes spam warning, country codes, tips)
6. **Share this app** — Threads, Facebook, Copy Link buttons
7. **About / News** — exclusive accordion (only one open at a time, content spans full width)
8. **Buy me a coffee** — Ko-fi tip button
9. **Get in touch** — email and Instagram links
10. **Privacy note** — phone numbers are never stored permanently

---

## Part 1: The Webpage (index.html)

HTML is the skeleton of a webpage — it describes what's on the page but not how it looks or behaves. Think of it like a script for a play: it lists the characters and their lines, but doesn't describe the costumes or the blocking.

### The Form

```html
<input type="tel" id="phone" placeholder="+1 555 000 0000" autocomplete="off" />
```

This creates the phone number input box.
- `type="tel"` tells the browser it's a telephone number (on mobile, this opens the number keypad)
- `id="phone"` gives it a name so JavaScript can find it
- `autocomplete="off"` prevents the browser from remembering and pre-filling values when the page refreshes — we also clear the fields with JavaScript on every page load for the same reason

### The Short Hint

```html
<span class="hint" id="phone-hint">Include your country code. See Help for supported countries.</span>
```

This hint starts with that short message, but JavaScript replaces it dynamically as the user types — showing specific error messages ("Number is too short") or "Looks good!" when the number is valid.

### The Hidden Name Field

```html
<div class="field hidden" id="name-field">
```

Notice `class="hidden"` — this field starts invisible. The CSS has a rule that says anything with the class `hidden` has `display: none`, which means the browser doesn't show it at all. When you click Continue, JavaScript removes the `hidden` class and it appears. This is a very common pattern in web development.

### The Disclaimer Checkbox

```html
<input type="checkbox" id="consent-checkbox" />
I can confirm that the recipient will be happy to receive this call.
```

The Send button won't activate until this is checked. JavaScript watches for changes to this checkbox and only unlocks the button when both the name field is filled AND the box is ticked.

### The Counter

```html
<p class="counter" id="poem-counter"></p>
```

This starts completely empty. When the page loads, JavaScript fetches the count from your Supabase database and fills it in with "X poems have taken flight." The number itself is wrapped in a yellow span so only the number glows.

### The Help Section

```html
<details class="help">
  <summary class="help-toggle">Help</summary>
  ...
</details>
```

`<details>` and `<summary>` are native HTML elements that create a collapsible section — no JavaScript needed. Clicking the summary toggles the content open and closed automatically. The Help section contains: the spam risk warning with the Twilio number, the country code list, the daily send limits, hard refresh instructions, voicemail note, and contact email.

### The About/News Accordion

```html
<button class="section-toggle" data-target="about-content">About</button>
<button class="section-toggle" data-target="news-content">News</button>
```

`data-target` is a custom attribute we invented. It tells JavaScript which content panel to show when this button is clicked. The JavaScript reads `btn.dataset.target` to get the value `"about-content"` or `"news-content"`, then finds the element with that ID and shows it. Only one can be open at a time — opening one automatically closes the other.

---

## Part 2: The Styles (style.css)

CSS is what makes the page look good. Every visual decision — colors, fonts, spacing, layout — lives here.

### The Background

```css
body {
  background: url('/static/leonid.webp') center center / cover no-repeat fixed;
  align-items: flex-start;
  padding: 2rem 1rem;
}
```

`cover` means "scale the image until it fills the entire screen, even if some gets cropped." `fixed` means the image stays still when you scroll — the content scrolls over it like a window. `align-items: flex-start` and padding ensure the page is scrollable on mobile — earlier it used `align-items: center` which cut off content below the fold on small screens.

### The Dark Container

```css
.container {
  background: rgba(0, 0, 0, 0.6);
  border-radius: 12px;
}
```

`rgba` stands for Red, Green, Blue, Alpha. Alpha is transparency — 0 is fully transparent, 1 is fully opaque. So `rgba(0, 0, 0, 0.6)` is black at 60% opacity, which creates that dark frosted glass panel over the background image.

### The Yellow Accent (#FBE11B)

```css
.section-toggle {
  color: #FBE11B;
}
```

`#FBE11B` is a hex color code. Hex codes describe colors using six characters — the first two are red, the middle two are green, the last two are blue, all on a scale from 00 (none) to FF (full). `#FBE11B` is very high red and green (which together make yellow) with a little blue — giving that warm golden yellow that matches the comets in the Leonid meteor shower background image. It's used on: About/News toggles, the Share label, and the number in the poem counter.

### The Hidden Class

```css
.hidden {
  display: none;
}
```

This single rule is used all over the app. `display: none` removes an element from the page completely — it doesn't just become invisible, it takes up no space either. JavaScript adds and removes this class constantly to show and hide things.

### Specificity Fix

```css
.section-content.hidden {
  display: none;
}
```

This was a bug fix. `.section-content` uses `display: flex`, and when both `.section-content` and `.hidden` classes are on the same element, the browser has to decide which `display` value wins. CSS gives priority to whichever rule appears later in the file — `.section-content` came after `.hidden`, so `display: flex` was winning and the accordion couldn't close. Adding `.section-content.hidden` (which targets both classes together) has higher specificity than either alone, so it always wins.

---

## Part 3: The Behavior (main.js)

JavaScript makes the page interactive. While HTML describes *what's there* and CSS describes *how it looks*, JavaScript describes *what happens* when you do things.

### Clearing on Refresh

```javascript
window.addEventListener('load', () => {
  phoneInput.value = '';
  nameInput.value = '';
});
```

Some browsers (especially Safari on iOS) remember form values across refreshes. This clears both fields every time the page loads so users always start fresh.

### Fetching the Counter

```javascript
fetch('/count')
  .then(r => r.json())
  .then(data => {
    if (el && data.count > 0) {
      el.innerHTML = `<span style="color:#FBE11B">${data.count}</span> poem${data.count === 1 ? '' : 's'} have taken flight`;
    }
  });
```

`fetch` is JavaScript's way of making a request to a server — like a browser loading a page, but done silently in the background. Here it asks your Flask app for `/count`, gets back a number, and if it's greater than 0, writes it into the counter paragraph. The backtick syntax (`` ` ``) is called a template literal — the `${data.count}` part gets replaced with the actual number. The `count === 1 ? '' : 's'` part handles grammar correctly (1 poem vs. 2 poems).

### Phone Validation

```javascript
const COUNTRY_RULES = {
  '+1':   { min: 11, max: 11, hint: '10 digits after +1' },
  '+44':  { min: 12, max: 12, hint: '10 digits after +44' },
  // ...etc
};
```

Rather than asking Twilio to make a call and fail, we check the number right in the browser first. Each country code has rules about how long a valid number should be (counting all digits including the country code). If the number is too short or too long, we show a friendly error immediately — no server involved.

### The Send Button Logic

```javascript
function updateSendBtn() {
  const hasName = nameInput.value.trim() !== '';
  const hasConsent = document.getElementById('consent-checkbox').checked;
  const isClean = !containsBlockedWord(name);

  sendBtn.disabled = !(hasName && hasConsent && isClean);
}
```

`disabled` is a property of buttons. When it's `true`, the button is greyed out and unclickable. This function runs every time the name field changes or the checkbox is toggled, and it sets `disabled` based on three conditions that all need to be true. The `!` means "not" — so `!(true && true && true)` becomes `!(true)` becomes `false`, meaning the button is NOT disabled (i.e., it's active).

### The Profanity Filter

```javascript
const BLOCKED_WORDS = ['fuck', 'shit', 'ass', ...];

function containsBlockedWord(text) {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some(word => lower.includes(word));
}
```

This runs on the name field in real time. If a blocked word is detected, the input border turns red and the Send button stays disabled. The same check also runs on the server in Python — this is intentional. JavaScript can be bypassed by a technical user, so we never rely on it alone for anything that matters.

### The Accordion

```javascript
document.querySelectorAll('.section-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const isOpen = !document.getElementById(targetId).classList.contains('hidden');

    document.querySelectorAll('.section-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.section-toggle').forEach(b => b.classList.remove('active'));

    if (!isOpen) {
      document.getElementById(targetId).classList.remove('hidden');
      btn.classList.add('active');
    }
  });
});
```

`querySelectorAll` finds all elements matching a CSS selector. `addEventListener('click', ...)` says "when this is clicked, run this function." The logic: first check if the clicked panel is already open, then close everything, then (only if it was closed before) open it. This way clicking an open panel closes it, and opening one panel automatically closes the other.

---

## Part 4: The Flask App (app.py)

Flask is a Python web framework. A "framework" is a set of tools that handles the boring parts (like listening for incoming requests) so you can focus on your app's logic.

### Routes

```python
@app.route('/')
def index():
    return render_template('index.html')
```

A "route" is a URL path. The `@app.route('/')` decorator says "when someone visits the homepage, run this function." `render_template` finds `index.html` in the templates folder and sends it to the browser.

Your app has four routes:
- `/` — serves the homepage
- `/send` — receives the form data and places the Twilio call
- `/twiml` — Twilio calls this when someone picks up, to get the script
- `/count` — returns the poem send count from Supabase

### Phone Validation (Server Side)

```python
def validate_phone(raw_number):
    parsed = phonenumbers.parse(raw_number, None)
    if not phonenumbers.is_valid_number(parsed):
        return None, "That doesn't look like a valid phone number."
    country = phonenumbers.region_code_for_number(parsed)
    if country not in ALLOWED_COUNTRIES:
        return None, f"Sorry, we currently only support calls to: {allowed}."
    e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    return e164, None
```

We validate the number twice — once in JavaScript (fast, before anything is sent) and once here in Python (safe, because JavaScript can be bypassed). The `phonenumbers` library is a Python package that knows the rules for every country's phone system. E164 format is the international standard: `+16467292195` — no spaces, dashes, or parentheses.

### Rate Limiting

```python
recent_calls = {}   # {phone_number: last_call_datetime}
ip_call_log = {}    # {ip_address: [call_datetime, ...]}
```

These two Python dictionaries live in your server's memory while the app is running. `recent_calls` tracks when each destination number last received a poem, so no number gets called more than once per day. `ip_call_log` tracks how many poems each IP address has sent, capping it at 5 per day. Whitelisted numbers (yours and Denver's) bypass these checks entirely — useful for testing.

### Placing the Call

```python
client.calls.create(
    to=e164_number,
    from_=TWILIO_PHONE_NUMBER,
    url=twiml_url,
)
```

This is the moment where your app talks to Twilio's API. `url=twiml_url` is key — it tells Twilio "when the call connects, fetch instructions from this URL." That URL points back to your own `/twiml` route. We removed `machine_detection='Enable'` because it caused a 3-5 second delay before Joanna started speaking — now there's just a clean 2-second pause at the start of every call.

### The TwiML Route

```python
@app.route('/twiml', methods=['GET', 'POST'])
def twiml():
    sender_name = request.args.get('name', 'someone')
    poem_filename = request.args.get('poem', '')

    response = VoiceResponse()
    response.pause(length=2)
    response.say(f"Hello! You are receiving a poem by Denver Butson from your friend {sender_name}, read by Denver Butson himself.", voice='Polly.Joanna-Neural')
    response.pause(length=1)
    response.play(poem_url)
    response.pause(length=1)
    response.say("To send a Denver Butson poem to someone, visit mechanical bird dot maria saha dot com.", voice='Polly.Joanna-Neural')

    return str(response), 200, {'Content-Type': 'text/xml'}
```

TwiML is Twilio's scripting language for phone calls — it's written in XML (a structured text format). The `VoiceResponse` object builds that XML for you. `response.say()` uses Amazon Polly's Joanna Neural voice (a very realistic AI voice) to speak text. `response.play()` plays an MP3 file. `response.pause()` adds silence. The `methods=['GET', 'POST']` part is important — Twilio sends a POST request when a call connects, and without it the route would fail with an error. This was one of our early bugs.

---

## Part 5: Supabase (The Database)

Supabase is a cloud database service. Your app uses it to store a running count of how many poems have been sent — this number survives server restarts, which in-memory variables don't.

### The Table

```sql
CREATE TABLE sends (
  id SERIAL PRIMARY KEY,
  sent_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE sends DISABLE ROW LEVEL SECURITY;
```

SQL is the language used to talk to databases. This creates a table called `sends` with two columns: `id` (a number that auto-increments with each row) and `sent_at` (a timestamp that automatically records the current time). The second line disables Row Level Security — Supabase turns this on by default, which blocked our inserts until we disabled it.

### Recording a Send

```python
supabase_client.table('sends').insert({}).execute()
```

This adds a new row to the `sends` table. We insert an empty object `{}` because both columns fill themselves in automatically — `id` increments on its own, and `sent_at` defaults to the current time.

### Counting Sends

```python
result = supabase_client.table('sends').select('id', count='exact').execute()
return jsonify({'count': result.count or 0})
```

`count='exact'` asks Supabase to count the rows rather than return them all. `jsonify` converts the Python dictionary into JSON — the standard format for sending data between a server and a browser. The browser's `fetch('/count')` receives this JSON and reads `data.count`.

---

## Part 6: Environment Variables

You'll notice that nowhere in the code is there a password or API key written directly. Instead you see things like:

```python
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
```

`os.environ` is a dictionary of "environment variables" — key/value pairs that are set outside the code, in the operating system or (in your case) in Railway's Variables tab. This keeps secrets out of GitHub, where anyone could read them. If someone cloned your repo, they'd get all the code but none of the keys — the app simply wouldn't work without them.

Your app needs these variables set in Railway:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `WHITELISTED_NUMBERS` (comma-separated: +13475632424,+16466440829)

---

## Part 7: Deployment

**GitHub** stores your code. Every time we run `git push origin main`, all your changes are uploaded there. The repo is at: github.com/PistachioPony/Mechanical-Bird-App

**Railway** watches your GitHub repo. When it sees new code, it automatically:
1. Downloads your code
2. Reads `requirements.txt` and installs the Python packages
3. Starts your Flask app with `gunicorn` (a production-grade server)
4. Makes it available at your custom domain

**Gunicorn** is the production web server that runs your Flask app. Flask's built-in server is fine for testing on your own computer, but Gunicorn handles multiple visitors at once and is much more reliable for a live site.

**DNS** (Domain Name System) is like a phone book for the internet. When someone types `mechanicalbird.mariasaha.com`, their browser asks a DNS server "what's the IP address for this domain?" Your Namecheap DNS settings point that domain name to Railway's servers, which then serve your app.

---

## Bugs We Fixed Along the Way

These are worth knowing — they're common problems in web development.

| Bug | Cause | Fix |
|---|---|---|
| "An application error has occurred" on every call | `/twiml` only accepted GET requests; Twilio sends POST | Added `methods=['GET', 'POST']` |
| 3-5 second silence before Joanna spoke | Twilio machine detection delay | Removed `machine_detection='Enable'`, added 2s pause instead |
| About/News accordion stuck open | `.section-content` had `display:flex` which overrode `.hidden`'s `display:none` | Added `.section-content.hidden { display:none }` |
| Poem counter always showed 0 | Wrong Supabase key (used publishable key instead of anon JWT) | Replaced with correct `eyJ...` anon key |
| Counter showed 0 even with correct key | Supabase Row Level Security blocked inserts | Disabled RLS on the `sends` table |
| Mobile content cut off below fold | `align-items: center` on body caused overflow | Changed to `align-items: flex-start` with padding |
| Phone number wrong color in notice | Span had `color: #f0ebe0` while surrounding text was `#bbb` | Set span to `color: inherit` |

---

## Things You Can Change Yourself

Now that you understand the structure, here are things you can edit without breaking anything:

- **Joanna's intro/outro text** → `app.py`, in the `twiml()` function
- **Help section content** → `index.html`, inside `<details class="help">`
- **News section content** → `index.html`, inside `id="news-content"`
- **Contact links** → `index.html`, in the `<div class="contact">` section
- **Colors** → `style.css` (search for the hex code you want to change)
- **Ko-fi link** → `index.html`, the `href` on the tip button

## Coming Soon

- **News section powered by Supabase** — so you can post Denver's readings and book releases directly from the Supabase dashboard without touching code
- **Twilio Business Profile** — once approved, calls will stop being flagged as spam and SMS will work
- **Follow-up SMS** after the call with the app URL

---

*This document was last updated May 2026.*
*Code by Maria Saha and Claude. Poems by Denver Butson.*
