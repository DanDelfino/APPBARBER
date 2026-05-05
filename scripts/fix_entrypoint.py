import paramiko
import time

yaml_content = """http:
  routers:
    barberapp-custom:
      rule: "Host(`dfautomatic.cloud`) && PathPrefix(`/barber`)"
      priority: 1000
      service: barberapp-custom-svc
      entryPoints:
        - https
      tls:
        certResolver: letsencrypt
  services:
    barberapp-custom-svc:
      loadBalancer:
        servers:
          - url: "http://10.11.0.21:3000"
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.168.195', username='root', password='1Qazxsw2@Dan')

sftp = ssh.open_sftp()
with sftp.open('/etc/easypanel/traefik/config/custom-barber.yml', 'w') as f:
    f.write(yaml_content)
sftp.close()

time.sleep(2) # wait for reload

print("Updated entryPoints to 'https'")
ssh.close()
