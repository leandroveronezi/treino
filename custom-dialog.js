// SISTEMA DE DIÁLOGOS PERSONALIZADOS
class CustomDialog {
    constructor() {
        this.overlay = null;
        this.dialog = null;
        this.titleElement = null;
        this.messageElement = null;
        this.buttonsContainer = null;
        this.resolvePromise = null;
        this.boundKeyDown = null;
        this.previouslyFocusedElement = null;
        this.init();
    }

    init() {
        // Criar overlay se não existir
        if (!document.getElementById('customDialogOverlay')) {
            this.createDialogElements();
        } else {
            // Se já existir, apenas obter referências
            this.overlay = document.getElementById('customDialogOverlay');
            this.dialog = this.overlay.querySelector('.custom-dialog');
            this.titleElement = document.getElementById('customDialogTitle');
            this.messageElement = document.getElementById('customDialogMessage');
            this.buttonsContainer = document.getElementById('customDialogButtons');
        }

        // Inicializar handler de teclado
        this.boundKeyDown = this.handleKeyDown.bind(this);
    }

    createDialogElements() {
        try {
            // Overlay principal
            this.overlay = document.createElement('div');
            this.overlay.id = 'customDialogOverlay';
            this.overlay.className = 'custom-dialog-overlay';
            this.overlay.setAttribute('role', 'dialog');
            this.overlay.setAttribute('aria-modal', 'true');
            this.overlay.setAttribute('aria-labelledby', 'customDialogTitle');
            this.overlay.setAttribute('aria-describedby', 'customDialogMessage');
            this.overlay.tabIndex = -1;

            // Dialog container
            this.dialog = document.createElement('div');
            this.dialog.className = 'custom-dialog';
            this.dialog.setAttribute('role', 'document');

            // Título
            this.titleElement = document.createElement('h2');
            this.titleElement.className = 'custom-dialog-title';
            this.titleElement.id = 'customDialogTitle';

            // Mensagem
            this.messageElement = document.createElement('div');
            this.messageElement.className = 'custom-dialog-message';
            this.messageElement.id = 'customDialogMessage';

            // Botões
            this.buttonsContainer = document.createElement('div');
            this.buttonsContainer.className = 'custom-dialog-buttons';
            this.buttonsContainer.id = 'customDialogButtons';

            // Montar estrutura
            this.dialog.appendChild(this.titleElement);
            this.dialog.appendChild(this.messageElement);
            this.dialog.appendChild(this.buttonsContainer);
            this.overlay.appendChild(this.dialog);

            // Adicionar ao body
            document.body.appendChild(this.overlay);

            // Evento de clique no overlay para fechar
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.resolveWith(false);
                    this.hide();
                }
            });

            // Evento de tecla ESC
            document.addEventListener('keydown', this.boundKeyDown);

        } catch (error) {
            console.error('Erro ao criar elementos do diálogo:', error);
            throw error;
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
            e.preventDefault();
            this.resolveWith(false);
            this.hide();
        }

        // Gerenciamento de foco com Tab
        if (e.key === 'Tab' && this.overlay.classList.contains('active')) {
            const focusableElements = this.dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    }

    resolveWith(value) {
        if (this.resolvePromise) {
            this.resolvePromise(value);
            this.resolvePromise = null;
        }
    }

    show(options = {}) {
        if (!this.overlay || !this.dialog) {
            console.error('Elementos do diálogo não foram inicializados corretamente');
            return Promise.reject('Elementos do diálogo não inicializados');
        }

        const {
            title = 'Confirmação',
            message = 'Deseja continuar?',
            confirmText = 'Confirmar',
            cancelText = 'Cancelar',
            type = 'confirm' // 'confirm', 'alert', 'prompt'
        } = options;

        // Se já houver um diálogo aberto, rejeitar a promessa anterior
        if (this.resolvePromise) {
            this.resolveWith(false);
        }

        return new Promise((resolve) => {
            try {
                this.resolvePromise = resolve;

                // Atualizar conteúdo
                this.titleElement.textContent = title;
                this.messageElement.textContent = message;

                // Limpar botões anteriores
                this.buttonsContainer.innerHTML = '';

                if (type === 'alert') {
                    // Apenas botão OK para alert
                    const okBtn = this.createButton('OK', 'confirm', () => {
                        this.resolveWith(true);
                        this.hide();
                    });
                    this.buttonsContainer.appendChild(okBtn);
                } else {
                    // Botão Cancelar
                    const cancelBtn = this.createButton(cancelText, 'cancel', () => {
                        this.resolveWith(false);
                        this.hide();
                    });

                    // Botão Confirmar
                    const confirmBtn = this.createButton(confirmText, 'confirm', () => {
                        this.resolveWith(true);
                        this.hide();
                    });

                    // Adicionar botões na ordem correta para acessibilidade
                    if (document.documentElement.dir === 'rtl') {
                        this.buttonsContainer.appendChild(confirmBtn);
                        this.buttonsContainer.appendChild(cancelBtn);
                    } else {
                        this.buttonsContainer.appendChild(cancelBtn);
                        this.buttonsContainer.appendChild(confirmBtn);
                    }
                }

                // Mostrar dialog
                this.overlay.classList.add('active');
                this.overlay.removeAttribute('aria-hidden');

                // Salvar elemento que tinha o foco antes de abrir o diálogo
                this.previouslyFocusedElement = document.activeElement;

                // Focar o primeiro elemento interativo
                setTimeout(() => {
                    const focusableElements = this.dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                    if (focusableElements.length > 0) {
                        focusableElements[0].focus();
                    } else {
                        this.dialog.focus();
                    }

                    // Adicionar classe para animação de entrada
                    this.dialog.classList.add('active');
                }, 50);

                // Prevenir rolagem da página de fundo
                document.body.style.overflow = 'hidden';

            } catch (error) {
                console.error('Erro ao exibir diálogo:', error);
                this.resolveWith(false);
            }
        });
    }

    createButton(text, type, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `custom-dialog-btn ${type}`;
        button.textContent = text;
        button.addEventListener('click', (e) => {
            e.preventDefault();
            onClick();
        });
        return button;
    }

    hide() {
        if (!this.overlay) return;

        // Animar saída
        this.dialog.classList.remove('active');

        // Esperar a animação terminar antes de remover do DOM
        setTimeout(() => {
            this.overlay.classList.remove('active');
            this.overlay.setAttribute('aria-hidden', 'true');

            // Restaurar foco para o elemento anterior
            if (this.previouslyFocusedElement && this.previouslyFocusedElement.focus) {
                this.previouslyFocusedElement.focus();
            }

            // Restaurar rolagem da página
            document.body.style.overflow = '';
        }, 200); // Tempo deve corresponder à duração da animação CSS
    }

    // Métodos de conveniência
    confirm(message, title = 'Confirmação') {
        return this.show({
            message: String(message || ''),
            title: String(title || 'Confirmação'),
            type: 'confirm'
        });
    }

    alert(message, title = 'Atenção') {
        return this.show({
            message: String(message || ''),
            title: String(title || 'Atenção'),
            type: 'alert'
        });
    }

    // Limpar recursos quando não for mais necessário
    destroy() {
        if (this.boundKeyDown) {
            document.removeEventListener('keydown', this.boundKeyDown);
            this.boundKeyDown = null;
        }

        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }

        this.overlay = null;
        this.dialog = null;
        this.titleElement = null;
        this.messageElement = null;
        this.buttonsContainer = null;
        this.resolvePromise = null;
    }
}

// Instância global
const customDialog = new CustomDialog();

// Substituir o confirm/alert nativo globalmente (opcional)
if (typeof window !== 'undefined') {
    window.customConfirm = function (message, title) {
        return customDialog.confirm(message, title);
    };

    window.customAlert = function (message, title) {
        return customDialog.alert(message, title);
    };

    // Adicionar evento para limpar recursos quando a página for descarregada
    window.addEventListener('beforeunload', () => {
        customDialog.destroy();
    });
}

// Exportar para módulos, se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = customDialog;
}
