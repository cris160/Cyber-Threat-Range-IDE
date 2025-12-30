from flask import Flask, request
from utils import run_query, DataHandler

app = Flask(__name__)

@app.route('/process')
def process_data():
    # Entry Point
    user_data = request.args.get('data')
    
    # Path 1: Direct cross-file call
    # utils.run_query is vulnerable
    run_query(f"INSERT INTO logs VALUES ('{user_data}')")
    
    return "Processed"

@app.route('/handler')
def handler_data():
    # Entry Point
    input_val = request.args.get('val')
    
    # Path 2: Class method cross-file
    handler = DataHandler()
    handler.process(f"SELECT * FROM items WHERE name = '{input_val}'")
    
    return "Handled"

if __name__ == '__main__':
    app.run()
