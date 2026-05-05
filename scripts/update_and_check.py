import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.168.195', username='root', password='1Qazxsw2@Dan')

yaml_content = """http:
  routers:
    barberapp-custom:
      rule: "Host(`dfautomatic.cloud`) && PathPrefix(`/barber`)"
      priority: 1000
      service: barberapp-custom-svc
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
  services:
    barberapp-custom-svc:
      loadBalancer:
        servers:
          - url: "http://10.11.0.21:3000"
"""

sftp = ssh.open_sftp()
with sftp.open('/etc/easypanel/traefik/config/custom-barber.yml', 'w') as f:
    f.write(yaml_content)
sftp.close()

time.sleep(2) # let traefik reload

# curl locally first!
print("Curling from VPS to Nextjs container:")
cmd = "docker exec $(docker ps -q -f name=traefik.1) wget -qO- http://10.11.0.21:3000/barber | head -c 200"
_, out, err = ssh.exec_command(cmd)
print(out.read().decode())

print("Traefik logs:")
cmd = "docker logs --tail 20 $(docker ps -q -f name=traefik.1)"
_, out, err = ssh.exec_command(cmd)
print(err.read().decode()) # traefik logs usually go to stderr
print(out.read().decode())
ssh.close()
