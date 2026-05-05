import paramiko

HOST = '31.97.168.195'
USER = 'root'
PASS = '1Qazxsw2@Dan'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

print("--- Checking barber-app logs ---")
stdin, stdout, stderr = ssh.exec_command("docker logs --tail 20 barber-app")
print("Logs:", stdout.read().decode())
print("Errors:", stderr.read().decode())

print("\n--- Checking running containers and ports ---")
stdin, stdout, stderr = ssh.exec_command("docker ps | grep -E 'barber|fitness|node'")
print(stdout.read().decode())

ssh.close()
