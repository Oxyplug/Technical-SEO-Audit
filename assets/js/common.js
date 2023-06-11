class Common {
  /**
   * @param modalId
   * @param openId
   * @returns {Promise<void>}
   */
  static async makeModalActions(modalId, openId = null) {
    const section = document.getElementById('oxyplug-tech-seo-section');
    if (section) {
      const modal = section.shadowRoot.getElementById(modalId);

      // Show
      if (openId) {
        const openButton = section.shadowRoot.getElementById(openId);
        if (openButton) {
          openButton.onclick = () => {
            modal.style.display = 'block';
          }
        }
      }

      // Hide
      const closeButtons = section.shadowRoot.querySelectorAll(`#${modalId} .oxyplug-modal-close`);
      // Hide when click on button
      closeButtons.forEach((closeButton) => {
        closeButton.onclick = () => {
          modal.style.display = 'none';
        }
      });

      // Hide when click out of modal
      const parent = section.shadowRoot.getElementById('oxyplug-modal-message');
      parent.addEventListener('click', (event) => {
        if (event.target === parent) {
          modal.style.display = 'none';
        }
      });
    }
  }

  /**
   *
   * @param modal
   * @returns {Promise<void>}
   */
  static async showModal(modal) {
    modal.style.display = 'block';
  }

  /**
   *
   * @param messages
   * @param issueTypes
   * @param caller
   * @returns {Promise<void>}
   */
  static async showIssues(messages, issueTypes, caller = 'content') {
    const oxyplugMessageId = 'oxyplug-modal-message';
    const oxyplugSectionId = 'oxyplug-tech-seo-section';
    let shadowWrap = document.getElementById(oxyplugSectionId);

    if (!shadowWrap) {
      shadowWrap = document.createElement('div');
      shadowWrap.id = oxyplugSectionId;
      document.body.appendChild(shadowWrap);

      const shadowRoot = shadowWrap.attachShadow({mode: 'open'});
      const stylePathCommon = chrome.runtime.getURL('assets/css/common.css');
      const styleName = caller === 'content' ? 'shadow-content' : 'popup';
      let extraStyle = chrome.runtime.getURL(`assets/css/${styleName}.css`);
      extraStyle = `<link rel="stylesheet" type="text/css" href="${extraStyle}">`;

      shadowRoot.innerHTML =
        `<link rel="stylesheet" type="text/css" href="${stylePathCommon}">
        ${extraStyle}
        <div id="${oxyplugMessageId}" class="oxyplug-modal">
          <div class="oxyplug-modal-content">
            <span class="oxyplug-modal-close">&times;</span>
            <h1 class="oxyplug-tech-seo-h1">List of issues</h1>
            <ul></ul>
          </div>
        </div>`;

      // Make modal actions
      await Common.makeModalActions(oxyplugMessageId);
    }

    const messageModal = shadowWrap.shadowRoot.getElementById(oxyplugMessageId);
    const ul = messageModal.querySelector('.oxyplug-modal-content ul');
    ul.innerHTML = '';
    messages.forEach((message, index) => {
      const li = document.createElement('li');
      const span = document.createElement('span');

      if (issueTypes === 'info') {
        span.classList.add(issueTypes);
        span.innerText = 'i';
      } else {
        span.classList.add('issue-number');
        if (Array.isArray(issueTypes) && issueTypes.length) {
          if (['nextGenFormatsIssue', 'lazyLoadIssue'].includes(issueTypes[index])) {
            span.classList.add('warning');
          } else if (issueTypes[index] === 'lcpIssue') {
            span.classList.add('info');
          }
        }
        span.innerText = index + 1;
      }

      li.append(span, message);
      ul.append(li);
    });

    await Common.showModal(messageModal);
  }
}