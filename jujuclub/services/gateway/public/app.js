const STOCKS = [
  {
    name: '삼성전자',
    ticker: '005930.KS',
    category: '#반도체',
    summary: '초심으로 돌아가자, 국민주와의 대화',
    badge: '국내',
    change: -0.18,
    lastMessage: '초심으로 돌아가자 .. 10만전자 될까?',
    logo: 'SAMSUNG',
    quick: [
      '최근 주가는 어때?',
      'KOSPI랑 비교해줘',
      '요즘 핵심 이슈는?',
      '거래량 분위기는 어때?'
    ]
  },
  {
    name: 'SK하이닉스',
    ticker: '000660.KS',
    category: '#반도체',
    summary: 'HBM 선두주자와의 대화',
    badge: '국내',
    change: 2.14,
    lastMessage: 'HBM 시장 선두주자',
    logo: 'SK',
    quick: null
  },
  {
    name: 'LG에너지솔루션',
    ticker: '373220.KS',
    category: '#2차전지',
    summary: '글로벌 1위 K-배터리',
    badge: '국내',
    change: -1.66,
    lastMessage: '2차전지 공급망 점검해줘',
    logo: 'LG',
    quick: [
      '2차전지 업황은 어때?',
      '주요 고객 이슈가 있나?',
      '향후 투자 포인트는?'
    ]
  },
  {
    name: '현대차',
    ticker: '005380.KS',
    category: '#자동차',
    summary: '미래 모빌리티 전략 탐구',
    badge: '국내',
    change: 0.85,
    lastMessage: '전기차 경쟁력 어떨까?',
    logo: 'HYUNDAI',
    quick: null
  },
  {
    name: '테슬라',
    ticker: 'TSLA',
    category: '#미국 #전기차',
    summary: '글로벌 전기차 리더와 대화',
    badge: '글로벌',
    change: -0.94,
    lastMessage: '미국장 변동성 체크',
    logo: 'TSLA',
    quick: [
      '최근 실적 포인트는?',
      '미국 증시 영향은?',
      '중국 시장 상황은 어때?'
    ]
  },
  {
    name: '엔비디아',
    ticker: 'NVDA',
    category: '#미국 #AI',
    summary: 'AI의 심장, GPU 시장 이야기',
    badge: '글로벌',
    change: 1.55,
    lastMessage: 'AI 수요 흐름 이야기',
    logo: 'NVDA',
    quick: null
  },
  {
    name: '애플',
    ticker: 'AAPL',
    category: '#미국 #빅테크',
    summary: '서비스와 하드웨어의 거인',
    badge: '글로벌',
    change: 0.42,
    lastMessage: '아이폰 판매 추이 체크',
    logo: 'AAPL',
    quick: null
  },
  {
    name: '코스닥 150',
    ticker: 'KRX:KQ150',
    category: '#지수',
    summary: '코스닥 대표 지수의 흐름',
    badge: '지수',
    change: -0.31,
    lastMessage: '성장주 분위기 체크',
    logo: 'KQ',
    quick: [
      '코스닥 분위기 어때?',
      '주도 섹터가 어디야?',
      '기관 수급 알려줘'
    ]
  }
];

const QUICK_FALLBACK = [
  '최근 주가는 어때?',
  '투자자들이 주목하는 이슈는?',
  '실적과 전망을 요약해줘',
  '거래량/수급 상황 어때?'
];

const LEVELS = [
  { threshold: 50, name: '새싹 투자자' },
  { threshold: 150, name: '초보 투자자' },
  { threshold: 300, name: '성장 투자자' },
  { threshold: 600, name: '숙련 투자자' },
  { threshold: 1000, name: '시즌드 투자자' },
  { threshold: Infinity, name: '마스터 투자자' }
];

const STORAGE_KEYS = {
  bookmarks: 'jujuclub:bookmarks',
  chatCount: 'jujuclub:chatCount',
  nickname: 'jujuclub:nickname'
};

const state = {
  currentPage: 'home',
  currentStock: STOCKS[0],
  homeTab: 'home',
  streaming: true,
  timers: {
    clock: null,
    battery: null,
    macro: null,
    mood: null
  },
  macroCache: null,
  moodCache: null,
  bookmarks: [],
  level: {
    level: 1,
    levelName: '새싹 투자자',
    progress: 0,
    currentInLevel: 0,
    neededForNextLevel: 50,
    remainingChats: 50,
    nextLevelName: '초보 투자자'
  },
  nickname: '회원'
};

const els = {};

document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  cacheElements();
  bindEvents();
  loadPersistedState();
  renderTopBar('home');
  renderHomeStocks();
  renderDashboardPanels();
  renderWeeklyPanels();
  renderProfilePanels();
  updateStatusTime();
  state.timers.clock = setInterval(updateStatusTime, 1000);
  initBatteryStatus();
  loadMacroWeather(true);
  loadMoodSnapshot(true);
  scrollToTop('home');
}

function cacheElements() {
  els.appFrame = document.getElementById('app-frame');
  els.topBar = document.getElementById('top-bar');
  els.statusTime = document.getElementById('status-time');
  els.statusBattery = document.getElementById('status-battery');
  els.navButtons = document.querySelectorAll('.app-nav .nav-item');
  els.pages = {
    home: document.getElementById('page-home'),
    chat: document.getElementById('page-chat'),
    dashboard: document.getElementById('page-dashboard'),
    weekly: document.getElementById('page-weekly'),
    bookmarks: document.getElementById('page-bookmarks'),
    profile: document.getElementById('page-profile')
  };
  els.home = {
    stockList: document.getElementById('home-stock-list'),
    hint: document.getElementById('home-hint'),
    bookmarkEmpty: document.getElementById('home-bookmark-empty'),
    tabs: document.querySelectorAll('.home-tab'),
    searchForm: document.getElementById('home-search-form'),
    searchInput: document.getElementById('home-search-input'),
    temperatureEmoji: document.getElementById('home-temperature-emoji'),
    temperatureText: document.getElementById('home-temperature-text'),
    temperaturePill: document.getElementById('home-temperature-pill')
  };
  els.chat = {
    heroTitle: document.getElementById('chat-hero-title'),
    heroSummary: document.getElementById('chat-hero-summary'),
    heroMoodPill: document.getElementById('chat-hero-mood-pill'),
    heroMoodEmoji: document.getElementById('chat-hero-mood-emoji'),
    heroMoodText: document.getElementById('chat-hero-mood-text'),
    quickList: document.getElementById('chat-quick-list'),
    macroPanel: document.querySelector('[data-role="macro-panel"]'),
    macroLabel: document.querySelector('[data-field="macro-label"]'),
    macroScore: document.querySelector('[data-field="macro-score"]'),
    macroDesc: document.querySelector('[data-field="macro-desc"]'),
    macroIndex: document.querySelector('[data-field="macro-index"]'),
    macroAdr: document.querySelector('[data-field="macro-adr"]'),
    macroVolume: document.querySelector('[data-field="macro-volume"]'),
    macroFgi: document.querySelector('[data-field="macro-fgi"]'),
    macroVkospi: document.querySelector('[data-field="macro-vkospi"]'),
    macroUpdated: document.querySelector('[data-field="macro-updated"]'),
    messages: document.getElementById('chat-messages'),
    form: document.getElementById('chat-form'),
    input: document.getElementById('chat-input'),
    streamToggle: document.getElementById('chat-stream-toggle'),
    tickerField: document.getElementById('chat-ticker')
  };
  els.dashboard = {
    levelStats: document.getElementById('dashboard-level-stats'),
    timeline: document.getElementById('dashboard-timeline')
  };
  els.weekly = {
    stats: document.getElementById('weekly-stat-grid'),
    highlights: document.getElementById('weekly-highlight')
  };
  els.bookmarksPage = {
    list: document.getElementById('bookmark-page-list'),
    empty: document.getElementById('bookmark-page-empty')
  };
  els.profile = {
    card: document.getElementById('profile-card'),
    avatar: document.getElementById('profile-avatar'),
    name: document.getElementById('profile-name'),
    meta: document.getElementById('profile-meta'),
    stats: document.getElementById('profile-stats'),
    activity: document.getElementById('profile-activity'),
    editBtn: document.getElementById('profile-edit-btn')
  };
}

function bindEvents() {
  els.navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.nav;
      if (target === 'chat' && !state.currentStock) {
        state.currentStock = STOCKS[0];
      }
      navigate(target);
    });
  });

  els.home.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      els.home.tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.homeTab = tab.dataset.homeTab;
      renderHomeStocks();
    });
  });

  els.home.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = els.home.searchInput.value.trim();
    if (!query) return;
    const stock = findStockByQuery(query) || STOCKS[0];
    openChat(stock, { initialQuestion: query });
    els.home.searchInput.value = '';
  });

  els.chat.streamToggle.addEventListener('change', () => {
    state.streaming = els.chat.streamToggle.checked;
  });

  els.chat.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = els.chat.input.value.trim();
    if (!question) {
      alert('질문을 입력해주세요.');
      return;
    }
    await handleUserQuestion(question);
  });

  if (els.profile.editBtn) {
    els.profile.editBtn.addEventListener('click', () => promptNicknameEdit());
  }
}

function loadPersistedState() {
  try {
    const storedBookmarks = localStorage.getItem(STORAGE_KEYS.bookmarks);
    state.bookmarks = storedBookmarks ? JSON.parse(storedBookmarks) : [];
  } catch {
    state.bookmarks = [];
  }

  const nickname = localStorage.getItem(STORAGE_KEYS.nickname);
  if (nickname) state.nickname = nickname;

  updateLevelInfo(getChatCount());
  renderBookmarks();
  updateProfileCard();
}

/* Navigation & Layout */
function navigate(page) {
  if (!els.pages[page]) return;
  if (state.currentPage === page) {
    scrollToTop(page);
    return;
  }
  Object.entries(els.pages).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle('active', key === page);
  });
  const navTarget = page === 'bookmarks' ? 'chat' : page;
  els.navButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.nav === navTarget);
  });
  state.currentPage = page;
  renderTopBar(page);
  if (page === 'chat') scrollToBottom();
  if (page === 'home') renderHomeStocks();
  if (page === 'bookmarks') renderBookmarks();
  if (page === 'dashboard') renderDashboardPanels();
  if (page === 'weekly') renderWeeklyPanels();
  if (page === 'profile') renderProfilePanels();
}

function renderTopBar(page) {
  const bar = els.topBar;
  if (!bar) return;

  const stock = state.currentStock || STOCKS[0];

  if (page === 'home') {
    bar.innerHTML = `
      <div class="top-bar__row">
        <button class="top-bar__action" data-top-action="dashboard" aria-label="대시보드 이동">☰</button>
        <div class="top-bar__title">
          키우Me
          <span class="top-bar__badge">Beta</span>
        </div>
        <button class="top-bar__action" data-top-action="profile" aria-label="프로필 이동">👤</button>
      </div>
      <div class="top-bar__subtitle">주식과 직접 대화하는 페르소나 챗봇</div>
    `;
  } else if (page === 'chat') {
    bar.innerHTML = `
      <div class="top-bar__row">
        <button class="top-bar__back" data-top-action="back" aria-label="뒤로가기">←</button>
        <div class="top-bar__title">
          ${stock.name} 키우Me
          <span class="top-bar__badge">Beta</span>
        </div>
        <button class="top-bar__action" data-top-action="bookmarks" aria-label="북마크">☆</button>
      </div>
      <div class="top-bar__subtitle">${stock.summary || '실시간 데이터와 대화하세요.'}</div>
    `;
  } else if (page === 'dashboard') {
    bar.innerHTML = `
      <div class="top-bar__row">
        <div class="top-bar__title">나의 대시보드</div>
        <button class="top-bar__action" data-top-action="home" aria-label="홈 이동">🏠</button>
      </div>
      <div class="top-bar__subtitle">대화량과 성과를 한눈에 확인하세요.</div>
    `;
  } else if (page === 'weekly') {
    bar.innerHTML = `
      <div class="top-bar__row">
        <div class="top-bar__title">주간 리포트</div>
        <button class="top-bar__action" data-top-action="home" aria-label="홈 이동">🏠</button>
      </div>
      <div class="top-bar__subtitle">이번 주 시장 흐름과 하이라이트를 정리했어요.</div>
    `;
  } else if (page === 'bookmarks') {
    bar.innerHTML = `
      <div class="top-bar__row">
        <div class="top-bar__title">북마크</div>
        <button class="top-bar__action" data-top-action="home" aria-label="홈 이동">🏠</button>
      </div>
      <div class="top-bar__subtitle">중요한 메모를 다시 확인하세요.</div>
    `;
  } else if (page === 'profile') {
    bar.innerHTML = `
      <div class="top-bar__row">
        <div class="top-bar__title">프로필</div>
        <button class="top-bar__action" data-top-action="home" aria-label="홈 이동">🏠</button>
      </div>
      <div class="top-bar__subtitle">나의 투자 페르소나와 사용 기록</div>
    `;
  }

  bar.querySelectorAll('[data-top-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.topAction;
      if (action === 'dashboard') navigate('dashboard');
      if (action === 'profile') navigate('profile');
      if (action === 'home') navigate('home');
      if (action === 'back') navigate('home');
      if (action === 'bookmarks') navigate('bookmarks');
    });
  });
}

function scrollToTop(page) {
  const el = els.pages[page];
  if (!el) return;
  el.scrollTop = 0;
}

/* Home */
function renderHomeStocks() {
  renderHomeBookmarksHint();
  const container = els.home.stockList;
  const empty = els.home.bookmarkEmpty;
  if (!container) return;

  const tab = state.homeTab;
  let list = STOCKS.slice();

  if (tab === 'home') {
    list = STOCKS.slice(0, 5);
    empty.classList.add('hidden');
  } else if (tab === 'all') {
    list = STOCKS;
    empty.classList.add('hidden');
  } else if (tab === 'bookmark') {
    if (!state.bookmarks.length) {
      container.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    const bookmarkTickers = new Set(state.bookmarks.map((b) => b.ticker));
    list = STOCKS.filter((stock) => bookmarkTickers.has(stock.ticker));
    empty.classList.toggle('hidden', list.length > 0);
  }

  container.innerHTML = '';
  list.forEach((stock) => {
    const card = document.createElement('button');
    card.className = 'stock-card';
    card.setAttribute('type', 'button');
    card.innerHTML = `
      <div class="stock-card__logo">${stock.logo || stock.name.slice(0, 3)}</div>
      <div class="stock-card__name">${stock.name}</div>
      <div class="stock-card__description">
        ${stock.category ? `<span class="muted">${stock.category}</span> ` : ''}
        ${stock.lastMessage || stock.summary || '종목과 대화를 시작해 보세요.'}
      </div>
      <div class="stock-card__badge">${stock.badge || '국내'}</div>
      <div class="stock-card__change ${stock.change >= 0 ? 'is-up' : 'is-down'}">
        ${formatPercent(stock.change)}
      </div>
    `;
    card.addEventListener('click', () => openChat(stock));
    container.appendChild(card);
  });
}

function findStockByQuery(query) {
  const lower = query.toLowerCase();
  return STOCKS.find((stock) => {
    return (
      stock.name.toLowerCase().includes(lower) ||
      stock.ticker.toLowerCase() === lower ||
      (stock.category && stock.category.toLowerCase().includes(lower))
    );
  });
}

/* Chat */
function openChat(stock, options = {}) {
  state.currentStock = stock;
  els.chat.tickerField.value = stock.ticker;
  els.chat.heroTitle.textContent = `${stock.name} 키우Me`;
  els.chat.heroSummary.textContent =
    stock.summary || '실시간 데이터와 대화를 나눕니다.';
  els.chat.streamToggle.checked = state.streaming;

  renderTopBar('chat');
  renderChatQuickChips(stock);
  resetChatSession();
  navigate('chat');

  if (options.initialQuestion) {
    els.chat.input.value = options.initialQuestion;
    els.chat.input.focus();
    handleUserQuestion(options.initialQuestion);
  } else {
    els.chat.input.value = '';
    els.chat.input.focus();
  }
}

function renderChatQuickChips(stock) {
  const chips = els.chat.quickList;
  if (!chips) return;
  chips.innerHTML = '';
  const quick = stock.quick && stock.quick.length ? stock.quick : QUICK_FALLBACK;
  quick.forEach((question) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.type = 'button';
    chip.textContent = question;
    chip.addEventListener('click', () => handleSuggestion(question));
    chips.appendChild(chip);
  });
}

function resetChatSession() {
  els.chat.messages.innerHTML = '';
  state.moodCache = null;
  loadMoodSnapshot(true);
  scrollToBottom();
}

async function handleUserQuestion(question) {
  createMessage('user', { text: question });
  els.chat.input.value = '';
  els.chat.input.focus();
  setChatLoading(true);

  const ticker = state.currentStock?.ticker || '005930.KS';
  const params = { ticker, q: question };
  try {
    if (state.streaming) {
      await runStreaming(params);
    } else {
      await runOnce(params);
    }
    updateLevelInfo(incrementChatCount());
    renderDashboardPanels();
    renderProfilePanels();
  } catch (err) {
    console.error(err);
    createMessage('bot', { text: `오류가 발생했어요: ${err.message}` });
  } finally {
    setChatLoading(false);
  }
}

async function handleSuggestion(question) {
  els.chat.input.value = '';
  await handleUserQuestion(question);
}

function setChatLoading(isLoading) {
  els.chat.form.querySelector('.chat-submit').disabled = isLoading;
  els.chat.input.disabled = isLoading;
}

/* Macro & Mood */
async function loadMacroWeather(initial = false) {
  if (!state.macroCache && initial) {
    setMacroLoading(true);
  }
  try {
    const resp = await fetch('/diag-weather');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    state.macroCache = data;
    updateMacroPanel(data);
    updateHomeTemperature(data);
  } catch (err) {
    console.error('[macro] load error', err);
    updateMacroPanel(null, '시장 기온을 불러오는 중 오류가 발생했어요.');
  } finally {
    scheduleMacroRefresh();
  }
}

function setMacroLoading(isLoading) {
  if (!els.chat.macroPanel) return;
  els.chat.macroPanel.classList.toggle('is-loading', isLoading);
}

function updateMacroPanel(payload, errorMessage) {
  if (!els.chat.macroPanel) return;

  if (!payload || !payload.ok || !Number.isFinite(payload.score)) {
    setMacroLoading(false);
    els.chat.macroPanel.classList.add('is-loading');
    els.chat.macroLabel.textContent = '⚠️';
    els.chat.macroScore.textContent = '--';
    els.chat.macroDesc.textContent = errorMessage || '시장 기온을 가져올 수 없어요.';
    els.chat.macroIndex.textContent = '-';
    els.chat.macroAdr.textContent = '-';
    els.chat.macroVolume.textContent = '-';
    els.chat.macroFgi.textContent = '-';
    els.chat.macroVkospi.textContent = '-';
    els.chat.macroUpdated.textContent = '--';
    return;
  }

  setMacroLoading(false);
  els.chat.macroPanel.classList.remove('is-loading');
  els.chat.macroLabel.textContent = payload.label || '🙂⚪';
  els.chat.macroScore.textContent = `${payload.score}점`;
  els.chat.macroDesc.textContent = payload.description || '시장 분위기가 정리됐어요.';

  const inputs = payload.inputs || {};
  els.chat.macroIndex.textContent = formatPercent(inputs.indexChange);
  els.chat.macroAdr.textContent = formatPercentAbs(inputs.adrPercent);
  els.chat.macroVolume.textContent = formatPercentAbs(inputs.volumePercent);
  els.chat.macroFgi.textContent = Number.isFinite(inputs.cnnFgi)
    ? inputs.cnnFgi.toFixed(1)
    : 'N/A';
  els.chat.macroVkospi.textContent = Number.isFinite(inputs.vkospi)
    ? inputs.vkospi.toFixed(2)
    : 'N/A';
  els.chat.macroUpdated.textContent = payload.fetchedAt
    ? `기준 ${formatAsOf(payload.fetchedAt)}`
    : '--';
}

function updateHomeTemperature(payload) {
  if (!payload || !payload.ok) return;
  els.home.temperatureEmoji.textContent = payload.label || '🙂⚪';
  els.home.temperatureText.textContent = `오늘의 온도 ${payload.score ?? '--'}점`;

  if (payload.score !== null && payload.score !== undefined) {
    let accent = 'rgba(10, 132, 255, 0.22)';
    if (payload.score >= 70) accent = 'rgba(255, 149, 0, 0.24)';
    if (payload.score <= 30) accent = 'rgba(52, 120, 246, 0.22)';
    els.home.temperaturePill.style.background = accent;
    els.home.temperaturePill.style.boxShadow = `0 18px 32px rgba(10, 132, 255, 0.18)`;
  }
}

async function loadMoodSnapshot(initial = false) {
  try {
    const resp = await fetch('/diag-mood');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data?.ok) return;
    state.moodCache = data;
    renderMoodOverview(data, initial);
  } catch (err) {
    console.error('[mood] load error', err);
  } finally {
    scheduleMoodRefresh();
  }
}

function renderMoodOverview(payload, initial) {
  if (!payload) return;
  if (payload.mood) {
    els.chat.heroMoodEmoji.textContent = payload.mood.split(' ')[0] || payload.mood;
    els.chat.heroMoodText.textContent =
      `${payload.mood} · 시장 대비 ${payload.sameDirection ? '유사한 흐름' : '차별화된 흐름'}`;
  }

  if (initial) {
    const stock = payload.stock || {};
    const benchmark = payload.benchmark || {};
    const descriptions = [];
    if (Number.isFinite(stock.last_price)) {
      descriptions.push(
        `${state.currentStock?.name || '삼성전자'} 주가는 ${formatNumber(
          stock.last_price
        )}원, ${formatPercent(stock.pct_change)} 흐름이에요.`
      );
    }
    if (Number.isFinite(benchmark.last_price)) {
      descriptions.push(
        `KOSPI는 ${formatPlain(benchmark.last_price)}로 ${formatPercent(
          benchmark.pct_change
        )} 움직이고 있어요.`
      );
    }
    if (!descriptions.length) {
      descriptions.push('오늘 시장 움직임을 차분히 살펴볼까요?');
    }
    const intro = createMessage('bot', {
      text: descriptions.join('\n'),
      mood: payload.mood,
      asOf: stock.ts || benchmark.ts
    });
    intro.renderVisuals({
      snapshot: {
        price: stock.last_price !== undefined ? {
          type: 'stock',
          last: stock.last_price,
          change: stock.pct_change,
          volume: stock.volume,
          asOf: stock.ts
        } : null,
        benchmark: benchmark.last_price !== undefined ? {
          type: 'index',
          last: benchmark.last_price,
          change: benchmark.pct_change,
          asOf: benchmark.ts
        } : null
      },
      history: payload.visuals?.history || []
    });
  }
}

function scheduleMacroRefresh(delay) {
  const interval =
    Number.parseInt(document.body.dataset.macroInterval, 10) || 300000;
  const wait = delay ?? interval;
  clearTimeout(state.timers.macro);
  const jitter = Math.floor(Math.random() * 15000);
  state.timers.macro = setTimeout(() => loadMacroWeather(), wait + jitter);
}

function scheduleMoodRefresh(delay) {
  const interval =
    Number.parseInt(document.body.dataset.moodInterval, 10) || 60000;
  const wait = delay ?? interval;
  clearTimeout(state.timers.mood);
  const jitter = Math.floor(Math.random() * 10000);
  state.timers.mood = setTimeout(() => loadMoodSnapshot(), wait + jitter);
}

/* Messaging & Streaming */
function createMessage(role, { text = '', mood, asOf } = {}) {
  const id =
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const wrapper = document.createElement('div');
  wrapper.className = `message-bundle ${role === 'bot' ? 'bot' : 'user'}`;
  wrapper.dataset.messageId = id;

  const header = document.createElement('div');
  header.className = 'message-header';

  let bookmarkBtn = null;

  if (role === 'bot') {
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = mood || '🙂';
    emojiSpan.className = 'message-mood';
    header.appendChild(emojiSpan);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = `${state.currentStock?.name || '삼성전자'} 키우Me`;
    header.appendChild(nameSpan);

    bookmarkBtn = document.createElement('button');
    bookmarkBtn.type = 'button';
    bookmarkBtn.className = 'bookmark-toggle';
    bookmarkBtn.innerHTML = '☆';
    header.appendChild(bookmarkBtn);
  } else {
    header.textContent = '나';
  }

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  meta.textContent = asOf ? `기준 시각: ${formatAsOf(asOf)}` : '';

  const visuals = document.createElement('div');
  visuals.className = 'visual-block hidden';

  wrapper.append(header, bubble, meta, visuals);
  els.chat.messages.appendChild(wrapper);
  scrollToBottom();

  let chartInstances = [];

  bookmarkBtn?.addEventListener('click', () => {
    toggleBookmark({
      id,
      content: bubble.textContent,
      timestamp: meta.textContent || formatTimestamp(),
      stockName: state.currentStock?.name || '삼성전자',
      ticker: state.currentStock?.ticker || '005930.KS',
      mood: mood || ''
    }, bookmarkBtn);
  });

  if (bookmarkBtn && state.bookmarks.some((item) => item.id === id)) {
    bookmarkBtn.classList.add('is-active');
    bookmarkBtn.textContent = '★';
  }

  return {
    id,
    wrapper,
    bubble,
    meta,
    header,
    visuals,
    setText(value) {
      bubble.textContent = value;
    },
    appendText(value) {
      bubble.textContent += value;
    },
    setMood(value) {
      if (role !== 'bot') return;
      const emojiSpan = header.querySelector('.message-mood');
      if (emojiSpan) emojiSpan.textContent = value || '🙂';
    },
    setAsOf(value) {
      const pretty = formatAsOf(value);
      meta.textContent = pretty ? `기준 시각: ${pretty}` : '';
    },
    renderVisuals: async (data) => {
      if (!data) return;
      visuals.innerHTML = '';
      visuals.classList.remove('hidden');
      chartInstances.forEach((chart) => chart?.destroy?.());
      chartInstances = [];

      if (data.snapshot) {
        const grid = document.createElement('div');
        grid.className = 'snapshot-grid';
        if (data.snapshot.price) {
          grid.appendChild(createSnapshotCard('📊 주가', data.snapshot.price));
        }
        if (data.snapshot.benchmark) {
          grid.appendChild(createSnapshotCard('🧭 KOSPI', data.snapshot.benchmark));
        }
        if (grid.childElementCount) {
          visuals.appendChild(grid);
        }
      }

      const hasHistory = Array.isArray(data.history) && data.history.length > 0;
      if (hasHistory) {
        const ChartJS = await loadChart();
        if (ChartJS) {
          const canvas = document.createElement('canvas');
          visuals.appendChild(canvas);
          const labels = data.history.map((row) => {
            const d = new Date(row.date);
            if (Number.isNaN(d.getTime())) return row.date || '';
            return `${d.getMonth() + 1}/${d.getDate()}`;
          });
          const values = data.history.map((row) => row.close);
          const chart = new ChartJS(canvas, {
            type: 'line',
            data: {
              labels,
              datasets: [
                {
                  label: '종가',
                  data: values,
                  borderColor: '#606cf2',
                  backgroundColor: 'rgba(96, 108, 242, 0.18)',
                  tension: 0.3,
                  fill: true,
                  pointRadius: 0,
                  borderWidth: 2
                }
              ]
            },
            options: {
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                x: {
                  ticks: { color: 'rgba(100,116,139,0.9)', maxTicksLimit: 6 },
                  grid: { display: false }
                },
                y: {
                  ticks: {
                    color: 'rgba(100,116,139,0.9)',
                    callback: (val) => formatNumber(val)
                  },
                  grid: { color: 'rgba(100,116,139,0.2)' }
                }
              }
            }
          });
          chartInstances.push(chart);
        }
      }

      if (!visuals.childElementCount) {
        visuals.classList.add('hidden');
      }
    }
  };
}

function createSnapshotCard(title, data) {
  const card = document.createElement('div');
  card.className = 'snapshot-card';
  const heading = document.createElement('h4');
  heading.textContent = title;
  const metric = document.createElement('div');
  metric.className = 'snapshot-card__metric';
  const isIndex =
    data?.type === 'index' || /KOSPI/i.test(title) || /지수$/.test(title);
  metric.textContent = isIndex
    ? formatPlain(data.last)
    : `${formatNumber(data.last)}원`;
  const meta = document.createElement('div');
  meta.className = 'snapshot-card__meta';
  const parts = [];
  if (data.change !== undefined && data.change !== null) {
    parts.push(formatPercent(data.change));
  }
  if (!isIndex && data.volume) {
    parts.push(`거래량 ${formatNumber(data.volume)}`);
  }
  if (data.asOf) {
    parts.push(`기준 ${formatAsOf(data.asOf)}`);
  }
  meta.textContent = parts.join(' · ');
  card.append(heading, metric, meta);
  return card;
}

async function runStreaming(params) {
  const searchParams = new URLSearchParams({ ...params, stream: 'true' });
  const resp = await fetch(`/chat?${searchParams.toString()}`, {
    headers: { Accept: 'text/event-stream' }
  });
  if (!resp.ok || !resp.body) throw new Error('스트리밍 요청에 실패했습니다.');

  const aiMessage = createMessage('bot', { text: '' });
  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const raw of events) {
      if (!raw.startsWith('data:')) continue;
      const payload = raw.slice(5).trim();
      if (!payload) continue;
      const evt = JSON.parse(payload);
      if (evt.delta) aiMessage.appendText(evt.delta);
      if (evt.full) aiMessage.setText(evt.full);
      if (evt.asOf) aiMessage.setAsOf(evt.asOf);
      if (evt.visuals) aiMessage.renderVisuals(evt.visuals);
      if (evt.mood) {
        aiMessage.setMood(evt.mood);
        els.chat.heroMoodEmoji.textContent = evt.mood.split(' ')[0] || evt.mood;
        els.chat.heroMoodText.textContent = `${evt.mood} · 실시간 업데이터`;
        scheduleMoodRefresh();
      }
      if (evt.macro) {
        state.macroCache = evt.macro;
        updateMacroPanel(evt.macro);
        updateHomeTemperature(evt.macro);
        scheduleMacroRefresh();
      }
    }
  }
}

async function runOnce(params) {
  const searchParams = new URLSearchParams({ ...params, stream: 'false' });
  const resp = await fetch(`/chat?${searchParams.toString()}`);
  if (!resp.ok) throw new Error('요청에 실패했습니다.');
  const data = await resp.json();
  const aiMessage = createMessage('bot', {
    text: data.text || '(응답 없음)',
    mood: data.mood
  });
  aiMessage.setAsOf(data.asOf);
  if (data.visuals) aiMessage.renderVisuals(data.visuals);
  if (data.macro) {
    state.macroCache = data.macro;
    updateMacroPanel(data.macro);
    updateHomeTemperature(data.macro);
  }
  if (data.mood) {
    els.chat.heroMoodEmoji.textContent = data.mood.split(' ')[0] || data.mood;
    els.chat.heroMoodText.textContent = `${data.mood} · 시장 감정 업데이트`;
  }
}

/* Bookmarks */
function toggleBookmark(entry, button) {
  const exists = state.bookmarks.find((item) => item.id === entry.id);
  if (exists) {
    state.bookmarks = state.bookmarks.filter((item) => item.id !== entry.id);
    button.classList.remove('is-active');
    button.textContent = '☆';
  } else {
    const enriched = {
      id: entry.id,
      content: entry.content,
      timestamp: entry.timestamp,
      stockName: entry.stockName,
      ticker: entry.ticker,
      mood: entry.mood,
      savedAt: formatTimestamp()
    };
    state.bookmarks.unshift(enriched);
    button.classList.add('is-active');
    button.textContent = '★';
  }
  persistBookmarks();
  renderBookmarks();
  if (state.homeTab === 'bookmark') renderHomeStocks();
}

function renderBookmarks() {
  const pageList = els.bookmarksPage.list;
  const pageEmpty = els.bookmarksPage.empty;
  if (!pageList) return;

  pageList.innerHTML = '';
  if (!state.bookmarks.length) {
    pageEmpty.classList.remove('hidden');
    return;
  }
  pageEmpty.classList.add('hidden');
  state.bookmarks.forEach((bookmark) => {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.innerHTML = `
      <button class="bookmark-card__remove" type="button" aria-label="삭제">✕</button>
      <div class="bookmark-card__title">${bookmark.stockName}</div>
      <div class="bookmark-card__content">${bookmark.content}</div>
      <div class="bookmark-card__timestamp">
        저장시각 ${bookmark.savedAt} · ${bookmark.timestamp || ''}
      </div>
    `;
    const removeBtn = card.querySelector('.bookmark-card__remove');
    removeBtn.addEventListener('click', () => {
      state.bookmarks = state.bookmarks.filter((item) => item.id !== bookmark.id);
      persistBookmarks();
      renderBookmarks();
      if (state.homeTab === 'bookmark') renderHomeStocks();
    });
    card.addEventListener('click', () => {
      const stock = STOCKS.find((s) => s.ticker === bookmark.ticker) || state.currentStock;
      openChat(stock, { initialQuestion: bookmark.content });
    });
    pageList.appendChild(card);
  });
}

function persistBookmarks() {
  try {
    localStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(state.bookmarks));
  } catch (err) {
    console.warn('Failed to persist bookmarks', err);
  }
}

/* Dashboard & Weekly & Profile */
function renderDashboardPanels() {
  if (!els.dashboard.levelStats) return;
  const info = state.level;
  els.dashboard.levelStats.innerHTML = `
    <div class="stat-card">
      <div class="stat-card__label">현재 레벨</div>
      <div class="stat-card__value">Lv.${String(info.level).padStart(2, '0')}</div>
      <div class="muted">${info.levelName}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__label">다음 레벨까지</div>
      <div class="stat-card__value">${info.remainingChats}회</div>
      <div class="muted">다음 단계: ${info.nextLevelName || '최고 레벨'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__label">진행률</div>
      <div class="stat-card__value">${info.progress}%</div>
      <div class="muted">${info.currentInLevel}/${info.neededForNextLevel} 회</div>
    </div>
  `;

  const timeline = els.dashboard.timeline;
  if (timeline) {
    timeline.innerHTML = '';
    const entries = [
      { title: '오늘의 대화', desc: '최신 질문과 답변을 북마크해보세요.' },
      { title: '시장 온도', desc: state.macroCache ? `${state.macroCache.score}점 · ${state.macroCache.description}` : '시장 분위기를 분석하는 중입니다.' },
      { title: '투자 레벨업 TIP', desc: '꾸준히 질문할수록 새로운 인사이트를 얻을 확률이 높아집니다.' }
    ];
    entries.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'timeline-item';
      row.innerHTML = `<strong>${item.title}</strong><span>${item.desc}</span>`;
      timeline.appendChild(row);
    });
  }
}

function renderWeeklyPanels() {
  if (!els.weekly.stats) return;
  els.weekly.stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-card__label">주간 대화 수</div>
      <div class="stat-card__value">${Math.max(4, Math.round(getChatCount() / 2))}회</div>
      <div class="muted">지난주 대비 +2회</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__label">관심 종목</div>
      <div class="stat-card__value">${state.bookmarks.length}</div>
      <div class="muted">북마크로 빠르게 복습하세요.</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__label">시장 온도 평균</div>
      <div class="stat-card__value">${state.macroCache?.score ?? '--'}점</div>
      <div class="muted">${state.macroCache?.label || '데이터 수집 중'}</div>
    </div>
  `;

  if (els.weekly.highlights) {
    els.weekly.highlights.innerHTML = '';
    const highlightEntries = [
      'AI/반도체 섹터가 시장을 견인했습니다.',
      '코스피 200 변동성지수가 39pt까지 상승했습니다.',
      '거래량이 평균 대비 120% 수준으로 확대되었습니다.'
    ];
    highlightEntries.forEach((text) => {
      const item = document.createElement('div');
      item.className = 'list-compact__item';
      item.innerHTML = `<h4>Market Note</h4><p>${text}</p>`;
      els.weekly.highlights.appendChild(item);
    });
  }
}

function renderProfilePanels() {
  updateProfileCard();
  if (els.profile.stats) {
    els.profile.stats.innerHTML = `
      <div class="stat-card">
        <div class="stat-card__label">누적 대화 수</div>
        <div class="stat-card__value">${getChatCount()}회</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">저장된 북마크</div>
        <div class="stat-card__value">${state.bookmarks.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">선호 섹터</div>
        <div class="stat-card__value">${mostDiscussedCategory()}</div>
      </div>
    `;
  }

  if (els.profile.activity) {
    els.profile.activity.innerHTML = '';
    const entries = state.bookmarks.slice(0, 3);
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'list-compact__item';
      empty.innerHTML = `<h4>아직 기록이 없어요</h4><p>북마크를 저장하면 이곳에서 빠르게 복습할 수 있어요.</p>`;
      els.profile.activity.appendChild(empty);
    } else {
      entries.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'list-compact__item';
        card.innerHTML = `<h4>${item.stockName}</h4><p>${item.content}</p>`;
        els.profile.activity.appendChild(card);
      });
    }
  }
}

function updateProfileCard() {
  if (!els.profile.card) return;
  els.profile.avatar.textContent = (state.nickname || '회원').slice(0, 2).toUpperCase();
  els.profile.name.textContent = `${state.nickname || '키우Me 회원'}`;
  els.profile.meta.textContent = `Lv.${String(state.level.level).padStart(2, '0')} · ${state.level.levelName} · 누적 ${getChatCount()}회 대화`;
}

function promptNicknameEdit() {
  const current = state.nickname || '';
  const value = prompt('표시할 닉네임을 입력해주세요.', current);
  if (value !== null) {
    const trimmed = value.trim();
    if (trimmed.length > 12) {
      alert('닉네임은 12자 이하로 입력해주세요.');
      return;
    }
    state.nickname = trimmed || '회원';
    localStorage.setItem(STORAGE_KEYS.nickname, state.nickname);
    updateProfileCard();
  }
}

function renderHomeBookmarksHint() {
  if (!els.home.hint) return;
  if (state.homeTab === 'bookmark') {
    els.home.hint.classList.add('hidden');
  } else {
    els.home.hint.classList.remove('hidden');
  }
}

/* Level System */
function getChatCount() {
  const stored = Number.parseInt(localStorage.getItem(STORAGE_KEYS.chatCount), 10);
  return Number.isFinite(stored) ? stored : 0;
}

function incrementChatCount() {
  const next = getChatCount() + 1;
  localStorage.setItem(STORAGE_KEYS.chatCount, String(next));
  return next;
}

function updateLevelInfo(count) {
  let accumulated = 0;
  let levelIndex = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (count < LEVELS[i].threshold) {
      levelIndex = i;
      break;
    }
    accumulated = LEVELS[i].threshold;
    levelIndex = i + 1;
  }

  const currentLevel = Math.min(levelIndex + 1, LEVELS.length);
  const currentLevelInfo = LEVELS[levelIndex] || LEVELS[LEVELS.length - 1];
  const prevThreshold = levelIndex === 0 ? 0 : LEVELS[levelIndex - 1].threshold;
  const nextThreshold = currentLevelInfo.threshold;
  const currentInLevel = count - prevThreshold;
  const neededForNextLevel =
    nextThreshold === Infinity ? currentInLevel : nextThreshold - prevThreshold;
  const remainingChats =
    nextThreshold === Infinity ? 0 : Math.max(0, nextThreshold - count);
  const progress =
    nextThreshold === Infinity
      ? 100
      : Math.round((currentInLevel / neededForNextLevel) * 100);

  state.level = {
    level: currentLevel,
    levelName: currentLevelInfo.name,
    progress: Math.min(progress, 100),
    currentInLevel,
    neededForNextLevel,
    remainingChats,
    nextLevelName: LEVELS[levelIndex + 1]?.name || '마스터 투자자'
  };
}

function mostDiscussedCategory() {
  if (!state.bookmarks.length) return '데이터 없음';
  const frequency = {};
  state.bookmarks.forEach((bookmark) => {
    const stock = STOCKS.find((item) => item.ticker === bookmark.ticker);
    if (!stock?.category) return;
    const key = stock.category;
    frequency[key] = (frequency[key] || 0) + 1;
  });
  const sorted = Object.entries(frequency).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : '다양한 섹터';
}

/* Utilities */
function updateStatusTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  els.statusTime.textContent = `${hours}:${minutes}`;
}

function initBatteryStatus() {
  if (!('getBattery' in navigator)) return;
  navigator
    .getBattery()
    .then((battery) => {
      updateBatteryIcon(battery);
      battery.addEventListener('chargingchange', () => updateBatteryIcon(battery));
      battery.addEventListener('levelchange', () => updateBatteryIcon(battery));
    })
    .catch(() => {});
}

function updateBatteryIcon(battery) {
  if (!els.statusBattery) return;
  els.statusBattery.classList.toggle('is-charging', battery.charging);
}

function loadChart() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (loadChart.promise) return loadChart.promise;
  loadChart.promise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
    script.async = true;
    script.onload = () => resolve(window.Chart || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return loadChart.promise;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    els.chat.messages.scrollTo({
      top: els.chat.messages.scrollHeight,
      behavior: 'smooth'
    });
  });
}

function formatNumber(value) {
  if (value === null || value === undefined) return 'N/A';
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  return new Intl.NumberFormat('ko-KR').format(num);
}

function formatPlain(value) {
  if (value === null || value === undefined) return 'N/A';
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  const fixed = Math.abs(num) >= 1 ? num.toFixed(2) : num.toFixed(4);
  return Number.parseFloat(fixed).toString();
}

function formatPercent(value) {
  if (value === null || value === undefined) return 'N/A';
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
}

function formatPercentAbs(value) {
  if (value === null || value === undefined) return 'N/A';
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  return `${num.toFixed(2)}%`;
}

function formatAsOf(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const options = {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  };
  return new Intl.DateTimeFormat('ko-KR', options).format(date);
}

function formatTimestamp() {
  const now = new Date();
  return now.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

