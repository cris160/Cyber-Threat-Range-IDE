
import os
from flask import Flask, request, send_file

app = Flask(__name__)

@app.route("/path_1")
def test_open_read():
    # VULNERABLE: open() with user input
    filename = request.args.get('file')
    with open(filename, 'r') as f:
        data = f.read()
    return data

@app.route("/path_2")
def test_path_join():
    # VULNERABLE: os.path.join with absolute path override
    base = "/var/www/uploads"
    user_path = request.args.get('path')
    # If user_path is "/etc/passwd", it ignores base
    full_path = os.path.join(base, user_path)
    with open(full_path, 'r') as f:
        return f.read()

@app.route("/path_3")
def test_send_file():
    # VULNERABLE: flask send_file
    f = request.args.get('f')
    return send_file(f)

@app.route("/path_4")
def test_remove_file():
    # VULNERABLE: os.remove
    f = request.args.get('del')
    os.remove(f)
    return "deleted"

@app.route("/path_5")
def test_safe_basename():
    # SAFE: os.path.basename used
    f = request.args.get('f')
    safe_f = os.path.basename(f)
    path = os.path.join("uploads", safe_f)
    with open(path, 'r') as f:
        return f.read()
