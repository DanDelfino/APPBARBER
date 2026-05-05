import paramiko
import json
import sys

HOST = '31.97.168.195'
USER = 'root'
PASS = '1Qazxsw2@Dan'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

cmd = "docker exec $(docker ps -q -f name=traefik.1) wget -qO- http://127.0.0.1:8080/api/http/routers"
_, out, err = ssh.exec_command(cmd)
res = out.read().decode('utf-8')

ssh.close()

try:
    routers = json.loads(res)
    with open('vps_traefik_routers.txt', 'w', encoding='utf-8') as f:
        for r in routers:
            f.write(f"{r.get('name')}: {r.get('rule')} -> {r.get('service')}\n")
    print("Wrote vps_traefik_routers.txt")
except Exception as e:
    print("Failed to parse", str(e))
    with open('vps_traefik_err.txt', 'w', encoding='utf-8') as f:
        f.write(res)
