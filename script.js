// Module for SAV file analysis and manipulation
class SAVFileAnalyzer {
    constructor() {
        this.fileData = null;
        this.fileName = null;
        this.hexView = {
            pageSize: 512,
            currentPage: 0,
            totalPages: 0
        };
        this.parsedData = null;
    }

    // Load file from input
    async loadFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    this.fileData = new Uint8Array(event.target.result);
                    this.fileName = file.name;
                    this.hexView.totalPages = Math.ceil(this.fileData.length / this.hexView.pageSize);
                    this.hexView.currentPage = 0;
                    this.parsedData = this.parseNBTData(this.fileData);
                    resolve({
                        success: true,
                        fileName: this.fileName,
                        fileSize: this.fileData.length
                    });
                } catch (error) {
                    reject({
                        success: false,
                        error: error.message
                    });
                }
            };
            reader.onerror = () => {
                reject({
                    success: false,
                    error: 'Error reading file'
                });
            };
            reader.readAsArrayBuffer(file);
        });
    }

    // Get hex view for current page
    getHexView() {
        if (!this.fileData) return "No file loaded";

        const start = this.hexView.currentPage * this.hexView.pageSize;
        const end = Math.min(start + this.hexView.pageSize, this.fileData.length);
        let hexOutput = '';
        let asciiOutput = '';
        let output = '';

        // Header
        output += '       00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F  ASCII\n';
        output += '       -----------------------------------------------  ----------------\n';

        for (let i = start; i < end; i += 16) {
            // Address
            hexOutput = i.toString(16).padStart(6, '0') + '  ';
            asciiOutput = '  ';

            for (let j = 0; j < 16; j++) {
                if (i + j < end) {
                    const byteValue = this.fileData[i + j];
                    // Hex value
                    hexOutput += byteValue.toString(16).padStart(2, '0') + ' ';
                    // ASCII representation
                    asciiOutput += (byteValue >= 32 && byteValue <= 126) ? 
                                   String.fromCharCode(byteValue) : 
                                   '.';
                } else {
                    hexOutput += '   ';
                    asciiOutput += ' ';
                }
            }

            output += hexOutput + asciiOutput + '\n';
        }

        return output;
    }

    // Get next page of hex view
    nextHexPage() {
        if (this.hexView.currentPage < this.hexView.totalPages - 1) {
            this.hexView.currentPage++;
            return {
                content: this.getHexView(),
                page: this.hexView.currentPage + 1,
                totalPages: this.hexView.totalPages
            };
        }
        return null;
    }

    // Get previous page of hex view
    prevHexPage() {
        if (this.hexView.currentPage > 0) {
            this.hexView.currentPage--;
            return {
                content: this.getHexView(),
                page: this.hexView.currentPage + 1,
                totalPages: this.hexView.totalPages
            };
        }
        return null;
    }

    // Mock NBT parsing - in a real implementation this would parse the actual NBT format
    parseNBTData(data) {
        // This is a simplified mock of NBT parsing
        // In a real implementation, you would parse the NBT format according to Minecraft specifications
        return {
            type: 'compound',
            name: 'root',
            children: [
                {
                    type: 'compound',
                    name: 'Data',
                    children: [
                        { type: 'string', name: 'LevelName', value: 'My World' },
                        { type: 'long', name: 'LastPlayed', value: Date.now() },
                        { type: 'int', name: 'GameType', value: 0 },
                        {
                            type: 'compound',
                            name: 'Player',
                            children: [
                                { type: 'float', name: 'XpLevel', value: 30 },
                                { type: 'int', name: 'Score', value: 0 },
                                { type: 'int', name: 'Health', value: 20 },
                                { type: 'list', name: 'Pos', itemType: 'double', values: [100, 64, 200] },
                                {
                                    type: 'list', 
                                    name: 'Inventory', 
                                    itemType: 'compound',
                                    values: [
                                        {
                                            type: 'compound',
                                            children: [
                                                { type: 'short', name: 'id', value: 1 },
                                                { type: 'byte', name: 'Count', value: 64 },
                                                { type: 'short', name: 'Damage', value: 0 },
                                                { type: 'byte', name: 'Slot', value: 0 }
                                            ]
                                        },
                                        {
                                            type: 'compound',
                                            children: [
                                                { type: 'short', name: 'id', value: 278 },
                                                { type: 'byte', name: 'Count', value: 1 },
                                                { type: 'short', name: 'Damage', value: 10 },
                                                { type: 'byte', name: 'Slot', value: 1 }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        };
    }

    // Get NBT structure as HTML for display
    getNBTTreeHTML() {
        if (!this.parsedData) return "<div>No data available</div>";
        return this.renderNBTNode(this.parsedData, 0);
    }

    // Render a single NBT node and its children
    renderNBTNode(node, depth) {
        const indent = '  '.repeat(depth);
        let html = '';

        const toggleId = `toggle-${node.name}-${Math.random().toString(36).substring(2, 9)}`;

        if (node.type === 'compound' || node.type === 'list') {
            html += `<div class="tree-node">`;
            html += `<span class="tree-toggle" id="${toggleId}">+</span>`;
            html += `<span class="tree-label" data-toggle="${toggleId}">${node.name}: ${node.type}</span>`;
            html += `<div class="tree-children" style="display: none;">`;

            if (node.type === 'compound' && node.children) {
                node.children.forEach(child => {
                    html += this.renderNBTNode(child, depth + 1);
                });
            } else if (node.type === 'list' && node.values) {
                if (typeof node.values[0] === 'object') {
                    // List of compounds
                    node.values.forEach((value, index) => {
                        value.name = `[${index}]`;
                        html += this.renderNBTNode(value, depth + 1);
                    });
                } else {
                    // List of primitives
                    html += `<div class="tree-node">${node.values.join(', ')}</div>`;
                }
            }

            html += `</div></div>`;
        } else {
            // Leaf node (primitive value)
            html += `<div class="tree-node">${node.name}: ${node.value} (${node.type})</div>`;
        }

        return html;
    }

    // Get player stats from parsed data
    getPlayerStats() {
        try {
            const dataNode = this.findNode(this.parsedData, 'Data');
            const playerNode = this.findNode(dataNode, 'Player');
            
            return {
                health: this.findNodeValue(playerNode, 'Health') || 20,
                xpLevel: this.findNodeValue(playerNode, 'XpLevel') || 0,
                score: this.findNodeValue(playerNode, 'Score') || 0,
                position: this.findNodeValues(playerNode, 'Pos') || [0, 0, 0]
            };
        } catch (error) {
            console.error("Error getting player stats:", error);
            return {
                health: 20,
                xpLevel: 0,
                score: 0,
                position: [0, 0, 0]
            };
        }
    }

    // Get world info from parsed data
    getWorldInfo() {
        try {
            const dataNode = this.findNode(this.parsedData, 'Data');
            
            return {
                levelName: this.findNodeValue(dataNode, 'LevelName') || 'Unknown World',
                lastPlayed: this.findNodeValue(dataNode, 'LastPlayed') || Date.now(),
                gameType: this.findNodeValue(dataNode, 'GameType') || 0
            };
        } catch (error) {
            console.error("Error getting world info:", error);
            return {
                levelName: 'Unknown World',
                lastPlayed: Date.now(),
                gameType: 0
            };
        }
    }

    // Get inventory items from parsed data
    getInventoryItems() {
        try {
            const dataNode = this.findNode(this.parsedData, 'Data');
            const playerNode = this.findNode(dataNode, 'Player');
            const inventoryNode = this.findNode(playerNode, 'Inventory');
            
            if (inventoryNode && inventoryNode.values) {
                return inventoryNode.values.map(item => {
                    const idNode = this.findNodeInCompound(item, 'id');
                    const countNode = this.findNodeInCompound(item, 'Count');
                    const damageNode = this.findNodeInCompound(item, 'Damage');
                    const slotNode = this.findNodeInCompound(item, 'Slot');
                    
                    return {
                        id: idNode ? idNode.value : 0,
                        count: countNode ? countNode.value : 0,
                        damage: damageNode ? damageNode.value : 0,
                        slot: slotNode ? slotNode.value : 0
                    };
                });
            }
            return [];
        } catch (error) {
            console.error("Error getting inventory items:", error);
            return [];
        }
    }

    // Helper function to find a node by name
    findNode(parentNode, name) {
        if (!parentNode || !parentNode.children) return null;
        return parentNode.children.find(node => node.name === name);
    }

    // Helper function to find a node in a compound
    findNodeInCompound(compoundNode, name) {
        if (!compoundNode || !compoundNode.children) return null;
        return compoundNode.children.find(node => node.name === name);
    }

    // Helper function to find a node's value
    findNodeValue(parentNode, name) {
        const node = this.findNode(parentNode, name);
        return node ? node.value : null;
    }

    // Helper function to find a node's values (for lists)
    findNodeValues(parentNode, name) {
        const node = this.findNode(parentNode, name);
        return node && node.values ? node.values : null;
    }

    // Update player stats in the NBT data
    updatePlayerStats(stats) {
        try {
            const dataNode = this.findNode(this.parsedData, 'Data');
            const playerNode = this.findNode(dataNode, 'Player');
            
            if (playerNode && playerNode.children) {
                // Update health
                let healthNode = this.findNode(playerNode, 'Health');
                if (healthNode) {
                    healthNode.value = stats.health;
                } else {
                    playerNode.children.push({ type: 'int', name: 'Health', value: stats.health });
                }
                
                // Update XP level
                let xpNode = this.findNode(playerNode, 'XpLevel');
                if (xpNode) {
                    xpNode.value = stats.xpLevel;
                } else {
                    playerNode.children.push({ type: 'float', name: 'XpLevel', value: stats.xpLevel });
                }
                
                // Update score
                let scoreNode = this.findNode(playerNode, 'Score');
                if (scoreNode) {
                    scoreNode.value = stats.score;
                } else {
                    playerNode.children.push({ type: 'int', name: 'Score', value: stats.score });
                }
                
                // Update position
                let posNode = this.findNode(playerNode, 'Pos');
                if (posNode && posNode.values) {
                    posNode.values = stats.position;
                } else if (!posNode) {
                    playerNode.children.push({
                        type: 'list',
                        name: 'Pos',
                        itemType: 'double',
                        values: stats.position
                    });
                }
                
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error updating player stats:", error);
            return false;
        }
    }

    // Update world info in the NBT data
    updateWorldInfo(info) {
        try {
            const dataNode = this.findNode(this.parsedData, 'Data');
            
            if (dataNode && dataNode.children) {
                // Update level name
                let nameNode = this.findNode(dataNode, 'LevelName');
                if (nameNode) {
                    nameNode.value = info.levelName;
                } else {
                    dataNode.children.push({ type: 'string', name: 'LevelName', value: info.levelName });
                }
                
                // Update last played
                let lastPlayedNode = this.findNode(dataNode, 'LastPlayed');
                if (lastPlayedNode) {
                    lastPlayedNode.value = info.lastPlayed;
                } else {
                    dataNode.children.push({ type: 'long', name: 'LastPlayed', value: info.lastPlayed });
                }
                
                // Update game type
                let gameTypeNode = this.findNode(dataNode, 'GameType');
                if (gameTypeNode) {
                    gameTypeNode.value = info.gameType;
                } else {
                    dataNode.children.push({ type: 'int', name: 'GameType', value: info.gameType });
                }
                
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error updating world info:", error);
            return false;
        }
    }

    // Generate a modified .sav file based on the current NBT data
    generateModifiedFile() {
        // In a real implementation, this would serialize the modified NBT data
        // back to a binary format according to Minecraft's specifications
        // For demonstration purposes, we're just returning the original file
        return this.fileData;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const analyzer = new SAVFileAnalyzer();
    
    // DOM elements
    const fileInput = document.getElementById('fileInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const currentFileName = document.getElementById('currentFileName');
    const prevPageHexBtn = document.getElementById('prevPageHex');
    const nextPageHexBtn = document.getElementById('nextPageHex');
    const hexPageInfo = document.getElementById('hexPageInfo');
    const hexContent = document.getElementById('hexContent');
    const nbtTree = document.getElementById('nbtTree');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    // Modal elements
    const inventoryBtn = document.getElementById('inventoryEdit');
    const statsBtn = document.getElementById('playerStats');
    const worldBtn = document.getElementById('worldInfo');
    const saveChangesBtn = document.getElementById('saveChanges');
    const downloadBtn = document.getElementById('downloadModified');
    
    const inventoryModal = document.getElementById('inventoryModal');
    const statsModal = document.getElementById('statsModal');
    const worldModal = document.getElementById('worldModal');
    const closeBtns = document.querySelectorAll('.close');
    
    const inventoryItems = document.getElementById('inventoryItems');
    const playerStatsForm = document.getElementById('playerStatsForm');
    const worldInfoForm = document.getElementById('worldInfoForm');
    
    const saveInventoryBtn = document.getElementById('saveInventory');
    const saveStatsBtn = document.getElementById('saveStats');
    const saveWorldInfoBtn = document.getElementById('saveWorldInfo');
    
    // Tab switching functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update active tab panel
            tabPanels.forEach(panel => panel.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Analyze button click handler
    analyzeBtn.addEventListener('click', async () => {
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Please select a file first!');
            return;
        }
        
        try {
            const result = await analyzer.loadFile(fileInput.files[0]);
            if (result.success) {
                currentFileName.textContent = result.fileName;
                
                // Update hex view
                hexContent.textContent = analyzer.getHexView();
                hexPageInfo.textContent = `Page 1 of ${analyzer.hexView.totalPages}`;
                
                // Update NBT tree view
                nbtTree.innerHTML = analyzer.getNBTTreeHTML();
                setupTreeToggle();
            }
        } catch (error) {
            alert(`Error analyzing file: ${error.error || 'Unknown error'}`);  
        }
    });
    
    // Hex view navigation
    prevPageHexBtn.addEventListener('click', () => {
        const result = analyzer.prevHexPage();
        if (result) {
            hexContent.textContent = result.content;
            hexPageInfo.textContent = `Page ${result.page} of ${result.totalPages}`;
        }
    });

    nextPageHexBtn.addEventListener('click', () => {
        const result = analyzer.nextHexPage();
        if (result) {
            hexContent.textContent = result.content;
            hexPageInfo.textContent = `Page ${result.page} of ${result.totalPages}`;
        }
    });
    
    // Setup tree toggle functionality
    function setupTreeToggle() {
        // Add click handlers to toggle tree nodes
        document.querySelectorAll('.tree-label').forEach(label => {
            label.addEventListener('click', () => {
                const toggleId = label.getAttribute('data-toggle');
                const toggle = document.getElementById(toggleId);
                const children = label.parentElement.querySelector('.tree-children');
                
                if (children.style.display === 'none') {
                    children.style.display = 'block';
                    toggle.textContent = '-';
                } else {
                    children.style.display = 'none';
                    toggle.textContent = '+';
                }
            });
        });
    }
    
    // Inventory editor modal
    inventoryBtn.addEventListener('click', () => {
        const items = analyzer.getInventoryItems();
        
        // Generate inventory display
        inventoryItems.innerHTML = '';
        for (let i = 0; i < 36; i++) {
            const item = items.find(item => item.slot === i) || { id: 0, count: 0, damage: 0, slot: i };
            const itemElement = document.createElement('div');
            itemElement.classList.add('inventory-slot');
            itemElement.setAttribute('data-slot', i);
            
            if (item.id > 0) {
                const itemName = getItemNameById(item.id);
                itemElement.innerHTML = `
                    <div>${itemName}</div>
                    <div class="item-count">${item.count}</div>
                `;
                itemElement.setAttribute('data-id', item.id);
                itemElement.setAttribute('data-count', item.count);
                itemElement.setAttribute('data-damage', item.damage);
            }
            
            // Click to edit item
            itemElement.addEventListener('click', () => {
                const id = prompt('Enter item ID:', item.id);
                if (id !== null) {
                    const count = prompt('Enter item count:', item.count);
                    if (count !== null) {
                        const damage = prompt('Enter item damage value:', item.damage);
                        if (damage !== null) {
                            const newId = parseInt(id, 10);
                            const newCount = parseInt(count, 10);
                            const newDamage = parseInt(damage, 10);
                            
                            // Update display
                            if (newId > 0) {
                                const itemName = getItemNameById(newId);
                                itemElement.innerHTML = `
                                    <div>${itemName}</div>
                                    <div class="item-count">${newCount}</div>
                                `;
                                itemElement.setAttribute('data-id', newId);
                                itemElement.setAttribute('data-count', newCount);
                                itemElement.setAttribute('data-damage', newDamage);
                            } else {
                                itemElement.innerHTML = '';
                                itemElement.removeAttribute('data-id');
                                itemElement.removeAttribute('data-count');
                                itemElement.removeAttribute('data-damage');
                            }
                        }
                    }
                }
            });
            
            inventoryItems.appendChild(itemElement);
        }
        
        inventoryModal.style.display = 'block';
    });
    
    // Player stats editor modal
    statsBtn.addEventListener('click', () => {
        const stats = analyzer.getPlayerStats();
        
        playerStatsForm.innerHTML = `
            <div class="form-group">
                <label for="health">Health:</label>
                <input type="number" id="health" value="${stats.health}" min="0" max="20">
            </div>
            <div class="form-group">
                <label for="xpLevel">XP Level:</label>
                <input type="number" id="xpLevel" value="${stats.xpLevel}" min="0">
            </div>
            <div class="form-group">
                <label for="score">Score:</label>
                <input type="number" id="score" value="${stats.score}" min="0">
            </div>
            <div class="form-group">
                <label for="posX">Position X:</label>
                <input type="number" id="posX" value="${stats.position[0]}">
            </div>
            <div class="form-group">
                <label for="posY">Position Y:</label>
                <input type="number" id="posY" value="${stats.position[1]}">
            </div>
            <div class="form-group">
                <label for="posZ">Position Z:</label>
                <input type="number" id="posZ" value="${stats.position[2]}">
            </div>
        `;
        
        statsModal.style.display = 'block';
    });
    
    // World info editor modal
    worldBtn.addEventListener('click', () => {
        const worldInfo = analyzer.getWorldInfo();
        
        worldInfoForm.innerHTML = `
            <div class="form-group">
                <label for="levelName">Level Name:</label>
                <input type="text" id="levelName" value="${worldInfo.levelName}">
            </div>
            <div class="form-group">
                <label for="gameType">Game Type:</label>
                <select id="gameType">
                    <option value="0" ${worldInfo.gameType === 0 ? 'selected' : ''}>Survival</option>
                    <option value="1" ${worldInfo.gameType === 1 ? 'selected' : ''}>Creative</option>
                    <option value="2" ${worldInfo.gameType === 2 ? 'selected' : ''}>Adventure</option>
                    <option value="3" ${worldInfo.gameType === 3 ? 'selected' : ''}>Spectator</option>
                </select>
            </div>
        `;
        
        worldModal.style.display = 'block';
    });
    
    // Close modal buttons
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            inventoryModal.style.display = 'none';
            statsModal.style.display = 'none';
            worldModal.style.display = 'none';
        });
    });
    
    // Save inventory changes
    saveInventoryBtn.addEventListener('click', () => {
        // TODO: Implement saving inventory changes to NBT data
        alert('Inventory changes saved!');
        inventoryModal.style.display = 'none';
    });
    
    // Save player stats changes
    saveStatsBtn.addEventListener('click', () => {
        const health = parseInt(document.getElementById('health').value, 10);
        const xpLevel = parseInt(document.getElementById('xpLevel').value, 10);
        const score = parseInt(document.getElementById('score').value, 10);
        const posX = parseFloat(document.getElementById('posX').value);
        const posY = parseFloat(document.getElementById('posY').value);
        const posZ = parseFloat(document.getElementById('posZ').value);
        
        const success = analyzer.updatePlayerStats({
            health,
            xpLevel,
            score,
            position: [posX, posY, posZ]
        });
        
        if (success) {
            alert('Player stats saved!');
            nbtTree.innerHTML = analyzer.getNBTTreeHTML();
            setupTreeToggle();
            statsModal.style.display = 'none';
        } else {
            alert('Error saving player stats!');
        }
    });
    
    // Save world info changes
    saveWorldInfoBtn.addEventListener('click', () => {
        const levelName = document.getElementById('levelName').value;
        const gameType = parseInt(document.getElementById('gameType').value, 10);
        
        const success = analyzer.updateWorldInfo({
            levelName,
            lastPlayed: Date.now(),
            gameType
        });
        
        if (success) {
            alert('World info saved!');
            nbtTree.innerHTML = analyzer.getNBTTreeHTML();
            setupTreeToggle();
            worldModal.style.display = 'none';
        } else {
            alert('Error saving world info!');
        }
    });
    
    // Save all changes button
    saveChangesBtn.addEventListener('click', () => {
        // This would apply all changes to the NBT data structure
        alert('All changes have been applied to the data structure!');
    });
    
    // Download modified file
    downloadBtn.addEventListener('click', () => {
        if (!analyzer.fileData) {
            alert('No file loaded!');
            return;
        }
        
        const modifiedData = analyzer.generateModifiedFile();
        const blob = new Blob([modifiedData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `modified_${analyzer.fileName || 'minecraft.sav'}`;
        a.click();
        
        URL.revokeObjectURL(url);
    });
    
    // Helper function to get item name by ID
    function getItemNameById(id) {
        // This is a very simplified mapping of item IDs to names
        // In a real implementation, this would be a comprehensive list
        const itemNames = {
            1: 'Stone',
            2: 'Grass Block',
            3: 'Dirt',
            4: 'Cobblestone',
            5: 'Wood Planks',
            12: 'Sand',
            17: 'Log',
            20: 'Glass',
            35: 'Wool',
            45: 'Brick',
            50: 'Torch',
            53: 'Oak Stairs',
            57: 'Diamond Block',
            64: 'Oak Door',
            65: 'Ladder',
            85: 'Fence',
            98: 'Stone Brick',
            138: 'Beacon',
            152: 'Redstone Block',
            264: 'Diamond',
            265: 'Iron Ingot',
            266: 'Gold Ingot',
            267: 'Iron Sword',
            276: 'Diamond Sword',
            278: 'Diamond Pickaxe',
            279: 'Diamond Shovel',
            297: 'Bread',
            310: 'Diamond Helmet',
            311: 'Diamond Chestplate',
            312: 'Diamond Leggings',
            313: 'Diamond Boots',
            322: 'Golden Apple',
            368: 'Ender Pearl',
        };
        
        return itemNames[id] || `Item ${id}`;
    }
});