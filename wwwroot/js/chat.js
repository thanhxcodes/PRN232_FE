"use strict";

const config = window.chatConfig || { accessToken: null, currentUserId: 0, apiBaseUrl: '', hubUrl: '' };
let currentChat = null;
let conversations = [];
let messages = [];

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
            conversations = res.data;
            renderConversations();
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
        }
    } catch (e) {
        console.error("Failed to load messages", e);
    }
}

async function sendMessage() {
    const text = inputTextArea.value.trim();
    if (!text || !currentChat) return;

    // optimistic UI
    const tempMsg = {
        id: Date.now(),
        senderId: config.currentUserId,
        text: text,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        read: false
    };
    messages.push(tempMsg);
    inputTextArea.value = "";
    renderMessages();
    scrollToBottom();

    try {
        const res = await fetchApi("/Chat/send", "POST", {
            receiverId: currentChat.partner.userId,
            content: text
        });
        if (res.success) {
            const index = messages.findIndex(m => m.id === tempMsg.id);
            if(index !== -1) messages[index] = res.data;
            renderMessages();
            loadConversations();
        }
    } catch (e) {
        console.error("Failed to send message", e);
    }
}

// --- Render Helpers ---
function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

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
            ? `Bạn: ${conv.lastMessage?.content || 'Hình ảnh'}` 
            : (conv.lastMessage?.content || 'Hình ảnh');

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
                        ${conv.unreadCount > 0 ? `<span class="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold ${isActive ? 'bg-emerald-400 text-[#2D5A3D]' : 'bg-[#C4603A] text-white'}">${conv.unreadCount}</span>` : ''}
                    </div>
                </div>
            </button>
        </div>`;
    }).join('');
}

function renderMessages() {
    if (!elMessages) return;
    const todayBanner = `<div class="flex justify-center mb-6">
        <span class="rounded-full bg-gray-200/50 px-3 py-1 text-xs font-medium text-gray-500 backdrop-blur-sm">Hôm nay</span>
    </div>`;

    const msgsHtml = messages.map((msg, idx) => {
        const isMe = msg.senderId === config.currentUserId;
        const prevMsg = messages[idx - 1];
        const showAvatar = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId);
        
        const avatarInitial = currentChat.partner.fullName.charAt(0).toUpperCase();
        const avatarUrl = currentChat.partner.avatarUrl && currentChat.partner.avatarUrl !== "U" ? currentChat.partner.avatarUrl : null;
        const avatarHtml = avatarUrl ? `<img src="${avatarUrl}" class="h-full w-full object-cover" />` : avatarInitial;

        return `
        <div class="flex w-full gap-3 ${isMe ? 'justify-end' : 'justify-start'} group">
            ${!isMe ? `
            <div class="shrink-0 self-start ${showAvatar ? 'h-9 w-9 overflow-hidden rounded-full font-bold flex items-center justify-center bg-gray-200 text-gray-600' : 'w-9'}">
                ${showAvatar ? avatarHtml : ''}
            </div>` : ''}
            
            <div class="max-w-[72%] ${isMe ? 'items-end flex flex-col' : 'items-start'}">
                ${msg.isRevoked ? `
                <div class="rounded-3xl rounded-br-md px-4 py-3 text-[15px] border border-gray-200 text-gray-400 italic bg-transparent mb-1 shadow-sm">
                    Tin nhắn đã bị thu hồi
                </div>` : `
                <div class="rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${isMe ? 'rounded-tr-sm bg-[#EBF4F0] text-gray-900 inline-block' : 'rounded-tl-sm border border-gray-200 bg-white text-gray-900'}">
                    <p class="whitespace-pre-wrap">${msg.text || ''}</p>
                </div>
                <div class="mt-1 flex items-center gap-1.5 text-[11px] text-gray-500 ${isMe ? 'justify-end' : 'justify-start'}">
                    <span>${msg.time || ''}</span>
                    ${isMe ? `<span class="text-gray-400">|</span><span>${msg.read ? 'Đã đọc' : 'Đã gửi'}</span>` : ''}
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

// --- Events ---
btnSend?.addEventListener("click", sendMessage);
inputTextArea?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
searchInput?.addEventListener("input", renderConversations);

// --- SignalR Connection ---
const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${config.hubUrl}?access_token=${config.accessToken}`)
    .withAutomaticReconnect()
    .build();

connection.on("ReceiveMessage", function (msg) {
    if (currentChat && (msg.senderId === currentChat.partner.userId || (msg.senderId === config.currentUserId && msg.receiverId === currentChat.partner.userId))) {
        if (!messages.find(m => m.id === msg.id)) {
            messages.push(msg);
            renderMessages();
            scrollToBottom();
            if (msg.senderId !== config.currentUserId) {
                fetchApi(`/Chat/${currentChat.partner.userId}/read`, "POST");
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
    loadConversations();
}

// Start
init();
