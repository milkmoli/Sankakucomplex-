// ==UserScript==
// @name         Sankaku Complex 标签翻译器
// @namespace    http://tampermonkey.net/
// @version      1.5.0
// @description  翻译Sankaku Complex网站的标签，支持可视化控制和自定义高亮,也支持Gelbooru和Danbooru等站点
// @author       milkmoli
// @icon         https://github.com/milkmoli/Sankakucomplex-tags-dictionary/blob/main/img/icon.png?raw=true
// @match        https://chan.sankakucomplex.com/*
// @match        https://gelbooru.com/*
// @match        https://danbooru.donmai.us/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @connect      gitee.com
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // 默认标签翻译词典
    const defaultTagDictionary = {
        "example": "举例",
    };

    const availableTagTypes = [
        { en: 'artist', cn: '艺术家' },
        { en: 'copyright', cn: '版权' },
        { en: 'character', cn: '角色' },
        { en: 'studio', cn: '工作室' },
        { en: 'general', cn: '通用' },
        { en: 'genre', cn: '流派' },
        { en: 'fashion', cn: '时尚' },
        { en: 'anatomy', cn: '解剖学' },
        { en: 'pose', cn: '姿势' },
        { en: 'event', cn: '活动' },
        { en: 'role', cn: '身份' },
        { en: 'flora', cn: '植物' },
        { en: 'object', cn: '物体' },
        { en: 'environment', cn: '环境' },
        { en: 'medium', cn: '媒介' },
        { en: 'meta', cn: '元标签' },
        { en: 'auto', cn: '自动' },
    ];

    // 创建英文到中文的映射
    const tagTypeMap = {};
    availableTagTypes.forEach(type => {
        tagTypeMap[type.en] = type.cn;
    });

    // 配置管理
    const config = {
        enableHighlight: GM_getValue('enableHighlight', true),
        enableTranslation: GM_getValue('enableTranslation', true),
        darkMode: GM_getValue('darkMode', false),
        excludedTagTypes: GM_getValue('excludedTagTypes', ['none', 'operator']),//none,operator始终排除
        dictionaryUrl: GM_getValue('dictionaryUrl', 'https://raw.githubusercontent.com/milkmoli/Sankakucomplex-/refs/heads/main/sankakucomplex_chan.csv')
    };

    // 添加样式
    GM_addStyle(`
    /* 高亮未翻译标签样式 */
    .tag-translation-highlight {
        background-color: #fff3cd !important;
        padding: 0px 1px !important;
        border-radius: 2px !important;
        border: 1px solid #ffeeba !important;
    }

    /* 暗色模式样式 */
    .tag-translation-menu.dark-mode {
        background: #2d3748 !important;
        border-color: #4a5568 !important;
        color: #e2e8f0 !important;
    }

    /* 暗色模式下的各个元素样式调整 */
    .tag-translation-menu.dark-mode h3 {
        color: #f6ad55 !important;
        border-bottom-color: #4a5568 !important;
    }

    .tag-translation-menu.dark-mode .tag-translation-control label {
        color: #cbd5e0 !important;
    }

    .tag-translation-menu.dark-mode .tag-translation-url-input {
        background: #4a5568 !important;
        border-color: #718096 !important;
        color: #e2e8f0 !important;
    }

    .tag-translation-menu.dark-mode .tag-translation-url-input:focus {
        border-color: #f6ad55 !important;
        box-shadow: 0 0 0 2px rgba(246, 173, 85, 0.2) !important;
    }

    .tag-translation-menu.dark-mode .tag-translation-stats {
        border-top-color: #4a5568 !important;
        color: #cbd5e0 !important;
    }

    .tag-translation-menu.dark-mode .tag-translation-close {
        color: #a0aec0 !important;
    }

    .tag-translation-menu.dark-mode .tag-translation-close:hover {
        color: #f6ad55 !important;
        background-color: #4a5568 !important;
    }

    .tag-translation-menu.dark-mode .tag-translation-toggle input:checked + .tag-translation-slider {
        background-color: #f6ad55 !important;
    }

    .tag-translation-menu.dark-mode .tag-translation-url-button {
        background: #f6ad55 !important;
        color: #2d3748 !important;
    }

    .tag-translation-menu.dark-mode .tag-translation-url-button:hover {
        background: #ed8936 !important;
    }

    /* 二级菜单样式 */
    .tag-translation-submenu {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
        margin-top: 5px;
    }

    /* 展开状态 */
    .tag-translation-submenu.expanded {
        max-height: 200px;
        overflow-y: auto;
    }

    /* 子菜单内容样式 */
    .tag-translation-submenu-content {
        background: #f8f9fa;
        border-radius: 4px;
        padding: 8px;
        margin-top: 5px;
        border: 1px solid #e9ecef;
    }

    /* 暗色模式下的子菜单样式 */
    .tag-translation-menu.dark-mode .tag-translation-submenu-content {
        background: #4a5568 !important;
        border-color: #718096 !important;
    }

    /* 复选框组样式 */
    .tag-translation-checkbox-group {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 5px;
        font-size: 11px;
    }

    /* 复选框项样式 */
    .tag-translation-checkbox-item {
        display: flex;
        align-items: center;
    }

    /* 复选框输入框样式 */
    .tag-translation-checkbox-item input {
        margin-right: 4px;
    }

    /* 暗色模式下的复选框标签样式 */
    .tag-translation-menu.dark-mode .tag-translation-checkbox-item label {
        color: #e2e8f0 !important;
    }

    /* 新增：排除标签类型按钮样式 */
    .tag-translation-toggle-button {
        background: none;
        border: none;
        color: #666;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 2px 0;
    }

    /* 暗色模式下的排除标签类型按钮样式 */
    .tag-translation-menu.dark-mode .tag-translation-toggle-button {
        color: #cbd5e0 !important;
    }

    /* 排除标签类型按钮悬停样式 */
    .tag-translation-toggle-button:hover {
        color: #FF761C;
        background-color: #f0f0f0; /* 添加与关闭按钮相同的背景色 */
        border-radius: 3px; /* 添加圆角使其更美观 */
    }

    /* 暗色模式下的排除标签类型按钮悬停样式 */
    .tag-translation-menu.dark-mode .tag-translation-toggle-button:hover {
        color: #f6ad55 !important;
        background-color: #4a5568 !important; /* 暗色模式下的背景色 */
    }

    /* 复选框标签样式 - 与启用翻译等控制项相同 */
    .tag-translation-checkbox-item label {
    color: #666666 !important; /* 与启用翻译等控制项相同的颜色 */
    font-weight: 500; /* 相同的字重 */
    cursor: pointer;
    }

    /* 新增：排除标签类型按钮图标旋转效果 */        
    .tag-translation-toggle-icon {
        margin-left: 4px;
        transition: transform 0.3s ease;
    }
    
    .tag-translation-toggle-button.expanded .tag-translation-toggle-icon {
        transform: rotate(180deg);
    }

    /* 修改：拖动区域样式 - 与最小化按钮区域相同大小 */
    .tag-translation-drag-handle {
        cursor: move;
        user-select: none;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 36px; /* 与最小化按钮区域相同高度 */
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        transition: background 0.2s ease;
        border-radius: 6px 6px 0 0;
        z-index: 1;
    }
    
    .tag-translation-drag-handle:hover {
        background: rgba(255, 118, 28, 0.1);
    }
    
    .tag-translation-menu.dark-mode .tag-translation-drag-handle:hover {
        background: rgba(246, 173, 85, 0.1);
    }
    
    .tag-translation-drag-handle::after {
        content: "";
        display: block;
        width: 24px; /* 与最小化按钮相同宽度 */
        height: 24px; /* 与最小化按钮相同高度 */
        background: transparent;
        border-radius: 3px;
    }
    
    /* 修改：调整关闭按钮的z-index，确保在拖动区域之上 */
    .tag-translation-close {
        position: absolute;
        top: 6px; /* 调整位置，确保在拖动区域内居中 */
        right: 8px;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #999;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001; /* 确保在拖动区域之上 */
        border-radius: 3px;
        transition: all .3s ease;
        user-select: none;
    }
    
    .tag-translation-close:hover {
        color: #FF761C;
        background-color: #f0f0f0;
    }
    
    .tag-translation-menu.dark-mode .tag-translation-close:hover {
        color: #f6ad55 !important;
        background-color: #4a5568 !important;
    }

    /* 原有的其他样式保持不变 */
    .tag-translation-menu {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 2px solid #FF761C;
        border-radius: 8px;
        padding: 10px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        font-family: Arial, sans-serif;
        transition: all 0.3s ease;
        height: auto;
        width: 250px;
        max-width: calc(100vw - 40px);
        overflow: hidden;
    }
    
    .tag-translation-menu.minimized {
        top: 20px;
        right: 20px;
        height: 36px;
        width: 270px;
        max-width: calc(100vw - 40px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
    }
    
    .tag-translation-menu.minimized > *:not(.tag-translation-close) {
        display: none;
    }
    
    .tag-translation-menu h3 {
        margin: 0 0 10px 0;
        padding: 0;
        font-size: 14px;
        color: #FF761C;
        border-bottom: 1px solid #eee;
        padding-bottom: 5px;
        cursor: move;
        user-select: none; /* 禁止文本选中，提升拖动体验 */
    }
    .tag-translation-control {
        margin: 8px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .tag-translation-control label {
        font-size: 12px;
        cursor: pointer;
        color: #666666;
        font-weight: 500; /* 增加字重，提升可读性 */
    }
    .tag-translation-toggle {
        position: relative;
        display: inline-block;
        width: 40px;
        height: 20px;
    }
    .tag-translation-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    .tag-translation-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: .4s;
        border-radius: 20px;
    }
    .tag-translation-slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2); /* 增加阴影，提升立体感 */
    }
    .tag-translation-toggle input:checked + .tag-translation-slider {
        background-color: #FF761C;
    }
    .tag-translation-toggle input:checked + .tag-translation-slider:before {
        transform: translateX(20px);
    }
    .tag-translation-stats {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #eee;
        font-size: 11px;
        color: #666;
        line-height: 1.4; /* 增加行高，提升可读性 */
    }
    .tag-translation-url-input {
        width: 100%;
        font-size: 11px;
        padding: 4px;
        margin: 5px 0;
        border: 1px solid #ddd;
        border-radius: 3px;
        box-sizing: border-box; /* 确保宽度包含内边距，避免溢出 */
        outline: none; /* 清除默认外边框 */
    }
    .tag-translation-url-input:focus {
        border-color: #FF761C; /* 聚焦时高亮边框，提升交互反馈 */
        box-shadow: 0 0 0 2px rgba(255, 118, 28, 0.2);
    }
    .tag-translation-url-button {
        width: 100%;
        font-size: 11px;
        padding: 4px;
        margin: 2px 0;
        background: #FF761C;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        transition: background .3s ease; /* 按钮hover过渡，提升流畅度 */
    }
    .tag-translation-url-button:hover {
        background: #e56515;
    }
    .tag-translation-loading {
        color: #FF761C;
        font-size: 11px;
        margin: 5px 0;
    }
    .tag-translation-error {
        color: #dc3545; /* 标准错误色，提升辨识度 */
        font-size: 11px;
        margin: 5px 0;
    }
    .tag-translation-success {
        color: #28a745; /* 标准成功色，提升辨识度 */
        font-size: 11px;
        margin: 5px 0;
    }
    .tag-translation-close {
        position: absolute;
        top: 5px;
        right: 8px;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #999;
        width: 24px; /* 调整宽度，避免按钮过大 */
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        border-radius: 3px;
        transition: all .3s ease; /* 按钮状态过渡，提升交互感 */
        user-select: none; /* 禁止文本选中 */
    }
    .tag-translation-close:hover {
        color: #FF761C;
        background-color: #f0f0f0;
    }
    /* 拖动状态优化：增加鼠标反馈和阴影强度 */
    .tag-translation-menu.dragging {
        opacity: 0.8;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        cursor: grabbing; /* 拖动时显示"抓取"光标，明确交互状态 */
    }
    /* 修复菜单恢复时的元素显示过渡 */
    .tag-translation-menu:not(.minimized) h3,
    .tag-translation-menu:not(.minimized) .tag-translation-control,
    .tag-translation-menu:not(.minimized) .tag-translation-url-input,
    .tag-translation-menu:not(.minimized) .tag-translation-url-button,
    .tag-translation-menu:not(.minimized) #dictionary-status,
    .tag-translation-menu:not(.minimized) .tag-translation-stats {
        display: block;
        animation: fadeIn 0.3s ease; /* 恢复时添加淡入动画，避免视觉跳跃 */
    }
    .tag-translation-menu:not(.minimized) .tag-translation-control {
        display: flex; /* 控制项保持flex布局 */
    }
    /* 淡入动画关键帧 */
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
    `);

    class TagTranslator {
        constructor() {
            this.translatedCount = 0;
            this.untranslatedCount = 0;
            this.originalTexts = new Map();
            this.tagDictionary = { ...defaultTagDictionary };
            this.init();
        }

        async init() {
            await this.loadExternalDictionary();
            this.createControlMenu();
            this.translateTags();
            this.setupObservers();
        }

        // 加载外部CSV词典（保持不变）
        async loadExternalDictionary() {
            try {
                console.log('正在加载外部词典:', config.dictionaryUrl);

                return new Promise((resolve) => {
                    GM_xmlhttpRequest({
                        method: "GET",
                        url: config.dictionaryUrl,
                        timeout: 10000,
                        onload: (response) => {
                            if (response.status === 200) {
                                this.parseCSVDictionary(response.responseText);
                                console.log('外部词典加载成功，词条数:', Object.keys(this.tagDictionary).length);
                                resolve(true);
                            } else {
                                console.warn('外部词典加载失败，使用默认词典');
                                resolve(false);
                            }
                        },
                        onerror: () => {
                            console.warn('外部词典加载错误，使用默认词典');
                            resolve(false);
                        },
                        ontimeout: () => {
                            console.warn('外部词典加载超时，使用默认词典');
                            resolve(false);
                        }
                    });
                });
            } catch (error) {
                console.warn('加载外部词典时出错:', error);
                return false;
            }
        }

        // 解析CSV格式的词典（保持不变）
        parseCSVDictionary(csvText) {
            const newDictionary = { ...defaultTagDictionary };

            const lines = csvText.split('\n');
            lines.forEach((line, index) => {
                line = line.trim();
                if (line && !line.startsWith('#')) {
                    const parts = line.split(',');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const value = parts[1].trim();
                        if (key && value) {
                            newDictionary[key] = value;
                        }
                    }
                }
            });

            this.tagDictionary = newDictionary;
        }

        // 更新词典URL
        async updateDictionaryUrl(newUrl) {
            config.dictionaryUrl = newUrl;
            GM_setValue('dictionaryUrl', newUrl);

            const success = await this.loadExternalDictionary();
            if (success) {
                this.translateTags();
                return true;
            }
            return false;
        }

        // 新增：获取标签的标准化键名（处理空格和下划线）
        getNormalizedTagKey(tagText) {
            // 首先尝试直接匹配
            if (this.tagDictionary[tagText]) {
                return tagText;
            }
            
            // 尝试将空格替换为下划线
            const underscoreKey = tagText.replace(/ /g, '_');
            if (this.tagDictionary[underscoreKey]) {
                return underscoreKey;
            }
            
            // 尝试将下划线替换为空格
            const spaceKey = tagText.replace(/_/g, ' ');
            if (this.tagDictionary[spaceKey]) {
                return spaceKey;
            }
            
            return null;
        }

        createControlMenu() {
            const existingMenu = document.getElementById('tag-translation-menu');
            if (existingMenu) {
                existingMenu.remove();
            }

            const menu = document.createElement('div');
            menu.id = 'tag-translation-menu';
            if (config.darkMode) {
                menu.className = 'tag-translation-menu dark-mode minimized';
            } else {
                menu.className = 'tag-translation-menu minimized';
            }
            
            menu.innerHTML = `
                <div class="tag-translation-drag-handle" style="display: none;"></div>
                <button class="tag-translation-close" title="恢复">+</button>
                <h3 style="display: none;">标签翻译设置</h3>
                <div class="tag-translation-control" style="display: none;">
                    <label for="translation-toggle">启用翻译</label>
                    <label class="tag-translation-toggle">
                        <input type="checkbox" id="translation-toggle" ${config.enableTranslation ? 'checked' : ''}>
                        <span class="tag-translation-slider"></span>
                    </label>
                </div>
                <div class="tag-translation-control" style="display: none;">
                    <label for="highlight-toggle">启用高亮</label>
                    <label class="tag-translation-toggle">
                        <input type="checkbox" id="highlight-toggle" ${config.enableHighlight ? 'checked' : ''}>
                        <span class="tag-translation-slider"></span>
                    </label>
                </div>
                <div class="tag-translation-control" style="display: none;">
                    <label for="dark-mode-toggle">暗色模式</label>
                    <label class="tag-translation-toggle">
                        <input type="checkbox" id="dark-mode-toggle" ${config.darkMode ? 'checked' : ''}>
                        <span class="tag-translation-slider"></span>
                    </label>
                </div>
                <div class="tag-translation-control" style="display: none;">
                    <button class="tag-translation-toggle-button" id="excluded-tags-toggle">
                        排除标签类型 <span class="tag-translation-toggle-icon">▼</span>
                    </button>
                </div>
                <div class="tag-translation-submenu" id="excluded-tags-submenu" style="display: none;">
                    <div class="tag-translation-submenu-content">
                        <div class="tag-translation-checkbox-group" id="excluded-tags-checkboxes">
                            ${availableTagTypes.map(type => `
                                <div class="tag-translation-checkbox-item">
                                    <input type="checkbox" id="exclude-${type.en}" ${config.excludedTagTypes.includes(type.en) ? 'checked' : ''}>
                                    <label for="exclude-${type.en}">${type.cn}</label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="tag-translation-control" style="display: none;">
                    <label>词典URL:</label>
                </div>
                <input type="text" class="tag-translation-url-input" id="dictionary-url" value="${config.dictionaryUrl}" placeholder="输入CSV文件URL" style="display: none;">
                <button class="tag-translation-url-button" id="update-dictionary" style="display: none;">更新词典</button>
                <div id="dictionary-status" style="display: none;"></div>
                <div class="tag-translation-stats" style="display: none;">
                    已翻译: <span id="translated-count">0</span><br>
                    未翻译: <span id="untranslated-count">0</span><br>
                    词典词条: <span id="dictionary-count">${Object.keys(this.tagDictionary).length}</span>
                </div>
            `;

            document.body.appendChild(menu);

            const closeButton = menu.querySelector('.tag-translation-close');
            closeButton.title = '恢复';
            closeButton.textContent = '+';

            // 事件监听器
            document.getElementById('translation-toggle').addEventListener('change', (e) => {
                config.enableTranslation = e.target.checked;
                GM_setValue('enableTranslation', e.target.checked);

                if (config.enableTranslation) {
                    this.translateTags();
                } else {
                    this.restoreOriginalTags();
                    this.updateStats();
                }
            });

            document.getElementById('highlight-toggle').addEventListener('change', (e) => {
                config.enableHighlight = e.target.checked;
                GM_setValue('enableHighlight', e.target.checked);
                this.updateHighlightOnly();
            });

            // 暗色模式切换
            document.getElementById('dark-mode-toggle').addEventListener('change', (e) => {
                config.darkMode = e.target.checked;
                GM_setValue('darkMode', e.target.checked);
                
                if (config.darkMode) {
                    menu.classList.add('dark-mode');
                } else {
                    menu.classList.remove('dark-mode');
                }
            });

            // 排除标签类型二级菜单
            const excludedTagsToggle = document.getElementById('excluded-tags-toggle');
            const excludedTagsSubmenu = document.getElementById('excluded-tags-submenu');
            
            excludedTagsToggle.addEventListener('click', () => {
                const isExpanded = excludedTagsSubmenu.classList.contains('expanded');
                
                if (isExpanded) {
                    excludedTagsSubmenu.classList.remove('expanded');
                    excludedTagsToggle.classList.remove('expanded');
                } else {
                    excludedTagsSubmenu.classList.add('expanded');
                    excludedTagsToggle.classList.add('expanded');
                }
            });

            // 修改：排除标签类型复选框事件 - 使用英文标识
            availableTagTypes.forEach(type => {
                const checkbox = document.getElementById(`exclude-${type.en}`);
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        if (!config.excludedTagTypes.includes(type.en)) {
                            config.excludedTagTypes.push(type.en);
                        }
                    } else {
                        const index = config.excludedTagTypes.indexOf(type.en);
                        if (index > -1) {
                            config.excludedTagTypes.splice(index, 1);
                        }
                    }
                    GM_setValue('excludedTagTypes', config.excludedTagTypes);
                    this.handleExcludedTagsChange();
                });
            });

            // 更新词典按钮
            document.getElementById('update-dictionary').addEventListener('click', async () => {
                const newUrl = document.getElementById('dictionary-url').value.trim();
                const statusElement = document.getElementById('dictionary-status');

                if (!newUrl) {
                    statusElement.innerHTML = '<div class="tag-translation-error">请输入有效的URL</div>';
                    return;
                }

                statusElement.innerHTML = '<div class="tag-translation-loading">正在加载词典...</div>';

                const success = await this.updateDictionaryUrl(newUrl);
                if (success) {
                    statusElement.innerHTML = '<div class="tag-translation-success">词典更新成功!</div>';
                    document.getElementById('dictionary-count').textContent = Object.keys(this.tagDictionary).length;
                } else {
                    statusElement.innerHTML = '<div class="tag-translation-error">词典加载失败，使用默认词典</div>';
                }

                setTimeout(() => {
                    statusElement.innerHTML = '';
                }, 3000);
            });

            // 最小化/恢复按钮
            closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (menu.classList.contains('minimized')) {
                    menu.classList.remove('minimized');
                    menu.querySelectorAll('.tag-translation-drag-handle, h3, .tag-translation-control, .tag-translation-url-input, .tag-translation-url-button, #dictionary-status, .tag-translation-stats, .tag-translation-submenu').forEach(el => {
                        el.style.display = el.classList.contains('tag-translation-drag-handle') ? 'block' :
                                          el.tagName === 'H3' ? 'block' :
                                          el.classList.contains('tag-translation-control') ? 'flex' :
                                          el.classList.contains('tag-translation-url-input') ? 'block' :
                                          el.classList.contains('tag-translation-url-button') ? 'block' : 'block';
                    });
                    closeButton.title = '';
                    closeButton.textContent = '−';
                } else {
                    menu.classList.add('minimized');
                    menu.querySelectorAll('.tag-translation-drag-handle, h3, .tag-translation-control, .tag-translation-url-input, .tag-translation-url-button, #dictionary-status, .tag-translation-stats, .tag-translation-submenu').forEach(el => {
                        el.style.display = 'none';
                    });
                    closeButton.title = '';
                    closeButton.textContent = '+';
                }
            });

            // 修改：只让拖动区域可拖动
            this.makeDraggable(menu);
        }

        // 修改：更新makeDraggable方法，只绑定到拖动区域
        makeDraggable(element) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            let isDragging = false;

            const dragHandle = element.querySelector('.tag-translation-drag-handle');
            
            if (!dragHandle) return;

            const dragMouseDown = (e) => {
                e = e || window.event;
                e.preventDefault();
                
                // 只允许通过拖动区域拖动，但要排除关闭按钮
                if (e.target.classList.contains('tag-translation-close') || 
                    e.target.closest('.tag-translation-close')) {
                    return;
                }

                // 确保点击的是拖动区域本身
                if (e.target !== dragHandle && !dragHandle.contains(e.target)) {
                    return;
                }

                pos3 = e.clientX;
                pos4 = e.clientY;

                const elementRect = element.getBoundingClientRect();
                pos1 = pos3 - elementRect.left;
                pos2 = pos4 - elementRect.top;

                window.addEventListener('mousemove', elementDrag);
                window.addEventListener('mouseup', closeDragElement);

                isDragging = true;
                element.classList.add('dragging');
            };

            const elementDrag = (e) => {
                if (!isDragging) return;
                e = e || window.event;
                e.preventDefault();

                let newLeft = e.clientX - pos1;
                let newTop = e.clientY - pos2;

                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const elementWidth = element.offsetWidth;
                const elementHeight = element.offsetHeight;

                newLeft = Math.max(0, Math.min(newLeft, windowWidth - elementWidth));
                newTop = Math.max(0, Math.min(newTop, windowHeight - elementHeight));

                element.style.position = 'fixed';
                element.style.left = newLeft + "px";
                element.style.top = newTop + "px";
                element.style.right = "auto";
            };

            const closeDragElement = () => {
                window.removeEventListener('mousemove', elementDrag);
                window.removeEventListener('mouseup', closeDragElement);

                isDragging = false;
                element.classList.remove('dragging');
            };

            // 只绑定拖动事件到拖动区域
            dragHandle.addEventListener('mousedown', dragMouseDown);
        }

        // 其他方法保持不变...
        handleExcludedTagsChange() {
            this.restoreAllTags();
            
            if (config.enableTranslation) {
                this.translateTags();
            } else {
                this.updateHighlightOnly();
            }
        }

        restoreAllTags() {
            const tagElements = document.querySelectorAll('.tag-link, [class*="tag-type-"] a');
            
            tagElements.forEach(tagElement => {
                const originalText = this.originalTexts.get(tagElement);
                if (originalText) {
                    const currentText = tagElement.textContent;
                    if (currentText.includes('! ')) {
                        tagElement.textContent = '! ' + originalText;
                    } else {
                        tagElement.textContent = originalText;
                    }
                }
                
                tagElement.classList.remove('tag-translation-highlight');
            });
            
            this.translatedCount = 0;
            this.untranslatedCount = 0;
        }

        restoreOriginalTags() {
            const tagElements = document.querySelectorAll('.tag-link, [class*="tag-type-"] a');

            tagElements.forEach(tagElement => {
                if (this.isExcludedTag(tagElement.parentElement)) {
                    return;
                }

                const originalText = this.originalTexts.get(tagElement) || tagElement.textContent.replace('! ', '').trim();
                tagElement.textContent = tagElement.textContent.includes('! ') ?
                    '! ' + originalText : originalText;

                const normalizedKey = this.getNormalizedTagKey(originalText);
                const translatedText = normalizedKey ? this.tagDictionary[normalizedKey] : null;
                
                if (!translatedText && config.enableHighlight) {
                    tagElement.classList.add('tag-translation-highlight');
                } else {
                    tagElement.classList.remove('tag-translation-highlight');
                }
            });
        }

        updateHighlightOnly() {
            const tagElements = document.querySelectorAll('.tag-link, [class*="tag-type-"] a');

            tagElements.forEach(tagElement => {
                if (this.isExcludedTag(tagElement.parentElement)) {
                    tagElement.classList.remove('tag-translation-highlight');
                    return;
                }

                const originalText = this.originalTexts.get(tagElement) || tagElement.textContent.replace('! ', '').trim();
                const normalizedKey = this.getNormalizedTagKey(originalText);
                const translatedText = normalizedKey ? this.tagDictionary[normalizedKey] : null;

                if (!translatedText && config.enableHighlight) {
                    tagElement.classList.add('tag-translation-highlight');
                } else {
                    tagElement.classList.remove('tag-translation-highlight');
                }
            });
        }

        translateTags() {
            this.translatedCount = 0;
            this.untranslatedCount = 0;

            const tagElements = document.querySelectorAll('.tag-link, [class*="tag-type-"] a');

            tagElements.forEach(tagElement => {
                if (this.isExcludedTag(tagElement.parentElement)) {
                    const originalText = this.originalTexts.get(tagElement);
                    if (originalText) {
                        const currentText = tagElement.textContent;
                        if (currentText.includes('! ')) {
                            tagElement.textContent = '! ' + originalText;
                        } else {
                            tagElement.textContent = originalText;
                        }
                    }
                    tagElement.classList.remove('tag-translation-highlight');
                    return;
                }

                const originalText = tagElement.textContent.replace('! ', '').trim();

                if (!this.originalTexts.has(tagElement)) {
                    this.originalTexts.set(tagElement, originalText);
                }

                // 修改：使用新的标准化键名方法
                const normalizedKey = this.getNormalizedTagKey(originalText);
                const translatedText = normalizedKey ? this.tagDictionary[normalizedKey] : null;

                if (config.enableTranslation && translatedText) {
                    tagElement.textContent = tagElement.textContent.replace(originalText, translatedText);
                    tagElement.classList.remove('tag-translation-highlight');
                    this.translatedCount++;
                } else {
                    if (config.enableHighlight) {
                        tagElement.classList.add('tag-translation-highlight');
                    } else {
                        tagElement.classList.remove('tag-translation-highlight');
                    }
                    if (!translatedText) this.untranslatedCount++;
                }
            });

            this.updateStats();
        }

        isExcludedTag(tagElement) {
            const classList = tagElement.className;
            return config.excludedTagTypes.some(type => classList.includes(`tag-type-${type}`));
        }

        updateStats() {
            const translatedElement = document.getElementById('translated-count');
            const untranslatedElement = document.getElementById('untranslated-count');
            const dictionaryCountElement = document.getElementById('dictionary-count');

            if (translatedElement) {
                translatedElement.textContent = this.translatedCount;
            }
            if (untranslatedElement) {
                untranslatedElement.textContent = this.untranslatedCount;
            }
            if (dictionaryCountElement) {
                dictionaryCountElement.textContent = Object.keys(this.tagDictionary).length;
            }
        }

        setupObservers() {
            const observer = new MutationObserver((mutations) => {
                let shouldTranslate = false;

                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1 && (
                                node.querySelector && node.querySelector('.tag-link') ||
                                node.className && node.className.includes && node.className.includes('tag-link')
                            )) {
                                shouldTranslate = true;
                            }
                        });
                    }
                });

                if (shouldTranslate) {
                    setTimeout(() => this.translateTags(), 100);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            window.addEventListener('popstate', () => {
                setTimeout(() => this.translateTags(), 500);
            });

            window.addEventListener('hashchange', () => {
                setTimeout(() => this.translateTags(), 500);
            });
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new TagTranslator();
        });
    } else {
        new TagTranslator();
    }

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
            e.preventDefault();
            const menu = document.getElementById('tag-translation-menu');
            if (menu) {
                menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            }
        }
    });

})();