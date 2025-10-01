// Legend AI Trading Dashboard - Bundled Version (No Modules)
// This version has api.js code inlined to avoid module loading issues

// ============================================================================
// API Helper (inlined from public/api.js)
// ============================================================================
const runtimeBase = (typeof window !== 'undefined' && (window.LEGEND_API_URL || window.NEXT_PUBLIC_API_BASE))
  || (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_API_BASE || process.env.LEGEND_API_URL))
  || '';

const apiBase = runtimeBase.replace(/\/$/, '');

function buildUrl(route) {
  if (!route) {
    return apiBase || '';
  }
  if (typeof route === 'string' && /^(https?:)?\/\//i.test(route)) {
    return route;
  }
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  return `${apiBase}${normalizedRoute}`;
}

function withAcceptHeader(init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  return { ...init, headers };
}

async function api(route, init) {
  const url = buildUrl(route);
  const response = await fetch(url, withAcceptHeader(init));

  if (!response.ok) {
    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch (err) {
      bodyText = '';
    }
    const error = new Error(`Legend API request failed (${response.status} ${response.statusText})`);
    error.status = response.status;
    error.statusText = response.statusText;
    error.url = url;
    error.body = bodyText;
    throw error;
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else if (response.status !== 204) {
    data = await response.text();
  }

  return {
    data,
    status: response.status,
    headers: response.headers,
    url,
  };
}

// ============================================================================
// Main Dashboard Class
// ============================================================================
class LegendAI {
    constructor() {
        this.data = null;
        this.filteredPatterns = [];
        this.currentPattern = 'vcp';
        this.stockChart = null;
        this.currentSort = { column: null, direction: 'asc' };
        this.marketEnvironment = null;
        this.patternPagination = { nextCursor: null, hasMore: false, source: 'v1' };
        this.patternSet = new Set();
        this.rawPatterns = [];
        this.rawPortfolio = [];
        this.isLoadingMore = false;

        console.log('🚀 Legend AI Dashboard initializing...');
        console.log('📡 API Base URL:', apiBase || window.LEGEND_API_URL || 'NOT SET');
        
        this.init();
    }

    async init() {
        console.log('🔄 Starting initialization...');
        
        try {
            console.log('📊 Loading backend data...');
            const { initialPatterns, initialPortfolio } = await this.loadBackendData();

            this.marketEnvironment = await this.fetchMarketEnvironment();
            console.log('✅ Market environment loaded:', this.marketEnvironment);

            this.data = await this.buildDataModel(initialPatterns, initialPortfolio);
            console.log('✅ Data model built:', {
                patterns: this.data?.patterns?.length || 0,
                portfolio: this.data?.portfolio?.length || 0
            });
        } catch (error) {
            console.error('❌ Failed to load backend data, using fallback dataset.', error);
            const fallbackData = this.getFallbackData();
            this.marketEnvironment = fallbackData.market_environment;
            this.data = fallbackData;
            this.rawPatterns = Array.isArray(fallbackData.patterns) ? [...fallbackData.patterns] : [];
            this.patternSet = new Set(this.rawPatterns.map(pattern => pattern.symbol));
            this.rawPortfolio = Array.isArray(fallbackData.portfolio) ? [...fallbackData.portfolio] : [];
            this.patternPagination = { nextCursor: null, hasMore: false, source: 'fallback' };
        }
        
        this.setupEventListeners();
        this.setDefaultFilters();
        this.populateInitialData();
        this.startRealTimeUpdates();
        
        console.log('✅ Dashboard initialization complete!');
    }

    async loadBackendData() {
        console.log('📡 Fetching patterns page...');
        const initialPage = await this.fetchPatternsPage({ limit: 100 });
        
        console.log('✅ Got patterns:', {
            count: initialPage.items?.length || 0,
            source: initialPage.source,
            hasMore: initialPage.hasMore
        });

        this.rawPatterns = Array.isArray(initialPage.items) ? [...initialPage.items] : [];
        this.patternSet = new Set(this.rawPatterns.map(item => item.symbol || item.ticker));
        this.patternPagination = {
            nextCursor: initialPage.nextCursor || null,
            hasMore: Boolean(initialPage.hasMore),
            source: initialPage.source || 'v1'
        };

        console.log('📡 Fetching portfolio...');
        let initialPortfolio = [];
        try {
            const { data } = await api('/api/portfolio/positions');
            initialPortfolio = Array.isArray(data) ? data : [];
            console.log('✅ Got portfolio:', initialPortfolio.length, 'positions');
        } catch (error) {
            console.warn('⚠️ Portfolio endpoint failed, using empty array.', error);
        }

        this.rawPortfolio = initialPortfolio;

        return {
            initialPatterns: this.rawPatterns,
            initialPortfolio: this.rawPortfolio
        };
    }

    async fetchMarketEnvironment() {
        try {
            const { data } = await api('/api/market/environment');
            return data;
        } catch (error) {
            console.warn('Could not fetch market environment, using default.', error);
            return {
                current_trend: 'Confirmed Uptrend',
                days_in_trend: 23,
                distribution_days: 2,
                market_health_score: 78
            };
        }
    }

    async callApi(route, options = {}) {
        const { data } = await api(route, options);
        return data;
    }

    async fetchPatternsPage({ cursor = null, limit = 100 } = {}) {
        const params = new URLSearchParams();
        if (limit) {
            params.set('limit', String(limit));
        }
        if (cursor) {
            params.set('cursor', cursor);
        }

        const query = params.toString();
        const path = query ? `/v1/patterns/all?${query}` : '/v1/patterns/all';

        console.log('📡 Fetching from:', path);

        try {
            const { data } = await api(path);
            console.log('✅ v1 API response:', data);

            if (data && Array.isArray(data.items)) {
                const nextCursor = data.next_cursor ?? data.nextCursor ?? data.next ?? null;
                const hasMore =
                    typeof data.has_more === 'boolean'
                        ? data.has_more
                        : typeof data.hasMore === 'boolean'
                            ? data.hasMore
                            : Boolean(nextCursor);

                return {
                    items: data.items,
                    nextCursor,
                    hasMore,
                    source: 'v1'
                };
            }

            if (Array.isArray(data)) {
                return {
                    items: data,
                    nextCursor: null,
                    hasMore: false,
                    source: 'legacy'
                };
            }
        } catch (error) {
            console.warn('❌ v1 patterns endpoint unavailable, falling back to legacy.', error);
        }

        try {
            const { data: legacy } = await api('/api/patterns/all');
            console.log('✅ Legacy API response:', legacy);
            return {
                items: Array.isArray(legacy) ? legacy : [],
                nextCursor: null,
                hasMore: false,
                source: 'legacy'
            };
        } catch (fallbackError) {
            console.error('❌ Failed to fetch patterns from legacy endpoint.', fallbackError);
            throw fallbackError;
        }
    }

    async buildDataModel(patterns, portfolio) {
        console.log('🔨 Building data model from:', {
            patterns: patterns?.length || 0,
            portfolio: portfolio?.length || 0
        });

        const transformedPatterns = (patterns || []).map(p => {
            // Handle both v1 format (ticker) and legacy format (symbol)
            const symbol = p.symbol || p.ticker || 'UNKNOWN';
            const patternType = p.pattern_type || p.pattern || 'VCP';
            const confidence = p.confidence || 0;
            const price = p.current_price || p.price || p.pivot_price || 0;
            const rs = p.rs_rating || p.rs || 80;

            return {
                symbol: symbol,
                name: p.name || `${symbol} Corp`,
                sector: p.sector || 'Technology',
                pattern_type: patternType,
                confidence: confidence > 1 ? confidence / 100 : confidence,
                pivot_price: p.pivot_price || price,
                stop_loss: p.stop_loss || (price * 0.92),
                current_price: price,
                days_in_pattern: p.days_in_pattern || 15,
                rs_rating: Math.round(rs),
                entry: p.entry || price,
                target: p.target || (price * 1.20),
                action: 'Analyze'
            };
        });

        console.log('✅ Transformed patterns:', transformedPatterns.length);
        if (transformedPatterns.length > 0) {
            console.log('Sample pattern:', transformedPatterns[0]);
        }

        return {
            patterns: transformedPatterns,
            portfolio: portfolio || [],
            market_environment: this.marketEnvironment || {
                current_trend: 'Confirmed Uptrend',
                days_in_trend: 23
            }
        };
    }

    getFallbackData() {
        console.log('⚠️ Using fallback data');
        return {
            patterns: [],
            portfolio: [],
            market_environment: {
                current_trend: 'Confirmed Uptrend',
                days_in_trend: 23,
                distribution_days: 2,
                market_health_score: 78
            }
        };
    }

    setDefaultFilters() {
        // Set default slider values (using correct IDs from HTML)
        const rsSlider = document.getElementById('rs-slider');
        if (rsSlider) rsSlider.value = 80;
        
        const confidenceSlider = document.getElementById('confidence-slider');
        if (confidenceSlider) confidenceSlider.value = 70;

        console.log('✅ Default filters set');
    }

    populateInitialData() {
        console.log('📊 Populating UI with data...');
        this.applyFilters();
        this.populateSectorGrid();
        this.populatePortfolioTable();
        this.populateWatchlist();
        console.log('✅ UI populated');
    }

    setupEventListeners() {
        console.log('🎧 Setting up event listeners...');
        
        // Pattern tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pattern = e.target.dataset.pattern;
                console.log('🔘 Pattern tab clicked:', pattern);
                this.switchPattern(pattern);
            });
        });

        // Filter inputs with debouncing (using correct HTML IDs)
        const filterInputs = ['market-cap-filter', 'sector-filter', 'rs-slider', 'confidence-slider'];
        filterInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    // Update slider display immediately
                    if (element.type === 'range') {
                        if (id === 'rs-slider') {
                            const display = document.getElementById('rs-value');
                            if (display) display.textContent = element.value;
                        } else if (id === 'confidence-slider') {
                            const display = document.getElementById('confidence-value');
                            if (display) display.textContent = element.value + '%';
                        }
                    }
                    
                    clearTimeout(this.filterDebounce);
                    this.filterDebounce = setTimeout(() => {
                        console.log('🔍 Filter changed:', id, element.value);
                        this.applyFilters();
                    }, 300);
                });
            } else {
                console.warn('⚠️ Filter element not found:', id);
            }
        });

        // Apply filters button
        const applyBtn = document.getElementById('apply-filters');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                console.log('🔘 Apply filters clicked');
                this.applyFilters();
            });
        }

        console.log('✅ Event listeners ready');
    }

    switchPattern(pattern) {
        this.currentPattern = pattern;
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.pattern === pattern);
        });
        
        this.applyFilters();
    }

    applyFilters() {
        console.log('🔍 Applying filters...');
        
        // Use correct HTML IDs
        const rsMin = parseInt(document.getElementById('rs-slider')?.value || 80);
        const confidenceMin = parseFloat(document.getElementById('confidence-slider')?.value || 70) / 100;
        const sector = document.getElementById('sector-filter')?.value || 'all';
        const marketCap = document.getElementById('market-cap-filter')?.value || 'all';

        console.log('Filter values:', { rsMin, confidenceMin, sector, marketCap });

        let filtered = this.data?.patterns || [];

        // Filter by pattern type
        if (this.currentPattern !== 'all') {
            filtered = filtered.filter(p => 
                (p.pattern_type || '').toLowerCase() === this.currentPattern.toLowerCase()
            );
        }

        // Filter by RS rating
        filtered = filtered.filter(p => (p.rs_rating || 0) >= rsMin);

        // Filter by confidence
        filtered = filtered.filter(p => (p.confidence || 0) >= confidenceMin);

        // Filter by sector
        if (sector && sector !== 'all' && sector !== 'All Sectors') {
            filtered = filtered.filter(p => p.sector === sector);
        }

        this.filteredPatterns = filtered;
        console.log('✅ Filtered to', filtered.length, 'patterns');
        
        this.populatePatternTable();
        this.updatePatternCount();
    }

    populatePatternTable() {
        const tbody = document.getElementById('scanner-tbody');
        if (!tbody) {
            console.warn('⚠️ Pattern table body not found');
            return;
        }

        console.log('📊 Populating table with', this.filteredPatterns.length, 'patterns');

        if (this.filteredPatterns.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem;">No patterns found matching criteria</td></tr>';
            return;
        }

        tbody.innerHTML = this.filteredPatterns.map(pattern => `
            <tr data-symbol="${pattern.symbol}">
                <td>${pattern.symbol}</td>
                <td>${pattern.name}</td>
                <td><span class="sector-badge">${pattern.sector}</span></td>
                <td><span class="pattern-badge ${pattern.pattern_type.toLowerCase().replace(/\s+/g, '-')}">${pattern.pattern_type}</span></td>
                <td><div class="confidence-bar" style="width: ${(pattern.confidence * 100).toFixed(0)}%"></div> ${(pattern.confidence * 100).toFixed(0)}%</td>
                <td>$${pattern.current_price.toFixed(2)}</td>
                <td>$${pattern.pivot_price.toFixed(2)}</td>
                <td><span class="rs-score rs-${pattern.rs_rating >= 90 ? 'excellent' : pattern.rs_rating >= 80 ? 'good' : 'average'}">${pattern.rs_rating}</span></td>
                <td>${pattern.days_in_pattern}</td>
                <td><button class="action-btn" onclick="app.analyzeStock('${pattern.symbol}')">Analyze</button></td>
            </tr>
        `).join('');

        console.log('✅ Table populated');
    }

    updatePatternCount() {
        const countElement = document.getElementById('results-count');
        if (countElement) {
            countElement.textContent = `${this.filteredPatterns.length} patterns found`;
        }
    }

    populateSectorGrid() {
        // Placeholder - implement sector performance
        console.log('📊 Sector grid placeholder');
    }

    populatePortfolioTable() {
        // Placeholder - implement portfolio
        console.log('📊 Portfolio table placeholder');
    }

    populateWatchlist() {
        // Placeholder - implement watchlist
        console.log('📊 Watchlist placeholder');
    }

    startRealTimeUpdates() {
        // Placeholder for WebSocket or polling
        console.log('🔄 Real-time updates placeholder');
    }

    analyzeStock(symbol) {
        console.log('📊 Analyzing stock:', symbol);
        alert(`Analysis for ${symbol} - Feature coming soon!`);
    }
}

// Initialize when DOM is ready
console.log('📄 Script loaded, waiting for DOM...');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM ready, initializing app...');
        window.app = new LegendAI();
    });
} else {
    console.log('✅ DOM already ready, initializing app now...');
    window.app = new LegendAI();
}

