
import re
from flask import Flask, request

app = Flask(__name__)

@app.route("/regex_1")
def test_re_compile():
    # VULNERABLE: ReDoS via compile
    pattern = request.args.get('p')
    re.compile(pattern)
    return "done"

@app.route("/regex_2")
def test_re_match():
    # VULNERABLE: match pattern
    pattern = request.args.get('p')
    re.match(pattern, "input_string")
    return "done"

@app.route("/regex_3")
def test_re_search_concat():
    # VULNERABLE: search with concatenated pattern
    user_p = request.args.get('p')
    regex = "^prefix_" + user_p
    re.search(regex, "data")
    return "done"

@app.route("/regex_4")
def test_re_findall():
    # VULNERABLE: findall
    p = request.args.get('p')
    re.findall(p, "haystack")
    return "done"

@app.route("/regex_5")
def test_re_sub():
    # VULNERABLE: sub pattern
    p = request.args.get('p')
    re.sub(p, "replacement", "input")
    return "done"
