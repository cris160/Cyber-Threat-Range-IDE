
import os
from flask import Flask, request

app = Flask(__name__)

@app.route("/flow_1")
def test_list_access():
    # VULNERABLE: Taint via list index
    data = [request.args.get('a'), "safe"]
    cmd = "echo " + data[0]
    os.system(cmd)
    return "done"

@app.route("/flow_2")
def test_dict_access():
    # VULNERABLE: Taint via dict key
    payload = request.args.get('p')
    data = {"key": payload}
    os.system("echo " + data["key"])
    return "done"

@app.route("/flow_3")
def test_if_branch_taint():
    # VULNERABLE: both branches taint, or one does
    val = request.args.get('val')
    mode = "debug"
    if mode == "debug":
        cmd = "echo " + val
    else:
        cmd = "echo safe"
    
    # In static analysis, if any path is tainted, it's potentially vulnerable
    os.system(cmd)
    return "done"

@app.route("/flow_4")
def test_try_except_taint():
    # VULNERABLE: try block taints
    try:
        data = request.args.get('data')
        os.system("ls " + data)
    except:
        pass
    return "done"

@app.route("/flow_5")
def test_tuple_unpacking():
    # VULNERABLE: Unpacking
    tup = (request.args.get('x'), "y")
    a, b = tup
    os.system("touch " + a)
    return "done"
