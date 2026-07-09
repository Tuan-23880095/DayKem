/**
 * =================================================================
 * MODULE: DATA MODELS (MÔ HÌNH DỮ LIỆU)
 * File: js/models.js
 * Mục đích: Định nghĩa cấu trúc chuẩn của Khối lớp, Buổi học và Câu hỏi
 * Áp dụng: Kế thừa (Inheritance), Đa hình (Polymorphism), Factory Pattern
 * =================================================================
 */

/* ---------------------------------------------------------
   1. MÔ HÌNH: CHƯƠNG TRÌNH HỌC (COURSES & SESSIONS)
--------------------------------------------------------- */
class Course {
    constructor(data) {
        this.id = data.id || "";
        this.name = data.name || "Môn học chưa đặt tên";
        this.icon = data.icon || "📚";
        this.color = data.color || "blue";
    }
}

class LessonSession {
    constructor(data) {
        this.courseId = data.courseId || "";
        this.sessionId = data.sessionId || "";
        this.title = data.title || "Buổi học đang cập nhật";
        this.status = data.status || "open"; // open, locked
    }
    
    // Hàm phụ trợ tạo đường dẫn URL tự động
    getLessonUrl() {
        return `hoc-tap.html?mon=${this.courseId}&buoi=${this.sessionId}`;
    }
}

/* ---------------------------------------------------------
   2. MÔ HÌNH: CÂU HỎI TRẮC NGHIỆM (QUESTIONS)
--------------------------------------------------------- */

/**
 * CLASS CHA (Base Question)
 * Chứa các thuộc tính và phương thức chung mà câu hỏi nào cũng phải có
 */
class BaseQuestion {
    constructor(data) {
        this.type = data.type || "unknown";
        this.questionText = data.question || "Nội dung câu hỏi bị trống?";
        this.correctAnswer = String(data.correct || "").trim();
        this.timeLimit = parseInt(data.time) || 20; // Mặc định 20 giây
        
        this.userAnswer = null; // Lưu đáp án học sinh chọn
    }

    // Hàm chấm điểm chung (Kiểm tra không phân biệt hoa thường và khoảng trắng)
    isCorrect() {
        if (this.userAnswer === null) return false;
        return this.userAnswer.toString().trim().toLowerCase() === this.correctAnswer.toLowerCase();
    }

    // Hàm ảo (Sẽ được viết lại ở các Class con)
    renderUI() {
        throw new Error("Phải ghi đè (override) hàm renderUI ở Class con!");
    }
}

/**
 * CLASS CON 1: Câu hỏi Trắc nghiệm 4 lựa chọn (A, B, C, D)
 */
class MultipleChoiceQuestion extends BaseQuestion {
    constructor(data) {
        super(data);
        // Lọc bỏ các lựa chọn rỗng (nếu Google Sheet bị dư cột)
        this.options = (data.options || []).filter(opt => opt !== null && opt !== "");
    }

    // Render giao diện riêng cho loại Trắc nghiệm
    renderUI() {
        let html = '';
        const labels = ['A', 'B', 'C', 'D', 'E', 'F']; // Hỗ trợ lên tới 6 đáp án
        
        this.options.forEach((opt, index) => {
            html += `
            <button data-answer="${opt}" class="quiz-option-btn btn-pop w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-orange-400 hover:bg-orange-50 font-medium text-slate-700 transition flex items-center mb-3">
                <span class="bg-slate-200 text-slate-600 font-bold w-8 h-8 rounded-lg flex items-center justify-center mr-3 pointer-events-none">${labels[index]}</span> 
                <span class="pointer-events-none">${opt}</span>
            </button>`;
        });
        return html;
    }
}

/**
 * CLASS CON 2: Câu hỏi Đúng / Sai
 */
class TrueFalseQuestion extends BaseQuestion {
    constructor(data) {
        super(data);
        this.options = ["Đúng", "Sai"];
    }

    renderUI() {
        let html = '';
        const icons = ['✅', '❌'];
        
        this.options.forEach((opt, index) => {
            html += `
            <button data-answer="${opt}" class="quiz-option-btn btn-pop w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 font-bold text-slate-800 transition flex items-center justify-center mb-3 text-lg">
                <span class="mr-2 pointer-events-none">${icons[index]}</span> 
                <span class="pointer-events-none">${opt}</span>
            </button>`;
        });
        return html;
    }
}

/**
 * CLASS CON 3: Câu hỏi Điền khuyết / Trả lời ngắn
 */
class ShortAnswerQuestion extends BaseQuestion {
    constructor(data) {
        super(data);
    }

    renderUI() {
        return `
        <div class="mb-4">
            <input type="text" id="short-answer-input" placeholder="Nhập câu trả lời của bạn vào đây..." class="w-full p-4 text-lg border-2 border-slate-300 rounded-xl focus:border-orange-500 focus:outline-none transition">
        </div>
        <button id="btn-submit-short" class="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition">
            Xác nhận đáp án
        </button>
        `;
    }
}

/* ---------------------------------------------------------
   3. NHÀ MÁY SẢN XUẤT CÂU HỎI (QUESTION FACTORY)
   Nhiệm vụ: Nhận data thô từ API, xác định type và nặn ra Class tương ứng
--------------------------------------------------------- */
class QuestionFactory {
    /**
     * @param {Object} rawData - Dữ liệu thô 1 dòng từ Google Sheet
     * @returns {BaseQuestion} - Đối tượng câu hỏi chuẩn
     */
    static create(rawData) {
        const type = String(rawData.type || "trac-nghiem").trim().toLowerCase();
        
        switch (type) {
            case 'trac-nghiem':
                return new MultipleChoiceQuestion(rawData);
            
            case 'dung-sai':
                return new TrueFalseQuestion(rawData);
            
            case 'tra-loi-ngan':
            case 'dien-khuyet':
                return new ShortAnswerQuestion(rawData);
                
            default:
                console.warn(`Loại câu hỏi không được hỗ trợ: ${type}. Chuyển về mặc định.`);
                return new MultipleChoiceQuestion(rawData); // Fallback
        }
    }

    /**
     * Hàm tiện ích: Chuyển nguyên mảng data thô thành mảng đối tượng
     */
    static createList(rawList) {
        if (!Array.isArray(rawList)) return [];
        return rawList.map(item => this.create(item));
    }
}
