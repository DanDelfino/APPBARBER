import paramiko

HOST = '31.97.168.195'
USER = 'root'
PASS = '1Qazxsw2@Dan'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

commands = [
    "cd /root/barber-app && docker-compose -f docker-compose.prod.yml ps -a",
    "cd /root/barber-app && docker-compose -f docker-compose.prod.yml logs --tail 20",
]

out_str = ""
for cmd in commands:
    out_str += f"\n--- {cmd} ---\n"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out_str += stdout.read().decode('utf-8', 'ignore')
    out_str += stderr.read().decode('utf-8', 'ignore')

with open('vps_state.txt', 'w') as f:
    f.write(out_str)

ssh.close()
