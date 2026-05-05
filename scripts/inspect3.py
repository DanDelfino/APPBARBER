import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.168.195', username='root', password='1Qazxsw2@Dan')
cmd = "docker service inspect traefik | grep -A 30 Args"
stdin, stdout, stderr = ssh.exec_command(cmd)
res = stdout.read().decode()
with open("vps_traefik_args.txt", "w") as f:
    f.write(res)
print("done")
