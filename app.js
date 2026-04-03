// app.js - التطبيق الكامل لموقع Zero TV 2026

document.addEventListener("DOMContentLoaded", () => {

// ======================== المتغيرات العامة ========================
let channelsMaster = [];
let streamsMap = new Map();
let logosMap = new Map();
let categoriesSet = new Set();
let currentChannelObj = null;
let player = null;
let isFavoriteMode = false;
let favorites = new Set();
let currentView = 'grid';
let isPlayerReady = false;

// ======================== عناصر DOM ========================
const gridContainer = document.getElementById('channelsGrid');
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const favoritesFilterBtn = document.getElementById('favoritesFilterBtn');
const recentBtn = document.getElementById('recentBtn');
const playerSection = document.getElementById('playerSection');
const videoPlayer = document.getElementById('video-player');
const currentLogoImg = document.getElementById('currentLogo');
const currentChannelNameSpan = document.getElementById('currentChannelName');
const currentCategorySpan = document.getElementById('currentCategory');
const favoriteStar = document.getElementById('favoriteStar');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const channelCountSpan = document.getElementById('channelCount');
const favCountSpan = document.getElementById('favCount');
const playerLoader = document.getElementById('playerLoader');
const playerOverlay = document.getElementById('playerOverlay');

// ======================== Toast Notification ========================
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.style.background = isError ? 'rgba(255,0,0,0.2)' : 'rgba(0,212,255,0.2)';
    toast.style.color = isError ? '#ff6b6b' : '#00d4ff';
    toast.style.borderRight = isError ? '4px solid #ff6b6b' : '4px solid #00d4ff';
    toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ======================== إدارة المفضلة ========================
function loadFavorites() {
    const stored = localStorage.getItem('zero_tv_favorites');
    if (stored) {
        try {
            favorites = new Set(JSON.parse(stored));
        } catch (e) {}
    }
    updateFavCounter();
    updateFavoriteStarUI();
}

function saveFavorites() {
    localStorage.setItem('zero_tv_favorites', JSON.stringify([...favorites]));
    updateFavCounter();
}

function updateFavCounter() {
    if (favCountSpan) favCountSpan.innerText = favorites.size;
}

function toggleFavorite(channelId) {
    if (favorites.has(channelId)) {
        favorites.delete(channelId);
        showToast('❌ تمت الإزالة من المفضلة');
    } else {
        favorites.add(channelId);
        showToast('⭐ تمت الإضافة إلى المفضلة');
    }
    saveFavorites();
    renderChannelsGrid();
    updateFavoriteStarUI();
    if (isFavoriteMode) renderChannelsGrid();
}

function updateFavoriteStarUI() {
    if (currentChannelObj && favoriteStar) {
        if (favorites.has(currentChannelObj.id)) {
            favoriteStar.classList.remove('far');
            favoriteStar.classList.add('fas');
            favoriteStar.style.color = "#ff00ff";
        } else {
            favoriteStar.classList.remove('fas');
            favoriteStar.classList.add('far');
            favoriteStar.style.color = "#888";
        }
    }
}

// ======================== جلب البيانات ========================
async function fetchJSON(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn(`Failed fetch ${url}`, err);
        return null;
    }
}

async function fetchAndMergeData() {
    gridContainer.innerHTML = `<div class="loader">جاري التحميل...</div>`;

    const [channelsData, streamsData, logosData] = await Promise.all([
        fetchJSON('https://iptv-org.github.io/api/channels.json'),
        fetchJSON('https://iptv-org.github.io/api/streams.json'),
        fetchJSON('https://iptv-org.github.io/api/logos.json')
    ]);

    if (!channelsData) return [];

    streamsMap.clear();

    if (streamsData) {
        for (const stream of streamsData) {
            if (!stream.channel || !stream.url) continue;
            if (!stream.url.startsWith('http')) continue;
            streamsMap.set(stream.channel, stream.url);
        }
    }

    if (logosData) {
        for (const logo of logosData) {
            logosMap.set(logo.channel, logo.url);
        }
    }

    const merged = [];
    for (const ch of channelsData) {
        const url = streamsMap.get(ch.id);
        if (!url) continue;

        const category = ch.categories?.[0] || ch.category || 'General';
        categoriesSet.add(category);

        merged.push({
            id: ch.id,
            name: ch.name,
            logo: logosMap.get(ch.id) || ch.logo,
            category,
            streamUrl: url
        });
    }

    updateCategoryDropdown();
    return merged;
}

function updateCategoryDropdown() {
    if (!categorySelect) return;
    categorySelect.innerHTML = '<option value="all">الكل</option>';
    categoriesSet.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
    });
}

// ======================== عرض القنوات ========================
function getFilteredChannels() {
    let filtered = [...channelsMaster];
    const term = searchInput?.value.toLowerCase() || '';
    const cat = categorySelect?.value || 'all';

    if (term) filtered = filtered.filter(ch => ch.name.toLowerCase().includes(term));
    if (cat !== 'all') filtered = filtered.filter(ch => ch.category === cat);
    if (isFavoriteMode) filtered = filtered.filter(ch => favorites.has(ch.id));

    return filtered;
}

function renderChannelsGrid() {
    if (!gridContainer) return;

    const filtered = getFilteredChannels();
    if (channelCountSpan) channelCountSpan.innerText = filtered.length;

    let html = '';
    for (const ch of filtered) {
        html += `
        <div class="channel-card" data-id="${ch.id}">
            <img src="${ch.logo || ''}">
            <h4>${ch.name}</h4>
        </div>`;
    }

    gridContainer.innerHTML = html;

    document.querySelectorAll('.channel-card').forEach(card => {
        card.onclick = () => {
            const id = card.dataset.id;
            const ch = channelsMaster.find(c => c.id === id);
            if (ch) playChannel(ch);
        };
    });
}

// ======================== تشغيل الفيديو ========================
async function initShaka() {
    if (!window.shaka || !videoPlayer) return false;
    if (!player) player = new shaka.Player(videoPlayer);
    return true;
}

async function playChannel(channel) {
    if (!channel || !channel.streamUrl) return;

    currentChannelObj = channel;
    if (playerSection) playerSection.style.display = 'block';
    if (currentChannelNameSpan) currentChannelNameSpan.innerText = channel.name;

    try {
        await initShaka();
        await player.load(channel.streamUrl);
        await videoPlayer.play();
    } catch (e) {
        showToast('فشل التشغيل', true);
    }
}

// ======================== الأحداث ========================
function attachEvents() {
    searchInput?.addEventListener('input', renderChannelsGrid);
    categorySelect?.addEventListener('change', renderChannelsGrid);

    favoritesFilterBtn?.addEventListener('click', () => {
        isFavoriteMode = !isFavoriteMode;
        renderChannelsGrid();
    });

    recentBtn?.addEventListener('click', () => {
        const last = localStorage.getItem('last_channel_id');
        if (last) {
            const ch = channelsMaster.find(c => c.id === last);
            if (ch) playChannel(ch);
        }
    });
}

// ======================== تشغيل ========================
async function init() {
    attachEvents();
    loadFavorites();

    const data = await fetchAndMergeData();
    channelsMaster = data;

    renderChannelsGrid();
    await initShaka();
}

init();

});
