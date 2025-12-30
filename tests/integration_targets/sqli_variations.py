
import sqlite3
from flask import Flask, request

app = Flask(__name__)
db = sqlite3.connect("test.db")

@app.route("/sqli_1")
def test_executemany_unsafe():
    # VULNERABLE: executemany with string formatting
    users_data = [(request.args.get('id'), "admin")]
    cursor = db.cursor()
    # While executemany is for bulk, if the query itself is formatted string, it's unsafe.
    query = "INSERT INTO logs VALUES ('{}', ?)".format(users_data[0][0])
    cursor.executemany(query, users_data) 
    return "done"

@app.route("/sqli_2")
def test_format_function():
    # VULNERABLE: .format()
    uid = request.args.get('uid')
    query = "SELECT * FROM users WHERE id = {}".format(uid)
    cursor = db.cursor()
    cursor.execute(query)
    return "done"

@app.route("/sqli_3")
def test_percent_formatting():
    # VULNERABLE: % formatting
    name = request.args.get('name')
    query = "SELECT * FROM users WHERE name = '%s'" % name
    cursor = db.cursor()
    cursor.execute(query)
    return "done"

@app.route("/sqli_4")
def test_string_concatenation():
    # VULNERABLE: + operator
    cat = request.args.get('category')
    query = "SELECT * FROM items WHERE category = '" + cat + "'"
    cursor = db.cursor()
    cursor.execute(query)
    return "done"

@app.route("/sqli_5")
def test_aug_assign_concat():
    # VULNERABLE: += operator
    search = request.args.get('q')
    query = "SELECT * FROM items WHERE name LIKE '%"
    query += search
    query += "%'"
    cursor = db.cursor()
    cursor.execute(query)
    return "done"
