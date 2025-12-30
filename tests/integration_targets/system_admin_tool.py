import os
import subprocess
import shlex
from flask import Flask, request

app = Flask(__name__)

class SystemManager:
    def __init__(self, root_dir="/var/www"):
        self.root_dir = root_dir

    def backup_directory(self, dirname):
        """
        VULNERABLE: Command Injection via os.system
        """
        # User input directly concatenated
        cmd = "tar -czf backup.tar.gz " + dirname
        # SINK 1
        return os.system(cmd)

    def ping_host(self, host):
        """
        VULNERABLE: Command Injection via subprocess.call with shell=True
        """
        # SINK 2
        # Complex flow: host -> cmd_list -> join -> execution
        cmd_list = ["ping", "-c", "4", host]
        final_cmd = " ".join(cmd_list)
        return subprocess.call(final_cmd, shell=True)

    def view_log(self, logfile):
        """
        SAFE: Uses shlex.quote
        """
        safe_logfile = shlex.quote(logfile)
        cmd = f"cat {safe_logfile}"
        # Safe because input is quoted
        return subprocess.check_output(cmd, shell=True)
    
    def restart_service(self, service_name):
        """
        SAFE: Uses shell=False and list arguments
        """
        # SINK 3 (Safe usage)
        return subprocess.run(["systemctl", "restart", service_name], shell=False)

admin = SystemManager()

@app.route('/admin/backup', methods=['POST'])
def backup():
    # Entry Point 1
    folder = request.form['folder']
    admin.backup_directory(folder)
    return "Backup started"

@app.route('/admin/ping')
def ping():
    # Entry Point 2
    ip = request.args.get('ip')
    admin.ping_host(ip)
    return "Ping complete"

@app.route('/admin/logs')
def logs():
    # Entry Point 3 (Safe)
    log = request.args.get('log')
    if ".." in log:
        return "Invalid path"
    output = admin.view_log(log)
    return output

if __name__ == '__main__':
    app.run()
