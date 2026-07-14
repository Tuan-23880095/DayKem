/**
 * =================================================================
 * CLASS: ApiService
 * Mục đích: Quản lý toàn bộ giao tiếp giữa Frontend và Backend (Google Apps Script)
 * Áp dụng: Mẫu thiết kế Singleton (Hoặc khởi tạo 1 lần ở mức độ Global)
 * =================================================================
 */

class ApiService {
    constructor() {
        this.scriptUrl = "https://script.google.com/macros/s/AKfycbx3UhPn7K_oduq1AqOTTztO-G52OrHPK04ElZKYNIOgBQXTheRyjHd8HJW8p7uHVveF-Q/exec";
    }

    /**
     * HÀM NỘI BỘ (Private Method): Xử lý việc gọi fetch chung
     * Giúp code không bị lặp lại (Tuân thủ nguyên tắc DRY - Don't Repeat Yourself)
     */
    async _fetchData(url) {
        try {
            const response = await fetch(url);
            
            // Kiểm tra lỗi mạng (404, 500...)
            if (!response.ok) {
                throw new Error(`Lỗi kết nối mạng: HTTP ${response.status}`);
            }

            const result = await response.json();

            // Kiểm tra lỗi trả về từ Apps Script (nếu có cấu trúc báo lỗi)
            if (result.error) {
                throw new Error(result.error);
            }
            
            // Nếu backend trả về bọc trong cấu trúc { status: 200, data: [...] } (kiến trúc OOP ta bàn trước đó)
            if (result.data) {
                return result.data;
            }

            // Trả về dữ liệu trực tiếp nếu không bọc
            return result; 

        } catch (error) {
            console.error("🔥 [ApiService Error]:", error);
            throw error; // Ném lỗi ra ngoài để tầng UIManager bắt và hiển thị thông báo
        }
    }

    /**
     * 1. Lấy dữ liệu Menu (Danh sách khối, môn học, buổi học)
     * Sử dụng cho trang chủ (index.html)
     */
    async getMenuData() {
        const url = `${this.scriptUrl}?action=getMenu`;
        return await this._fetchData(url);
    }

    /**
     * 2. Lấy dữ liệu Bài học (Lý thuyết + Bài tập)
     * Sử dụng cho trang hoc-tap.html
     * @param {string} mon - Mã môn (VD: toan7)
     * @param {string} buoi - Mã buổi (VD: 01)
     */
    async getLessonDocs(mon, buoi) {
        // SỬA action=getLesson và truyền thêm docId=${mon}
        const url = `${this.scriptUrl}?action=getLesson&docId=${mon}&buoi=${buoi}`;
        return await this._fetchData(url);
    }
    /**
     * 3. Lấy dữ liệu Câu hỏi trắc nghiệm
     * Sử dụng cho tab Đấu trường Pizza trong trang hoc-tap.html
     */
    async getQuiz(mon, buoi) {
        const url = `${this.scriptUrl}?action=getQuiz&mon=${mon}&buoi=${buoi}`;
        return await this._fetchData(url);
    }

    /**
     * 4. [NÂNG CAO] Gửi kết quả thi về Google Sheet lưu lại
     * Chạy khi học sinh nhấn nộp bài
     */
    async submitQuizResult(payload) {
        try {
            const response = await fetch(this.scriptUrl, {
                method: 'POST',
                // MẸO QUAN TRỌNG VỚI GOOGLE APPS SCRIPT: 
                // Phải dùng 'text/plain' để tránh lỗi chặn CORS (Cross-Origin Resource Sharing)
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (result.status === 'error') {
                throw new Error(result.message);
            }
            return result;
        } catch (error) {
            console.error("🔥 [ApiService POST Error]:", error);
            throw error;
        }
    }
}
