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

print("Restarting docker-compose")
cmd = "cd /root/barber-app && grep -q HOSTNAME docker-compose.prod.yml || sed -i '/NODE_ENV=production/a \\      - HOSTNAME=0.0.0.0' docker-compose.prod.yml && docker-compose -f docker-compose.prod.yml up -d"
ssh.exec_command(cmd)

print("Injecting correct Traefik yaml")
sftp = ssh.open_sftp()
with sftp.open('/etc/easypanel/traefik/config/custom-barber.yml', 'w') as f:
    f.write(yaml_content)
sftp.close()

time.sleep(15) # Wait for Next.js to start up and Traefik to reload
ssh.close()
print("Done")
