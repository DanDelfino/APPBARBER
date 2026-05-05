import paramiko

yaml_content = """http:
  routers:
    barberapp-custom:
      rule: "Host(`dfautomatic.cloud`, `www.dfautomatic.cloud`) && PathPrefix(`/barber`)"
      priority: 1000
      service: barberapp-custom-svc
      entryPoints:
        - websecure
        - web
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
ssh.close()
print("Injected custom-barber.yml with priority")
