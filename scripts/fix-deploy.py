import paramiko

HOST = '31.97.168.195'
USER = 'root'
PASS = '1Qazxsw2@Dan'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

commands = [
    "apt-get update && apt-get install -y unzip",
    "cd /root && unzip -o deploy_barber.zip",
    "ls -la /root/barber-app",
    "cd /root/barber-app && cp .env.production .env",
    "cd /root/barber-app && docker-compose -f docker-compose.prod.yml build",
    "cd /root/barber-app && docker-compose -f docker-compose.prod.yml up -d",
]

for cmd in commands:
    print(f"\n--- {cmd} ---")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    out = stdout.read().decode('utf-8', 'ignore')
    err = stderr.read().decode('utf-8', 'ignore')
    
    if out:
        print("OUT:")
        # Print only last lines if too long to avoid truncating in the console
        lines = out.strip().split('\n')
        if len(lines) > 20:
            print('\n'.join(lines[-20:]))
        else:
            print(out)
            
    if err:
        print("ERR:")
        lines = err.strip().split('\n')
        if len(lines) > 20:
            print('\n'.join(lines[-20:]))
        else:
            print(err)

ssh.close()
