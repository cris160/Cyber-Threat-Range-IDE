import pickle
import yaml
import marshal
from flask import Flask, request
import base64

app = Flask(__name__)

class UserSession:
    def __init__(self, username, role):
        self.username = username
        self.role = role

@app.route('/session/restore', methods=['POST'])
def restore_session():
    # Entry Point
    cookie_data = request.cookies.get('session_data')
    
    # VULNERABLE: pickle.loads
    # Decodes user input and deserializes it
    try:
        decoded = base64.b64decode(cookie_data)
        session_obj = pickle.loads(decoded) # SINK
        return f"Welcome back {session_obj.username}"
    except:
        return "Invalid session"

@app.route('/config/upload', methods=['POST'])
def upload_config():
    # Entry Point
    config_file = request.files['config']
    content = config_file.read()
    
    # VULNERABLE: yaml.load (unsafe in PyYAML < 6.0 without Loader)
    # Testing detection of yaml.load
    data = yaml.load(content) # SINK
    return f"Config loaded: {data}"

@app.route('/internal/cache')
def read_marshal():
    # Entry Point
    raw_data = request.args.get('cache')
    
    # VULNERABLE: marshal.loads
    # Less common but critical
    data = marshal.loads(raw_data.encode('latin1')) # SINK
    return "Cache loaded"

if __name__ == '__main__':
    app.run()
