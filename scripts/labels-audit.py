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

# Get all labels for all containers
run("docker ps -q | xargs docker inspect --format '{{.Name}}: {{range $k, $v := .Config.Labels}}{{ $k }}={{ $v }} || {{end}}' | grep traefik", "Traefik Labels Audit")

ssh.close()

with open('vps_labels_audit.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))

print("Audit written to vps_labels_audit.txt")
