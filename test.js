        let _role = null;

function getSafeImageUrl(imgData) {
    if (!imgData) return 'assets/images/hero-shoe.png';
    try {
        let parsed = typeof imgData === 'string' ? JSON.parse(imgData) : imgData;
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]) {
            return parsed[0];
        }
        if (typeof parsed === 'string' && parsed.trim() !== '' && parsed !== '[') {
            return parsed;
        }
    } catch(e) {
        if (typeof imgData === 'string' && imgData.trim() !== '' && imgData !== '[') {
            return imgData.replace(/[\[\]"]/g, '');
        }
    }
    return 'assets/images/hero-shoe.png';
}

        document.addEventListener('DOMContentLoaded', function() {
            // Fetch logged in user data securely from backend
            fetch('database/auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'action=me'
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    const u = data.data;
                    const fName = u.full_name || 'User';
                    const sName = fName.split(' ')[0] || 'User';
                    
                    // STRICT ROLE ENFORCEMENT: Ignore URL, rely ONLY on secure database session
                    _role = (u.role && u.role.toLowerCase() === 'admin') ? 'admin' : 'attendant';
                    
                    // Update all name fields
                    if(document.getElementById('topbar-name')) document.getElementById('topbar-name').innerText = fName;
                    if(document.getElementById('welcome-name')) document.getElementById('welcome-name').innerText = sName;
                    if(document.getElementById('sidebar-name')) document.getElementById('sidebar-name').innerText = fName;
                    if(document.getElementById('profile-name')) document.getElementById('profile-name').innerText = fName;
                    if(document.getElementById('profile-full-name')) document.getElementById('profile-full-name').value = fName;
                    if(document.getElementById('profile-username')) document.getElementById('profile-username').value = u.username;

                    // Role-based UI initialisation
                    if (_role === 'attendant') {
                        document.body.classList.add('role-attendant');
                        const options = { year: 'numeric', month: 'long', day: 'numeric' };
                        const dateEl = document.getElementById('current-date');
                        if(dateEl) dateEl.innerText = new Date().toLocaleDateString('en-KE', options);
                        const adminSb = document.getElementById('admin-sidebar');
                        if(adminSb) adminSb.style.display = 'none';
                        const dashView = document.getElementById('dashboard-view');
                        if(dashView) dashView.style.display = 'none';
                        const posView = document.getElementById('pos-catalogue-view');
                        if(posView) posView.style.display = 'block';
                        searchShoes('');
                    } else {
                        const attSb = document.getElementById('attendant-sidebar');
                        if(attSb) attSb.style.display = 'none';
                        initAdminCharts();
                    }
                } else {
                    // Not logged in - redirect to login
                    window.location.href = 'login.html';
                }
            })
            .catch(err => { console.error('Auth error:', err); window.location.href = 'login.html'; });

            // Mobile Menu Toggle
            const menuToggle = document.getElementById('menu-toggle');
            if(menuToggle) menuToggle.addEventListener('click', () => {
                if(_role === 'attendant') {
                    const sb = document.getElementById('attendant-sidebar');
                    if(sb) sb.classList.toggle('active');
                } else {
                    const sb = document.getElementById('admin-sidebar');
                    if(sb) sb.classList.toggle('active');
                }
            });
            

            // --- FILE UPLOAD UI LOGIC ---
            document.querySelectorAll('.file-upload-area').forEach(area => {
                const input = area.querySelector('.file-upload-input');
                const textEl = area.querySelector('.file-upload-text');

                // 1. Trigger hidden file input when the box is clicked
                area.addEventListener('click', () => {
                    if(input) input.click();
                });

                // 2. Update the box text when files are selected
                if(input) {
                    input.addEventListener('change', (e) => {
                        if (e.target.files.length > 0) {
                            const fileNames = Array.from(e.target.files).map(f => f.name).join(', ');
                            if(textEl) textEl.innerText = fileNames;
                            area.style.borderColor = 'var(--teal)';
                            area.style.background = 'var(--teal-light)';
                        } else {
                            if(textEl) textEl.innerText = 'Click to upload or drag and drop';
                            area.style.borderColor = '';
                            area.style.background = '';
                        }
                    });
                }
                
                // 3. Handle Drag and Drop
                area.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    area.style.borderColor = 'var(--teal)';
                    area.style.background = 'var(--teal-light)';
                });
                
                area.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    area.style.borderColor = '';
                    area.style.background = '';
                });
                
                area.addEventListener('drop', (e) => {
                    e.preventDefault();
                    if(input && e.dataTransfer.files.length > 0) {
                        input.files = e.dataTransfer.files;
                        // Trigger the change event manually to update the text
                        input.dispatchEvent(new Event('change'));
                    }
                });
            });
            // Tab Switching Logic for Sidebar Menu
            const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
            const adminViews = document.querySelectorAll('.admin-view-section');
            
            menuItems.forEach(item => {
                item.addEventListener('click', function(e) {
                    const targetId = this.getAttribute('data-target');
                    if (targetId) {
                        e.preventDefault();
                        
                        // Remove active class from all items in current sidebar
                        const parentSidebar = this.closest('.sidebar');
                        parentSidebar.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('active'));
                        
                        // Add active class to clicked item
                        this.classList.add('active');
                        
                        // Close sidebar on mobile
                        if (window.innerWidth <= 768) {
                            const adminSidebar = document.getElementById('admin-sidebar');
                            const attendantSidebar = document.getElementById('attendant-sidebar');
                            if (adminSidebar) adminSidebar.classList.remove('active');
                            if (attendantSidebar) attendantSidebar.classList.remove('active');
                        }
                        
                        // Hide current views based on who is logged in
                        if (parentSidebar.id === 'admin-sidebar') {
                            document.querySelectorAll('.admin-view-section').forEach(view => view.style.display = 'none');
                        } else if (parentSidebar.id === 'attendant-sidebar') {
                            document.querySelectorAll('.attendant-view-section').forEach(view => view.style.display = 'none');
                        }
                        
                        // Show target view
                        const targetView = document.getElementById(targetId);
                        if (targetView) {
                            if(targetView.classList.contains('pos-grid')) {
                                targetView.style.display = 'grid'; // Grid needed for POS layout
                            } else {
                                targetView.style.display = 'block';
                            }
                        }
                        
                        // Load dynamic data based on tab
                        if (targetId === 'stock-view') {
                            loadAdminStock();
                            loadCategories();
                            loadBrands();
                        }
                        if (targetId === 'clothes-stock-view') {
                            loadAdminClothes();
                            loadCategories();
                            loadBrands();
                        }
                        if (targetId === 'pos-catalogue-view') {
                            searchShoes('');
                        }
                         if (targetId === 'categories-view') {
                             loadCategories();
                             if(typeof loadBrands === 'function') loadBrands();
                         }
                         if (targetId === 'contacts-view') {
                             loadSuppliers();
                             if(typeof loadClients === 'function') loadClients();
                         }
                         if (targetId === 'admin-profile-view') {
                             loadAdminProfile();
                         }
                         if (targetId === 'pos-payment-view') {
                             loadSaleInventory();
                         }
                         if (targetId === 'sales-view' || targetId === 'pos-history-view') {
                             if (typeof loadSales === 'function') loadSales();
                         }
                         if (targetId === 'reports-view') {
                             const rStart = document.getElementById('report-start');
                             const rEnd = document.getElementById('report-end');
                             const today = new Date().toISOString().split('T')[0];
                             if (rStart && !rStart.value) rStart.value = today;
                             if (rEnd && !rEnd.value) rEnd.value = today;
                         }
                    }
                });
            });


            function loadDashboardStats() {
                fetch('database/dashboard.php')
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success' && data.data) {
                        const d = data.data;
                        
                        // 1. Update Top Stat Cards
                        if(document.getElementById('dash-total-stock')) document.getElementById('dash-total-stock').innerText = d.total_items || 0;
                        if(document.getElementById('dash-stock-value')) document.getElementById('dash-stock-value').innerText = 'KSh ' + parseFloat(d.total_value || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        if(document.getElementById('dash-sales-today')) document.getElementById('dash-sales-today').innerText = 'KSh ' + parseFloat(d.sales_today || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        if(document.getElementById('dash-total-revenue')) document.getElementById('dash-total-revenue').innerText = 'KSh ' + parseFloat(d.total_revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        if(document.getElementById('dash-low-stock')) document.getElementById('dash-low-stock').innerText = d.low_stock || 0;

                        // 2. Update Stock Donut Chart & Legends
                        const stockChart = Chart.getChart("stockChart");
                        if (stockChart) {
                            const total = parseInt(d.total_items || 0);
                            const low = parseInt(d.low_stock || 0);
                            const out = d.low_stock_items ? d.low_stock_items.filter(i => parseInt(i.quantity) === 0).length : 0;
                            const inStock = Math.max(0, total - low - out);
                            
                            stockChart.data.datasets[0].data = [inStock, low, out];
                            stockChart.update();
                            
                            const legends = document.querySelectorAll('.donut-legends .legend-item');
                            if(legends.length >= 3) {
                                legends[0].innerHTML = `<div class="legend-dot" style="background: #42b8a4;"></div> In Stock (${inStock})`;
                                legends[1].innerHTML = `<div class="legend-dot" style="background: #fbbf24;"></div> Low Stock (${low})`;
                                legends[2].innerHTML = `<div class="legend-dot" style="background: #f87171;"></div> Out of Stock (${out})`;
                            }
                        }

                        // 3. Update Recent Activities
                        const activityList = document.querySelector('.activity-list');
                        if (activityList && d.recent_sales) {
                            if (d.recent_sales.length === 0) {
                                activityList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-light);">No recent activities</div>';
                            } else {
                                activityList.innerHTML = '';
                                d.recent_sales.slice(0, 5).forEach(sale => {
                                    activityList.innerHTML += `
                                    <div style="display:flex; justify-content:space-between; padding:10px 15px; border-bottom:1px solid var(--border);">
                                        <div>
                                            <div style="font-weight:600; color:var(--navy);">Sale: ${sale.receipt_number}</div>
                                            <div style="font-size:0.75rem; color:var(--text-light);">By ${sale.full_name}</div>
                                        </div>
                                        <div style="font-weight:700; color:var(--teal);">KSh ${parseFloat(sale.total_amount).toLocaleString()}</div>
                                    </div>`;
                                });
                            }
                        }

                        // 4. Update Low Stock Table
                        const lowStockTbody = document.querySelector('#dashboard-view .data-table tbody');
                        if (lowStockTbody && d.low_stock_items) {
                            if (d.low_stock_items.length === 0) {
                                lowStockTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-light);">No stock alerts</td></tr>';
                            } else {
                                lowStockTbody.innerHTML = '';
                                d.low_stock_items.slice(0, 5).forEach(item => {
                                    const qty = parseInt(item.quantity);
                                    const statusHtml = qty === 0 
                                        ? '<span class="status-badge out">Out of Stock</span>'
                                        : '<span class="status-badge" style="background:#fef3c7; color:#d97706;">Low Stock</span>';
                                    
                                    lowStockTbody.innerHTML += `
                                    <tr>
                                        <td><strong>${item.item_name}</strong></td>
                                        <td style="text-align:center;">${(function(sz){try{let arr=JSON.parse(sz);return Array.isArray(arr)?arr.join(', '):sz;}catch(e){return sz;}})(item.size) || '-'}</td>
                                        <td style="text-align:center; font-weight:700; color:${qty===0?'var(--red)':'inherit'};">${qty}</td>
                                        <td>${statusHtml}</td>
                                        <td style="text-align:right;">
                                            <button class="btn-primary btn-small" onclick="document.querySelector('[data-target=\\'stock-view\\']').click()">Restock</button>
                                        </td>
                                    </tr>`;
                                });
                            }
                        }
                    }
                })
                .catch(err => console.error('Error loading dashboard stats:', err));
            }


            // --- LIVE DATE ---
            function updateDate() {
                const now = new Date();
                const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
                const formatted = now.toLocaleDateString('en-KE', options);
                const el1 = document.getElementById('current-date');
                const el2 = document.getElementById('admin-current-date');
                if (el1) el1.innerText = formatted;
                if (el2) el2.innerText = formatted;
            }
            updateDate();

            // --- NOTIFICATIONS ---
            window.toggleNotifDropdown = function() {
                const dd = document.getElementById('notif-dropdown');
                const isOpen = dd.style.display === 'block';
                dd.style.display = isOpen ? 'none' : 'block';
                if (!isOpen) loadNotifications();
            };

            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                const btn = document.getElementById('notification-btn');
                const dd = document.getElementById('notif-dropdown');
                if (btn && dd && !btn.contains(e.target)) {
                    dd.style.display = 'none';
                }
            });

            function loadNotifications() {
                const list = document.getElementById('notif-list');
                const badge = document.getElementById('notif-count');
                const label = document.getElementById('notif-count-label');
                if (!list) return;

                list.innerHTML = '<li style="padding:20px; text-align:center; color:var(--text-light); font-size:0.85rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</li>';

                fetch('database/dashboard.php')
                .then(res => res.json())
                .then(data => {
                    if (data.status !== 'success') return;
                    const d = data.data;
                    let html = '';
                    let totalCount = 0;

                    // ---- OUT OF STOCK items (urgent) ----
                    if (d.low_stock_items) {
                        const outItems = d.low_stock_items.filter(i => parseInt(i.quantity) === 0);
                        outItems.forEach(item => {
                            totalCount++;
                            html += `
                            <li style="display:flex; align-items:flex-start; gap:12px; padding:14px 18px; border-bottom:1px solid var(--border); background:#fff5f5;">
                                <div style="width:38px; height:38px; border-radius:50%; background:#fee2e2; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i class="fa-solid fa-circle-xmark" style="color:#dc2626; font-size:15px;"></i>
                                </div>
                                <div style="flex:1;">
                                    <div style="font-size:0.83rem; font-weight:700; color:#dc2626;">🚨 OUT OF STOCK</div>
                                    <div style="font-size:0.85rem; font-weight:600; color:var(--navy); margin:2px 0;">${item.item_name}</div>
                                    <div style="font-size:0.72rem; color:var(--text-light);">Size: ${(function(sz) { try { let arr = JSON.parse(sz); return Array.isArray(arr) ? arr.join(', ') : sz; } catch(e) { return sz; } })(item.size) || 'N/A'} &bull; 0 units left — Restock immediately!</div>
                                </div>
                            </li>`;
                        });

                        // ---- LOW STOCK items (warning, 1–10) ----
                        const lowItems = d.low_stock_items.filter(i => parseInt(i.quantity) > 0 && parseInt(i.quantity) <= 10);
                        lowItems.forEach(item => {
                            totalCount++;
                            const qty = parseInt(item.quantity);
                            const urgent = qty <= 3;
                            html += `
                            <li style="display:flex; align-items:flex-start; gap:12px; padding:14px 18px; border-bottom:1px solid var(--border); background:${urgent ? '#fffbeb' : '#fff'};">
                                <div style="width:38px; height:38px; border-radius:50%; background:${urgent ? '#fef3c7' : '#f0fdf4'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i class="fa-solid fa-triangle-exclamation" style="color:${urgent ? '#d97706' : '#16a34a'}; font-size:15px;"></i>
                                </div>
                                <div style="flex:1;">
                                    <div style="font-size:0.83rem; font-weight:700; color:${urgent ? '#d97706' : '#16a34a'};">${urgent ? '⚠️ CRITICALLY LOW' : '📦 LOW STOCK'}</div>
                                    <div style="font-size:0.85rem; font-weight:600; color:var(--navy); margin:2px 0;">${item.item_name}</div>
                                    <div style="font-size:0.72rem; color:var(--text-light);">Size: ${(function(sz) { try { let arr = JSON.parse(sz); return Array.isArray(arr) ? arr.join(', ') : sz; } catch(e) { return sz; } })(item.size) || 'N/A'} &bull; Only <strong>${qty}</strong> unit${qty > 1 ? 's' : ''} left — Please restock</div>
                                </div>
                                <span style="font-size:0.75rem; font-weight:700; color:white; background:${urgent ? '#d97706' : '#16a34a'}; padding:3px 8px; border-radius:20px; flex-shrink:0;">${qty}</span>
                            </li>`;
                        });
                    }

                    // ---- Recent Sales ----
                    if (d.recent_sales && d.recent_sales.length > 0) {
                        html += `<li style="padding:10px 18px; font-size:0.72rem; font-weight:700; color:var(--text-light); background:var(--bg); letter-spacing:0.05em; text-transform:uppercase;">Recent Sales</li>`;
                        d.recent_sales.forEach(sale => {
                            totalCount++;
                            const dt = new Date(sale.sale_date);
                            const timeStr = dt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
                            const dateStr = dt.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
                            html += `
                            <li style="display:flex; align-items:flex-start; gap:12px; padding:13px 18px; border-bottom:1px solid var(--border);">
                                <div style="width:38px; height:38px; border-radius:50%; background:#f0fdf4; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i class="fa-solid fa-receipt" style="color:var(--teal); font-size:14px;"></i>
                                </div>
                                <div style="flex:1;">
                                    <div style="font-size:0.83rem; font-weight:600; color:var(--navy);">Sale by ${sale.full_name}</div>
                                    <div style="font-size:0.72rem; color:var(--text-light);">Receipt: ${sale.receipt_number} &bull; ${dateStr} at ${timeStr}</div>
                                </div>
                                <span style="font-size:0.8rem; font-weight:700; color:var(--teal); flex-shrink:0;">KSh ${parseFloat(sale.total_amount).toLocaleString()}</span>
                            </li>`;
                        });
                    }

                    if (html === '') {
                        list.innerHTML = `<li style="padding:30px 20px; text-align:center; color:var(--text-light); font-size:0.85rem;">
                            <i class="fa-regular fa-bell-slash" style="font-size:28px; display:block; margin-bottom:10px; color:var(--border);"></i>
                            All systems normal.<br>No alerts at this time.
                        </li>`;
                        badge.style.display = 'none';
                        label.innerText = '0 alerts';
                        return;
                    }

                    list.innerHTML = html;
                    const alertCount = d.low_stock_items ? d.low_stock_items.length : 0;
                    if (alertCount > 0) {
                        badge.style.display = 'flex';
                        badge.innerText = alertCount;
                        label.innerText = `${alertCount} alert${alertCount > 1 ? 's' : ''}`;
                    } else {
                        badge.style.display = 'none';
                        label.innerText = 'No alerts';
                    }
                })
                .catch(() => {
                    list.innerHTML = `<li style="padding:20px; text-align:center; color:var(--red); font-size:0.85rem;">Error loading notifications.</li>`;
                });
            }

            // Auto-load badge count on page load
            fetch('database/dashboard.php')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.data) {
                    const alertCount = data.data.low_stock_items ? data.data.low_stock_items.length : 0;
                    const badge = document.getElementById('notif-count');
                    if (badge && alertCount > 0) {
                        badge.style.display = 'flex';
                        badge.innerText = alertCount;
                    }
                }
            }).catch(() => {});

            // Auto-refresh notifications every 60 seconds
            setInterval(() => {
                const dd = document.getElementById('notif-dropdown');
                if (dd && dd.style.display === 'block') loadNotifications();
                // Always refresh badge silently
                fetch('database/dashboard.php')
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success' && data.data) {
                        const alertCount = data.data.low_stock_items ? data.data.low_stock_items.length : 0;
                        const badge = document.getElementById('notif-count');
                        if (badge) {
                            badge.style.display = alertCount > 0 ? 'flex' : 'none';
                            if (alertCount > 0) badge.innerText = alertCount;
                        }
                    }
                }).catch(() => {});
            }, 60000);
            
            function initAdminCharts() {
                loadDashboardStats();
                
                // Sales Overview Line Chart
                const salesChartCanvas = document.getElementById('salesChart');
                if (salesChartCanvas) {
                    const ctxSales = salesChartCanvas.getContext('2d');
                    let gradient = ctxSales.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(66, 184, 164, 0.4)');
                    gradient.addColorStop(1, 'rgba(66, 184, 164, 0)');
                    
                    new Chart(ctxSales, {
                        type: 'line',
                        data: {
                            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                            datasets: [{
                                label: 'Sales (KSh)',
                                data: [0, 0, 0, 0, 0, 0, 0],
                                borderColor: '#42b8a4',
                                backgroundColor: gradient,
                                borderWidth: 3,
                                pointBackgroundColor: '#ffffff',
                                pointBorderColor: '#42b8a4',
                                pointBorderWidth: 2,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                                fill: true,
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                                y: { 
                                    beginAtZero: true,
                                    ticks: { callback: function(value) { return value / 1000 + 'K'; }, color: '#94a3b8', font: { family: 'Poppins' } },
                                    border: { display: false },
                                    grid: { color: '#f1f5f9' }
                                },
                                x: {
                                    ticks: { color: '#94a3b8', font: { family: 'Poppins' } },
                                    border: { display: false },
                                    grid: { display: false }
                                }
                            }
                        }
                    });
                }

                // Stock Status Donut Chart
                const stockChartCanvas = document.getElementById('stockChart');
                if (stockChartCanvas) {
                    const ctxStock = stockChartCanvas.getContext('2d');
                    const centerTextPlugin = {
                        id: 'centerText',
                        beforeDraw: function(chart) {
                            if (chart.config.type !== 'doughnut') return;
                            let width = chart.width, height = chart.height, ctx = chart.ctx;
                            ctx.restore();
                            let fontSize = (height / 114).toFixed(2);
                            ctx.font = "800 " + fontSize + "em Poppins";
                            ctx.textBaseline = "middle";
                            ctx.fillStyle = "#0b1320";
                            let chartData = chart.data.datasets[0].data;
                            let totalVal = chartData.reduce((a, b) => (parseInt(a) || 0) + (parseInt(b) || 0), 0);
                            let text = totalVal.toString(),
                                textX = Math.round((width - ctx.measureText(text).width) / 2),
                                textY = height / 2 - 10;
                            ctx.fillText(text, textX, textY);
                            
                            ctx.font = "500 " + (fontSize * 0.4).toFixed(2) + "em Poppins";
                            ctx.fillStyle = "#64748b";
                            let text2 = "Total Items",
                                text2X = Math.round((width - ctx.measureText(text2).width) / 2),
                                text2Y = height / 2 + 15;
                            ctx.fillText(text2, text2X, text2Y);
                            ctx.save();
                        }
                    };
                    
                    new Chart(ctxStock, {
                        type: 'doughnut',
                        data: {
                            labels: ['In Stock', 'Low Stock', 'Out of Stock'],
                            datasets: [{
                                data: [0, 0, 0],
                                backgroundColor: ['#42b8a4', '#fbbf24', '#f87171'],
                                borderWidth: 0,
                                cutout: '75%'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            animation: { animateScale: true, animateRotate: true }
                        },
                        plugins: [centerTextPlugin]
                    });
                }
            }
        });

        // User Management Logic
        function loadUsers() {
            fetch('database/users.php?action=list')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    const tbody = document.querySelector('#users-view tbody');
                    tbody.innerHTML = '';
                    data.data.forEach(user => {
                        let roleBadge = user.role === 'Admin' 
                            ? '<span class="status-badge" style="background:#fef3c7; color:#d97706;">Administrator</span>' 
                            : '<span class="status-badge" style="background:#e0f2fe; color:#0369a1;">Shop Attendant</span>';
                        let statusBadge = user.status === 'Active' 
                            ? '<span class="status-badge active">Active</span>' 
                            : '<span class="status-badge out">Inactive</span>';
                        
                        tbody.innerHTML += `
                            <tr>
                                <td>
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <div style="width:35px; height:35px; background:var(--teal); color:var(--white); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700;">${user.full_name.charAt(0).toUpperCase()}</div>
                                        <div style="font-weight:600; color:var(--navy);">${user.full_name} <br><small style="color:var(--text-light);">${user.username}</small></div>
                                    </div>
                                </td>
                                <td>${roleBadge}</td>
                                <td>${user.phone || '-'}</td>
                                <td>${statusBadge}</td>
                                <td style="text-align: center;">
                                    <button class="btn-action" style="margin-right:5px;" onclick="resetUserPassword(${user.user_id})" title="Reset Password to 12345"><i class="fa-solid fa-key"></i></button>
                                    <button class="btn-action" style="color:${user.status === 'Active' ? 'var(--red)' : 'var(--teal)'};" onclick="toggleUserStatus(${user.user_id})" title="Toggle Active Status"><i class="fa-solid fa-power-off"></i></button>
                                </td>
                            </tr>
                        `;
                    });
                }
            })
            .catch(err => { console.error(err); alert('Network error. Please try again.'); });
        }


        function submitAddUser(e) {
            e.preventDefault();
            const formData = new FormData();
            formData.append('action', 'add');
            formData.append('full_name', document.getElementById('add_full_name').value);
            formData.append('username', document.getElementById('add_username').value);
            formData.append('role', document.getElementById('add_role').value);
            formData.append('phone', document.getElementById('add_phone').value);
            formData.append('default_password', document.getElementById('add_default_password').value);
            
            fetch('database/users.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('User added successfully!');
                    document.getElementById('addUserModal').style.display = 'none';
                    document.getElementById('addUserForm').reset();
                    loadUsers();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(err => { console.error(err); alert('Network error. Please try again.'); });
        }

        function resetUserPassword(userId) {
            if (confirm("Reset this user's password to '12345'? They will be forced to change it on login.")) {
                const formData = new FormData();
                formData.append('action', 'reset_password');
                formData.append('user_id', userId);
                fetch('database/users.php', { method: 'POST', body: formData })
                .then(res => res.json())
                .then(data => {
                    alert(data.message);
                })
                .catch(err => { console.error(err); alert('Network error. Please try again.'); });
            }
        }

        function toggleUserStatus(userId) {
            if (confirm("Are you sure you want to change this user's access status?")) {
                const formData = new FormData();
                formData.append('action', 'toggle_status');
                formData.append('user_id', userId);
                fetch('database/users.php', { method: 'POST', body: formData })
                .then(res => res.json())
                .then(data => {
                    alert(data.message);
                    loadUsers();
                })
                .catch(err => { console.error(err); alert('Network error. Please try again.'); });
            }
        }

        function submitForcePassword(e) {
            e.preventDefault();
            const formData = new FormData();
            formData.append('action', 'change_password');
            formData.append('new_password', document.getElementById('force_new_password').value);
            
            fetch('database/auth.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('Password updated successfully! Welcome to your dashboard.');
                    document.getElementById('forcePasswordModal').style.display = 'none';
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(err => { console.error(err); alert('Network error. Please try again.'); });
        }

        // Inventory Logic
        function loadInventory() {
            fetch('database/inventory.php?action=list')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    const tbody = document.querySelector('#stock-view tbody');
                    if(tbody) {
                        tbody.innerHTML = '';
                        window.allAdminShoes = data.data;
                data.data.forEach(shoe => {
                            let statusBadge = shoe.quantity > 5 
                                ? '<span class="status-badge active">In Stock</span>' 
                                : (shoe.quantity > 0 ? '<span class="status-badge" style="background:#fef3c7; color:#d97706;">Low Stock</span>' : '<span class="status-badge out">Out of Stock</span>');
                            
                            tbody.innerHTML += `
                                <tr>
                                    <td>
                                        <div class="td-shoe">
                                            <img src="${getSafeImageUrl(shoe.image)}" onerror="this.src='assets/images/hero-shoe.png'">
                                            <div>
                                                <div style="font-weight:600; color:var(--navy);">${shoe.shoe_name}</div>
                                                <div style="font-size:0.75rem; color:var(--text-light);">Code: ${shoe.barcode || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>${shoe.category || 'N/A'} <br><small style="color:var(--text-light);">${shoe.brand || 'N/A'}</small></td>
                                    <td style="text-align: center;">${shoe.size || '-'}</td>
                                    <td style="text-align: center; font-weight:700;">${shoe.quantity}</td>
                                    <td>${statusBadge}</td>
                                    <td style="text-align: right; font-weight:600;">KSh ${parseFloat(shoe.selling_price).toLocaleString()}</td>
                                    <td style="text-align: center;">
                                        <button class="btn-action" style="margin-right:5px;"><i class="fa-solid fa-pen"></i></button>
                                        <button class="btn-action" style="color:var(--red);" onclick="deleteShoe(${shoe.shoe_id})"><i class="fa-solid fa-trash"></i></button>
                                    </td>
                                </tr>
                            `;
                        });
                    }
                }
            })
            .catch(err => { console.error(err); alert('Network error. Please try again.'); });
        }

        function submitAddShoe(e) {
            e.preventDefault();
            const formData = new FormData(document.getElementById('addShoeForm'));
            
            fetch('database/inventory.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('Shoe added successfully!');
                    document.getElementById('addShoeForm').reset();
                    loadInventory();
                    document.querySelector('[data-target="stock-view"]').click();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(err => { console.error(err); alert('Network error. Please try again.'); });
        }

        window.deleteShoe = function(shoeId) {
            if (confirm("Are you sure you want to remove this shoe from inventory?")) {
                const formData = new FormData();
                formData.append('action', 'delete');
                formData.append('shoe_id', shoeId);
                fetch('database/inventory.php', { method: 'POST', body: formData })
                .then(res => res.json())
                .then(data => {
                    alert(data.message);
                    loadInventory();
                })
                .catch(err => { console.error(err); alert('Network error. Please try again.'); });
            }
        }

        // --- SUPPLIERS LOGIC ---
        window.toggleSupplierForm = function() {
            const panel = document.getElementById('supplier-form-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            document.getElementById('supplier-msg').innerText = '';
        }

        // --- ADMIN PROFILE LOGIC ---
        function loadAdminProfile() {
            fetch('database/profile.php?action=get')
            .then(res => res.json())
            .then(data => {
                if (data.status !== 'success') return;
                const u = data.data;
                document.getElementById('profile-display-name').innerText = u.full_name;
                document.getElementById('profile-display-role').innerText = u.role;
                document.getElementById('profile-full-name').value = u.full_name;
                document.getElementById('profile-username').value = u.username;
                document.getElementById('profile-phone').value = u.phone || '';
                const since = new Date(u.created_at.replace(' ', 'T') + '+03:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
                document.getElementById('profile-since').value = since;
            })
            .catch(() => {});
        }

        function saveProfileDetails() {
            const full_name = document.getElementById('profile-full-name').value.trim();
            const phone = document.getElementById('profile-phone').value.trim();
            const msg = document.getElementById('profile-update-msg');
            const btn = document.getElementById('profile-update-btn');

            if (!full_name) {
                msg.style.color = 'var(--red)'; msg.innerText = 'Full name cannot be empty.'; return;
            }
            btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            msg.innerText = '';

            const formData = new FormData();
            formData.append('action', 'update_profile');
            formData.append('full_name', full_name);
            formData.append('phone', phone);

            fetch('database/profile.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
                if (data.status === 'success') {
                    msg.style.color = 'var(--teal)'; msg.innerText = '✓ Profile updated!';
                    // Update topbar and sidebar names
                    document.getElementById('topbar-name').innerText = full_name.split(' ')[0] + ' ' + (full_name.split(' ')[1] || '');
                    document.getElementById('profile-display-name').innerText = full_name;
                    const sidebarName = document.getElementById('sidebar-name');
                    if (sidebarName) sidebarName.innerText = full_name;
                } else {
                    msg.style.color = 'var(--red)'; msg.innerText = data.message;
                }
            })
            .catch(() => { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes'; msg.style.color = 'var(--red)'; msg.innerText = 'Network error.'; });
        }

        function changePassword() {
            const cur = document.getElementById('cur-password').value;
            const nw  = document.getElementById('new-password').value;
            const con = document.getElementById('confirm-password').value;
            const msg = document.getElementById('password-change-msg');
            const btn = document.getElementById('pw-change-btn');

            msg.innerText = '';
            if (!cur || !nw || !con) { msg.style.color='var(--red)'; msg.innerText='All fields are required.'; return; }
            if (nw !== con)          { msg.style.color='var(--red)'; msg.innerText='New passwords do not match.'; return; }
            if (nw.length < 6)       { msg.style.color='var(--red)'; msg.innerText='Password must be at least 6 characters.'; return; }

            btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Changing...';

            const formData = new FormData();
            formData.append('action', 'change_password');
            formData.append('current_password', cur);
            formData.append('new_password', nw);
            formData.append('confirm_password', con);

            fetch('database/profile.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-key"></i> Change Password';
                if (data.status === 'success') {
                    msg.style.color = 'var(--teal)'; msg.innerText = '✓ Password changed successfully!';
                    document.getElementById('cur-password').value = '';
                    document.getElementById('new-password').value = '';
                    document.getElementById('confirm-password').value = '';
                    document.getElementById('pw-strength-bar').style.width = '0%';
                    document.getElementById('pw-strength-label').innerText = '';
                } else {
                    msg.style.color = 'var(--red)'; msg.innerText = data.message;
                }
            })
            .catch(() => { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-key"></i> Change Password'; msg.style.color='var(--red)'; msg.innerText='Network error.'; });
        }

        // Password strength meter
        document.addEventListener('input', function(e) {
            if (e.target.id !== 'new-password') return;
            const val = e.target.value;
            const bar = document.getElementById('pw-strength-bar');
            const lbl = document.getElementById('pw-strength-label');
            if (!bar || !lbl) return;
            let score = 0;
            if (val.length >= 6)  score++;
            if (val.length >= 10) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;
            const levels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
            const colors = ['', '#dc2626', '#ea580c', '#d97706', '#16a34a', '#059669'];
            const widths = ['0%', '20%', '40%', '60%', '80%', '100%'];
            bar.style.width = val ? widths[score] : '0%';
            bar.style.background = val ? colors[score] : 'var(--red)';
            lbl.style.color = val ? colors[score] : 'var(--text-light)';
            lbl.innerText = val ? levels[score] : '';
        });

        // --- SUPPLIERS LOGIC ---
        function loadSuppliers() {
            const tbody = document.getElementById('suppliers-table-body');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';

            fetch('database/suppliers.php?action=list')
            .then(res => res.json())
            .then(data => {
                if (data.status !== 'success' || data.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-light);">No suppliers found. Click "+ Add Supplier" to add one!</td></tr>';
                    return;
                }
                tbody.innerHTML = '';
                data.data.forEach(s => {
                    tbody.innerHTML += `
                        <tr>
                            <td><strong>${s.supplier_name}</strong></td>
                            <td>${s.contact_person || '-'}</td>
                            <td>${s.phone || '-'}</td>
                            <td>${s.email || '-'}</td>
                            <td style="text-align:center;">
                                <button class="btn-action" style="color:var(--red);" onclick="deleteSupplier(${s.supplier_id}, '${s.supplier_name.replace(/'/g, '&#39;')}')">
                                    <i class="fa-regular fa-trash-can"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            })
            .catch(() => {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--red);">Error loading suppliers.</td></tr>';
            });
        }

        window.saveSupplier = function() {
            const name    = document.getElementById('sup-name').value.trim();
            const contact = document.getElementById('sup-contact').value.trim();
            const phone   = document.getElementById('sup-phone').value.trim();
            const email   = document.getElementById('sup-email').value.trim();
            const address = document.getElementById('sup-address').value.trim();
            const msg     = document.getElementById('supplier-msg');
            const btn     = document.getElementById('save-supplier-btn');

            if (!name) {
                msg.style.color = 'var(--red)';
                msg.innerText = 'Supplier name is required.';
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            msg.innerText = '';

            const formData = new FormData();
            formData.append('action', 'add');
            formData.append('supplier_name', name);
            formData.append('contact_person', contact);
            formData.append('phone', phone);
            formData.append('email', email);
            formData.append('address', address);

            fetch('database/suppliers.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Supplier';
                if (data.status === 'success') {
                    msg.style.color = 'var(--teal)';
                    msg.innerText = '✓ Supplier added successfully!';
                    // Clear form
                    ['sup-name','sup-contact','sup-phone','sup-email','sup-address'].forEach(id => document.getElementById(id).value = '');
                    loadSuppliers();
                } else {
                    msg.style.color = 'var(--red)';
                    msg.innerText = data.message;
                }
            })
            .catch(() => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Supplier';
                msg.style.color = 'var(--red)';
                msg.innerText = 'Network error. Please try again.';
            });
        }

        window.deleteSupplier = function(id, name) {
            if (!confirm(`Remove supplier "${name}"?`)) return;
            const formData = new FormData();
            formData.append('action', 'delete');
            formData.append('supplier_id', id);
            fetch('database/suppliers.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                loadSuppliers();
            })
            .catch(err => { console.error(err); alert('Network error. Please try again.'); });
        }

        // --- CATEGORIES LOGIC ---
        function loadCategories() {
            const tbody = document.getElementById('categories-table-body');
            const parentDropdown = document.getElementById('parent-category-select');
            
            if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
            
            // Fetch for the management table (all categories)
            fetch('database/categories.php?action=list')
            .then(res => res.json())
            .then(data => {
                if (data.status !== 'success' || !data.data || data.data.length === 0) {
                    if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-light);">No categories found. Add your first category!</td></tr>';
                    if (parentDropdown) parentDropdown.innerHTML = '<option value="">None (Top Level)</option>';
                    return;
                }
                if (tbody) tbody.innerHTML = '';
                if (parentDropdown) parentDropdown.innerHTML = '<option value="">None (Top Level)</option>';
                
                // Group categories by parent
                const topLevel = data.data.filter(c => !c.parent_id);
                const subCats = data.data.filter(c => c.parent_id);
                
                // Populate parent dropdown only with top level
                topLevel.forEach(cat => {
                    if (parentDropdown) parentDropdown.innerHTML += `<option value="${cat.category_id}">${cat.name}</option>`;
                });

                // Render table
                if (tbody) {
                    topLevel.forEach(cat => {
                        tbody.innerHTML += renderCategoryRow(cat, false);
                        const children = subCats.filter(c => c.parent_id == cat.category_id);
                        children.forEach(child => {
                            tbody.innerHTML += renderCategoryRow(child, true);
                        });
                    });
                }
            })
            .catch(err => {
                console.error(err);
                if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--red);">Failed to load categories.</td></tr>';
            });

            // Fetch strictly Shoe Categories for the shoe form dropdown
            fetch('database/categories.php?action=list&type=shoe')
            .then(res => res.json())
            .then(data => {
                const dropdown = document.getElementById('category');
                if (dropdown && data.data) {
                    dropdown.innerHTML = '<option value="">Select a category</option>';
                    data.data.forEach(cat => dropdown.innerHTML += `<option value="${cat.name}">${cat.name}</option>`);
                }
            }).catch(() => {});

            // Fetch strictly Cloth Categories for the cloth form dropdown
            fetch('database/categories.php?action=list&type=cloth')
            .then(res => res.json())
            .then(data => {
                const clothDropdown = document.getElementById('cloth_category');
                if (clothDropdown && data.data) {
                    clothDropdown.innerHTML = '<option value="">Select a category</option>';
                    data.data.forEach(cat => clothDropdown.innerHTML += `<option value="${cat.name}">${cat.name}</option>`);
                }
            }).catch(() => {});
        }

        function renderCategoryRow(cat, isSub) {
            const padding = isSub ? 'padding-left: 30px;' : 'font-weight: bold;';
            const prefix = isSub ? '<i class="fa-solid fa-level-up-alt fa-rotate-90" style="color:var(--text-light); margin-right:8px;"></i>' : '';
            return `
                <tr style="${isSub ? 'background-color: rgba(0,0,0,0.02);' : ''}">
                    <td style="${padding}">${prefix}${cat.name}</td>
                    <td>${cat.total_shoes} shoes, ${cat.total_clothes || 0} clothes</td>
                    <td style="text-align:center;">
                        <button class="btn-action" style="color:var(--teal); margin-right:5px;" onclick="editCategory(${cat.category_id}, '${cat.name.replace(/'/g, "\\'")}', ${cat.parent_id || 'null'})">
                            <i class="fa-regular fa-pen-to-square"></i>
                        </button>
                        <button class="btn-action" style="color:var(--red);" onclick="deleteCategory(${cat.category_id}, '${cat.name.replace(/'/g, "\\'")}')">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        }

        function editCategory(id, currentName, currentParentId) {
            const newName = prompt('Enter new category name:', currentName);
            if (!newName || newName.trim() === '' || newName.trim() === currentName) return;
            
            const formData = new FormData();
            formData.append('action', 'edit');
            formData.append('category_id', id);
            formData.append('name', newName.trim());
            formData.append('old_name', currentName);
            if (currentParentId) {
                formData.append('parent_id', currentParentId);
            }
            
            fetch('database/categories.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('Category updated successfully!');
                    loadCategories();
                    if(typeof loadBrands === 'function') loadBrands();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(() => alert('Network error. Please try again.'));
        }

        // --- BRANDS LOGIC ---
        function loadBrands() {
            const tbody = document.getElementById('brands-table-body');
            const dropdown = document.getElementById('brand');
            const clothDropdown = document.getElementById('cloth_brand');
            if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
            
            // Fetch for the management table (all brands)
            fetch('database/brands.php?action=list')
            .then(res => res.json())
            .then(data => {
                if (data.status !== 'success' || !data.data || data.data.length === 0) {
                    if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-light);">No brands found. Add your first brand!</td></tr>';
                    return;
                }
                if (tbody) tbody.innerHTML = '';
                data.data.forEach(brand => {
                    if (tbody) {
                        tbody.innerHTML += `
                            <tr>
                                <td><strong>${brand.name}</strong></td>
                                <td>${brand.total_shoes || 0} shoes, ${brand.total_clothes || 0} clothes</td>
                                <td style="text-align:center;">
                                    <button class="btn-action" style="color:var(--teal); margin-right:5px;" onclick="editBrand(${brand.brand_id}, '${brand.name.replace(/'/g, "\\'")}')">
                                        <i class="fa-regular fa-pen-to-square"></i>
                                    </button>
                                    <button class="btn-action" style="color:var(--red);" onclick="deleteBrand(${brand.brand_id}, '${brand.name.replace(/'/g, "\\'")}')">
                                        <i class="fa-regular fa-trash-can"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }
                });
            })
            .catch(() => {
                if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--red);">Error loading brands.</td></tr>';
            });

            // Fetch strictly Shoe Brands for the shoe form dropdown
            fetch('database/brands.php?action=list&type=shoe')
            .then(res => res.json())
            .then(data => {
                const dropdown = document.getElementById('brand');
                if (dropdown && data.data) {
                    dropdown.innerHTML = '<option value="">Select a brand</option>';
                    data.data.forEach(brand => dropdown.innerHTML += `<option value="${brand.name}">${brand.name}</option>`);
                }
            }).catch(() => {});

            // Fetch strictly Cloth Brands for the cloth form dropdown
            fetch('database/brands.php?action=list&type=cloth')
            .then(res => res.json())
            .then(data => {
                const clothDropdown = document.getElementById('cloth_brand');
                if (clothDropdown && data.data) {
                    clothDropdown.innerHTML = '<option value="">Select a brand</option>';
                    data.data.forEach(brand => clothDropdown.innerHTML += `<option value="${brand.name}">${brand.name}</option>`);
                }
            }).catch(() => {});
        }

        function saveBrand() {
            const input = document.getElementById('brand-name-input');
            const msg = document.getElementById('brand-msg');
            const btn = document.getElementById('save-brand-btn');
            if(!input || !msg || !btn) return;
            const name = input.value.trim();
            
            if (!name) {
                msg.style.color = 'var(--red)';
                msg.innerText = 'Please enter a brand name.';
                return;
            }
            
            btn.disabled = true;
            btn.innerText = 'Saving...';
            msg.innerText = '';
            
            const formData = new FormData();
            formData.append('action', 'add');
            formData.append('name', name);
            
            fetch('database/brands.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                btn.disabled = false;
                btn.innerText = 'Save Brand';
                if (data.status === 'success') {
                    msg.style.color = 'var(--teal)';
                    msg.innerText = '✓ Brand added successfully!';
                    input.value = '';
                    loadBrands();
                } else {
                    msg.style.color = 'var(--red)';
                    msg.innerText = data.message;
                }
            })
            .catch(() => {
                btn.disabled = false;
                btn.innerText = 'Save Brand';
                msg.style.color = 'var(--red)';
                msg.innerText = 'Network error. Please try again.';
            });
        }

        function editBrand(id, currentName) {
            const newName = prompt('Enter new brand name:', currentName);
            if (!newName || newName.trim() === '' || newName.trim() === currentName) return;
            
            const formData = new FormData();
            formData.append('action', 'edit');
            formData.append('brand_id', id);
            formData.append('name', newName.trim());
            formData.append('old_name', currentName);
            
            fetch('database/brands.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('Brand updated successfully!');
                    loadBrands();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(() => alert('Network error. Please try again.'));
        }

        function deleteBrand(id, name) {
            if (!confirm(`Delete brand "${name}"? This will not delete shoes in this brand.`)) return;
            const formData = new FormData();
            formData.append('action', 'delete');
            formData.append('brand_id', id);
            fetch('database/brands.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                loadBrands();
            })
            .catch(err => { console.error(err); alert('Network error. Please try again.'); });
        }
        
        function saveCategory() {
            const input = document.getElementById('category-name-input');
            const parentSelect = document.getElementById('parent-category-select');
            const msg = document.getElementById('category-msg');
            const btn = document.getElementById('save-category-btn');
            const name = input.value.trim();
            const parentId = parentSelect ? parentSelect.value : '';
            
            if (!name) {
                msg.style.color = 'var(--red)';
                msg.innerText = 'Please enter a category name.';
                return;
            }
            
            btn.disabled = true;
            btn.innerText = 'Saving...';
            
            const formData = new FormData();
            formData.append('action', 'add');
            formData.append('name', name);
            if (parentId) formData.append('parent_id', parentId);
            
            fetch('database/categories.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                btn.disabled = false;
                btn.innerText = 'Save Category';
                if (data.status === 'success') {
                    msg.style.color = 'var(--teal)';
                    msg.innerText = '✓ Category added successfully!';
                    input.value = '';
                    if (parentSelect) parentSelect.value = '';
                    loadCategories();
                } else {
                    msg.style.color = 'var(--red)';
                    msg.innerText = data.message;
                }
            })
            .catch(() => {
                btn.disabled = false;
                btn.innerText = 'Save Category';
                msg.style.color = 'var(--red)';
                msg.innerText = 'Network error. Please try again.';
            });
        }
        
        function deleteCategory(id, name) {
            if (!confirm(`Delete category "${name}"? This will not delete shoes in this category.`)) return;
            const formData = new FormData();
            formData.append('action', 'delete');
            formData.append('category_id', id);
            fetch('database/categories.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                loadCategories();
            })
            .catch(err => { console.error(err); alert('Network error. Please try again.'); });
        }

        // --- RECORD SALE (Attendant / Admin manual sale) ---
        let saleItems = [];
        let saleInventoryCache = [];

        function loadSaleInventory() {
            const sel = document.getElementById('sale-item-select');
            if (!sel) return;
            sel.innerHTML = '<option value="">-- Loading... --</option>';

            const shoesPromise = fetch('database/inventory.php?action=list').then(r => r.json()).catch(() => ({ status: 'error' }));
            const clothesPromise = fetch('database/clothes.php?action=list').then(r => r.json()).catch(() => ({ status: 'error' }));

            Promise.all([shoesPromise, clothesPromise]).then(([shoesData, clothesData]) => {
                saleInventoryCache = [];
                let options = '<option value="">-- Select an item --</option>';

                if (shoesData.status === 'success') {
                    const shoes = shoesData.data.filter(s => parseInt(s.quantity) > 0);
                    shoes.forEach(s => {
                        const sItem = { item_id: s.shoe_id, item_type: 'shoe', shoe_id: s.shoe_id, item_name: s.shoe_name, selling_price: s.selling_price, stock: s.quantity, sizes: s.sizes, colors: s.colors };
                        saleInventoryCache.push(sItem);
                        options += `<option value="${s.shoe_id}" data-type="shoe">?? ${s.shoe_name} | KSh ${parseFloat(s.selling_price).toLocaleString()} (${s.quantity} left)</option>`;
                    });
                }
                if (clothesData.status === 'success') {
                    const clothes = clothesData.data.filter(c => parseInt(c.quantity) > 0);
                    clothes.forEach(c => {
                        const cItem = { item_id: c.cloth_id, item_type: 'cloth', cloth_id: c.cloth_id, item_name: c.cloth_name, selling_price: c.selling_price, stock: c.quantity, sizes: c.size, colors: c.color };
                        saleInventoryCache.push(cItem);
                        options += `<option value="${c.cloth_id}" data-type="cloth">?? ${c.cloth_name} | KSh ${parseFloat(c.selling_price).toLocaleString()} (${c.quantity} left)</option>`;
                    });
                }
                sel.innerHTML = options;
            });
        }

        function onSaleItemSelect() {
            const shoeId = document.getElementById('sale-item-select').value;
            const preview = document.getElementById('sale-item-preview');
            if (!shoeId) { preview.style.display = 'none'; return; }
            const shoe = saleInventoryCache.find(s => s.item_id == selectedId || s.shoe_id == selectedId || s.cloth_id == selectedId);
            if (!shoe) return;
                        document.getElementById('preview-name').innerText = shoe.item_name || shoe.shoe_name || shoe.cloth_name || '';
            
            // Build Size Dropdown
            let sizeSelect = document.getElementById('sale-item-size');
            if(!sizeSelect) {
                sizeSelect = document.createElement('select');
                sizeSelect.id = 'sale-item-size';
                sizeSelect.className = 'form-select';
                sizeSelect.style.marginTop = '10px';
                document.getElementById('sale-item-preview').appendChild(sizeSelect);
            }
            sizeSelect.innerHTML = '<option value="">-- Select Size --</option>';
            if(shoe.sizes && shoe.sizes.length > 0) shoe.sizes.forEach(sz => sizeSelect.innerHTML += `<option value="${sz}">${sz}</option>`);
            else sizeSelect.innerHTML += `<option value="N/A">N/A</option>`;

            // Build Color Dropdown
            let colorSelect = document.getElementById('sale-item-color');
            if(!colorSelect) {
                colorSelect = document.createElement('select');
                colorSelect.id = 'sale-item-color';
                colorSelect.className = 'form-select';
                colorSelect.style.marginTop = '10px';
                document.getElementById('sale-item-preview').appendChild(colorSelect);
            }
            colorSelect.innerHTML = '<option value="">-- Select Color --</option>';
            if(shoe.colors && shoe.colors.length > 0) shoe.colors.forEach(cl => colorSelect.innerHTML += `<option value="${cl}">${cl}</option>`);
            else colorSelect.innerHTML += `<option value="N/A">N/A</option>`;

            document.getElementById('preview-size').innerText = shoe.sizes ? shoe.sizes.join(', ') : '-';
            document.getElementById('preview-stock').innerText = shoe.quantity;
            document.getElementById('preview-price').innerText = 'KSh ' + parseFloat(shoe.selling_price).toLocaleString();
            preview.style.display = 'block';
            document.getElementById('sale-item-qty').max = shoe.quantity;
        }

                function addSaleItem() {
            const shoeId = parseInt(document.getElementById('sale-item-select').value);
            const qty    = parseInt(document.getElementById('sale-item-qty').value) || 1;
            const sizeSel = document.getElementById('sale-item-size');
            const colorSel = document.getElementById('sale-item-color');
            const selSize = sizeSel ? sizeSel.value : '';
            const selColor = colorSel ? colorSel.value : '';

            if (!shoeId) { alert('Please select an item first.'); return; }
            if (sizeSel && sizeSel.options.length > 1 && !selSize) { alert('Please select a size.'); return; }
            if (colorSel && colorSel.options.length > 1 && !selColor) { alert('Please select a color.'); return; }

            const shoe = saleInventoryCache.find(s => s.item_id == shoeId || s.shoe_id == shoeId || s.cloth_id == shoeId);
            if (!shoe) return;
            if (qty < 1 || qty > parseInt(shoe.quantity)) {
                alert(`Invalid quantity. Only ${shoe.quantity} units available.`); return;
            }
            
            // Check if already added (match id, size, and color)
            const existing = saleItems.find(i => (i.item_id || i.shoe_id) == shoeId && i.selected_size == selSize && i.selected_color == selColor);
            if (existing) {
                const newQty = existing.qty + qty;
                if (newQty > parseInt(shoe.quantity)) { alert(`Total quantity exceeds stock (${shoe.quantity} available).`); return; }
                existing.qty = newQty;
            } else {
                saleItems.push({ 
                    shoe_id: shoe.shoe_id, 
                    shoe_name: shoe.shoe_name, 
                    selected_size: selSize, 
                    selected_color: selColor, 
                    selling_price: shoe.selling_price, 
                    qty: qty, 
                    stock: shoe.quantity 
                });
            }
            renderSaleTable();
            document.getElementById('sale-item-select').value = '';
            document.getElementById('sale-item-preview').style.display = 'none';
            document.getElementById('sale-item-qty').value = 1;
        }

        function removeSaleItem(shoeId, sz, cl) { saleItems = saleItems.filter(i => !(i.shoe_id == shoeId && i.selected_size == sz && i.selected_color == cl)); renderSaleTable(); }

        function updateSaleQty(shoeId, sz, cl, newQty) {
            const item = saleItems.find(i => i.shoe_id == shoeId && i.selected_size == sz && i.selected_color == cl);
            if (!item) return;
            newQty = parseInt(newQty);
            if (newQty < 1) newQty = 1;
            if (newQty > item.stock) { alert(`Only ${item.stock} units in stock.`); newQty = item.stock; }
            item.qty = newQty;
            renderSaleTable();
        }

        function renderSaleTable() {
            const tbody = document.getElementById('sale-items-body');
            const grandTotal = document.getElementById('sale-grand-total');
            const payTotal   = document.getElementById('pay-total');
            const itemCount  = document.getElementById('pay-item-count');
            if (!tbody) return;

            if (saleItems.length === 0) {
                tbody.innerHTML = '<tr id="sale-empty-row"><td colspan="6" style="text-align:center; color:var(--text-light); padding:30px;">No items added yet. Use the form above to add items.</td></tr>';
                grandTotal.innerText = 'KSh 0'; payTotal.innerText = 'KSh 0'; itemCount.innerText = '0';
                return;
            }

            let total = 0;
            tbody.innerHTML = '';
            saleItems.forEach(item => {
                const sub = parseFloat(item.selling_price) * item.qty;
                total += sub;
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${item.item_name}</strong><br><small style="color:#64748b;">${item.selected_size} ${item.selected_color}</small></td><td style="text-align:center;">${item.selected_size}</td>
                        <td style="text-align:center;">
                            <input type="number" value="${item.qty}" min="1" max="${item.stock}"
                                style="width:60px; text-align:center; padding:4px; border:1px solid var(--border); border-radius:6px; font-size:0.85rem;"
                                onchange="updateSaleQty(${item.shoe_id}, '${item.selected_size}', '${item.selected_color}', this.value)">
                        </td>
                        <td style="text-align:right;">KSh ${parseFloat(item.selling_price).toLocaleString()}</td>
                        <td style="text-align:right; font-weight:600; color:var(--teal);">KSh ${sub.toLocaleString()}</td>
                        <td style="text-align:center;">
                            <button onclick="removeSaleItem(${item.shoe_id}, '${item.selected_size}', '${item.selected_color}')" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:16px;">
                                <i class="fa-regular fa-trash-can"></i>
                            </button>
                        </td>
                    </tr>`;
            });

            const fmtTotal = 'KSh ' + total.toLocaleString();
            grandTotal.innerText = fmtTotal;
            payTotal.innerText   = fmtTotal;
            const totalItems = saleItems.reduce((s, i) => s + i.qty, 0);
            itemCount.innerText  = totalItems;
            calcChange();
        }

        function toggleMpesa() {
            const method = document.getElementById('pay-method').value;
            document.getElementById('mpesa-field').style.display = method === 'Mobile Money' ? 'block' : 'none';
        }

        function calcChange() {
            const total    = saleItems.reduce((s, i) => s + parseFloat(i.selling_price) * i.qty, 0);
            const received = parseFloat(document.getElementById('pay-received').value) || 0;
            const change   = received - total;
            const display  = document.getElementById('change-display');
            const amtEl    = document.getElementById('change-amount');
            if (received > 0) {
                display.style.display = 'block';
                amtEl.innerText = 'KSh ' + Math.max(0, change).toLocaleString();
                amtEl.style.color = change >= 0 ? '#16a34a' : '#dc2626';
                if (change < 0) { amtEl.innerText = '— KSh ' + Math.abs(change).toLocaleString() + ' short'; }
            } else {
                display.style.display = 'none';
            }
        }

        function clearSaleForm() {
            saleItems = [];
            renderSaleTable();
            document.getElementById('pay-received').value = '';
            document.getElementById('pay-mpesa-code').value = '';
            document.getElementById('pay-method').value = 'Cash';
            document.getElementById('mpesa-field').style.display = 'none';
            document.getElementById('change-display').style.display = 'none';
            document.getElementById('record-sale-msg').innerText = '';
        }

        function submitSaleRecord() {
            if (saleItems.length === 0) { alert('Please add at least one item.'); return; }
            const total    = saleItems.reduce((s, i) => s + parseFloat(i.selling_price) * i.qty, 0);
            const method   = document.getElementById('pay-method').value;
            const received = parseFloat(document.getElementById('pay-received').value) || 0;
            const mpesa    = document.getElementById('pay-mpesa-code').value.trim();
            const msg      = document.getElementById('record-sale-msg');
            const btn      = document.getElementById('record-sale-btn');

            if (received < total && method === 'Cash') { msg.style.color='var(--red)'; msg.innerText='Amount received is less than the total.'; return; }
            if (method === 'Mobile Money' && !mpesa)   { msg.style.color='var(--red)'; msg.innerText='Please enter the M-Pesa transaction code.'; return; }

            btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            msg.innerText = '';

            const formData = new FormData();
            formData.append('action', 'process_sale');
            formData.append('payment_method', method);
            formData.append('total_amount', total);
            formData.append('amount_received', received || total);
            formData.append('change_returned', Math.max(0, received - total));
            if (mpesa) formData.append('mpesa_code', mpesa);
            formData.append('items', JSON.stringify(saleItems.map(i => ({ item_id: i.item_id || i.shoe_id || i.cloth_id, item_type: i.item_type || 'shoe', qty: i.qty, price: i.selling_price, selected_size: i.selected_size || 'N/A', selected_color: i.selected_color || 'N/A' }))));

            fetch('database/pos.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Record Sale';
                if (data.status === 'success') {
                    const rNum = data.receipt || (data.data && data.data.receipt) || '';
                    msg.style.color = 'var(--teal)';
                    msg.innerText = '\u2713 Sale recorded! Receipt: ' + rNum;
                    const receiptData = {
                        receiptNum: rNum || 'REC-' + Math.floor(Math.random() * 1000000),
                        date: new Date().toLocaleString('en-KE', {}),
                        attendant: (document.getElementById('topbar-name') && document.getElementById('topbar-name').innerText) || 'Attendant',
                        items: [...saleItems],
                        total: total,
                        received: received || total,
                        change: Math.max(0, (received || total) - total),
                        method: method
                    };
                    showReceipt(receiptData);
                    clearSaleForm();
                    loadSaleInventory(); // Refresh stock
                } else {
                    msg.style.color = 'var(--red)'; msg.innerText = data.message;
                }
            })
            .catch(() => { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Record Sale'; msg.style.color='var(--red)'; msg.innerText='Network error. Please try again.'; });
        }

        
        const amountReceivedInput = document.getElementById('amountReceived');
        if (amountReceivedInput) {
            amountReceivedInput.addEventListener('input', () => calculateChange());
        }

        // --- POS CART LOGIC ---
        let posCart = [];


        let currentPaymentMethod = 'Cash';

        window.searchShoes = function(query) {
    fetch(`database/pos.php?action=search&q=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
        const list = document.getElementById('posProductList');
        if (data.status === 'success') {
            list.innerHTML = '';
            if (data.data.length === 0) {
                list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-light); width: 100%;">No items found.</div>';
                return;
            }
            window.allAdminShoes = data.data;
            data.data.forEach(shoe => {
                const price = parseFloat(shoe.selling_price);
                
                // Parse image
                let imgUrl = 'assets/images/hero-shoe.png';
                imgUrl = getSafeImageUrl(shoe.image);
                
                // Parse sizes for dropdown
                let sizesArr = [];
                let rawSizes = shoe.size || shoe.sizes;
                if (Array.isArray(rawSizes)) {
                    sizesArr = rawSizes;
                } else if (rawSizes && typeof rawSizes === 'string') {
                    try { 
                        let parsed = JSON.parse(rawSizes); 
                        sizesArr = Array.isArray(parsed) ? parsed : [rawSizes]; 
                    } catch(e) { 
                        sizesArr = [rawSizes]; 
                    }
                }
                
                let sizeOptions = sizesArr.length > 0 ? sizesArr.map(s => `<option value="${s}">Size ${s}</option>`).join('') : '<option value="">One Size</option>';
                let selectId = "size_sel_" + (shoe.item_id || shoe.shoe_id);

                list.innerHTML += `
                    <div class="pos-product-item" style="display:flex; gap:15px; padding:15px; border:1px solid #e2e8f0; border-radius:12px; align-items:center; background:#fff; margin-bottom:10px;">
                        <div class="pos-product-img" style="width:70px; height:70px; flex-shrink:0; background:#f8fafc; border-radius:8px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                            <img src="${imgUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.src='assets/images/hero-shoe.png'">
                        </div>
                        <div class="pos-product-details" style="flex:1;">
                            <h4 style="font-size:1rem; font-weight:700; color:#0f172a; margin-bottom:4px;">${shoe.item_name || shoe.shoe_name}</h4>
                            <div style="font-size:0.75rem; color:#64748b; margin-bottom:6px;">Code: ${shoe.barcode || 'N/A'} &bull; Qty: ${shoe.quantity}</div>
                            <select id="${selectId}" style="width:100%; max-width:150px; padding:4px 8px; font-size:0.8rem; border-radius:6px; border:1px solid #cbd5e1; background:#f8fafc; cursor:pointer;">
                                ${sizeOptions}
                            </select>
                        </div>
                        <div class="pos-product-price" style="text-align:right;">
                            <div style="font-weight:800; color:#0f172a; font-size:1.05rem; margin-bottom:8px;">KSh ${price.toLocaleString()}</div>
                            <button class="pos-add-btn" onclick='addToCart(${JSON.stringify(shoe).replace(/'/g, "&#39;")}, document.getElementById("${selectId}").value)' style="background:rgba(66,184,164,0.1); color:var(--teal); border:none; padding:8px 18px; border-radius:20px; font-weight:700; font-size:0.85rem; cursor:pointer; transition:0.2s;">Add</button>
                        </div>
                    </div>
                `;
            });
        }
    })
    .catch(err => { console.error(err); alert('Network error. Please try again.'); });
}
        
        function loadAdminStock() {
            const grid = document.getElementById('adminStockGrid');
            if(!grid) return;
            
            grid.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-light); width: 100%; grid-column: 1 / -1;">
                                <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
                                <p>Loading inventory...</p>
                              </div>`;
                              
            fetch('database/inventory.php?action=list')
            .then(res => res.json())
            .then(data => {
                grid.innerHTML = '';
                if(data.status !== 'success' || !data.data || data.data.length === 0) {
                    grid.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-light); width: 100%; grid-column: 1 / -1;">No shoes found in inventory.</div>`;
                    return;
                }
                
                window.allAdminShoes = data.data;
                data.data.forEach(shoe => {
                    const hasStock = parseInt(shoe.quantity) > 0;
                    const stockClass = hasStock ? (parseInt(shoe.quantity) < 5 ? 'low' : 'active') : 'out';
                    const stockText = hasStock ? (parseInt(shoe.quantity) < 5 ? 'Low Stock' : 'In Stock') : 'Out of Stock';
                                        // Parse multiple images safely
                    let imagesArray = [];
                    try {
                        let parsed = typeof shoe.images === 'string' ? JSON.parse(shoe.images) : shoe.images;
                        imagesArray = Array.isArray(parsed) ? parsed : [shoe.images];
                    } catch(e) {
                        imagesArray = [shoe.images];
                    }
                    if(!imagesArray || imagesArray.length === 0 || !imagesArray[0]) imagesArray = ['assets/images/hero-shoe.png'];
                    
                    let imagesHtml = '';
                    imagesArray.forEach((img) => {
                        let cleanImg = typeof img === 'string' ? img.replace(/[\[\]"]/g, '') : img;
                        imagesHtml += `<img src="${cleanImg}" onerror="this.src='assets/images/hero-shoe.png'" alt="${shoe.shoe_name}" style="flex: 0 0 100%; scroll-snap-align: center; max-height:100%; object-fit:contain;">`;
                    });
                    
                    const card = document.createElement('div');
                    card.className = 'pos-card';
                    card.style.border = '1px solid var(--border)';
                    card.style.borderRadius = '12px';
                    card.style.overflow = 'hidden';
                    card.style.background = 'var(--white)';
                    card.innerHTML = `
                        <div class="pos-card-img" onclick="openImageViewer('${encodeURIComponent(JSON.stringify(imagesArray))}')" style="position:relative; height:180px; background:var(--bg); padding:0; display:flex; justify-content:center; align-items:center; overflow:hidden; cursor:pointer;">
                            <div class="prod-carousel" style="display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; width:100%; height:100%; padding:20px 0;">
                                ${imagesHtml}
                            </div>
                            <div class="status-badge ${stockClass}" style="position:absolute; top:10px; right:10px; font-size:0.7rem; padding:3px 8px; border-radius:4px; z-index:2;">${stockText}</div>
                        </div>
                        </div>
                        <div class="pos-card-content" style="padding:15px;">
                            <h3 style="font-size:1rem; color:var(--navy); margin-bottom:4px; font-weight:600;">${shoe.shoe_name}</h3>
                            <div style="font-size:0.75rem; color:var(--text-light); margin-bottom:10px;">Code: ${shoe.barcode || 'N/A'} • Sizes: ${(function(sz){ 
    if (Array.isArray(sz)) return sz.join(', ');
    if (typeof sz === 'string') {
        try { 
            let arr = JSON.parse(sz); 
            if(Array.isArray(arr)) return arr.join(', ');
            // Handle double JSON encoded strings
            if(typeof arr === 'string') {
                let inner = JSON.parse(arr);
                if(Array.isArray(inner)) return inner.join(', ');
            }
            return sz; 
        } catch(e){ 
            // Also try to strip raw brackets if they somehow got in
            let cleaned = sz.replace(/[\[\]"]/g, '');
            return cleaned || '-'; 
        } 
    }
    return sz || '-';
})(shoe.size || shoe.sizes)}</div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                                <div style="font-size:0.85rem; color:var(--text-light);">Stock: <span style="font-weight:700; color:${hasStock ? 'var(--navy)' : 'var(--red)'};">${shoe.quantity}</span></div>
                                <div style="font-size:0.9rem; font-weight:700; color:var(--teal);">KSh ${parseFloat(shoe.selling_price).toLocaleString()}</div>
                            </div>
                            <div style="display:flex; gap:10px;">
                                <button class="btn-primary" style="flex:1; padding:8px; font-size:0.85rem; background:var(--navy); color:white;" onclick="editShoe(${shoe.shoe_id})"><i class="fa-solid fa-pen"></i> Edit</button>
                                <button class="btn-primary" style="background:var(--red); padding:8px;" onclick="deleteShoe(${shoe.shoe_id})"><i class="fa-regular fa-trash-can"></i></button>
                            </div>
                        </div>
                    `;
                    grid.appendChild(card);
                });
            })
            .catch(err => {
                console.error(err);
                grid.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--red); width: 100%; grid-column: 1 / -1;">Error loading inventory.</div>`;
            });
        }
        
        function goToCheckout() {
            if (posCart.length === 0) {
                alert("Your cart is empty. Please add items to checkout.");
                return;
            }
            const activeSidebar = _role === 'attendant' ? document.getElementById('attendant-sidebar') : document.getElementById('admin-sidebar');
            const checkoutTab = activeSidebar.querySelector('.menu-item[data-target="pos-sales-view"]');
            if (checkoutTab) {
                checkoutTab.click();
            }
        }

        window.addToCart = function(shoe, selectedSize) {
    const id = shoe.item_id || shoe.shoe_id;
    const existing = posCart.find(item => (item.item_id || item.shoe_id) === id && item.selected_size === selectedSize);
    if (existing) {
        if (existing.qty < parseInt(shoe.quantity)) {
            existing.qty++;
        } else {
            alert('Cannot add more than available stock!');
        }
    } else {
        posCart.push({ ...shoe, qty: 1, selected_size: selectedSize || null });
    }
    updateCartUI();
}

        window.updateCartQty = function(index, delta) {
    const item = posCart[index];
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            posCart.splice(index, 1);
        } else if (item.qty > parseInt(item.quantity)) {
            item.qty = parseInt(item.quantity);
            alert('Maximum stock reached!');
        }
        updateCartUI();
    }
}

        function removeFromCart(index) {
    posCart.splice(index, 1);
    updateCartUI();
}

        window.clearCart = function() {
            if(posCart.length > 0 && confirm('Clear the cart?')) {
                posCart = [];
                updateCartUI();
            }
        }

        function updateCartUI() {
            const tbody = document.getElementById('cartTableBody');
            const cartItemCount = document.getElementById('cartItemCount');
            const cartSubtotal = document.getElementById('cartSubtotal');
            const cartTotal = document.getElementById('cartTotal');
            if (tbody) tbody.innerHTML = '';
            let total = 0;
            let itemCount = 0;

            posCart.forEach(item => {
                const price = parseFloat(item.selling_price);
                const subtotal = price * item.qty;
                total += subtotal;
                itemCount += item.qty;

                tbody.innerHTML += `
                    <tr>
                        <td>
                            <div class="cart-item-info">
                                <img src="${item.image || 'assets/images/hero-shoe.png'}" onerror="this.src='assets/images/hero-shoe.png'">
                                <div class="cart-item-text">
                                    <h4>${item.item_name}</h4>
                                    <p>Size: ${item.selected_size || '-'}</p>
                                </div>
                            </div>
                        </td>
                        <td style="font-weight:600;">KSh ${price.toLocaleString()}</td>
                        <td>
                            <div class="cart-qty-ctrl">
                                <button onclick="updateCartQty(${item.shoe_id}, -1)">-</button>
                                <span>${item.qty}</span>
                                <button onclick="updateCartQty(${item.shoe_id}, 1)">+</button>
                            </div>
                        </td>
                        <td style="font-weight:600;">KSh ${subtotal.toLocaleString()}</td>
                        <td><i class="fa-regular fa-trash-can cart-delete" onclick="removeFromCart(${item.shoe_id})" style="cursor:pointer;"></i></td>
                    </tr>
                `;
            });

            if (cartItemCount) cartItemCount.innerText = `(${itemCount} Items)`;
            if (cartSubtotal) cartSubtotal.innerText = `KSh ${total.toLocaleString()}`;
            if (cartTotal) cartTotal.innerText = `KSh ${total.toLocaleString()}`;
            
            // Update Catalogue Checkout Button
            const catBtnCount = document.getElementById('catBtnCount');
            if (catBtnCount) catBtnCount.innerText = `(${itemCount})`;
            
            // Set default amount received to total if mobile money
            if (currentPaymentMethod !== 'Cash') {
                document.getElementById('amountReceived').value = total;
            }
            calculateChange(total);
        }

                window.setPaymentMethod = function(method) {
            currentPaymentMethod = method;
            document.getElementById('payMethodCash').classList.toggle('active', method === 'Cash');
            document.getElementById('payMethodMobile').classList.toggle('active', method === 'Mobile Money');
            if(document.getElementById('payMethodCredit')) document.getElementById('payMethodCredit').classList.toggle('active', method === 'Credit');
            
            const clientSelect = document.getElementById('credit-client-select');
            if (clientSelect) clientSelect.style.display = method === 'Credit' ? 'block' : 'none';
            
            const total = posCart.reduce((sum, item) => sum + (parseFloat(item.selling_price) * item.qty), 0);
            if (method !== 'Cash') {
                document.getElementById('amountReceived').value = method === 'Credit' ? 0 : total;
                document.getElementById('amountReceived').disabled = method === 'Credit' ? false : true;
            } else {
                document.getElementById('amountReceived').disabled = false;
            }
            calculateChange(total);
        }

        window.calculateChange = function(cartTotal = null) {
            const total = cartTotal !== null ? cartTotal : posCart.reduce((sum, item) => sum + (parseFloat(item.selling_price) * item.qty), 0);
            let received = parseFloat(document.getElementById('amountReceived').value) || 0;
            
            if (currentPaymentMethod !== 'Cash') received = total;
            
            document.getElementById('amountReceivedLabel').innerText = `KSh ${received.toLocaleString()}`;
            
            let change = received - total;
            if (change < 0) change = 0;
            
            document.getElementById('changeToReturn').innerText = `KSh ${change.toLocaleString()}`;
        }

        window.processCheckout = function() {
    if (posCart.length === 0) {
        alert('Cart is empty!');
        return;
    }

    const total = posCart.reduce((sum, item) => sum + (parseFloat(item.selling_price) * item.qty), 0);
    let received = parseFloat(document.getElementById('amountReceived').value) || 0;
    
    if (currentPaymentMethod === 'Cash' && received < total) {
        alert('Amount received is less than the total!');
        return;
    }

    const payload = {
        action: 'checkout',
        payment_method: currentPaymentMethod,
        amount_received: currentPaymentMethod === 'Cash' ? received : total,
        change_returned: currentPaymentMethod === 'Cash' ? Math.max(0, received - total) : 0,
        total_amount: total,
        items: posCart.map(i => ({
            item_id: i.item_id || i.shoe_id || i.cloth_id, 
            item_type: i.item_type || (i.cloth_id ? 'cloth' : 'shoe'), 
            qty: i.qty,
            price: i.selling_price,
            selected_size: i.selected_size || 'N/A',
            selected_color: i.selected_color || 'N/A'
        }))
    };

    fetch('database/pos.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            let change = currentPaymentMethod === 'Cash' ? (received - total) : 0;
            const receiptData = {
                receiptNum: data.receipt || (data.data && data.data.receipt) || 'REC-' + Math.floor(Math.random() * 1000000),
                date: new Date().toLocaleString('en-KE', {}),
                attendant: (document.getElementById('topbar-name') && document.getElementById('topbar-name').innerText) || 'Attendant',
                items: [...posCart],
                total: total,
                received: currentPaymentMethod === 'Cash' ? received : total,
                change: Math.max(0, change),
                method: currentPaymentMethod
            };
            showReceipt(receiptData);
            posCart = [];
            updateCartUI();
            document.getElementById('amountReceived').value = '';
            
            const activeSidebar = _role === 'attendant' ? document.getElementById('attendant-sidebar') : document.getElementById('admin-sidebar');
            const catalogueTab = activeSidebar.querySelector('.menu-item[data-target="pos-catalogue-view"]');
            if (catalogueTab) {
                catalogueTab.click();
            }
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(err => { console.error(err); alert('Network error. Please try again.'); });
}

        // Initialize Data
        if (_role !== 'attendant') {
            loadUsers();
            loadInventory();
        } else {
            // Attendant init
            searchShoes('');
        }

        const forcePwParams = new URLSearchParams(window.location.search);
        if (forcePwParams.get('force_pw') === '1') {
            document.getElementById('forcePasswordModal').style.display = 'flex';
        }

        function loadAdminClothes() {
            const grid = document.getElementById('adminClothesGrid');
            if(!grid) return;
            
            grid.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-light); width: 100%; grid-column: 1 / -1;">
                                <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
                                <p>Loading clothes inventory...</p>
                              </div>`;
                              
            fetch('database/clothes.php?action=list')
            .then(res => res.json())
            .then(data => {
                grid.innerHTML = '';
                if(data.status !== 'success' || !data.data || data.data.length === 0) {
                    grid.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-light); width: 100%; grid-column: 1 / -1;">No clothes found in inventory.</div>`;
                    return;
                }
                
                window.allAdminClothes = data.data;
                data.data.forEach(cloth => {
                    const hasStock = parseInt(cloth.quantity) > 0;
                    const stockClass = hasStock ? (parseInt(cloth.quantity) < 5 ? 'low' : 'active') : 'out';
                    const stockText = hasStock ? (parseInt(cloth.quantity) < 5 ? 'Low Stock' : 'In Stock') : 'Out of Stock';
                    const imagesArray = (cloth.images && cloth.images.length > 0) ? cloth.images : ((cloth.image) ? [cloth.image] : ['assets/images/hero-shoe.png']);
                    const itemName = cloth.cloth_name || cloth.clothes_name || cloth.name || cloth.item_name || 'Clothing Item';
                    const itemId = cloth.clothes_id || cloth.id || cloth.cloth_id;
                    
                    let imagesHtml = '';
                    imagesArray.forEach((img) => {
                        imagesHtml += `<img src="` + img + `" alt="` + itemName + `" style="flex: 0 0 100%; scroll-snap-align: center; max-height:100%; object-fit:contain;" onerror="this.src='assets/images/hero-shoe.png'">`;
                    });

                    const card = document.createElement('div');
                    card.className = 'pos-card';
                    card.style.border = '1px solid var(--border)';
                    card.style.borderRadius = '12px';
                    card.style.overflow = 'hidden';
                    card.style.background = 'var(--white)';
                    card.innerHTML = `
                        <div class="pos-card-img" onclick="openImageViewer('${encodeURIComponent(JSON.stringify(imagesArray))}')" style="position:relative; height:180px; background:var(--bg); display:flex; justify-content:center; align-items:center; overflow:hidden; cursor:pointer;">
                            <div class="prod-carousel" style="display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; width:100%; height:100%; padding:20px 0;">
                                ${imagesHtml}
                            </div>
                            <div class="status-badge ${stockClass}" style="position:absolute; top:10px; right:10px; font-size:0.7rem; padding:3px 8px; border-radius:4px; z-index:2;">${stockText}</div>
                        </div>
                        <div class="pos-card-content" style="padding:15px;">
                            <h3 style="font-size:1rem; color:var(--navy); margin-bottom:4px; font-weight:600;">${itemName}</h3>
                            <div style="font-size:0.75rem; color:var(--text-light); margin-bottom:10px;">Code: ${cloth.barcode || 'N/A'} • Sizes: ${cloth.sizes ? cloth.sizes.join(", ") : "-"}</div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                                <div style="font-size:0.85rem; color:var(--text-light);">Stock: <span style="font-weight:700; color:${hasStock ? 'var(--navy)' : 'var(--red)'};">${cloth.quantity}</span></div>
                                <div style="font-size:0.9rem; font-weight:700; color:var(--teal);">KSh ${parseFloat(cloth.selling_price).toLocaleString()}</div>
                            </div>
                            <div style="display:flex; gap:10px;">
                                <button class="btn-primary" style="flex:1; padding:8px; font-size:0.85rem; background:var(--navy); color:white;" onclick="editCloth(${itemId})"><i class="fa-solid fa-pen"></i> Edit</button>
                                <button class="btn-primary" style="background:var(--red); padding:8px;" onclick="deleteCloth(${itemId})"><i class="fa-regular fa-trash-can"></i></button>
                            </div>
                        </div>
                    `;
                    grid.appendChild(card);
                });
            })
            .catch(err => {
                console.error(err);
                grid.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--red); width: 100%; grid-column: 1 / -1;">Error loading inventory.</div>`;
            });
        }



        window.sendDailyReport = function() {
            if(confirm('Generate and email the Daily Sales Report to admin?')) {
                fetch('database/send_report.php')
                .then(res => res.json())
                .then(data => {
                    if(data.status === 'success') {
                        alert('? ' + data.message);
                    } else {
                        alert('? ' + data.message);
                    }
                })
                .catch(err => { console.error(err); alert('Network error while sending report.'); });
            }
        };

        // --- CLOTHES MANAGEMENT FUNCTIONS ---
        function submitAddCloth(e) {
            e.preventDefault();
            const formData = new FormData(document.getElementById('addClothForm'));
            
            fetch('database/clothes.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('Cloth added successfully!');
                    document.getElementById('addClothForm').reset();
                    // Reset the upload area text
                    document.querySelectorAll('.file-upload-area').forEach(area => {
                        const textEl = area.querySelector('.file-upload-text');
                        if(textEl) textEl.innerHTML = 'Click to upload or drag and drop';
                        area.style.borderColor = '';
                        area.style.background = '';
                    });
                    loadAdminClothes();
                    document.querySelector('[data-target="clothes-stock-view"]').click();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(err => { console.error(err); alert('Network error. Please try again.'); });
        }



        window.deleteCloth = function(cloth_id) {
            if (confirm("Are you sure you want to remove this cloth from inventory?")) {
                const formData = new FormData();
                formData.append('action', 'delete');
                formData.append('cloth_id', cloth_id);
                fetch('database/clothes.php', { method: 'POST', body: formData })
                .then(res => res.json())
                .then(data => {
                    alert(data.message);
                    loadAdminClothes();
                })
                .catch(err => { console.error(err); alert('Network error. Please try again.'); });
            }
        }



        window.editShoe = function(id) {
            const item = window.allAdminShoes.find(s => s.shoe_id == id);
            if(!item) return;
            document.getElementById('editModalTitle').innerText = 'Edit Shoe';
            document.getElementById('edit_item_id').value = item.shoe_id;
            document.getElementById('edit_item_type').value = 'shoe';
            document.getElementById('edit_item_name').value = item.shoe_name;
            document.getElementById('edit_selling_price').value = item.selling_price;
            document.getElementById('edit_quantity').value = item.quantity;
            document.getElementById('edit_sizes').value = item.sizes ? item.sizes.join(', ') : '';
            document.getElementById('edit_colors').value = item.colors ? item.colors.join(', ') : '';
            document.getElementById('editItemModal').style.display = 'flex';
        }

        window.editCloth = function(id) {
            const item = window.allAdminClothes.find(c => (c.cloth_id == id || c.clothes_id == id || c.id == id));
            if(!item) return;
            document.getElementById('editModalTitle').innerText = 'Edit Cloth';
            document.getElementById('edit_item_id').value = item.cloth_id || item.clothes_id || item.id;
            document.getElementById('edit_item_type').value = 'cloth';
            document.getElementById('edit_item_name').value = item.cloth_name || item.clothes_name || item.name || item.item_name;
            document.getElementById('edit_selling_price').value = item.selling_price;
            document.getElementById('edit_quantity').value = item.quantity;
            document.getElementById('edit_sizes').value = item.size ? (Array.isArray(item.size) ? item.size.join(', ') : item.size) : '';
            document.getElementById('edit_colors').value = item.color ? (Array.isArray(item.color) ? item.color.join(', ') : item.color) : '';
            document.getElementById('editItemModal').style.display = 'flex';
        }

                function submitEditItem(e) {
    e.preventDefault();
    const type = document.getElementById('edit_item_type').value;
    const formData = new FormData(e.target);
    formData.append('action', 'edit');
    
    const itemId = document.getElementById('edit_item_id').value;
    const itemName = document.getElementById('edit_item_name').value;
    const itemQty = document.getElementById('edit_quantity').value;
    const itemPrice = document.getElementById('edit_selling_price').value;
    
    if (type === 'shoe') {
        formData.set('shoe_id', itemId);
        formData.set('shoe_name', itemName);
        formData.set('selling_price', itemPrice);
        formData.set('quantity', itemQty);
        formData.set('sizes', document.getElementById('edit_sizes').value);
        formData.set('colors', document.getElementById('edit_colors').value);
    } else {
        formData.set('cloth_id', itemId);
        formData.set('cloth_name', itemName);
        formData.set('selling_price', itemPrice);
        formData.set('quantity', itemQty);
        formData.set('size', document.getElementById('edit_sizes').value);
        formData.set('color', document.getElementById('edit_colors').value);
    }
    
    const endpoint = type === 'shoe' ? 'database/inventory.php' : 'database/clothes.php';
    
    fetch(endpoint, { method: 'POST', body: formData })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            alert(type.charAt(0).toUpperCase() + type.slice(1) + ' updated successfully!');
            document.getElementById('editItemModal').style.display = 'none';
            if (type === 'shoe') {
                if (typeof loadAdminStock === 'function') loadAdminStock();
                else if (typeof loadInventory === 'function') loadInventory();
            } else {
                if (typeof loadAdminClothes === 'function') loadAdminClothes();
            }
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(err => {
        console.error(err);
        alert('Network error. Please try again.');
    });
}


window.showReceipt = function(data) {
    document.getElementById('receiptDate').innerText = data.date;
    document.getElementById('receiptNumber').innerText = data.receiptNum;
    document.getElementById('receiptAttendant').innerText = data.attendant;

    const tbody = document.getElementById('receiptItems');
    tbody.innerHTML = '';
    data.items.forEach(item => {
        const sub = parseFloat(item.selling_price) * item.qty;
        const sizeText = item.selected_size && item.selected_size !== 'N/A' ? ' | Sz: ' + item.selected_size : '';
        tbody.innerHTML += '<tr>' +
            '<td style="padding:5px 0;">' + (item.item_name || item.shoe_name || 'Item') +
            '<br><small style="color:#555;">' + sizeText + '</small></td>' +
            '<td style="text-align:center; padding:5px 0;">' + item.qty + '</td>' +
            '<td style="text-align:right; padding:5px 0;">KSh ' + sub.toLocaleString() + '</td>' +
            '</tr>';
    });

    document.getElementById('receiptTotal').innerText = 'KSh ' + parseFloat(data.total).toLocaleString();
    document.getElementById('receiptPaid').innerText = 'KSh ' + parseFloat(data.received).toLocaleString();
    document.getElementById('receiptChange').innerText = 'KSh ' + parseFloat(data.change).toLocaleString();
    document.getElementById('receiptMethod').innerText = data.method;

    const modal = document.getElementById('receiptModal');
    if (modal) modal.style.display = 'flex';
}

window.closeReceipt = function() {
    const modal = document.getElementById('receiptModal');
    if (modal) modal.style.display = 'none';
}

window.printReceipt = function() {
    window.print();
}


function loadSales() {
    var isAttendant = document.body.classList.contains('role-attendant');
    var tbody = document.querySelector(isAttendant ? '#pos-history-view .data-table tbody' : '#sales-view .data-table tbody');
    if (!tbody) tbody = document.querySelector('#sales-management-tbody');
    if (!tbody) return;
    
    var colCount = isAttendant ? 5 : 7;
    tbody.innerHTML = '<tr><td colspan="' + colCount + '" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading sales...</td></tr>';
    fetch('database/sales.php?action=list')
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.status !== 'success' || !data.data || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="' + colCount + '" style="text-align:center; color:var(--text-light);">No sales records found.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.data.forEach(function(sale) {
            const dt = new Date(sale.sale_date);
            const dateStr = dt.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
            var rawDate = sale.sale_date.split(' ')[0]; // Gets YYYY-MM-DD
            var rNum = (sale.receipt_number || 'N/A').toLowerCase();
            var pMeth = (sale.payment_method || 'Cash').toLowerCase();
            if (isAttendant) {
                tbody.innerHTML += '<tr data-raw-date="' + rawDate + '" data-trans="' + rNum + '" data-method="' + pMeth + '"><td><strong>' + (sale.receipt_number || 'N/A') + '</strong></td><td>' + dateStr + '</td><td style="text-align:center;">' + (sale.items_sold || 1) + '</td><td>' + (sale.payment_method || 'Cash') + '</td><td style="font-weight:700; color:var(--teal); text-align:right;">KSh ' + parseFloat(sale.total_amount).toLocaleString() + '</td></tr>';
            } else {
                tbody.innerHTML += '<tr data-raw-date="' + rawDate + '" data-trans="' + rNum + '" data-method="' + pMeth + '"><td><strong>' + (sale.receipt_number || 'N/A') + '</strong></td><td>' + dateStr + '</td><td>' + (sale.full_name || 'Admin') + '</td><td style="text-align:center;">' + (sale.items_sold || 1) + '</td><td>' + (sale.payment_method || 'Cash') + '</td><td style="font-weight:700; color:var(--teal); text-align:right;">KSh ' + parseFloat(sale.total_amount).toLocaleString() + '</td><td style="text-align:center;"><button class="btn-action" style="color:var(--navy);" onclick="viewReceipt(\'' + sale.receipt_number + '\')" title="View Receipt"><i class="fa-solid fa-file-invoice"></i></button></td></tr>';
            }
        });
    })
    .catch(function(err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--red);">Error loading sales.</td></tr>';
    });
}

window.viewReceipt = function(receiptNumber) {
    fetch('database/sales.php?action=get_receipt&receipt_number=' + encodeURIComponent(receiptNumber))
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.status === 'success') {
            var s = data.sale;
            var receiptData = {
                receiptNum: s.receipt_number,
                date: new Date(s.sale_date).toLocaleString('en-KE', {}),
                attendant: s.full_name || 'Admin',
                items: data.items,
                total: parseFloat(s.total_amount),
                received: parseFloat(s.amount_received || s.total_amount),
                change: parseFloat(s.change_returned || 0),
                method: s.payment_method
            };
            showReceipt(receiptData);
        } else {
            alert('Error loading receipt: ' + data.message);
        }
    })
    .catch(function(err) {
        console.error('Network error:', err);
        alert('Network error. Please try again.');
    });
};

window.generateReport = function() {
    const type = document.getElementById('report-type').value;
    const start = document.getElementById('report-start').value;
    const end = document.getElementById('report-end').value;
    
    if (!start || !end) {
        alert('Please select a valid date range.');
        return;
    }

    const resultDiv = document.getElementById('report-results');
    resultDiv.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin fa-2x" style="color:var(--teal);"></i><p style="margin-top:10px;">Crunching numbers...</p></div>';

    fetch(`database/reports.php?type=${type}&start=${start}&end=${end}`)
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            if (data.data.length === 0) {
                resultDiv.innerHTML = '<p style="text-align:center; color:var(--text-light);">No sales found for this date range.</p>';
                return;
            }
            let html = '<table class="data-table" style="font-size:0.85rem;"><thead><tr><th>Date</th><th style="text-align:center;">Items Sold</th><th style="text-align:right;">Revenue</th></tr></thead><tbody>';
            let totalRev = 0, totalItems = 0;
            
            data.data.forEach(row => {
                totalRev += parseFloat(row.revenue);
                totalItems += parseInt(row.items_sold);
                html += `<tr><td>${row.sale_date}</td><td style="text-align:center;">${row.items_sold}</td><td style="text-align:right;">KSh ${parseFloat(row.revenue).toLocaleString()}</td></tr>`;
            });
            
            html += `</tbody><tfoot><tr style="font-weight:800; background:var(--bg);"><td style="padding:12px;">TOTAL</td><td style="text-align:center; padding:12px;">${totalItems}</td><td style="text-align:right; color:var(--teal); padding:12px;">KSh ${totalRev.toLocaleString()}</td></tr></tfoot></table>`;
            resultDiv.innerHTML = html;
        } else {
            resultDiv.innerHTML = `<span style="color:var(--red);">Error: ${data.message}</span>`;
        }
    })
    .catch(err => {
        console.error('Report error:', err);
        resultDiv.innerHTML = '<span style="color:var(--red);">Network error connecting to the database.</span>';
    });
};






window.toggleCustomDate = function(role) {
    var periodSelect = document.getElementById(role + '-sale-period');
    var customDiv = document.getElementById(role + '-custom-date');
    if (periodSelect && customDiv) {
        customDiv.style.display = (periodSelect.value === 'custom') ? 'flex' : 'none';
    }
};

window.filterSales = function(role) {
    var searchInput = document.getElementById(role + '-sale-search');
    var periodInput = document.getElementById(role + '-sale-period');
    var startInput = document.getElementById(role + '-sale-start');
    var endInput = document.getElementById(role + '-sale-end');
    var methodInput = document.getElementById(role + '-sale-method');
    
    var tbody = document.querySelector(role === 'admin' ? '#sales-view .data-table tbody' : '#pos-history-view .data-table tbody');
    if (role === 'admin' && !tbody) tbody = document.querySelector('#sales-management-tbody');
    if (!tbody) return;

    var searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    var searchPeriod = periodInput ? periodInput.value : '';
    var searchStart = startInput && startInput.value ? new Date(startInput.value) : null;
    var searchEnd = endInput && endInput.value ? new Date(endInput.value) : null;
    if (searchEnd) searchEnd.setHours(23, 59, 59, 999);

    var searchMethod = methodInput && methodInput.value ? methodInput.value.toLowerCase() : '';

    var rows = tbody.querySelectorAll('tr');
    
    // Get current dates for relative filtering
    var nowStr = new Date().toLocaleString('en-US', {});
    var nowEat = new Date(nowStr); // Local JS Date object shifted to exactly match EAT time
    var todayStart = new Date(nowEat.getFullYear(), nowEat.getMonth(), nowEat.getDate());
    
    var weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());
    
    var monthStart = new Date(nowEat.getFullYear(), nowEat.getMonth(), 1);

    rows.forEach(function(row) {
        if (!row.hasAttribute('data-trans')) return;

        var transId = row.getAttribute('data-trans');
        var rawDateStr = row.getAttribute('data-raw-date'); // YYYY-MM-DD
        var rowDate = new Date(rawDateStr);
        var method = row.getAttribute('data-method');

        var show = true;

        if (searchTerm && transId.indexOf(searchTerm) === -1) show = false;
        if (searchMethod && method !== searchMethod) show = false;

        if (show && searchPeriod) {
            if (searchPeriod === 'today') {
                if (rowDate < todayStart) show = false;
            } else if (searchPeriod === 'this_week') {
                if (rowDate < weekStart) show = false;
            } else if (searchPeriod === 'this_month') {
                if (rowDate < monthStart) show = false;
            } else if (searchPeriod === 'custom') {
                if (searchStart && rowDate < searchStart) show = false;
                if (searchEnd && rowDate > searchEnd) show = false;
            }
        }

        row.style.display = show ? '' : 'none';
    });
};















window.switchContactTab = function(tab) {
    document.getElementById('clients-section').style.display = tab === 'clients' ? 'block' : 'none';
    document.getElementById('suppliers-section').style.display = tab === 'suppliers' ? 'block' : 'none';
    if(tab === 'clients') loadClients();
};

window.toggleClientForm = function() {
    const el = document.getElementById('client-form-panel');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.loadClients = function() {
    fetch('database/clients.php?action=list').then(res => res.json()).then(data => {
        const tbody = document.getElementById('clients-table-body');
        const select = document.getElementById('checkout-client');
        if(tbody) tbody.innerHTML = '';
        let opts = '<option value="">-- Choose Client --</option>';
        let hasActiveDebts = false;
        if(data.status === 'success') {
            data.data.forEach(c => {
                opts += '<option value="' + c.client_id + '">' + c.name + ' (Bal: KSh ' + parseFloat(c.balance).toLocaleString() + ')</option>';
                if(tbody && parseFloat(c.balance) > 0) {
                    hasActiveDebts = true;
                    tbody.innerHTML += '<tr>' +
                        '<td><strong>' + c.name + '</strong></td><td>' + (c.phone || '-') + '</td>' +
                        '<td style="color:var(--red); font-weight:bold;">KSh ' + parseFloat(c.balance).toLocaleString() + '</td>' +
                        '<td style="text-align:center; display:flex; justify-content:center; gap:8px;">' +
                            '<button class="btn-action" style="background:var(--gold); padding:5px 8px;" onclick="editClientBalance(' + c.client_id + ', ' + parseFloat(c.balance) + ')" title="Edit Balance"><i class="fa-solid fa-pen"></i></button>' +
                            '<button class="btn-action" style="background:var(--teal); padding:5px 8px;" onclick="clearClientDebt(' + c.client_id + ', ' + parseFloat(c.balance) + ')" title="Clear Debt (Mark as Paid)"><i class="fa-solid fa-check-double"></i></button>' +
                        '</td>' +
                    '</tr>';
                }
            });
            if(tbody && !hasActiveDebts) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-light); padding: 20px;">No active credit clients found.</td></tr>';
            }
        }
        if(select) select.innerHTML = opts;
    });
};

window.editClientBalance = function(clientId, currentBalance) {
    let newBalance = prompt('Enter the new credit balance for this client (currently KSh ' + currentBalance + '):', currentBalance);
    if(newBalance === null) return;
    newBalance = parseFloat(newBalance.replace(/[^0-9.]/g, ''));
    if(isNaN(newBalance) || newBalance < 0) return alert('Please enter a valid positive number.');
    
    const fd = new FormData(); 
    fd.append('action', 'edit_balance'); 
    fd.append('client_id', clientId);
    fd.append('balance', newBalance);
    
    fetch('database/clients.php', {method:'POST', body:fd}).then(r=>r.json()).then(data => {
        if(data.status === 'success') {
            loadClients();
        } else {
            alert('Error updating balance: ' + data.message);
        }
    });
};window.saveClient = function() {
    const name = document.getElementById('client-name').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    if(!name) return alert('Name required');
    const fd = new FormData(); fd.append('action','add'); fd.append('name', name); fd.append('phone', phone);
    fetch('database/clients.php', {method:'POST', body:fd}).then(()=> { 
        document.getElementById('client-name').value = '';
        document.getElementById('client-phone').value = '';
        toggleClientForm(); 
        loadClients(); 
    });
};

window.clearClientDebt = function(clientId, amount) {
    if(!confirm('Mark KSh ' + amount + ' as fully paid?')) return;
    const fd = new FormData(); fd.append('action','clear_debt'); fd.append('client_id', clientId);
    fetch('database/clients.php', {method:'POST', body:fd}).then(r=>r.json()).then(data => {
        if(data.status === 'success') {
            loadClients();
            if(data.sales && data.sales.length > 0) {
                let receiptItems = [];
                data.items.forEach(item => {
                    receiptItems.push({
                        item_name: item.item_name || item.name,
                        qty: item.quantity || item.qty,
                        selling_price: item.price || item.selling_price, selected_size: item.selected_size, selected_color: item.selected_color
                    });
                });
                const receiptData = {
                    receiptNum: 'PAY-' + Math.floor(Math.random() * 1000000),
                    date: new Date().toLocaleString('en-KE', {}),
                    attendant: (document.getElementById('topbar-name') && document.getElementById('topbar-name').innerText) ? document.getElementById('topbar-name').innerText : 'Admin',
                    items: receiptItems,
                    total: amount,
                    received: amount,
                    change: 0,
                    method: 'Debt Cleared'
                };
                showReceipt(receiptData);
                setTimeout(() => window.print(), 500);
            } else {
                alert('Debt cleared successfully! (No items were assigned to this credit account via POS)');
            }
        } else {
            alert('Error clearing debt: ' + data.message);
        }
    });
};





// --- PROMOTIONS MANAGEMENT ---
function loadPromotions() {
    fetch('database/promotions.php?action=list')
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector('#promotionsTable tbody');
            tbody.innerHTML = '';
            if (data.status === 'success') {
                data.data.forEach(promo => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><img src="${promo.image_url || 'assets/images/placeholder.png'}" style="height:40px; border-radius:4px;"></td>
                        <td>${promo.promo_type}</td>
                        <td>${promo.title}</td>
                        <td><span class="badge ${promo.status === 'Active' ? 'badge-success' : 'badge-danger'}">${promo.status}</span></td>
                        <td>
                            <button class="btn btn-sm btn-danger" onclick="deletePromo(${promo.id})"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        });
}

function openAddPromoModal() {
    document.getElementById('addPromoForm').reset();
    document.getElementById('addPromoModal').style.display = 'flex';
}

function submitAddPromo(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    fetch('database/promotions.php', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                closeModal('addPromoModal');
                loadPromotions();
            } else {
                alert('Error: ' + data.message);
            }
        });
}

function deletePromo(id) {
    if (confirm('Delete this promotion?')) {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id', id);
        fetch('database/promotions.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') loadPromotions();
            });
    }
}

