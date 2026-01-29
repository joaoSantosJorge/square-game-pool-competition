// Footer Manager - Shared footer across all pages
// Injects a consistent footer with creator attribution

const FooterManager = (function() {
    'use strict';

    const CREATOR_HANDLE = '@joaosantosjorge';
    const CREATOR_URL = 'https://x.com/joaosantosjorge';

    function createFooterHTML() {
        return `
            <footer class="site-footer">
                <p class="footer-tagline">
                    Built on Base &bull; Powered by Smart Contracts &bull; Provably Fair
                </p>
                <p class="footer-creator">
                    Created by <a href="${CREATOR_URL}" target="_blank" rel="noopener noreferrer" class="creator-link">${CREATOR_HANDLE}</a>
                </p>
            </footer>
        `;
    }

    function injectFooter() {
        // Find the main container to append footer
        // Look for common container patterns used across pages
        const containers = [
            '.welcome-container',
            '.game-page-container',
            '.profile-container',
            '.rules-container',
            '.archive-container',
            '.admin-container'
        ];

        let targetContainer = null;
        for (const selector of containers) {
            targetContainer = document.querySelector(selector);
            if (targetContainer) break;
        }

        // Fallback to body if no container found
        if (!targetContainer) {
            targetContainer = document.body;
        }

        // Remove any existing inline footer (from index.html)
        const existingInlineFooter = targetContainer.querySelector('div[style*="border-top"]');
        if (existingInlineFooter && existingInlineFooter.textContent.includes('Built on Base')) {
            existingInlineFooter.remove();
        }

        // Check if footer already exists
        if (document.querySelector('.site-footer')) {
            return;
        }

        // Insert footer HTML
        targetContainer.insertAdjacentHTML('beforeend', createFooterHTML());
    }

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectFooter);
        } else {
            injectFooter();
        }
    }

    // Auto-initialize
    init();

    return {
        init: init,
        injectFooter: injectFooter
    };
})();
