document.addEventListener('DOMContentLoaded', () => {
    // 1. Lấy orderCode từ URL hoặc hidden input
    const urlParams = new URLSearchParams(window.location.search);
    let orderCode = urlParams.get('revoraOrder');
    
    if (!orderCode) {
        orderCode = urlParams.get('orderCode');
    }

    if (!orderCode) {
        orderCode = document.getElementById('initial-order-code')?.value;
    }

    // DOM Elements cho 5 States
    const stateResolving = document.getElementById('state-resolving');
    const statePolling = document.getElementById('state-polling');
    const stateSuccess = document.getElementById('state-success');
    const stateError = document.getElementById('state-error');
    const stateInterrupted = document.getElementById('state-interrupted');
    const stateNotFound = document.getElementById('state-not-found');

    const progressBar = document.getElementById('progress-bar');

    // Hàm tiện ích đổi UI State
    const showState = (stateElement) => {
        [stateResolving, statePolling, stateSuccess, stateError, stateInterrupted, stateNotFound].forEach(el => {
            if (el) {
                el.classList.add('hidden');
                el.classList.remove('flex'); // Because I used flex-col in HTML, wait, I used flex-col items-center! So I must add flex, remove hidden
            }
        });
        
        if (stateElement) {
            stateElement.classList.remove('hidden');
            stateElement.classList.add('flex');
        }
        
        // Re-render lucide icons if new DOM
        if (window.lucide) {
            window.lucide.createIcons();
        }
    };

    // Format tiền VND
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // 2. Nếu không có orderCode -> NotFound
    if (!orderCode || orderCode.trim() === '') {
        showState(stateNotFound);
        return;
    }

    // 3. Polling Logic
    const POLLING_INTERVAL = 3000; // 3s
    const MAX_POLLING_TIME = 180000; // 180s
    let pollingTime = 0;
    let pollingTimer = null;

    const stopPolling = () => {
        if (pollingTimer) {
            clearInterval(pollingTimer);
            pollingTimer = null;
        }
    };

    const handleSuccess = (data) => {
        document.getElementById('success-package-name').textContent = data.packageName || 'Gói Credit';
        document.getElementById('success-amount').textContent = formatCurrency(data.amount);
        document.getElementById('success-order-code').textContent = data.orderCode;
        showState(stateSuccess);
    };

    const handleError = (type, data) => {
        let title = 'Giao dịch thất bại';
        let desc = 'Có lỗi xảy ra trong quá trình thanh toán hoặc số tiền chuyển không chính xác.';
        
        if (type === 'expired') {
            title = 'Đơn hàng quá hạn';
            desc = 'Đã quá thời gian thanh toán cho phép (15 phút).';
        } else if (type === 'cancelled') {
            title = 'Đã hủy giao dịch';
            desc = 'Giao dịch đã bị hủy bỏ theo yêu cầu.';
        }

        document.getElementById('error-title').textContent = title;
        document.getElementById('error-desc').textContent = desc;

        if (data) {
            document.getElementById('error-order-code').textContent = data.orderCode;
        }
        showState(stateError);
    };

    const handleInterrupted = (isTimeout) => {
        document.getElementById('interrupted-title').textContent = isTimeout ? 'Quá thời gian chờ' : 'Gián đoạn kết nối';
        document.getElementById('interrupted-desc').textContent = isTimeout 
            ? 'Hệ thống chưa nhận được phản hồi từ ngân hàng. Tuy nhiên, nếu bạn đã chuyển khoản thành công, vui lòng không thanh toán lại.' 
            : 'Hệ thống đang gặp sự cố kết nối tạm thời. Vui lòng kiểm tra trạng thái giao dịch trong phần Lịch sử.';
        
        if (orderCode) {
            document.getElementById('interrupted-order-box').classList.remove('hidden');
            document.getElementById('interrupted-order-code').textContent = orderCode;
        }
        showState(stateInterrupted);
    };

    const checkPaymentStatus = async () => {
        try {
            const response = await fetch(`/Payment/GetPaymentStatus?revoraOrder=${orderCode}`);
            if (!response.ok) {
                if (response.status === 404) {
                    stopPolling();
                    showState(stateNotFound);
                    return;
                }
                throw new Error('Lỗi server');
            }

            const result = await response.json();
            
            // Nếu API wrapper chuẩn có { success: true, data: { ... } }
            if (result && result.success && result.data) {
                const data = result.data;
                
                // paymentStatus là Enum (1: Pending, 2: Successful, 3: Failed, 4: Expired, 5: Cancelled)
                if (data.paymentStatus === 2) {
                    stopPolling();
                    handleSuccess(data);
                } else if (data.paymentStatus === 5) {
                    stopPolling();
                    handleError('cancelled', data);
                } else if (data.paymentStatus === 4) {
                    stopPolling();
                    handleError('expired', data);
                } else if (data.paymentStatus === 3) {
                    stopPolling();
                    handleError('failed', data);
                } else if (data.paymentStatus === 1) {
                    // Tiếp tục chờ
                    pollingTime += POLLING_INTERVAL;
                    const progress = Math.min((pollingTime / MAX_POLLING_TIME) * 100, 100);
                    progressBar.style.width = `${progress}%`;

                    if (pollingTime >= MAX_POLLING_TIME) {
                        stopPolling();
                        handleInterrupted(true); // timeout
                    }
                }
            } else {
                // Lỗi API không có result.data
                throw new Error('Invalid API Response');
            }
        } catch (error) {
            console.error('Lỗi khi kiểm tra thanh toán:', error);
            // Có thể retry vài lần, ở đây ta timeout / lỗi mạng -> cho vào interrupted
            stopPolling();
            handleInterrupted(false); // system_error
        }
    };

    const cancelOrderAndShowError = async () => {
        try {
            await fetch(`/Payment/CancelPayment?revoraOrder=${orderCode}`, { method: 'POST' });
        } catch (e) {
            console.error('Failed to cancel order:', e);
        }
    };

    // 4. Kiểm tra URL parameter xem có phải huỷ/thất bại từ PayOS đẩy về không
    const isCancelledFromPayos = urlParams.get('cancel') === 'true' || urlParams.get('status') === 'CANCELLED';
    
    if (isCancelledFromPayos) {
        handleError('cancelled', { orderCode });
        cancelOrderAndShowError();
        return; // Dừng, không polling nữa
    }

    // 5. Bắt đầu luồng Polling nếu không bị hủy
    // Hiển thị State Polling
    showState(statePolling);
    
    // Check ngay lập tức lần đầu
    checkPaymentStatus();

    // Thiết lập Polling
    pollingTimer = setInterval(checkPaymentStatus, POLLING_INTERVAL);
});
