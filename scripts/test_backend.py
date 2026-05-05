import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.168.195', username='root', password='1Qazxsw2@Dan')
cmd = "docker exec $(docker ps -q -f name=traefik.1) wget -qS -O- http://barber-app:3000/barber"
_, out, err = ssh.exec_command(cmd)
res = out.read().decode()
err_str = err.read().decode()
print("OUT:", res[:1000])
print("ERR:", err_str[:1000])
