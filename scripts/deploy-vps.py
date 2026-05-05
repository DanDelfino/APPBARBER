import paramiko
import zipfile
import os
import sys

# VPS Credentials
HOST = '31.97.168.195'
USER = 'root'
PASS = '1Qazxsw2@Dan'

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = BASE_DIR

def create_deploy_zip(zip_filepath):
    print(f"📦 Criando pacote de deploy: {zip_filepath}...")
    file_count = 0
    with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(PROJECT_DIR):
            # Ignora pastas pesadas ou desnecessárias
            dirs[:] = [d for d in dirs if d not in ('node_modules', '.next', '.venv', '__pycache__', '.git', '.gemini', '.agent', 'scripts')]
            for file in files:
                if file == 'deploy_barber.zip': continue
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, PROJECT_DIR).replace(os.sep, '/')
                arcname = f"barber-app/{rel_path}"
                zipf.write(file_path, arcname)
                file_count += 1
    print(f"✅ {file_count} arquivos zipados.")

def run_ssh_commands(ssh, commands):
    for cmd in commands:
        print(f"  → {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='ignore').strip()
        err = stderr.read().decode('utf-8', errors='ignore').strip()
        if exit_status != 0:
            print(f"  ✖ Falhou (exit {exit_status}): {err[:300]}")
        else:
            print(f"  ✔ OK {('→ ' + out[:80]) if out else ''}")

def deploy():
    print(f"\n🚀 ========== DEPLOY BARBER APP ({HOST}) ==========")
    zip_path = os.path.join(BASE_DIR, 'deploy_barber.zip')
    
    create_deploy_zip(zip_path)
    
    zip_size = os.path.getsize(zip_path) / 1024
    print(f"📏 Tamanho do pacote: {zip_size:.2f} KB")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        print(f"[1] Conectando ao servidor {HOST}...")
        ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False)
    except Exception as e:
        print(f"❌ Falha ao conectar: {e}")
        return

    print(f"[2] Fazendo upload do pacote...")
    try:
        sftp = ssh.open_sftp()
        sftp.put(zip_path, '/root/deploy_barber.zip')
        sftp.close()
    except Exception as e:
        print(f"❌ Falha no upload: {e}")
        ssh.close()
        return

    print(f"[3] Executando comandos de instalação...")
    # Removendo container antigo para evitar conflitos de nome
    run_ssh_commands(ssh, [
        "apt-get update && apt-get install -y unzip",
        "rm -rf /root/barber-app_old",
        "mv /root/barber-app /root/barber-app_old || true",
        "cd /root && unzip -o deploy_barber.zip",
        "cd /root/barber-app && cp .env.production .env",
        "docker stop barber-app || true",
        "docker rm barber-app || true",
        # Removendo qualquer container que use o nome que o docker-compose gera (com prefixo)
        "docker ps -a --filter name=barber -q | xargs -r docker rm -f",
        "cd /root/barber-app && docker compose -f docker-compose.prod.yml build",
        "cd /root/barber-app && docker compose -f docker-compose.prod.yml up -d",
        "echo 'Deploy finalizado com sucesso!'"
    ])

    ssh.close()
    if os.path.exists(zip_path):
        os.remove(zip_path)
    print("\n✅ DEPLOY FINALIZADO!")
    print(f"Verifique o status com: docker ps | grep barber")

if __name__ == '__main__':
    deploy()
