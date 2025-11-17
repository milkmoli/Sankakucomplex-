// ==UserScript==
// @name         Sankaku 页面清理脚本
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  删除 Sankaku 页面中的特定元素
// @author       You
// @match        https://chan.sankakucomplex.com/*
// @match        https://chan.sankakucomplex.com/cn/*
// @icon         https://github.com/milkmoli/Sankakucomplex-tags-dictionary/blob/main/img/icon.png?raw=true
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 等待页面加载完成
    window.addEventListener('load', function() {
        removeAllElements();
    });

    // 同时使用 DOMContentLoaded 作为备选方案
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(removeAllElements, 1000);
    });

    // 主要的清理函数
    function removeAllElements() {
        const selectors = [
            '.carousel.topbar-carousel',
            '.carousel.companion-carousel',
            '.carousel.news-carousel',
            '.carousel.ai-carousel',
            '.iframe_column',
            '.exo-native-widget-outer-container',
            '.companion--draggable_element',
            '#draggableElement',
            '.carousel.premium-carousel'
        ];

        // 删除常规选择器元素
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element && element.parentNode) {
                    element.remove();
                    console.log(`已删除 ${selector} 元素`);
                }
            });
        });

        // 删除特定的广告 <ins> 元素
        const adInsElements = document.querySelectorAll('ins[data-revive-zoneid]');
        adInsElements.forEach(element => {
            if (element && element.parentNode) {
                element.remove();
                console.log('已删除广告 ins 元素');
            }
        });

        // 删除特定的广告 iframe 元素
        const adIframes = document.querySelectorAll('iframe[data-revive-id]');
        adIframes.forEach(element => {
            if (element && element.parentNode) {
                element.remove();
                console.log('已删除广告 iframe 元素');
            }
        });
    }

    // 每2秒检查一次，确保动态加载的内容也被清理
    setInterval(removeAllElements, 2000);

    // 使用 MutationObserver 监听 DOM 变化，实时删除新出现的广告元素
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                removeAllElements();
            }
        });
    });

    // 开始观察 DOM 变化
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();