from flask import Flask, request
import os

app = Flask(__name__)

def recursive_taint(data, depth):
    """
    Complex flow: Taint passed through recursion.
    """
    if depth <= 0:
        return data
    # Modifying data in recursion
    return recursive_taint(f"wrap_({data})", depth - 1)

def loop_based_sanitization(data):
    """
    Safe: Sanitizes in a loop (simulated).
    Prover must understand that 'clean' variable is what is returned.
    """
    clean = ""
    for char in data:
        if char.isalnum():
            clean += char
    return clean

def loop_taint_accumulation(data):
    """
    Vulnerable: Taint accumulates in loop.
    """
    parts = []
    for i in range(3):
        parts.append(data) # Taint reuse
    
    # Returning joined tainted data
    return "".join(parts)

@app.route('/complex/recursion')
def test_recursion():
    # Entry Point
    user_input = request.args.get('input')
    
    # Flow: recurses 5 times, still tainted
    result = recursive_taint(user_input, 5)
    
    # SINK: Vulnerable
    os.system(f"echo {result}")
    return "Done"

@app.route('/complex/loop_safe')
def test_loop_safe():
    user_input = request.args.get('input')
    
    # Safe function
    safe_val = loop_based_sanitization(user_input)
    
    # SINK: Should be SAFE
    os.system(f"echo {safe_val}")
    return "Safe"

@app.route('/complex/loop_unsafe')
def test_loop_unsafe():
    user_input = request.args.get('input')
    
    # Vulnerable function
    unsafe_val = loop_taint_accumulation(user_input)
    
    # SINK: Vulnerable
    os.system(f"echo {unsafe_val}")
    return "Unsafe"

@app.route('/complex/conditional_sanitization')
def test_conditional():
    user_input = request.args.get('input')
    mode = request.args.get('mode')
    
    command = f"echo {user_input}"
    
    if mode == "safe":
        # Sanitization path
        import shlex
        command = f"echo {shlex.quote(user_input)}"
    
    # VULNERABLE: If mode != safe, we execute tainted command
    # Prover should find at least one path to exploit
    os.system(command)
    return "Maybe Safe"
