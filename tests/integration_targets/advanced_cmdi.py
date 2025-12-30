
import os
import subprocess
import commands # Legacy but good to test
from flask import Flask, request

app = Flask(__name__)

@app.route("/cmd_1")
def test_popen_unsafe():
    # VULNERABLE: os.popen
    cmd = request.args.get('cmd')
    os.popen("ls -l " + cmd)
    return "done"

@app.route("/cmd_2")
def test_getstatusoutput_unsafe():
    # VULNERABLE: subprocess.getstatusoutput
    cmd = request.args.get('target')
    subprocess.getstatusoutput("ping " + cmd)
    return "done"

@app.route("/cmd_3")
def test_getoutput_unsafe():
    # VULNERABLE: subprocess.getoutput (files under subprocess but legacy alias)
    cmd = request.args.get('file')
    subprocess.getoutput("cat " + cmd)
    return "done"

@app.route("/cmd_4")
def test_subprocess_popen_shell_true():
    # VULNERABLE: Popen with shell=True
    user_input = request.args.get('input')
    subprocess.Popen("echo " + user_input, shell=True)
    return "done"

@app.route("/cmd_5")
def test_subprocess_popen_list_safe():
    # SAFE: Popen with list
    user_input = request.args.get('input')
    subprocess.Popen(["echo", user_input])
    return "done"
