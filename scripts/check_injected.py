import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.168.195', username='root', password='1Qazxsw2@Dan')
cmd = "docker exec $(docker ps -q -f name=traefik.1) wget -qO- http://127.0.0.1:8080/api/http/routers | grep barberapp-custom"
stdin, stdout, stderr = ssh.exec_command(cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print("OUTPUT:", out)
if err: print("ERR:", err)
ssh.close()
