import sqlite3
from flask import Flask, request, jsonify

app = Flask(__name__)

class DatabaseManager:
    def __init__(self, db_name="store.db"):
        self.db_name = db_name

    def get_connection(self):
        return sqlite3.connect(self.db_name)

    def query_products(self, search_term, category):
        """
        VULNERABLE: Uses f-string for query construction without sanitization.
        Complex because it passes through object methods.
        """
        # Complex logic to build query
        base_query = "SELECT * FROM products WHERE 1=1"
        
        if category:
            # Safe parameterized query part
            pass 
        
        # Vulnerable part
        final_query = f"{base_query} AND name LIKE '%{search_term}%'"
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Sink!
            cursor.execute(final_query)
            return cursor.fetchall()

    def get_user_orders(self, user_id):
        """
        SAFE: Uses parameterized query.
        Should NOT be detected as vulnerable.
        """
        query = "SELECT * FROM orders WHERE user_id = ?"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, (user_id,))
            return cursor.fetchall()

db_manager = DatabaseManager()

@app.route('/api/products/search', methods=['GET'])
def search_products():
    # Entry Point 1
    query = request.args.get('q')
    category = request.args.get('category')
    
    if not query:
        return jsonify({"error": "No query provided"}), 400
        
    # Flow: query -> search_term -> final_query -> execute
    results = db_manager.query_products(query, category)
    return jsonify(results)

@app.route('/api/orders/<user_id>', methods=['GET'])
def get_orders(user_id):
    # Entry Point 2
    # This path is SAFE
    results = db_manager.get_user_orders(user_id)
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)
