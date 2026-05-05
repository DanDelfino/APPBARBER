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

# Check the actual src files on VPS to see if latest code is there
run("find /root/barber-app/src -name '*.tsx' -o -name '*.ts' | head -30")
run("wc -l /root/barber-app/src/app/page.tsx 2>/dev/null")
run("wc -l /root/barber-app/src/contexts/WhiteLabelContext.tsx 2>/dev/null")
run("ls /root/barber-app/src/contexts/ 2>/dev/null")

ssh.close()

with open('vps_check_files.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))

print("Done! Check vps_check_files.txt")
