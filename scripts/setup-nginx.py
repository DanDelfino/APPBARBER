import paramiko
import sys

# VPS Credentials
HOST = '31.97.168.195'
USER = 'root'
PASS = '1Qazxsw2@Dan'

def configure_nginx():
    print(f"Configuring Nginx on {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    commands = [
        # Link the config to Nginx conf.d to be included
        "cp /root/barber-app/nginx-barber.conf /etc/nginx/conf.d/barber-app.conf || echo 'Failed to copy'",
        "nginx -t",
        "systemctl reload nginx"
    ]

    for cmd in commands:
        print(f"Running: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='ignore').strip()
        err = stderr.read().decode('utf-8', errors='ignore').strip()
        print(f"Out: {out}")
        if exit_status != 0:
            print(f"Err: {err}")

    ssh.close()
    print("Nginx configured!")

if __name__ == '__main__':
    configure_nginx()
