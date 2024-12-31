// 监听来自popup的消息
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getData") {
        // 获取页面数据
        const data = findValueInContainer();
        sendResponse({ success: true, data: data });
    }
    return true; // 保持消息通道开放
});

// 提取页面数据的函数
function findValueInContainer() {
    const container = document.evaluate(
        '/html/body/div[1]/section/section/div/main/div[2]/div[2]/div/div/div/div/div/div[1]/div[1]/div/div[2]/div[1]/div',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;
    
    console.log('Container found:', container);
    
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
        console.log('Found text:', text);
        if (text === 'GMV' && !gmvValue && !text.includes('Affiliate')) {
            console.log('Found GMV label');
            collectingGMV = true;
            currentValue = '';
        } else if (text === 'Affiliate GMV' && !affiliateValue) {
            console.log('Found Affiliate GMV label');
            collectingAffiliate = true;
            currentValue = '';
        } else if (text === 'Orders' && !orderValue) {
            console.log('Found Orders label');
            isCollectingOrders = true;
            currentValue = '';
        } else if (collectingGMV || collectingAffiliate) {
            currentValue += text;
            
            // 检查是否是百分比或其他结束标记
            if (text.includes('%') || text.includes('Vs.')) {
                if (isCollectingOrders && currentValue) {
                    const fullNumber = orderNodes.join('').match(/[\d,]+/)[0];
                    orderValue = parseInt(fullNumber.replace(/,/g, ''));
                    console.log('Set Order value:', orderValue);
                    isCollectingOrders = false;
                    orderNodes = [];
                }
            }

            const match = /\$([\d,]+\.\d{2})/.exec(currentValue);  // 严格匹配货币格式
            if (match) {
                const value = parseFloat(match[1].replace(/,/g, ''));
                if (collectingGMV) {
                    gmvValue = value;
                    collectingGMV = false;
                    console.log('Set GMV value:', gmvValue);
                } else if (collectingAffiliate) {
                    affiliateValue = value;
                    collectingAffiliate = false;
                    console.log('Set Affiliate value:', affiliateValue);
                }
                currentValue = '';
            }
        } else if (isCollectingOrders) {
            if (text.includes('%') || text.includes('Vs.')) {
                const combinedText = orderNodes.join('');
                const match = combinedText.match(/[\d,]+/);
                if (match) {
                    orderValue = parseInt(match[0].replace(/,/g, ''));
                    console.log('Final Order value:', orderValue);
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
            console.log('Final Order processing:', orderValue);
        }
    }
    
    console.log('Final values:', { gmv: gmvValue, affiliate: affiliateValue, orders: orderValue });
    return { gmv: gmvValue, affiliate: affiliateValue, orders: orderValue };
}
