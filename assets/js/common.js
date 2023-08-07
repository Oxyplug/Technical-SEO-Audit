class Common {
  static oxyplugScrollLimit = 50000;

  /**
   * Make modal actions
   * @param modalId
   * @param openId
   * @returns {Promise<void>}
   */
  static async makeModalActions(modalId, openId = null) {
    const section = await Common.getElement('#oxyplug-tech-seo-section');
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
   * Show modal
   * @param modal
   * @returns {Promise<void>}
   */
  static async showModal(modal) {
    modal.style.display = 'block';
  }

  /**
   * Show issues
   * @param messages
   * @param issueTypes
   * @param caller
   * @returns {Promise<void>}
   */
  static async showIssues(messages, issueTypes, caller = 'content') {
    const messageId = 'oxyplug-modal-message';
    const sectionId = 'oxyplug-tech-seo-section';
    let shadowWrap = await Common.getElement(`#${sectionId}`);

    if (!shadowWrap) {
      shadowWrap = document.createElement('div');
      shadowWrap.id = sectionId;
      document.body.appendChild(shadowWrap);
      const shadowRoot = shadowWrap.attachShadow({mode: 'open'});
      const stylePathCommon = chrome.runtime.getURL('assets/css/common.css');
      const styleName = caller === 'content' ? 'shadow-content' : 'popup';
      let extraStyle = chrome.runtime.getURL(`assets/css/${styleName}.css`);
      extraStyle = `<link rel="stylesheet" type="text/css" href="${extraStyle}">`;

      shadowRoot.innerHTML =
        `<link rel="stylesheet" type="text/css" href="${stylePathCommon}">
        ${extraStyle}
        <div id="${messageId}" class="oxyplug-modal">
          <div class="oxyplug-modal-content">
            <span class="oxyplug-modal-close">&times;</span>
            <h1 class="oxyplug-tech-seo-h1">List of issues</h1>
            <ul></ul>
          </div>
        </div>`;

      // Make modal actions
      await Common.makeModalActions(messageId);
    }

    const messageModal = shadowWrap.shadowRoot.getElementById(messageId);
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

  /**
   * Get local storage
   * @param key
   * @returns {Promise<unknown>}
   */
  static async getLocalStorage(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, resolve);
    })
      .then(response => {
        return response[key];
      })
      .catch(() => {
        return null
      });
  };

  /**
   * Set local storage
   * @param object
   * @returns {Promise<unknown>}
   */
  static async setLocalStorage(object) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(object, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    })
      .then(() => {
        return true;
      })
      .catch(() => {
        return false
      });
  };

  /**
   * Get element
   * @param query
   * @returns {Promise<unknown>}
   */
  static async getElement(query) {
    return new Promise(async (resolve, reject) => {
      try {
        const element = await document.querySelector(query);
        resolve(element);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    })
      .then((response) => {
        return response;
      });
  };

  /**
   * Get elements
   * @param query
   * @returns {Promise<unknown>}
   */
  static async getElements(query) {
    return new Promise(async (resolve, reject) => {
      try {
        const elements = await document.querySelectorAll(query);
        resolve(elements);
      } catch (error) {
        console.log(error);
        reject(error)
      }
    });
  };

  /**
   * Get current tab
   * @returns {Promise<chrome.tabs.Tab>}
   */
  static async getCurrentTab() {
    return new Promise(async (resolve, reject) => {
      try {
        const queryOptions = {active: true, currentWindow: true};
        const [tab] = await chrome.tabs.query(queryOptions);

        resolve(tab);
      } catch (error) {
        console.log(error);
        reject(false);
      }
    })
      .then(response => {
        return response;
      })
      .catch(response => {
        return response;
      });
  }
}