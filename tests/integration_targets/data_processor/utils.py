import sqlite3

def run_query(query_string):
    """
    Executes a query.
    Sink: cursor.execute
    """
    conn = sqlite3.connect("data.db")
    cursor = conn.cursor()
    # Vulnerable SINK
    cursor.execute(query_string)
    return cursor.fetchall()

def sanitize(input_str):
    """
    Simple sanitization (simulated)
    """
    return input_str.replace("'", "''")

class DataHandler:
    def process(self, data):
        # Pass-through
        return run_query(data)
