/**
 * =================================================================
 * MODULE: QUIZ ENGINE (BỘ MÁY TRẮC NGHIỆM OOP)
 * File: js/quiz.js
 * Mục đích: Điều khiển luồng chơi game (Đếm giờ, chuyển câu, tổng kết)
 * =================================================================
 */

class QuizEngine {
    /**
     * @param {Array} questionObjects - Mảng các đối tượng câu hỏi đã được tạo từ QuestionFactory
     */
    constructor(questionObjects, api, mon, buoi) {
        this.questions = questionObjects;
        this.api = api;   // Lấy ApiService từ app.js
        this.mon = mon;   // Lưu mã môn
        this.buoi = buoi; // Lưu mã buổi
        
        this.currentIndex = 0;
        this.score = 0;
        this.timer = null;
        this.timeLeft = 0;

        // 1. Kết nối với các thành phần HTML (DOM Elements)
        this.uiSetup = document.getElementById('quiz-setup');
        this.uiPlay = document.getElementById('quiz-play');
        this.uiResult = document.getElementById('quiz-result');
        
        this.elQuestion = document.getElementById('quiz-question');
        this.elOptions = document.getElementById('quiz-options');
        this.elProgress = document.getElementById('quiz-progress');
        
        this.elTimer = document.getElementById('quiz-timer');
        this.btnNext = document.getElementById('btn-next-question');
        this.btnStart = document.getElementById('btn-start-quiz');
        // THÊM 2 DÒNG NÀY VÀO CUỐI CONSTRUCTOR:
        this.elStudentName = document.getElementById('student-name'); 
        this.studentName = "Học sinh Ẩn danh"; // Biến lưu trữ tên
        // 2. Lắng nghe sự kiện click cho các nút điều hướng
        if (this.btnStart) {
            this.btnStart.addEventListener('click', () => this.start());
        }
        if (this.btnNext) {
            this.btnNext.addEventListener('click', () => this.nextQuestion());
        }
    }

    /**
     * Bắt đầu bài thi
     */
    start() {
        if (!this.questions || this.questions.length === 0) {
            alert("Chưa có dữ liệu câu hỏi trắc nghiệm cho buổi học này!"); 
            return;
        }
        // --- TÍNH NĂNG MỚI: KIỂM TRA TÊN ---
        if (this.elStudentName) {
            const nameInput = this.elStudentName.value.trim();
            if (nameInput === "") {
                alert("Vui lòng nhập tên của bạn trước khi làm bài nhé!");
                this.elStudentName.focus(); // Tự động nháy con trỏ chuột vào ô nhập tên
                return; // Chặn lại, không chạy code phía dưới nữa
            }
            this.studentName = nameInput; // Lưu tên học sinh đã nhập
        }
        // Chuyển đổi màn hình
        this.uiSetup.classList.add('hidden');
        this.uiPlay.classList.remove('hidden');
        this.uiPlay.classList.add('fade-in');
        
        // Tải câu hỏi đầu tiên
        this.loadQuestion();
    }

    /**
     * Tải và hiển thị câu hỏi hiện tại
     */
    loadQuestion() {
        clearInterval(this.timer); // Reset đồng hồ
        this.btnNext.classList.add('hidden'); // Ẩn nút "Câu tiếp theo"

        // Lấy đối tượng câu hỏi hiện tại ra
        const currentQ = this.questions[this.currentIndex];
        
        // Cập nhật tiến độ và nội dung câu hỏi
        this.elProgress.innerText = `Câu ${this.currentIndex + 1} / ${this.questions.length}`;
        this.elQuestion.innerText = currentQ.questionText;
        this.elQuestion.classList.remove('text-red-500'); // Reset màu chữ nếu câu trước bị hết giờ
        
        // YÊU CẦU ĐỐI TƯỢNG TỰ VẼ GIAO DIỆN (Đa hình - Polymorphism)
        this.elOptions.innerHTML = currentQ.renderUI();

        // Gắn sự kiện click/submit cho giao diện vừa được vẽ ra
        this.bindQuestionEvents(currentQ);

        // Kích hoạt đồng hồ đếm ngược
        this.timeLeft = currentQ.timeLimit;
        this.updateTimerUI();
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerUI();
            if (this.timeLeft <= 0) this.timeUp();
        }, 1000);
    }

    /**
     * Gắn sự kiện dựa trên loại câu hỏi (Trắc nghiệm hoặc Điền khuyết)
     */
    bindQuestionEvents(currentQ) {
        // Trường hợp 1: Nếu là Trắc nghiệm hoặc Đúng/Sai (có các nút bấm)
        const optionBtns = this.elOptions.querySelectorAll('.quiz-option-btn');
        if (optionBtns.length > 0) {
            optionBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const selectedAnswer = btn.getAttribute('data-answer');
                    this.processAnswer(selectedAnswer, btn, currentQ);
                });
            });
            return;
        }

        // Trường hợp 2: Nếu là câu hỏi Trả lời ngắn / Điền khuyết
        const btnSubmit = document.getElementById('btn-submit-short');
        const inputEl = document.getElementById('short-answer-input');
        if (btnSubmit && inputEl) {
            // Hỗ trợ nhấn phím Enter để nộp
            inputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') btnSubmit.click();
            });
            
            btnSubmit.addEventListener('click', () => {
                if (inputEl.value.trim() === "") {
                    alert("Vui lòng nhập câu trả lời!"); return;
                }
                this.processAnswer(inputEl.value, inputEl, currentQ);
            });
        }
    }

    /**
     * Xử lý logic khi học sinh chốt đáp án
     */
    processAnswer(userAnswer, targetElement, currentQ) {
        clearInterval(this.timer); // Dừng đồng hồ
        
        // Lưu đáp án của học sinh vào object để sau này có thể gửi về Server
        currentQ.userAnswer = userAnswer; 
        
        // YÊU CẦU ĐỐI TƯỢNG TỰ CHẤM ĐIỂM
        const isRight = currentQ.isCorrect();
        if (isRight) this.score++;

        // Khóa giao diện không cho bấm nữa
        this.lockOptions();

        // Xử lý hiệu ứng ĐÚNG / SAI
        if (currentQ.type === 'trac-nghiem' || currentQ.type === 'dung-sai') {
            if (isRight) {
                targetElement.classList.add('border-emerald-500', 'bg-emerald-50');
                targetElement.querySelector('span').classList.add('bg-emerald-500', 'text-white');
            } else {
                targetElement.classList.add('border-red-500', 'bg-red-50');
                targetElement.querySelector('span').classList.add('bg-red-500', 'text-white');
                
                // Tô xanh đáp án đúng để học sinh rút kinh nghiệm
                const allBtns = this.elOptions.querySelectorAll('.quiz-option-btn');
                allBtns.forEach(b => {
                    if (b.getAttribute('data-answer') === currentQ.correctAnswer) {
                        b.classList.add('border-emerald-500');
                        b.querySelector('span').classList.add('bg-emerald-500', 'text-white');
                    }
                });
            }
        } else {
            // Hiệu ứng cho ô nhập text điền khuyết
            if (isRight) {
                targetElement.classList.add('border-emerald-500', 'bg-emerald-50', 'text-emerald-700');
            } else {
                targetElement.classList.add('border-red-500', 'bg-red-50', 'text-red-700');
                // Hiển thị dòng đáp án đúng bên dưới
                const feedback = document.createElement('div');
                feedback.className = "text-emerald-600 font-bold mt-3 text-center bg-emerald-50 p-3 rounded-xl border border-emerald-200 fade-in";
                feedback.innerHTML = `💡 Đáp án chính xác là: <span class="text-xl underline">${currentQ.correctAnswer}</span>`;
                this.elOptions.appendChild(feedback);
            }
        }

        // Hiện nút đi tiếp
        this.btnNext.classList.remove('hidden');
    }

    /**
     * Khóa không cho tương tác tiếp sau khi đã trả lời hoặc hết giờ
     */
    lockOptions() {
        const optionBtns = this.elOptions.querySelectorAll('.quiz-option-btn');
        optionBtns.forEach(b => {
            b.disabled = true;
            b.classList.remove('hover:border-orange-400', 'hover:bg-orange-50', 'hover:border-blue-400', 'hover:bg-blue-50');
        });

        const inputEl = document.getElementById('short-answer-input');
        const btnSubmit = document.getElementById('btn-submit-short');
        if (inputEl) inputEl.disabled = true;
        if (btnSubmit) btnSubmit.disabled = true;
    }

    /**
     * Cập nhật số giây lên màn hình & Hiệu ứng rung
     */
    updateTimerUI() {
        this.elTimer.innerText = `⏱ ${this.timeLeft}s`;
        if (this.timeLeft <= 5) {
            this.elTimer.classList.add('text-red-600', 'bg-red-100', 'shake-warning');
        } else {
            this.elTimer.classList.remove('text-red-600', 'bg-red-100', 'shake-warning');
        }
    }

    /**
     * Xử lý khi đồng hồ đếm về 0
     */
    timeUp() {
        clearInterval(this.timer);
        this.lockOptions();
        this.elQuestion.innerText += " (ĐÃ HẾT GIỜ!)";
        this.elQuestion.classList.add('text-red-500');
        
        // Mở nút đi tiếp
        this.btnNext.classList.remove('hidden');
    }

    /**
     * Chuyển sang câu hỏi tiếp theo hoặc kết thúc
     */
    nextQuestion() {
        this.currentIndex++;
        if (this.currentIndex >= this.questions.length) {
            this.showResult();
        } else {
            // Tạo hiệu ứng Fade in cho nội dung mới
            this.elOptions.classList.remove('fade-in');
            void this.elOptions.offsetWidth; // Trigger reflow để reset CSS animation
            this.elOptions.classList.add('fade-in');
            
            this.loadQuestion();
        }
    }

    /**
     * Hiển thị bảng tổng kết điểm
     */
    showResult() {
        this.uiPlay.classList.add('hidden');
        this.uiResult.classList.remove('hidden');
        this.uiResult.classList.add('fade-in');
        
        const percentage = Math.round((this.score / this.questions.length) * 100);
        
        // Thay đổi thông điệp dựa trên % điểm
        let message = "Cố gắng hơn nữa nhé!";
        let emoji = "💪";
        if (percentage >= 80) { message = "Xuất sắc!"; emoji = "🏆"; }
        else if (percentage >= 50) { message = "Khá lắm!"; emoji = "👍"; }

        document.getElementById('quiz-score-text').innerHTML = `
            <div class="text-6xl mb-4">${emoji}</div>
            <div class="text-2xl font-bold text-slate-800 mb-2">${message}</div>
            Đạt <strong>${this.score} / ${this.questions.length}</strong> điểm <br>
            <span class="text-sm text-slate-500">Tỷ lệ chính xác: ${percentage}%</span>
            <div id="save-status" class="mt-4 text-sm font-semibold text-indigo-500 animate-pulse">⏳ Đang đồng bộ điểm lên hệ thống...</div>
        `;
        // Gọi API lưu điểm (Chạy ngầm không block UI)
        if (this.api) {
            try {
                const payload = {
                    studentName: "Học sinh Ẩn danh", // Ở phiên bản nâng cấp, bạn có thể lấy tên nhập từ prompt
                    courseId: this.mon,
                    sessionId: this.buoi,
                    score: this.score,
                    totalQuestions: this.questions.length,
                    percentage: percentage
                };
                
                await this.api.submitQuizResult(payload);
                
                // Cập nhật UI khi lưu thành công
                const statusEl = document.getElementById('save-status');
                statusEl.className = "mt-4 text-sm font-bold text-emerald-600";
                statusEl.innerHTML = "✅ Kết quả đã được lưu!";
                
            } catch (error) {
                // Xử lý báo lỗi
                const statusEl = document.getElementById('save-status');
                statusEl.className = "mt-4 text-sm font-bold text-red-500";
                statusEl.innerHTML = "❌ Không thể lưu điểm. Vui lòng báo lại giáo viên!";
                console.error(error);
            }
        }
    }
}
