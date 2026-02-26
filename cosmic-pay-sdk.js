/* cosmic-pay-sdk.js */
(function(window) {
    'use strict';

    // 存储前缀，必须与宇宙支付主程序一致
    const STORAGE_PREFIX = 'cosmicpay_';
    const USER_KEY_PREFIX = STORAGE_PREFIX + 'user_';
    const CURRENT_USER_KEY = STORAGE_PREFIX + 'currentUser';
    const VIP_KEY = STORAGE_PREFIX + 'vip_music_status';

    // 获取当前登录用户
    function getLoggedUser() {
        const cardNumber = localStorage.getItem(CURRENT_USER_KEY);
        if (!cardNumber) return null;
        const userDataStr = localStorage.getItem(USER_KEY_PREFIX + cardNumber);
        if (!userDataStr) return null;
        try {
            return JSON.parse(userDataStr);
        } catch (e) {
            return null;
        }
    }

    // 保存用户数据
    function saveUser(user) {
        if (!user || !user.cardNumber) return;
        localStorage.setItem(USER_KEY_PREFIX + user.cardNumber, JSON.stringify(user));
    }

    const CosmicPay = {
        // 1. 检查VIP状态
        isVIP: function() {
            return localStorage.getItem(VIP_KEY) === 'activated';
        },

        // 2. 获取钱包信息
        getWalletInfo: function() {
            const user = getLoggedUser();
            if (!user) return { logged: false };
            return {
                logged: true,
                name: user.name,
                balance: user.balance || 0,
                cardNumber: user.cardNumber
            };
        },

        // 3. 发起支付 (直接扣款)
        pay: function(options) {
            const { amount, title, onSuccess, onFail } = options;
            const user = getLoggedUser();
            
            if (!user) {
                if (confirm('您尚未登录宇宙支付钱包，是否现在跳转登录？')) {
                    window.location.href = 'pay.html'; 
                }
                return;
            }

            this.showPayModal({
                user: user,
                amount: amount,
                title: title,
                onConfirm: (password) => {
                    if (user.payPassword !== password) {
                        onFail && onFail('支付密码错误');
                        return false;
                    }
                    if (user.balance < amount) {
                        onFail && onFail('余额不足，请前往钱包充值');
                        return false;
                    }

                    // 执行扣款
                    user.balance -= amount;
                    if (!user.transactions) user.transactions = [];
                    user.transactions.unshift({
                        id: Date.now(),
                        type: 'expense',
                        title: title || '音乐VIP会员',
                        amount: amount,
                        time: new Date().toISOString()
                    });
                    saveUser(user);
                    localStorage.setItem(VIP_KEY, 'activated');
                    onSuccess && onSuccess();
                    return true;
                }
            });
        },

        // 4. 支付弹窗UI
        showPayModal: function(options) {
            const { user, amount, title, onConfirm } = options;
            const oldModal = document.getElementById('cosmic-pay-modal');
            if (oldModal) oldModal.remove();

            const modalHTML = `
                <div id="cosmic-pay-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 99999; display: flex; align-items: center; justify-content: center; font-family: 'Noto Sans SC', sans-serif;">
                    <div style="background: #fff; padding: 30px; border-radius: 20px; width: 90%; max-width: 400px; text-align: center; color: #333; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3498db, #2980b9); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>
                        </div>
                        <h3 style="margin: 0 0 5px; font-size: 22px; color: #2c3e50;">确认支付</h3>
                        <p style="color: #7f8c8d; margin-bottom: 20px; font-size: 14px;">商户：${title || '音乐VIP会员'}</p>
                        
                        <div style="font-size: 32px; font-weight: bold; color: #e74c3c; margin-bottom: 20px;">
                            ¥ <span id="modal-amount">${amount.toFixed(2)}</span>
                        </div>

                        <div style="background: #f8f9fa; padding: 15px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #eee; text-align: left; font-size: 13px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #7f8c8d;">付款账户</span>
                                <span style="font-weight: 500;">宇宙银行卡 (**** ${user.cardNumber.slice(-4)})</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #7f8c8d;">当前余额</span>
                                <span style="color: #27ae60; font-weight: 500;">¥ ${user.balance.toFixed(2)}</span>
                            </div>
                        </div>

                        <div style="background: #f8f9fa; padding: 15px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #eee;">
                            <input type="password" id="modal-password-input" placeholder="请输入支付密码" style="width: 100%; border: 1px solid #ddd; padding: 12px; border-radius: 8px; box-sizing: border-box; font-size: 16px; text-align: center; letter-spacing: 5px; outline: none;">
                        </div>

                        <div style="color: #e74c3c; font-size: 12px; margin-bottom: 15px; height: 15px;" id="modal-error"></div>

                        <button id="modal-confirm-btn" style="width: 100%; background: linear-gradient(135deg, #3498db, #2980b9); color: white; border: none; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; margin-bottom: 12px; transition: opacity 0.2s;">
                            确认付款
                        </button>
                        <button id="modal-cancel-btn" style="background: transparent; border: none; color: #95a5a6; cursor: pointer; font-size: 13px; padding: 5px;">
                            取消
                        </button>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            const modal = document.getElementById('cosmic-pay-modal');
            const pwdInput = document.getElementById('modal-password-input');
            const confirmBtn = document.getElementById('modal-confirm-btn');
            const cancelBtn = document.getElementById('modal-cancel-btn');
            const errorDiv = document.getElementById('modal-error');

            pwdInput.focus();

            confirmBtn.onclick = () => {
                const pwd = pwdInput.value;
                if (!pwd) { errorDiv.textContent = '请输入支付密码'; return; }
                const result = onConfirm(pwd);
                if (result) modal.remove();
            };

            cancelBtn.onclick = () => modal.remove();
        }
    };

    window.CosmicPay = CosmicPay;

})(window);
