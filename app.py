import os
import random
from datetime import datetime, timedelta
from urllib.parse import quote
import phonenumbers
from phonenumbers import NumberParseException
from flask import Flask, render_template, request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

limiter = Limiter(get_remote_address, app=app, default_limits=[], storage_uri='memory://')

TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')
BASE_URL = os.environ.get('BASE_URL')

# Comma-separated list of numbers that bypass rate limits (for testing)
WHITELISTED_NUMBERS = set(
    n.strip() for n in os.environ.get('WHITELISTED_NUMBERS', '').split(',') if n.strip()
)

BLOCKED_WORDS = [
    'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'cock', 'piss',
    'bastard', 'asshole', 'motherfucker', 'fucker', 'damn', 'crap',
    'eff u', 'f u', 'fuk', 'fck', 'sht'
]

ALLOWED_COUNTRIES = {'US', 'NO', 'DK', 'GB'}
COUNTRY_NAMES = {
    'US': 'United States',
    'NO': 'Norway',
    'DK': 'Denmark',
    'GB': 'United Kingdom',
}

# {phone_number: last_call_datetime}
recent_calls = {}

# {ip_address: [call_datetime, ...]}
ip_call_log = {}


def clean_old_entries():
    cutoff = datetime.now() - timedelta(hours=24)
    for num in list(recent_calls):
        if recent_calls[num] < cutoff:
            del recent_calls[num]
    for ip in list(ip_call_log):
        ip_call_log[ip] = [t for t in ip_call_log[ip] if t > cutoff]
        if not ip_call_log[ip]:
            del ip_call_log[ip]


def destination_recently_called(phone_number):
    clean_old_entries()
    if phone_number in recent_calls:
        return datetime.now() - recent_calls[phone_number] < timedelta(hours=24)
    return False


def ip_over_limit(ip, limit=5):
    calls = ip_call_log.get(ip, [])
    cutoff = datetime.now() - timedelta(hours=24)
    recent = [t for t in calls if t > cutoff]
    return len(recent) >= limit


def record_send(phone_number, ip):
    recent_calls[phone_number] = datetime.now()
    ip_call_log.setdefault(ip, []).append(datetime.now())


def validate_phone(raw_number):
    try:
        parsed = phonenumbers.parse(raw_number, None)
    except NumberParseException:
        return None, (
            "Please enter a valid phone number with country code "
            "(e.g. +1 for US, +44 for UK, +47 for Norway, +45 for Denmark)."
        )

    if not phonenumbers.is_valid_number(parsed):
        return None, "That doesn't look like a valid phone number. Please check and try again."

    country = phonenumbers.region_code_for_number(parsed)
    if country not in ALLOWED_COUNTRIES:
        allowed = ', '.join(COUNTRY_NAMES.values())
        return None, f"Sorry, we currently only support calls to: {allowed}."

    e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    return e164, None


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/send', methods=['POST'])
def send_poem():
    data = request.get_json()
    phone_number = data.get('phone_number', '').strip()
    sender_name = data.get('sender_name', '').strip()

    if not phone_number or not sender_name:
        return jsonify({'error': 'Phone number and name are required.'}), 400

    if any(word in sender_name.lower() for word in BLOCKED_WORDS):
        return jsonify({'error': 'Please enter a appropriate name.'}), 400

    e164_number, error = validate_phone(phone_number)
    if error:
        return jsonify({'error': error}), 400

    whitelisted = e164_number in WHITELISTED_NUMBERS

    if not whitelisted:
        ip = get_remote_address()
        if ip_over_limit(ip):
            return jsonify({'error': 'You have sent 5 poems today. Please come back tomorrow!'}), 429
        if destination_recently_called(e164_number):
            return jsonify({'error': 'This number has already received a poem today. Please try again tomorrow!'}), 429

    poems_dir = os.path.join(app.static_folder, 'poems')
    poems = [f for f in os.listdir(poems_dir) if f.endswith('.mp3')]
    if not poems:
        return jsonify({'error': 'No poems available.'}), 500

    poem = random.choice(poems)
    twiml_url = (
        f"{BASE_URL}/twiml"
        f"?name={quote(sender_name)}"
        f"&poem={quote(poem)}"
    )

    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        try:
            client.messages.create(
                to=e164_number,
                from_=TWILIO_PHONE_NUMBER,
                body=(
                    f"{sender_name} is sending you a poem by Denver Butson. "
                    f"Pick up the call from {TWILIO_PHONE_NUMBER} — a poem is on its way! "
                    f"To send a Denver Butson poem to someone, visit mechanicalbird.mariasaha.com"
                )
            )
        except Exception:
            pass
        client.calls.create(
            to=e164_number,
            from_=TWILIO_PHONE_NUMBER,
            url=twiml_url
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    if not whitelisted:
        record_send(e164_number, get_remote_address())

    return jsonify({'success': True})


@app.route('/twiml', methods=['GET', 'POST'])
def twiml():
    sender_name = request.args.get('name', 'someone')
    poem_filename = request.args.get('poem', '')
    poem_url = f"{BASE_URL}/static/poems/{quote(poem_filename)}"

    response = VoiceResponse()
    response.say(f"Hello! You are receiving a poem from your friend {sender_name}, read by Denver Butson himself.", voice='Polly.Emma-Neural')
    response.pause(length=1)
    response.play(poem_url)
    response.pause(length=1)
    response.say("To send a Denver Butson poem to someone, visit mechanical bird dot maria saha dot com.", voice='Polly.Emma-Neural')

    return str(response), 200, {'Content-Type': 'text/xml'}


if __name__ == '__main__':
    app.run(debug=True)
