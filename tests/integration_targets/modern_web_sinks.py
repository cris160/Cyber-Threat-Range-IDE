
import requests
import urllib.request
import urllib3
from flask import Flask, request
import lxml.etree as etree

app = Flask(__name__)

@app.route("/ssrf_1")
def test_requests_get():
    # VULNERABLE: SSRF via requests
    url = request.args.get('url')
    requests.get(url)
    return "done"

@app.route("/ssrf_2")
def test_urllib_urlopen():
    # VULNERABLE: SSRF via urllib
    target = request.args.get('target')
    urllib.request.urlopen(target)
    return "done"

@app.route("/xxe_1")
def test_lxml_parse():
    # VULNERABLE: XXE if external entities allowed (default in some older libs)
    xml_data = request.args.get('xml')
    parser = etree.XMLParser(resolve_entities=True) # Explicitly dangerous
    etree.fromstring(xml_data, parser=parser)
    return "done"

@app.route("/header_injection")
def test_header_injection():
    # VULNERABLE: Splitting in headers
    val = request.args.get('val')
    # Assuming custom header setter that is unsafe
    # This might be hard to generic sink unless we define response.headers as sink
    pass 
