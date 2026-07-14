class UIManager {
    constructor() {
        this.tabs = document.querySelectorAll('.tab-btn');
        this.panes = document.querySelectorAll('.tab-pane');
        this.spinner = document.getElementById('loading-spinner');
        this.pageTitle = document.getElementById('page-title');
        this.paneTheory = document.getElementById('pane-theory');
        this.paneExercise = document.getElementById('pane-exercise');
        
        this.initTabEvents();
    }

    initTabEvents() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.getAttribute('data-tab'));
            });
        });
    }

    switchTab(targetId) {
        this.tabs.forEach(t => {
            t.classList.remove('text-indigo-600', 'border-indigo-600', 'text-emerald-600', 'border-emerald-600', 'text-orange-600', 'border-orange-600');
            t.classList.add('text-slate-500', 'border-transparent');
        });
        
        this.panes.forEach(p => p.classList.add('hidden'));

        const activeTab = document.querySelector(`.tab-btn[data-tab="${targetId}"]`);
        const activePane = document.getElementById(`pane-${targetId}`);
        
        if (!activeTab || !activePane) return;

        if (targetId === 'theory') activeTab.classList.add('text-indigo-600', 'border-indigo-600');
        else if (targetId === 'exercise') activeTab.classList.add('text-emerald-600', 'border-emerald-600');
        else if (targetId === 'quiz') activeTab.classList.add('text-orange-600', 'border-orange-600');
        
        activeTab.classList.remove('text-slate-500', 'border-transparent');
        activePane.classList.remove('hidden');
    }

    setTitle(mon, buoi) {
        if (this.pageTitle) this.pageTitle.innerText = `${mon.toUpperCase()} - KHÔNG GIAN BÀI HỌC BUỔI ${buoi}`;
    }

    hideLoading() {
        if (this.spinner) this.spinner.classList.add('hidden');
    }

    showError(message) {
        if (this.spinner) {
            this.spinner.innerHTML = `
                <div class="text-center p-6 max-w-md bg-red-50 border-2 border-red-200 rounded-2xl fade-in shadow-sm">
                    <span class="text-5xl">⚠️</span>
                    <h3 class="text-xl font-bold text-red-700 mt-4 mb-2">Xảy ra sự cố tải bài học!</h3>
                    <p class="text-sm text-red-600 mb-4">${message}</p>
                    <button onclick="window.history.back()" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition">
                        Quay lại trang trước
                    </button>
                </div>
            `;
        }
    }

    renderDocContent(theoryHtml, exerciseHtml) {
        this.paneTheory.innerHTML = theoryHtml;
        this.paneExercise.innerHTML = exerciseHtml;
    }

    // TÍNH NĂNG MỚI: Nhúng trang web Trắc nghiệm của bạn vào Iframe
    setQuizIframe(mon, buoi) {
        const quizPane = document.getElementById('pane-quiz');
        // Tạo link chuẩn xác theo ID môn và buổi bạn cung cấp
        // Lưu ý: Tôi dùng ?id thay vì /id vì đây là định dạng URL query string chuẩn của Web
        const quizUrl = `https://tuan-23880095.github.io/TracNghiemOnline/?id=${mon}-${buoi}`;
        
        quizPane.innerHTML = `
            <div class="w-full h-[650px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                <iframe src="${quizUrl}" width="100%" height="100%" frameborder="0" allowfullscreen loading="lazy"></iframe>
            </div>
        `;
    }
}

class StudyApp {
    constructor() {
        this.api = new ApiService();
        this.ui = new UIManager();
    }

    async start() {
        const urlParams = new URLSearchParams(window.location.search);
        const mon = urlParams.get('mon');
        const buoi = urlParams.get('buoi');

        if (!mon || !buoi) {
            this.ui.showError("Đường dẫn liên kết không hợp lệ. Vui lòng quay lại Trang chủ chọn bài học.");
            return;
        }

        this.ui.setTitle(mon, buoi);

        try {
            // 1. Tải Lý thuyết và Bài tập từ file HTML tĩnh
            const docData = await this.api.getLessonDocs(mon, buoi);
            
            // 2. Bơm dữ liệu vào màn hình
            this.ui.renderDocContent(docData.lythuyet, docData.baitap);

            // 3. Khởi tạo Iframe cho trang Trắc nghiệm
            this.ui.setQuizIframe(mon, buoi);

            // 4. Mở khóa màn hình
            this.ui.hideLoading();
            this.ui.switchTab('theory');

        } catch (error) {
            this.ui.showError(error.message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new StudyApp();
    app.start();
});
