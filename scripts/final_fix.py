import paramiko
import time

yaml_content = """http:
  routers:
    barberapp-custom:
      rule: "Host(`dfautomatic.cloud`, `www.dfautomatic.cloud`) && PathPrefix(`/barber`)"
      priority: 1000
      service: barberapp-custom-svc
      entryPoints:
        - https
        - http
      tls:
        certResolver: letsencrypt
  services:
    barberapp-custom-svc:
      loadBalancer:
        servers:
          - url: "http://barber-app:3000"
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.168.195', username='root', password='1Qazxsw2@Dan')

sftp = ssh.open_sftp()
with sftp.open('/etc/easypanel/traefik/config/custom-barber.yml', 'w') as f:
    f.write(yaml_content)
sftp.close()

time.sleep(2) # wait for reload

# curl locally to verify
print("Curling via localhost to traefik from vps:")
cmd = "docker exec $(docker ps -q -f name=traefik.1) wget -qO- --header='Host: dfautomatic.cloud' http://127.0.0.1/barber | head -c 200"
_, out, err = ssh.exec_command(cmd)
print(out.read().decode())
print(err.read().decode())
ssh.close()
