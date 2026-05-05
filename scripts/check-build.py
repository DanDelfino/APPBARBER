import paramiko

HOST = '31.97.168.195'
USER = 'root'
PASS = '1Qazxsw2@Dan'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

print("Starting build...")
stdin, stdout, stderr = ssh.exec_command("cd /root/barber-app && docker-compose -f docker-compose.prod.yml build", get_pty=True)

with open('vps_build_error.txt', 'wb') as f:
    while True:
        chunk = stdout.read(1024)
        if not chunk:
            break
        f.write(chunk)

ssh.close()
