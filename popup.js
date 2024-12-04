document.addEventListener('DOMContentLoaded', function() {
  // 主题切换相关
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = themeToggle.querySelector('.theme-icon');
  
  // 从 chrome.storage 中获取保存的主题
  chrome.storage.sync.get('theme', function(data) {
    const savedTheme = data.theme || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  });

  // 切换主题
  themeToggle.addEventListener('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    chrome.storage.sync.set({ theme: newTheme });
    updateThemeIcon(newTheme);
  });

  // 更新主题图标
  function updateThemeIcon(theme) {
    themeIcon.textContent = theme === 'light' ? '☀️' : '🌙';
  }

  const diffValue = document.getElementById('diffValue');
  const gmvValue = document.getElementById('gmvValue');
  const affiliateValue = document.getElementById('affiliateValue');
  const orderValue = document.getElementById('orderValue');
  const copyButtons = document.querySelectorAll('.copyButton');

  // 在当前标签页中执行提取
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    // 检查当前页面是否是 TikTok 卖家中心
    if (!tabs[0].url.includes('seller-us.tiktok.com')) {
      diffValue.textContent = '---';
      gmvValue.textContent = '---';
      affiliateValue.textContent = '---';
      orderValue.textContent = '---';
      return;
    }

    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: function() {
        // 在指定范围内查找值
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
          const textNodes = [];
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
          let collectingOrder = false;
          let currentValue = '';
          let orderNodes = [];  // 用于收集 Orders 相关的节点
          let isCollectingOrders = false;  // 标记是否正在收集 Orders 的值
          
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
                  // 处理收集到的节点
                  const fullNumber = orderNodes.join('').match(/[\d,]+/)[0];
                  orderValue = parseInt(fullNumber.replace(/,/g, ''));
                  console.log('Set Order value:', orderValue);
                  isCollectingOrders = false;
                  orderNodes = [];
                }
              }

              const match = /\$([\d,]+\.\d{2})/.exec(currentValue);  // 严格匹配货币格式
              if (match) {
                // GMV 和 Affiliate GMV 的处理
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
              // 收集 Orders 相关的节点直到遇到下一个标签或百分比
              if (text.includes('%') || text.includes('Vs.')) {  // 遇到结束标记时处理
                // 处理收集到的节点
                const combinedText = orderNodes.join('');
                const match = combinedText.match(/[\d,]+/);
                if (match) {
                  orderValue = parseInt(match[0].replace(/,/g, ''));
                  console.log('Combined Order text:', combinedText);
                  console.log('Extracted number:', match[0]);
                  console.log('Final Order value:', orderValue);
                }
                isCollectingOrders = false;
                orderNodes = [];
              } else {
                orderNodes.push(text);
                console.log('Current Order nodes:', orderNodes);
              }
            }
          }
          
          // 如果还在收集 Orders，最后处理一次
          if (isCollectingOrders && orderNodes.length > 0) {
            const combinedText = orderNodes.join('');
            const match = combinedText.match(/[\d,]+/);
            if (match) {
              orderValue = parseInt(match[0].replace(/,/g, ''));
              console.log('Final Order processing:', match[0], orderValue);
            }
          }
          
          console.log('Final values:', { gmv: gmvValue, affiliate: affiliateValue, orders: orderValue });
          return { gmv: gmvValue, affiliate: affiliateValue, orders: orderValue };
        }

        // 获取值并计算差值
        const values = findValueInContainer();
        console.log('Calculated difference:', values);
        return values;
      },
      args: []
    }, (results) => {
      if (chrome.runtime.lastError) {
        diffValue.textContent = '提取错误：' + chrome.runtime.lastError.message;
        gmvValue.textContent = '---';
        affiliateValue.textContent = '---';
        orderValue.textContent = '---';
        return;
      }

      if (!results || !results[0]) {
        diffValue.textContent = '提取失败';
        gmvValue.textContent = '---';
        affiliateValue.textContent = '---';
        orderValue.textContent = '---';
        return;
      }

      const values = results[0].result;
      if (values && typeof values.gmv === 'number' && typeof values.affiliate === 'number' && typeof values.orders === 'number') {
        gmvValue.textContent = values.gmv.toFixed(2);
        affiliateValue.textContent = values.affiliate.toFixed(2);
        orderValue.textContent = values.orders.toLocaleString();
        const difference = Math.abs(values.gmv - values.affiliate);
        diffValue.textContent = difference.toFixed(2);
      } else {
        diffValue.textContent = '提取失败';
        gmvValue.textContent = '---';
        affiliateValue.textContent = '---';
        orderValue.textContent = '---';
      }
    });
  });

  // 为所有复制按钮添加功能
  copyButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetId = this.dataset.target;
      const textToCopy = document.getElementById(targetId).textContent;
      const tempInput = document.createElement('input');
      tempInput.style.position = 'absolute';
      tempInput.style.left = '-9999px';
      tempInput.value = textToCopy;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      this.textContent = '已复制';
      setTimeout(() => {
        this.textContent = '复制';
      }, 1000);
    });
  });
}); 