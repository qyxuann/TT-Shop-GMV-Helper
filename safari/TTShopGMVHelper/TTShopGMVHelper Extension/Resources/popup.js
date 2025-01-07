document.addEventListener('DOMContentLoaded', function() {
  // 主题切换相关
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = themeToggle.querySelector('.theme-icon');
  
  // 从 storage 中获取保存的主题
  browser.storage.sync.get('theme', function(data) {
    const savedTheme = data.theme || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  });

  // 切换主题
  themeToggle.addEventListener('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    browser.storage.sync.set({ theme: newTheme });
    updateThemeIcon(newTheme);
  });

  // 更新主题图标
  function updateThemeIcon(theme) {
    themeIcon.textContent = theme === 'light' ? '☀️' : '🌙';
  }

  const diffValue = document.getElementById('diffValue');
  const gmvValue = document.getElementById('gmvValue');
  const affiliateValue = document.getElementById('affiliateValue');
  const livesValue = document.getElementById('livesValue');
  const orderValue = document.getElementById('orderValue');
  const copyButtons = document.querySelectorAll('.copyButton');

  // 在当前标签页中执行提取
  browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
    // 检查当前页面是否是 TikTok 卖家中心
    if (!tabs[0].url.includes('seller-us.tiktok.com')) {
      diffValue.textContent = '---';
      gmvValue.textContent = '---';
      affiliateValue.textContent = '---';
      livesValue.textContent = '---';
      orderValue.textContent = '---';
      return;
    }

    // 发送消息给 content script 获取数据
    try {
      browser.tabs.sendMessage(tabs[0].id, {action: "getData"}, function(response) {
        if (!response) {
          updateValueWithAdaptiveSize(diffValue, '提取失败');
          updateValueWithAdaptiveSize(gmvValue, '---');
          updateValueWithAdaptiveSize(affiliateValue, '---');
          updateValueWithAdaptiveSize(livesValue, '---');
          updateValueWithAdaptiveSize(orderValue, '---');
          return;
        }

        const values = response.data;
        if (values && typeof values.gmv === 'number' && typeof values.affiliate === 'number' && typeof values.lives === 'number' && typeof values.orders === 'number') {
          updateValueWithAdaptiveSize(gmvValue, values.gmv.toFixed(2));
          updateValueWithAdaptiveSize(affiliateValue, values.affiliate.toFixed(2));
          updateValueWithAdaptiveSize(livesValue, values.lives.toFixed(2));
          updateValueWithAdaptiveSize(orderValue, values.orders.toString());
          const difference = Math.abs(values.gmv - values.affiliate);
          updateValueWithAdaptiveSize(diffValue, difference.toFixed(2));
        } else {
          updateValueWithAdaptiveSize(diffValue, '提取失败');
          updateValueWithAdaptiveSize(gmvValue, '---');
          updateValueWithAdaptiveSize(affiliateValue, '---');
          updateValueWithAdaptiveSize(livesValue, '---');
          updateValueWithAdaptiveSize(orderValue, '---');
        }
      });
    } catch (error) {
      updateValueWithAdaptiveSize(diffValue, '提取失败');
      updateValueWithAdaptiveSize(gmvValue, '---');
      updateValueWithAdaptiveSize(affiliateValue, '---');
      updateValueWithAdaptiveSize(livesValue, '---');
      updateValueWithAdaptiveSize(orderValue, '---');
    }
  });

  // 为所有复制按钮添加功能
  copyButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetId = this.dataset.target;
      const textToCopy = document.getElementById(targetId).textContent;
      copyToClipboard(textToCopy, this);
    });
  });

  // 添加一键复制所有数据的功能
  const copyAllButton = document.getElementById('copyAllButton');
  copyAllButton.addEventListener('click', function() {
    const selectedData = [];
    const checkboxes = document.querySelectorAll('.copyCheckbox');
    
    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        const targetId = checkbox.dataset.target;
        const value = document.getElementById(targetId).textContent;
        selectedData.push(value);
      }
    });
    
    if (selectedData.length > 0) {
      const allData = selectedData.join('\t');
      copyToClipboard(allData, this);
    }
  });

  // 封装复制功能
  function copyToClipboard(text, button) {
    const tempInput = document.createElement('input');
    tempInput.style.position = 'absolute';
    tempInput.style.left = '-9999px';
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    
    const originalText = button.textContent;
    button.textContent = '已复制';
    setTimeout(() => {
      button.textContent = originalText;
    }, 1000);
  }

  function updateValueWithAdaptiveSize(element, value) {
    element.textContent = value;
    
    // 创建一个临时 span 来测量实际宽度
    const measureSpan = document.createElement('span');
    measureSpan.style.visibility = 'hidden';
    measureSpan.style.position = 'absolute';
    measureSpan.style.fontSize = '24px';
    measureSpan.style.fontWeight = 'bold';
    measureSpan.style.background = 'linear-gradient(45deg, #FF0050, #00F2EA)';
    measureSpan.style.webkitBackgroundClip = 'text';
    measureSpan.style.backgroundClip = 'text';
    measureSpan.style.webkitTextFillColor = 'transparent';
    measureSpan.textContent = value;
    document.body.appendChild(measureSpan);
    
    // 获取实际宽度
    const width = measureSpan.offsetWidth;
    
    // 调整计算方法：当宽度超过 140px 时才开始缩放
    const baseWidth = 140;
    const contentLength = width > baseWidth ? Math.ceil((width - baseWidth) / 10) + 8 : 8;
    
    document.body.removeChild(measureSpan);
    element.style.setProperty('--content-length', contentLength);
  }

  // 从 storage 中恢复复选框状态
  const checkboxes = document.querySelectorAll('.copyCheckbox');
  browser.storage.sync.get('checkboxStates', function(data) {
    const savedStates = data.checkboxStates || {};
    checkboxes.forEach(checkbox => {
      const targetId = checkbox.dataset.target;
      // 如果没有保存的状态，默认为选中
      checkbox.checked = savedStates[targetId] !== undefined ? savedStates[targetId] : true;
    });
  });

  // 监听复选框变化并保存状态
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const states = {};
      checkboxes.forEach(cb => {
        states[cb.dataset.target] = cb.checked;
      });
      browser.storage.sync.set({ checkboxStates: states });
    });
  });
}); 