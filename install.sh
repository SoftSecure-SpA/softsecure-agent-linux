#!/bin/bash
# Softsecure SOC Agent — Instalador Linux (systemd)
# Ejecutar como root: sudo bash install.sh

set -e

INSTALL_DIR="/opt/softsecure-soc-agent"
SERVICE_NAME="softsecure-soc-agent"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
RUN_USER="softsecure-soc"

echo "============================================"
echo "  Softsecure SOC Agent — Instalador Linux"
echo "============================================"

# Verificar root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Este script debe ejecutarse como root (sudo bash install.sh)"
    exit 1
fi

# Verificar Node.js >= 18
if ! command -v node &>/dev/null; then
    echo "❌ Node.js no está instalado. Instálalo con:"
    echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    echo "   apt-get install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Se requiere Node.js 18 o superior (versión actual: $NODE_VERSION)"
    exit 1
fi

echo "✅ Node.js $(node --version) detectado"

# Crear usuario del sistema sin shell de login
if ! id "$RUN_USER" &>/dev/null; then
    useradd --system --no-create-home --shell /bin/false "$RUN_USER"
    echo "✅ Usuario del sistema '$RUN_USER' creado"
fi

# Copiar archivos
echo "📁 Instalando archivos en $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
cp -r . "$INSTALL_DIR/"
chown -R "$RUN_USER:$RUN_USER" "$INSTALL_DIR"

# Instalar dependencias
echo "📦 Instalando dependencias npm..."
cd "$INSTALL_DIR"
sudo -u "$RUN_USER" npm install --production

# Configurar .env si no existe
if [ ! -f "$INSTALL_DIR/.env" ]; then
    cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
    echo ""
    echo "⚙️  Archivo .env creado. EDÍTALO antes de continuar:"
    echo "   nano $INSTALL_DIR/.env"
    echo ""
    echo "   Variables obligatorias:"
    echo "   - BACKEND_URL  URL del backend Softsecure"
    echo "   - SOCKET_URL   URL del servidor de socket"
    echo "   - AGENT_NAME   Nombre registrado en el panel"
    echo "   - AGENT_KEY    Clave secreta del agente"
    echo "   - TENANT_ID    ID del tenant"
    echo ""
    read -p "Presiona Enter cuando hayas configurado el .env..."
fi

# Crear servicio systemd
echo "⚙️  Creando servicio systemd..."
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Softsecure SOC Agent
Documentation=https://softsecure.cl
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${INSTALL_DIR}
ExecStart=$(which node) ${INSTALL_DIR}/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

# Capacidades mínimas necesarias para leer logs del sistema
AmbientCapabilities=CAP_DAC_READ_SEARCH
NoNewPrivileges=yes

[Install]
WantedBy=multi-user.target
EOF

# Activar y arrancar el servicio
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

echo ""
echo "============================================"
echo "✅ Softsecure SOC Agent instalado y activo"
echo "============================================"
echo ""
echo "Comandos útiles:"
echo "  Estado:  systemctl status $SERVICE_NAME"
echo "  Logs:    journalctl -u $SERVICE_NAME -f"
echo "  Parar:   systemctl stop $SERVICE_NAME"
echo "  Reiniciar: systemctl restart $SERVICE_NAME"
echo ""
