import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.168.195', username='root', password='1Qazxsw2@Dan')
cmd = "docker service logs traefik --tail 50 2>&1"
_, out, err = ssh.exec_command(cmd)
with open('vps_traefik_logs2.txt', 'w') as f:
    f.write(out.read().decode())
ssh.close()
