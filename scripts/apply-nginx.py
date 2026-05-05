import paramiko
import sys

HOST = '31.97.168.195'
USER = 'root'
PASS = '1Qazxsw2@Dan'

def configure():
    print(f"Configuring dfautomatic.cloud Nginx on {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS)

    # Upload file
    sftp = ssh.open_sftp()
    sftp.put('c:/Users/Lenovo/.gemini/antigravity/playground/swift-hubble/barber-app/nginx-dfautomatic.conf', '/etc/nginx/sites-available/dfautomatic.cloud')
    sftp.close()

    commands = [
        "ln -sf /etc/nginx/sites-available/dfautomatic.cloud /etc/nginx/sites-enabled/",
        "rm -f /etc/nginx/conf.d/barber-app.conf",  # Remove the previous broken snippet
        "nginx -t",
        "systemctl reload nginx"
    ]

    for cmd in commands:
        print(f"Running: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='ignore').strip()
        err = stderr.read().decode('utf-8', errors='ignore').strip()
        if out: print(f"Out: {out}")
        if err: print(f"Err: {err}")

    ssh.close()
    print("Nginx configured for dfautomatic.cloud/barber!")

if __name__ == '__main__':
    configure()
