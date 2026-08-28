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

function setProductView(viewType) {
    const gridBtn = document.getElementById('btn-grid-view');
    const listBtn = document.getElementById('btn-list-view');
    const gridContainer = document.getElementById('products-dynamic-grid');
    
    if (!gridContainer || !gridBtn || !listBtn) return;
    
    if (viewType === 'list') {
        gridContainer.classList.add('list-view');
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
    } else {
        gridContainer.classList.remove('list-view');
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
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
    const itemName = (item.item_name || item.shoe_name || item.cloth_name || 'Product').replace(/"/g, '&quot;');
    const priceNum = parseFloat(item.selling_price || 0);
    const price = priceNum.toLocaleString();
    const origPriceRaw = item.original_price ? parseFloat(item.original_price) : 0;
    const origPriceStr = origPriceRaw > 0 ? origPriceRaw.toLocaleString() : '';
    
    let discountBadgeHtml = '';
    let origPriceHtml = '';
    if (origPriceRaw > priceNum) {
        const discountPerc = Math.round(((origPriceRaw - priceNum) / origPriceRaw) * 100);
        discountBadgeHtml = `<div class="discount-badge">-${discountPerc}%</div>`;
        origPriceHtml = `<span class="original-price">KSh ${origPriceStr}</span>`;
    }
    
    const rating = parseFloat(item.rating) || 0;
    const reviews = parseInt(item.reviews_count) || 0;
    
    let ratingHtml = '';
    if (rating > 0) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (rating >= i) stars += '<i class="fa-solid fa-star"></i>';
            else if (rating >= i - 0.5) stars += '<i class="fa-solid fa-star-half-stroke"></i>';
            else stars += '<i class="fa-regular fa-star" style="color:#cbd5e1"></i>';
        }
        ratingHtml = `
            <div class="prod-rating">
                ${stars}
                <span>(${reviews})</span>
            </div>
        `;
    }
    
    const hasStock = parseInt(item.quantity || 0) > 0;
    let stockBadge = hasStock 
        ? `<span class="stock-status" style="color:var(--teal); font-weight:700; font-size:0.75rem;">In Stock</span>` 
        : `<span class="stock-status" style="color:var(--red); font-weight:700; font-size:0.75rem;">Out of Stock</span>`;
        
    let rawSizes = item.sizes || item.size;
    let sizesArr = [];
    if (Array.isArray(rawSizes)) {
        sizesArr = rawSizes;
    } else if (rawSizes && typeof rawSizes === 'string') {
        try { 
            let parsed = JSON.parse(rawSizes); 
            sizesArr = Array.isArray(parsed) ? parsed : [rawSizes]; 
        } catch(e) { 
            sizesArr = rawSizes.includes(',') ? rawSizes.split(',').map(s => s.trim()) : [rawSizes]; 
        }
    }
    sizesArr = sizesArr.filter(s => s !== null && s !== undefined && String(s).trim() !== '');
    
    let rawColors = item.colors || item.color;
    let colorsArr = [];
    if (Array.isArray(rawColors)) {
        colorsArr = rawColors;
    } else if (rawColors && typeof rawColors === 'string') {
        try { 
            let parsed = JSON.parse(rawColors); 
            colorsArr = Array.isArray(parsed) ? parsed : [rawColors]; 
        } catch(e) { 
            colorsArr = rawColors.includes(',') ? rawColors.split(',').map(c => c.trim()) : [rawColors]; 
        }
    }
    colorsArr = colorsArr.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
    
    let imgUrl = 'assets/images/hero-shoe.png';
    let imagesHtml = '';
    let imagesArr = [];
    
    try {
        let rawImg = item.images || item.image;
        let parsed = typeof rawImg === 'string' ? JSON.parse(rawImg) : rawImg;
        if (Array.isArray(parsed) && parsed.length > 0) {
            imagesArr = parsed;
        } else if (typeof parsed === 'string' && parsed) {
            imagesArr = [parsed];
        }
    } catch(e) {
        let rawImg = item.images || item.image;
        if (typeof rawImg === 'string' && rawImg) {
            imagesArr = [rawImg];
        }
    }
    if (imagesArr.length === 0) imagesArr = [imgUrl];
    
    const encodedImagesData = encodeURIComponent(JSON.stringify(imagesArr));
    
    imagesArr.forEach(img => {
        imagesHtml += `<img src="${img}" alt="${itemName}" loading="lazy" style="flex:0 0 100%; scroll-snap-align:center; object-fit:contain; width:100%; height:100%; padding:8px;" onerror="this.src='assets/images/hero-shoe.png'">`;
    });
    
    let sizeDropdown = '';
    if (sizesArr.length > 0) {
        let opts = sizesArr.map(s => `<option value="${s}">Size ${s}</option>`).join('');
        sizeDropdown = `<select id="client-size-${itemId}" style="width:100%; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; font-size:0.75rem; color:var(--navy); font-weight:600; outline:none; background:#f8fafc;"><option value="">Size</option>${opts}</select>`;
    }

    let colorDropdown = '';
    if (colorsArr.length > 0) {
        let opts = colorsArr.map(c => `<option value="${c}">${c}</option>`).join('');
        colorDropdown = `<select id="client-color-${itemId}" style="width:100%; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; font-size:0.75rem; color:var(--navy); font-weight:600; outline:none; background:#f8fafc;"><option value="">Color</option>${opts}</select>`;
    }
    
    let variantsRow = '';
    if (sizeDropdown || colorDropdown) {
        variantsRow = `<div style="display:flex; gap:6px; margin:8px 0; width:100%;">${sizeDropdown ? `<div style="flex:1; min-width:0;">${sizeDropdown}</div>` : ''}${colorDropdown ? `<div style="flex:1; min-width:0;">${colorDropdown}</div>` : ''}</div>`;
    }

    return `
        <div class="product-card" style="display:flex; flex-direction:column; justify-content:space-between; position:relative;">
            ${discountBadgeHtml}
            <div class="product-img prod-img-wrap" onclick="openImageViewer('${encodedImagesData}')" style="position:relative; background:#f8fafc; border-radius:10px; margin-bottom:10px; display:flex; align-items:center; justify-content:center; overflow:hidden; cursor:pointer;">
                <div class="prod-carousel" style="display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; width:100%; height:100%;">
                    ${imagesHtml}
                </div>
            </div>
            
            <div class="product-details" style="flex:1; display:flex; flex-direction:column;">
                <h3 class="prod-name" style="font-size:0.88rem; color:var(--navy); font-weight:700; margin-bottom:3px; line-height:1.3; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;" title="${itemName}">${itemName}</h3>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span style="font-size:0.72rem; color:#64748b; font-weight:500; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; max-width:65%;">${item.brand || ''}</span>
                    ${stockBadge}
                </div>
                
                <div style="display:flex; align-items:baseline; gap:5px; margin-bottom:4px; flex-wrap:wrap;">
                    <span class="price" style="font-size:1rem; font-weight:800; color:#0f172a;">KSh ${price}</span>
                    ${origPriceHtml}
                </div>
                
                ${ratingHtml}
                ${variantsRow}
            </div>
            
            <div class="card-actions" style="display:flex; gap:5px; margin-top:8px; padding-top:8px; border-top:1px dashed #e2e8f0;">
                <button class="add-to-cart-btn" onclick="addItemToCart(this, ${itemId}, '${itemType}')" style="flex:1; background:var(--teal); color:white; border:none; padding:6px 6px; border-radius:7px; cursor:pointer; font-weight:700; font-size:0.7rem; display:flex; align-items:center; justify-content:center; gap:3px;"><i class="fa-solid fa-cart-shopping" style="font-size:0.65rem;"></i> Add to Cart</button>
                <button class="buy-now-btn" onclick="orderSingleItemViaWhatsApp(this, ${itemId}, '${itemType}')" style="background:#0f172a; color:white; border:none; padding:6px 8px; border-radius:7px; cursor:pointer; font-size:0.85rem; display:flex; align-items:center; justify-content:center;"><i class="fa-brands fa-whatsapp"></i></button>
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

function addItemToCart(btn, itemId, itemType) {
    const item = globalItems.find(i => i.item_id == itemId && i.item_type === itemType);
    if (!item) return;

    let selSize = '';
    let selColor = '';
    const container = btn.closest(".product-card") || btn.closest(".product-modal") || document;
    const sizeElem = container.querySelector(`select[id^="client-size-"]`);
    const colorElem = container.querySelector(`select[id^="client-color-"]`);
    
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

function orderSingleItemViaWhatsApp(btn, itemId, itemType) {
    const item = globalItems.find(s => s.item_id == itemId && s.item_type === itemType);
    if(!item) return;

    let selSize = '';
    let selColor = '';
    const container = btn.closest(".product-card") || btn.closest(".product-modal") || document;
    const sizeElem = container.querySelector(`select[id^="client-size-"]`);
    const colorElem = container.querySelector(`select[id^="client-color-"]`);
    
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

// ----------------------------------------------------
// UNIFIED PROMOTIONS FOR MOBILE & DESKTOP
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    loadPublicPromotions();
});

function loadPublicPromotions() {
    fetch('database/promotions.php?action=public_active')
        .then(res => res.json())
        .then(data => {
            const mobileContainer = document.getElementById('mobile-promos-container');
            const desktopContainer = document.getElementById('desktop-hero-spinning-container');
            
            if (data.status === 'success' && data.data && data.data.length > 0) {
                // Render Mobile Slider
                if (mobileContainer) {
                    renderPromoSlider(mobileContainer, data.data);
                    const wrapper = document.getElementById('mobile-promos-wrapper');
                    if (wrapper) wrapper.classList.add('active-promos');
                }
                // Render Desktop Spinning Image
                if (desktopContainer) {
                    renderDesktopSpinningPromos(desktopContainer, data.data);
                }
            } else {
                // Fallback to old "Offer Shoes" if no explicit banners exist
                loadHeroOffers();
            }
        })
        .catch(() => {
            loadHeroOffers();
        });
}

function renderDesktopSpinningPromos(container, promos) {
    let slidesHtml = '';
    promos.forEach((p, idx) => {
        const opacity = (idx === 0) ? '1' : '0';
        const zIndex = (idx === 0) ? '10' : '1';
        
        const safeTitle = p.title ? p.title.replace(/'/g, "&apos;").replace(/"/g, "&quot;") : "Offer";
        const bgColor = p.bg_color || 'var(--teal)';
        const promoType = p.promo_type || 'Offer';
        const subtitle = p.subtitle ? '<p style="color: white; opacity: 0.9; margin: 0; font-size: 0.9rem;">' + p.subtitle + '</p>' : '';
        
        slidesHtml += '<div class="hero-slide" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: ' + opacity + '; z-index: ' + zIndex + '; transition: opacity 0.8s ease; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="showView(\'products\'); return false;">';
        
        // The CIRCLE card (like the mobile card, but a circle)
        slidesHtml += '<div style="background: ' + bgColor + '; width: 450px; height: 450px; border-radius: 50%; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.2); display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 40px; text-align: center; overflow: visible;">';
        
        // Badge at the top of the circle
        slidesHtml += '<div style="background: rgba(255,255,255,0.2); color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 0.85rem; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.4); backdrop-filter: blur(5px);">' + promoType + '</div>';
        
        // Text
        slidesHtml += '<div style="color: white; margin-bottom: 20px; z-index: 3; position: relative;">';
        slidesHtml += '<h3 style="margin: 0 0 5px 0; font-size: 2.2rem; font-weight: 900; line-height: 1.1; text-shadow: 0 4px 10px rgba(0,0,0,0.2);">' + safeTitle + '</h3>';
        slidesHtml += subtitle;
        slidesHtml += '</div>';
        
        // Image positioned at the bottom of the circle (overflowing slightly for a 3D effect!)
        slidesHtml += '<img src="' + p.image_url + '" alt="' + safeTitle + '" onerror="this.style.display=\'none\'" style="position: absolute; bottom: -20px; max-height: 280px; max-width: 110%; object-fit: contain; filter: drop-shadow(0 20px 30px rgba(0,0,0,0.3)); z-index: 2; transform: rotate(-5deg);">';
        
        slidesHtml += '</div>'; // end circle card
        slidesHtml += '</div>'; // end hero-slide
    });
    
    container.innerHTML = slidesHtml;
    
    let currentIndex = 0;
    const slides = container.querySelectorAll('.hero-slide');
    if (slides.length > 1) {
        setInterval(() => {
            const nextIndex = (currentIndex + 1) % slides.length;
            slides[currentIndex].style.opacity = '0';
            slides[currentIndex].style.zIndex = '1';
            slides[nextIndex].style.opacity = '1';
            slides[nextIndex].style.zIndex = '10';
            currentIndex = nextIndex;
        }, 3500);
    }
}
// Mobile slider rendering logic (original user logic)
let promoIndex = 0;
let promoTotal = 0;
let promoTimer = null;

function renderPromoSlider(container, promos) {
    const slides = promos.map(p => `
        <div class="promo-card" style="background:${p.bg_color || 'linear-gradient(135deg, var(--navy), #1a3a52)'}" onclick="showView('products'); return false;">
            <span class="promo-badge">${p.promo_type || 'Offer'}</span>
            <div class="promo-content">
                <div class="promo-title">${p.title}</div>
                ${p.subtitle ? `<div class="promo-subtitle">${p.subtitle}</div>` : ''}
            </div>
            ${p.image_url ? `<img src="${p.image_url}" class="promo-img" onerror="this.style.display='none'">` : ''}
        </div>
    `).join('');

    const multi = promos.length > 1;
    const dots = multi ? promos.map((_, i) => `<button class="promo-dot${i === 0 ? ' active' : ''}" onclick="goToPromo(${i})" aria-label="Go to promotion ${i + 1}"></button>`).join('') : '';

    container.innerHTML = `
        <div class="promo-track" id="promo-track">${slides}</div>
        ${multi ? `
        <button class="promo-arrow prev" onclick="shiftPromo(-1)" aria-label="Previous promotion"><i class="fa-solid fa-chevron-left"></i></button>
        <button class="promo-arrow next" onclick="shiftPromo(1)" aria-label="Next promotion"><i class="fa-solid fa-chevron-right"></i></button>
        <div class="promo-dots">${dots}</div>` : ''}
    `;

    if (multi) initPromoSlider(container, promos.length);
}

function initPromoSlider(container, total) {
    promoTotal = total;
    promoIndex = 0;
    startPromoAutoplay();

    container.addEventListener('mouseenter', stopPromoAutoplay);
    container.addEventListener('mouseleave', startPromoAutoplay);

    let touchStartX = 0;
    container.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        stopPromoAutoplay();
    }, { passive: true });
    container.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (dx > 40) shiftPromo(-1);
        else if (dx < -40) shiftPromo(1);
        startPromoAutoplay();
    }, { passive: true });
}

function startPromoAutoplay() {
    stopPromoAutoplay();
    if (promoTotal > 1) promoTimer = setInterval(() => shiftPromo(1), 4500);
}

function stopPromoAutoplay() {
    if (promoTimer) clearInterval(promoTimer);
}

function shiftPromo(dir) {
    promoIndex = (promoIndex + dir + promoTotal) % promoTotal;
    updatePromoSlide();
}

function goToPromo(i) {
    promoIndex = i;
    updatePromoSlide();
    startPromoAutoplay();
}

function updatePromoSlide() {
    const track = document.getElementById('promo-track');
    if (track) track.style.transform = `translateX(-${promoIndex * 100}%)`;
    document.querySelectorAll('.promo-dot').forEach((d, i) => d.classList.toggle('active', i === promoIndex));
}

// Fallback logic for when there are no active promotions configured
function loadHeroOffers() {
    fetch('database/inventory.php?action=list')
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if(data.status === 'success' && data.data.length > 0) {
                var inStockShoes = data.data.filter(function(s) { return parseInt(s.quantity) > 0; });
                var offerShoes = inStockShoes.filter(function(s) { return parseFloat(s.original_price) > parseFloat(s.selling_price); });
                if (offerShoes.length === 0) offerShoes = inStockShoes;
                offerShoes = offerShoes.slice(0, 5);
                var container = document.getElementById('desktop-hero-spinning-container');
                if(!container || offerShoes.length === 0) return;
                var slidesHtml = '';
                offerShoes.forEach(function(shoe, idx) {
                    var img = (shoe.images && shoe.images.length > 0) ? shoe.images[0] : (shoe.image || 'assets/images/hero-shoe.png');
                    var encodedShoe = encodeURIComponent(JSON.stringify(shoe));
                    var leftPos = (idx === 0) ? '0' : '100%';
                    var shoeName = shoe.shoe_name.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
                    slidesHtml += '<div class="hero-slide" data-shoe="' + encodedShoe + '" onclick="openProductDetails(JSON.parse(decodeURIComponent(this.dataset.shoe)))" style="position: absolute; top: 0; left: ' + leftPos + '; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transition: left 0.5s ease; cursor: pointer;">';
                    slidesHtml += '<img src="' + img + '" alt="' + shoeName + '" class="hero-shoe" style="max-height: 90%; max-width: 90%; object-fit: contain; filter: drop-shadow(0 15px 25px rgba(0,0,0,0.15));">';
                    slidesHtml += '</div>';
                });
                container.innerHTML = slidesHtml;
                var currentIndex = 0;
                var slides = container.querySelectorAll('.hero-slide');
                if(slides.length > 1) {
                    setInterval(function() {
                        var nextIndex = (currentIndex + 1) % slides.length;
                        slides[currentIndex].style.transition = 'left 0.5s ease';
                        slides[currentIndex].style.left = '-100%';
                        slides[nextIndex].style.transition = 'none';
                        slides[nextIndex].style.left = '100%';
                        void slides[nextIndex].offsetWidth;
                        slides[nextIndex].style.transition = 'left 0.5s ease';
                        slides[nextIndex].style.left = '0';
                        currentIndex = nextIndex;
                    }, 3000); // 3 sec so it is smooth
                }
            }
        });
}

function openProductDetails(item) {
    const itemType = item.item_type || (item.shoe_id ? 'shoe' : 'cloth');
    const itemId = item.item_id || item.shoe_id || item.cloth_id;
    const itemName = (item.item_name || item.shoe_name || item.cloth_name || 'Product').replace(/'/g, "&apos;").replace(/"/g, "&quot;");
    const priceNum = parseFloat(item.selling_price || 0);
    const price = priceNum.toLocaleString();
    let rawSizes = item.sizes || item.size;
    let sizesArr = [];
    if (Array.isArray(rawSizes)) sizesArr = rawSizes;
    else if (rawSizes && typeof rawSizes === 'string') {
        try { let parsed = JSON.parse(rawSizes); sizesArr = Array.isArray(parsed) ? parsed : [rawSizes]; }
        catch(e) { sizesArr = rawSizes.includes(',') ? rawSizes.split(',').map(s => s.trim()) : [rawSizes]; }
    }
    sizesArr = sizesArr.filter(s => s !== null && s !== undefined && String(s).trim() !== '');
    let rawColors = item.colors || item.color;
    let colorsArr = [];
    if (Array.isArray(rawColors)) colorsArr = rawColors;
    else if (rawColors && typeof rawColors === 'string') {
        try { let parsed = JSON.parse(rawColors); colorsArr = Array.isArray(parsed) ? parsed : [rawColors]; }
        catch(e) { colorsArr = rawColors.includes(',') ? rawColors.split(',').map(c => c.trim()) : [rawColors]; }
    }
    colorsArr = colorsArr.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
    let sizeDropdown = '';
    if (sizesArr.length > 0) {
        let opts = sizesArr.map(s => '<option value="' + s + '">Size ' + s + '</option>').join('');
        sizeDropdown = '<select id="client-size-' + itemId + '" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:8px; font-size:1rem; outline:none;"><option value="">Select Size</option>' + opts + '</select>';
    }
    let colorDropdown = '';
    if (colorsArr.length > 0) {
        let opts = colorsArr.map(c => '<option value="' + c + '">' + c + '</option>').join('');
        colorDropdown = '<select id="client-color-' + itemId + '" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:8px; font-size:1rem; outline:none; margin-top:10px;"><option value="">Select Color</option>' + opts + '</select>';
    }
    const img = (item.images && item.images.length > 0) ? item.images[0] : (item.image || 'assets/images/hero-shoe.png');
    let modalHtml = '<div id="product-details-modal" class="product-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;">';
    modalHtml += '<div style="background:#fff; border-radius:15px; width:100%; max-width:400px; overflow:hidden; position:relative; box-shadow:0 20px 40px rgba(0,0,0,0.2);">';
    modalHtml += '<button onclick="this.closest(\'#product-details-modal\').remove()" style="position:absolute; top:15px; right:15px; background:#f1f5f9; border:none; width:30px; height:30px; border-radius:50%; font-size:1.2rem; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10;"><i class="fa-solid fa-xmark"></i></button>';
    modalHtml += '<div style="background:#f8fafc; padding:20px; display:flex; justify-content:center;">';
    modalHtml += '<img src="' + img + '" alt="' + itemName + '" style="max-height:200px; max-width:100%; object-fit:contain; filter: drop-shadow(0 15px 25px rgba(0,0,0,0.1));">';
    modalHtml += '</div>';
    modalHtml += '<div style="padding:20px;">';
    modalHtml += '<h2 style="margin:0 0 10px 0; font-size:1.3rem; color:var(--navy);">' + itemName + '</h2>';
    modalHtml += '<div style="font-size:1.2rem; font-weight:800; color:var(--teal); margin-bottom:15px;">KSh ' + price + '</div>';
    modalHtml += sizeDropdown;
    modalHtml += colorDropdown;
    modalHtml += '<div style="display:flex; gap:10px; margin-top:20px;">';
    modalHtml += '<button onclick="addItemToCart(this, ' + itemId + ', \'' + itemType + '\'); this.closest(\'#product-details-modal\').remove();" style="flex:1; background:var(--teal); color:white; border:none; padding:12px; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;"><i class="fa-solid fa-cart-shopping"></i> Add to Cart</button>';
    modalHtml += '<button onclick="orderSingleItemViaWhatsApp(this, ' + itemId + ', \'' + itemType + '\'); this.closest(\'#product-details-modal\').remove();" style="flex:1; background:#0f172a; color:white; border:none; padding:12px; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;"><i class="fa-brands fa-whatsapp"></i> Buy Now</button>';
    modalHtml += '</div>';
    modalHtml += '</div>';
    modalHtml += '</div>';
    modalHtml += '</div>';
    const existing = document.getElementById('product-details-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}









