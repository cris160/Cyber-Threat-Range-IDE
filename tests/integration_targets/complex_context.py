
import os
from flask import Flask, request

app = Flask(__name__)

@app.route("/ctx_1")
def test_list_comp():
    # VULNERABLE: List comp
    data = [request.args.get('i') for _ in range(3)]
    os.system("echo " + data[0])
    return "done"

@app.route("/ctx_2")
def test_dict_comp():
    # VULNERABLE: Dict comp values
    data = {i: request.args.get('i') for i in range(3)}
    os.system("echo " + data[0])
    return "done"

@app.route("/ctx_3")
def test_lambda_taint():
    # VULNERABLE: Lambda
    func = lambda x: "echo " + x
    cmd = func(request.args.get('cmd'))
    os.system(cmd)
    return "done"

@app.route("/ctx_4")
def test_closure_taint():
    # VULNERABLE: Closure
    val = request.args.get('v')
    def inner():
        return "ls " + val
    os.system(inner())
    return "done"

@app.route("/ctx_5")
def test_map_taint():
    # VULNERABLE: map
    # This might be hard for static analysis without specialized support
    data = list(map(lambda x: "echo " + x, [request.args.get('v')]))
    os.system(data[0])
    return "done"

@app.route("/ctx_6")
def test_class_attr_flow():
    # VULNERABLE: Class attr
    class Holder:
        def __init__(self, v):
            self.v = v
    h = Holder(request.args.get('v'))
    os.system("cat " + h.v)
    return "done"

@app.route("/ctx_7")
def test_nested_list():
    # VULNERABLE: Nested list
    data = [[request.args.get('v')]]
    os.system("echo " + data[0][0])
    return "done"

@app.route("/ctx_8")
def test_fstring_complex():
    # VULNERABLE: f-string with methods
    v = request.args.get('v')
    cmd = f"echo {v.upper()}"
    os.system(cmd)
    return "done"

@app.route("/ctx_9")
def test_import_alias():
    # VULNERABLE: os alias
    import os as system_ops
    system_ops.system("ls " + request.args.get('v'))
    return "done"

@app.route("/ctx_10")
def test_return_tuple():
    # VULNERABLE: Return tuple
    def get_vals():
        return (request.args.get('a'), "safe")
    x, y = get_vals()
    os.system("echo " + x)
    return "done"
