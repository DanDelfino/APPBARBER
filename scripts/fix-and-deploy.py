import paramiko

HOST = '31.97.168.195'
USER = 'root'
PASS = '1Qazxsw2@Dan'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

output = []

def run(cmd):
    output.append(f"\n>>> {cmd}")
    _, out, err = ssh.exec_command(cmd)
    exit_code = out.channel.recv_exit_status()
    o = out.read().decode()
    e = err.read().decode()
    output.append(f"EXIT: {exit_code}")
    if o.strip():
        output.append(o.strip())
    if e.strip():
        output.append(f"STDERR: {e.strip()}")

# Step 1: Stop and remove old container
run("docker stop 314e5fbdf9f1_barber-app 2>/dev/null; docker rm 314e5fbdf9f1_barber-app 2>/dev/null; echo 'old container cleaned'")

# Step 2: Also remove any barber-app containers
run("docker ps -a --filter name=barber -q | xargs -r docker rm -f 2>/dev/null; echo 'all barber containers cleaned'")

# Step 3: Check the src directory for the latest code
run("ls -la /root/barber-app/src/app/")

# Step 4: Force rebuild with --no-cache to pick up latest code
run("cd /root/barber-app && docker compose -f docker-compose.prod.yml build --no-cache 2>&1 | tail -30")

# Step 5: Start the container
run("cd /root/barber-app && docker compose -f docker-compose.prod.yml up -d 2>&1")

# Step 6: Wait and check status
import time
time.sleep(5)
run("docker ps -a --filter name=barber")
run("docker logs --tail 15 barber-app 2>&1")

ssh.close()

with open('vps_deploy_fix.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))

print("Done! Check vps_deploy_fix.txt")
