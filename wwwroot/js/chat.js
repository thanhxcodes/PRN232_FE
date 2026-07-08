"use strict";

const config = window.globalConfig || window.chatConfig || { accessToken: null, currentUserId: 0, apiBaseUrl: '', hubUrl: '' };
let currentChat = null;
let conversations = [];
let messages = [];

// New States
let editingMsgId = null;
let attachedProduct = null;
let openConvDropdown = null;
let openMsgDropdown = null;

// Elements
const elList = document.getElementById("conversation-list");
const elMessages = document.getElementById("chat-messages");
const elPlaceholder = document.getElementById("chat-placeholder");
const elActive = document.getElementById("chat-active");
const elHeaderName = document.getElementById("chat-header-name");
const elHeaderAvatar = document.getElementById("chat-header-avatar");
const btnSend = document.getElementById("btn-send-message");
const inputTextArea = document.getElementById("chat-input-textarea");
const searchInput = document.getElementById("search-input");

const elAttachedContainer = document.getElementById("attached-product-container");
const elAttachedImg = document.getElementById("attached-product-image");
const elAttachedName = document.getElementById("attached-product-name");
const elAttachedPrice = document.getElementById("attached-product-price");
const btnRemoveProduct = document.getElementById("btn-remove-product");
const elEditAlert = document.getElementById("edit-alert");
const btnCancelEdit = document.getElementById("btn-cancel-edit");
const fileInput = document.getElementById("chat-file-input");
const btnUploadImage = document.getElementById("btn-upload-image");
const iconSend = document.getElementById("icon-send");
const iconEditSubmit = document.getElementById("icon-edit-submit");
const btnBackChat = document.getElementById("btn-back-chat");
const sidebar = document.getElementById("chat-sidebar");

// --- API Helpers ---
async function fetchApi(endpoint, method = "GET", body = null) {
    const headers = { "Content-Type": "application/json" };
    if (config.accessToken) {
        headers["Authorization"] = `Bearer ${config.accessToken}`;
    }
    const res = await fetch(`${config.apiBaseUrl}${endpoint}`, {
        method, headers, body: body ? JSON.stringify(body) : null
    });
    return await res.json();
}

async function loadConversations() {
    try {
        const res = await fetchApi("/Chat/conversations");
        if (res.success) {
            const apiConvs = res.data;
            // Giữ lại các fake conversation nếu API chưa trả về
            const tempConvs = conversations.filter(c => c.conversationId < 0 && !apiConvs.find(a => a.partner.userId === c.partner.userId));
            conversations = [...tempConvs, ...apiConvs];
            renderConversations();
            
            if (window.updateGlobalChatBadge) {
                const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
                window.updateGlobalChatBadge(totalUnread);
            }
        }
    } catch (e) {
        console.error("Failed to load conversations", e);
    }
}

async function loadMessages(partnerId) {
    try {
        const res = await fetchApi(`/Chat/${partnerId}/messages`);
        if (res.success) {
            messages = res.data;
            renderMessages();
            scrollToBottom();
            
            // Hydrate products if backend only returns productRefId
            let needsRerender = false;
            await Promise.all(messages.map(async (msg) => {
                if (msg.productRefId && !msg.product) {
                    try {
                        const pRes = await fetchApi(`/Products/${msg.productRefId}`);
                        const prod = pRes.data || pRes;
                        const prodId = prod.id || prod.productId;
                        if (prod && prodId) {
                            msg.product = {
                                id: prodId,
                                name: prod.name || prod.title,
                                price: prod.price ? prod.price.toLocaleString('vi-VN') + 'đ' : 'Liên hệ',
                                image: prod.imageUrl || (prod.imageUrls && prod.imageUrls.length > 0 ? prod.imageUrls[0] : '') || prod.mainImage || (prod.images && prod.images.length > 0 ? prod.images[0].url : '')
                            };
                            needsRerender = true;
                        }
                    } catch(e) {}
                }
            }));
            
            if (needsRerender) {
                renderMessages();
                scrollToBottom();
            }
        }
    } catch (e) {
        console.error("Failed to load messages", e);
    }
}

async function sendMessage() {
    const text = inputTextArea.value.trim();
    if (!text || !currentChat) return;

    if (editingMsgId) {
        try {
            const res = await fetchApi(`/Chat/message/${editingMsgId}`, "PUT", { content: text });
            if (res.success) {
                const idx = messages.findIndex(m => m.id === editingMsgId);
                if (idx !== -1) messages[idx] = res.data;
                cancelEdit();
                renderMessages();
                loadConversations();
            }
        } catch (e) {
            console.error("Sửa tin nhắn lỗi", e);
        }
        return;
    }

    const payload = {
        receiverId: currentChat.partner.userId,
        content: text
    };
    if (attachedProduct) {
        payload.productRefId = attachedProduct.id;
    }

    const attachedProductTemp = attachedProduct;
    inputTextArea.value = "";
    attachedProduct = null;
    renderAttachedProduct();

    if (btnSend) btnSend.disabled = true;
    if (iconSend) iconSend.classList.add('opacity-50');

    try {
        const res = await fetchApi("/Chat/send", "POST", payload);
        if (res.success) {
            const exists = messages.find(m => m.id === res.data.id);
            if (!exists) {
                if (attachedProductTemp && !res.data.product) {
                    res.data.product = attachedProductTemp;
                }
                messages.push(res.data);
                renderMessages();
                setTimeout(() => elMessages.scrollTop = elMessages.scrollHeight, 50);
            } else if (attachedProductTemp && !exists.product) {
                exists.product = attachedProductTemp;
                renderMessages();
                setTimeout(() => elMessages.scrollTop = elMessages.scrollHeight, 50);
            }
            loadConversations();
        }
    } catch (e) {
        console.error("Failed to send message", e);
    } finally {
        toggleSendButtonState();
    }
}

// --- Menu actions ---
window.toggleConvDropdown = function(e, id) {
    e.stopPropagation();
    openConvDropdown = openConvDropdown === id ? null : id;
    renderConversations();
}

window.toggleMsgDropdown = function(e, id) {
    e.stopPropagation();
    openMsgDropdown = openMsgDropdown === id ? null : id;
    renderMessages();
}

document.addEventListener('click', () => {
    if (openConvDropdown || openMsgDropdown) {
        openConvDropdown = null;
        openMsgDropdown = null;
        renderConversations();
        renderMessages();
    }
});

window.markAsUnread = async function(e, partnerId) {
    e.stopPropagation();
    openConvDropdown = null;
    try {
        await fetchApi(`/Chat/${partnerId}/unread`, "POST");
        loadConversations();
    } catch(e) {}
}

window.revokeMessage = async function(msgId) {
    openMsgDropdown = null;
    try {
        const res = await fetchApi(`/Chat/message/${msgId}/revoke`, "POST");
        if (res.success) {
            const index = messages.findIndex(m => m.id === msgId);
            if (index !== -1) messages[index] = res.data;
            renderMessages();
            loadConversations();
        }
    } catch(e) {}
}

window.startEditMessage = function(msgId, text) {
    openMsgDropdown = null;
    editingMsgId = msgId;
    inputTextArea.value = text;
    elEditAlert.classList.remove('hidden');
    iconSend.classList.add('hidden');
    iconEditSubmit.classList.remove('hidden');
    inputTextArea.focus();
    toggleSendButtonState();
}

function cancelEdit() {
    editingMsgId = null;
    inputTextArea.value = '';
    elEditAlert.classList.add('hidden');
    iconSend.classList.remove('hidden');
    iconEditSubmit.classList.add('hidden');
    toggleSendButtonState();
}
btnCancelEdit?.addEventListener('click', cancelEdit);

// --- Render Helpers ---
function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function renderAttachedProduct() {
    if (attachedProduct) {
        elAttachedContainer.classList.remove("hidden");
        elAttachedImg.src = attachedProduct.image || '';
        elAttachedName.innerText = attachedProduct.name;
        elAttachedPrice.innerText = attachedProduct.price;
    } else {
        elAttachedContainer.classList.add('hidden');
    }
    toggleSendButtonState();
}
btnRemoveProduct?.addEventListener('click', () => {
    attachedProduct = null;
    renderAttachedProduct();
    toggleSendButtonState();
});

function renderConversations() {
    if (!elList) return;
    if (conversations.length === 0) {
        elList.innerHTML = `<div class="p-8 text-center text-gray-400">
            <i data-lucide="message-circle" class="w-12 h-12 mx-auto mb-3 text-gray-300"></i>
            <p>Không có cuộc trò chuyện nào</p>
        </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    const filterText = searchInput ? searchInput.value.toLowerCase() : "";
    const filtered = conversations.filter(c => c.partner.fullName.toLowerCase().includes(filterText));

    elList.innerHTML = filtered.map(conv => {
        const isActive = currentChat && currentChat.conversationId === conv.conversationId;
        const partnerName = conv.partner.fullName || 'User';
        const avatarInitial = partnerName.charAt(0).toUpperCase();
        const avatarUrl = conv.partner.avatarUrl && conv.partner.avatarUrl !== "U" ? conv.partner.avatarUrl : null;
        
        const avatarHtml = avatarUrl 
            ? `<img src="${avatarUrl}" class="h-full w-full object-cover" />`
            : avatarInitial;

        const lastMsgTime = formatTime(conv.lastMessageAt);
        const lastMsgContent = conv.lastMessage?.senderId === config.currentUserId 
            ? `Bạn: ${conv.lastMessage?.isRevoked ? 'Đã thu hồi một tin nhắn' : (conv.lastMessage?.content || 'Hình ảnh')}` 
            : (conv.lastMessage?.isRevoked ? 'Đã thu hồi một tin nhắn' : (conv.lastMessage?.content || 'Hình ảnh đính kèm'));

        return `
        <div class="relative group">
            <button type="button" onclick="openChat(${conv.partner.userId})" class="flex w-full items-center gap-3.5 rounded-3xl p-3.5 text-left transition-all ${isActive ? 'bg-[#EBF4F0] text-gray-900' : 'bg-white text-gray-900 hover:bg-gray-50'}">
                <div class="relative shrink-0">
                    <div class="h-14 w-14 overflow-hidden rounded-full flex items-center justify-center font-bold text-xl bg-gray-200 text-gray-600">
                        ${avatarHtml}
                    </div>
                    <span class="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 bg-emerald-400 ${isActive ? 'border-[#EBF4F0]' : 'border-white'}"></span>
                </div>
                <div class="min-w-0 flex-1 pr-4">
                    <div class="flex items-baseline justify-between gap-2">
                        <span class="truncate font-semibold">${partnerName}</span>
                        <span class="shrink-0 text-xs text-gray-500">${lastMsgTime}</span>
                    </div>
                    <div class="mt-0.5 flex items-center justify-between gap-2">
                        <p class="truncate text-sm text-gray-500">${lastMsgContent}</p>
                        ${conv.unreadCount > 0 ? `<span class="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold ${isActive ? 'bg-emerald-400 text-[#2D5A3D]' : 'bg-[#C4603A] text-white'}">${conv.unreadCount > 9 ? '9+' : conv.unreadCount}</span>` : ''}
                    </div>
                </div>
            </button>

            <!-- Dropdown -->
            <div class="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center">
                <button onclick="toggleConvDropdown(event, ${conv.conversationId})" class="p-1.5 rounded-full transition-colors bg-white shadow-sm border border-gray-100 ${isActive ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'} ${openConvDropdown === conv.conversationId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${conv.unreadCount > 0 ? 'hidden group-hover:flex' : 'flex'}">
                    <i data-lucide="more-horizontal" class="w-5 h-5"></i>
                </button>
                ${openConvDropdown === conv.conversationId ? `
                <div class="absolute right-0 top-full mt-3 w-[240px] z-50 drop-shadow-[0_8px_24px_rgba(0,0,0,0.12)]" onclick="event.stopPropagation()">
                    <div class="absolute -top-[6px] right-[10px] w-[14px] h-[14px] bg-white border-l border-t border-gray-100 rotate-45 rounded-tl-[2px] z-30"></div>
                    <div class="relative z-20 bg-white border border-gray-100 rounded-2xl overflow-hidden py-2">
                        <button onclick="markAsUnread(event, ${conv.partner.userId})" class="w-full text-left px-5 py-3 text-[15px] font-medium text-gray-800 hover:bg-gray-50 flex items-center gap-3.5 transition-colors">
                            <i data-lucide="mail" class="w-[22px] h-[22px] text-gray-900"></i> Đánh dấu là chưa đọc
                        </button>
                        <a href="/Profile?id=${conv.partner.userId}" class="w-full text-left px-5 py-3 text-[15px] font-medium text-gray-800 hover:bg-gray-50 flex items-center gap-3.5 transition-colors">
                            <i data-lucide="circle-user" class="w-[22px] h-[22px] text-gray-900"></i> Xem trang cá nhân
                        </a>
                    </div>
                </div>` : ''}
            </div>
        </div>`;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

function renderMessages() {
    if (!elMessages) return;
    const todayBanner = `<div class="flex justify-center mb-6">
        <span class="rounded-full bg-gray-200/50 px-3 py-1 text-xs font-medium text-gray-500 backdrop-blur-sm">Hôm nay</span>
    </div>`;

    let lastReadMsgId = null;
    let lastSentMsgId = null;
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.senderId === config.currentUserId) {
            if (!lastSentMsgId) lastSentMsgId = m.id;
            if (m.read && !lastReadMsgId) lastReadMsgId = m.id;
        }
        if (lastSentMsgId && lastReadMsgId) break;
    }

    const msgsHtml = messages.map((msg, idx) => {
        const isMe = msg.senderId === config.currentUserId;
        const prevMsg = messages[idx - 1];
        const showAvatar = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId);
        
        const avatarInitial = currentChat.partner.fullName.charAt(0).toUpperCase();
        const avatarUrl = currentChat.partner.avatarUrl && currentChat.partner.avatarUrl !== "U" ? currentChat.partner.avatarUrl : null;
        const avatarHtml = avatarUrl ? `<img src="${avatarUrl}" class="h-full w-full object-cover" />` : avatarInitial;

        let productHtml = '';
        if (msg.product) {
            productHtml = `
            <a href="/Products/Details?id=${msg.product.id}" class="block mb-2.5 flex gap-3 relative pl-3 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-[#E2A62C] before:rounded-full hover:opacity-80 transition-opacity">
                <img src="${msg.product.image}" class="w-12 h-12 rounded-md object-cover bg-white flex-shrink-0 border border-black/5" />
                <div class="min-w-0 flex flex-col justify-center">
                    <h4 class="text-[14px] font-semibold text-gray-900 line-clamp-2 leading-snug">${msg.product.name}</h4>
                    <p class="text-[13px] font-bold text-[#2D5A3D] mt-0.5">${msg.product.price}</p>
                </div>
            </a>`;
        }

        let imgHtml = '';
        if (msg.imageUrl) {
            imgHtml = `<img src="${msg.imageUrl}" class="max-w-sm w-full rounded-xl mb-2 object-cover border border-black/5" />`;
        }

        let statusHtml = '';
        if (isMe) {
            if (msg.id === lastReadMsgId) {
                statusHtml = `<span class="text-gray-400">|</span><span>Đã đọc <i data-lucide="check-circle-2" class="w-3 h-3 inline text-[#2D5A3D]"></i></span>`;
            } else if (msg.id === lastSentMsgId && !msg.read) {
                statusHtml = `<span class="text-gray-400">|</span><span>Đã gửi</span>`;
            }
        }

        return `
        <div class="flex w-full gap-3 ${isMe ? 'justify-end' : 'justify-start'} group">
            ${!isMe ? `
            <div class="shrink-0 self-start ${showAvatar ? 'h-9 w-9 overflow-hidden rounded-full font-bold flex items-center justify-center bg-gray-200 text-gray-600' : 'w-9'}">
                ${showAvatar ? avatarHtml : ''}
            </div>` : ''}

            ${isMe && !msg.isRevoked ? `
            <div class="relative opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-center">
                <button onclick="toggleMsgDropdown(event, ${msg.id})" class="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-200">
                    <i data-lucide="more-vertical" class="w-4 h-4"></i>
                </button>
                ${openMsgDropdown === msg.id ? `
                <div class="absolute right-0 bottom-full mb-1 w-36 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50 py-1">
                    <button onclick="startEditMessage(${msg.id}, '${(msg.text || '').replace(/'/g, "\\'")}')" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i> Sửa
                    </button>
                    <button onclick="revokeMessage(${msg.id})" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <i data-lucide="ban" class="w-3.5 h-3.5"></i> Thu hồi
                    </button>
                </div>` : ''}
            </div>` : ''}
            
            <div class="max-w-[72%] ${isMe ? 'items-end flex flex-col' : 'items-start'}">
                ${msg.isRevoked ? `
                <div class="rounded-3xl rounded-br-md px-4 py-3 text-[15px] border border-gray-200 text-gray-400 italic bg-transparent mb-1 shadow-sm">
                    Tin nhắn đã bị thu hồi
                </div>` : `
                ${imgHtml ? `<div class="mb-1">${imgHtml}</div>` : ''}
                ${productHtml ? `<div class="mb-1 rounded-2xl px-4 py-3 shadow-sm ${isMe ? 'rounded-tr-sm bg-[#EBF4F0]' : 'rounded-tl-sm border border-gray-200 bg-white'}">${productHtml}</div>` : ''}
                ${(msg.text && msg.text !== '📷 Hình ảnh đính kèm') ? `
                <div class="rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${isMe ? 'rounded-tr-sm bg-[#EBF4F0] text-gray-900 inline-block' : 'rounded-tl-sm border border-gray-200 bg-white text-gray-900'}">
                    <p class="whitespace-pre-wrap">${msg.text}</p>
                </div>` : ''}
                <div class="mt-1 flex items-center gap-1.5 text-[11px] text-gray-500 ${isMe ? 'justify-end' : 'justify-start'}">
                    <span>${msg.time || ''}</span>
                    ${statusHtml}
                </div>`}
            </div>
        </div>`;
    }).join('');

    elMessages.innerHTML = todayBanner + msgsHtml;
    if (window.lucide) lucide.createIcons();
}

function scrollToBottom() {
    if (elMessages) {
        elMessages.scrollTop = elMessages.scrollHeight;
    }
}

window.openChat = function(partnerId) {
    currentChat = conversations.find(c => c.partner.userId === partnerId);
    if (!currentChat) return;

    elPlaceholder.classList.add("hidden");
    elActive.classList.remove("hidden");
    elActive.classList.add("flex");
    
    // Mobile UX
    sidebar.classList.remove("flex");
    sidebar.classList.add("hidden");
    sidebar.classList.add("md:flex"); // giữ cho md

    const partnerName = currentChat.partner.fullName || 'User';
    elHeaderName.innerText = partnerName;
    const avatarUrl = currentChat.partner.avatarUrl && currentChat.partner.avatarUrl !== "U" ? currentChat.partner.avatarUrl : null;
    elHeaderAvatar.innerHTML = avatarUrl ? `<img src="${avatarUrl}" class="h-full w-full object-cover" />` : partnerName.charAt(0).toUpperCase();

    renderConversations(); // update active state
    loadMessages(partnerId);

    // mark as read
    fetchApi(`/Chat/${partnerId}/read`, "POST").then(() => {
        loadConversations();
    });
}

// Mobile Back
btnBackChat?.addEventListener('click', () => {
    currentChat = null;
    elPlaceholder.classList.remove("hidden");
    elActive.classList.add("hidden");
    elActive.classList.remove("flex");
    sidebar.classList.remove("hidden");
    sidebar.classList.add("flex");
    renderConversations();
});

// --- Events ---
function toggleSendButtonState() {
    if (!btnSend) return;
    const hasText = inputTextArea && inputTextArea.value.trim().length > 0;
    const hasAttachment = attachedProduct != null;
    
    // Chỉ cần thay đổi thuộc tính disabled, Tailwind sẽ lo phần màu sắc
    if (hasText || hasAttachment) {
        btnSend.disabled = false;
    } else {
        btnSend.disabled = true;
    }
}

inputTextArea?.addEventListener("input", toggleSendButtonState);

btnSend?.addEventListener("click", sendMessage);
inputTextArea?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
searchInput?.addEventListener("input", renderConversations);

// Upload Image
btnUploadImage?.addEventListener("click", () => fileInput.click());
fileInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !currentChat || editingMsgId) return;
    
    const formData = new FormData();
    formData.append('files', file);
    
    try {
        const headers = {};
        if (config.accessToken) headers["Authorization"] = `Bearer ${config.accessToken}`;
        const res = await fetch(`${config.apiBaseUrl}/Media/upload-images`, {
            method: 'POST',
            headers,
            body: formData
        });
        const data = await res.json();
        
        if (data.success && data.urls && data.urls.length > 0) {
            const imageUrl = data.urls[0];
            const msgRes = await fetchApi("/Chat/send", "POST", {
                receiverId: currentChat.partner.userId,
                content: "📷 Hình ảnh đính kèm",
                attachmentUrl: imageUrl
            });
            if (msgRes.success) {
                const exists = messages.find(m => m.id === msgRes.data.id);
                if (!exists) {
                    messages.push(msgRes.data);
                    renderMessages();
                    scrollToBottom();
                }
                loadConversations();
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        fileInput.value = "";
    }
});

const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${config.hubUrl}?access_token=${config.accessToken}`, {
        transport: signalR.HttpTransportType.LongPolling
    })
    .withAutomaticReconnect()
    .build();

connection.on("ReceiveMessage", async function (msg) {
    if (currentChat && (msg.senderId === currentChat.partner.userId || (msg.senderId === config.currentUserId && msg.receiverId === currentChat.partner.userId))) {
        if (!messages.find(m => m.id === msg.id)) {
            // Hydrate product if needed
            if (msg.productRefId && !msg.product) {
                try {
                    const pRes = await fetchApi(`/Products/${msg.productRefId}`);
                    const prod = pRes.data || pRes;
                    const prodId = prod.id || prod.productId;
                    if (prod && prodId) {
                        msg.product = {
                            id: prodId,
                            name: prod.name || prod.title,
                            price: prod.price ? prod.price.toLocaleString('vi-VN') + 'đ' : 'Liên hệ',
                            image: prod.imageUrl || (prod.imageUrls && prod.imageUrls.length > 0 ? prod.imageUrls[0] : '') || prod.mainImage || (prod.images && prod.images.length > 0 ? prod.images[0].url : '')
                        };
                    }
                } catch(e) {}
            }
            messages.push(msg);
            renderMessages();
            scrollToBottom();
            if (msg.senderId !== config.currentUserId) {
                await fetchApi(`/Chat/${currentChat.partner.userId}/read`, "POST");
            }
        }
    }
    loadConversations();
});

connection.on("MessageEdited", function (msg) {
    if (currentChat && (msg.senderId === currentChat.partner.userId || msg.senderId === config.currentUserId)) {
        const index = messages.findIndex(m => m.id === msg.id);
        if (index !== -1) {
            messages[index] = msg;
            renderMessages();
        }
    }
    loadConversations();
});

connection.on("MessageRevoked", function (msg) {
    if (currentChat && (msg.senderId === currentChat.partner.userId || msg.senderId === config.currentUserId)) {
        const index = messages.findIndex(m => m.id === msg.id);
        if (index !== -1) {
            messages[index] = msg;
            renderMessages();
        }
    }
    loadConversations();
});

connection.on("MessagesRead", function (readerId) {
    if (currentChat && readerId === currentChat.partner.userId) {
        messages.forEach(m => {
            if (m.senderId === config.currentUserId) m.read = true;
        });
        renderMessages();
    }
});

async function init() {
    if (config.accessToken) {
        try {
            await connection.start();
            console.log("SignalR Connected");
        } catch (err) {
            console.error("SignalR Connection Error: ", err);
        }
    }
    await loadConversations();

    // Check URL Params
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const productId = urlParams.get('productId');
    const sellerName = urlParams.get('sellerName');
    const sellerAvatar = urlParams.get('sellerAvatar');
    
    if (userId) {
        let conv = conversations.find(c => c.partner.userId == userId);
        if (!conv) {
             conv = {
                 conversationId: -Date.now(),
                 lastMessageAt: new Date().toISOString(),
                 unreadCount: 0,
                 partner: { 
                     userId: parseInt(userId), 
                     fullName: sellerName || "Người dùng", 
                     avatarUrl: sellerAvatar || "U" 
                 },
                 lastMessage: null
             };
             conversations.unshift(conv);
        }
        openChat(parseInt(userId));
        
        if (productId) {
            try {
                // Thử fetch product
                const res = await fetchApi(`/Products/${productId}`);
                const prod = res.data || res;
                const prodId = prod.id || prod.productId;
                if (prod && prodId) {
                    attachedProduct = {
                        id: prodId,
                        name: prod.name || prod.title,
                        price: prod.price ? prod.price.toLocaleString('vi-VN') + 'đ' : 'Liên hệ',
                        image: prod.imageUrl || (prod.imageUrls && prod.imageUrls.length > 0 ? prod.imageUrls[0] : '') || prod.mainImage || (prod.images && prod.images.length > 0 ? prod.images[0].url : '')
                    };
                    renderAttachedProduct();
                }
            } catch (e) {}
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Start
init();
toggleSendButtonState();
