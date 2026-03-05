# -*- mode: ruby -*-
# vi: set ft=ruby :
#
# 메멘토애니 - Claude Code 격리 실행 환경
# claude --dangerously-skip-permissions를 안전하게 사용하기 위한 VM
#
# 사용법:
#   Intel Mac:           vagrant up
#   Apple Silicon (M1+): vagrant up --provider=vmware_desktop
#                    또는 vagrant up --provider=parallels
#
#   vagrant ssh
#   claude-free          # = claude --dangerously-skip-permissions
#
# 주의: VirtualBox 7.2.4에 CPU 100% 버그 있음. 7.1.x 권장.

Vagrant.configure("2") do |config|
  config.vm.box = "bento/ubuntu-24.04"
  config.vm.hostname = "memento-dev"

  # 포트포워딩
  config.vm.network "forwarded_port", guest: 3000, host: 3000   # Next.js
  config.vm.network "forwarded_port", guest: 54321, host: 54321 # Supabase

  # 프로젝트 폴더 공유 (호스트 <-> VM 양방향)
  config.vm.synced_folder ".", "/home/vagrant/memento1", type: "virtualbox"

  # VirtualBox (Intel Mac)
  config.vm.provider "virtualbox" do |vb|
    vb.memory = "4096"
    vb.cpus = 2
    vb.name = "memento-ani-dev"
  end

  # VMware Desktop (Apple Silicon)
  config.vm.provider "vmware_desktop" do |v|
    v.vmx["memsize"] = "4096"
    v.vmx["numvcpus"] = "2"
  end

  # Parallels (Apple Silicon)
  config.vm.provider "parallels" do |prl|
    prl.memory = 4096
    prl.cpus = 2
    prl.name = "memento-ani-dev"
  end

  # 프로비저닝 (첫 vagrant up 시 자동 실행)
  config.vm.provision "shell", inline: <<-SHELL
    set -e

    echo "========================================="
    echo "  메멘토애니 개발환경 프로비저닝 시작"
    echo "========================================="

    # 1. 시스템 업데이트
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get upgrade -y -qq

    # 2. 필수 패키지
    apt-get install -y -qq \
      git curl wget unzip build-essential \
      ca-certificates gnupg lsb-release \
      software-properties-common

    # 3. Node.js 22.x LTS
    if ! command -v node &> /dev/null; then
      echo ">>> Node.js 22.x 설치 중..."
      curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
      apt-get install -y -qq nodejs
    fi
    echo "Node.js: $(node -v)"
    echo "npm: $(npm -v)"

    # 4. Docker CE
    if ! command -v docker &> /dev/null; then
      echo ">>> Docker 설치 중..."
      install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
      chmod a+r /etc/apt/keyrings/docker.asc
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null
      apt-get update -qq
      apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    fi
    usermod -aG docker vagrant
    echo "Docker: $(docker --version)"

    # 5. Claude Code
    if ! command -v claude &> /dev/null; then
      echo ">>> Claude Code 설치 중..."
      npm install -g @anthropic-ai/claude-code
    fi
    echo "Claude Code: $(claude --version 2>/dev/null || echo 'installed')"

    # 6. 환경 설정
    BASHRC="/home/vagrant/.bashrc"

    # claude-free alias
    if ! grep -q "claude-free" "$BASHRC"; then
      cat >> "$BASHRC" << 'EOF'

# 메멘토애니 Claude Code 설정
alias claude-free='claude --dangerously-skip-permissions'
cd /home/vagrant/memento1 2>/dev/null

# API 키 체크
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo ""
  echo "  ANTHROPIC_API_KEY가 설정되지 않았습니다."
  echo "  export ANTHROPIC_API_KEY=\"sk-ant-...\""
  echo ""
fi
EOF
    fi

    echo ""
    echo "========================================="
    echo "  프로비저닝 완료!"
    echo ""
    echo "  vagrant ssh 후:"
    echo "  export ANTHROPIC_API_KEY=\"your-key\""
    echo "  claude-free"
    echo "========================================="
  SHELL
end
