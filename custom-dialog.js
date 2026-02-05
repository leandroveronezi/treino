// SISTEMA DE DIÁLOGOS PERSONALIZADOS
class CustomDialog {
    constructor() {
        this.overlay = null;
        this.dialog = null;
        this.resolvePromise = null;
        this.init();
    }

    init() {
        // Criar overlay se não existir
        if (!document.getElementById('customDialogOverlay')) {
            this.createDialogElements();
        }
    }

    createDialogElements() {
        // Overlay principal
        this.overlay = document.createElement('div');
        this.overlay.id = 'customDialogOverlay';
        this.overlay.className = 'custom-dialog-overlay';

        // Dialog container
        this.dialog = document.createElement('div');
        this.dialog.className = 'custom-dialog';

        // Título
        const title = document.createElement('div');
        title.className = 'custom-dialog-title';
        title.id = 'customDialogTitle';

        // Mensagem
        const message = document.createElement('div');
        message.className = 'custom-dialog-message';
        message.id = 'customDialogMessage';

        // Botões
        const buttons = document.createElement('div');
        buttons.className = 'custom-dialog-buttons';
        buttons.id = 'customDialogButtons';

        // Montar estrutura
        this.dialog.appendChild(title);
        this.dialog.appendChild(message);
        this.dialog.appendChild(buttons);
        this.overlay.appendChild(this.dialog);

        // Adicionar ao body
        document.body.appendChild(this.overlay);

        // Evento de clique no overlay para fechar
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });

        // Evento de tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
                this.hide();
            }
        });
    }

    show(options = {}) {
        const {
            title = 'Confirmação',
            message = 'Deseja continuar?',
            confirmText = 'Confirmar',
            cancelText = 'Cancelar',
            type = 'confirm' // 'confirm', 'alert', 'prompt'
        } = options;

        return new Promise((resolve) => {
            this.resolvePromise = resolve;

            // Atualizar conteúdo
            document.getElementById('customDialogTitle').textContent = title;
            document.getElementById('customDialogMessage').textContent = message;

            // Limpar e criar botões
            const buttonsContainer = document.getElementById('customDialogButtons');
            buttonsContainer.innerHTML = '';

            if (type === 'alert') {
                // Apenas botão OK para alert
                const okBtn = document.createElement('button');
                okBtn.className = 'custom-dialog-btn confirm';
                okBtn.textContent = 'OK';
                okBtn.onclick = () => {
                    this.hide();
                    resolve(true);
                };
                buttonsContainer.appendChild(okBtn);
            } else {
                // Botão Cancelar
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'custom-dialog-btn cancel';
                cancelBtn.textContent = cancelText;
                cancelBtn.onclick = () => {
                    this.hide();
                    resolve(false);
                };

                // Botão Confirmar
                const confirmBtn = document.createElement('button');
                confirmBtn.className = 'custom-dialog-btn confirm';
                confirmBtn.textContent = confirmText;
                confirmBtn.onclick = () => {
                    this.hide();
                    resolve(true);
                };

                buttonsContainer.appendChild(cancelBtn);
                buttonsContainer.appendChild(confirmBtn);
            }

            // Mostrar dialog
            this.overlay.classList.add('active');
            
            // Foco no primeiro botão
            setTimeout(() => {
                const firstBtn = buttonsContainer.querySelector('button');
                if (firstBtn) firstBtn.focus();
            }, 100);
        });
    }

    hide() {
        this.overlay.classList.remove('active');
        if (this.resolvePromise) {
            this.resolvePromise(false);
            this.resolvePromise = null;
        }
    }

    // Métodos de conveniência
    confirm(message, title = 'Confirmação') {
        return this.show({ message, title, type: 'confirm' });
    }

    alert(message, title = 'Atenção') {
        return this.show({ message, title, type: 'alert' });
    }
}

// Instância global
const customDialog = new CustomDialog();

// Substituir o confirm nativo globalmente (opcional)
window.customConfirm = function(message, title) {
    return customDialog.confirm(message, title);
};

window.customAlert = function(message, title) {
    return customDialog.alert(message, title);
};
