const grid = document.getElementById('grid');
const gridItems = document.querySelectorAll('.grid-item');
const cleanupBtn = document.getElementById('cleanup-btn');
const chaosZone = document.getElementById('chaos-zone');

// Ensure grid has position: relative for absolute positioning to work correctly
grid.style.position = 'relative';

// Track chaos level for each item (unlimited)
const chaosLevels = new Map();
const chaosElements = new Map(); // Track scattered text elements
const itemTexts = new Map(); // Store text for each item
const itemClickInProgress = new Map(); // Per-item debounce tracking
let allScatteredElements = []; // Track ALL elements for global shake effect
let currentMaxLevel = 0; // Track the highest level reached
const MAX_ELEMENTS = 300; // Cap to maintain performance during spam clicks with animations
const MAX_SHAKE_ELEMENTS = 600; // Cap shake effects to specific number of elements
const BREAKING_POINT = 800; // System breaking point - triggers BSOD
gridItems.forEach(item => {
    chaosLevels.set(item, 0);
    chaosElements.set(item, []);
    itemClickInProgress.set(item, false);
});

// Create a container for scattered chaos text
const chaosContainer = document.createElement('div');
chaosContainer.className = 'chaos-container';
document.body.appendChild(chaosContainer);

// Create Blue Screen of Death overlay
const bsodOverlay = document.createElement('div');
bsodOverlay.id = 'bsod-overlay';
const bsodContent = document.createElement('div');
bsodContent.id = 'bsod-content';
bsodContent.innerHTML = `
    <h1>A problem has been detected and this window has been shut down to prevent damage to your computer.</h1>
    <p>The chaos simulation has encountered a critical error and must be reset.</p>
    <p>If this is the first time you've seen this stop error screen, restart your computer. If this screen appears again, follow these steps:</p>
    <p>&nbsp;</p>
    <p>Check to make sure any new hardware or software is properly installed.</p>
    <p>If this is a new installation, ask your hardware or software manufacturer for any Windows updates you might need.</p>
    <p>&nbsp;</p>
    <p class="error-code">Technical information:</p>
    <p>*** EXCEPTION_GENERAL_PROTECTION_FAULT</p>
    <p>*** 0x00000000 0x00000000 0x00000000 0x00000000</p>
`;
const restartButton = document.createElement('button');
restartButton.id = 'bsod-restart-btn';
restartButton.textContent = 'RESTART';
bsodContent.appendChild(restartButton);
bsodOverlay.appendChild(bsodContent);
document.body.appendChild(bsodOverlay);

// Watchdog timer for detecting loading timeout
const LOAD_TIMEOUT = 3000; // 3 seconds to fully load

function showBSOD() {
    bsodOverlay.classList.add('show');
    // Only reset on button click
    const restartBtn = document.getElementById('bsod-restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', resetBSOD, { once: true });
        restartBtn.focus(); // Focus button for accessibility
    }
}

function resetBSOD() {
    location.reload();
}

// Start loading timeout
const loadTimeout = setTimeout(() => {
    // Check if page is still not ready
    if (!gridItems || gridItems.length === 0) {
        showBSOD();
    }
}, LOAD_TIMEOUT);

// Clear load timeout once page is fully interactive
// Since the script runs at the end of body, DOMContentLoaded may have already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        clearTimeout(loadTimeout);
    });
} else {
    // Document is already loaded/interactive
    clearTimeout(loadTimeout);
}

// Create a separate text overlay layer that's completely independent from grid transforms
const textOverlayContainer = document.createElement('div');
textOverlayContainer.className = 'text-overlay-container';
grid.appendChild(textOverlayContainer);

// Store text overlays for responsive repositioning
const textOverlayMap = new Map(); // Maps item to its text overlay

// Determine number of columns based on viewport
function getGridColumns() {
    return window.innerWidth <= 768 ? 3 : 5;
}

// Reposition text overlays based on current viewport
function repositionTextOverlays() {
    const cols = getGridColumns();
    gridItems.forEach((item, index) => {
        const textOverlay = textOverlayMap.get(item);
        if (!textOverlay) return;
        
        const row = Math.floor(index / 5); // Always based on full 5-column HTML structure
        const col = index % 5;
        
        // Check if this item should be hidden on mobile
        const isMobile = window.innerWidth <= 768;
        const isHiddenOnMobile = col >= 3; // Columns 3,4 (indices) are hidden
        
        if (isMobile && isHiddenOnMobile) {
            textOverlay.style.display = 'none';
            return;
        }
        
        // Position based on current grid layout
        const itemWidth = 100 / cols;
        const itemHeight = 100 / (isMobile ? 5 : 5); // Mobile still has 5 rows, just 3 cols
        
        // For mobile, recalculate column position (only show first 3)
        const displayCol = isMobile ? col : col;
        
        textOverlay.style.left = (displayCol * itemWidth) + '%';
        textOverlay.style.top = (row * itemHeight) + '%';
        textOverlay.style.width = itemWidth + '%';
        textOverlay.style.height = itemHeight + '%';
        textOverlay.style.display = '';
    });
}

// Create text overlays and hide original text
gridItems.forEach((item, index) => {
    const originalSpan = item.querySelector('span');
    const text = originalSpan.textContent;
    
    // Store text for this item
    itemTexts.set(item, text);
    
    // Hide the original text inside the grid item
    originalSpan.style.display = 'none';
    
    // Create an absolutely positioned text overlay that never transforms
    // This matches the original span styling exactly
    const textOverlay = document.createElement('div');
    textOverlay.className = 'text-overlay';
    textOverlay.textContent = text;
    
    // Store reference for repositioning
    textOverlayMap.set(item, textOverlay);
    
    // Make the overlay clickable by delegating to the grid item
    textOverlay.addEventListener('click', (e) => {
        e.stopPropagation();
        item.click();
    });
    
    textOverlayContainer.appendChild(textOverlay);
});

// Initial positioning
repositionTextOverlays();

// Reposition on window resize
window.addEventListener('resize', repositionTextOverlays);

// Seeded random for consistent noise-like behavior
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Update shake and chromatic aberration on newly created elements only
function updateNewElementsEffects(elements, level) {
    try {
        const params = getChaosParams(level);
        
        elements.forEach((el, elementIndex) => {
            const letterContainer = el.querySelector('span');
            if (!letterContainer) return;
            
            const letterSpans = letterContainer.querySelectorAll('span');
            
            // Update shake animation per letter only at moderate levels for performance
            if (params.shakeIntensity > 0 && level <= 18 && allScatteredElements.length <= MAX_SHAKE_ELEMENTS) {
                const shakeX = params.shakeIntensity;
                const shakeY = params.shakeIntensity * 0.8;
                const shakeSpeed = 0.1 + (level - 10) * 0.03;
                
                // Remove animation from parent
                el.style.animation = '';
                
                letterSpans.forEach((letterSpan, charIndex) => {
                    // Unique animation delay per letter for maximum chaos
                    const animationDelay = (elementIndex * 7 + charIndex * 3) % 20 * 0.01;
                    
                    letterSpan.style.setProperty('--shake-x', `${shakeX}px`);
                    letterSpan.style.setProperty('--shake-y', `${shakeY}px`);
                    letterSpan.style.display = 'inline-block'; // Required for transform-based animation
                    letterSpan.style.animation = `shake ${shakeSpeed}s infinite`;
                    letterSpan.style.animationDelay = `-${animationDelay}s`;
                });
            } else if (params.shakeIntensity > 0) {
                // At high element counts (level 19+), apply shake only to the parent element instead of per-letter
                const shakeSpeed = 0.15 + (level - 10) * 0.03;
                el.style.animation = `shake ${shakeSpeed}s infinite`;
            }
            
            // Chromatic aberration now applied globally to body instead of per-element
        });
    } catch (error) {
        console.error('Error in updateNewElementsEffects:', error);
        showBSOD();
    }
}

// Apply global chromatic aberration effect to the chaos zone and scattered text container
function applyGlobalChromaticEffect(level) {
    try {
        const params = getChaosParams(level);
        
        const chromaFilter = params.chromaticIntensity > 0 ? (() => {
            // Simplified chromatic aberration - only 2 drop-shadows for better performance
            const chromaOffset = Math.min(4, params.chromaticIntensity * 1.5); // Cap offset at 4px
            const chromaOpacity = Math.min(0.5, params.chromaticIntensity * 0.15); // Reduce opacity
            return `
                drop-shadow(${chromaOffset}px 0 0 rgba(255, 0, 0, ${chromaOpacity}))
                drop-shadow(-${chromaOffset}px 0 0 rgba(0, 255, 255, ${chromaOpacity}))`;
        })() : null;
        
        // Apply to chaos zone
        if (chaosZone) {
            if (chromaFilter) {
                let currentFilter = chaosZone.style.filter || '';
                if (currentFilter.includes('url(#noise-filter)')) {
                    chaosZone.style.filter = `url(#noise-filter) ${chromaFilter}`;
                } else {
                    chaosZone.style.filter = chromaFilter;
                }
            } else {
                let currentFilter = chaosZone.style.filter || '';
                if (currentFilter.includes('url(#noise-filter)')) {
                    chaosZone.style.filter = 'url(#noise-filter)';
                } else {
                    chaosZone.style.filter = '';
                }
            }
        }
        
        // Apply to chaos container (scattered text)
        if (chaosContainer) {
            if (chromaFilter) {
                let currentFilter = chaosContainer.style.filter || '';
                if (currentFilter.includes('url(#noise-filter)')) {
                    chaosContainer.style.filter = `url(#noise-filter) ${chromaFilter}`;
                } else {
                    chaosContainer.style.filter = chromaFilter;
                }
            } else {
                let currentFilter = chaosContainer.style.filter || '';
                if (currentFilter.includes('url(#noise-filter)')) {
                    chaosContainer.style.filter = 'url(#noise-filter)';
                } else {
                    chaosContainer.style.filter = '';
                }
            }
        }
    } catch (error) {
        console.error('Error in applyGlobalChromaticEffect:', error);
        showBSOD();
    }
}

// Apply global noise effect to the chaos zone and scattered text container only
function applyGlobalNoiseEffect(level) {
    try {
        const noiseFilter = document.getElementById('noise-filter');
        if (!noiseFilter) return;
        
        const displacementMap = noiseFilter.querySelector('feDisplacementMap');
        if (!displacementMap) return;
        
        // Noise starts at level 17 and gradually increases
        if (level >= 17) {
            const noiseExponent = Math.min(12, level - 17); // Allow more noise intensity
            // Scale goes from 0 at level 17 to ~20 at level 29
            const noiseScale = Math.min(20, noiseExponent * 1.67);
            displacementMap.setAttribute('scale', noiseScale);
            
            // Apply to chaos zone
            if (chaosZone) {
                let currentFilter = chaosZone.style.filter || '';
                if (currentFilter && !currentFilter.includes('url(#noise-filter)')) {
                    chaosZone.style.filter = `url(#noise-filter) ${currentFilter}`;
                } else if (!currentFilter.includes('url(#noise-filter)')) {
                    chaosZone.style.filter = 'url(#noise-filter)';
                }
            }
            
            // Apply to chaos container (scattered text)
            if (chaosContainer) {
                let currentFilter = chaosContainer.style.filter || '';
                if (currentFilter && !currentFilter.includes('url(#noise-filter)')) {
                    chaosContainer.style.filter = `url(#noise-filter) ${currentFilter}`;
                } else if (!currentFilter.includes('url(#noise-filter)')) {
                    chaosContainer.style.filter = 'url(#noise-filter)';
                }
            }
        } else {
            displacementMap.setAttribute('scale', '0');
            
            // Remove noise effect but keep chromatic if active
            if (chaosZone) {
                let currentFilter = chaosZone.style.filter || '';
                if (currentFilter.includes('url(#noise-filter)')) {
                    const chromaFilter = currentFilter.replace('url(#noise-filter)', '').trim();
                    chaosZone.style.filter = chromaFilter || '';
                }
            }
            
            if (chaosContainer) {
                let currentFilter = chaosContainer.style.filter || '';
                if (currentFilter.includes('url(#noise-filter)')) {
                    const chromaFilter = currentFilter.replace('url(#noise-filter)', '').trim();
                    chaosContainer.style.filter = chromaFilter || '';
                }
            }
        }
    } catch (error) {
        console.error('Error in applyGlobalNoiseEffect:', error);
        // Don't trigger BSOD for filter issues, they're not critical
    }
}

// Batch update all existing elements' effects (called only when level changes significantly)
function updateAllElementsEffects(level) {
    try {
        const params = getChaosParams(level);
        
        // Use a more efficient batched update with requestAnimationFrame
        requestAnimationFrame(() => {
            allScatteredElements.forEach((el, elementIndex) => {
                const letterContainer = el.querySelector('span');
                if (!letterContainer) return;
                
                // Chromatic aberration now applied globally to body instead of per-element
            });
        });
    } catch (error) {
        console.error('Error in updateAllElementsEffects:', error);
        showBSOD();
    }
}

// Remove oldest elements to maintain performance
function pruneOldElements() {
    while (allScatteredElements.length > MAX_ELEMENTS) {
        const oldEl = allScatteredElements.shift();
        if (oldEl && oldEl.parentNode) {
            oldEl.remove();
        }
    }
}

// Apply visual breaking effects to individual grid items at level 5+
function applyGridBreaking(level) {
    try {
        if (!gridItems || gridItems.length === 0) return;
        
        // Calculate how many grid items should be affected (starts small, grows exponentially)
        // At level 15, all 25 squares should be affected: Math.pow(1.9, 5) ≈ 25
        let affectedCount = 0;
        if (level >= 10) {
            affectedCount = Math.ceil(Math.pow(1.9, level - 10));
        }
        affectedCount = Math.min(affectedCount, 25); // Cap at total number of grid items
        
        // Calculate distance from center for each item, then sort to get items closest to center first
        const itemsWithDistance = Array.from(gridItems).map((item, index) => {
            const row = Math.floor(index / 5);
            const col = index % 5;
            const distanceFromCenter = Math.abs(row - 2) + Math.abs(col - 2);
            return { item, index, distanceFromCenter };
        });
        
        // Sort by distance from center (closest first)
        itemsWithDistance.sort((a, b) => a.distanceFromCenter - b.distanceFromCenter);
        
        // Get the indices of affected items
        const affectedIndices = new Set(itemsWithDistance.slice(0, affectedCount).map(x => x.index));
        
        gridItems.forEach((item, index) => {
            if (!affectedIndices.has(index)) {
                // Remove breaking effects from unaffected items
                item.style.transform = '';
                return;
            }
            
            // Calculate breaking intensity (starts at 0 at level 10, increases exponentially)
            const breakingExponent = level - 10;
            
            // Vary the effect based on grid position for organic chaos
            const row = Math.floor(index / 5);
            const col = index % 5;
            const distanceFromCenter = Math.abs(row - 2) + Math.abs(col - 2);
            const positionVariation = 1 + (distanceFromCenter * 0.15); // Further from center = more effect
            
            // Calculate per-item breaking effects - more aggressive scaling
            const skewAmount = Math.min(35, breakingExponent * 6 * positionVariation * 0.8); // Faster skew
            const rotationAmount = Math.min(60, breakingExponent * 5 * positionVariation); // Faster rotation
            const scaleAmount = 1 - Math.min(0.5, breakingExponent * 0.08 * positionVariation); // Faster shrinking
            
            // Position displacement starts at level 10+ but accelerates faster
            let translateX = 0;
            let translateY = 0;
            
            if (level >= 10) {
                const moveExponent = level - 10;
                const maxDisplacementX = Math.min(80, moveExponent * 8); // Faster, further movement
                const maxDisplacementY = Math.min(80, moveExponent * 8); // Faster, further movement
                
                // Calculate seeded random displacement based on item index for consistency
                const seed = index * 12345 + moveExponent;
                const randomX = ((Math.sin(seed) * 10000) - Math.floor(Math.sin(seed) * 10000)) - 0.5;
                const randomY = ((Math.sin(seed + 0.5) * 10000) - Math.floor(Math.sin(seed + 0.5) * 10000)) - 0.5;
                
                translateX = randomX * maxDisplacementX * positionVariation;
                translateY = randomY * maxDisplacementY * positionVariation;
            }
            
            // Add random size variation starting at level 10+ - some squares grow, some shrink independently
            let finalScale = scaleAmount;
            if (level >= 10) {
                const sizeSeed = index * 54321 + (level - 10);
                const randomSizeMultiplier = ((Math.sin(sizeSeed) * 10000) - Math.floor(Math.sin(sizeSeed) * 10000)); // 0 to 1
                const randomSizeVariation = 0.6 + randomSizeMultiplier * 0.8; // Range from 0.6 to 1.4 (shrink to grow)
                finalScale = scaleAmount * randomSizeVariation;
            }
            
            // Apply breaking transforms to individual items only
            // Text is now in a separate layer and never transforms
            const randomRotZ = (Math.random() - 0.5) * skewAmount;
            item.style.transform = `
                translate(${translateX}px, ${translateY}px)
                perspective(800px)
                rotateX(${rotationAmount * 0.4}deg)
                rotateY(${rotationAmount * 0.3}deg)
                rotateZ(${randomRotZ}deg)
                skewY(${skewAmount * 0.5}deg)
                scale(${finalScale})
            `;
            
            item.style.transition = 'transform 0.15s ease-out';
        });
    } catch (error) {
        console.error('Error in applyGridBreaking:', error);
        showBSOD();
    }
}

// Generate chaos parameters based on click level with exponential scaling
function getChaosParams(level) {
    let copies = 1;
    let maxRotation = 0;
    let sizeVariation = 0;
    let letterSpacingVariation = 0;
    let weightVariation = 0; // Weight variation starts at level 7+
    let opacityVariation = 0.1;
    let opacity = 1; // Default to full opacity
    let minFontSize = 1.25; // 20pt minimum for clicks 1-6
    let shakeIntensity = 0; // Shake starts at level 12+
    
    if (level <= 0) {
        copies = 0;
    } else if (level === 1 || level === 2) {
        // Level 1-2: Subtle - single copy, no rotation
        copies = 1;
        maxRotation = 0;
        sizeVariation = 0.05;
        letterSpacingVariation = 0;
        weightVariation = 0; // No weight variation
        minFontSize = 1.25; // 20pt minimum
        opacity = 1; // 100% opacity
        shakeIntensity = 0; // No shake
    } else if (level >= 3 && level <= 4) {
        // Level 3-4: Moderate chaos, faster growth
        copies = 2 + Math.floor((level - 3) * 1.5); // Increased from 0.5 to 1.5
        maxRotation = (level - 3) * 8; // Introduce rotation earlier: 0 at 3, 8 at 4
        sizeVariation = 0.15 + (level - 3) * 0.2; // Increased from 0.1 + 0.1
        letterSpacingVariation = 2 + (level - 3) * 1.5; // Increased from 1 + 0.5
        weightVariation = 0; // No weight variation until level 7
        minFontSize = 1.25; // 20pt minimum
        opacity = 1; // 100% opacity
        shakeIntensity = 0; // No shake
    } else if (level === 5) {
        // Level 5: Rotation increases significantly
        copies = 4 + Math.floor((level - 3) * 1); // Increased from 2 + (level - 3) * 0.5
        maxRotation = 20; // Solid rotation
        sizeVariation = 0.35 + (level - 3) * 0.1;
        letterSpacingVariation = 5 + (level - 3) * 1; // Increased from 1 + (level - 3) * 0.5
        weightVariation = 0; // No weight variation until level 7
        minFontSize = 1.25; // 20pt minimum
        opacity = 1; // 100% opacity
        shakeIntensity = 0; // No shake
    } else if (level === 6) {
        // Level 6: Rapid escalation with rotation and size
        const exponent = level - 5;
        copies = Math.floor(2 * Math.pow(2.0, exponent)); // Increased from 1.8 to 2.0
        maxRotation = 35; // Increased from 20
        sizeVariation = 0.4 + exponent * 0.2; // Increased
        letterSpacingVariation = 6 + exponent * 3; // Increased from 3 + 2
        weightVariation = 100; // Start weight variation earlier
        minFontSize = 1.25; // 20pt minimum
        opacityVariation = 0.4 + exponent * 0.1;
        opacity = 0.7 + Math.random() * opacityVariation;
        shakeIntensity = 0; // No shake
    } else if (level >= 7 && level <= 9) {
        // Level 7-9: Full exponential chaos with all effects
        const exponent = level - 5;
        copies = Math.floor(Math.min(180, 2 * Math.pow(1.7, exponent))); // Increased cap for more intense effects
        maxRotation = 35 + (level - 6) * 18; // Increased from 20 + (level - 6) * 15: 53 at 7, 71 at 8, 89 at 9
        sizeVariation = 0.4 + exponent * 0.15;
        letterSpacingVariation = 6 + exponent * 2.5; // Increased from 3 + 2
        weightVariation = 200 + (level - 7) * 150; // Increased multiplier
        minFontSize = 0.8; // Allow smaller text at high chaos levels
        opacityVariation = 0.4 + exponent * 0.1;
        opacity = 0.7 + Math.random() * opacityVariation;
        shakeIntensity = 0; // No shake until level 10
    } else if (level >= 10 && level <= 11) {
        // Level 10-11: Shake begins, rotation continues to increase
        const exponent = level - 5;
        copies = Math.floor(Math.min(220, 2 * Math.pow(1.6, exponent))); // Increased cap for more intense effects
        maxRotation = 65 + (level - 9) * 20; // 85 at 10, 105 at 11
        sizeVariation = 0.3 + exponent * 0.15;
        letterSpacingVariation = 3 + exponent * 2;
        weightVariation = 200 + (level - 7) * 100;
        minFontSize = 0.8;
        opacityVariation = 0.4 + exponent * 0.1;
        opacity = 0.7 + Math.random() * opacityVariation;
        shakeIntensity = 1 + (level - 10) * 0.5; // Light shake starting at 10
    } else if (level >= 12 && level <= 20) {
        // Level 12-20: Shake + chromatic aberration, controlled growth
        const exponent = level - 5;
        copies = Math.floor(Math.min(260, 2 * Math.pow(1.4, exponent))); // Increased cap for more intense effects
        maxRotation = 105 + (level - 11) * 25; // Continues exponential increase
        sizeVariation = 0.3 + exponent * 0.15;
        letterSpacingVariation = 3 + exponent * 2;
        weightVariation = 200 + (level - 7) * 100;
        minFontSize = 0.8;
        opacityVariation = 0.4 + exponent * 0.1;
        opacity = 0.7 + Math.random() * opacityVariation;
        shakeIntensity = 2 + (level - 10) * 0.5; // Continues increasing
    } else {
        // Level 21+: Performance plateau - copies stay constant
        // Other effects continue but item duplication is capped
        const exponent = level - 5;
        copies = 260; // Plateau at this value
        maxRotation = 105 + (level - 11) * 25; // Continues exponential increase
        sizeVariation = 0.3 + exponent * 0.15;
        letterSpacingVariation = 3 + exponent * 2;
        weightVariation = 200 + (level - 7) * 100;
        minFontSize = 0.8;
        opacityVariation = 0.4 + exponent * 0.1;
        opacity = 0.7 + Math.random() * opacityVariation;
        shakeIntensity = 2 + (level - 10) * 0.5; // Continues increasing
    }
    
    // Calculate chromatic aberration (starts at level 15 - performance optimization)
    let chromaticIntensity = 0;
    if (level >= 15) {
        // Allows more intensity while maintaining performance
        const chromaExponent = Math.min(12, level - 15); // Allow more levels of intensity
        chromaticIntensity = 0.25 * Math.pow(1.35, chromaExponent);
    }
    
    return {
        copies,
        maxRotation,
        sizeVariation,
        letterSpacingVariation,
        weightVariation,
        opacityVariation,
        opacity,
        minFontSize,
        shakeIntensity,
        chromaticIntensity
    };
}

function createScatteredText(text, level) {
    try {
        const elements = [];
        const params = getChaosParams(level);
        
        // Check if we've reached the breaking point
        if (allScatteredElements.length >= BREAKING_POINT) {
            showBSOD();
            return [];
        }
        
        for (let i = 0; i < params.copies; i++) {
            const el = document.createElement('div');
        
        // Random position across viewport
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        
        // Generate chaos values with seeding for organic variation
        // Each copy gets its own variation of the parameters
        const seed = level * 1000 + i;
        const randomFactor = Math.random();
        
        // Vary the effect parameters per element - add ±20% variation to max values
        const effectVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
        const effectiveMaxRotation = params.maxRotation * effectVariation;
        const effectiveSizeVariation = params.sizeVariation * effectVariation;
        const effectiveLetterSpacingVariation = params.letterSpacingVariation * effectVariation;
        const effectiveWeightVariation = params.weightVariation * effectVariation;
        
        // Exponentially scaled random values - now using effect-varied parameters
        const rotation = (randomFactor - 0.5) * effectiveMaxRotation;
        const scale = 1 + (Math.random() - 0.5) * effectiveSizeVariation * 2;
        const opacity = level <= 5 ? 1 : params.opacity; // 100% opacity for clicks 1-5
        const baseFontSize = 1.2 + (Math.random() - 0.5) * effectiveSizeVariation;
        const fontSize = Math.max(params.minFontSize, baseFontSize); // Ensure minimum font size
        const letterSpacing = 2 + (Math.random() - 0.5) * effectiveLetterSpacingVariation;
        
        // Note: Shake and chromatic aberration effects are applied by updateNewElementsEffects
        // after element creation for better performance (avoid redundant cssText generation)
        
        // Create individual letters with varying weights
        const letterContainer = document.createElement('span');
        letterContainer.style.display = 'inline';
        
        for (let charIndex = 0; charIndex < text.length; charIndex++) {
            const letterSpan = document.createElement('span');
            letterSpan.textContent = text[charIndex];
            
            // Vary weight for each letter - using effect-varied parameter
            let weight = 400; // Default
            if (effectiveWeightVariation > 0) {
                weight = Math.max(100, Math.min(900, 400 + (Math.random() - 0.5) * effectiveWeightVariation));
                weight = Math.round(weight / 100) * 100; // Round to nearest 100
            }
            
            letterSpan.style.cssText = `
                font-weight: ${weight};
                display: inline-block;
            `;
            
            letterContainer.appendChild(letterSpan);
        }
        
        letterContainer.style.display = 'inline';
        el.appendChild(letterContainer);
        
        // Apply class and dynamic styles
        el.className = 'scattered-text';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.fontSize = `${fontSize}rem`;
        el.style.letterSpacing = `${letterSpacing}px`;
        el.style.setProperty('--translate-x', '-50%');
        el.style.setProperty('--translate-y', '-50%');
        el.style.setProperty('--rotation', `${rotation}deg`);
        el.style.setProperty('--scale', `${scale}`);
        el.style.transform = 'translate(var(--translate-x), var(--translate-y)) rotate(var(--rotation)) scale(var(--scale))';
        el.style.opacity = `${Math.max(0.1, opacity)}`;
        
        chaosContainer.appendChild(el);
        elements.push(el);
        allScatteredElements.push(el); // Track all elements globally
    }
    
    // Prune old elements aggressively if we're near the cap
    if (allScatteredElements.length > MAX_ELEMENTS * 0.8) {
        // Remove 20% of oldest elements to make room
        const toRemove = Math.ceil(allScatteredElements.length * 0.2);
        for (let i = 0; i < toRemove; i++) {
            const oldEl = allScatteredElements.shift();
            if (oldEl && oldEl.parentNode) {
                oldEl.remove();
            }
        }
    }
    
    // Apply effects to newly created elements only
    if (level >= 10) {
        updateNewElementsEffects(elements, level);
    }
    
    return elements;
    } catch (error) {
        console.error('Critical error in createScatteredText:', error);
        showBSOD();
        return [];
    }
}

// Click handler for both desktop and mobile
gridItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Per-item debounce to prevent lag while allowing other items to be clicked
        if (itemClickInProgress.get(item)) return;
        itemClickInProgress.set(item, true);
        setTimeout(() => { itemClickInProgress.set(item, false); }, 50);
        
        // Get current chaos level
        let currentLevel = chaosLevels.get(item);
        
        // Increment to next level (unlimited)
        currentLevel += 1;
        
        // Get text content from stored text
        const text = itemTexts.get(item);
        
        // Create scattered text with exponential chaos
        const newElements = createScatteredText(text, currentLevel);
        chaosElements.get(item).push(...newElements);
        
        // Store new level
        chaosLevels.set(item, currentLevel);
        
        // Update global max level and apply effects
        if (currentLevel >= 10) {
            const wasLower = currentMaxLevel < 15;
            const crossedThreshold = Math.floor(currentMaxLevel / 3) !== Math.floor(currentLevel / 3); // Every 3 levels instead of 2
            
            currentMaxLevel = Math.max(currentMaxLevel, currentLevel);
            
            // Update chromatic effects on major thresholds
            if (currentMaxLevel >= 15) {
                applyGlobalChromaticEffect(currentMaxLevel);
            }
            
            // Update noise effects starting at level 17
            if (currentMaxLevel >= 17) {
                applyGlobalNoiseEffect(currentMaxLevel);
            }
        } else {
            currentMaxLevel = Math.max(currentMaxLevel, currentLevel);
            
            // Update noise effects if we've reached level 17
            if (currentLevel >= 17) {
                applyGlobalNoiseEffect(currentLevel);
            }
        }
        
        // Apply grid breaking effects at level 10+
        if (currentMaxLevel >= 10) {
            applyGridBreaking(currentMaxLevel);
        }
    });
});

// Cleanup button handler
cleanupBtn.addEventListener('click', () => {
    gridItems.forEach(item => {
        // Remove all scattered elements for this item
        chaosElements.get(item).forEach(el => el.remove());
        chaosElements.set(item, []);
        
        // Reset level
        chaosLevels.set(item, 0);
        
        // Reset grid item transforms
        item.style.transform = '';
    });
    
    // Clear all scattered elements completely
    allScatteredElements.forEach(el => {
        if (el.parentNode) {
            el.remove();
        }
    });
    allScatteredElements = [];
    
    // Clear the chaos container of any orphaned elements
    while (chaosContainer.firstChild) {
        chaosContainer.removeChild(chaosContainer.firstChild);
    }
    
    // Reset global max level
    currentMaxLevel = 0;
    
    // Reset chromatic and noise effects
    document.body.style.filter = '';
    const noiseFilter = document.getElementById('noise-filter');
    if (noiseFilter) {
        const displacementMap = noiseFilter.querySelector('feDisplacementMap');
        if (displacementMap) {
            displacementMap.setAttribute('scale', '0');
        }
    }
    
    // Reset grid breaking effects
    applyGridBreaking(0);
});
