import paramiko

HOST = '31.97.168.195'
USER = 'root'
PASS = '1Qazxsw2@Dan'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

commands = [
    "cd /root/barber-app && docker-compose -f docker-compose.prod.yml logs barber-app",
    "cd /root/barber-app && docker-compose -f docker-compose.prod.yml ps",
]

output = ""
for cmd in commands:
    output += f"\n--- {cmd} ---\n"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    output += stdout.read().decode('utf-8', 'ignore')
    output += stderr.read().decode('utf-8', 'ignore')

with open('vps_logs.txt', 'w') as f:
    f.write(output)

ssh.close()
