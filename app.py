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

# Rate limiter: max 5 poems per IP per day
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],
    storage_uri='memory://'
)

TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')
BASE_URL = os.environ.get('BASE_URL')

ALLOWED_COUNTRIES = {'US', 'NO', 'DK', 'GB'}
COUNTRY_NAMES = {
    'US': 'United States',
    'NO': 'Norway',
    'DK': 'Denmark',
    'GB': 'United Kingdom',
}

# Tracks when each destination number last received a poem
recent_calls = {}


def clean_old_calls():
    cutoff = datetime.now() - timedelta(hours=24)
    expired = [num for num, t in list(recent_calls.items()) if t < cutoff]
    for num in expired:
        del recent_calls[num]


def destination_recently_called(phone_number):
    clean_old_calls()
    if phone_number in recent_calls:
        return datetime.now() - recent_calls[phone_number] < timedelta(hours=24)
    return False


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
@limiter.limit('5 per day', error_message='You have sent 5 poems today. Please come back tomorrow!')
def send_poem():
    data = request.get_json()
    phone_number = data.get('phone_number', '').strip()
    sender_name = data.get('sender_name', '').strip()

    if not phone_number or not sender_name:
        return jsonify({'error': 'Phone number and name are required.'}), 400

    e164_number, error = validate_phone(phone_number)
    if error:
        return jsonify({'error': error}), 400

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
                    f"Pick up the call from {TWILIO_PHONE_NUMBER} — a poem is on its way!"
                )
            )
        except Exception:
            pass
        client.calls.create(
            to=e164_number,
            from_=TWILIO_PHONE_NUMBER,
            url=twiml_url,
            machine_detection='DetectMessageEnd'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    recent_calls[e164_number] = datetime.now()
    return jsonify({'success': True})


@app.errorhandler(429)
def rate_limit_exceeded(e):
    return jsonify({'error': str(e.description)}), 429


@app.route('/twiml', methods=['GET', 'POST'])
def twiml():
    sender_name = request.args.get('name', 'someone')
    poem_filename = request.args.get('poem', '')
    poem_url = f"{BASE_URL}/static/poems/{quote(poem_filename)}"

    response = VoiceResponse()
    response.say(f"Hello, you have a poem from {sender_name}.", voice='alice')
    response.pause(length=1)
    response.play(poem_url)

    return str(response), 200, {'Content-Type': 'text/xml'}


if __name__ == '__main__':
    app.run(debug=True)
