
    function openImageViewer(encodedImagesStr) {
        let images = [];
        try { images = JSON.parse(decodeURIComponent(encodedImagesStr)); } catch(e) { images = [decodeURIComponent(encodedImagesStr)]; }
        if (!Array.isArray(images) || images.length === 0) return;
        
        const modal = document.getElementById('imageViewerModal');
        const carousel = document.getElementById('imageViewerCarousel');
        const dotsContainer = document.getElementById('imageViewerDots');
        
        carousel.innerHTML = '';
        dotsContainer.innerHTML = '';
        
        images.forEach((img, index) => {
            const imgEl = document.createElement('img');
            imgEl.src = img;
            imgEl.style.cssText = 'flex:0 0 100%; scroll-snap-align:center; object-fit:contain; width:100%; height:100%; padding:20px; box-sizing:border-box; user-select:none;';
            carousel.appendChild(imgEl);
            
            const dot = document.createElement('div');
            dot.style.cssText = 'width:12px; height:12px; border-radius:50%; transition:0.3s; background:' + (index === 0 ? 'white' : 'rgba(255,255,255,0.2)');
            dotsContainer.appendChild(dot);
        });
        
        carousel.onscroll = () => {
            const scrollPos = carousel.scrollLeft;
            const width = carousel.offsetWidth;
            const activeIndex = Math.round(scrollPos / width);
            Array.from(dotsContainer.children).forEach((dot, i) => {
                dot.style.background = i === activeIndex ? 'white' : 'rgba(255,255,255,0.2)';
            });
        };
        
        modal.style.display = 'flex';
    }
    
    function closeImageViewer() {
        document.getElementById('imageViewerModal').style.display = 'none';
    }

