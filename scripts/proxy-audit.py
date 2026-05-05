import paramiko

HOST = '31.97.168.195'
USER = 'root'
PASS = '1Qazxsw2@Dan'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

output = []

def run(cmd, label):
    output.append(f"=== {label} ===")
    _, out, err = ssh.exec_command(cmd)
    o = out.read().decode()
    e = err.read().decode()
    if o: output.append(o)
    if e: output.append(f"ERR: {e}")
    output.append("")

# Check for Nginx processes
run("ps aux | grep nginx | grep -v grep", "Nginx Processes")

# Check Nginx configuration for 'barber'
run("grep -r 'barber' /etc/nginx/ 2>/dev/null", "Nginx Config Search")

# Check Traefik processes
run("ps aux | grep traefik | grep -v grep", "Traefik Processes")

# Check all active Nginx site configs
run("ls /etc/nginx/sites-enabled/", "Enabled Sites")

# Test curl from localhost to public IP with header
run("curl -I -H 'Host: dfautomatic.cloud' http://31.97.168.195/barber", "Edge Curl Test")

# Check docker compose config again
run("cd /root/barber-app && docker compose config", "Docker Compose Final Config")

ssh.close()

with open('vps_proxy_audit.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))

print("Audit written to vps_proxy_audit.txt")
