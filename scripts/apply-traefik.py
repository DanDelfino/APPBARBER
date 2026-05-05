import paramiko

HOST = '31.97.168.195'
USER = 'root'
PASS = '1Qazxsw2@Dan'

def deploy():
    print(f"Applying Traefik config on {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS)

    sftp = ssh.open_sftp()
    sftp.put('c:/Users/Lenovo/.gemini/antigravity/playground/swift-hubble/barber-app/docker-compose.prod.yml', '/root/barber-app/docker-compose.prod.yml')
    sftp.close()

    commands = [
        "cd /root/barber-app && docker-compose -f docker-compose.prod.yml down",
        "cd /root/barber-app && docker-compose -f docker-compose.prod.yml up -d"
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
    print("Docker container restarted with Traefik labels!")

if __name__ == '__main__':
    deploy()
