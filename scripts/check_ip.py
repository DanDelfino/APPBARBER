import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.97.168.195', username='root', password='1Qazxsw2@Dan')

# get IP of barber-app container
cmd = "docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' barber-app"
_, out, err = ssh.exec_command(cmd)
ip = out.read().decode().strip()

print(f"IP of barber-app: {ip}")

# update custom-barber.yml to use explicit IP!
yaml_content = f"""http:
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
          - url: "http://{ip}:3000"
"""

sftp = ssh.open_sftp()
with sftp.open('/etc/easypanel/traefik/config/custom-barber.yml', 'w') as f:
    f.write(yaml_content)
sftp.close()
ssh.close()
print("Updated config with hardcoded IP!")
