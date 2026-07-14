/**
 * =================================================================
 * MODULE: MAIN APPLICATION CONTROLLER
 * File: js/app.js
 * Mục đích: Điều phối toàn bộ vòng đời của trang học tập (hoc-tap.html).
 * Kết nối API, quản lý trạng thái DOM và kích hoạt các Engine con.
 * =================================================================
 */

// -----------------------------------------------------------------
// 1. LỚP QUẢN LÝ GIAO DIỆN (UI MANAGER)
// Nhiệm vụ: Thao tác trực tiếp với DOM, xử lý hiệu ứng ẩn/hiện, Tabs
// -----------------------------------------------------------------
class UIManager {
    constructor() {
        // Khởi tạo và liên kết các phần tử DOM cốt lõi
        this.tabs = document.querySelectorAll('.tab-btn');
        this.panes = document.querySelectorAll('.tab-pane');
        this.spinner = document.getElementById('loading-spinner');
        this.pageTitle = document.getElementById('page-title');
        this.paneTheory = document.getElementById('pane-theory');
        this.paneExercise = document.getElementById('pane-exercise');
        
        this.initTabEvents();
    }

    /**
     * Gắn sự kiện click đổi Tab cho các nút trên thanh Menu Navigation
     */
    initTabEvents() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });
    }

    /**
     * Logic chuyển đổi Tab bằng cách thay đổi class Tailwind CSS
     * @param {string} targetId - Định danh tab ('theory', 'exercise', 'quiz')
     */
    switchTab(targetId) {
        // 1. Reset trạng thái active của tất cả các nút Tab về mặc định (slate)
        this.tabs.forEach(t => {
            t.classList.remove('text-indigo-600', 'border-indigo-600', 'text-emerald-600', 'border-emerald-600', 'text-orange-600', 'border-orange-600');
            t.classList.add('text-slate-500', 'border-transparent');
        });
        
        // 2. Ẩn toàn bộ các vùng nội dung (Panes)
        this.panes.forEach(p => p.classList.add('hidden'));

        // 3. Tìm nút và vùng nội dung được chọn để kích hoạt lại
        const activeTab = document.querySelector(`.tab-btn[data-tab="${targetId}"]`);
        const activePane = document.getElementById(`pane-${targetId}`);
        
        if (!activeTab || !activePane) return;

        // 4. Áp dụng màu sắc riêng biệt cho từng Tab để tăng trải nghiệm người dùng (UX)
        if (targetId === 'theory') {
            activeTab.classList.add('text-indigo-600', 'border-indigo-600');
        } else if (targetId === 'exercise') {
            activeTab.classList.add('text-emerald-600', 'border-emerald-600');
        } else if (targetId === 'quiz') {
            activeTab.classList.add('text-orange-600', 'border-orange-600');
        }
        
        activeTab.classList.remove('text-slate-500', 'border-transparent');
        activePane.classList.remove('hidden');
    }

    /**
     * Đổi chữ Tiêu đề trên Header thành Tên môn và Buổi học tương ứng
     */
    setTitle(mon, buoi) {
        if (this.pageTitle) {
            this.pageTitle.innerText = `${mon.toUpperCase()} - KHÔNG GIAN BÀI HỌC BUỔI ${buoi}`;
        }
    }

    /**
     * Tắt màn hình Loading Spinner khi dữ liệu đã tải xong
     */
    hideLoading() {
        if (this.spinner) this.spinner.classList.add('hidden');
    }

    /**
     * Hiển thị bảng thông báo lỗi màu đỏ nếu API hoặc hệ thống gặp sự cố
     */
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

    /**
     * Bơm mã HTML từ Google Doc vào vùng hiển thị, đồng thời tối ưu giao diện nâng cao
     */
    renderDocContent(theoryHtml, exerciseHtml) {
        // Nếu không có dữ liệu, hiển thị dòng thông báo trống mặc định
        this.paneTheory.innerHTML = theoryHtml || `<p class="text-slate-400 italic text-center py-6">Nội dung lý thuyết đang được cập nhật...</p>`;
        this.paneExercise.innerHTML = exerciseHtml || `<p class="text-slate-400 italic text-center py-6">Phiếu bài tập đang được cập nhật...</p>`;

        // KỸ THUẬT CAO CẤP: Tìm tất cả các thẻ <table> trong nội dung Google Doc vừa đổ về,
        // tự động bọc chúng vào một thẻ <div class="table-wrapper"> để kích hoạt tính năng
        // cuộn ngang (Scroll) trên điện thoại di động, tránh việc bảng làm tràn màn hình.
        const allTables = document.querySelectorAll('.doc-content table');
        allTables.forEach(table => {
            // Tạo thẻ div bọc ngoài
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper';
            // Thực hiện hoán đổi vị trí trong cấu trúc DOM
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    }
}

// -----------------------------------------------------------------
// 2. LỚP ĐIỀU PHỐI TỔNG (APPLICATION ORCHESTRATOR)
// Nhiệm vụ: Chạy tuần tự luồng hoạt động của trang web khi vừa mở
// -----------------------------------------------------------------
class StudyApp {
    constructor() {
        this.api = new ApiService();
        this.ui = new UIManager();
        this.quizEngine = null;
    }

    /**
     * Hàm khởi động chính (Main Entry Point)
     */
    async start() {
        // 1. Phân tách và lấy các tham số (Parameters) từ URL thanh địa chỉ
        const urlParams = new URLSearchParams(window.location.search);
        const mon = urlParams.get('mon');     // Ví dụ: 'toan7'
        const buoi = urlParams.get('buoi');   // Ví dụ: '01'

        // 2. Kiểm tra nếu học sinh truy cập lậu (không có tham số hợp lệ) thì báo lỗi ngay
        if (!mon || !buoi) {
            this.ui.showError("Đường dẫn liên kết không hợp lệ. Vui lòng quay lại Trang chủ chọn bài học.");
            return;
        }

        // 3. Đổi tên tiêu đề trên thanh tiêu đề đầu trang
        this.ui.setTitle(mon, buoi);

        try {
            // 4. TỐI ƯU TỐC ĐỘ: Chạy song song (Asynchronous Concurrent) 2 luồng fetch mạng mạng độc lập.
            // Luồng 1 kéo nội dung văn bản từ Docs, Luồng 2 kéo bộ đề thi trắc nghiệm từ Sheet.
            // Việc dùng Promise.all giúp giảm một nửa thời gian chờ đợi tải trang của học sinh!
            const [docData, rawQuizData] = await Promise.all([
                this.api.getLessonDocs(mon, buoi),
                this.api.getQuiz(mon, buoi)
            ]);

            // 5. Đổ dữ liệu văn bản Lý thuyết & Bài tập ra màn hình thông qua UIManager
            this.ui.renderDocContent(docData.lythuyet, docData.baitap);

           // 6. ÁP DỤNG OOP & FACTORY PATTERN: 
            const questionObjects = QuestionFactory.createList(rawQuizData);

            // 7. ĐÃ SỬA: Truyền thêm api, tham số 'mon' và 'buoi' vào Quiz Engine để nó có thể lưu điểm
            this.quizEngine = new QuizEngine(questionObjects, this.api, mon, buoi);

            // 8. Tắt màn hình chờ Loading và kích hoạt Tab xem Lý Thuyết đầu tiên cho học sinh
            this.ui.hideLoading();
            this.ui.switchTab('theory');

        } catch (error) {
            // Nếu có bất cứ lỗi gì (Hỏng mạng, Sai ID file, Sai tên Tab Sheet), hệ thống sẽ bắt lỗi và hiện UI cảnh báo
            this.ui.showError(error.message || "Không thể kết nối với máy chủ Học viện.");
        }
    }
}

// -----------------------------------------------------------------
// 3. ĐIỂM KÍCH HOẠT HỆ THỐNG
// Đảm bảo trình duyệt đã dựng xong bộ khung HTML mới chạy mã lệnh JS
// -----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const app = new StudyApp();
    app.start();
});
