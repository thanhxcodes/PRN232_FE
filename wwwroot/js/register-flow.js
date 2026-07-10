document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const step1Container = document.getElementById('step-1-container');
    const step2Container = document.getElementById('step-2-container');
    const stepSubtitle = document.getElementById('step-subtitle');
    const alertBox = document.getElementById('register-alert');
    
    // Step 1 Elements
    const emailInput = document.getElementById('step1-email');
    const confirmEmailInput = document.getElementById('step1-confirm-email');
    const citySelect = document.getElementById('step1-city');
    const btnVerify = document.getElementById('btn-verify-email');
    const btnVerifyText = document.getElementById('btn-verify-text');
    const pollingStatus = document.getElementById('polling-status');

    // Step 2 Elements
    const fullnameInput = document.getElementById('step2-fullname');
    const usernameInput = document.getElementById('step2-username');
    const passwordInput = document.getElementById('step2-password');
    const confirmPasswordInput = document.getElementById('step2-confirm-password');
    const agreeCheckbox = document.getElementById('step2-agree');
    const btnRegister = document.getElementById('btn-register-final');
    const btnRegisterText = document.getElementById('btn-register-text');

    let pollingInterval = null;
    let isWaitingForVerification = false;
    let verifiedEmail = '';

    // Fetch Cities
    fetch('https://provinces.open-api.vn/api/p/')
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                data.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city.name;
                    option.textContent = city.name;
                    citySelect.appendChild(option);
                });
            }
        })
        .catch(err => console.error("Failed to fetch cities", err));

    const showError = (msg) => {
        alertBox.textContent = msg;
        alertBox.classList.remove('hidden');
    };

    const hideError = () => {
        alertBox.classList.add('hidden');
        alertBox.textContent = '';
    };

    // Step 1: Send Verification Link
    btnVerify.addEventListener('click', async () => {
        hideError();
        const email = emailInput.value.trim();
        const confirmEmail = confirmEmailInput.value.trim();
        const city = citySelect.value;

        if (!email || !confirmEmail || !city) {
            showError("Vui lòng nhập đầy đủ thông tin (Email và Tỉnh/Thành phố).");
            return;
        }

        if (email !== confirmEmail) {
            showError("Email xác nhận không khớp.");
            return;
        }

        // Email regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError("Email không hợp lệ.");
            return;
        }

        btnVerify.disabled = true;
        btnVerifyText.textContent = "Đang gửi...";

        try {
            const payload = { email: email.toLowerCase() };
            const res = await fetch('/api-proxy/auth/register/send-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            
            if (res.ok && data.success) {
                // Show polling status
                btnVerify.classList.add('hidden');
                pollingStatus.classList.remove('hidden');
                pollingStatus.classList.add('flex');
                
                isWaitingForVerification = true;
                verifiedEmail = payload.email;
                startPolling(payload.email);
            } else {
                showError(data.message || "Không thể gửi email xác thực. Có thể email đã tồn tại.");
                btnVerify.disabled = false;
                btnVerifyText.textContent = "Xác thực Email";
            }
        } catch (error) {
            console.error(error);
            showError("Lỗi kết nối đến máy chủ.");
            btnVerify.disabled = false;
            btnVerifyText.textContent = "Xác thực Email";
        }
    });

    const startPolling = (email) => {
        if (pollingInterval) clearInterval(pollingInterval);
        
        pollingInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api-proxy/auth/register/check-status?email=${encodeURIComponent(email)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.data && data.data.verified) {
                        clearInterval(pollingInterval);
                        isWaitingForVerification = false;
                        transitionToStep2();
                    }
                }
            } catch (err) {
                // Ignore network errors during polling
            }
        }, 3000);
    };

    const transitionToStep2 = () => {
        hideError();
        step1Container.classList.add('hidden');
        step2Container.classList.remove('hidden');
        stepSubtitle.textContent = "Bước 2: Hoàn tất thông tin";
    };

    // Step 2: Final Registration
    btnRegister.addEventListener('click', async () => {
        hideError();
        const fullname = fullnameInput.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const city = citySelect.value;
        
        if (!fullname || !username || !password || !confirmPassword) {
            showError("Vui lòng điền đầy đủ thông tin.");
            return;
        }

        if (password.length < 6) {
            showError("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }

        if (password !== confirmPassword) {
            showError("Mật khẩu xác nhận không khớp.");
            return;
        }

        if (!agreeCheckbox.checked) {
            showError("Vui lòng đồng ý với Điều khoản dịch vụ.");
            return;
        }

        btnRegister.disabled = true;
        btnRegisterText.textContent = "Đang xử lý...";

        try {
            const payload = {
                email: verifiedEmail,
                fullName: fullname,
                username: username,
                password: password,
                city: city
            };

            const res = await fetch('/api-proxy/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            
            if (res.ok && data.success) {
                // Redirect to login using SweetAlert or direct
                Swal.fire({
                    title: 'Đăng ký thành công!',
                    text: 'Chào mừng bạn đến với REVORA.',
                    icon: 'success',
                    confirmButtonText: 'Đăng nhập ngay',
                    confirmButtonColor: '#108A4D'
                }).then(() => {
                    window.location.href = '/Auth/Login';
                });
            } else {
                showError(data.message || "Đăng ký thất bại. Tên đăng nhập có thể đã tồn tại.");
                btnRegister.disabled = false;
                btnRegisterText.textContent = "Đăng Ký";
            }
        } catch (error) {
            console.error(error);
            showError("Lỗi kết nối máy chủ.");
            btnRegister.disabled = false;
            btnRegisterText.textContent = "Đăng Ký";
        }
    });

    // Cleanup interval on page unload
    window.addEventListener('beforeunload', () => {
        if (pollingInterval) clearInterval(pollingInterval);
    });
});
