class ApiService {
    constructor() {
        // Vẫn giữ link này để lấy danh sách bài học (Menu) cho trang chủ
        this.scriptUrl = "https://script.google.com/macros/s/AKfycbx3UhPn7K_oduq1AqOTTztO-G52OrHPK04ElZKYNIOgBQXTheRyjHd8HJW8p7uHVveF-Q/exec";
    }

    async getMenuData() {
        try {
            const response = await fetch(`${this.scriptUrl}?action=getMenu`);
            const result = await response.json();
            return result.data || result;
        } catch (error) {
            throw new Error("Lỗi tải Menu từ Google Sheet.");
        }
    }

    /**
     * TÍNH NĂNG MỚI: Tải nội dung bài học trực tiếp từ file HTML trên Github
     */
    async getLessonDocs(mon, buoi) {
        try {
            // Giả định bạn tạo thư mục tên là 'data' để chứa các file html này cho gọn.
            // VD đường dẫn: data/toan6-01-lythuyet.html
            const lyThuyetUrl = `data/${mon}-${buoi}-lythuyet.html`;
            const baiTapUrl = `data/${mon}-${buoi}-baitap.html`;

            // Tải song song 2 file cùng lúc để tăng tốc
            const [ltResponse, btResponse] = await Promise.all([
                fetch(lyThuyetUrl),
                fetch(baiTapUrl)
            ]);

            // Trích xuất văn bản HTML, nếu không tìm thấy file thì báo lỗi nhẹ nhàng
            let lythuyet = ltResponse.ok ? await ltResponse.text() : `<div class="text-center text-slate-400 py-10 italic">Nội dung lý thuyết chưa được cập nhật...</div>`;
            let baitap = btResponse.ok ? await btResponse.text() : `<div class="text-center text-slate-400 py-10 italic">Phiếu bài tập chưa được cập nhật...</div>`;

            return { lythuyet, baitap };

        } catch (error) {
            console.error("Lỗi tải file tĩnh:", error);
            throw new Error("Không thể đọc tệp tài liệu bài học trong hệ thống.");
        }
    }
}
