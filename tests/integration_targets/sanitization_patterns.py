from flask import Flask, request
import os
import shlex
import subprocess

app = Flask(__name__)

def type_conversion_safe(val):
    # Converting to int makes it safe
    try:
        return int(val)
    except:
        return 0

@app.route('/fp/shlex')
def test_shlex():
    user_input = request.args.get('input')
    # shlex.quote is safe
    safe_input = shlex.quote(user_input)
    os.system(f"echo {safe_input}")
    return "Safe"

@app.route('/fp/int_cast')
def test_int_cast():
    user_input = request.args.get('id')
    # Integer cast is safe
    safe_id = type_conversion_safe(user_input)
    os.system(f"ping -c 1 192.168.1.{safe_id}")
    return "Safe"

@app.route('/fp/whitelist')
def test_whitelist():
    user_input = request.args.get('cmd')
    allowed = ["ls", "whoami", "date"]
    
    if user_input in allowed:
        # Whitelist makes it safe
        os.system(user_input)
        return "Executed"
    return "Denied"

@app.route('/fp/hardcoded')
def test_hardcoded():
    # Ignore unused input
    user_input = request.args.get('unused')
    cmd = "echo 'Hello World'"
    os.system(cmd)
    return "Safe"
