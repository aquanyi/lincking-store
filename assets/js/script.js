document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks      = document.getElementById('navLinks');
    const navActions    = document.getElementById('navActions');

    if (mobileMenuBtn && navLinks && navActions) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('mobile-open');
            navActions.classList.toggle('mobile-open', isOpen);
            mobileMenuBtn.innerHTML = isOpen
                ? '<i class="fa-solid fa-xmark"></i>'
                : '<i class="fa-solid fa-bars"></i>';
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');
            if (href === '#' || !href) return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Close mobile menu
                if (navLinks && navActions && mobileMenuBtn) {
                    navLinks.classList.remove('mobile-open');
                    navActions.classList.remove('mobile-open');
                    mobileMenuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
                }
            }
        });
    });

    // Newsletter form
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', e => {
            e.preventDefault();
            const email = document.getElementById('newsletter-email').value;
            alert(`Thank you for subscribing with ${email}!`);
            newsletterForm.reset();
        });
    }
});

// Inject mobile nav styles dynamically

const mobileStyle = document.createElement('style');
mobileStyle.textContent = `
    @media (max-width: 780px) {
        .nav-links.mobile-open,
        .nav-actions.mobile-open {
            display: flex !important;
        }
        .nav-links.mobile-open {
            position: absolute;
            top: 72px; left: 0;
            width: 100%;
            flex-direction: column;
            background: #fff;
            padding: 24px 28px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.1);
            gap: 22px;
            z-index: 999;
        }
        .nav-actions.mobile-open {
            position: absolute;
            top: calc(72px + 170px);
            left: 0;
            width: 100%;
            flex-direction: column;
            background: #fff;
            padding: 0 28px 24px;
            gap: 12px;
            z-index: 999;
        }
        .nav-actions.mobile-open .btn { width: 100%; justify-content: center; }
    }
`;
document.head.appendChild(mobileStyle);



// ==========================================
// DYNAMIC INVENTORY FETCH & FILTERING
// ==========================================

let globalItems = [];
let filteredItems = [];
let officialCategories = [];
let officialBrands = [];
let currentFilters = {
    category: 'all',
    brands: [],
    minPrice: 0,
    maxPrice: 50000,
    sort: 'Newest'
};

document.addEventListener('DOMContentLoaded', () => {
    fetchInventory();
    setupSortListener();
});

async function fetchInventory() {
    try {
        const response = await fetch('database/public_inventory.php');
        const result = await response.json();
        
        if (result.status === 'success' && result.data) {
            // Updated API format returns shoes and categories
            if(result.data.items) {
                globalItems = result.data.items;
                officialCategories = result.data.categories || [];
                officialBrands = result.data.brands || [];
            } else {
                // Fallback if old API format is cached
                globalItems = result.data;
            }
            
            initializeFilters();
            applyFilters();
            renderHomeFeatured();
        }
    } catch (err) {
        console.error('Error fetching inventory:', err);
    }
}

function initializeFilters() {
    // 1. Setup Categories
    const catContainer = document.getElementById('dynamic-categories');
    if (catContainer) {
        document.getElementById('count-all-cat').innerText = globalItems.length;
        
        // Use official categories from DB, or extract unique from shoes if empty
        let cats = officialCategories.map(c => c.name);
        if (cats.length === 0) {
            cats = [...new Set(globalItems.map(s => s.category))].filter(c => c);
        }
        
        cats.forEach(cat => {
            const count = globalItems.filter(s => s.category === cat).length;
            const li = document.createElement('li');
            li.dataset.cat = cat;
            li.innerHTML = `<span>${cat}</span> <span class="count">${count}</span>`;
            li.addEventListener('click', () => {
                document.querySelectorAll('#dynamic-categories li').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                currentFilters.category = cat;
                applyFilters();
            });
            catContainer.appendChild(li);
        });
        
        // Make "All" clickable
        const allCat = catContainer.querySelector('[data-cat="all"]');
        if (allCat) {
            allCat.addEventListener('click', function() {
                document.querySelectorAll('#dynamic-categories li').forEach(el => el.classList.remove('active'));
                this.classList.add('active');
                currentFilters.category = 'all';
                applyFilters();
            });
        }
    }

    // 2. Setup Brands
    const brandContainer = document.getElementById('dynamic-brands');
    if (brandContainer) {
        document.getElementById('count-all-brand').innerText = globalItems.length;
        
        // Use official brands from DB, or extract unique from shoes if empty
        let brands = officialBrands.map(b => b.name);
        if (brands.length === 0) {
            brands = [...new Set(globalItems.map(s => s.brand))].filter(b => b);
        }
        
        brands.forEach(brand => {
            const count = globalItems.filter(s => s.brand === brand).length;
            const label = document.createElement('label');
            label.className = 'custom-checkbox';
            label.innerHTML = `
                <input type="checkbox" value="${brand}" class="brand-filter">
                <span class="checkmark"></span>
                <span class="cb-label">${brand}</span>
                <span class="count">${count}</span>
            `;
            brandContainer.appendChild(label);
        });
        
        // Brand Checkbox Listeners
        document.querySelectorAll('.brand-filter').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'all') {
                    if (e.target.checked) {
                        document.querySelectorAll('.brand-filter').forEach(c => { if(c.value !== 'all') c.checked = false; });
                        currentFilters.brands = [];
                    }
                } else {
                    const allBrand = document.querySelector('.brand-filter[value="all"]');
                    if (allBrand) allBrand.checked = false;
                    if (e.target.checked) {
                        currentFilters.brands.push(val);
                    } else {
                        currentFilters.brands = currentFilters.brands.filter(b => b !== val);
                    }
                }
                
                // If nothing selected, revert to all
                if (currentFilters.brands.length === 0) {
                    const allBrand = document.querySelector('.brand-filter[value="all"]');
                    if (allBrand) allBrand.checked = true;
                }
                applyFilters();
            });
        });
    }

    // 3. Setup Price Slider
    const maxPrice = Math.max(...globalItems.map(s => parseFloat(s.selling_price) || 0), 10000);
    const slider1 = document.getElementById('slider-1');
    const slider2 = document.getElementById('slider-2');
    const minDisplay = document.getElementById('price-min-display');
    const maxDisplay = document.getElementById('price-max-display');

    if (slider1 && slider2) {
        slider1.min = 1; slider2.min = 1;
        slider1.max = maxPrice; slider2.max = maxPrice;
        slider1.value = 1;
        slider2.value = maxPrice;
        
        currentFilters.minPrice = 1;
        currentFilters.maxPrice = maxPrice;
        
        if (minDisplay) minDisplay.innerText = 'KSh 1';
        if (maxDisplay) maxDisplay.innerText = 'KSh ' + maxPrice.toLocaleString();
        
        const updatePrice = () => {
            let val1 = parseInt(slider1.value);
            let val2 = parseInt(slider2.value);
            if (val1 > val2) { let tmp = val1; val1 = val2; val2 = tmp; }
            
            if (minDisplay) minDisplay.innerText = 'KSh ' + val1.toLocaleString();
            if (maxDisplay) maxDisplay.innerText = 'KSh ' + val2.toLocaleString();
            
            currentFilters.minPrice = val1;
            currentFilters.maxPrice = val2;
            applyFilters();
        };

        slider1.addEventListener('input', updatePrice);
        slider2.addEventListener('input', updatePrice);
    }
}

function setupSortListener() {
    const sortSelect = document.getElementById('sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentFilters.sort = e.target.value;
            applyFilters();
        });
    }
}

function applyFilters() {
    let filtered = globalItems.filter(item => {
        // Category Filter
        if (currentFilters.category !== 'all' && item.category !== currentFilters.category) return false;
        
        // Brand Filter
        if (currentFilters.brands.length > 0 && !currentFilters.brands.includes(item.brand)) return false;
        
        // Price Filter
        const price = parseFloat(item.selling_price);
        if (price < currentFilters.minPrice || price > currentFilters.maxPrice) return false;
        
        return true;
    });

    // Sorting
    if (currentFilters.sort === 'Price: Low to High') {
        filtered.sort((a, b) => parseFloat(a.selling_price) - parseFloat(b.selling_price));
    } else if (currentFilters.sort === 'Price: High to Low') {
        filtered.sort((a, b) => parseFloat(b.selling_price) - parseFloat(a.selling_price));
    } else {
        // Newest (Default, already sorted by ID DESC from API)
        filtered.sort((a, b) => parseInt(b.item_id) - parseInt(a.item_id));
    }

    renderProducts(filtered);
}

function createItemCard(item) {
    const itemType = item.item_type || (item.shoe_id ? 'shoe' : 'cloth');
    const itemId = item.item_id || item.shoe_id || item.cloth_id;
    const price = parseFloat(item.selling_price).toLocaleString();
    const hasStock = parseInt(item.quantity) > 0;
    
    let stockBadge = hasStock 
        ? `<span class="stock-status" style="color:var(--teal); font-weight:700; font-size:0.85rem; background:rgba(66, 184, 164, 0.1); padding:4px 10px; border-radius:20px;">In Stock</span>` 
        : `<span class="stock-status" style="color:var(--red); font-weight:700; font-size:0.85rem; background:rgba(239, 68, 68, 0.1); padding:4px 10px; border-radius:20px;">Out of Stock</span>`;
        
    let rawSizes = item.size || item.sizes;
    let sizesArr = [];
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
    
    let rawColors = item.color || item.colors;
    let colorsArr = [];
    if (Array.isArray(rawColors)) {
        colorsArr = rawColors;
    } else if (rawColors && typeof rawColors === 'string') {
        try { 
            let parsed = JSON.parse(rawColors); 
            colorsArr = Array.isArray(parsed) ? parsed : [rawColors]; 
        } catch(e) { 
            colorsArr = [rawColors]; 
        }
    }
    
    let imgUrl = 'assets/images/hero-shoe.png';
    let imagesHtml = '';
    
    try {
        let arr = JSON.parse(item.image || item.images);
        if (Array.isArray(arr) && arr.length > 0) {
            arr.forEach((img) => {
                imagesHtml += `<img src="${img}" alt="${(item.item_name || item.shoe_name || item.cloth_name).replace(/"/g, '')}" loading="lazy" style="flex:0 0 100%; scroll-snap-align:center; object-fit:contain; width:100%; height:100%; padding:10px;" onerror="this.src='assets/images/hero-shoe.png'">`;
            });
        } else {
            let i = item.image || item.images || imgUrl;
            imagesHtml = `<img src="${i}" alt="Item" loading="lazy" style="flex:0 0 100%; scroll-snap-align:center; object-fit:contain; width:100%; height:100%; padding:10px;" onerror="this.src='assets/images/hero-shoe.png'">`;
        }
    } catch(e) {
        let i = item.image || item.images || imgUrl;
        imagesHtml = `<img src="${i}" alt="Item" loading="lazy" style="flex:0 0 100%; scroll-snap-align:center; object-fit:contain; width:100%; height:100%; padding:10px;" onerror="this.src='assets/images/hero-shoe.png'">`;
    }
    
    const selectStyle = "width:100%; padding:8px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:0.85rem; color:var(--navy); font-weight:600; outline:none; cursor:pointer; background:url('data:image/svg+xml;utf8,<svg fill=%22%23475569%22 height=%2224%22 viewBox=%220 0 24 24%22 width=%2224%22 xmlns=%22http://www.w3.org/2000/svg%22><path d=%22M7 10l5 5 5-5z%22/></svg>') no-repeat right 8px center; background-size:16px; -webkit-appearance:none; -moz-appearance:none; appearance:none;";

    let sizeDropdown = '';
    if (sizesArr.length > 0) {
        let opts = sizesArr.map(s => `<option value="${s}">Size ${s}</option>`).join('');
        sizeDropdown = `<div style="flex:1;"><select id="client-size-${itemId}" style="${selectStyle}"><option value="">Size</option>${opts}</select></div>`;
    }

    let colorDropdown = '';
    if (colorsArr.length > 0) {
        let opts = colorsArr.map(c => `<option value="${c}">${c}</option>`).join('');
        colorDropdown = `<div style="flex:1;"><select id="client-color-${itemId}" style="${selectStyle}"><option value="">Color</option>${opts}</select></div>`;
    }

    return `
        <div class="product-card" style="display:flex; flex-direction:column; justify-content:space-between; padding:20px; border:1px solid #e2e8f0; border-radius:16px; background:#fff; transition:all 0.3s ease; box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div class="product-img" style="position:relative; height:240px; background:#f8fafc; border-radius:12px; margin-bottom:20px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                <div class="prod-carousel" style="display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; width:100%; height:100%;">
                    ${imagesHtml}
                </div>
            </div>
            
            <div class="product-details" style="flex:1;">
                <h3 style="font-size:1.15rem; color:var(--navy); font-weight:800; margin-bottom:8px; line-height:1.3;">${item.item_name || item.shoe_name || item.cloth_name}</h3>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding-bottom:15px; border-bottom:1px dashed #e2e8f0;">
                    <span style="font-size:0.85rem; color:#64748b; font-weight:600;">${item.brand || 'Linchking'}</span>
                    ${stockBadge}
                </div>
                
                <div style="display:flex; gap:10px; margin-bottom:20px;">
                    ${sizeDropdown}
                    ${colorDropdown}
                </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="price" style="font-size:1.3rem; font-weight:800; color:#0f172a;">KSh ${price}</span>
                <div style="display:flex; gap:8px;">
                    <button class="add-to-cart-btn" onclick="addItemToCart(${itemId}, '${itemType}')" style="background:var(--teal); color:white; border:none; padding:0 15px; height:40px; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:600;"><i class="fa-solid fa-cart-shopping" style="margin-right:6px;"></i> Add</button>
                    <button class="buy-now-btn" onclick="orderSingleItemViaWhatsApp(${itemId}, '${itemType}')" style="background:#0f172a; color:white; border:none; padding:0 15px; height:40px; border-radius:10px; cursor:pointer; font-weight:600; display:flex; align-items:center; justify-content:center;"><i class="fa-brands fa-whatsapp" style="margin-right:6px;"></i> Order</button>
                </div>
            </div>
        </div>
    `;
}
function renderProducts(inventory) {
    const grid = document.getElementById('products-dynamic-grid');
    const countDisplay = document.getElementById('results-count-display');
    if (!grid) return;
    
    grid.innerHTML = '';
    if(countDisplay) {
        countDisplay.innerHTML = `<span class="icon"><i class="fa-solid fa-shoe-prints"></i></span> Showing ${inventory.length} products`;
    }

    if (inventory.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:var(--text-light);">No products found matching your filters.</div>';
        return;
    }

    let html = '';
    inventory.forEach(item => html += createItemCard(item));
    grid.innerHTML = html;
}

function renderHomeFeatured() {
    const grid = document.getElementById('home-dynamic-grid');
    if (!grid) return;
    
    // Show top 4 newest active shoes
    const featured = globalItems.slice(0, 4);
    let html = '';
    featured.forEach(item => html += createItemCard(item));
    grid.innerHTML = html;
}

// ==========================================
// PUBLIC CART & WHATSAPP CHECKOUT LOGIC
// ==========================================

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
            // Clean up any rogue brackets if present
            return imgData.replace(/[\[\]"]/g, '');
        }
    }
    return 'assets/images/hero-shoe.png';
}

let clientCart = [];

function toggleCart() {
    const panel = document.getElementById('cart-panel');
    const overlay = document.getElementById('cart-overlay');
    if(panel && overlay) {
        panel.classList.toggle('open');
        overlay.classList.toggle('open');
    }
}

function addItemToCart(itemId, itemType) {
    const item = globalItems.find(i => i.item_id == itemId && i.item_type === itemType);
    if (!item) return;

    let selSize = '';
    let selColor = '';
    const sizeElem = document.getElementById(`client-size-${itemId}`);
    const colorElem = document.getElementById(`client-color-${itemId}`);
    
    if (sizeElem) {
        selSize = sizeElem.value;
        if (!selSize) { alert('Please select a size before adding to cart.'); return; }
    }
    if (colorElem) {
        selColor = colorElem.value;
        if (!selColor) { alert('Please select a color before adding to cart.'); return; }
    }

    const existing = clientCart.find(i => i.item_id == itemId && i.item_type === itemType && i.selected_size == selSize && i.selected_color == selColor);
    if (existing) {
        existing.cartQty += 1;
    } else {
        const cartId = Date.now() + Math.random();
        clientCart.push({ ...item, cartQty: 1, selected_size: selSize, selected_color: selColor, cartId: cartId });
    }
    
    renderCart();
    
    const panel = document.getElementById('cart-panel');
    if(panel && !panel.classList.contains('open')) {
        toggleCart();
    }
}

function removeItemFromCart(cartId) {
    clientCart = clientCart.filter(i => i.cartId !== cartId);
    renderCart();
}

function changeCartQty(cartId, delta) {
    const item = clientCart.find(i => i.cartId === cartId);
    if (item) {
        item.cartQty += delta;
        if (item.cartQty <= 0) {
            removeItemFromCart(cartId);
        } else {
            renderCart();
        }
    }
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const badge = document.getElementById('cart-badge');
    const totalDisplay = document.getElementById('cart-total-price');
    
    if(!container) return;
    
    let totalItems = 0;
    let totalPrice = 0;
    container.innerHTML = '';
    
    if(clientCart.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 40px 20px; color: var(--text-light);">Your cart is empty.</div>';
    } else {
        clientCart.forEach(item => {
            totalItems += item.cartQty;
            totalPrice += parseFloat(item.selling_price) * item.cartQty;
            
                        const imgUrl = getSafeImageUrl(item.images || item.image);
            let varText = [];
            if(item.selected_size) varText.push("Size: " + item.selected_size);
            if(item.selected_color) varText.push("Color: " + item.selected_color);
            const variantsDisplay = varText.length > 0 ? varText.join(" | ") : "N/A";
            
            container.innerHTML += `
                <div class="cart-item">
                    <img src="${imgUrl}" alt="${item.item_name}" onerror="this.src='assets/images/hero-shoe.png'">
                    <div class="cart-item-info">
                        <h4>${item.item_name}</h4>
                        <p>${variantsDisplay}</p>
                        <div class="cart-item-price">KSh ${parseFloat(item.selling_price).toLocaleString()}</div>
                        <div class="cart-item-actions">
                            <button class="cart-qty-btn" onclick="changeCartQty(${item.cartId}, -1)">-</button>
                            <span>${item.cartQty}</span>
                            <button class="cart-qty-btn" onclick="changeCartQty(${item.cartId}, 1)">+</button>
                            <button class="cart-remove-btn" onclick="removeItemFromCart(${item.cartId})"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    if(badge) badge.innerText = totalItems;
    if(totalDisplay) totalDisplay.innerText = 'KSh ' + totalPrice.toLocaleString();
}

// Generate the WhatsApp Admin Auto-Fill Link
function generateAdminLink(items) {
    // payload format: type-id:qty,type-id:qty
    const payload = items.map(i => `${i.item_type}-${i.item_id}:${i.cartQty || 1}`).join(',');
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    // e.g. http://localhost/lincking store/dashboard.html?import_cart=...
    return `${baseUrl}dashboard.html?import_cart=${payload}`;
}

function orderSingleItemViaWhatsApp(itemId, itemType) {
    const item = globalItems.find(s => s.item_id == itemId && s.item_type === itemType);
    if(!item) return;

    let selSize = '';
    let selColor = '';
    const sizeElem = document.getElementById(`client-size-${itemId}`);
    const colorElem = document.getElementById(`client-color-${itemId}`);
    
    if (sizeElem) {
        selSize = sizeElem.value;
        if (!selSize) { alert('Please select a size first.'); return; }
    }
    if (colorElem) {
        selColor = colorElem.value;
        if (!selColor) { alert('Please select a color first.'); return; }
    }
    
    const price = parseFloat(item.selling_price).toLocaleString();
    let msg = `Hello Lincking Store! I would like to order this item:%0A%0A`;
    msg += `👟 *${item.item_name}*%0A`;
    msg += `Brand: ${item.brand}%0A`;
    if(selSize) msg += `Size: ${selSize}%0A`;
    if(selColor) msg += `Color: ${selColor}%0A`;
    msg += `Price: KSh ${price}%0A%0A`;
    
    const adminLink = generateAdminLink([{ item_id: itemId, item_type: itemType, cartQty: 1 }]);
    msg += `_Admin Auto-Fill Link:_ %0A${adminLink}`;
    
    window.open(`https://wa.me/254727642806?text=${msg}`, '_blank');
}

function checkoutCartViaWhatsApp() {
    if(clientCart.length === 0) {
        alert("Your cart is empty!");
        return;
    }
    
    let msg = `Hello Lincking Store! I would like to order the following items from my cart:%0A%0A`;
    let total = 0;
    
    clientCart.forEach(item => {
        const linePrice = parseFloat(item.selling_price) * item.cartQty;
        total += linePrice;
        msg += `👟 ${item.cartQty}x *${item.item_name}* (Size: ${item.selected_size || 'N/A'}) - KSh ${linePrice.toLocaleString()}%0A`;
    });
    
    msg += `%0A*Total: KSh ${total.toLocaleString()}*%0A%0A`;
    
    const adminLink = generateAdminLink(clientCart);
    msg += `_Admin Auto-Fill Link:_ %0A${adminLink}`;
    
    window.open(`https://wa.me/254727642806?text=${msg}`, '_blank');
}





