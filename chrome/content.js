// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getData") {
        // 获取页面数据
        const mainData = findValueInContainer();
        const livesValue = findLivesValue();
        sendResponse({ 
            success: true, 
            data: { 
                ...mainData,
                lives: livesValue 
            } 
        });
    }
    return true; // 保持消息通道开放
});

// 提取LIVEs Linked accounts的值
function findLivesValue() {
    // 使用用户提供的 CSS 选择器
    const selector = "#GEC-main > div.flex.flex-col.layout__largeCentered--FqeE1 > div.layout__pageSidebar--TCgwA > div > div > div > div > div > div:nth-child(3) > div > div:nth-child(2) > div > div.index__table--1UjHY > div > div > div > div > div > div > table > tbody > tr:nth-child(2) > td > div > span.theme-arco-table-cell-wrap-value > div > div.flex.flex-row.gap-8.w-\\[220px\\].justify-between > div > div > div";
    const livesDiv = document.querySelector(selector);
    if (!livesDiv) return 0;

    // 提取文本中的金额
    const text = livesDiv.textContent.trim();
    const match = /\$([\d,]+\.\d{2})/.exec(text);
    if (match) {
        return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0;
}

// 提取页面主要数据的函数
function findValueInContainer() {
    const container = document.evaluate(
        '/html/body/div[1]/section/section/div/main/div[2]/div[2]/div/div/div/div/div/div[1]/div[1]/div/div[2]/div[1]/div',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;
    
    if (!container) return { gmv: 0, affiliate: 0, orders: 0 };
    
    // 查找所有文本节点
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let node;
    let gmvValue = 0;
    let affiliateValue = 0;
    let orderValue = 0;
    let collectingGMV = false;
    let collectingAffiliate = false;
    let currentValue = '';
    let orderNodes = [];
    let isCollectingOrders = false;
    
    while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        
        if (text === 'GMV' && !gmvValue && !text.includes('Affiliate')) {
            collectingGMV = true;
            currentValue = '';
        } else if (text === 'Affiliate GMV' && !affiliateValue) {
            collectingAffiliate = true;
            currentValue = '';
        } else if (text === 'Orders' && !orderValue) {
            isCollectingOrders = true;
            currentValue = '';
        } else if (collectingGMV || collectingAffiliate) {
            currentValue += text;

            const match = /\$([\d,]+\.\d{2})/.exec(currentValue);  // 严格匹配货币格式
            if (match) {
                const value = parseFloat(match[1].replace(/,/g, ''));
                if (collectingGMV) {
                    gmvValue = value;
                    collectingGMV = false;
                } else if (collectingAffiliate) {
                    affiliateValue = value;
                    collectingAffiliate = false;
                }
                currentValue = '';
            }
        } else if (isCollectingOrders) {
            if (text.includes('%') || text.includes('Vs.')) {
                const combinedText = orderNodes.join('');
                const match = combinedText.match(/[\d,]+/);
                if (match) {
                    orderValue = parseInt(match[0].replace(/,/g, ''));
                }
                isCollectingOrders = false;
                orderNodes = [];
            } else {
                orderNodes.push(text);
            }
        }
    }
    
    // 如果还在收集 Orders，最后处理一次
    if (isCollectingOrders && orderNodes.length > 0) {
        const combinedText = orderNodes.join('');
        const match = combinedText.match(/[\d,]+/);
        if (match) {
            orderValue = parseInt(match[0].replace(/,/g, ''));
        }
    }
    
    return { gmv: gmvValue, affiliate: affiliateValue, orders: orderValue };
} 