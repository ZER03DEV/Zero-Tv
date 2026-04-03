// app.js - التطبيق الكامل لموقع Zero TV 2026

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
    favCountSpan.innerText = favorites.size;
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

// ======================== جلب البيانات من API ========================
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
    gridContainer.innerHTML = `
        <div class="loader-wrapper">
            <div class="loader"></div>
            <p>جاري تحميل آلاف القنوات...</p>
        </div>
    `;

    const [channelsData, streamsData, logosData] = await Promise.all([
        fetchJSON('https://iptv-org.github.io/api/channels.json'),
        fetchJSON('https://iptv-org.github.io/api/streams.json'),
        fetchJSON('https://iptv-org.github.io/api/logos.json')
    ]);

    if (!channelsData) {
        gridContainer.innerHTML = `<div class="error-msg"><i class="fas fa-wifi"></i> فشل الاتصال بالخادم</div>`;
        return [];
    }

    // بناء الستريمات
    streamsMap.clear();
    if (streamsData && Array.isArray(streamsData)) {
        for (const stream of streamsData) {
            const chId = stream.channel;
            if (!chId) continue;
            
            let url = stream.url;
            if (!url || !url.startsWith('http')) continue;
            
            // تجاهل الستريمات المعطلة
            if (stream.status === 'offline') continue;
            
            if (!streamsMap.has(chId)) {
                streamsMap.set(chId, url);
            } else {
                const current = streamsMap.get(chId);
                // إعطاء أولوية لـ m3u8
                if (url.includes('.m3u8') && !current.includes('.m3u8')) {
                    streamsMap.set(chId, url);
                }
                // إعطاء أولوية لـ mpd
                else if (url.includes('.mpd') && !current.includes('.mpd') && !current.includes('.m3u8')) {
                    streamsMap.set(chId, url);
                }
            }
        }
    }

    // بناء الشعارات
    if (logosData && Array.isArray(logosData)) {
        for (const logo of logosData) {
            if (logo.channel && logo.url) {
                logosMap.set(logo.channel, logo.url);
            }
        }
    }

    // دمج البيانات
    const merged = [];
    for (const ch of channelsData) {
        const chId = ch.id;
        const streamUrl = streamsMap.get(chId);
        
        if (!streamUrl) continue;
        
        const logoUrl = logosMap.get(chId) || ch.logo || '';
        
        // معالجة التصنيفات بشكل صحيح
        let category = 'General';
        if (ch.categories && Array.isArray(ch.categories) && ch.categories.length > 0) {
            category = ch.categories[0];
        } else if (ch.category) {
            category = ch.category;
        }
        
        categoriesSet.add(category);
        merged.push({
            id: chId,
            name: ch.name || chId,
            logo: logoUrl,
            category: category,
            streamUrl: streamUrl,
            country: ch.country || '',
            languages: ch.languages || []
        });
    }
    
    console.log(`✅ تم تحميل ${merged.length} قناة بنجاح`);
    updateCategoryDropdown();
    return merged;
}

function updateCategoryDropdown() {
    const sorted = Array.from(categoriesSet).sort();
    categorySelect.innerHTML = '<option value="all">🌟 جميع التصنيفات</option>';
    sorted.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
    });
}

// ======================== الفلترة والعرض ========================
function getFilteredChannels() {
    let filtered = [...channelsMaster];
    const term = searchInput.value.trim().toLowerCase();
    const cat = categorySelect.value;
    
    if (term) {
        filtered = filtered.filter(ch => ch.name.toLowerCase().includes(term));
    }
    if (cat !== 'all') {
        filtered = filtered.filter(ch => ch.category === cat);
    }
    if (isFavoriteMode) {
        filtered = filtered.filter(ch => favorites.has(ch.id));
    }
    return filtered;
}

function renderChannelsGrid() {
    const filtered = getFilteredChannels();
    channelCountSpan.innerText = filtered.length;
    
    if (filtered.length === 0) {
        gridContainer.innerHTML = `<div class="no-results"><i class="fas fa-satellite-dish"></i> لا توجد قنوات تطابق البحث</div>`;
        return;
    }
    
    let html = '';
    for (const ch of filtered) {
        const isFav = favorites.has(ch.id);
        const favIcon = isFav ? '<i class="fas fa-star" style="color:#ff00ff; font-size:0.7rem; margin-left:4px;"></i>' : '';
        html += `
            <div class="channel-card" data-id="${ch.id}">
                <img src="${ch.logo || 'https://via.placeholder.com/90?text=TV'}" alt="${ch.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/90?text=TV'">
                <h4>${favIcon} ${escapeHtml(ch.name.substring(0, 35))}</h4>
                <div class="category-tag">${escapeHtml(ch.category)}</div>
            </div>
        `;
    }
    
    gridContainer.innerHTML = html;
    
    // إضافة حدث النقر على البطاقات
    document.querySelectorAll('.channel-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id');
            const selected = channelsMaster.find(ch => ch.id === id);
            if (selected) playChannel(selected);
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
}

// ======================== Shaka Player ========================
async function initShaka() {
    if (typeof shaka === 'undefined') {
        console.error('Shaka Player not loaded');
        return false;
    }
    
    if (!shaka.Player.isBrowserSupported()) {
        showToast('المتصفح لا يدعم التشغيل', true);
        return false;
    }
    
    if (!player) {
        player = new shaka.Player(videoPlayer);
        player.configure({
            drm: { retryParameters: { timeout: 15000, maxAttempts: 3 } },
            manifest: { retryParameters: { timeout: 15000, maxAttempts: 3 } },
            streaming: {
                rebufferingGoal: 2,
                bufferingGoal: 15,
                retryParameters: { timeout: 15000, maxAttempts: 3 }
            }
        });
        
        player.addEventListener('error', (event) => {
            console.error('Shaka error', event.detail);
            showPlayerError('فشل تشغيل البث، حاول مرة أخرى');
            if (playerLoader) playerLoader.style.display = 'none';
        });
        
        player.addEventListener('loading', () => {
            if (playerLoader) playerLoader.style.display = 'flex';
        });
        
        player.addEventListener('loaded', () => {
            if (playerLoader) playerLoader.style.display = 'none';
        });
    }
    return true;
}

async function playChannel(channel) {
    if (!channel || !channel.streamUrl) {
        showPlayerError('رابط البث غير متوفر');
        return;
    }
    
    // التمرير لأعلى الصفحة
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // تحديث واجهة المشغل
    currentChannelObj = channel;
    playerSection.style.display = 'block';
    currentChannelNameSpan.innerText = channel.name;
    currentCategorySpan.innerText = channel.category;
    currentLogoImg.src = channel.logo || 'https://via.placeholder.com/60?text=TV';
    currentLogoImg.onerror = () => {
        currentLogoImg.src = 'https://via.placeholder.com/60?text=TV';
    };
    updateFavoriteStarUI();
    
    // حفظ آخر قناة تم تشغيلها
    localStorage.setItem('last_channel_id', channel.id);
    
    // إظهار مؤشر التحميل
    if (playerLoader) playerLoader.style.display = 'flex';
    if (playerOverlay) playerOverlay.classList.remove('hidden');
    
    try {
        await initShaka();
        if (!player) throw new Error('Player not ready');
        
        // إضافة headers للتوافق
        const filter = (type, request) => {
            request.headers['Referer'] = window.location.origin;
            request.headers['User-Agent'] = navigator.userAgent;
        };
        player.getNetworkingEngine().registerRequestFilter(filter);
        
        await player.load(channel.streamUrl);
        
        // حل مشكلة Autoplay
        videoPlayer.muted = true;
        await videoPlayer.play().catch(() => {});
        videoPlayer.muted = false;
        
        // إخفاء مؤشر التحميل
        if (playerLoader) playerLoader.style.display = 'none';
        if (playerOverlay) playerOverlay.classList.add('hidden');
        
        // إزالة رسائل الخطأ السابقة
        const errDiv = document.querySelector('.player-error-msg');
        if (errDiv) errDiv.remove();
        
        showToast(`🟢 الآن تشاهد: ${channel.name}`);
    } catch (error) {
        console.error('Load error', error);
        showPlayerError('تعذر تشغيل القناة، قد يكون البث معطلاً');
        if (playerLoader) playerLoader.style.display = 'none';
    }
}

function showPlayerError(msg) {
    let errDiv = document.querySelector('.player-error-msg');
    if (!errDiv) {
        errDiv = document.createElement('div');
        errDiv.className = 'error-msg player-error-msg';
        errDiv.style.margin = '0.5rem';
        errDiv.style.position = 'absolute';
        errDiv.style.bottom = '80px';
        errDiv.style.left = '20px';
        errDiv.style.right = '20px';
        errDiv.style.zIndex = '100';
        document.getElementById('video-container').appendChild(errDiv);
    }
    errDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${msg}`;
    setTimeout(() => {
        if (errDiv && errDiv.parentNode) errDiv.remove();
    }, 5000);
}

// ======================== آخر قناة تم مشاهدتها ========================
async function restoreLastChannel() {
    const lastId = localStorage.getItem('last_channel_id');
    if (lastId && channelsMaster.length) {
        const last = channelsMaster.find(ch => ch.id === lastId);
        if (last) {
            await playChannel(last);
            return true;
        }
    }
    return false;
}

function goToRecentChannel() {
    const lastId = localStorage.getItem('last_channel_id');
    if (lastId && channelsMaster.length) {
        const last = channelsMaster.find(ch => ch.id === lastId);
        if (last) {
            playChannel(last);
            showToast('↺ العودة لآخر قناة');
        } else {
            showToast('لا توجد قناة سابقة', true);
        }
    } else {
        showToast('لم تشاهد أي قناة بعد', true);
    }
}

// ======================== ملء الشاشة ========================
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn(`Error attempting fullscreen: ${err.message}`);
        });
        fullscreenBtn.classList.remove('fa-expand');
        fullscreenBtn.classList.add('fa-compress');
    } else {
        document.exitFullscreen();
        fullscreenBtn.classList.remove('fa-compress');
        fullscreenBtn.classList.add('fa-expand');
    }
}

document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        fullscreenBtn.classList.remove('fa-expand');
        fullscreenBtn.classList.add('fa-compress');
    } else {
        fullscreenBtn.classList.remove('fa-compress');
        fullscreenBtn.classList.add('fa-expand');
    }
});

// ======================== تبديل عرض القنوات ========================
function initViewToggle() {
    const viewIcons = document.querySelectorAll('.view-toggle i');
    viewIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            viewIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            currentView = icon.getAttribute('data-view');
            
            if (currentView === 'list') {
                gridContainer.classList.add('list-view');
            } else {
                gridContainer.classList.remove('list-view');
            }
        });
    });
}

// ======================== أحداث المستخدم ========================
function attachEvents() {
    searchInput.addEventListener('input', () => renderChannelsGrid());
    categorySelect.addEventListener('change', () => renderChannelsGrid());
    
    favoritesFilterBtn.addEventListener('click', () => {
        isFavoriteMode = !isFavoriteMode;
        if (isFavoriteMode) {
            favoritesFilterBtn.style.background = 'linear-gradient(135deg, #00d4ff, #ff00ff)';
            favoritesFilterBtn.style.color = '#fff';
            favoritesFilterBtn.innerHTML = '<i class="fas fa-star"></i> عرض الكل';
        } else {
            favoritesFilterBtn.style.background = 'rgba(20, 20, 30, 0.9)';
            favoritesFilterBtn.style.color = '#00d4ff';
            favoritesFilterBtn.innerHTML = '<i class="fas fa-heart"></i> المفضلة';
        }
        renderChannelsGrid();
    });
    
    recentBtn.addEventListener('click', goToRecentChannel);
    
    favoriteStar.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentChannelObj) toggleFavorite(currentChannelObj.id);
    });
    
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
}

// ======================== التخزين المؤقت (Cache) ========================
async function loadWithCache() {
    const CACHE_KEY = 'zero_tv_channels_v1';
    const CACHE_TIME = 'zero_tv_cache_time';
    const cached = localStorage.getItem(CACHE_KEY);
    const cacheTime = localStorage.getItem(CACHE_TIME);
    const now = Date.now();
    const CACHE_DURATION = 30 * 60 * 1000; // 30 دقيقة
    
    if (cached && cacheTime && (now - parseInt(cacheTime)) < CACHE_DURATION) {
        try {
            channelsMaster = JSON.parse(cached);
            if (channelsMaster.length) {
                categoriesSet.clear();
                channelsMaster.forEach(ch => categoriesSet.add(ch.category));
                updateCategoryDropdown();
                renderChannelsGrid();
                await initShaka();
                await restoreLastChannel();
                refreshInBackground();
                return true;
            }
        } catch (e) {}
    }
    
    const fresh = await fetchAndMergeData();
    if (fresh.length) {
        channelsMaster = fresh;
        localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
        localStorage.setItem(CACHE_TIME, now.toString());
        renderChannelsGrid();
        await initShaka();
        const restored = await restoreLastChannel();
        if (!restored && !currentChannelObj && channelsMaster.length) {
            await playChannel(channelsMaster[0]);
        }
    } else {
        gridContainer.innerHTML = `<div class="error-msg"><i class="fas fa-wifi"></i> فشل التحميل، تأكد من اتصالك بالإنترنت</div>`;
    }
}

async function refreshInBackground() {
    try {
        const fresh = await fetchAndMergeData();
        if (fresh.length && fresh.length !== channelsMaster.length) {
            channelsMaster = fresh;
            localStorage.setItem('zero_tv_channels_v1', JSON.stringify(fresh));
            localStorage.setItem('zero_tv_cache_time', Date.now().toString());
            categoriesSet.clear();
            channelsMaster.forEach(ch => categoriesSet.add(ch.category));
            updateCategoryDropdown();
            renderChannelsGrid();
            showToast('تم تحديث قائمة القنوات');
        }
    } catch (e) {}
}

// ======================== تهيئة التطبيق ========================
async function init() {
    attachEvents();
    loadFavorites();
    initViewToggle();
    await loadWithCache();
}

// بدء التشغيل
init();
