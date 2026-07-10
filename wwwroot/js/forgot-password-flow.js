document.addEventListener('DOMContentLoaded', () => {
    // Containers
    const step1Container = document.getElementById('step-1-container');
    const step2Container = document.getElementById('step-2-container');
    const step3Container = document.getElementById('step-3-container');
    const stepTitle = document.getElementById('step-title');
    const stepSubtitle = document.getElementById('step-subtitle');
    const alertBox = document.getElementById('forgot-alert');

    // Step 1
    const emailInput = document.getElementById('step1-email');
    const btnSendOtp = document.getElementById('btn-send-otp');
    const btnSendOtpText = document.getElementById('btn-send-otp-text');

    // Step 2
    const otpInputs = document.querySelectorAll('#otp-inputs input');
    const btnVerifyOtp = document.getElementById('btn-verify-otp');
    const btnVerifyOtpText = document.getElementById('btn-verify-otp-text');
    const btnResendOtp = document.getElementById('btn-resend-otp');

    // Step 3
    const passwordInput = document.getElementById('step3-password');
    const confirmPasswordInput = document.getElementById('step3-confirm-password');
    const btnResetPassword = document.getElementById('btn-reset-password');
    const btnResetPasswordText = document.getElementById('btn-reset-password-text');

    let currentEmail = '';
    let currentOtp = '';

    const showError = (msg) => {
        alertBox.textContent = msg;
        alertBox.classList.remove('hidden');
    };

    const hideError = () => {
        alertBox.classList.add('hidden');
        alertBox.textContent = '';
    };

    // --- OTP Input Logic ---
    otpInputs.forEach((input, index) => {
        // Only allow numbers
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            if (/[^0-9]/.test(val)) {
                e.target.value = val.replace(/[^0-9]/g, '');
                return;
            }
            if (val !== '' && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
            checkOtpReady();
        });

        // Handle backspace
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                otpInputs[index - 1].focus();
            }
        });

        // Handle paste
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
            if (pastedData) {
                for (let i = 0; i < pastedData.length; i++) {
                    if (otpInputs[i]) {
                        otpInputs[i].value = pastedData[i];
                    }
                }
                if (pastedData.length < 6) {
                    otpInputs[pastedData.length].focus();
                } else {
                    otpInputs[5].focus();
                }
                checkOtpReady();
            }
        });
    });

    const getOtpValue = () => {
        return Array.from(otpInputs).map(i => i.value).join('');
    };

    const checkOtpReady = () => {
        if (getOtpValue().length === 6) {
            btnVerifyOtp.classList.remove('bg-[#9ca3af]');
            btnVerifyOtp.classList.add('bg-[#108A4D]');
        } else {
            btnVerifyOtp.classList.remove('bg-[#108A4D]');
            btnVerifyOtp.classList.add('bg-[#9ca3af]');
        }
    };

    const enableButton = (btnId) => {
        const btn = document.getElementById(btnId);
        btn.classList.remove('bg-[#9ca3af]');
        btn.classList.add('bg-[#108A4D]');
    }

    emailInput.addEventListener('input', () => {
        if (emailInput.value.trim() !== '') {
            enableButton('btn-send-otp');
        }
    });

    // --- Step 1: Send OTP ---
    const sendOtp = async (isResend = false) => {
        hideError();
        const email = emailInput.value.trim();
        
        if (!email) {
            showError("Vui lòng nhập email.");
            return;
        }

        if (!isResend) {
            btnSendOtp.disabled = true;
            btnSendOtpText.textContent = "Đang gửi...";
        } else {
            btnResendOtp.disabled = true;
            btnResendOtp.textContent = "Đang gửi lại...";
        }

        try {
            const payload = { email: email.toLowerCase() };
            const res = await fetch('/api-proxy/auth/forgot-password/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            
            if (res.ok && data.success) {
                currentEmail = payload.email;
                if (!isResend) {
                    step1Container.classList.add('hidden');
                    step2Container.classList.remove('hidden');
                    stepTitle.textContent = "Xác Thực OTP";
                    stepSubtitle.textContent = "Nhập mã OTP đã gửi đến email";
                    otpInputs[0].focus();
                } else {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Đã gửi lại mã OTP',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            } else {
                showError(data.message || "Không thể gửi OTP. Vui lòng kiểm tra lại email.");
            }
        } catch (error) {
            console.error(error);
            showError("Lỗi kết nối máy chủ.");
        } finally {
            if (!isResend) {
                btnSendOtp.disabled = false;
                btnSendOtpText.textContent = "Tiếp Tục";
            } else {
                btnResendOtp.disabled = false;
                btnResendOtp.textContent = "Gửi lại mã OTP";
            }
        }
    };

    btnSendOtp.addEventListener('click', () => sendOtp(false));
    btnResendOtp.addEventListener('click', () => sendOtp(true));

    // --- Step 2: Verify OTP ---
    btnVerifyOtp.addEventListener('click', async () => {
        hideError();
        const otp = getOtpValue();
        
        if (otp.length !== 6) {
            showError("Vui lòng nhập đủ 6 số OTP.");
            return;
        }

        btnVerifyOtp.disabled = true;
        btnVerifyOtpText.textContent = "Đang kiểm tra...";

        try {
            const payload = { 
                email: currentEmail,
                otp: otp 
            };
            const res = await fetch('/api-proxy/auth/forgot-password/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            
            if (res.ok && data.success) {
                currentOtp = otp;
                step2Container.classList.add('hidden');
                step3Container.classList.remove('hidden');
                stepTitle.textContent = "Đặt Lại Mật Khẩu";
                stepSubtitle.textContent = "Vui lòng nhập mật khẩu mới của bạn";
                passwordInput.focus();
            } else {
                showError(data.message || "Mã OTP không hợp lệ hoặc đã hết hạn.");
            }
        } catch (error) {
            console.error(error);
            showError("Lỗi kết nối máy chủ.");
        } finally {
            btnVerifyOtp.disabled = false;
            btnVerifyOtpText.textContent = "Xác Thực";
        }
    });

    // --- Step 3: Reset Password ---
    btnResetPassword.addEventListener('click', async () => {
        hideError();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (!password || !confirmPassword) {
            showError("Vui lòng nhập mật khẩu mới.");
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

        btnResetPassword.disabled = true;
        btnResetPasswordText.textContent = "Đang cập nhật...";

        try {
            const payload = { 
                email: currentEmail,
                otp: currentOtp,
                newPassword: password
            };
            const res = await fetch('/api-proxy/auth/forgot-password/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            
            if (res.ok && data.success) {
                Swal.fire({
                    title: 'Thành công!',
                    text: 'Mật khẩu của bạn đã được đặt lại.',
                    icon: 'success',
                    confirmButtonText: 'Đăng nhập ngay',
                    confirmButtonColor: '#108A4D'
                }).then(() => {
                    window.location.href = '/Auth/Login';
                });
            } else {
                showError(data.message || "Không thể đặt lại mật khẩu.");
            }
        } catch (error) {
            console.error(error);
            showError("Lỗi kết nối máy chủ.");
        } finally {
            btnResetPassword.disabled = false;
            btnResetPasswordText.textContent = "Cập Nhật Mật Khẩu";
        }
    });
});
