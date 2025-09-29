// Legend AI Trading Dashboard JavaScript

class LegendAI {
    constructor() {
        this.data = null;
        this.filteredPatterns = [];
        this.currentPattern = 'all';
        this.stockChart = null;
        this.currentSort = { column: null, direction: 'asc' };
        
        this.init();
    }

    async init() {
        try {
            // Load data from the provided JSON asset
            const response = await fetch('https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/137e3c53816f931b4e74ea414c53d929/5c5f79f4-2c9e-4fc1-9a0b-bc9d54e35589/6a899348.json');
            this.data = await response.json();
        } catch (error) {
            console.log('Loading fallback data...');
            // Fallback to embedded data if URL fails
            this.data = this.getFallbackData();
        }
        
        this.setupEventListeners();
        this.populateInitialData();
        this.startRealTimeUpdates();
    }

    getFallbackData() {
        return {
            "market_data": {
                "AAPL": {
                    "info": {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology", "industry": "Consumer Electronics"},
                    "current_price": 145.23,
                    "data": [{"Date": "2024-08-28", "Open": 143.50, "High": 146.80, "Low": 142.90, "Close": 145.23, "Volume": 2450000}]
                },
                "NVDA": {
                    "info": {"symbol": "NVDA", "name": "NVIDIA Corp.", "sector": "Technology", "industry": "Semiconductors"},
                    "current_price": 128.75,
                    "data": [{"Date": "2024-08-28", "Open": 126.20, "High": 130.45, "Low": 125.80, "Close": 128.75, "Volume": 4850000}]
                },
                "TSLA": {
                    "info": {"symbol": "TSLA", "name": "Tesla Inc.", "sector": "Technology", "industry": "Electric Vehicles"},
                    "current_price": 285.60,
                    "data": [{"Date": "2024-08-28", "Open": 282.10, "High": 288.90, "Low": 280.50, "Close": 285.60, "Volume": 3200000}]
                }
            },
            "patterns": [
                {"symbol": "NVDA", "name": "NVIDIA Corp.", "sector": "Technology", "type": "VCP", "confidence": 0.89, "stage": "Stage 2", "contractions": 4, "days_in_pattern": 25, "pivot_price": 135.50, "stop_loss": 122.00, "current_price": 128.75},
                {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology", "type": "Cup & Handle", "confidence": 0.82, "cup_depth": 18.5, "handle_depth": 8.2, "days_in_pattern": 45, "pivot_price": 152.00, "stop_loss": 138.00, "current_price": 145.23},
                {"symbol": "TSLA", "name": "Tesla Inc.", "sector": "Technology", "type": "Bull Flag", "confidence": 0.78, "flag_pole_gain": 35.2, "flag_depth": 12.1, "days_in_pattern": 15, "pivot_price": 295.00, "stop_loss": 275.00, "current_price": 285.60},
                {"symbol": "MSFT", "name": "Microsoft Corp.", "sector": "Technology", "type": "Flat Base", "confidence": 0.85, "base_tightness": 9.8, "days_in_pattern": 35, "pivot_price": 445.00, "stop_loss": 415.00, "current_price": 438.90},
                {"symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Technology", "type": "Ascending Triangle", "confidence": 0.76, "resistance_tests": 4, "days_in_pattern": 28, "pivot_price": 168.50, "stop_loss": 155.00, "current_price": 165.20}
            ],
            "relative_strength": [
                {"symbol": "NVDA", "rs_rating": 95, "ytd_performance": 45.8, "relative_performance": 28.3, "sector_rank": 2},
                {"symbol": "AAPL", "rs_rating": 78, "ytd_performance": 22.4, "relative_performance": 5.9, "sector_rank": 12},
                {"symbol": "TSLA", "rs_rating": 88, "ytd_performance": 38.2, "relative_performance": 21.7, "sector_rank": 5},
                {"symbol": "MSFT", "rs_rating": 82, "ytd_performance": 28.1, "relative_performance": 11.6, "sector_rank": 8},
                {"symbol": "GOOGL", "rs_rating": 71, "ytd_performance": 19.8, "relative_performance": 3.3, "sector_rank": 18}
            ],
            "sectors": [
                {"sector": "Technology", "ytd_performance": 24.8, "momentum_score": 85, "rs_rating": 92, "rank": 1},
                {"sector": "Healthcare", "ytd_performance": 18.2, "momentum_score": 72, "rs_rating": 78, "rank": 2},
                {"sector": "Financial", "ytd_performance": 15.6, "momentum_score": 65, "rs_rating": 68, "rank": 3},
                {"sector": "Consumer Discretionary", "ytd_performance": 12.4, "momentum_score": 58, "rs_rating": 62, "rank": 4}
            ],
            "portfolio": [
                {"symbol": "NVDA", "pattern_type": "VCP", "entry_price": 118.50, "current_price": 128.75, "position_size": 200, "unrealized_pnl": 2050.00, "pnl_percent": 8.6, "days_held": 8},
                {"symbol": "MSFT", "pattern_type": "Cup & Handle", "entry_price": 425.20, "current_price": 438.90, "position_size": 50, "unrealized_pnl": 685.00, "pnl_percent": 3.2, "days_held": 10},
                {"symbol": "AAPL", "pattern_type": "Bull Flag", "entry_price": 224.50, "current_price": 229.80, "position_size": 100, "unrealized_pnl": 530.00, "pnl_percent": 2.4, "days_held": 6}
            ],
            "watchlist": [
                {"symbol": "NVDA", "name": "NVIDIA Corp.", "pattern_type": "VCP", "confidence": 0.89, "current_price": 128.75, "pivot_price": 135.50, "rs_rating": 95, "trend_template_score": 8, "risk_reward_ratio": 2.8},
                {"symbol": "AAPL", "name": "Apple Inc.", "pattern_type": "Cup & Handle", "confidence": 0.82, "current_price": 145.23, "pivot_price": 152.00, "rs_rating": 78, "trend_template_score": 7, "risk_reward_ratio": 3.1},
                {"symbol": "TSLA", "name": "Tesla Inc.", "pattern_type": "Bull Flag", "confidence": 0.78, "current_price": 285.60, "pivot_price": 295.00, "rs_rating": 88, "trend_template_score": 8, "risk_reward_ratio": 2.4}
            ]
        };
    }

    setupEventListeners() {
        // Pattern tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchPattern(e.target.dataset.pattern);
            });
        });

        // Filter controls
        const rsSlider = document.getElementById('rs-slider');
        if (rsSlider) {
            rsSlider.addEventListener('input', (e) => {
                document.getElementById('rs-value').textContent = e.target.value;
                this.applyFilters();
            });
        }

        const confidenceSlider = document.getElementById('confidence-slider');
        if (confidenceSlider) {
            confidenceSlider.addEventListener('input', (e) => {
                document.getElementById('confidence-value').textContent = e.target.value + '%';
                this.applyFilters();
            });
        }

        const applyFiltersBtn = document.getElementById('apply-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        // Table sorting
        document.querySelectorAll('[data-sort]').forEach(th => {
            th.addEventListener('click', (e) => {
                this.sortTable(e.target.dataset.sort);
            });
        });

        // Modal controls - Fixed event listeners
        const modalClose = document.getElementById('modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            });
        }

        const modalOverlay = document.querySelector('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            });
        }

        // Keyboard event for ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !document.getElementById('stock-modal').classList.contains('hidden')) {
                this.closeModal();
            }
        });

        // Sector grid clicks
        const sectorGrid = document.getElementById('sector-grid');
        if (sectorGrid) {
            sectorGrid.addEventListener('click', (e) => {
                const sectorItem = e.target.closest('.sector-item');
                if (sectorItem) {
                    const sector = sectorItem.dataset.sector;
                    this.filterBySector(sector);
                }
            });
        }
    }

    populateInitialData() {
        this.populateSectorGrid();
        this.populatePatternTable();
        this.populatePortfolioTable();
        this.populateWatchlist();
        this.filteredPatterns = [...this.data.patterns];
    }

    populateSectorGrid() {
        const sectorGrid = document.getElementById('sector-grid');
        if (!sectorGrid) return;
        
        sectorGrid.innerHTML = '';

        this.data.sectors.forEach(sector => {
            const sectorItem = document.createElement('div');
            sectorItem.className = 'sector-item';
            sectorItem.dataset.sector = sector.sector;
            
            sectorItem.innerHTML = `
                <div class="sector-name">${sector.sector}</div>
                <div class="sector-performance ${sector.ytd_performance > 0 ? 'positive' : 'negative'}">
                    +${sector.ytd_performance}%
                </div>
            `;
            
            sectorGrid.appendChild(sectorItem);
        });
    }

    populatePatternTable() {
        const tbody = document.getElementById('scanner-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        this.filteredPatterns.forEach(pattern => {
            const rsData = this.data.relative_strength.find(rs => rs.symbol === pattern.symbol);
            const rsRating = rsData ? rsData.rs_rating : 0;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="symbol-cell">
                    <strong>${pattern.symbol}</strong>
                </td>
                <td>${pattern.name}</td>
                <td>
                    <span class="pattern-type">${pattern.type}</span>
                </td>
                <td>
                    <span class="confidence-badge ${this.getConfidenceClass(pattern.confidence)}">
                        ${Math.round(pattern.confidence * 100)}%
                    </span>
                </td>
                <td>
                    <span class="rs-rating ${this.getRSClass(rsRating)}">${rsRating}</span>
                </td>
                <td>$${pattern.current_price.toFixed(2)}</td>
                <td>$${pattern.pivot_price.toFixed(2)}</td>
                <td>${pattern.days_in_pattern}</td>
                <td>${pattern.sector}</td>
                <td>
                    <button class="btn btn--primary btn--small" onclick="app.openStockModal('${pattern.symbol}')">
                        Analyze
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });

        const resultsCount = document.getElementById('results-count');
        if (resultsCount) {
            resultsCount.textContent = `${this.filteredPatterns.length} patterns found`;
        }
    }

    populatePortfolioTable() {
        const tbody = document.getElementById('portfolio-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        this.data.portfolio.forEach(position => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${position.symbol}</strong></td>
                <td>${position.pattern_type}</td>
                <td>$${position.entry_price.toFixed(2)}</td>
                <td>$${position.current_price.toFixed(2)}</td>
                <td class="${position.unrealized_pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">
                    $${position.unrealized_pnl.toFixed(0)}
                </td>
                <td class="${position.pnl_percent >= 0 ? 'pnl-positive' : 'pnl-negative'}">
                    ${position.pnl_percent >= 0 ? '+' : ''}${position.pnl_percent.toFixed(1)}%
                </td>
                <td>${position.days_held}</td>
            `;
            tbody.appendChild(row);
        });
    }

    populateWatchlist() {
        const watchlistItems = document.getElementById('watchlist-items');
        if (!watchlistItems) return;
        
        watchlistItems.innerHTML = '';

        this.data.watchlist.forEach(item => {
            const watchlistItem = document.createElement('div');
            watchlistItem.className = 'watchlist-item';
            watchlistItem.addEventListener('click', () => this.openStockModal(item.symbol));
            
            watchlistItem.innerHTML = `
                <div class="watchlist-header">
                    <span class="watchlist-symbol">${item.symbol}</span>
                    <span class="watchlist-confidence confidence-badge ${this.getConfidenceClass(item.confidence)}">
                        ${Math.round(item.confidence * 100)}%
                    </span>
                </div>
                <div class="watchlist-details">
                    <span class="watchlist-pattern">${item.pattern_type}</span>
                    <span class="watchlist-price">$${item.current_price.toFixed(2)}</span>
                </div>
                <div class="watchlist-metrics">
                    <span>RS: <span class="rs-score">${item.rs_rating}</span></span>
                    <span>R:R ${item.risk_reward_ratio}</span>
                    <span>Score: ${item.trend_template_score}/8</span>
                </div>
            `;
            
            watchlistItems.appendChild(watchlistItem);
        });
    }

    switchPattern(pattern) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const targetTab = document.querySelector(`[data-pattern="${pattern}"]`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        this.currentPattern = pattern;
        this.applyFilters();
    }

    applyFilters() {
        const rsSlider = document.getElementById('rs-slider');
        const confidenceSlider = document.getElementById('confidence-slider');
        const sectorFilter = document.getElementById('sector-filter');
        const marketCapFilter = document.getElementById('market-cap-filter');

        const rsThreshold = rsSlider ? parseInt(rsSlider.value) : 50;
        const confidenceThreshold = confidenceSlider ? parseInt(confidenceSlider.value) / 100 : 0.5;
        const sectorFilterValue = sectorFilter ? sectorFilter.value : 'all';
        const marketCapFilterValue = marketCapFilter ? marketCapFilter.value : 'all';

        this.filteredPatterns = this.data.patterns.filter(pattern => {
            const rsData = this.data.relative_strength.find(rs => rs.symbol === pattern.symbol);
            const rsRating = rsData ? rsData.rs_rating : 0;

            // Pattern type filter
            if (this.currentPattern !== 'all') {
                const patternMap = {
                    'vcp': 'VCP',
                    'cup-handle': 'Cup & Handle',
                    'flags': 'Bull Flag',
                    'powerplay': 'Flat Base',
                    'breakouts': 'Ascending Triangle'
                };
                if (pattern.type !== patternMap[this.currentPattern]) return false;
            }

            // RS Rating filter
            if (rsRating < rsThreshold) return false;

            // Confidence filter
            if (pattern.confidence < confidenceThreshold) return false;

            // Sector filter
            if (sectorFilterValue !== 'all' && pattern.sector !== sectorFilterValue) return false;

            return true;
        });

        this.populatePatternTable();
    }

    sortTable(column) {
        const direction = this.currentSort.column === column && this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        this.currentSort = { column, direction };

        this.filteredPatterns.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            if (column === 'rs') {
                const rsA = this.data.relative_strength.find(rs => rs.symbol === a.symbol);
                const rsB = this.data.relative_strength.find(rs => rs.symbol === b.symbol);
                aVal = rsA ? rsA.rs_rating : 0;
                bVal = rsB ? rsB.rs_rating : 0;
            }

            if (column === 'price') {
                aVal = a.current_price;
                bVal = b.current_price;
            }

            if (column === 'pivot') {
                aVal = a.pivot_price;
                bVal = b.pivot_price;
            }

            if (typeof aVal === 'string') {
                return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }

            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        });

        this.populatePatternTable();
    }

    openStockModal(symbol) {
        const pattern = this.data.patterns.find(p => p.symbol === symbol);
        const rsData = this.data.relative_strength.find(rs => rs.symbol === symbol);
        
        if (!pattern) return;

        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = `${symbol} - ${pattern.name}`;
        }
        
        // Populate trend template checklist
        this.populateTrendTemplate(pattern, rsData);
        
        // Populate pattern metrics
        this.populatePatternMetrics(pattern);
        
        // Populate risk/reward
        this.populateRiskReward(pattern);
        
        // Create chart
        this.createStockChart(symbol, pattern);
        
        // Show modal
        const modal = document.getElementById('stock-modal');
        if (modal) {
            modal.classList.remove('hidden');
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        const modal = document.getElementById('stock-modal');
        if (modal) {
            modal.classList.add('hidden');
            // Restore body scroll
            document.body.style.overflow = '';
        }
        
        if (this.stockChart) {
            this.stockChart.destroy();
            this.stockChart = null;
        }
    }

    populateTrendTemplate(pattern, rsData) {
        const checklist = document.getElementById('trend-checklist');
        if (!checklist) return;

        const criteria = [
            { label: 'Current price above 150 & 200 MA', passed: true },
            { label: '150 MA above 200 MA', passed: true },
            { label: '150 MA trending up for 1+ months', passed: true },
            { label: '200 MA flat or trending up', passed: true },
            { label: 'Current price 25%+ above 52-week low', passed: true },
            { label: 'Current price within 25% of 52-week high', passed: true },
            { label: 'RS Rating 70+', passed: rsData && rsData.rs_rating >= 70 },
            { label: 'Price pattern tight & constructive', passed: pattern.confidence >= 0.7 }
        ];

        checklist.innerHTML = '';
        criteria.forEach(criterion => {
            const item = document.createElement('div');
            item.className = 'checklist-item';
            item.innerHTML = `
                <span class="checklist-icon ${criterion.passed ? 'passed' : 'failed'}">
                    ${criterion.passed ? '✓' : '✗'}
                </span>
                <span>${criterion.label}</span>
            `;
            checklist.appendChild(item);
        });
    }

    populatePatternMetrics(pattern) {
        const metricsContainer = document.getElementById('pattern-metrics');
        if (!metricsContainer) return;

        const metrics = {
            'Pattern Type': pattern.type,
            'Confidence Score': `${Math.round(pattern.confidence * 100)}%`,
            'Days in Pattern': pattern.days_in_pattern,
            'Stage': pattern.stage || 'N/A',
            'Current Price': `$${pattern.current_price.toFixed(2)}`,
            'Pivot Price': `$${pattern.pivot_price.toFixed(2)}`
        };

        metricsContainer.innerHTML = '';
        Object.entries(metrics).forEach(([label, value]) => {
            const row = document.createElement('div');
            row.className = 'metric-row';
            row.innerHTML = `
                <span class="label">${label}:</span>
                <span class="value">${value}</span>
            `;
            metricsContainer.appendChild(row);
        });
    }

    populateRiskReward(pattern) {
        const riskRewardContainer = document.getElementById('risk-reward');
        if (!riskRewardContainer) return;

        const risk = pattern.current_price - pattern.stop_loss;
        const reward = pattern.pivot_price - pattern.current_price;
        const ratio = reward / risk;

        const metrics = {
            'Entry Price': `$${pattern.current_price.toFixed(2)}`,
            'Stop Loss': `$${pattern.stop_loss.toFixed(2)}`,
            'Target (Pivot)': `$${pattern.pivot_price.toFixed(2)}`,
            'Risk per Share': `$${risk.toFixed(2)}`,
            'Reward per Share': `$${reward.toFixed(2)}`,
            'Risk:Reward Ratio': `1:${ratio.toFixed(1)}`
        };

        riskRewardContainer.innerHTML = '';
        Object.entries(metrics).forEach(([label, value]) => {
            const row = document.createElement('div');
            row.className = 'metric-row';
            row.innerHTML = `
                <span class="label">${label}:</span>
                <span class="value">${value}</span>
            `;
            riskRewardContainer.appendChild(row);
        });
    }

    createStockChart(symbol, pattern) {
        const ctx = document.getElementById('stock-chart');
        if (!ctx) return;

        const chartContext = ctx.getContext('2d');
        
        if (this.stockChart) {
            this.stockChart.destroy();
        }

        // Generate sample price data
        const data = this.generatePriceData(pattern);

        this.stockChart = new Chart(chartContext, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Price',
                    data: data.prices,
                    borderColor: '#ffd700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 2,
                    fill: false
                }, {
                    label: 'Volume',
                    data: data.volumes,
                    type: 'bar',
                    backgroundColor: 'rgba(0, 255, 136, 0.3)',
                    borderColor: '#00ff88',
                    borderWidth: 1,
                    yAxisID: 'volume'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e6ed'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#a0a6b0'
                        },
                        grid: {
                            color: '#2a3441'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#a0a6b0'
                        },
                        grid: {
                            color: '#2a3441'
                        }
                    },
                    volume: {
                        type: 'linear',
                        position: 'right',
                        ticks: {
                            color: '#a0a6b0'
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 0
                    }
                }
            }
        });
    }

    generatePriceData(pattern) {
        const labels = [];
        const prices = [];
        const volumes = [];
        const basePrice = pattern.current_price;
        
        // Generate 30 days of sample data
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString());
            
            // Generate realistic price movements
            const volatility = 0.02;
            const trend = (30 - i) / 30 * 0.1; // Slight upward trend
            const randomMove = (Math.random() - 0.5) * volatility;
            const price = basePrice * (1 + trend + randomMove);
            prices.push(price);
            
            // Generate volume data
            const baseVolume = 1000000;
            const volumeVariation = Math.random() * 0.5 + 0.75;
            volumes.push(baseVolume * volumeVariation);
        }
        
        return { labels, prices, volumes };
    }

    filterBySector(sector) {
        const sectorFilter = document.getElementById('sector-filter');
        if (sectorFilter) {
            sectorFilter.value = sector;
        }
        this.applyFilters();
    }

    getConfidenceClass(confidence) {
        if (confidence >= 0.8) return 'confidence-high';
        if (confidence >= 0.6) return 'confidence-medium';
        return 'confidence-low';
    }

    getRSClass(rs) {
        if (rs >= 80) return 'excellent';
        if (rs >= 60) return 'good';
        return 'average';
    }

    startRealTimeUpdates() {
        // Simulate real-time price updates every 5 seconds
        setInterval(() => {
            this.updatePrices();
        }, 5000);

        // Update streaming indicator
        setInterval(() => {
            const indicator = document.querySelector('.stream-indicator');
            if (indicator) {
                indicator.style.opacity = indicator.style.opacity === '0.5' ? '1' : '0.5';
            }
        }, 1000);
    }

    updatePrices() {
        // Simulate small price movements
        this.data.patterns.forEach(pattern => {
            const change = (Math.random() - 0.5) * 0.01; // ±0.5% random change
            pattern.current_price *= (1 + change);
        });

        this.data.portfolio.forEach(position => {
            const change = (Math.random() - 0.5) * 0.01;
            position.current_price *= (1 + change);
            position.unrealized_pnl = (position.current_price - position.entry_price) * position.position_size;
            position.pnl_percent = ((position.current_price - position.entry_price) / position.entry_price) * 100;
        });

        this.data.watchlist.forEach(item => {
            const change = (Math.random() - 0.5) * 0.01;
            item.current_price *= (1 + change);
        });

        // Update displays
        this.populatePatternTable();
        this.populatePortfolioTable();
        this.populateWatchlist();
    }
}

// Initialize the application
const app = new LegendAI();