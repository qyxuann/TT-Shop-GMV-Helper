// 监听安装事件
browser.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

// 监听消息
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'getData') {
        // 处理数据请求
        sendResponse({ success: true });
    }
});
