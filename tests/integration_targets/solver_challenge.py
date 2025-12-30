from flask import Flask, request
import os

app = Flask(__name__)

@app.route('/solver/math_challenge')
def math_challenge():
    """
    NOVELTY CHECK: Standard scanners fail here.
    The Prover must solve the mathematical constraints to find the exploit.
    """
    x = request.args.get('x')
    y = request.args.get('y')
    
    try:
        val_x = int(x)
        val_y = int(y)
        
        # SMT Solver Challenge:
        # Find inputs that satisfy these constraints to reach the sink
        if val_x > 10 and val_y < 50:
            if val_x + val_y == 42:
                # SINK: Reachable only if specific inputs are provided
                # e.g., x=11, y=31
                os.system(f"echo {x} {y}")
                return "Exploited"
                
    except ValueError:
        pass
        
    return "Safe"

@app.route('/solver/string_constraint')
def string_challenge():
    """
    NOVELTY CHECK: String constraints.
    """
    code = request.args.get('code')
    
    # Must start with "magic_" and be 10 chars long
    if code.startswith("magic_") and len(code) == 10:
         # SINK
         os.system(f"echo {code}")
         return "Exploited"
         
    return "Safe"
