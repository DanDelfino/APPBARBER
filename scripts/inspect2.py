import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.168.195', username='root', password='1Qazxsw2@Dan')
stdin, stdout, stderr = ssh.exec_command("ls -la /etc/easypanel/traefik")
res = stdout.read().decode()
with open("vps_traefik_dir.txt", "w") as f:
    f.write(res)
print("done")
