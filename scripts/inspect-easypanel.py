import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.168.195', username='root', password='1Qazxsw2@Dan')
stdin, stdout, stderr = ssh.exec_command("find /etc/easypanel -name '*.yml' -o -name '*.json' 2>/dev/null")
print(stdout.read().decode())
